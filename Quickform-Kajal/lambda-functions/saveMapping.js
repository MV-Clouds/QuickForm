import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceMetadata';

export const handler = async (event) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, mappings } = body;
    const token = event.headers.Authorization?.split(' ')[1] || event.headers.authorization?.split(' ')[1];
    console.log("Received token:", token ? '****' : 'missing');
    if (!userId || !instanceUrl || !mappings || !Array.isArray(mappings) || !token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required parameters: userId, instanceUrl, mappings, or Authorization token' }),
      };
    }

    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;
    const mappingIds = [];

    // Validate all mappings
    for (const mapping of mappings) {
      const { nodeId, actionType, salesforceObject, fieldMappings, conditions, loopConfig, formatterConfig, pathOption, nextNodeIds, previousNodeId, label, order, formVersionId } = mapping;

      const isSpecialNode = nodeId === "start" || nodeId === "end";
      const effectiveActionType = actionType || (isSpecialNode ? (nodeId === "start" ? "Start" : "End") : null);
      if (!nodeId || !label || !Number.isInteger(order) || !formVersionId || (!effectiveActionType && !isSpecialNode)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: `Missing or invalid mapping data for node ${nodeId}: nodeId, label, order (must be integer), formVersionId, or actionType` }),
        };
      }

      if (!isSpecialNode) {
        if (effectiveActionType === "Path") {
          if (!nextNodeIds || !Array.isArray(nextNodeIds) || nextNodeIds.length !== 2) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Path node ${nodeId} must include exactly two next node IDs` }),
            };
          }
        } else if (effectiveActionType === "CreateUpdate") {
          if (!salesforceObject || !fieldMappings || !Array.isArray(fieldMappings) || fieldMappings.length === 0) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Create/Update node ${nodeId} must include a Salesforce object and at least one field mapping` }),
            };
          }
          if (Array.isArray(conditions) && conditions.length > 0) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Create/Update node ${nodeId} must include at least one valid condition if conditions are provided` }),
            };
          }
        } else if (effectiveActionType === "Find" || effectiveActionType === "Filter") {
          if (!salesforceObject || !conditions || !Array.isArray(conditions) || conditions.length === 0) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `${effectiveActionType} node ${nodeId} must include a Salesforce object and at least one condition` }),
            };
          }
        } else if (effectiveActionType === "Condition") {
          if (!pathOption || !["Rules", "Always Run", "Fallback"].includes(pathOption)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Condition node ${nodeId} must have a valid pathOption (Rules, Always Run, or Fallback)` }),
            };
          }
          if (pathOption === "Rules" && (!salesforceObject || !conditions || !Array.isArray(conditions) || conditions.length === 0)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Condition node ${nodeId} with pathOption 'Rules' must include a Salesforce object and at least one condition` }),
            };
          }
        } else if (effectiveActionType === "Loop") {
          if (!loopConfig || !loopConfig.loopCollection || !loopConfig.currentItemVariableName) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Loop node ${nodeId} must include a collection and current item variable name` }),
            };
          }
          const findNodeIds = mappings.filter((m) => m.actionType === "Find").map((m) => m.nodeId);
          if (!findNodeIds.includes(loopConfig.loopCollection)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Invalid Find node ID in loop collection for node ${nodeId}: ${loopConfig.loopCollection}`,
              }),
            };
          }
          if (loopConfig.maxIterations && (isNaN(loopConfig.maxIterations) || loopConfig.maxIterations < 1)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Max iterations must be a positive number for node ${nodeId}` }),
            };
          }
          if (loopConfig.loopVariables && (typeof loopConfig.loopVariables !== "object" || 
              typeof loopConfig.loopVariables.currentIndex !== "boolean" || 
              typeof loopConfig.loopVariables.counter !== "boolean" || 
              !["0", "1"].includes(loopConfig.loopVariables.indexBase))) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Invalid loop variables configuration for node ${nodeId}` }),
            };
          }
          if (loopConfig.exitConditions && !Array.isArray(loopConfig.exitConditions)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Exit conditions must be an array for node ${nodeId}` }),
            };
          }
        } else if (effectiveActionType === "Formatter") {
          if (!formatterConfig || !formatterConfig.inputField || !formatterConfig.operation) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Formatter node ${nodeId} must include an input field and operation` }),
            };
          }
          if (formatterConfig.formatType === "date") {
            if ((formatterConfig.operation === "format_date" || formatterConfig.operation === "format_datetime" || formatterConfig.operation === "format_time") && (!formatterConfig.options?.format || !formatterConfig.options?.timezone)) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a date format and timezone` }),
              };
            }
            if (formatterConfig.operation === "timezone_conversion" && (!formatterConfig.options?.timezone || !formatterConfig.options?.targetTimezone)) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include source and target timezones` }),
              };
            }
            if ((formatterConfig.operation === "add_date" || formatterConfig.operation === "subtract_date") && (!formatterConfig.options?.unit || formatterConfig.options?.value === undefined)) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a date unit and value` }),
              };
            }
            if (formatterConfig.operation === "date_difference" && (!formatterConfig.inputField2 && !formatterConfig.useCustomInput)) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a second input field or use custom input for date difference` }),
              };
            }
            if (formatterConfig.useCustomInput && !formatterConfig.customValue) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a custom compare date` }),
              };
            }
          }
          if (formatterConfig.formatType === "number") {
            if (formatterConfig.operation === "locale_format" && !formatterConfig.options?.locale) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a locale` }),
              };
            }
            if (formatterConfig.operation === "currency_format" && (!formatterConfig.options?.currency || !formatterConfig.options?.locale)) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a currency and locale` }),
              };
            }
            if (formatterConfig.operation === "round_number" && formatterConfig.options?.decimals === undefined) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include number of decimals` }),
              };
            }
            if (formatterConfig.operation === "phone_format" && (!formatterConfig.options?.countryCode || !formatterConfig.options?.format)) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a country code and format` }),
              };
            }
            if (formatterConfig.operation === "math_operation" && (!formatterConfig.options?.operation || (!formatterConfig.inputField2 && !formatterConfig.useCustomInput))) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a math operation and second input field or custom value` }),
              };
            }
            if (formatterConfig.useCustomInput && formatterConfig.customValue === undefined) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a custom value for math operation` }),
              };
            }
          }
          if (formatterConfig.formatType === "text") {
            if (formatterConfig.operation === "replace" && (!formatterConfig.options?.searchValue || !formatterConfig.options?.replaceValue)) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include search and replace values` }),
              };
            }
            if (formatterConfig.operation === "split" && (!formatterConfig.options?.delimiter || formatterConfig.options?.index === undefined)) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: `Formatter node ${nodeId} must include a delimiter and index` }),
              };
            }
          }
        }
      }

      // Prepare conditions JSON for Condition nodes to include pathOption
      let conditionsJson = null;
      if (effectiveActionType === "Condition") {
        conditionsJson = JSON.stringify({ pathOption: pathOption || "Rules", rules: conditions || [] });
      } else if ((effectiveActionType === "CreateUpdate" || effectiveActionType === "Find" || effectiveActionType === "Filter") && conditions && Array.isArray(conditions) && conditions.length > 0) {
        conditionsJson = JSON.stringify(conditions);
      }

      const mappingPayload = {
        Name: label,
        Type__c: effectiveActionType,
        Previous_Node_Id__c: previousNodeId || null,
        Next_Node_Id__c: nextNodeIds ? nextNodeIds.join(',') : null,
        Salesforce_Object__c: effectiveActionType === "CreateUpdate" || effectiveActionType === "Find" || (effectiveActionType === "Condition" && pathOption === "Rules") || effectiveActionType === "Filter" ? salesforceObject || null : null,
        Conditions__c: conditionsJson,
        Field_Mappings__c: effectiveActionType === "CreateUpdate" ? (fieldMappings && fieldMappings.length > 0 ? JSON.stringify(fieldMappings) : null) : null,
        Loop_Config__c: effectiveActionType === "Loop" && loopConfig ? JSON.stringify(loopConfig) : null,
        Formatter_Config__c: effectiveActionType === "Formatter" && formatterConfig ? JSON.stringify(formatterConfig) : null,
        Configuration__c: null, // Not used since pathOption is stored in Conditions__c
        Order__c: order,
        Form_Version__c: formVersionId,
        Node_Id__c: nodeId,
      };

      const queryResponse = await fetch(
        `${salesforceBaseUrl}/query?q=${encodeURIComponent(
          `SELECT Id FROM QF_Mapping__c WHERE Form_Version__c = '${formVersionId}' AND Name = '${label}' AND Order__c = ${order}`
        )}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );

      const queryData = await queryResponse.json();

      let finalMappingId;
      if (!queryResponse.ok) {
        throw new Error(queryData[0]?.message || `Failed to query QF_Mapping__c for node ${nodeId}: ${queryResponse.status}`);
      }

      if (queryData.records.length > 0) {
        const existingRecordId = queryData.records[0].Id;
        const mappingResponse = await fetch(`${salesforceBaseUrl}/sobjects/QF_Mapping__c/${existingRecordId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mappingPayload),
        });
        if (!mappingResponse.ok) {
          const errorData = await mappingResponse.json();
          throw new Error(errorData[0]?.message || `Failed to update QF_Mapping__c record for node ${nodeId}: ${mappingResponse.status}`);
        }
        finalMappingId = existingRecordId;
      } else {
        const mappingResponse = await fetch(`${salesforceBaseUrl}/sobjects/QF_Mapping__c`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mappingPayload),
        });
        if (!mappingResponse.ok) {
          const errorData = await mappingResponse.json();
          throw new Error(errorData[0]?.message || `Failed to create QF_Mapping__c record for node ${nodeId}: ${mappingResponse.status}`);
        }
        const mappingDataResponse = await mappingResponse.json();
        finalMappingId = mappingDataResponse.id;
      }
      mappingIds.push(finalMappingId);
    }

    // Update DynamoDB with all mappings
    const currentTime = new Date().toISOString();
    const existingMetadataRes = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: { InstanceUrl: { S: cleanedInstanceUrl }, UserId: { S: userId } },
      })
    );

    let existingMetadata = {}, existingFormRecords = [], existingMappings = {}, createdAt = currentTime;
    if (existingMetadataRes.Item) {
      console.log('Existing DynamoDB Item:', JSON.stringify(existingMetadataRes.Item, null, 2));
      if (existingMetadataRes.Item.Metadata?.S) existingMetadata = JSON.parse(existingMetadataRes.Item.Metadata.S);
      if (existingMetadataRes.Item.FormRecords?.S) existingFormRecords = JSON.parse(existingMetadataRes.Item.FormRecords.S);
      if (existingMetadataRes.Item.Mapping?.S) existingMappings = JSON.parse(existingMetadataRes.Item.Mapping.S);
      createdAt = existingMetadataRes.Item.CreatedAt?.S || currentTime;
    } else {
      console.warn('No existing DynamoDB item found for InstanceUrl:', cleanedInstanceUrl, 'UserId:', userId);
    }

    mappings.forEach((mapping, index) => {
      existingMappings[mapping.nodeId] = {
        id: mappingIds[index],
        ...mapping,
      };
    });

    await dynamoClient.send(
      new PutItemCommand({
        TableName: METADATA_TABLE_NAME,
        Item: {
          InstanceUrl: { S: cleanedInstanceUrl },
          UserId: { S: userId },
          Metadata: { S: JSON.stringify(existingMetadata) },
          FormRecords: { S: JSON.stringify(existingFormRecords) },
          Mapping: { S: JSON.stringify(existingMappings) },
          CreatedAt: { S: createdAt },
          UpdatedAt: { S: currentTime },
        },
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'All mappings saved successfully', mappingIds }),
    };
  } catch (error) {
    console.error('Error saving mappings:', error, 'Raw event:', JSON.stringify(event, null, 2));
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to save mappings' }),
    };
  }
};

