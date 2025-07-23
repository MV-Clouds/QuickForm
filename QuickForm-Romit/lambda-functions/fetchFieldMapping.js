import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Extract parameters from event or event.body
    let userId = event.userId;
    let formVersionId = event.formVersionId;
    let instanceUrl = event.instanceUrl;
    let access_token = event.headers?.Authorization?.split(' ')[1] || event.headers?.authorization?.split(' ')[1];

    // Fallback to event.body for standard API Gateway events
    if (event.body && (!userId || !formVersionId || !instanceUrl)) {
      try {
        const body = JSON.parse(event.body || '{}');
        userId = userId || body.userId;
        formVersionId = formVersionId || body.formVersionId;
        instanceUrl = instanceUrl || body.instanceUrl;
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Invalid JSON in request body' }),
        };
      }
    }

    // Validate required parameters
    if (!userId || !formVersionId || !instanceUrl || !access_token) {
      const missingParams = [
        !userId && 'userId',
        !formVersionId && 'formVersionId',
        !instanceUrl && 'instanceUrl',
        !access_token && 'access_token'
      ].filter(Boolean).join(', ');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: `Missing required parameters: ${missingParams}`,
        }),
      };
    }

    // Check if we have cached data in DynamoDB first
    try {
      const queryResponse = await dynamoClient.send(
        new QueryCommand({
          TableName: METADATA_TABLE_NAME,
          KeyConditionExpression: 'UserId = :userId',
          ExpressionAttributeValues: {
            ':userId': { S: userId },
          },
        })
      );

      if (queryResponse.Items && queryResponse.Items.length > 0) {
        const formRecordItems = queryResponse.Items.filter(item => 
          item.ChunkIndex?.S.startsWith('FormRecords_')
        );

        if (formRecordItems.length > 0) {
          try {
            // Sort chunks by ChunkIndex and combine
            const sortedChunks = formRecordItems
              .sort((a, b) => {
                const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
                const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
                return aNum - bNum;
              })
              .map(item => item.FormRecords.S);
            
            const combinedFormRecords = sortedChunks.join('');
            const formRecords = JSON.parse(combinedFormRecords);

            // Find the specific form version in the cached data
            const cachedFormVersion = formRecords.flatMap(form => 
              form.FormVersions
            ).find(version => version.Id === formVersionId);

            if (cachedFormVersion) {
              // Prepare Salesforce API URL from cached instance URL
              const cleanedInstanceUrl = queryResponse.Items.find(item => 
                item.ChunkIndex?.S === 'Metadata'
              )?.InstanceUrl?.S || instanceUrl.replace(/https?:\/\//, '');
              
              const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

              // Query QF_Mapping__c records (we still need this as it's not cached)
              const query = `SELECT Id, Name, Order__c, Node_Configuration__c, Form_Version__c, Type__c, Previous_Node_Id__c, 
                                    Next_Node_Id__c, Salesforce_Object__c, Conditions__c, Field_Mappings__c, Node_Id__c, 
                                    Loop_Config__c, Formatter_Config__c 
                             FROM QF_Mapping__c 
                             WHERE Form_Version__c = '${formVersionId}'`;
              const queryResponse = await fetch(
                `${salesforceBaseUrl}/query?q=${encodeURIComponent(query)}`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const queryData = await queryResponse.json();
              if (!queryResponse.ok) {
                throw new Error(queryData[0]?.message || `Failed to query QF_Mapping__c: ${queryResponse.status}`);
              }

              // Process mappings (same as your original code)
              const mappings = queryData.records.map((record) => ({
                id: record.Id,
                nodeId: record.Node_Id__c,
                actionType: record.Type__c,
                label: record.Name,
                order: parseInt(record.Order__c) || 0,
                configurationForm: record.Node_Configuration__c ? JSON.parse(record.Node_Configuration__c) : null,
                formVersionId: record.Form_Version__c,
                previousNodeId: record.Previous_Node_Id__c || null,
                nextNodeIds: record.Next_Node_Id__c ? record.Next_Node_Id__c.split(',') : [],
                salesforceObject: record.Salesforce_Object__c || null,
                conditions: record.Conditions__c ? JSON.parse(record.Conditions__c) : null,
                fieldMappings: record.Field_Mappings__c ? JSON.parse(record.Field_Mappings__c) : null,
                loopConfig: record.Loop_Config__c ? JSON.parse(record.Loop_Config__c) : null,
                formatterConfig: record.Formatter_Config__c ? JSON.parse(record.Formatter_Config__c) : null,
                logicType: record.Conditions__c && JSON.parse(record.Conditions__c)?.logicType || null,
                customLogic: record.Conditions__c && JSON.parse(record.Conditions__c)?.customLogic || null,
              }));

              // Generate nodes for React Flow (same as your original code)
              const nodes = mappings.map((mapping) => {
                let position = { x: mapping.order * 150, y: 100 };
                if (mapping.configurationForm?.position && typeof mapping.configurationForm.position.x === 'number' && typeof mapping.configurationForm.position.y === 'number') {
                  position = { x: mapping.configurationForm.position.x, y: mapping.configurationForm.position.y };
                } else {
                  console.warn(`Invalid or missing position in Node_Configuration__c for node ${mapping.nodeId}, using fallback position`);
                }

                return {
                  id: mapping.nodeId,
                  type: mapping.actionType === 'Start' || mapping.actionType === 'End' ? mapping.actionType.toLowerCase() : 'action',
                  data: {
                    label: mapping.label,
                    action: mapping.actionType,
                    ...mapping,
                  },
                  position,
                };
              });

              // Generate edges from nextNodeIds and previousNodeId (same as your original code)
              const edges = [];
              mappings.forEach((mapping) => {
                if (mapping.nextNodeIds && mapping.nextNodeIds.length > 0) {
                  mapping.nextNodeIds.forEach((targetId) => {
                    edges.push({
                      id: `e-${mapping.nodeId}-${targetId}`,
                      source: mapping.nodeId,
                      target: targetId,
                      type: 'default',
                    });
                  });
                }
                if (mapping.previousNodeId) {
                  edges.push({
                    id: `e-${mapping.previousNodeId}-${mapping.nodeId}`,
                    source: mapping.previousNodeId,
                    target: mapping.nodeId,
                    type: 'default',
                  });
                }
              });

              const uniqueEdges = Array.from(new Map(edges.map((edge) => [edge.id, edge])).values());

              return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  success: true,
                  mappings,
                  nodes,
                  edges: Array.from(uniqueEdges),
                  cached: true, // Indicate that we used cached form version data
                }),
              };
            }
          } catch (cacheParseError) {
            console.warn('Failed to parse cached form records, falling back to Salesforce API:', cacheParseError);
            // Continue to normal flow if cache parsing fails
          }
        }
      }
    } catch (dynamoError) {
      console.warn('Error checking DynamoDB cache, falling back to Salesforce API:', dynamoError);
      // Continue to normal flow if DynamoDB query fails
    }

    // Normal flow if no cached data found or if cache check failed
    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

    // Query QF_Mapping__c records
    const query = `SELECT Id, Name, Order__c, Node_Configuration__c, Form_Version__c, Type__c, Previous_Node_Id__c, 
                          Next_Node_Id__c, Salesforce_Object__c, Conditions__c, Field_Mappings__c, Node_Id__c, 
                          Loop_Config__c, Formatter_Config__c 
                   FROM QF_Mapping__c 
                   WHERE Form_Version__c = '${formVersionId}'`;
    const queryResponse = await fetch(
      `${salesforceBaseUrl}/query?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const queryData = await queryResponse.json();
    if (!queryResponse.ok) {
      throw new Error(queryData[0]?.message || `Failed to query QF_Mapping__c: ${queryResponse.status}`);
    }

    // Process mappings
    const mappings = queryData.records.map((record) => ({
      id: record.Id,
      nodeId: record.Node_Id__c,
      actionType: record.Type__c,
      label: record.Name,
      order: parseInt(record.Order__c) || 0,
      configurationForm: record.Node_Configuration__c ? JSON.parse(record.Node_Configuration__c) : null,
      formVersionId: record.Form_Version__c,
      previousNodeId: record.Previous_Node_Id__c || null,
      nextNodeIds: record.Next_Node_Id__c ? record.Next_Node_Id__c.split(',') : [],
      salesforceObject: record.Salesforce_Object__c || null,
      conditions: record.Conditions__c ? JSON.parse(record.Conditions__c) : null,
      fieldMappings: record.Field_Mappings__c ? JSON.parse(record.Field_Mappings__c) : null,
      loopConfig: record.Loop_Config__c ? JSON.parse(record.Loop_Config__c) : null,
      formatterConfig: record.Formatter_Config__c ? JSON.parse(record.Formatter_Config__c) : null,
      logicType: record.Conditions__c && JSON.parse(record.Conditions__c)?.logicType || null,
      customLogic: record.Conditions__c && JSON.parse(record.Conditions__c)?.customLogic || null,
    }));

    // Generate nodes for React Flow
    const nodes = mappings.map((mapping) => {
      let position = { x: mapping.order * 150, y: 100 };
      if (mapping.configurationForm?.position && typeof mapping.configurationForm.position.x === 'number' && typeof mapping.configurationForm.position.y === 'number') {
        position = { x: mapping.configurationForm.position.x, y: mapping.configurationForm.position.y };
      } else {
        console.warn(`Invalid or missing position in Node_Configuration__c for node ${mapping.nodeId}, using fallback position`);
      }

      return {
        id: mapping.nodeId,
        type: mapping.actionType === 'Start' || mapping.actionType === 'End' ? mapping.actionType.toLowerCase() : 'action',
        data: {
          label: mapping.label,
          action: mapping.actionType,
          ...mapping,
        },
        position,
      };
    });

    // Generate edges from nextNodeIds and previousNodeId
    const edges = [];
    mappings.forEach((mapping) => {
      if (mapping.nextNodeIds && mapping.nextNodeIds.length > 0) {
        mapping.nextNodeIds.forEach((targetId) => {
          edges.push({
            id: `e-${mapping.nodeId}-${targetId}`,
            source: mapping.nodeId,
            target: targetId,
            type: 'default',
          });
        });
      }
      if (mapping.previousNodeId) {
        edges.push({
          id: `e-${mapping.previousNodeId}-${mapping.nodeId}`,
          source: mapping.previousNodeId,
          target: mapping.nodeId,
          type: 'default',
        });
      }
    });

    const uniqueEdges = Array.from(new Map(edges.map((edge) => [edge.id, edge])).values());

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        mappings,
        nodes,
        edges: Array.from(uniqueEdges),
        cached: false, // Indicate that we didn't use cached data
      }),
    };
  } catch (error) {
    console.error('Error fetching mappings:', error);
    return {
      statusCode: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to fetch mappings' }),
    };
  }
};