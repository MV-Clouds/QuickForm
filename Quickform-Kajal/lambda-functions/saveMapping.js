import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceData';

export const handler = async (event) => {
  try {
    // Log the incoming event for debugging
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, flowId, nodes, edges, mappings } = body;
    
    // Extract the Authorization token
    const token = event.headers.Authorization?.split(' ')[1] || event.headers.authorization?.split(' ')[1];
    console.log('Received token:', token ? '****' : 'missing');

    // Validate required input parameters
    if (
      !userId ||
      !instanceUrl ||
      !flowId ||
      !nodes ||
      !Array.isArray(nodes) ||
      !edges ||
      !Array.isArray(edges) ||
      !mappings ||
      !Array.isArray(mappings) ||
      !token
    ) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Missing required parameters: userId, instanceUrl, flowId, nodes, edges, mappings, or Authorization token',
        }),
      };
    }

    // Validate that the flow contains at least one action node
    const actionNodes = nodes.filter((node) => !['start', 'end'].includes(node.id));
    if (actionNodes.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Flow must contain at least one action node' }),
      };
    }

    // Prepare Salesforce API URL
    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;
    const mappingIds = new Map();

    // Validate and process each mapping
    for (const mapping of mappings) {
      const {
        nodeId,
        actionType,
        salesforceObject,
        fieldMappings,
        conditions,
        logicType,
        customLogic,
        loopConfig,
        formatterConfig,
        enableConditions,
        returnLimit,
        sortField,
        sortOrder,
        pathOption,
        nextNodeIds,
        previousNodeId,
        label,
        order,
        formVersionId,
      } = mapping;

      const isSpecialNode = nodeId === 'start' || nodeId === 'end';
      const effectiveActionType = actionType || (isSpecialNode ? (nodeId === 'start' ? 'Start' : 'End') : null);

      // Basic mapping validation
      if (
        !nodeId ||
        !label ||
        !Number.isInteger(order) ||
        !formVersionId ||
        (!effectiveActionType && !isSpecialNode)
      ) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: `Missing or invalid mapping data for node ${nodeId}: nodeId, label, order (must be integer), formVersionId, or actionType`,
          }),
        };
      }

      // Validate non-special nodes
      if (!isSpecialNode) {
        if (effectiveActionType === 'Path') {
          if (!nextNodeIds || !Array.isArray(nextNodeIds) || nextNodeIds.length === 0) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: `Path node ${nodeId} must include at least one next node ID` }),
            };
          }
        } else if (effectiveActionType === 'CreateUpdate') {
          if (
            !salesforceObject ||
            !fieldMappings ||
            !Array.isArray(fieldMappings) ||
            fieldMappings.length === 0
          ) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Create/Update node ${nodeId} must include a Salesforce object and at least one field mapping`,
              }),
            };
          }
          if (enableConditions && (!conditions || !Array.isArray(conditions) || conditions.length === 0)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Create/Update node ${nodeId} must include at least one valid condition if conditions are enabled`,
              }),
            };
          }
          if (enableConditions && conditions.length > 1 && !logicType) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Create/Update node ${nodeId} must include logicType for multiple conditions`,
              }),
            };
          }
          if (logicType === 'Custom' && !customLogic) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Create/Update node ${nodeId} must include customLogic when logicType is Custom`,
              }),
            };
          }
        } else if (effectiveActionType === 'Find' || effectiveActionType === 'Filter') {
          if (
            !salesforceObject ||
            !conditions ||
            !Array.isArray(conditions) ||
            conditions.length === 0
          ) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `${effectiveActionType} node ${nodeId} must include a Salesforce object and at least one condition`,
              }),
            };
          }
          if (conditions.length > 1 && !logicType) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `${effectiveActionType} node ${nodeId} must include logicType for multiple conditions`,
              }),
            };
          }
          if (logicType === 'Custom' && !customLogic) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `${effectiveActionType} node ${nodeId} must include customLogic when logicType is Custom`,
              }),
            };
          }
          if (returnLimit && (isNaN(returnLimit) || returnLimit < 1 || returnLimit > 100)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Return limit for node ${nodeId} must be a number between 1 and 100`,
              }),
            };
          }
        } else if (effectiveActionType === 'Condition') {
          if (!pathOption || !['Rules', 'Always Run', 'Fallback'].includes(pathOption)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Condition node ${nodeId} must have a valid pathOption (Rules, Always Run, or Fallback)`,
              }),
            };
          }
          if (pathOption === 'Rules') {
            if (
              !salesforceObject ||
              !conditions ||
              !Array.isArray(conditions) ||
              conditions.length === 0
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Condition node ${nodeId} with pathOption 'Rules' must include a Salesforce object and at least one condition`,
                }),
              };
            }
            if (conditions.length > 1 && !logicType) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Condition node ${nodeId} must include logicType for multiple conditions`,
                }),
              };
            }
            if (logicType === 'Custom' && !customLogic) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Condition node ${nodeId} must include customLogic when logicType is Custom`,
                }),
              };
            }
          }
        } else if (effectiveActionType === 'Loop') {
          if (!loopConfig || !loopConfig.loopCollection || !loopConfig.currentItemVariableName) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Loop node ${nodeId} must include a collection and current item variable name`,
              }),
            };
          }
          const findNodeIds = mappings.filter((m) => m.actionType === 'Find').map((m) => m.nodeId);
          if (!findNodeIds.includes(loopConfig.loopCollection)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Invalid Find node ID in loop collection for node ${nodeId}: ${loopConfig.loopCollection}`,
              }),
            };
          }
          if (
            loopConfig.maxIterations &&
            (isNaN(loopConfig.maxIterations) || loopConfig.maxIterations < 1)
          ) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Max iterations must be a positive number for node ${nodeId}`,
              }),
            };
          }
          if (
            loopConfig.loopVariables &&
            (typeof loopConfig.loopVariables !== 'object' ||
              typeof loopConfig.loopVariables.currentIndex !== 'boolean' ||
              typeof loopConfig.loopVariables.counter !== 'boolean' ||
              !['0', '1'].includes(loopConfig.loopVariables.indexBase))
          ) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Invalid loop variables configuration for node ${nodeId}`,
              }),
            };
          }
          if (loopConfig.exitConditions && !Array.isArray(loopConfig.exitConditions)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Exit conditions must be an array for node ${nodeId}`,
              }),
            };
          }
          if (
            loopConfig.exitConditions &&
            loopConfig.exitConditions.length > 1 &&
            !loopConfig.logicType
          ) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Loop node ${nodeId} must include logicType for multiple exit conditions`,
              }),
            };
          }
          if (loopConfig.logicType === 'Custom' && !loopConfig.customLogic) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Loop node ${nodeId} must include customLogic when logicType is Custom`,
              }),
            };
          }
        } else if (effectiveActionType === 'Formatter') {
          if (!formatterConfig || !formatterConfig.inputField || !formatterConfig.operation) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({
                error: `Formatter node ${nodeId} must include an input field and operation`,
              }),
            };
          }
          if (formatterConfig.formatType === 'date') {
            if (
              (formatterConfig.operation === 'format_date' ||
                formatterConfig.operation === 'format_datetime' ||
                formatterConfig.operation === 'format_time') &&
              (!formatterConfig.options?.format || !formatterConfig.options?.timezone)
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a date format and timezone`,
                }),
              };
            }
            if (
              formatterConfig.operation === 'timezone_conversion' &&
              (!formatterConfig.options?.timezone || !formatterConfig.options?.targetTimezone)
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include source and target timezones`,
                }),
              };
            }
            if (
              (formatterConfig.operation === 'add_date' ||
                formatterConfig.operation === 'subtract_date') &&
              (!formatterConfig.options?.unit || formatterConfig.options?.value === undefined)
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a date unit and value`,
                }),
              };
            }
            if (
              formatterConfig.operation === 'date_difference' &&
              (!formatterConfig.inputField2 && !formatterConfig.useCustomInput)
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a second input field or use custom input for date difference`,
                }),
              };
            }
            if (formatterConfig.useCustomInput && !formatterConfig.customValue) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a custom compare date`,
                }),
              };
            }
          }
          if (formatterConfig.formatType === 'number') {
            if (formatterConfig.operation === 'locale_format' && !formatterConfig.options?.locale) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a locale`,
                }),
              };
            }
            if (
              formatterConfig.operation === 'currency_format' &&
              (!formatterConfig.options?.currency || !formatterConfig.options?.locale)
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a currency and locale`,
                }),
              };
            }
            if (
              formatterConfig.operation === 'round_number' &&
              formatterConfig.options?.decimals === undefined
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include number of decimals`,
                }),
              };
            }
            if (
              formatterConfig.operation === 'phone_format' &&
              (!formatterConfig.options?.countryCode || !formatterConfig.options?.format)
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a country code and format`,
                }),
              };
            }
            if (
              formatterConfig.operation === 'math_operation' &&
              (!formatterConfig.options?.operation ||
                (!formatterConfig.inputField2 && !formatterConfig.useCustomInput))
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a math operation and second input field or custom value`,
                }),
              };
            }
            if (formatterConfig.useCustomInput && formatterConfig.customValue === undefined) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a custom value for math operation`,
                }),
              };
            }
          }
          if (formatterConfig.formatType === 'text') {
            if (
              formatterConfig.operation === 'replace' &&
              (!formatterConfig.options?.searchValue || !formatterConfig.options?.replaceValue)
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include search and replace values`,
                }),
              };
            }
            if (
              formatterConfig.operation === 'split' &&
              (!formatterConfig.options?.delimiter || formatterConfig.options?.index === undefined)
            ) {
              return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  error: `Formatter node ${nodeId} must include a delimiter and index`,
                }),
              };
            }
          }
        }
      }

      // Prepare conditions JSON for storage
      let conditionsJson = null;
      if (effectiveActionType === 'Condition') {
        conditionsJson = JSON.stringify({
          pathOption: pathOption || 'Rules',
          conditions: conditions || [],
          logicType: pathOption === 'Rules' && conditions?.length > 1 ? logicType || 'AND' : null,
          customLogic: logicType === 'Custom' ? customLogic || '' : null,
          returnLimit: (effectiveActionType === 'Condition' && pathOption === 'Rules') ? returnLimit || null : null,
          sortField: (effectiveActionType === 'Condition' && pathOption === 'Rules') ? sortField || null : null,
          sortOrder: (effectiveActionType === 'Condition' && pathOption === 'Rules') ? sortOrder || null : null,
        });
      } else if (
        (effectiveActionType === 'CreateUpdate' && enableConditions) ||
        effectiveActionType === 'Find' ||
        effectiveActionType === 'Filter'
      ) {
        conditionsJson = JSON.stringify({
          conditions: conditions || [],
          logicType: conditions?.length > 1 ? logicType || 'AND' : null,
          customLogic: logicType === 'Custom' ? customLogic || '' : null,
          returnLimit: (effectiveActionType === 'Find' || effectiveActionType === 'Filter') ? returnLimit || null : null,
          sortField: (effectiveActionType === 'Find' || effectiveActionType === 'Filter') ? sortField || null : null,
          sortOrder: (effectiveActionType === 'Find' || effectiveActionType === 'Filter') ? sortOrder || null : null,
        });
      }

      const nodeData = nodes.find((node) => node.id === nodeId);
      const nodeConfiguration = nodeData
        ? {
            position: nodeData.position || { x: 0, y: 0 }, 
          }
        : null;

      // Validate position data
      if (nodeData && (!nodeData.position || typeof nodeData.position.x !== 'number' || typeof nodeData.position.y !== 'number')) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: `Invalid position data for node ${nodeId}: position must include numeric x and y coordinates`,
          }),
        };
      }

      // Build Salesforce mapping payload
      const mappingPayload = {
        Name: label,
        Type__c: effectiveActionType,
        Previous_Node_Id__c: previousNodeId || null,
        Next_Node_Id__c: nextNodeIds ? nextNodeIds.join(',') : null,
        Salesforce_Object__c:
          effectiveActionType === 'CreateUpdate' ||
          effectiveActionType === 'Find' ||
          effectiveActionType === 'Filter' ||
          (effectiveActionType === 'Condition' && pathOption === 'Rules')
            ? salesforceObject || null
            : null,
        Conditions__c: conditionsJson,
        Field_Mappings__c:
          effectiveActionType === 'CreateUpdate' && fieldMappings && fieldMappings.length > 0
            ? JSON.stringify(fieldMappings)
            : null,
        Loop_Config__c:
          effectiveActionType === 'Loop' && loopConfig
            ? JSON.stringify({
                ...loopConfig,
                exitConditions: loopConfig.exitConditions || [],
                logicType: loopConfig.exitConditions?.length > 1 ? loopConfig.logicType || 'AND' : null,
                customLogic: loopConfig.logicType === 'Custom' ? loopConfig.customLogic || '' : null,
              })
            : null,
        Formatter_Config__c:
        effectiveActionType === 'Formatter' && formatterConfig ? JSON.stringify(formatterConfig) : null,
        Node_Configuration__c: nodeConfiguration ? JSON.stringify(nodeConfiguration) : null,
        Order__c: order.toString(),
        Form_Version__c: formVersionId,
        Node_Id__c: nodeId,
      };

      // Query Salesforce for existing mapping
      const queryResponse = await fetch(
        `${salesforceBaseUrl}/query?q=${encodeURIComponent(
          `SELECT Id FROM QF_Mapping__c WHERE Form_Version__c = '${formVersionId}' AND Node_Id__c = '${nodeId}'`
        )}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );

      const queryData = await queryResponse.json();
      if (!queryResponse.ok) {
        throw new Error(
          queryData[0]?.message || `Failed to query QF_Mapping__c for node ${nodeId}: ${queryResponse.status}`
        );
      }

      let finalMappingId;
      if (queryData.records.length > 0) {
        // Update existing Salesforce record
        const existingRecordId = queryData.records[0].Id;
        const mappingResponse = await fetch(
          `${salesforceBaseUrl}/sobjects/QF_Mapping__c/${existingRecordId}`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(mappingPayload),
          }
        );
        if (!mappingResponse.ok) {
          const errorData = await mappingResponse.json();
          throw new Error(
            errorData[0]?.message ||
              `Failed to update QF_Mapping__c record for node ${nodeId}: ${mappingResponse.status}`
          );
        }
        finalMappingId = existingRecordId;
      } else {
        // Create new Salesforce record
        const mappingResponse = await fetch(`${salesforceBaseUrl}/sobjects/QF_Mapping__c`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mappingPayload),
        });
        if (!mappingResponse.ok) {
          const errorData = await mappingResponse.json();
          throw new Error(
            errorData[0]?.message ||
              `Failed to create QF_Mapping__c record for node ${nodeId}: ${mappingResponse.status}`
          );
        }
        const mappingDataResponse = await mappingResponse.json();
        finalMappingId = mappingDataResponse.id;
      }
      mappingIds.set(nodeId, finalMappingId);
    }

    // Update DynamoDB with mappings, nodes, and edges
    const currentTime = new Date().toISOString();
    const existingMetadataRes = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: { UserId: { S: userId } },
      })
    );

    let existingMetadata = {},
      existingFormRecords = [],
      existingMappings = {},
      existingNodes = [],
      existingEdges = [],
      createdAt = currentTime;
    if (existingMetadataRes.Item) {
      console.log('Existing DynamoDB Item:', JSON.stringify(existingMetadataRes.Item, null, 2));
      if (existingMetadataRes.Item.Metadata?.S)
        existingMetadata = JSON.parse(existingMetadataRes.Item.Metadata.S);
      if (existingMetadataRes.Item.FormRecords?.S)
        existingFormRecords = JSON.parse(existingMetadataRes.Item.FormRecords.S);
      if (existingMetadataRes.Item.Mapping?.S)
        existingMappings = JSON.parse(existingMetadataRes.Item.Mapping.S);
      if (existingMetadataRes.Item.Nodes?.S)
        existingNodes = JSON.parse(existingMetadataRes.Item.Nodes.S);
      if (existingMetadataRes.Item.Edges?.S)
        existingEdges = JSON.parse(existingMetadataRes.Item.Edges.S);
      createdAt = existingMetadataRes.Item.CreatedAt?.S || currentTime;
    } else {
      console.warn(
        'No existing DynamoDB item found for InstanceUrl:',
        cleanedInstanceUrl,
        'UserId:',
        userId
      );
    }

    // Update mappings with Salesforce IDs
    const updatedMappings = {};
    mappings.forEach((mapping) => {
      updatedMappings[mapping.nodeId] = {
        id: mappingIds.get(mapping.nodeId),
        ...mapping,
      };
    });

    // Store nodes and edges
    const updatedNodes = nodes;
    const updatedEdges = edges;

    // Save to DynamoDB
    await dynamoClient.send(
      new PutItemCommand({
        TableName: METADATA_TABLE_NAME,
        Item: {
          UserId: { S: userId },
          InstanceUrl: { S: cleanedInstanceUrl },
          Metadata: { S: JSON.stringify(existingMetadata) },
          FormRecords: { S: JSON.stringify(existingFormRecords) },
          Mapping: { S: JSON.stringify(updatedMappings) },
          Nodes: { S: JSON.stringify(updatedNodes) },
          Edges: { S: JSON.stringify(updatedEdges) },
          CreatedAt: { S: createdAt },
          UpdatedAt: { S: currentTime },
          FlowId: { S: flowId },
        },
      })
    );

    // Return success response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'All mappings saved successfully',
        mappingIds: Array.from(mappingIds.values()),
      }),
    };
  } catch (error) {
    // Handle errors
    console.error('Error saving mappings:', error, 'Raw event:', JSON.stringify(event, null, 2));
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to save mappings' }),
    };
  }
};