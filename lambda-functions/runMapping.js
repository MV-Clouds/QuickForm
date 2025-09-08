import { DynamoDBClient, QueryCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import moment from 'moment-timezone';
import { parsePhoneNumber, getCountryCallingCode } from 'libphonenumber-js';

const LOG_TABLE_NAME = 'SF-PermanentStorage';
const SALESFORCE_API_VERSION = "v60.0";

// Input format patterns for parsing
const INPUT_DATE_FORMATS = [
  'YYYY-MM-DD',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'DD-MM-YYYY',
  'MM-DD-YYYY',
  moment.ISO_8601
];

const INPUT_TIME_FORMATS = [
  'HH:mm:ss',
  'hh:mm:ss A',
  'HH:mm',
  'hh:mm A',
  'hh:mm:ss A', // Explicitly include AM/PM formats
  'HH:mm:ss.SSS'
];

const INPUT_DATETIME_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'DD-MM-YYYY HH:mm:ss',
  'MM-DD-YYYY hh:mm:ss A',
  'YYYY-MM-DD HH:mm',
  'DD/MM/YYYY HH:mm:ss',
  moment.ISO_8601
];

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

let tokenRefreshed = false;
const fetchNewAccessToken = async (userId) => {
  const response = await fetch('https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/getAccessToken/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error('Failed to fetch new access token');
  const data = await response.json();
  return data.access_token;
};

let newAccessToken = null;

// Unified operator definitions
const unifiedOperators = {
  '=': {
    evaluate: (value, condition) => value === condition.value,
    toSOQL: (field, value) => `${field} = '${escapeSoqlValue(value)}'`
  },
  '!=': {
    evaluate: (value, condition) => value !== condition.value,
    toSOQL: (field, value) => `${field} != '${escapeSoqlValue(value)}'`
  },
  'LIKE': {
    evaluate: (value, condition) => value && typeof value === 'string' && value.includes(condition.value),
    toSOQL: (field, value) => `${field} LIKE '%${escapeSoqlValue(value)}%'`
  },
  'NOT LIKE': {
    evaluate: (value, condition) => value && typeof value === 'string' && !value.includes(condition.value),
    toSOQL: (field, value) => `${field} NOT LIKE '%${escapeSoqlValue(value)}%'`
  },
  'STARTS WITH': {
    evaluate: (value, condition) => value && typeof value === 'string' && value.startsWith(condition.value),
    toSOQL: (field, value) => `${field} LIKE '${escapeSoqlValue(value)}%'`
  },
  'ENDS WITH': {
    evaluate: (value, condition) => value && typeof value === 'string' && value.endsWith(condition.value),
    toSOQL: (field, value) => `${field} LIKE '%${escapeSoqlValue(value)}'`
  },
  'IS NULL': {
    evaluate: (value) => value === null || value === undefined || value === '',
    toSOQL: (field) => `${field} = null`
  },
  'IS NOT NULL': {
    evaluate: (value) => value !== null && value !== undefined && value !== '',
    toSOQL: (field) => `${field} != null`
  },
  '>': {
    evaluate: (value, condition) => Number(value) > Number(condition.value),
    toSOQL: (field, value) => `${field} > ${Number(value)}`
  },
  '<': {
    evaluate: (value, condition) => Number(value) < Number(condition.value),
    toSOQL: (field, value) => `${field} < ${Number(value)}`
  },
  '>=': {
    evaluate: (value, condition) => Number(value) >= Number(condition.value),
    toSOQL: (field, value) => `${field} >= ${Number(value)}`
  },
  '<=': {
    evaluate: (value, condition) => Number(value) <= Number(condition.value),
    toSOQL: (field, value) => `${field} <= ${Number(value)}`
  },
  'BETWEEN': {
    evaluate: (value, condition) => {
      const [min, max] = condition.value.split(',').map(Number);
      const numValue = Number(value);
      return numValue >= min && numValue <= max;
    },
    toSOQL: (field, value) => {
      const [min, max] = String(value).split(',').map(Number);
      return `${field} >= ${min} AND ${field} <= ${max}`;
    }
  },
  'IN': {
    evaluate: (value, condition) => condition.value.split(',').includes(String(value)),
    toSOQL: (field, value) => {
      const values = String(value).split(',').map(v => `'${v.replace(/'/g, "\\'")}'`).join(',');
      return `${field} IN (${values})`;
    }
  },
  'NOT IN': {
    evaluate: (value, condition) => !condition.value.split(',').includes(String(value)),
    toSOQL: (field, value) => {
      const values = String(value).split(',').map(v => `'${v.replace(/'/g, "\\'")}'`).join(',');
      return `${field} NOT IN (${values})`;
    }
  }
};

// Helper functions
const escapeSoqlValue = (value) => String(value).replace(/'/g, "\\'");

const evaluateCondition = (record, condition) => {
  const operator = unifiedOperators[condition.operator];
  if (!operator) {
    console.error(`Unsupported operator: ${condition.operator}`);
    return false;
  }
  return operator.evaluate(record[condition.field], condition);
};

const buildSOQLCondition = (condition) => {
  const operator = unifiedOperators[condition.operator];
  if (!operator) {
    throw new Error(`Unsupported operator: ${condition.operator}`);
  }
  return operator.toSOQL(condition.field, condition.value);
};

const evaluateCustomLogic = (conditions, customLogic, record) => {
  const conditionResults = conditions.map((cond) => {
    return evaluateCondition(record, cond);
  });

  const jsExpression = customLogic
    .replace(/\bAND\b/gi, '&&')
    .replace(/\bOR\b/gi, '||')
    .replace(/\d+/g, (match) => {
      const index = parseInt(match) - 1;
      return conditionResults[index] !== undefined ?
        `(${conditionResults[index]})` : 'false';
    });

  console.log(`Evaluating expression: ${jsExpression}`);

  try {
    return new Function(`return ${jsExpression}`)();
  } catch (error) {
    console.error('Error evaluating custom logic:', error, {
      customLogic,
      jsExpression,
      conditionResults
    });
    return false;
  }
};

const buildSOQLQuery = (node) => {
  const { salesforceObject, conditions, type, nodeId } = node;

  console.log(`Building SOQL for node ${nodeId}:`, JSON.stringify(conditions, null, 2));

  let conds, logicType, customLogic, returnLimit, sortField, sortOrder;

  if (Array.isArray(conditions)) {
    conds = conditions;
    logicType = null;
    customLogic = null;
    returnLimit = node.conditions?.returnLimit || null;
    sortField = node.conditions?.sortField || null;
    sortOrder = node.conditions?.sortOrder || null;
  } else {
    ({ conditions: conds, logicType, customLogic, returnLimit, sortField, sortOrder } = conditions || {});
  }

  if (!conds || conds.length === 0) {
    if (type === 'CreateUpdate') {
      return null;
    }
    throw new Error(`Node ${nodeId} of type ${type} must have conditions`);
  }

  const fields = [...new Set(conds.map(cond => cond.field))];
  const query = `SELECT Id, ${fields.join(', ')} FROM ${salesforceObject} WHERE `;

  const conditionClauses = conds.map(buildSOQLCondition).filter(clause => clause);

  let soqlQuery;
  if (logicType === 'Custom' && customLogic) {
    if (!/^[\d\s()ANDORandor]+$/.test(customLogic)) {
      throw new Error('Invalid custom logic expression. Only numbers, spaces, AND/OR, and parentheses are allowed.');
    }

    let soqlLogic = customLogic;
    conds.forEach((_, index) => {
      const conditionNumber = index + 1;
      const regex = new RegExp(`\\b${conditionNumber}\\b`, 'g');
      soqlLogic = soqlLogic.replace(regex, conditionClauses[index]);
    });

    soqlLogic = soqlLogic
      .replace(/\band\b/gi, 'AND')
      .replace(/\bor\b/gi, 'OR')
      .replace(/\s+/g, ' ')
      .trim();

    soqlQuery = query + soqlLogic;
  } else {
    soqlQuery = query + conditionClauses.map(c => `(${c})`).join(` ${logicType || 'AND'} `);
  }

  if (sortField && sortOrder) {
    soqlQuery += ` ORDER BY ${sortField} ${sortOrder}`;
  }
  if (returnLimit) {
    soqlQuery += ` LIMIT ${returnLimit}`;
  }

  return soqlQuery;
};

const executeSOQLQuery = async (userId, soqlQuery, salesforceBaseUrl, token) => {
  if (!soqlQuery) {
    throw new Error('SOQL query is null or undefined');
  }
  console.log(`Executing SOQL Query: ${soqlQuery}`);
  let response = await fetch(`${salesforceBaseUrl}/query?q=${encodeURIComponent(soqlQuery)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 401 && !tokenRefreshed) {
      tokenRefreshed = true;
      newAccessToken = await fetchNewAccessToken(userId);
      response = await fetch(`${salesforceBaseUrl}/query?q=${encodeURIComponent(soqlQuery)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${newAccessToken}`, 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`SOQL query failed: ${errorData[0]?.message || JSON.stringify(errorData)}`);
    }
  }

  const data = await response.json();
  console.log('SOQL Query Results:', JSON.stringify(data, null, 2));
  return data;
};

const processQueryResults = (data, conditions) => {
  if (!data.records || data.records.length === 0) {
    return [];
  }

  const conds = Array.isArray(conditions) ? conditions : conditions?.conditions;
  const customLogic = !Array.isArray(conditions) ? conditions?.customLogic : null;

  if (customLogic) {
    return data.records.filter(record =>
      evaluateCustomLogic(conds, customLogic, record)
    );
  }

  return data.records;
};

const createUpdateNode = async (userId, node, formData, salesforceBaseUrl, token) => {
  const { salesforceObject, conditions, fieldMappings, nodeId } = node;
  let matchedRecords = [];

  // Step 1: Match existing records
  if (conditions && (Array.isArray(conditions) ? conditions.length > 0 : conditions.conditions?.length > 0)) {
    const soqlQuery = buildSOQLQuery(node);
    if (soqlQuery) {
      const queryData = await executeSOQLQuery(userId, soqlQuery, salesforceBaseUrl, token);
      matchedRecords = processQueryResults(queryData, conditions);
      console.log(`Matched Records: ${matchedRecords.length}`);
    }
  }

  // Step 2: Build payload from fieldMappings
  const payload = {};
  let hasValidMapping = false;

  fieldMappings.forEach(mapping => {
    let value;

    if (mapping.formFieldId.includes('_')) {
      const [baseFieldId, subfield] = mapping.formFieldId.split('_');
      if (baseFieldId in formData) {
        value = formData[mapping.formFieldId] || '';
      }
    } else {
      value = mapping.formFieldId === '' && mapping.picklistValue !== undefined
        ? mapping.picklistValue
        : formData[mapping.formFieldId];
    }

    if (value !== undefined && value !== null) {
      if (mapping.fieldType === 'number' || mapping.fieldType === 'price') {
        value = Number(value);
      } else if (mapping.fieldType === 'picklist' || mapping.fieldType === 'shorttext' || mapping.fieldType === 'longtext') {
        value = String(value);
      }

      payload[mapping.salesforceField] = value;
      hasValidMapping = true;
      console.log(`Mapping ${mapping.formFieldId || 'predefined'} to ${mapping.salesforceField}: ${value}`);
    } else {
      console.warn(`No form data or picklist value found for field ${mapping.formFieldId || 'predefined'}`);
    }
  });

  if (!hasValidMapping) {
    const missingFields = fieldMappings
      .filter(mapping => !formData[mapping.formFieldId] && !(mapping.formFieldId === '' && mapping.picklistValue !== undefined))
      .map(mapping => mapping.formFieldId);

    throw new Error(`No valid field mappings for node ${nodeId}. Missing or invalid fields: ${missingFields.join(', ')}. Form Data: ${JSON.stringify(formData)}`);
  }

  console.log('Constructed Payload:', JSON.stringify(payload, null, 2));

  // Step 3: Update matched records or create new one
  if (matchedRecords.length > 0) {
    const MAX_BATCH_SIZE = 25;
    const allRecordIds = matchedRecords.map(record => record.Id);
    const successfulIds = [];
    const failedRecords = [];

    for (let i = 0; i < allRecordIds.length; i += MAX_BATCH_SIZE) {
      const chunk = allRecordIds.slice(i, i + MAX_BATCH_SIZE);

      const batchRequests = chunk.map((recordId, index) => ({
        method: 'PATCH',
        url: `/services/data/v60.0/sobjects/${salesforceObject}/${recordId}`,
        richInput: payload
      }));

      const batchPayload = { batchRequests };

      try {
        let batchResponse = await fetch(`${salesforceBaseUrl}/composite/batch`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batchPayload)
        });

        const batchResult = await batchResponse.json();

        if (!batchResponse.ok || batchResult.hasErrors) {
          if (batchResponse.status === 401) {
            newAccessToken = await fetchNewAccessToken(userId);
            tokenRefreshed = true;
            batchResponse = await fetch(`${salesforceBaseUrl}/composite/batch`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${newAccessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(batchPayload)
            });
            batchResult = await batchResponse.json();
          }
          if (!batchResponse.ok || batchResult.hasErrors) {

            if (Array.isArray(batchResult.results)) {
              batchResult.results.forEach((res, idx) => {
                const recId = chunk[idx];
                if (res.status >= 400) {
                  failedRecords.push({
                    recordId: recId,
                    error: res.result?.[0]?.message || res.result?.message || `HTTP ${res.status}`
                  });
                } else {
                  successfulIds.push(recId);
                }
              });
            }
          } else {
            // Unexpected structure — push all as failed
            chunk.forEach(recordId => {
              failedRecords.push({
                recordId,
                error: `Unexpected batch response: ${JSON.stringify(batchResult)}`
              });
            });
          }
        }
        else {
          successfulIds.push(...chunk);
        }

      } catch (error) {
        chunk.forEach(recordId => {
          failedRecords.push({ recordId, error: error.message });
        });
      }
    }

    return {
      nodeId,
      success: failedRecords.length === 0,
      updatedRecords: successfulIds,
      failedRecords,
      status: failedRecords.length > 0 ? 'partial' : 'success'
    };

  } else {
    // No match: create new record
    try {
      let response = await fetch(`${salesforceBaseUrl}/sobjects/${salesforceObject}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let responseData = {};

      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.warn('Non-JSON response:', responseText);
      }

      if (!response.ok) {
        if (response.status === 401 && !tokenRefreshed) {
          tokenRefreshed = true;
          newAccessToken = await fetchNewAccessToken(userId);
          response = await fetch(`${salesforceBaseUrl}/sobjects/${salesforceObject}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          responseData = await response.json();
        }
        if (!response.ok)
          throw new Error(responseData[0]?.message || responseData.message || `HTTP ${response.status}`);
      }

      return {
        nodeId,
        recordId: responseData.id,
        success: true
      };
    } catch (error) {
      console.error('Create record error:', error);
      return {
        nodeId,
        error: error.message,
        success: false,
        status: 'failed'
      };
    }
  }
};

const processLoopNode = async (node, previousResults, formData, salesforceBaseUrl, token) => {
  const { loopConfig, nodeId } = node;
  if (!loopConfig) {
    throw new Error(`Loop node ${nodeId} is missing loop configuration`);
  }

  console.log(`Loop Collection for ${nodeId}:`, JSON.stringify(previousResults[loopConfig.loopCollection], null, 2));

  const sourceCollection = previousResults[loopConfig.loopCollection];
  if (!sourceCollection || sourceCollection.error) {
    throw new Error(`Source collection ${loopConfig.loopCollection} is invalid or contains an error: ${JSON.stringify(sourceCollection)}`);
  }

  const itemsToProcess = Array.isArray(sourceCollection.ids)
    ? sourceCollection.ids
    : [sourceCollection.ids];

  if (!itemsToProcess || itemsToProcess.length === 0 || itemsToProcess.includes(undefined)) {
    console.log(`No valid items to process in loop ${nodeId}`);
    return { nodeId, processedCount: 0 };
  }

  const loopVariables = {
    currentItem: null,
    currentIndex: loopConfig.loopVariables?.currentIndex ? 0 : null,
    counter: loopConfig.loopVariables?.counter ? 1 : null,
    indexBase: parseInt(loopConfig.loopVariables?.indexBase || '0')
  };

  const maxIterations = parseInt(loopConfig.maxIterations || '0');
  const hasMaxIterations = maxIterations > 0;

  let processedCount = 0;
  const loopResults = [];

  for (let i = 0; i < itemsToProcess.length; i++) {
    if (hasMaxIterations && processedCount >= maxIterations) {
      console.log(`Reached max iterations (${maxIterations}) for loop ${nodeId}`);
      break;
    }

    loopVariables.currentItem = itemsToProcess[i];
    if (loopVariables.currentIndex !== null) {
      loopVariables.currentIndex = i + loopVariables.indexBase;
    }
    if (loopVariables.counter !== null) {
      loopVariables.counter = processedCount + 1;
    }

    const loopContext = {
      ...formData,
      [loopConfig.currentItemVariableName]: loopVariables.currentItem,
      ...(loopVariables.currentIndex !== null && {
        [`${loopConfig.currentItemVariableName}_index`]: loopVariables.currentIndex
      }),
      ...(loopVariables.counter !== null && {
        [`${loopConfig.currentItemVariableName}_counter`]: loopVariables.counter
      })
    };

    console.log(`Processing loop iteration ${processedCount + 1} with item:`, loopVariables.currentItem);

    loopResults.push({
      item: loopVariables.currentItem,
      index: loopVariables.currentIndex,
      counter: loopVariables.counter,
      context: loopContext
    });

    processedCount++;
  }

  return {
    nodeId,
    processedCount,
    loopResults,
    loopContext: loopResults.length > 0 ? loopResults[0].context : formData,
    status: 'processed'
  };
};

const queryNode = async (userId, node, salesforceBaseUrl, token) => {
  const soqlQuery = buildSOQLQuery(node);
  const queryData = await executeSOQLQuery(userId, soqlQuery, salesforceBaseUrl, token);
  const matchedRecords = processQueryResults(queryData, node.conditions);

  const ids = matchedRecords.map(record => record.Id);

  if (ids.length === 0) {
    return {
      nodeId: node.nodeId,
      ids: null,
      conditions: node.conditions,
      message: "No data found for the given query conditions"
    };
  }

  return {
    nodeId: node.nodeId,
    conditions: node.conditions,
    ids: ids.length > 1 ? ids : ids[0]
  };
};

const getNodeData = async (nodeId, userId, formVersionId) => {
  try {
    let allItems = [];
    let ExclusiveStartKey = undefined;

    do {
      const queryResponse = await dynamoClient.send(
        new QueryCommand({
          TableName: METADATA_TABLE_NAME,
          KeyConditionExpression: 'UserId = :userId',
          ExpressionAttributeValues: {
            ':userId': { S: userId },
          },
          ExclusiveStartKey,
        })
      );

      if (queryResponse.Items) {
        allItems.push(...queryResponse.Items);
      }

      ExclusiveStartKey = queryResponse.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    // Find the form record that contains our form version
    let formRecords = [];
    const formRecordItems = allItems.filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'));

    if (formRecordItems.length > 0) {
      try {
        const sortedChunks = formRecordItems
          .sort((a, b) => {
            const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
            const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
            return aNum - bNum;
          });

        const combinedFormRecords = sortedChunks.map(item => item.FormRecords.S).join('');
        formRecords = JSON.parse(combinedFormRecords);
      } catch (e) {
        console.warn('Failed to parse FormRecords chunks:', e);
        return null;
      }
    }

    // Find the specific form version with our mappings
    const formVersion = formRecords
      .flatMap(form => form.FormVersions || [])
      .find(version => version.Id === formVersionId);

    if (!formVersion || !formVersion.Mappings) {
      console.warn(`Form version ${formVersionId} not found or has no mappings`);
      return null;
    }

    // Get the specific node mapping
    const nodeMapping = formVersion.Mappings.Mappings?.[nodeId];
    if (!nodeMapping) {
      console.warn(`Node ${nodeId} not found in mappings`);
      return null;
    }

    return {
      nodeId,
      type: nodeMapping.actionType || null,
      salesforceObject: nodeMapping.salesforceObject || null,
      conditions: nodeMapping.conditions ? JSON.parse(JSON.stringify(nodeMapping.conditions)) : null,
      fieldMappings: nodeMapping.fieldMappings || [],
      loopConfig: nodeMapping.loopConfig ? JSON.parse(JSON.stringify(nodeMapping.loopConfig)) : null,
      formatterConfig: nodeMapping.formatterConfig ? JSON.parse(JSON.stringify(nodeMapping.formatterConfig)) : null,
      config: nodeMapping.config ? JSON.parse(JSON.stringify(nodeMapping.config)) : null
    };
  } catch (error) {
    console.error('Error getting node data:', error);
    return null;
  }
};

// Helper to detect input format
const detectInputFormat = (value, formatArray) => {
  for (const format of formatArray) {
    if (moment(value, format, true).isValid()) {
      return format;
    }
  }
  return null;
};

// Date/Time formatter operations
const dateFormatters = {
  format_date: (value, format, timezone) => {
    const date = moment.tz(value, INPUT_DATE_FORMATS, true, timezone);
    if (!date.isValid()) {
      console.warn(`Invalid date format for value: ${value}`);
      return value;
    }
    return date.format(format);
  },
  format_time: (value, format, timezone, targetTimezone) => {
    const date = moment.tz(value, INPUT_TIME_FORMATS, true, timezone);
    if (!date.isValid()) {
      console.warn(`Invalid time format for value: ${value}`);
      return value;
    }
    if (targetTimezone && targetTimezone !== timezone) {
      return date.tz(targetTimezone).format(format);
    }
    return date.format(format);
  },
  format_datetime: (value, format, timezone, targetTimezone) => {
    const date = moment.tz(value, INPUT_DATETIME_FORMATS, true, timezone);
    if (!date.isValid()) {
      console.warn(`Invalid datetime format for value: ${value}`);
      return value;
    }
    if (targetTimezone && targetTimezone !== timezone) {
      return date.tz(targetTimezone).format(format);
    }
    return date.format(format);
  },
  timezone_conversion: (value, sourceTimezone, targetTimezone) => {
    const date = moment.tz(value, [...INPUT_DATE_FORMATS, ...INPUT_TIME_FORMATS, ...INPUT_DATETIME_FORMATS], true, sourceTimezone);
    if (!date.isValid()) {
      console.warn(`Invalid date/time format for timezone conversion: ${value}`);
      return value;
    }
    const inputFormat = detectInputFormat(value, [...INPUT_DATE_FORMATS, ...INPUT_TIME_FORMATS, ...INPUT_DATETIME_FORMATS]);
    return date.tz(targetTimezone).format(inputFormat || 'YYYY-MM-DD HH:mm:ss');
  },
  add_date: (value, unit, amount, timezone) => {
    const inputFormat = detectInputFormat(value, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS]);
    const date = moment.tz(value, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS], true, timezone);
    if (!date.isValid()) {
      console.warn(`Invalid date/time format for add_date: ${value}`);
      return value;
    }
    return date.add(Number(amount), unit).format(inputFormat || 'YYYY-MM-DD');
  },
  subtract_date: (value, unit, amount, timezone) => {
    const inputFormat = detectInputFormat(value, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS]);
    const date = moment.tz(value, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS], true, timezone);
    if (!date.isValid()) {
      console.warn(`Invalid date/time format for subtract_date: ${value}`);
      return value;
    }
    return date.subtract(Number(amount), unit).format(inputFormat || 'YYYY-MM-DD');
  },
  date_difference: (value1, value2, unit, timezone) => {
    const date1 = moment.tz(value1, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS], true, timezone);
    const date2 = moment.tz(value2, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS], true, timezone);
    if (!date1.isValid() || !date2.isValid()) {
      console.warn(`Invalid date/time format for date_difference: date1=${value1}, date2=${value2}`);
      throw new Error(`Invalid date/time format: date1=${value1}, date2=${value2}`);
    }
    return Math.abs(date1.diff(date2, unit || 'days'));
  }
};

// Text formatter operations
const textFormatters = {
  uppercase: (value) => {
    if (typeof value !== 'string') return value;
    return value.toUpperCase();
  },
  lowercase: (value) => {
    if (typeof value !== 'string') return value;
    return value.toLowerCase();
  },
  title_case: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  },
  trim_whitespace: (value) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  },
  replace: (value, params) => {
    if (typeof value !== 'string') return value;
    const { searchValue, replaceValue } = params;
    if (!searchValue) return value;
    const escapedSearchValue = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return value.replace(new RegExp(escapedSearchValue, 'g'), replaceValue || '');
  },
  extract_email: (value) => {
    if (typeof value !== 'string') return value;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = value.match(emailRegex);
    return matches ? matches[0] : value;
  },
  split: (value, params) => {
    if (typeof value !== 'string') return value;
    const { delimiter, index } = params;
    if (!delimiter) return value;

    const parts = value.split(delimiter);
    if (parts.length <= 1) return value;

    switch (index) {
      case 'first': return parts[0] || value;
      case 'second': return parts[1] || value;
      case 'last': return parts[parts.length - 1] || value;
      case 'second_from_last':
        return parts.length >= 2 ? parts[parts.length - 2] : value;
      case 'all': return parts.join(', ');
      default: return value;
    }
  },
  word_count: (value) => {
    if (typeof value !== 'string') return value;
    const str = value.trim();
    return str === '' ? 0 : str.split(/\s+/).length;
  },
  url_encode: (value) => {
    if (typeof value !== 'string') return value;
    try {
      return encodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }
};

// In numberFormatters object
const numberFormatters = {
  locale_format: (value, locale) => {
    if (isNaN(value) || value === null || value === undefined) {
      console.warn(`Invalid number for locale_format: ${value}`);
      return value;
    }
    try {
      // Use 'latn' numbering system to ensure standard Arabic numerals (0-9)
      return new Intl.NumberFormat(locale || 'en-US', { numberingSystem: 'latn' }).format(Number(value));
    } catch (error) {
      console.warn(`Invalid locale for locale_format: ${locale}`);
      return value;
    }
  },
  currency_format: (value, currency, locale) => {
    if (isNaN(value) || value === null || value === undefined) {
      console.warn(`Invalid number for currency_format: ${value}`);
      return value;
    }
    if (!currency) {
      console.warn(`Missing currency code for currency_format`);
      return value;
    }
    try {
      // Use 'latn' numbering system for currency formatting as well
      return new Intl.NumberFormat(locale || 'en-US', {
        style: 'currency',
        currency: currency,
        numberingSystem: 'latn'
      }).format(Number(value));
    } catch (error) {
      console.warn(`Invalid currency code or locale for currency_format: currency=${currency}, locale=${locale}`);
      return value;
    }
  },
  round_number: (value, decimals) => {
    if (isNaN(value) || value === null || value === undefined) {
      console.warn(`Invalid number for round_number: ${value}`);
      return value;
    }
    const decimalPlaces = parseInt(decimals) || 0;
    if (decimalPlaces < 0) {
      console.warn(`Invalid decimal places for round_number: ${decimals}`);
      return value;
    }
    try {
      return Number(Number(value).toFixed(decimalPlaces));
    } catch (error) {
      console.warn(`Error rounding number: ${value}`);
      return value;
    }
  },
  phone_format: (value, format, countryCode, formData, inputField, inputType = 'combined') => {
    if (typeof value !== 'string' || !value.trim()) {
      return {
        output: value,
        error: 'Phone number cannot be empty',
        status: 'skipped'
      };
    }

    // Determine country code - check for _countryCode field first
    let effectiveCountryCode = countryCode;
    if (formData && inputField) {
      const countryCodeKey = `${inputField}_countryCode`;
      effectiveCountryCode = formData[countryCodeKey] || countryCode;
    }

    try {
      let phoneNumber;

      // Handle case where input is just a country code (like "IN")
      if (inputType === 'country_code' || value.length <= 3) {
        try {
          // Try to get calling code for the input value (might be country code or calling code)
          let callingCode;

          if (/^\+?\d+$/.test(value)) {
            // If it's numeric (like "91" or "+91")
            callingCode = value.startsWith('+') ? value : `+${value}`;
          } else {
            // If it's a country code (like "IN")
            callingCode = `+${getCountryCallingCode(value.toUpperCase())}`;
          }

          // Get calling code for target country
          const targetCallingCode = `+${getCountryCallingCode(countryCode)}`;

          return {
            output: targetCallingCode,
            status: 'completed'
          };
        } catch (e) {
          return {
            output: value,
            error: 'Could not convert country code',
            status: 'skipped'
          };
        }
      }

      // Handle different input types
      if (inputType === 'phone_number') {
        // Case: Only phone number is selected - validate and add country code
        if (!effectiveCountryCode) {
          return {
            output: value,
            error: 'Country code is required for phone number validation',
            status: 'skipped'
          };
        }

        phoneNumber = parsePhoneNumber(value, effectiveCountryCode);

        if (!phoneNumber || !phoneNumber.isValid()) {
          return {
            output: value,
            error: `Invalid phone number for country ${effectiveCountryCode}`,
            status: 'skipped'
          };
        }
      }
      else {
        // Case: Combined input - parse and replace country code if needed
        if (!effectiveCountryCode && !countryCode) {
          return {
            output: value,
            error: 'Country code is required for combined phone number validation',
            status: 'skipped'
          };
        }

        // First parse with original country code (if available)
        const originalCountry = effectiveCountryCode || countryCode || 'US';
        phoneNumber = parsePhoneNumber(value, originalCountry);

        if (!phoneNumber || !phoneNumber.isValid()) {
          return {
            output: value,
            error: `Invalid phone number for country ${originalCountry}`,
            status: 'skipped'
          };
        }

        // If we have a new country code to apply (different from original)
        if (countryCode && phoneNumber.country !== countryCode) {
          phoneNumber = parsePhoneNumber(phoneNumber.nationalNumber, countryCode);

          if (!phoneNumber || !phoneNumber.isValid()) {
            return {
              output: value,
              error: `Invalid phone number format for country ${countryCode}`,
              status: 'skipped'
            };
          }
        }
      }

      // Format based on requested format
      let formattedNumber;
      switch (format) {
        case 'E.164':
          formattedNumber = phoneNumber.format('E.164');
          break;
        case 'International':
          formattedNumber = phoneNumber.format('INTERNATIONAL');
          break;
        case 'National':
          formattedNumber = phoneNumber.format('NATIONAL');
          break;
        case 'No Country Code':
          formattedNumber = phoneNumber.format('NATIONAL')
            .replace(/^[+\d\s-]+/, '')
            .trim();
          break;
        case 'Clean National':
          formattedNumber = phoneNumber.format('NATIONAL')
            .replace(/[\s()-]/g, '')
            .replace(/^[+\d]+/, '');
          break;
        default:
          return {
            output: value,
            error: `Unsupported format: ${format}`,
            status: 'skipped'
          };
      }

      return {
        output: formattedNumber,
        status: 'completed'
      };
    } catch (error) {
      return {
        output: value,
        error: `Formatting failed: ${error.message}`,
        status: 'skipped'
      };
    }
  },
  math_operation: (value1, value2, operation) => {
    if (isNaN(value1) || value1 === null || value1 === undefined || isNaN(value2) || value2 === null || value2 === undefined) {
      console.warn(`Invalid numbers for math_operation: value1=${value1}, value2=${value2}`);
      throw new Error(`Invalid numbers: value1=${value1}, value2=${value2}`);
    }
    const num1 = Number(value1);
    const num2 = Number(value2);
    switch (operation) {
      case 'add':
        return num1 + num2;
      case 'subtract':
        return num1 - num2;
      case 'multiply':
        return num1 * num2;
      case 'divide':
        if (num2 === 0) {
          throw new Error('Division by zero');
        }
        return num1 / num2;
      default:
        console.warn(`Unsupported math operation: ${operation}`);
        throw new Error(`Unsupported math operation: ${operation}`);
    }
  }
};

// Updated processFormatter function
const processFormatter = (formatterConfig, formData) => {
  const { formatType, operation, inputField, inputField2, options, useCustomInput, customValue, outputVariable } = formatterConfig;
  const result = {
    nodeId: formatterConfig.nodeId || `formatter_${Date.now()}`,
    status: 'processed',
    operation,
    inputField,
    originalValue: undefined,
    secondInputField: inputField2 || undefined,
    secondOriginalValue: undefined,
    output: undefined
  };

  console.log('Form Data received:', JSON.stringify(formData, null, 2));
  let userValue = useCustomInput && customValue ? customValue : formData[inputField];
  let secondValue = inputField2 ? formData[inputField2] : (useCustomInput && customValue ? customValue : null);

  result.originalValue = userValue;
  result.secondOriginalValue = secondValue;

  // Handle missing values more gracefully
  if (userValue === undefined || userValue === null || userValue === '') {
    console.warn(`Missing value for field ${inputField}. Available keys: ${Object.keys(formData).join(', ')}`);
    result.status = 'skipped';
    result.output = userValue;
    result.error = `Missing value for field ${inputField}`;
    return result;
  }

  console.log(`Processing formatter for field ${inputField} with user value:`, userValue);

  try {
    let formattedValue = userValue;

    if (formatType === 'number' && operation === 'phone_format') {
      const countryCodeKey = inputField.endsWith('_phoneNumber')
        ? inputField.replace('_phoneNumber', '_countryCode')
        : `${inputField}_countryCode`;
      console.log(`Phone format inputs - inputField: ${inputField}, countryCode: ${options.countryCode}, inputType: ${options.inputType || 'phone_number'}, countryCodeKey: ${countryCodeKey}, countryCodeValue: ${formData[countryCodeKey] || 'not found'}`);
      const phoneResult = numberFormatters.phone_format(
        userValue,
        options.format,
        options.countryCode,
        formData,
        inputField,
        options.inputType || 'phone_number'
      );

      formattedValue = phoneResult.output;
      result.status = phoneResult.status;
      if (phoneResult.error) {
        result.error = phoneResult.error;
        result.status = 'skipped'; // Ensure skipped status for phone format errors
      }
    } else if (formatType === 'date') {
      switch (operation) {
        case 'format_date':
          formattedValue = dateFormatters.format_date(userValue, options.format, options.timezone || 'UTC');
          break;
        case 'format_time':
          formattedValue = dateFormatters.format_time(userValue, options.format, options.timezone || 'UTC', options.targetTimezone);
          break;
        case 'format_datetime':
          formattedValue = dateFormatters.format_datetime(userValue, options.format, options.timezone || 'UTC', options.targetTimezone);
          break;
        case 'timezone_conversion':
          if (!options.timezone || !options.targetTimezone) {
            throw new Error('Timezone conversion requires both source and target timezones');
          }
          formattedValue = dateFormatters.timezone_conversion(userValue, options.timezone, options.targetTimezone);
          break;
        case 'add_date':
          if (!options.unit || !options.value) {
            throw new Error('Add date requires unit and value');
          }
          formattedValue = dateFormatters.add_date(userValue, options.unit, options.value, options.timezone || 'UTC');
          break;
        case 'subtract_date':
          if (!options.unit || !options.value) {
            throw new Error('Subtract date requires unit and value');
          }
          formattedValue = dateFormatters.subtract_date(userValue, options.unit, options.value, options.timezone || 'UTC');
          break;
        case 'date_difference':
          if (!inputField2 || secondValue === undefined || secondValue === null) {
            throw new Error(`Date difference requires a valid second input value for field ${inputField2 || 'none'}`);
          }
          formattedValue = dateFormatters.date_difference(userValue, secondValue, options.unit || 'days', options.timezone || 'UTC');
          break;
        default:
          console.warn(`Unsupported date formatter operation: ${operation}`);
          formattedValue = userValue;
      }
    } else if (formatType === 'text') {
      switch (operation) {
        case 'uppercase':
          formattedValue = textFormatters.uppercase(String(formattedValue));
          break;
        case 'lowercase':
          formattedValue = textFormatters.lowercase(String(formattedValue));
          break;
        case 'title_case':
          formattedValue = textFormatters.title_case(String(formattedValue));
          break;
        case 'trim_whitespace':
          formattedValue = textFormatters.trim_whitespace(String(formattedValue));
          break;
        case 'replace':
          formattedValue = textFormatters.replace(
            String(formattedValue),
            {
              searchValue: options?.searchValue,
              replaceValue: options?.replaceValue
            }
          );
          break;
        case 'extract_email':
          formattedValue = textFormatters.extract_email(String(formattedValue));
          break;
        case 'split':
          formattedValue = textFormatters.split(
            String(formattedValue),
            {
              delimiter: options?.delimiter,
              index: options?.index
            }
          );
          break;
        case 'word_count':
          formattedValue = textFormatters.word_count(String(formattedValue));
          break;
        case 'url_encode':
          formattedValue = textFormatters.url_encode(String(formattedValue));
          break;
        default:
          console.warn(`Unsupported text formatter operation: ${operation}`);
          formattedValue = userValue;
      }
    } else if (formatType === 'number') {
      switch (operation) {
        case 'locale_format':
          formattedValue = numberFormatters.locale_format(userValue, options.locale);
          break;
        case 'currency_format':
          formattedValue = numberFormatters.currency_format(userValue, options.currency, options.locale);
          break;
        case 'round_number':
          formattedValue = numberFormatters.round_number(userValue, options.decimals);
          break;
        case 'phone_format':
          formattedValue = numberFormatters.phone_format(userValue, options.format, options.countryCode, formData, inputField);
          break;
        case 'math_operation':
          if (!inputField2 || secondValue === undefined || secondValue === null) {
            throw new Error(`Math operation requires a valid second input value for field ${inputField2 || 'none'}`);
          }
          formattedValue = numberFormatters.math_operation(userValue, secondValue, options.operation);
          break;
        default:
          console.warn(`Unsupported number formatter operation: ${operation}`);
          formattedValue = userValue;
      }
    } else {
      console.warn(`Unsupported formatter type: ${formatType}`);
      formattedValue = userValue;
    }

    result.output = formattedValue;
    if (result.status !== 'skipped') {
      result.status = 'completed';
    }
    if (outputVariable) {
      result.outputVariable = outputVariable;
    }

    console.log(`Formatted result:`, JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(`Error applying formatter ${operation} to field ${inputField}:`, error);
    result.output = userValue;
    result.status = operation === 'phone_format' ? 'skipped' : 'failed';
    result.error = error.message;
  }

  return result;
};
async function fetchSheetColumns(spreadsheetId, sheetName, accessToken) {
  const encodedRange = encodeURIComponent(`1:1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;

  const resp = await fetch(
    url,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  return data.values?.[0] || [];
}

async function updateSheetColumns(spreadsheetId, sheetName, columns, accessToken) {
  const encodedRange = encodeURIComponent(`1:1`);
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}!1:1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [columns] })
    }
  );
  if (!resp.ok) throw new Error(await resp.text());
}
async function appendRow(spreadsheetId, sheetName, row, accessToken) {
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:Z:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    }
  );
  if (!resp.ok) throw new Error(await resp.text());
  return await resp.json();
}
// Util: Evaluate condition on a row
function evaluatesheetCondition(condition, row, headers) {
  const colIndex = headers.indexOf(condition.field);
  if (colIndex === -1) return false; // No such column
  const cellValue = row[colIndex] || "";

  switch (condition.operator) {
    case "=":
      return cellValue == condition.value;
    case "!=":
      return cellValue != condition.value;
    case "LIKE":
      return cellValue.includes(condition.value);
    case "NOT LIKE":
      return !cellValue.includes(condition.value);
    case "STARTS WITH":
      return cellValue.startsWith(condition.value);
    case "ENDS WITH":
      return cellValue.endsWith(condition.value);
    default:
      return false;
  }
}

// Util: Evaluate the full custom logic on a row, given conditions array, headers, row data
// A safer alternative to the eval() approach
function evaluatesheetCustomLogic(customLogic, conditions, row, headers) {
  const results = {};
  conditions.forEach((cond, idx) => {
    results[idx + 1] = evaluatesheetCondition(cond, row, headers);
  });

  const tokens = customLogic.toUpperCase().split(/\s+/);
  const outputQueue = [];
  const operatorStack = [];

  const precedence = {
    'AND': 2,
    'OR': 1
  };

  function processOperator() {
    while (operatorStack.length > 0 &&
      precedence[operatorStack[operatorStack.length - 1]] >= precedence[tokens[i]]) {
      outputQueue.push(operatorStack.pop());
    }
    operatorStack.push(tokens[i]);
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token in precedence) {
      processOperator();
    } else if (token === '(') {
      operatorStack.push(token);
    } else if (token === ')') {
      while (operatorStack[operatorStack.length - 1] !== '(') {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.pop(); // Pop the '('
    } else {
      // It's a number
      outputQueue.push(parseInt(token, 10));
    }
  }

  while (operatorStack.length > 0) {
    outputQueue.push(operatorStack.pop());
  }

  const evaluationStack = [];
  outputQueue.forEach(token => {
    if (typeof token === 'number') {
      evaluationStack.push(results[token]);
    } else {
      const right = evaluationStack.pop();
      const left = evaluationStack.pop();
      if (token === 'AND') {
        evaluationStack.push(left && right);
      } else if (token === 'OR') {
        evaluationStack.push(left || right);
      }
    }
  });

  return evaluationStack[0];
}

// Note: This is a simplified example and does not handle all edge cases.
// It is intended to show a conceptual alternative to `eval()`.
async function runGoogleMapping({ node, formData, accessToken }) {
  const mappings = node.fieldMappings || [];
  const spreadsheetId = node.config?.spreadsheetId || 'id';
  const sheetName = node.config?.sheetName || 'Sheet1';
  const conditions = node.config?.sheetConditions || [];
  const customLogic = node.config?.customLogic || "1";
  // New configuration variable to check
  const updateMultiple = node.config?.updateMultiple || false;
  console.log('Node ', node);

  try {
    let existingColumns = await fetchSheetColumns(spreadsheetId, sheetName, accessToken);
    console.log('Existing columns:', existingColumns);
    const requiredColumns = mappings.map(m => m.column.trim());
    const newColumns = requiredColumns.filter(c => !existingColumns.includes(c));
    console.log('New columns:', newColumns);
    if (newColumns.length > 0) {
      const updatedColumns = [...existingColumns, ...newColumns];
      await updateSheetColumns(spreadsheetId, sheetName, updatedColumns, accessToken);
      existingColumns = updatedColumns;
    }

    console.log('Existing columns after update:', existingColumns);
    // 2. Fetch all rows (except header) to evaluate against conditions
    const rowsResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/2:1000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!rowsResp.ok) throw new Error(await rowsResp.text());
    const rowsData = await rowsResp.json();
    const rows = rowsData.values || [];

    // Prepare row data from formData with existingColumns order
    const newRow = existingColumns.map(col => {
      const map = mappings.find(m => m.column.trim() === col);
      return map ? (formData[map.id] ?? '') : '';
    });

    let updatedRowsCount = 0;
    const updatePromises = [];

    // 3. Conditional logic to either update one row or multiple rows
    if (updateMultiple) {
      // Logic to update ALL matched rows
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (evaluatesheetCustomLogic(customLogic, conditions, row, existingColumns)) {
          const matchedRowIndex = i + 2;
          console.log(`Matched row at index ${matchedRowIndex}:`, row);

          const updatePromise = fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${matchedRowIndex}:${matchedRowIndex}?valueInputOption=RAW`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ values: [newRow] }),
            }
          ).then(resp => {
            if (!resp.ok) {
              return resp.text().then(text => Promise.reject(new Error(text)));
            }
            return resp.json();
          });
          updatePromises.push(updatePromise);
        }
      }
      updatedRowsCount = updatePromises.length;
      await Promise.all(updatePromises);
    } else {
      // Logic to update ONLY the first matched row
      let matchedRowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (evaluatesheetCustomLogic(customLogic, conditions, row, existingColumns)) {
          console.log('Matched row:', row);
          matchedRowIndex = i + 2;
          break; // Stop after the first match
        }
      }

      if (matchedRowIndex >= 2) {
        const updateResp = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${matchedRowIndex}:${matchedRowIndex}?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: [newRow] }),
          }
        );
        if (!updateResp.ok) throw new Error(await updateResp.text());
        updatedRowsCount = 1;
      }
    }

    // 4. Final message based on result
    if (updatedRowsCount === 0) {
      const appendResult = await appendRow(spreadsheetId, sheetName, newRow, accessToken);
      console.log('Appended row:', appendResult);
      return { success: true, message: 'Data written successfully (new row appended)', appendResult };
    } else {
      return { success: true, message: `${updatedRowsCount} rows updated.` };
    }
  } catch (error) {
    console.error('Error in runGoogleMapping:', error);
    return { success: false, message: error.message, error };
  }
}
async function fetchSheetData(
  sheetId,
  access_token,
  {
    conditions = [],
    sortOrder = 'ASC',
    sortByField = null,
    returnLimit = null,
    logicType = 'AND',
    customLogic = null
  }
) {
  // 1. Fetch sheet metadata and columns
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=true&fields=sheets/data/rowData/values`;
  const metaRes = await fetch(metaUrl, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!metaRes.ok) throw new Error(`Failed to fetch sheet data: ${await metaRes.text()}`);
  const metaData = await metaRes.json();

  // 2. Extract all rows from first sheet
  const rows = metaData.sheets?.[0]?.data?.[0]?.rowData || [];
  if (rows.length === 0) return [];

  // 3. Extract headers from first row
  const headers = (rows[0].values || []).map(cell => (cell.formattedValue || "").trim());

  // 4. Extract row data (skip headers row)
  const dataRows = rows.slice(1).map(r =>
    (r.values || []).map(cell => cell.formattedValue || null)
  );

  // 5. Map rows to objects by header
  let records = dataRows.map(row =>
    headers.reduce((obj, header, i) => {
      obj[header] = row[i] === undefined ? null : row[i];
      return obj;
    }, {})
  );

  // Util: Condition evaluation for a row/record
  function evaluateFindSheetCondition(cond, record) {
    const recordValue = record[cond.field] ?? null;
    const value = cond.value;
    const operator = cond.operator || '=';
    if (value === null || value === undefined || value === "") {
      if (operator === '=') return recordValue === null || recordValue === '';
      if (operator === '!=') return recordValue !== null && recordValue !== '';
      return true;
    }
    switch (operator) {
      case '=': return recordValue == value;
      case '!=': return recordValue != value;
      case 'LIKE': return recordValue && recordValue.toString().includes(value);
      case 'NOT LIKE': return recordValue && !recordValue.toString().includes(value);
      default: return true; // unsupported operators fallback
    }
  }

  // Util: SAFE custom logic evaluator ("1 AND 2 OR 3", etc.)
  function evaluateFindCustomLogic(boolArray, logicStr) {
    // Replace condition numbers with their Boolean values in the logic string
    const expr = logicStr.replace(/\b\d+\b/g, match => {
      const idx = Number(match) - 1;
      return (idx >= 0 && idx < boolArray.length) ? (boolArray[idx] ? "true" : "false") : "false";
    });

    // Replace AND/OR with JS equivalents
    const jsExpr = expr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||');
    // Remove any illegal characters for safety (parentheses, spaces allowed)
    if (!/^([\s()truefalse&|]+)$/.test(jsExpr)) return false;
    try {
      // Safe evaluation
      // eslint-disable-next-line no-new-func
      return Function(`"use strict";return (${jsExpr});`)();
    } catch {
      return false;
    }
  }

  // 6. Filtering
  records = records.filter(record => {
    // Evaluate condition results
    const boolResults = conditions.map(cond => evaluateFindSheetCondition(cond, record));
    if (logicType === 'Custom' && customLogic) {
      // Use custom logic (e.g., "1 AND 2 OR 3")
      return evaluateFindCustomLogic(boolResults, customLogic);
    } else {
      // Fallback to 'AND' or 'OR'
      if (logicType === 'OR') return boolResults.some(Boolean);
      // Default/AND
      return boolResults.every(Boolean);
    }
  });

  // 7. Sort if sortByField provided and valid
  if (sortByField && headers.includes(sortByField)) {
    const direction = sortOrder.toUpperCase() === 'DESC' ? -1 : 1;
    records.sort((a, b) => {
      if (a[sortByField] == null) return 1 * direction;
      if (b[sortByField] == null) return -1 * direction;
      if (a[sortByField] < b[sortByField]) return -1 * direction;
      if (a[sortByField] > b[sortByField]) return 1 * direction;
      return 0;
    });
  }

  // 8. Apply returnLimit
  if (returnLimit && !isNaN(returnLimit)) {
    records = records.slice(0, Number(returnLimit));
  }

  return records;
}

/**
 * FindGoogleSheet node executor
 */
async function runGoogleSheetFindNode({
  sfInstanceUrl,
  sfToken,
  userId,
  node
}) {
  let tokenRefreshed = false;

  try {
    const spreadsheetId = node.config?.spreadsheetId;
    if (!sfInstanceUrl || !sfToken || !userId || !spreadsheetId) {
      return { error: "Missing required fields: sfInstanceUrl, sfToken, userId, spreadsheetId" };
    }

    // 1. Query Salesforce for GoogleCredentials__c
    const soql = `
      SELECT Id, Access_Token__c, Refresh_Token__c, Expiry__c, LastModifiedDate
      FROM GoogleCredentials__c
      WHERE User_Id__c='${userId}'
        AND TokenType__c='google-sheet'
      ORDER BY LastModifiedDate DESC
      LIMIT 1
    `;

    const queryUrl = `${sfInstanceUrl}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(soql)}`;
    let sfRes = await fetch(queryUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${sfToken}`, "Content-Type": "application/json" }
    });

    if (!sfRes.ok && sfRes.status === 401 && !tokenRefreshed) {
      sfToken = await fetchNewAccessToken(userId);
      tokenRefreshed = true;
      sfRes = await fetch(queryUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${sfToken}`, "Content-Type": "application/json" }
      });
    }
    if (!sfRes.ok) {
      throw new Error(`Failed to query Salesforce: ${await sfRes.text()}`);
    }

    const sfData = await sfRes.json();
    if (!sfData.records || sfData.records.length === 0) {
      return { error: "No Google Credentials found for user" };
    }
    function isTokenValid(lastModifiedDateStr) {
      if (!lastModifiedDateStr) return false;
      const lastModifiedDate = new Date(lastModifiedDateStr);
      const expiryTime = new Date(lastModifiedDate.getTime() + 60 * 60 * 1000); // 1 hour
      const now = new Date();
      return now < expiryTime;
    }
    const credential = sfData.records[0];
    let access_token = credential.Access_Token__c;
    const refresh_token = credential.Refresh_Token__c;
    const tokenValid = isTokenValid(credential.LastModifiedDate);

    // 2. Refresh Google token if expired
    if (!tokenValid) {
      if (!refresh_token) {
        return { error: "Refresh token missing; please re-authenticate" };
      }
      const newTokens = await refreshGoogleAccessToken(refresh_token);
      access_token = newTokens.access_token;

      await updateSalesforceCredential(sfInstanceUrl, sfToken, credential.Id, {
        Access_Token__c: access_token,
        Expiry__c: 3600,
        Refresh_Token__c: newTokens.refresh_token || refresh_token,
      });
    }

    // 3. Fetch Sheet data with filters
    const conditions = node.config?.findSheetConditions || [];
    const sortOrder = node.config?.googleSheetSortOrder || "ASC";
    const sortByField = node.config?.googleSheetSortField || null;
    const returnLimit = node.config?.googleSheetReturnLimit || null;
    const customLogic = node.config?.customLogic || null;
    const logicType = node.config?.logicType || 'AND';

    const records = await fetchSheetData(spreadsheetId, access_token, {
      conditions,
      sortOrder,
      sortByField,
      returnLimit,
      customLogic,
      logicType
    });
    console.log('Records ', records)
    return {
      nodeId: node.nodeId,
      records,
      ...(tokenRefreshed ? { newAccessToken: sfToken } : {})
    };

  } catch (err) {
    console.error("runGoogleSheetFindNode error:", err);
    return { error: err.message || "FindGoogleSheet failed" };
  }
}


const runFlow = async (nodes, formData, instanceUrl, token, userId, formVersionId, submissionId) => {
  const salesforceBaseUrl = `https://${instanceUrl.replace(/https?:\/\//, '')}/services/data/v60.0`;
  const results = {};
  const processedNodeIds = new Set();

  // Create node map for quick lookup
  const nodeMap = {};
  nodes.forEach(node => {
    nodeMap[node.Node_Id__c || node.nodeId] = node;
  });

  // Sort nodes by order
  const sortedNodes = [...nodes].sort((a, b) =>
    parseInt(a.Order__c || a.order) - parseInt(b.Order__c || b.order)
  );

  let currentContext = { ...formData };
  let skipUntilNextCondition = false;

  for (const node of sortedNodes) {
    const nodeId = node.Node_Id__c || node.nodeId;
    const nodeType = node.Type__c || node.type;

    if (nodeType === 'Start' || nodeType === 'End' || processedNodeIds.has(nodeId)) {
      continue;
    }

    console.log(`Processing node ${nodeId} of type ${nodeType}`);

    // Skip nodes until we hit the next condition node
    if (skipUntilNextCondition && nodeType !== 'Condition') {
      results[nodeId] = {
        nodeId,
        status: 'skipped',
        reason: 'Previous condition not met'
      };

      // Log skipped node
      await logNodeEventDirect({
        userId,
        submissionId,
        formId: formData.formId,
        formVersionId,
        nodeType,
        type: 'Mapping',
        subType: nodeType,
        status: 'Skipped',
        message: 'Previous condition not met',
        input: { context: currentContext },
        output: { result: 'skipped' }
      });

      processedNodeIds.add(nodeId);
      continue;
    }
    if (nodeType === 'action' || nodeType === 'Google Sheet') {
      try {
        console.log('Here 1')
        // Query Salesforce for GoogleCredentials__c record(s) for userId
        const soql = `
      SELECT Id, Access_Token__c, Refresh_Token__c, Expiry__c, LastModifiedDate 
      FROM GoogleCredentials__c 
      WHERE User_Id__c='${userId}' 
        AND TokenType__c = 'google-sheet' 
      ORDER BY LastModifiedDate DESC LIMIT 1
    `;

        let queryUrl = `https://${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`;
        let sfRes = await fetch(queryUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!sfRes.ok) {
          if (sfRes.status === 401) {
            tokenRefreshed = true;
            newAccessToken = fetchNewAccessToken(userId);
            sfRes = await fetch(queryUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
          }
          if (!sfRes.ok) {
            const errorText = await sfRes.text();
            return {
              statusCode: sfRes.status,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              body: JSON.stringify({ error: "Failed to query Salesforce", details: errorText }),
            };
          }
        }
        const sfData = await sfRes.json();
        console.log("Salesforce query result:", sfData);
        if (!sfData.records || sfData.records.length === 0) {
          return {
            statusCode: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ error: "No Google Credentials found for user" }),
          };
        }

        const credential = sfData.records[0];
        let access_token = credential.Access_Token__c;
        console.log('Google mapping data', node, currentContext)
        const googleMappingResult = await runGoogleMapping({
          node,
          formData: currentContext,
          accessToken: access_token
        });
        results[node.nodeId] = googleMappingResult;
        console.log('Google mapping result', googleMappingResult)
        // Log success or failure
        await logNodeEventDirect({
          userId,
          submissionId,
          nodeId: node.nodeId,
          type: 'GoogleSheetMapping',
          status: googleMappingResult.success ? 'Success' : 'Failed',
          message: googleMappingResult.message,
          error: googleMappingResult.error || null,
          input: currentContext,
          output: googleMappingResult
        });
      } catch (ex) {
        console.error('GoogleSheetMapping node error:', ex);
        results[node.nodeId] = { success: false, error: ex.message || 'Unknown error' };
      }

      continue;

    }
    try {
      // Handle Condition nodes
      // if (nodeType === 'Condition') {
      //   const conditions = node.Conditions__c ? JSON.parse(node.Conditions__c) : node.conditions || {};
      //   const pathOption = conditions.pathOption || 'Rules';

      //   // Always Run path - just continue to next node
      //   if (pathOption === 'Always Run') {
      //     skipUntilNextCondition = false;
      //     results[nodeId] = {
      //       nodeId,
      //       status: 'processed',
      //       message: 'Always Run path - proceeding to next node'
      //     };

      //     await logNodeEventDirect({
      //       userId,
      //       submissionId,
      //       formId: formData.formId,
      //       formVersionId,
      //       nodeType,
      //       type: 'Mapping',
      //       subType: nodeType,
      //       status: 'Success',
      //       message: 'Always Run path - proceeding to next node',
      //       input: { conditions, pathOption },
      //       output: { result: 'always_run' }
      //     });

      //     continue;
      //   }

      //   // Rules path - evaluate conditions
      //   if (pathOption === 'Rules') {
      //     const soqlQuery = buildSOQLQuery({
      //       ...node,
      //       type: 'Find',
      //       conditions: conditions
      //     });

      //     if (!soqlQuery) {
      //       throw new Error('Failed to build SOQL query');
      //     }

      //     const queryData = await executeSOQLQuery(soqlQuery, salesforceBaseUrl, token);
      //     const matchedRecords = processQueryResults(queryData, conditions);

      //     if (matchedRecords.length > 0) {
      //       skipUntilNextCondition = false;
      //       results[nodeId] = {
      //         nodeId,
      //         status: 'processed',
      //         message: `${matchedRecords.length} records matched - proceeding`,
      //         recordsMatched: matchedRecords.length
      //       };
      //       await logNodeEventDirect({
      //         userId,
      //         submissionId,
      //         formId: formData.formId,
      //         formVersionId,
      //         nodeType,
      //         type: 'Mapping',
      //         subType: nodeType,
      //         status: 'Success',
      //         message: `${matchedRecords.length} records matched - proceeding`,
      //         input: { conditions, soqlQuery },
      //         output: { 
      //           recordsMatched: matchedRecords.length,
      //           recordIds: matchedRecords.map(r => r.Id)
      //         }
      //       });

      //     } else {
      //       skipUntilNextCondition = true;
      //       results[nodeId] = {
      //         nodeId,
      //         status: 'processed',
      //         message: 'No records matched - skipping until next condition',
      //         recordsMatched: 0
      //       };

      //       await logNodeEventDirect({
      //         userId,
      //         submissionId,
      //         formId: formData.formId,
      //         formVersionId,
      //         nodeType,
      //         type: 'Mapping',
      //         subType: nodeType,
      //         status: 'Success',
      //         message: 'No records matched - skipping until next condition',
      //         input: { conditions, soqlQuery },
      //         output: { recordsMatched: 0 }
      //       });
      //     }
      //     continue;
      //   }

      //   // Fallback path - only runs when Rules path fails
      //   if (pathOption === 'Fallback') {
      //     if (!skipUntilNextCondition) {
      //       results[nodeId] = {
      //         nodeId,
      //         status: 'skipped',
      //         reason: 'Previous condition succeeded - fallback not needed'
      //       };

      //       await logNodeEventDirect({
      //         userId,
      //         submissionId,
      //         formId: formData.formId,
      //         formVersionId,
      //         nodeType,
      //         type: 'Mapping',
      //         subType: nodeType,
      //         status: 'Skipped',
      //         message: 'Previous condition succeeded - fallback not needed',
      //         input: { conditions, pathOption },
      //         output: { result: 'fallback_skipped' }
      //       });

      //       continue;
      //     }

      //     skipUntilNextCondition = false;
      //     results[nodeId] = {
      //       nodeId,
      //       status: 'processed',
      //       message: 'Fallback path - proceeding to next node'
      //     };

      //     await logNodeEventDirect({
      //       userId,
      //       submissionId,
      //       formId: formData.formId,
      //       formVersionId,
      //       nodeType,
      //       type: 'Mapping',
      //       subType: nodeType,
      //       status: 'Success',
      //       message: 'Fallback path - proceeding to next node',
      //       input: { conditions, pathOption },
      //       output: { result: 'fallback_executed' }
      //     });

      //     continue;
      //   }
      // }

      if (nodeType === 'Condition') {
        const conditions = node.Conditions__c ? JSON.parse(node.Conditions__c) : node.conditions || {};
        const pathOption = conditions.pathOption || 'Rules';

        let conditionResult;
        let logData = {
          userId,
          submissionId,
          formId: formData.formId,
          formVersionId,
          nodeType,
          type: 'Mapping',
          subType: nodeType,
          input: { conditions, pathOption }
        };

        // Always Run path
        if (pathOption === 'Always Run') {
          skipUntilNextCondition = false;
          conditionResult = {
            nodeId,
            status: 'processed',
            message: 'Always Run path - proceeding to next node'
          };
          logData.status = 'Success';
          logData.message = 'Always Run path - proceeding to next node';
          logData.output = { result: 'always_run' };
        }
        // Rules path
        else if (pathOption === 'Rules') {
          const soqlQuery = buildSOQLQuery({
            ...node,
            type: 'Find',
            conditions: conditions
          });

          if (!soqlQuery) {
            throw new Error('Failed to build SOQL query');
          }

          const queryData = await executeSOQLQuery(userId, soqlQuery, salesforceBaseUrl, token);
          const matchedRecords = processQueryResults(queryData, conditions);

          if (matchedRecords.length > 0) {
            skipUntilNextCondition = false;
            conditionResult = {
              nodeId,
              status: 'processed',
              message: `${matchedRecords.length} records matched - proceeding`,
              recordsMatched: matchedRecords.length
            };
            logData.status = 'Success';
            logData.message = `${matchedRecords.length} records matched - proceeding`;
            logData.output = {
              recordsMatched: matchedRecords.length,
              recordIds: matchedRecords.map(r => r.Id)
            };
          } else {
            skipUntilNextCondition = true;
            conditionResult = {
              nodeId,
              status: 'processed',
              message: 'No records matched - skipping until next condition',
              recordsMatched: 0
            };
            logData.status = 'Success';
            logData.message = 'No records matched - skipping until next condition';
            logData.output = { recordsMatched: 0 };
          }
        }
        // Fallback path
        else if (pathOption === 'Fallback') {
          if (!skipUntilNextCondition) {
            conditionResult = {
              nodeId,
              status: 'skipped',
              reason: 'Previous condition succeeded - fallback not needed'
            };
            logData.status = 'Skipped';
            logData.message = 'Previous condition succeeded - fallback not needed';
            logData.output = { result: 'fallback_skipped' };
          } else {
            skipUntilNextCondition = false;
            conditionResult = {
              nodeId,
              status: 'processed',
              message: 'Fallback path - proceeding to next node'
            };
            logData.status = 'Success';
            logData.message = 'Fallback path - proceeding to next node';
            logData.output = { result: 'fallback_executed' };
          }
        }

        // Store the result and log it
        results[nodeId] = conditionResult;
        await logNodeEventDirect(logData);

        processedNodeIds.add(nodeId);
        continue;
      }

      // Process other node types only if not skipping
      if (!skipUntilNextCondition) {
        let nodeResult;
        let inputData = {};

        switch (nodeType) {
          case 'CreateUpdate':
            inputData.nodeConfig = {
              context: currentContext,
              salesforceObject: node.salesforceObject,
              conditions: node.conditions,
              fieldMappings: node.fieldMappings
            };
            nodeResult = await createUpdateNode(userId, node, currentContext, salesforceBaseUrl, token);
            break;
          case 'Find':
          case 'Filter':
            inputData.nodeConfig = {
              salesforceObject: node.salesforceObject,
              conditions: node.conditions,
              previousResults: results
            };
            if (inputData.nodeConfig.salesforceObject) {
              nodeResult = await queryNode(userId, node, salesforceBaseUrl, token);
            } else {
              nodeResult = await processQueryResults(node, results)
            }
            console.log('Node Results ', nodeResult);
            break;
          case "FindGoogleSheet": {  //  find google sheet node type
            console.log('Here Find google sheet', node)
            const googleFindResult = await runGoogleSheetFindNode({
              sfInstanceUrl: `https://${instanceUrl}`,
              sfToken: token,
              userId,
              node
            });
            nodeResult = googleFindResult;
            console.log('nodeResult', nodeResult)
            break;
          }
          case 'Loop':
            inputData.nodeConfig = {
              loopConfig: node.loopConfig,
              previousResults: results
            };

            // Get the source collection from previous results
            const sourceCollection = results[node.loopConfig.loopCollection];
            if (!sourceCollection) {
              throw new Error(`Source collection ${node.loopConfig.loopCollection} not found in previous results`);
            }

            nodeResult = await processLoopNode(node, results, currentContext, salesforceBaseUrl, token);

            // Update context with loop results for subsequent nodes
            if (nodeResult.loopContext) {
              currentContext = { ...currentContext, ...nodeResult.loopContext };
            }

            // Store loop results for potential use by other nodes
            results[nodeId] = nodeResult;
            break;
          case 'Path':
            nodeResult = { status: 'processed', message: 'Path node processed' };
            break;
          case 'Formatter':
            inputData.formatterConfig = node.formatterConfig;
            nodeResult = processFormatter(node.formatterConfig, currentContext);
            // Update context if formatter has output variable
            if (nodeResult.outputVariable && nodeResult.output !== undefined) {
              currentContext[nodeResult.outputVariable] = nodeResult.output;
            }
            break;
          case 'Google Sheet': {
            try {
              console.log('Here 2')
              // Query Salesforce for GoogleCredentials__c record(s) for userId
              const soql = `SELECT Id, Access_Token__c, Refresh_Token__c FROM GoogleCredentials__c WHERE User_Id__c='${userId}' AND TokenType__c = 'google-sheet'`;

              const queryUrl = `https://${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`;
              let sfRes = await fetch(queryUrl, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });

              if (!sfRes.ok) {
                if (sfRes.status === 401) {
                  tokenRefreshed = true;
                  newAccessToken = fetchNewAccessToken(userId);
                  sfRes = await fetch(queryUrl, {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  });
                }
                if (!sfRes.ok) {
                  const errorText = await sfRes.text();
                  results[node.nodeId] = {
                    success: false,
                    error: "Failed to query Salesforce",
                    details: errorText
                  };
                  break;
                }
              }

              const sfData = await sfRes.json();
              console.log('sfData', sfData)
              if (!sfData.records || sfData.records.length === 0) {
                results[node.nodeId] = {
                  success: false,
                  error: "No Google Credentials found for user"
                };
                break;
              }

              const credential = sfData.records[0];
              let access_token = credential.Access_Token__c;

              // Run Google Mapping Logic
              const googleMappingResult = await runGoogleMapping({
                node,
                formData: currentContext,
                accessToken: access_token
              });
              results[node.nodeId] = googleMappingResult;
              console.log('googleMappingResult', googleMappingResult)
              // Log success or failure
              await logNodeEventDirect({
                userId,
                submissionId,
                nodeId: node.nodeId,
                type: 'GoogleSheetMapping',
                status: googleMappingResult.success ? 'Success' : 'Failed',
                message: googleMappingResult.message,
                error: googleMappingResult.error || null,
                input: currentContext,
                output: googleMappingResult
              });

            } catch (ex) {
              console.error('GoogleSheetMapping node error:', ex);
              results[node.nodeId] = { success: false, error: ex.message || 'Unknown error' };
            }
            break;
          }
          default:
            nodeResult = { error: `Unsupported node type: ${nodeType}` };
        }

        results[nodeId] = nodeResult;

        // Log node result with detailed input/output
        await logNodeEventDirect({
          userId,
          submissionId,
          formId: formData.formId,
          formVersionId,
          nodeType,
          type: 'Mapping',
          subType: nodeType,
          status: nodeResult.status || (nodeResult.error ? 'Failed' : 'Success'),
          message: nodeResult.message || nodeResult.error || 'Node processed successfully',
          error: nodeResult.error,
          recordsMatched: nodeResult.recordsMatched,
          updatedRecords: nodeResult.updatedRecords,
          failedRecords: nodeResult.failedRecords,
          input: inputData,
          output: nodeResult
        });
      }

      processedNodeIds.add(nodeId);
    } catch (error) {
      console.error(`Error processing node ${nodeId}:`, error);
      results[nodeId] = { error: error.message };

      // Log node error with input context
      await logNodeEventDirect({
        userId,
        submissionId,
        formId: formData.formId,
        formVersionId,
        nodeType,
        type: 'Mapping',
        subType: nodeType,
        status: 'Failed',
        message: 'Error processing node',
        error: error.message,
        input: { context: currentContext },
        output: { error: error.message }
      });
    }
  }

  return results;
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, formVersionId, formData, nodes, submissionId } = body;
    const token = event.headers.Authorization?.split(' ')[1] || event.headers.authorization?.split(' ')[1];

    if (!userId || !instanceUrl || !formVersionId || !formData || !nodes || !Array.isArray(nodes) || !token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Missing required parameters: userId, instanceUrl, formVersionId, formData, nodes, or Authorization token',
        }),
      };
    }

    console.log('formData :: ', formData);
    const parsedNodes = nodes.map(node => {
      return {
        nodeId: node.Node_Id__c || node.nodeId,
        type: node.Type__c || node.actionType,
        order: node.Order__c || node.order || 0,
        salesforceObject: node.Salesforce_Object__c || node.salesforceObject,
        conditions: node.Conditions__c ? JSON.parse(node.Conditions__c) : node.conditions,
        fieldMappings: node.Field_Mappings__c ? JSON.parse(node.Field_Mappings__c) : node.fieldMappings,
        loopConfig: node.Config__c ? JSON.parse(node.Config__c) : node.loopConfig,
        formatterConfig: node.Config__c ? JSON.parse(node.Config__c) : node.formatterConfig,
        config: node.config || {}
      };
    });

    const actionNodes = parsedNodes.filter(node => !['Start', 'End'].includes(node.type));
    if (actionNodes.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Flow must contain at least one action node' }),
      };
    }

    const flowResults = await runFlow(parsedNodes, formData, instanceUrl, token, userId, formVersionId, submissionId);

    // Only consider results with status: 'failed' as critical errors
    const hasCriticalErrors = Object.values(flowResults).some(result =>
      result.status === 'failed' || (result.error && result.status !== 'skipped')
    );

    if (hasCriticalErrors) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          message: 'Flow executed with critical errors',
          results: flowResults,
        }),
      };
    }

    if (tokenRefreshed) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          message: 'Flow executed successfully',
          results: flowResults,
          newAccessToken: newAccessToken
        }),
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Flow executed successfully',
        results: flowResults,
      }),
    };
  } catch (error) {
    console.error('Error executing flow:', error);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to execute flow' }),
    };
  }

};

// helper function for direct DynamoDB logging with correct format
async function logNodeEventDirect(logData) {
  try {
    const timestamp = new Date().toISOString();
    const recordId = logData.submissionId || logData.tempSubmissionId;
    const subType = logData.subType || 'NA';

    // Simplify input and output based on node type
    let simplifiedInput = {};
    let simplifiedOutput = {};

    switch (logData.subType) {
      case 'CreateUpdate':
        simplifiedInput = simplifyCreateUpdateInput(logData.input);
        simplifiedOutput = simplifyCreateUpdateOutput(logData.output);
        break;
      case 'Find':
      case 'Filter':
        simplifiedInput = simplifyFindFilterInput(logData.input);
        simplifiedOutput = simplifyFindFilterOutput(logData.output);
        break;
      case 'Condition':
        simplifiedInput = simplifyConditionInput(logData.input);
        simplifiedOutput = simplifyConditionOutput(logData.output);
        break;
      case 'Loop':
        simplifiedInput = simplifyLoopInput(logData.input);
        simplifiedOutput = simplifyLoopOutput(logData.output);
        break;
      case 'Formatter':
        simplifiedInput = simplifyFormatterInput(logData.input);
        simplifiedOutput = simplifyFormatterOutput(logData.output);
        break;
      default:
        simplifiedInput = logData.input || {};
        simplifiedOutput = logData.output || {};
    }

    await dynamoClient.send(new PutItemCommand({
      TableName: LOG_TABLE_NAME,
      Item: {
        UserId: { S: logData.userId || '' },
        SK: { S: `LOG#Submission Log#${subType}` },
        RecordId: { S: recordId },
        RecordType: { S: 'Submission Log' },
        Type: { S: logData.type || 'Mapping' },
        SubType: { S: subType },
        Status: { S: logData.status || '' },
        Message: { S: logData.message || '' },
        Timestamp: { S: timestamp },
        FormId: { S: logData.formId || '' },
        FormVersionId: { S: logData.formVersionId || '' },
        RetryStatus: { S: 'N/A' },
        RetryAttempts: { N: '0' },
        Data: {
          S: JSON.stringify({
            input: simplifiedInput,
            output: simplifiedOutput,
          })
        },
      },
    }));

    console.log('Node event stored directly in DynamoDB:', logData.nodeId);
  } catch (error) {
    console.error('Failed to store node event in DynamoDB:', error);
  }
}

// Helper functions for simplifying input/output
function simplifyCreateUpdateInput(inputData) {
  if (!inputData?.nodeConfig) return {};

  const { context, salesforceObject, conditions, fieldMappings } = inputData.nodeConfig;

  // Extract only the visible form field values
  const formValues = {};
  if (context) {
    Object.keys(context).forEach(key => {
      if (context[key] !== undefined && context[key] !== null && context[key] !== '') {
        formValues[key] = context[key];
      }
    });
  }

  // Build SOQL query for conditions
  let query = null;
  if (conditions && conditions.conditions && conditions.conditions.length > 0) {
    try {
      const queryNode = {
        salesforceObject,
        conditions,
        type: 'Find'
      };
      query = buildSOQLQuery(queryNode);
    } catch (error) {
      query = 'Could not build query';
    }
  }

  // Simplify field mappings
  const mappings = fieldMappings?.map(mapping => ({
    from: mapping.formFieldId,
    to: mapping.salesforceField,
    value: context?.[mapping.formFieldId] || 'N/A'
  })) || [];

  return {
    object: salesforceObject,
    query: query,
    formValues: formValues,
    fieldMappings: mappings
  };
}

function simplifyCreateUpdateOutput(output) {
  if (!output) return {};

  return {
    nodeId: output.nodeId,
    success: output.success,
    updatedRecords: output.updatedRecords?.length || 0,
    failedRecords: output.failedRecords?.length || 0,
    status: output.status,
    recordId: output.recordId
  };
}

function simplifyFindFilterInput(inputData) {
  if (!inputData?.nodeConfig) return {};

  const { salesforceObject, conditions } = inputData.nodeConfig;

  // Build SOQL query
  let query = null;
  if (conditions) {
    try {
      const queryNode = {
        salesforceObject,
        conditions,
        type: 'Find'
      };
      query = buildSOQLQuery(queryNode);
    } catch (error) {
      query = 'Could not build query';
    }
  }

  return {
    object: salesforceObject,
    query: query
  };
}

function simplifyFindFilterOutput(output) {
  if (!output) return {};

  return {
    nodeId: output.nodeId,
    recordsFound: Array.isArray(output.ids) ? output.ids.length : (output.ids ? 1 : 0),
    recordIds: output.ids,
    message: output.message
  };
}

function simplifyConditionInput(inputData) {
  if (!inputData) return {};

  if (inputData.conditions && inputData.soqlQuery) {
    return {
      query: inputData.soqlQuery,
      pathOption: inputData.conditions?.pathOption
    };
  }

  return {
    pathOption: inputData.conditions?.pathOption
  };
}

function simplifyConditionOutput(output) {
  if (!output) return {};

  return {
    nodeId: output.nodeId,
    recordsMatched: output.recordsMatched || 0,
    shouldContinue: output.shouldContinue,
    message: output.message
  };
}

function simplifyLoopInput(inputData) {
  if (!inputData?.nodeConfig) return {};

  const { loopConfig, previousResults } = inputData.nodeConfig;

  return {
    sourceCollection: loopConfig?.loopCollection,
    itemsToProcess: previousResults?.[loopConfig?.loopCollection]?.ids?.length || 0
  };
}

function simplifyLoopOutput(output) {
  if (!output) return {};

  return {
    nodeId: output.nodeId,
    processedCount: output.processedCount || 0,
    status: output.status
  };
}

function simplifyFormatterInput(inputData) {
  if (!inputData?.formatterConfig) return {};

  const { formatType, operation, inputField, options } = inputData.formatterConfig;

  return {
    type: formatType,
    operation: operation,
    inputField: inputField,
    options: options
  };
}

function simplifyFormatterOutput(output) {
  if (!output) return {};

  return {
    nodeId: output.nodeId,
    operation: output.operation,
    inputValue: output.originalValue,
    outputValue: output.output,
    status: output.status,
    error: output.error
  };
}