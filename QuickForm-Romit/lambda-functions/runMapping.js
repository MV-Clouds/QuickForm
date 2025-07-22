// import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
// import moment from 'moment-timezone';
// import { parsePhoneNumber,getCountryCallingCode } from 'libphonenumber-js';

// // Input format patterns for parsing
// const INPUT_DATE_FORMATS = [
//   'YYYY-MM-DD',
//   'DD/MM/YYYY',
//   'MM/DD/YYYY',
//   'DD-MM-YYYY',
//   'MM-DD-YYYY',
//   moment.ISO_8601
// ];

// const INPUT_TIME_FORMATS = [
//   'HH:mm:ss',
//   'hh:mm:ss A',
//   'HH:mm',
//   'hh:mm A',
//   'hh:mm:ss A', // Explicitly include AM/PM formats
//   'HH:mm:ss.SSS'
// ];

// const INPUT_DATETIME_FORMATS = [
//   'YYYY-MM-DD HH:mm:ss',
//   'DD-MM-YYYY HH:mm:ss',
//   'MM-DD-YYYY hh:mm:ss A',
//   'YYYY-MM-DD HH:mm',
//   'DD/MM/YYYY HH:mm:ss',
//   moment.ISO_8601
// ];

// const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
// const METADATA_TABLE_NAME = 'SalesforceChunkData';

// // Unified operator definitions
// const unifiedOperators = {
//   '=': {
//     evaluate: (value, condition) => value === condition.value,
//     toSOQL: (field, value) => `${field} = '${escapeSoqlValue(value)}'`
//   },
//   '!=': {
//     evaluate: (value, condition) => value !== condition.value,
//     toSOQL: (field, value) => `${field} != '${escapeSoqlValue(value)}'`
//   },
//   'LIKE': {
//     evaluate: (value, condition) => value && typeof value === 'string' && value.includes(condition.value),
//     toSOQL: (field, value) => `${field} LIKE '%${escapeSoqlValue(value)}%'`
//   },
//   'NOT LIKE': {
//     evaluate: (value, condition) => value && typeof value === 'string' && !value.includes(condition.value),
//     toSOQL: (field, value) => `${field} NOT LIKE '%${escapeSoqlValue(value)}%'`
//   },
//   'STARTS WITH': {
//     evaluate: (value, condition) => value && typeof value === 'string' && value.startsWith(condition.value),
//     toSOQL: (field, value) => `${field} LIKE '${escapeSoqlValue(value)}%'`
//   },
//   'ENDS WITH': {
//     evaluate: (value, condition) => value && typeof value === 'string' && value.endsWith(condition.value),
//     toSOQL: (field, value) => `${field} LIKE '%${escapeSoqlValue(value)}'`
//   },
//   'IS NULL': {
//     evaluate: (value) => value === null || value === undefined || value === '',
//     toSOQL: (field) => `${field} = null`
//   },
//   'IS NOT NULL': {
//     evaluate: (value) => value !== null && value !== undefined && value !== '',
//     toSOQL: (field) => `${field} != null`
//   },
//   '>': {
//     evaluate: (value, condition) => Number(value) > Number(condition.value),
//     toSOQL: (field, value) => `${field} > ${Number(value)}`
//   },
//   '<': {
//     evaluate: (value, condition) => Number(value) < Number(condition.value),
//     toSOQL: (field, value) => `${field} < ${Number(value)}`
//   },
//   '>=': {
//     evaluate: (value, condition) => Number(value) >= Number(condition.value),
//     toSOQL: (field, value) => `${field} >= ${Number(value)}`
//   },
//   '<=': {
//     evaluate: (value, condition) => Number(value) <= Number(condition.value),
//     toSOQL: (field, value) => `${field} <= ${Number(value)}`
//   },
//   'BETWEEN': {
//     evaluate: (value, condition) => {
//       const [min, max] = condition.value.split(',').map(Number);
//       const numValue = Number(value);
//       return numValue >= min && numValue <= max;
//     },
//     toSOQL: (field, value) => {
//       const [min, max] = String(value).split(',').map(Number);
//       return `${field} >= ${min} AND ${field} <= ${max}`;
//     }
//   },
//   'IN': {
//     evaluate: (value, condition) => condition.value.split(',').includes(String(value)),
//     toSOQL: (field, value) => {
//       const values = String(value).split(',').map(v => `'${v.replace(/'/g, "\\'")}'`).join(',');
//       return `${field} IN (${values})`;
//     }
//   },
//   'NOT IN': {
//     evaluate: (value, condition) => !condition.value.split(',').includes(String(value)),
//     toSOQL: (field, value) => {
//       const values = String(value).split(',').map(v => `'${v.replace(/'/g, "\\'")}'`).join(',');
//       return `${field} NOT IN (${values})`;
//     }
//   }
// };

// // Helper functions
// const escapeSoqlValue = (value) => String(value).replace(/'/g, "\\'");

// const evaluateCondition = (record, condition) => {
//   const operator = unifiedOperators[condition.operator];
//   if (!operator) {
//     console.error(`Unsupported operator: ${condition.operator}`);
//     return false;
//   }
//   return operator.evaluate(record[condition.field], condition);
// };

// const buildSOQLCondition = (condition) => {
//   const operator = unifiedOperators[condition.operator];
//   if (!operator) {
//     throw new Error(`Unsupported operator: ${condition.operator}`);
//   }
//   return operator.toSOQL(condition.field, condition.value);
// };

// const evaluateCustomLogic = (conditions, customLogic, record) => {
//   const conditionResults = conditions.map((cond) => {
//     return evaluateCondition(record, cond);
//   });

//   const jsExpression = customLogic
//     .replace(/\bAND\b/gi, '&&')
//     .replace(/\bOR\b/gi, '||')
//     .replace(/\d+/g, (match) => {
//       const index = parseInt(match) - 1;
//       return conditionResults[index] !== undefined ?
//         `(${conditionResults[index]})` : 'false';
//     });

//   console.log(`Evaluating expression: ${jsExpression}`);

//   try {
//     return new Function(`return ${jsExpression}`)();
//   } catch (error) {
//     console.error('Error evaluating custom logic:', error, {
//       customLogic,
//       jsExpression,
//       conditionResults
//     });
//     return false;
//   }
// };

// const buildSOQLQuery = (node) => {
//   const { salesforceObject, conditions, type, nodeId } = node;

//   console.log(`Building SOQL for node ${nodeId}:`, JSON.stringify(conditions, null, 2));

//   let conds, logicType, customLogic, returnLimit, sortField, sortOrder;

//   if (Array.isArray(conditions)) {
//     conds = conditions;
//     logicType = null;
//     customLogic = null;
//     returnLimit = node.conditions?.returnLimit || null;
//     sortField = node.conditions?.sortField || null;
//     sortOrder = node.conditions?.sortOrder || null;
//   } else {
//     ({ conditions: conds, logicType, customLogic, returnLimit, sortField, sortOrder } = conditions || {});
//   }

//   if (!conds || conds.length === 0) {
//     if (type === 'CreateUpdate') {
//       return null;
//     }
//     throw new Error(`Node ${nodeId} of type ${type} must have conditions`);
//   }

//   const fields = [...new Set(conds.map(cond => cond.field))];
//   const query = `SELECT Id, ${fields.join(', ')} FROM ${salesforceObject} WHERE `;

//   const conditionClauses = conds.map(buildSOQLCondition).filter(clause => clause);

//   let soqlQuery;
//   if (logicType === 'Custom' && customLogic) {
//     if (!/^[\d\s()ANDORandor]+$/.test(customLogic)) {
//       throw new Error('Invalid custom logic expression. Only numbers, spaces, AND/OR, and parentheses are allowed.');
//     }

//     let soqlLogic = customLogic;
//     conds.forEach((_, index) => {
//       const conditionNumber = index + 1;
//       const regex = new RegExp(`\\b${conditionNumber}\\b`, 'g');
//       soqlLogic = soqlLogic.replace(regex, conditionClauses[index]);
//     });

//     soqlLogic = soqlLogic
//       .replace(/\band\b/gi, 'AND')
//       .replace(/\bor\b/gi, 'OR')
//       .replace(/\s+/g, ' ')
//       .trim();

//     soqlQuery = query + soqlLogic;
//   } else {
//     soqlQuery = query + conditionClauses.map(c => `(${c})`).join(` ${logicType || 'AND'} `);
//   }

//   if (sortField && sortOrder) {
//     soqlQuery += ` ORDER BY ${sortField} ${sortOrder}`;
//   }
//   if (returnLimit) {
//     soqlQuery += ` LIMIT ${returnLimit}`;
//   }

//   return soqlQuery;
// };

// const executeSOQLQuery = async (soqlQuery, salesforceBaseUrl, token) => {
//   if (!soqlQuery) {
//     throw new Error('SOQL query is null or undefined');
//   }
//   console.log(`Executing SOQL Query: ${soqlQuery}`);
//   const response = await fetch(`${salesforceBaseUrl}/query?q=${encodeURIComponent(soqlQuery)}`, {
//     method: 'GET',
//     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
//   });

//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(`SOQL query failed: ${errorData[0]?.message || JSON.stringify(errorData)}`);
//   }

//   const data = await response.json();
//   console.log('SOQL Query Results:', JSON.stringify(data, null, 2));
//   return data;
// };

// const processQueryResults = (data, conditions) => {
//   if (!data.records || data.records.length === 0) {
//     return [];
//   }

//   const conds = Array.isArray(conditions) ? conditions : conditions?.conditions;
//   const customLogic = !Array.isArray(conditions) ? conditions?.customLogic : null;

//   if (customLogic) {
//     return data.records.filter(record =>
//       evaluateCustomLogic(conds, customLogic, record)
//     );
//   }

//   return data.records;
// };

// const createUpdateNode = async (node, formData, salesforceBaseUrl, token) => {
//   const { salesforceObject, conditions, fieldMappings, nodeId } = node;
//   let recordId = null;

//   console.log('Processing CreateUpdate Node:', nodeId);
//   console.log('Form Data:', JSON.stringify(formData, null, 2));
//   console.log('Field Mappings:', JSON.stringify(fieldMappings, null, 2));

//   if (conditions && (Array.isArray(conditions) ? conditions.length > 0 : conditions.conditions?.length > 0)) {
//     const soqlQuery = buildSOQLQuery(node);
//     if (soqlQuery) {
//       const queryData = await executeSOQLQuery(soqlQuery, salesforceBaseUrl, token);
//       const matchedRecords = processQueryResults(queryData, conditions);

//       if (matchedRecords.length > 0) {
//         recordId = matchedRecords[0].Id;
//         console.log(`Found matching record ID: ${recordId}`);
//       } else {
//         console.log('No matching records found');
//       }
//     }
//   }

//   const payload = {};
//   let hasValidMapping = false;

//   fieldMappings.forEach(mapping => {
//     let value = mapping.formFieldId === '' && mapping.picklistValue !== undefined
//       ? mapping.picklistValue
//       : formData[mapping.formFieldId];

//     if (value !== undefined && value !== null) {
//       if (mapping.fieldType === 'number' || mapping.fieldType === 'price') {
//         value = Number(value);
//       } else if (mapping.fieldType === 'picklist' || mapping.fieldType === 'shorttext' || mapping.fieldType === 'longtext') {
//         value = String(value);
//       }
//       payload[mapping.salesforceField] = value;
//       hasValidMapping = true;
//       console.log(`Mapping ${mapping.formFieldId || 'predefined'} to ${mapping.salesforceField}: ${value}`);
//     } else {
//       console.warn(`No form data or picklist value found for field ${mapping.formFieldId || 'predefined'}`);
//     }
//   });

//   if (!hasValidMapping) {
//     throw new Error(`No valid field mappings for node ${nodeId}. Form Data: ${JSON.stringify(formData)}`);
//   }

//   if (salesforceObject === 'Account' && !payload.Name) {
//     throw new Error(`Missing required field 'Name' in payload for node ${nodeId}`);
//   }
//   if (salesforceObject === 'Contact' && !payload.LastName) {
//     throw new Error(`Missing required field 'LastName' in payload for node ${nodeId}`);
//   }

//   console.log('Constructed Payload:', JSON.stringify(payload, null, 2));

//   const method = recordId ? 'PATCH' : 'POST';
//   const url = recordId
//     ? `${salesforceBaseUrl}/sobjects/${salesforceObject}/${recordId}`
//     : `${salesforceBaseUrl}/sobjects/${salesforceObject}`;

//   try {
//     const response = await fetch(url, {
//       method,
//       headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload),
//     });

//     const responseData = await response.json();
//     console.log('Salesforce API Response:', JSON.stringify(responseData, null, 2));

//     if (!response.ok) {
//       throw new Error(`Failed to ${recordId ? 'update' : 'create'} ${salesforceObject}: ${JSON.stringify(responseData)}`);
//     }

//     if (!responseData.id && !responseData.success) {
//       throw new Error(`No record created/updated for node ${nodeId}: ${JSON.stringify(responseData)}`);
//     }

//     return { nodeId, recordId: recordId || responseData.id };
//   } catch (error) {
//     console.error(`Error in ${method} request for node ${nodeId}:`, error);
//     throw error;
//   }
// };

// const processLoopNode = async (node, previousResults, formData, salesforceBaseUrl, token) => {
//   const { loopConfig, nodeId } = node;
//   if (!loopConfig) {
//     throw new Error(`Loop node ${nodeId} is missing loop configuration`);
//   }

//   console.log(`Loop Collection for ${nodeId}:`, JSON.stringify(previousResults[loopConfig.loopCollection], null, 2));

//   const sourceCollection = previousResults[loopConfig.loopCollection];
//   if (!sourceCollection || sourceCollection.error) {
//     throw new Error(`Source collection ${loopConfig.loopCollection} is invalid or contains an error: ${JSON.stringify(sourceCollection)}`);
//   }

//   const itemsToProcess = Array.isArray(sourceCollection.ids)
//     ? sourceCollection.ids
//     : [sourceCollection.ids];

//   if (!itemsToProcess || itemsToProcess.length === 0 || itemsToProcess.includes(undefined)) {
//     console.log(`No valid items to process in loop ${nodeId}`);
//     return { nodeId, processedCount: 0 };
//   }

//   const loopVariables = {
//     currentItem: null,
//     currentIndex: loopConfig.loopVariables?.currentIndex ? 0 : null,
//     counter: loopConfig.loopVariables?.counter ? 1 : null,
//     indexBase: parseInt(loopConfig.loopVariables?.indexBase || '0')
//   };

//   const maxIterations = parseInt(loopConfig.maxIterations || '0');
//   const hasMaxIterations = maxIterations > 0;

//   let processedCount = 0;
//   const loopResults = [];

//   for (let i = 0; i < itemsToProcess.length; i++) {
//     if (hasMaxIterations && processedCount >= maxIterations) {
//       console.log(`Reached max iterations (${maxIterations}) for loop ${nodeId}`);
//       break;
//     }

//     loopVariables.currentItem = itemsToProcess[i];
//     if (loopVariables.currentIndex !== null) {
//       loopVariables.currentIndex = i + loopVariables.indexBase;
//     }
//     if (loopVariables.counter !== null) {
//       loopVariables.counter = processedCount + 1;
//     }

//     const loopContext = {
//       ...formData,
//       [loopConfig.currentItemVariableName]: loopVariables.currentItem,
//       ...(loopVariables.currentIndex !== null && {
//         [`${loopConfig.currentItemVariableName}_index`]: loopVariables.currentIndex
//       }),
//       ...(loopVariables.counter !== null && {
//         [`${loopConfig.currentItemVariableName}_counter`]: loopVariables.counter
//       })
//     };

//     console.log(`Processing loop iteration ${processedCount + 1} with item:`, loopVariables.currentItem);

//     loopResults.push({
//       item: loopVariables.currentItem,
//       index: loopVariables.currentIndex,
//       counter: loopVariables.counter,
//       context: loopContext
//     });

//     processedCount++;
//   }

//   return {
//     nodeId,
//     processedCount,
//     loopResults,
//     loopContext: loopResults.length > 0 ? loopResults[0].context : formData
//   };
// };

// const processConditionNode = async (node, context, salesforceBaseUrl, token) => {
//   const { conditions, nodeId, salesforceObject } = node;
//   const result = {
//     nodeId,
//     status: 'processed',
//     shouldContinue: false,
//     evaluatedConditions: []
//   };

//   // Parse conditions if they're in string format
//   const parsedConditions = typeof conditions === 'string' ? JSON.parse(conditions) : conditions;
  
//   // Check pathOption to determine how to process
//   const pathOption = parsedConditions?.pathOption || 'Rules';
  
//   if (pathOption === 'Always Run') {
//     // Always continue to next node
//     result.shouldContinue = true;
//     result.message = 'Condition node set to Always Run - proceeding';
//     return result;
//   }

//   if (pathOption === 'Fallback') {
//     // Only process if previous node had errors or no data
//     // This would need to check previous node results from context
//     result.shouldContinue = false;
//     result.message = 'Fallback path - only runs if previous path fails';
//     return result;
//   }

//   // Default case - evaluate conditions (Rules)
//   if (!parsedConditions?.conditions || parsedConditions.conditions.length === 0) {
//     result.shouldContinue = false;
//     result.error = 'No conditions defined for Rules path';
//     return result;
//   }

//   try {
//     // For condition nodes with a Salesforce object, we need to query
//     if (salesforceObject) {
//       const soqlQuery = buildSOQLQuery(node);
//       const queryData = await executeSOQLQuery(soqlQuery, salesforceBaseUrl, token);
//       const matchedRecords = processQueryResults(queryData, parsedConditions);
      
//       result.evaluatedConditions = matchedRecords.map(record => {
//         return {
//           id: record.Id,
//           conditions: parsedConditions.conditions.map(cond => ({
//             field: cond.field,
//             operator: cond.operator,
//             expected: cond.value,
//             actual: record[cond.field],
//             passed: evaluateCondition(record, cond)
//           }))
//         };
//       });

//       // Determine if we should continue based on matched records
//       if (parsedConditions.customLogic) {
//         // Evaluate custom logic if provided
//         result.shouldContinue = evaluateCustomLogic(
//           parsedConditions.conditions,
//           parsedConditions.customLogic,
//           matchedRecords.length > 0 ? matchedRecords[0] : {}
//         );
//       } else {
//         // Default behavior - continue if we have matching records
//         result.shouldContinue = matchedRecords.length > 0;
//       }
//     } else {
//       // Evaluate conditions directly against form data
//       result.evaluatedConditions = parsedConditions.conditions.map(cond => ({
//         field: cond.field,
//         operator: cond.operator,
//         expected: cond.value,
//         actual: context[cond.field],
//         passed: evaluateCondition(context, cond)
//       }));

//       if (parsedConditions.customLogic) {
//         result.shouldContinue = evaluateCustomLogic(
//           parsedConditions.conditions,
//           parsedConditions.customLogic,
//           context
//         );
//       } else {
//         // Default AND behavior if no custom logic
//         result.shouldContinue = result.evaluatedConditions.every(cond => cond.passed);
//       }
//     }

//     result.message = result.shouldContinue 
//       ? 'Conditions met - proceeding to next node' 
//       : 'Conditions not met - not proceeding';

//     return result;
//   } catch (error) {
//     console.error(`Error processing condition node ${nodeId}:`, error);
//     result.error = error.message;
//     result.status = 'failed';
//     result.shouldContinue = false;
//     return result;
//   }
// };

// const queryNode = async (node, salesforceBaseUrl, token) => {
//   const soqlQuery = buildSOQLQuery(node);
//   const queryData = await executeSOQLQuery(soqlQuery, salesforceBaseUrl, token);
//   const matchedRecords = processQueryResults(queryData, node.conditions);

//   const ids = matchedRecords.map(record => record.Id);
//   return {
//     nodeId: node.nodeId,
//     ids: ids.length > 1 ? ids : ids[0]
//   };
// };

// const getNodeData = async (nodeId, userId, formVersionId) => {
//   try {
//     let allItems = [];
//     let ExclusiveStartKey = undefined;

//     do {
//       const queryResponse = await dynamoClient.send(
//         new QueryCommand({
//           TableName: METADATA_TABLE_NAME,
//           KeyConditionExpression: 'UserId = :userId',
//           ExpressionAttributeValues: {
//             ':userId': { S: userId },
//           },
//           ExclusiveStartKey,
//         })
//       );

//       if (queryResponse.Items) {
//         allItems.push(...queryResponse.Items);
//       }

//       ExclusiveStartKey = queryResponse.LastEvaluatedKey;
//     } while (ExclusiveStartKey);

//     // Find the form record that contains our form version
//     let formRecords = [];
//     const formRecordItems = allItems.filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'));

//     if (formRecordItems.length > 0) {
//       try {
//         const sortedChunks = formRecordItems
//           .sort((a, b) => {
//             const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
//             const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
//             return aNum - bNum;
//           });

//         const combinedFormRecords = sortedChunks.map(item => item.FormRecords.S).join('');
//         formRecords = JSON.parse(combinedFormRecords);
//       } catch (e) {
//         console.warn('Failed to parse FormRecords chunks:', e);
//         return null;
//       }
//     }

//     // Find the specific form version with our mappings
//     const formVersion = formRecords
//       .flatMap(form => form.FormVersions || [])
//       .find(version => version.Id === formVersionId);

//     if (!formVersion || !formVersion.Mappings) {
//       console.warn(`Form version ${formVersionId} not found or has no mappings`);
//       return null;
//     }

//     // Get the specific node mapping
//     const nodeMapping = formVersion.Mappings.Mappings?.[nodeId];
//     if (!nodeMapping) {
//       console.warn(`Node ${nodeId} not found in mappings`);
//       return null;
//     }

//     return {
//       nodeId,
//       type: nodeMapping.actionType || null,
//       salesforceObject: nodeMapping.salesforceObject || null,
//       conditions: nodeMapping.conditions ? JSON.parse(JSON.stringify(nodeMapping.conditions)) : null,
//       fieldMappings: nodeMapping.fieldMappings || [],
//       loopConfig: nodeMapping.loopConfig ? JSON.parse(JSON.stringify(nodeMapping.loopConfig)) : null,
//       formatterConfig: nodeMapping.formatterConfig ? JSON.parse(JSON.stringify(nodeMapping.formatterConfig)) : null
//     };
//   } catch (error) {
//     console.error('Error getting node data:', error);
//     return null;
//   }
// };

// // Helper to detect input format
// const detectInputFormat = (value, formatArray) => {
//   for (const format of formatArray) {
//     if (moment(value, format, true).isValid()) {
//       return format;
//     }
//   }
//   return null;
// };

// // Date/Time formatter operations
// const dateFormatters = {
//   format_date: (value, format, timezone) => {
//     const date = moment.tz(value, INPUT_DATE_FORMATS, true, timezone);
//     if (!date.isValid()) {
//       console.warn(`Invalid date format for value: ${value}`);
//       return value;
//     }
//     return date.format(format);
//   },
//   format_time: (value, format, timezone, targetTimezone) => {
//     const date = moment.tz(value, INPUT_TIME_FORMATS, true, timezone);
//     if (!date.isValid()) {
//       console.warn(`Invalid time format for value: ${value}`);
//       return value;
//     }
//     if (targetTimezone && targetTimezone !== timezone) {
//       return date.tz(targetTimezone).format(format);
//     }
//     return date.format(format);
//   },
//   format_datetime: (value, format, timezone, targetTimezone) => {
//     const date = moment.tz(value, INPUT_DATETIME_FORMATS, true, timezone);
//     if (!date.isValid()) {
//       console.warn(`Invalid datetime format for value: ${value}`);
//       return value;
//     }
//     if (targetTimezone && targetTimezone !== timezone) {
//       return date.tz(targetTimezone).format(format);
//     }
//     return date.format(format);
//   },
//   timezone_conversion: (value, sourceTimezone, targetTimezone) => {
//     const date = moment.tz(value, [...INPUT_DATE_FORMATS, ...INPUT_TIME_FORMATS, ...INPUT_DATETIME_FORMATS], true, sourceTimezone);
//     if (!date.isValid()) {
//       console.warn(`Invalid date/time format for timezone conversion: ${value}`);
//       return value;
//     }
//     const inputFormat = detectInputFormat(value, [...INPUT_DATE_FORMATS, ...INPUT_TIME_FORMATS, ...INPUT_DATETIME_FORMATS]);
//     return date.tz(targetTimezone).format(inputFormat || 'YYYY-MM-DD HH:mm:ss');
//   },
//   add_date: (value, unit, amount, timezone) => {
//     const inputFormat = detectInputFormat(value, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS]);
//     const date = moment.tz(value, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS], true, timezone);
//     if (!date.isValid()) {
//       console.warn(`Invalid date/time format for add_date: ${value}`);
//       return value;
//     }
//     return date.add(Number(amount), unit).format(inputFormat || 'YYYY-MM-DD');
//   },
//   subtract_date: (value, unit, amount, timezone) => {
//     const inputFormat = detectInputFormat(value, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS]);
//     const date = moment.tz(value, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS], true, timezone);
//     if (!date.isValid()) {
//       console.warn(`Invalid date/time format for subtract_date: ${value}`);
//       return value;
//     }
//     return date.subtract(Number(amount), unit).format(inputFormat || 'YYYY-MM-DD');
//   },
//   date_difference: (value1, value2, unit, timezone) => {
//     const date1 = moment.tz(value1, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS], true, timezone);
//     const date2 = moment.tz(value2, [...INPUT_DATE_FORMATS, ...INPUT_DATETIME_FORMATS], true, timezone);
//     if (!date1.isValid() || !date2.isValid()) {
//       console.warn(`Invalid date/time format for date_difference: date1=${value1}, date2=${value2}`);
//       throw new Error(`Invalid date/time format: date1=${value1}, date2=${value2}`);
//     }
//     return Math.abs(date1.diff(date2, unit || 'days'));
//   }
// };

// // Text formatter operations
// const textFormatters = {
//   uppercase: (value) => {
//     if (typeof value !== 'string') return value;
//     return value.toUpperCase();
//   },
//   lowercase: (value) => {
//     if (typeof value !== 'string') return value;
//     return value.toLowerCase();
//   },
//   title_case: (value) => {
//     if (typeof value !== 'string') return value;
//     return value.replace(/\w\S*/g, (txt) => {
//       return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
//     });
//   },
//   trim_whitespace: (value) => {
//     if (typeof value !== 'string') return value;
//     return value.trim();
//   },
//   replace: (value, params) => {
//     if (typeof value !== 'string') return value;
//     const { searchValue, replaceValue } = params;
//     if (!searchValue) return value;
//     const escapedSearchValue = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//     return value.replace(new RegExp(escapedSearchValue, 'g'), replaceValue || '');
//   },
//   extract_email: (value) => {
//     if (typeof value !== 'string') return value;
//     const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
//     const matches = value.match(emailRegex);
//     return matches ? matches[0] : value;
//   },
//   split: (value, params) => {
//     if (typeof value !== 'string') return value;
//     const { delimiter, index } = params;
//     if (!delimiter) return value;

//     const parts = value.split(delimiter);
//     if (parts.length <= 1) return value;

//     switch (index) {
//       case 'first': return parts[0] || value;
//       case 'second': return parts[1] || value;
//       case 'last': return parts[parts.length - 1] || value;
//       case 'second_from_last':
//         return parts.length >= 2 ? parts[parts.length - 2] : value;
//       case 'all': return parts.join(', ');
//       default: return value;
//     }
//   },
//   word_count: (value) => {
//     if (typeof value !== 'string') return value;
//     const str = value.trim();
//     return str === '' ? 0 : str.split(/\s+/).length;
//   },
//   url_encode: (value) => {
//     if (typeof value !== 'string') return value;
//     try {
//       return encodeURIComponent(value);
//     } catch (e) {
//       return value;
//     }
//   }
// };

// // In numberFormatters object
// const numberFormatters = {
//   locale_format: (value, locale) => {
//     if (isNaN(value) || value === null || value === undefined) {
//       console.warn(`Invalid number for locale_format: ${value}`);
//       return value;
//     }
//     try {
//       // Use 'latn' numbering system to ensure standard Arabic numerals (0-9)
//       return new Intl.NumberFormat(locale || 'en-US', { numberingSystem: 'latn' }).format(Number(value));
//     } catch (error) {
//       console.warn(`Invalid locale for locale_format: ${locale}`);
//       return value;
//     }
//   },
//   currency_format: (value, currency, locale) => {
//     if (isNaN(value) || value === null || value === undefined) {
//       console.warn(`Invalid number for currency_format: ${value}`);
//       return value;
//     }
//     if (!currency) {
//       console.warn(`Missing currency code for currency_format`);
//       return value;
//     }
//     try {
//       // Use 'latn' numbering system for currency formatting as well
//       return new Intl.NumberFormat(locale || 'en-US', {
//         style: 'currency',
//         currency: currency,
//         numberingSystem: 'latn'
//       }).format(Number(value));
//     } catch (error) {
//       console.warn(`Invalid currency code or locale for currency_format: currency=${currency}, locale=${locale}`);
//       return value;
//     }
//   },
//   round_number: (value, decimals) => {
//     if (isNaN(value) || value === null || value === undefined) {
//       console.warn(`Invalid number for round_number: ${value}`);
//       return value;
//     }
//     const decimalPlaces = parseInt(decimals) || 0;
//     if (decimalPlaces < 0) {
//       console.warn(`Invalid decimal places for round_number: ${decimals}`);
//       return value;
//     }
//     try {
//       return Number(Number(value).toFixed(decimalPlaces));
//     } catch (error) {
//       console.warn(`Error rounding number: ${value}`);
//       return value;
//     }
//   },
//   phone_format: (value, format, countryCode, formData, inputField, inputType = 'combined') => {
//     if (typeof value !== 'string' || !value.trim()) {
//       return { 
//         output: value, 
//         error: 'Phone number cannot be empty',
//         status: 'skipped' 
//       };
//     }

//     // Determine country code - check for _countryCode field first
//     let effectiveCountryCode = countryCode;
//     if (formData && inputField) {
//       const countryCodeKey = `${inputField}_countryCode`;
//       effectiveCountryCode = formData[countryCodeKey] || countryCode;
//     }

//     try {
//       let phoneNumber;
      
//       // Handle case where input is just a country code (like "IN")
//       if (inputType === 'country_code' || value.length <= 3) {
//         try {
//           // Try to get calling code for the input value (might be country code or calling code)
//           let callingCode;
          
//           if (/^\+?\d+$/.test(value)) {
//             // If it's numeric (like "91" or "+91")
//             callingCode = value.startsWith('+') ? value : `+${value}`;
//           } else {
//             // If it's a country code (like "IN")
//             callingCode = `+${getCountryCallingCode(value.toUpperCase())}`;
//           }
          
//           // Get calling code for target country
//           const targetCallingCode = `+${getCountryCallingCode(countryCode)}`;
          
//           return {
//             output: targetCallingCode,
//             status: 'completed'
//           };
//         } catch (e) {
//           return { 
//             output: value, 
//             error: 'Could not convert country code',
//             status: 'skipped' 
//           };
//         }
//       }

//       // Handle different input types
//       if (inputType === 'phone_number') {
//         // Case: Only phone number is selected - validate and add country code
//         if (!effectiveCountryCode) {
//           return { 
//             output: value, 
//             error: 'Country code is required for phone number validation',
//             status: 'skipped' 
//           };
//         }
        
//         phoneNumber = parsePhoneNumber(value, effectiveCountryCode);
        
//         if (!phoneNumber || !phoneNumber.isValid()) {
//           return { 
//             output: value, 
//             error: `Invalid phone number for country ${effectiveCountryCode}`,
//             status: 'skipped' 
//           };
//         }
//       } 
//       else {
//         // Case: Combined input - parse and replace country code if needed
//         if (!effectiveCountryCode && !countryCode) {
//           return { 
//             output: value, 
//             error: 'Country code is required for combined phone number validation',
//             status: 'skipped' 
//           };
//         }

//         // First parse with original country code (if available)
//         const originalCountry = effectiveCountryCode || countryCode || 'US';
//         phoneNumber = parsePhoneNumber(value, originalCountry);
        
//         if (!phoneNumber || !phoneNumber.isValid()) {
//           return { 
//             output: value, 
//             error: `Invalid phone number for country ${originalCountry}`,
//             status: 'skipped' 
//           };
//         }

//         // If we have a new country code to apply (different from original)
//         if (countryCode && phoneNumber.country !== countryCode) {
//           phoneNumber = parsePhoneNumber(phoneNumber.nationalNumber, countryCode);
          
//           if (!phoneNumber || !phoneNumber.isValid()) {
//             return { 
//               output: value, 
//               error: `Invalid phone number format for country ${countryCode}`,
//               status: 'skipped' 
//             };
//           }
//         }
//       }

//       // Format based on requested format
//       let formattedNumber;
//       switch (format) {
//         case 'E.164':
//           formattedNumber = phoneNumber.format('E.164');
//           break;
//         case 'International':
//           formattedNumber = phoneNumber.format('INTERNATIONAL');
//           break;
//         case 'National':
//           formattedNumber = phoneNumber.format('NATIONAL');
//           break;
//         case 'No Country Code':
//           formattedNumber = phoneNumber.format('NATIONAL')
//             .replace(/^[+\d\s-]+/, '')
//             .trim();
//           break;
//         case 'Clean National':
//           formattedNumber = phoneNumber.format('NATIONAL')
//             .replace(/[\s()-]/g, '')
//             .replace(/^[+\d]+/, '');
//           break;
//         default:
//           return { 
//             output: value, 
//             error: `Unsupported format: ${format}`,
//             status: 'skipped' 
//           };
//       }

//       return { 
//         output: formattedNumber,
//         status: 'completed'
//       };
//     } catch (error) {
//       return { 
//         output: value, 
//         error: `Formatting failed: ${error.message}`,
//         status: 'skipped' 
//       };
//     }
//   },
//   math_operation: (value1, value2, operation) => {
//     if (isNaN(value1) || value1 === null || value1 === undefined || isNaN(value2) || value2 === null || value2 === undefined) {
//       console.warn(`Invalid numbers for math_operation: value1=${value1}, value2=${value2}`);
//       throw new Error(`Invalid numbers: value1=${value1}, value2=${value2}`);
//     }
//     const num1 = Number(value1);
//     const num2 = Number(value2);
//     switch (operation) {
//       case 'add':
//         return num1 + num2;
//       case 'subtract':
//         return num1 - num2;
//       case 'multiply':
//         return num1 * num2;
//       case 'divide':
//         if (num2 === 0) {
//           throw new Error('Division by zero');
//         }
//         return num1 / num2;
//       default:
//         console.warn(`Unsupported math operation: ${operation}`);
//         throw new Error(`Unsupported math operation: ${operation}`);
//     }
//   }
// };

// // Updated processFormatter function
// const processFormatter = (formatterConfig, formData) => {
//   const { formatType, operation, inputField, inputField2, options, useCustomInput, customValue, outputVariable } = formatterConfig;
//   const result = {
//     nodeId: formatterConfig.nodeId || `formatter_${Date.now()}`,
//     status: 'processed',
//     operation,
//     inputField,
//     originalValue: undefined,
//     secondInputField: inputField2 || undefined,
//     secondOriginalValue: undefined,
//     output: undefined
//   };

//   console.log('Form Data received:', JSON.stringify(formData, null, 2));
//   let userValue = useCustomInput && customValue ? customValue : formData[inputField];
//   let secondValue = inputField2 ? formData[inputField2] : (useCustomInput && customValue ? customValue : null);

//   result.originalValue = userValue;
//   result.secondOriginalValue = secondValue;

//    // Handle missing values more gracefully
//    if (userValue === undefined || userValue === null || userValue === '') {
//     console.warn(`Missing value for field ${inputField}. Available keys: ${Object.keys(formData).join(', ')}`);
//     result.status = 'skipped';
//     result.output = userValue;
//     result.error = `Missing value for field ${inputField}`;
//     return result;
//   }

//   console.log(`Processing formatter for field ${inputField} with user value:`, userValue);

//   try {
//     let formattedValue = userValue;

//     if (formatType === 'number' && operation === 'phone_format') {
//       const countryCodeKey = inputField.endsWith('_phoneNumber')
//         ? inputField.replace('_phoneNumber', '_countryCode')
//         : `${inputField}_countryCode`;
//       console.log(`Phone format inputs - inputField: ${inputField}, countryCode: ${options.countryCode}, inputType: ${options.inputType || 'phone_number'}, countryCodeKey: ${countryCodeKey}, countryCodeValue: ${formData[countryCodeKey] || 'not found'}`);
//       const phoneResult = numberFormatters.phone_format(
//         userValue,
//         options.format,
//         options.countryCode,
//         formData,
//         inputField,
//         options.inputType || 'phone_number'
//       );
      
//       formattedValue = phoneResult.output;
//       result.status = phoneResult.status;
//       if (phoneResult.error) {
//         result.error = phoneResult.error;
//         result.status = 'skipped'; // Ensure skipped status for phone format errors
//       }
//     } else if (formatType === 'date') {
//       switch (operation) {
//         case 'format_date':
//           formattedValue = dateFormatters.format_date(userValue, options.format, options.timezone || 'UTC');
//           break;
//         case 'format_time':
//           formattedValue = dateFormatters.format_time(userValue, options.format, options.timezone || 'UTC', options.targetTimezone);
//           break;
//         case 'format_datetime':
//           formattedValue = dateFormatters.format_datetime(userValue, options.format, options.timezone || 'UTC', options.targetTimezone);
//           break;
//         case 'timezone_conversion':
//           if (!options.timezone || !options.targetTimezone) {
//             throw new Error('Timezone conversion requires both source and target timezones');
//           }
//           formattedValue = dateFormatters.timezone_conversion(userValue, options.timezone, options.targetTimezone);
//           break;
//         case 'add_date':
//           if (!options.unit || !options.value) {
//             throw new Error('Add date requires unit and value');
//           }
//           formattedValue = dateFormatters.add_date(userValue, options.unit, options.value, options.timezone || 'UTC');
//           break;
//         case 'subtract_date':
//           if (!options.unit || !options.value) {
//             throw new Error('Subtract date requires unit and value');
//           }
//           formattedValue = dateFormatters.subtract_date(userValue, options.unit, options.value, options.timezone || 'UTC');
//           break;
//         case 'date_difference':
//           if (!inputField2 || secondValue === undefined || secondValue === null) {
//             throw new Error(`Date difference requires a valid second input value for field ${inputField2 || 'none'}`);
//           }
//           formattedValue = dateFormatters.date_difference(userValue, secondValue, options.unit || 'days', options.timezone || 'UTC');
//           break;
//         default:
//           console.warn(`Unsupported date formatter operation: ${operation}`);
//           formattedValue = userValue;
//       }
//     } else if (formatType === 'text') {
//       switch (operation) {
//         case 'uppercase':
//           formattedValue = textFormatters.uppercase(String(formattedValue));
//           break;
//         case 'lowercase':
//           formattedValue = textFormatters.lowercase(String(formattedValue));
//           break;
//         case 'title_case':
//           formattedValue = textFormatters.title_case(String(formattedValue));
//           break;
//         case 'trim_whitespace':
//           formattedValue = textFormatters.trim_whitespace(String(formattedValue));
//           break;
//         case 'replace':
//           formattedValue = textFormatters.replace(
//             String(formattedValue),
//             {
//               searchValue: options?.searchValue,
//               replaceValue: options?.replaceValue
//             }
//           );
//           break;
//         case 'extract_email':
//           formattedValue = textFormatters.extract_email(String(formattedValue));
//           break;
//         case 'split':
//           formattedValue = textFormatters.split(
//             String(formattedValue),
//             {
//               delimiter: options?.delimiter,
//               index: options?.index
//             }
//           );
//           break;
//         case 'word_count':
//           formattedValue = textFormatters.word_count(String(formattedValue));
//           break;
//         case 'url_encode':
//           formattedValue = textFormatters.url_encode(String(formattedValue));
//           break;
//         default:
//           console.warn(`Unsupported text formatter operation: ${operation}`);
//           formattedValue = userValue;
//       }
//     } else if (formatType === 'number') {
//       switch (operation) {
//         case 'locale_format':
//           formattedValue = numberFormatters.locale_format(userValue, options.locale);
//           break;
//         case 'currency_format':
//           formattedValue = numberFormatters.currency_format(userValue, options.currency, options.locale);
//           break;
//         case 'round_number':
//           formattedValue = numberFormatters.round_number(userValue, options.decimals);
//           break;
//         case 'phone_format':
//           formattedValue = numberFormatters.phone_format(userValue, options.format, options.countryCode, formData, inputField);
//           break;
//         case 'math_operation':
//           if (!inputField2 || secondValue === undefined || secondValue === null) {
//             throw new Error(`Math operation requires a valid second input value for field ${inputField2 || 'none'}`);
//           }
//           formattedValue = numberFormatters.math_operation(userValue, secondValue, options.operation);
//           break;
//         default:
//           console.warn(`Unsupported number formatter operation: ${operation}`);
//           formattedValue = userValue;
//       }
//     } else {
//       console.warn(`Unsupported formatter type: ${formatType}`);
//       formattedValue = userValue;
//     }

//     result.output = formattedValue;
//     if (result.status !== 'skipped') {
//       result.status = 'completed';
//     }
//     if (outputVariable) {
//       result.outputVariable = outputVariable;
//     }

//     console.log(`Formatted result:`, JSON.stringify(result, null, 2));

//   } catch (error) {
//     console.error(`Error applying formatter ${operation} to field ${inputField}:`, error);
//     result.output = userValue;
//     result.status = operation === 'phone_format' ? 'skipped' : 'failed';
//     result.error = error.message;
//   }

//   return result;
// };

// const runFlow = async (nodes, formData, instanceUrl, token, userId, formVersionId) => {
//   const salesforceBaseUrl = `https://${instanceUrl.replace(/https?:\/\//, '')}/services/data/v60.0`;
//   const results = {};
//   const processedNodeIds = new Set();

//   const sortedNodes = nodes.sort((a, b) => parseInt(a.order) - parseInt(b.order));
//   let currentContext = { ...formData };

//   for (const node of sortedNodes) {
//     if (node.type === 'Start' || node.type === 'End') {
//       continue;
//     }

//     if (processedNodeIds.has(node.nodeId)) {
//       continue;
//     }

//     console.log(`Processing node ${node.nodeId} of type ${node.type}`);
//     let nodeData = node;

//     if (!node.salesforceObject || !node.fieldMappings?.length) {
//       nodeData = await getNodeData(node.nodeId, userId, formVersionId);
//       if (!nodeData) {
//         console.error(`Node ${node.nodeId} not found in DynamoDB`);
//         results[node.nodeId] = { error: `Node ${node.nodeId} not found in DynamoDB` };
//         continue;
//       }
//     }

//     try {
//       if (nodeData.formatterConfig && nodeData.type !== 'Formatter') {
//         const formatterResult = processFormatter(nodeData.formatterConfig, currentContext);
//         results[nodeData.nodeId] = formatterResult;

//         if (formatterResult.status === 'completed') {
//           currentContext = {
//             ...currentContext,
//             [formatterResult.outputVariable || nodeData.formatterConfig.inputField]: formatterResult.output
//           };
//         }
//       }

//       switch (nodeData.type) {
//         case 'CreateUpdate':
//           results[nodeData.nodeId] = await createUpdateNode(nodeData, currentContext, salesforceBaseUrl, token);
//           break;
//         case 'Find':
//         case 'Filter':
//           results[nodeData.nodeId] = await queryNode(nodeData, salesforceBaseUrl, token);
//           break;
//         case 'Loop':
//           const loopResult = await processLoopNode(nodeData, results, currentContext, salesforceBaseUrl, token);
//           results[nodeData.nodeId] = loopResult;
//           if (loopResult.loopContext) {
//             currentContext = loopResult.loopContext;
//           }
//           break;
//         case 'Formatter':
//           const formatterResult = processFormatter(nodeData.formatterConfig, currentContext);
//           results[nodeData.nodeId] = formatterResult;

//           if (formatterResult.status === 'completed') {
//             currentContext = {
//               ...currentContext,
//               [formatterResult.outputVariable || nodeData.formatterConfig.inputField]: formatterResult.output
//             };
//           }
//           break;
//         default:
//           console.warn(`Unsupported node type: ${nodeData.type}`);
//           results[nodeData.nodeId] = { error: `Unsupported node type: ${nodeData.type}` };
//       }

//       processedNodeIds.add(nodeData.nodeId);
//     } catch (error) {
//       console.error(`Error processing node ${nodeData.nodeId}:`, error);
//       results[nodeData.nodeId] = { error: error.message };
//     }
//   }

//   return results;
// };

// export const handler = async (event) => {
//   try {
//     const body = JSON.parse(event.body || '{}');
//     const { userId, instanceUrl, formVersionId, formData, nodes } = body;
//     const token = event.headers.Authorization?.split(' ')[1] || event.headers.authorization?.split(' ')[1];

//     if (!userId || !instanceUrl || !formVersionId || !formData || !nodes || !Array.isArray(nodes) || !token) {
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//         body: JSON.stringify({
//           error: 'Missing required parameters: userId, instanceUrl, formVersionId, formData, nodes, or Authorization token',
//         }),
//       };
//     }

//     console.log('formData :: ', formData);
//     const parsedNodes = nodes.map(node => {
//       return {
//         nodeId: node.Node_Id__c || node.nodeId,
//         type: node.Type__c || node.actionType,
//         order: node.Order__c || node.order || 0,
//         salesforceObject: node.Salesforce_Object__c || node.salesforceObject,
//         conditions: node.Conditions__c ? JSON.parse(node.Conditions__c) : node.conditions,
//         fieldMappings: node.Field_Mappings__c ? JSON.parse(node.Field_Mappings__c) : node.fieldMappings,
//         loopConfig: node.Loop_Config__c ? JSON.parse(node.Loop_Config__c) : node.loopConfig,
//         formatterConfig: node.Formatter_Config__c ? JSON.parse(node.Formatter_Config__c) : node.formatterConfig,
//       };
//     });

//     const actionNodes = parsedNodes.filter(node => !['Start', 'End'].includes(node.type));
//     if (actionNodes.length === 0) {
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//         body: JSON.stringify({ error: 'Flow must contain at least one action node' }),
//       };
//     }

//     const flowResults = await runFlow(parsedNodes, formData, instanceUrl, token, userId, formVersionId);

//     // Only consider results with status: 'failed' as critical errors
//     const hasCriticalErrors = Object.values(flowResults).some(result => 
//       result.status === 'failed' || (result.error && result.status !== 'skipped')
//     );

//     if (hasCriticalErrors) {
//       return {
//         statusCode: 500,
//         headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//         body: JSON.stringify({
//           success: false,
//           message: 'Flow executed with critical errors',
//           results: flowResults,
//         }),
//       };
//     }

//     return {
//       statusCode: 200,
//       headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//       body: JSON.stringify({
//         success: true,
//         message: 'Flow executed successfully',
//         results: flowResults,
//       }),
//     };
//   } catch (error) {
//     console.error('Error executing flow:', error);
//     return {
//       statusCode: error.response?.status || 500,
//       headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//       body: JSON.stringify({ error: error.message || 'Failed to execute flow' }),
//     };
//   }
// };


import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import moment from 'moment-timezone';
import { parsePhoneNumber,getCountryCallingCode } from 'libphonenumber-js';

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
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload),
      });
  
      let responseData = {};
      const responseText = await response.text();
      
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.warn('Non-JSON response:', responseText);
      }
  
      if (!response.ok) {
        throw new Error(responseData[0]?.message || 
                      responseData.message || 
                      `HTTP ${response.status}: ${response.statusText}`);
      }
  
      return { 
        nodeId, 
        recordId: recordId || responseData.id,
        success: true
      };
    } catch (error) {
      console.error(`Error in ${method} request:`, error);
      return {
        nodeId,
        error: error.message,
        success: false,
        status: 'failed'
      };
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

const processConditionNode = async (node, context, salesforceBaseUrl, token) => {
  // Extract node properties with defaults
  const {
    Node_Id__c: nodeId,
    Salesforce_Object__c: salesforceObject,
    Conditions__c: conditionsStr,
    Type__c: nodeType
  } = node;

  // Initialize result object
  const result = {
    nodeId,
    status: 'processed',
    shouldContinue: false,
    skipUntilNextCondition: false,
    isAlwaysRun: false,
    evaluatedConditions: [],
    recordsMatched: 0
  };

  // Parse conditions configuration
  let conditionsConfig = {};
  try {
    conditionsConfig = conditionsStr ? JSON.parse(conditionsStr) : {};
  } catch (e) {
    console.error(`Error parsing conditions for node ${nodeId}:`, e);
    return {
      ...result,
      status: 'failed',
      error: 'Invalid conditions configuration'
    };
  }

  // Extract condition properties
  const {
    pathOption = 'Rules',
    conditions = [],
    logicType = 'AND',
    customLogic = null
  } = conditionsConfig;

  // Handle "Always Run" path option
  if (pathOption === 'Always Run') {
    return {
      ...result,
      shouldContinue: true,
      isAlwaysRun: true,
      message: 'Always Run path - proceeding unconditionally'
    };
  }

  // Validate we have conditions for Rules path
  if (conditions.length === 0) {
    return {
      ...result,
      status: 'failed',
      error: 'No conditions defined for Rules path'
    };
  }

  try {
    // For Salesforce object conditions
    if (salesforceObject) {
      // Build query node structure
      const queryNode = {
        ...node,
        salesforceObject,
        conditions: {
          conditions,
          logicType,
          customLogic
        },
        type: 'Find'
      };

      // Build and execute SOQL query
      const soqlQuery = buildSOQLQuery(queryNode);
      if (!soqlQuery) {
        throw new Error('Failed to build SOQL query');
      }

      console.log(`Executing SOQL for condition node ${nodeId}:`, soqlQuery);
      const queryData = await executeSOQLQuery(soqlQuery, salesforceBaseUrl, token);
      const matchedRecords = processQueryResults(queryData, queryNode.conditions);
      result.recordsMatched = matchedRecords.length;

      // Evaluate conditions against each record
      result.evaluatedConditions = matchedRecords.map(record => {
        return {
          id: record.Id,
          conditions: conditions.map(cond => ({
            field: cond.field,
            operator: cond.operator,
            expected: cond.value,
            actual: record[cond.field],
            passed: evaluateCondition(record, cond)
          }))
        };
      });

      // Determine if we should continue based on custom logic or default behavior
      if (customLogic) {
        result.shouldContinue = evaluateCustomLogic(
          conditions,
          customLogic,
          matchedRecords.length > 0 ? matchedRecords[0] : {}
        );
      } else {
        // Default behavior - continue if any records match all conditions (AND logic)
        result.shouldContinue = matchedRecords.length > 0;
      }

      // Set skip flag if no records matched (only for Rules path)
      if (matchedRecords.length === 0) {
        result.skipUntilNextCondition = true;
        result.message = 'No matching records found - skipping subsequent nodes until next condition';
      } else {
        result.message = `${matchedRecords.length} matching records found - proceeding to next node`;
      }
    } 
    // For form data conditions (when no Salesforce object specified)
    else {
      result.evaluatedConditions = conditions.map(cond => ({
        field: cond.field,
        operator: cond.operator,
        expected: cond.value,
        actual: context[cond.field],
        passed: evaluateCondition(context, cond)
      }));

      if (customLogic) {
        result.shouldContinue = evaluateCustomLogic(
          conditions,
          customLogic,
          context
        );
      } else {
        // Default AND behavior if no custom logic
        result.shouldContinue = result.evaluatedConditions.every(c => c.passed);
      }

      // Set appropriate message
      result.message = result.shouldContinue 
        ? 'Form conditions met - proceeding to next node' 
        : 'Form conditions not met - skipping subsequent nodes until next condition';
      
      // Set skip flag if conditions not met
      if (!result.shouldContinue) {
        result.skipUntilNextCondition = true;
      }
    }

    return result;
  } catch (error) {
    console.error(`Error processing condition node ${nodeId}:`, error);
    return {
      ...result,
      status: 'failed',
      error: error.message,
      shouldContinue: false,
      skipUntilNextCondition: false
    };
  }
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
      formatterConfig: nodeMapping.formatterConfig ? JSON.parse(JSON.stringify(nodeMapping.formatterConfig)) : null
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

const runFlow = async (nodes, formData, instanceUrl, token, userId, formVersionId) => {
  const salesforceBaseUrl = `https://${instanceUrl.replace(/https?:\/\//, '')}/services/data/v60.0`;
  const results = {};
  const processedNodeIds = new Set();

  // Create node map for quick lookup
  const nodeMap = {};
  nodes.forEach(node => {
    nodeMap[node.Node_Id__c || node.nodeId] = node;
  });

  // Sort nodes by Order__c (or order) instead of assuming they're pre-sorted
  const sortedNodes = [...nodes].sort((a, b) => 
    parseInt(a.Order__c || a.order) - parseInt(b.Order__c || b.order)
  );

  let currentContext = { ...formData };
  let skipNodes = false; // Flag to control node skipping
  let currentNodeIndex = 0;

  while (currentNodeIndex < sortedNodes.length) {
    const node = sortedNodes[currentNodeIndex];
    currentNodeIndex++;

    const nodeId = node.Node_Id__c || node.nodeId;
    const nodeType = node.Type__c || node.type;

    if (nodeType === 'Start' || nodeType === 'End' || processedNodeIds.has(nodeId)) {
      continue;
    }

    console.log(`Processing node ${nodeId} of type ${nodeType}`);
    
    // Skip nodes if flag is set, unless it's an Always Run condition
    if (skipNodes && nodeType !== 'Condition') {
      console.log(`Skipping node ${nodeId} due to previous condition not met`);
      results[nodeId] = {
        nodeId,
        status: 'skipped',
        reason: 'Previous condition not met'
      };
      processedNodeIds.add(nodeId);
      continue;
    }

    let nodeData = node;
    if (!node.Salesforce_Object__c || !node.Field_Mappings__c) {
      nodeData = await getNodeData(nodeId, userId, formVersionId);
      if (!nodeData) {
        console.error(`Node ${nodeId} not found in DynamoDB`);
        results[nodeId] = { error: `Node ${nodeId} not found in DynamoDB` };
        continue;
      }
    }

    try {
      // Process formatter config if exists
      if (nodeData.Formatter_Config__c && nodeType !== 'Formatter') {
        const formatterResult = processFormatter(
          typeof nodeData.Formatter_Config__c === 'string' 
            ? JSON.parse(nodeData.Formatter_Config__c) 
            : nodeData.Formatter_Config__c,
          currentContext
        );
        results[nodeId] = formatterResult;

        if (formatterResult.status === 'completed') {
          currentContext = {
            ...currentContext,
            [formatterResult.outputVariable || nodeData.Formatter_Config__c.inputField]: formatterResult.output
          };
        }
      }

      // Process node based on type
      switch (nodeType) {
        case 'CreateUpdate':
          if (!skipNodes) {
            results[nodeId] = await createUpdateNode(nodeData, currentContext, salesforceBaseUrl, token);
          }
          break;

        case 'Find':
        case 'Filter':
          if (!skipNodes) {
            results[nodeId] = await queryNode(nodeData, salesforceBaseUrl, token);
          }
          break;

        case 'Loop':
          if (!skipNodes) {
            const loopResult = await processLoopNode(nodeData, results, currentContext, salesforceBaseUrl, token);
            results[nodeId] = loopResult;
            if (loopResult.loopContext) {
              currentContext = loopResult.loopContext;
            }
          }
          break;

        case 'Formatter':
          const formatterConfig = typeof nodeData.Formatter_Config__c === 'string' 
            ? JSON.parse(nodeData.Formatter_Config__c) 
            : nodeData.Formatter_Config__c;
          const formatterResult = processFormatter(formatterConfig, currentContext);
          results[nodeId] = formatterResult;

          if (formatterResult.status === 'completed') {
            currentContext = {
              ...currentContext,
              [formatterResult.outputVariable || formatterConfig.inputField]: formatterResult.output
            };
          }
          break;

        case 'Path':
          // Handle multiple next nodes by adding them to the processing queue
          const nextNodeIds = (nodeData.Next_Node_Id__c || '').split(',').filter(id => id);
          nextNodeIds.reverse().forEach(nextNodeId => {
            if (nodeMap[nextNodeId]) {
              sortedNodes.splice(currentNodeIndex, 0, nodeMap[nextNodeId]);
            }
          });
          results[nodeId] = { status: 'processed', message: 'Path node processed' };
          break;

        case 'Condition':
          const conditionResult = await processConditionNode(nodeData, currentContext, salesforceBaseUrl, token);
          results[nodeId] = conditionResult;
          
          // Reset skip flag for condition nodes
          skipNodes = false;

          // Handle Always Run conditions
          if (conditionResult.isAlwaysRun) {
            const nextNodeIds = (nodeData.Next_Node_Id__c || '').split(',').filter(id => id);
            nextNodeIds.reverse().forEach(nextNodeId => {
              if (nodeMap[nextNodeId]) {
                sortedNodes.splice(currentNodeIndex, 0, nodeMap[nextNodeId]);
              }
            });
          } 
          // Handle Rules path conditions
          else {
            if (conditionResult.shouldContinue) {
              // Follow main path
              const nextNodeIds = (nodeData.Next_Node_Id__c || '').split(',').filter(id => id);
              nextNodeIds.reverse().forEach(nextNodeId => {
                if (nodeMap[nextNodeId]) {
                  sortedNodes.splice(currentNodeIndex, 0, nodeMap[nextNodeId]);
                }
              });
            } else if (nodeData.Fallback_Node_Id__c) {
              // Follow fallback path
              sortedNodes.splice(currentNodeIndex, 0, nodeMap[nodeData.Fallback_Node_Id__c]);
            } else {
              // No fallback path - skip until next condition
              skipNodes = true;
            }
          }
          break;

        default:
          console.warn(`Unsupported node type: ${nodeType}`);
          results[nodeId] = { error: `Unsupported node type: ${nodeType}` };
      }

      processedNodeIds.add(nodeId);
    } catch (error) {
      console.error(`Error processing node ${nodeId}:`, error);
      results[nodeId] = { 
        nodeId,
        status: 'failed',
        error: error.message,
        stack: error.stack 
      };
    }
  }

  return results;
};

export const handler = async (event) => {
  try {
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

    console.log('formData :: ', formData);
    const parsedNodes = nodes.map(node => {
      return {
        nodeId: node.Node_Id__c || node.nodeId,
        type: node.Type__c || node.actionType,
        order: node.Order__c || node.order || 0,
        salesforceObject: node.Salesforce_Object__c || node.salesforceObject,
        conditions: node.Conditions__c ? JSON.parse(node.Conditions__c) : node.conditions,
        fieldMappings: node.Field_Mappings__c ? JSON.parse(node.Field_Mappings__c) : node.fieldMappings,
        loopConfig: node.Loop_Config__c ? JSON.parse(node.Loop_Config__c) : node.loopConfig,
        formatterConfig: node.Formatter_Config__c ? JSON.parse(node.Formatter_Config__c) : node.formatterConfig,
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

    const flowResults = await runFlow(parsedNodes, formData, instanceUrl, token, userId, formVersionId);

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