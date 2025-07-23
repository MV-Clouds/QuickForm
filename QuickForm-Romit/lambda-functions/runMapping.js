import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

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

  // Handle both direct condition arrays and nested conditions object
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
      return null; // No query needed for creation
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

const executeSOQLQuery = async (soqlQuery, salesforceBaseUrl, token) => {
  if (!soqlQuery) {
    throw new Error('SOQL query is null or undefined');
  }
  console.log(`Executing SOQL Query: ${soqlQuery}`);
  const response = await fetch(`${salesforceBaseUrl}/query?q=${encodeURIComponent(soqlQuery)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`SOQL query failed: ${errorData[0]?.message || JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  console.log('SOQL Query Results:', JSON.stringify(data, null, 2));
  return data;
};

const processQueryResults = (data, conditions) => {
  if (!data.records || data.records.length === 0) {
    return [];
  }

  // Handle both direct condition arrays and nested conditions object
  const conds = Array.isArray(conditions) ? conditions : conditions?.conditions;
  const customLogic = !Array.isArray(conditions) ? conditions?.customLogic : null;

  if (customLogic) {
    return data.records.filter(record => 
      evaluateCustomLogic(conds, customLogic, record)
    );
  }

  return data.records;
};

const createUpdateNode = async (node, formData, salesforceBaseUrl, token) => {
  const { salesforceObject, conditions, fieldMappings, nodeId } = node;
  let recordId = null;

  console.log('Processing CreateUpdate Node:', nodeId);
  console.log('Form Data:', JSON.stringify(formData, null, 2));
  console.log('Field Mappings:', JSON.stringify(fieldMappings, null, 2));

  if (conditions && (Array.isArray(conditions) ? conditions.length > 0 : conditions.conditions?.length > 0)) {
    const soqlQuery = buildSOQLQuery(node);
    if (soqlQuery) {
      const queryData = await executeSOQLQuery(soqlQuery, salesforceBaseUrl, token);
      const matchedRecords = processQueryResults(queryData, conditions);
      
      if (matchedRecords.length > 0) {
        recordId = matchedRecords[0].Id;
        console.log(`Found matching record ID: ${recordId}`);
      } else {
        console.log('No matching records found');
      }
    }
  }

  const payload = {};
  let hasValidMapping = false;

  fieldMappings.forEach(mapping => {
    let value = mapping.formFieldId === '' && mapping.picklistValue !== undefined
      ? mapping.picklistValue
      : formData[mapping.formFieldId];

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
    throw new Error(`No valid field mappings for node ${nodeId}. Form Data: ${JSON.stringify(formData)}`);
  }

  // Validate required fields
  if (salesforceObject === 'Account' && !payload.Name) {
    throw new Error(`Missing required field 'Name' in payload for node ${nodeId}`);
  }
  if (salesforceObject === 'Contact' && !payload.LastName) {
    throw new Error(`Missing required field 'LastName' in payload for node ${nodeId}`);
  }

  console.log('Constructed Payload:', JSON.stringify(payload, null, 2));

  const method = recordId ? 'PATCH' : 'POST';
  const url = recordId 
    ? `${salesforceBaseUrl}/sobjects/${salesforceObject}/${recordId}`
    : `${salesforceBaseUrl}/sobjects/${salesforceObject}`;

  try {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log('Salesforce API Response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      throw new Error(`Failed to ${recordId ? 'update' : 'create'} ${salesforceObject}: ${JSON.stringify(responseData)}`);
    }

    if (!responseData.id && !responseData.success) {
      throw new Error(`No record created/updated for node ${nodeId}: ${JSON.stringify(responseData)}`);
    }

    return { nodeId, recordId: recordId || responseData.id };
  } catch (error) {
    console.error(`Error in ${method} request for node ${nodeId}:`, error);
    throw error;
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
    loopContext: loopResults.length > 0 ? loopResults[0].context : formData
  };
};

const queryNode = async (node, salesforceBaseUrl, token) => {
  const soqlQuery = buildSOQLQuery(node);
  const queryData = await executeSOQLQuery(soqlQuery, salesforceBaseUrl, token);
  const matchedRecords = processQueryResults(queryData, node.conditions);
  
  const ids = matchedRecords.map(record => record.Id);
  return { 
    nodeId: node.nodeId, 
    ids: ids.length > 1 ? ids : ids[0] 
  };
};

const getNodeData = async (nodeId, userId) => {
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

  const mappingItems = allItems.filter(item => item.ChunkIndex?.S?.startsWith('Mapping_'));
  let nodeData = null;

  if (mappingItems.length > 0) {
    try {
      const sortedMappingChunks = mappingItems
        .sort((a, b) => {
          const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
          const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
          return aNum - bNum;
        })
        .map(item => item.Mapping.S);
      const combinedMappings = sortedMappingChunks.join('');
      const mappings = JSON.parse(combinedMappings);

      if (mappings[nodeId]) {
        nodeData = {
          nodeId,
          type: mappings[nodeId].actionType || null,
          salesforceObject: mappings[nodeId].salesforceObject || null,
          conditions: mappings[nodeId].conditions ? JSON.parse(JSON.stringify(mappings[nodeId].conditions)) : null,
          fieldMappings: mappings[nodeId].fieldMappings || [],
          loopConfig: mappings[nodeId].loopConfig ? JSON.parse(JSON.stringify(mappings[nodeId].loopConfig)) : null,
          formatterConfig: mappings[nodeId].formatterConfig ? JSON.parse(JSON.stringify(mappings[nodeId].formatterConfig)) : null
        };
      }
    } catch (e) {
      console.warn('Failed to process Mapping chunks:', e.message, '\nStack trace:', e.stack);
      return null;
    }
  }

  return nodeData;
};

const runFlow = async (nodes, formData, instanceUrl, token, userId) => {
  const salesforceBaseUrl = `https://${instanceUrl.replace(/https?:\/\//, '')}/services/data/v60.0`;
  const results = {};
  
  const sortedNodes = nodes.sort((a, b) => parseInt(a.order) - parseInt(b.order));
  let currentContext = formData;

  console.log(`Running flow with ${sortedNodes.length} nodes`);
  console.log('Nodes to process:', JSON.stringify(sortedNodes, null, 2));

  for (const node of sortedNodes) {
    if (node.type === 'Start' || node.type === 'End') {
      console.log(`Skipping node ${node.nodeId} of type ${node.type}`);
      continue;
    }

    console.log(`Processing node ${node.nodeId} of type ${node.type}`);
    let nodeData = node;
    
    if (!node.salesforceObject || !node.fieldMappings?.length) {
      nodeData = await getNodeData(node.nodeId, userId);
      if (!nodeData) {
        console.error(`Node ${node.nodeId} not found in DynamoDB`);
        results[node.nodeId] = { error: `Node ${node.nodeId} not found in DynamoDB` };
        continue;
      }
    }

    try {
      switch (nodeData.type) {
        case 'CreateUpdate':
          results[nodeData.nodeId] = await createUpdateNode(nodeData, currentContext, salesforceBaseUrl, token);
          break;
        case 'Find':
        case 'Filter':
          results[nodeData.nodeId] = await queryNode(nodeData, salesforceBaseUrl, token);
          break;
        case 'Loop':
          const loopResult = await processLoopNode(nodeData, results, currentContext, salesforceBaseUrl, token);
          results[nodeData.nodeId] = loopResult;
          if (loopResult.loopContext) {
            currentContext = loopResult.loopContext;
          }
          break;
        default:
          console.warn(`Unsupported node type: ${nodeData.type}`);
          results[nodeData.nodeId] = { error: `Unsupported node type: ${nodeData.type}` };
      }
    } catch (error) {
      console.error(`Error processing node ${nodeData.nodeId}:`, error);
      results[nodeData.nodeId] = { error: error.message };
    }
  }

  return results;
};

export const handler = async (event) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, formVersionId, formData, nodes } = body;
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

    console.log('Raw Nodes Input:', JSON.stringify(nodes, null, 2));

    const parsedNodes = nodes.map(node => {
      if (!node.Node_Id__c && !node.nodeId) {
        throw new Error(`Node is missing required field Node_Id__c or nodeId: ${JSON.stringify(node)}`);
      }
      if (!node.Type__c && !node.actionType) {
        throw new Error(`Node ${node.Node_Id__c || node.nodeId} is missing required field Type__c or actionType`);
      }

      const conditions = node.Conditions__c ? JSON.parse(node.Conditions__c) : node.conditions;
      console.log(`Parsed conditions for node ${node.Node_Id__c || node.nodeId}:`, JSON.stringify(conditions, null, 2));

      return {
        nodeId: node.Node_Id__c || node.nodeId,
        type: node.Type__c || node.actionType,
        order: node.Order__c || node.order || 0,
        salesforceObject: node.Salesforce_Object__c || node.salesforceObject,
        conditions,
        fieldMappings: node.Field_Mappings__c ? JSON.parse(node.Field_Mappings__c) : node.fieldMappings,
        loopConfig: node.Loop_Config__c ? JSON.parse(node.Loop_Config__c) : node.loopConfig,
        nodeConfiguration: node.Node_Configuration__c ? JSON.parse(node.Node_Configuration__c) : node.nodeConfiguration
      };
    });

    console.log('Parsed Nodes:', JSON.stringify(parsedNodes, null, 2));

    const actionNodes = parsedNodes.filter(node => !['Start', 'End'].includes(node.type));
    if (actionNodes.length === 0) {
      console.error('No action nodes found');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Flow must contain at least one action node' }),
      };
    }

    const flowResults = await runFlow(parsedNodes, formData, instanceUrl, token, userId);

    const hasErrors = Object.values(flowResults).some(result => result.error);
    if (hasErrors) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          message: 'Flow executed with errors',
          results: flowResults,
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