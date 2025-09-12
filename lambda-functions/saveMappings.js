import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  try {
    // Log the incoming event for debugging
    console.log('Received event:', JSON.stringify(event.body, null, 2));

    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, flowId, nodes, edges, mappings } = body;
    // Extract the Authorization token
    let token = event.headers.Authorization?.split(' ')[1] || event.headers.authorization?.split(' ')[1];
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
    let tokenRefreshed = false;

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
    const actionNodes = nodes;
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

    // Query valid Form_Field__c IDs for the given formVersionId
    const formVersionId = mappings[0]?.formVersionId;
    if (!formVersionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No formVersionId provided in mappings' }),
      };
    }

    let formFieldsQuery = await fetch(
      `${salesforceBaseUrl}/query?q=${encodeURIComponent(
        `SELECT Id FROM Form_Field__c WHERE Form_Version__c = '${formVersionId}'`
      )}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }
    );

    if (!formFieldsQuery.ok) {
      if (formFieldsQuery.status === 401 && !tokenRefreshed) {
        token = await fetchNewAccessToken(userId);
        tokenRefreshed = true;
        formFieldsQuery = await fetch(
          `${salesforceBaseUrl}/query?q=${encodeURIComponent(
            `SELECT Id FROM Form_Field__c WHERE Form_Version__c = '${formVersionId}'`
          )}`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }
        );
      }
      if (!formFieldsQuery.ok) {
        throw new Error(
          formFieldsData[0]?.message || `Failed to query Form_Field__c: ${formFieldsQuery.status}`
        );
      }
    }
    const formFieldsData = await formFieldsQuery.json();

    const validFormFieldIds = new Set(formFieldsData.records.map(record => record.Id));

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
        selectedFileUploadFields,
        storeAsContentDocument,
        pathOption,
        nextNodeIds,
        previousNodeId,
        label,
        order,
        formVersionId: mappingFormVersionId,
      } = mapping;

      if (mappingFormVersionId !== formVersionId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: `All mappings must have the same formVersionId: ${formVersionId}`,
          }),
        };
      }

      const effectiveActionType = actionType;

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
      console.log('nodeData', nodeData)
      const nodeConfiguration = nodeData
        ? {
          position: nodeData.position || { x: 0, y: 0 },
        }
        : null;

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
          effectiveActionType === 'CreateUpdate' || effectiveActionType === 'Google Sheet' && fieldMappings && fieldMappings.length > 0
            ? JSON.stringify(fieldMappings)
            : null,
        Node_Configuration__c: nodeConfiguration ? JSON.stringify(nodeConfiguration) : null,
        Order__c: order.toString(),
        Form_Version__c: formVersionId,
        Node_Id__c: nodeId,
        Config__c: effectiveActionType === 'Loop' && loopConfig
          ? JSON.stringify({
            ...loopConfig,
            exitConditions: loopConfig.exitConditions || [],
            logicType: loopConfig.exitConditions?.length > 1 ? loopConfig.logicType || 'AND' : null,
            customLogic: loopConfig.logicType === 'Custom' ? loopConfig.customLogic || '' : null,
          })
          : effectiveActionType === 'Formatter' && formatterConfig ? JSON.stringify(formatterConfig) :
           effectiveActionType === 'Google Sheet' ?
              JSON.stringify({
                sheetName: mapping.selectedSheetName,
                spreadsheetId: mapping.spreadsheetId,
                conditionsLogic : mapping.conditionsLogic,
                sheetConditions : mapping.sheetConditions,
                updateMultiple : mapping.updateMultiple
              }) :  effectiveActionType === 'FindGoogleSheet' ? JSON.stringify({
                  findNodeName: mapping.findNodeName,
                    selectedSheetName: mapping.selectedSheetName,
                    spreadsheetId: mapping.spreadsheetId,
                    findSheetConditions: mapping.findSheetConditions,
                    updateMultiple: mapping.updateMultiple,
                    googleSheetReturnLimit: mapping.googleSheetReturnLimit,
                    googleSheetSortOrder: mapping.googleSheetSortOrder,
                    googleSheetSortField : mapping.googleSheetSortField,
                    logicType : mapping.logicType,
                    customLogic : mapping.customLogic,
              }) : null
      };

      // Query Salesforce for existing mapping
      let queryResponse = await fetch(
        `${salesforceBaseUrl}/query?q=${encodeURIComponent(
          `SELECT Id FROM QF_Mapping__c WHERE Form_Version__c = '${formVersionId}' AND Node_Id__c = '${nodeId}'`
        )}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );

      if (!queryResponse.ok) {
        if(queryResponse.status === 401){
          tokenRefreshed = true;
          token = await fetchNewAccessToken(userId);
          queryResponse = await fetch(
            `${salesforceBaseUrl}/query?q=${encodeURIComponent(
              `SELECT Id FROM QF_Mapping__c WHERE Form_Version__c = '${formVersionId}' AND Node_Id__c = '${nodeId}'`
            )}`,
            {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            }
          );
        }
        if(!queryResponse.ok){
          throw new Error(
            queryData[0]?.message || `Failed to query QF_Mapping__c for node ${nodeId}: ${queryResponse.status}`
          );
        }
      }
      const queryData = await queryResponse.json();

      let finalMappingId;
      if (queryData.records.length > 0) {
        // Update existing Salesforce record
        const existingRecordId = queryData.records[0].Id;
        let mappingResponse = await fetch(
          `${salesforceBaseUrl}/sobjects/QF_Mapping__c/${existingRecordId}`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(mappingPayload),
          }
        );
        if (!mappingResponse.ok) {
          if(mappingResponse.status === 401){
            tokenRefreshed = true;
            token = await fetchNewAccessToken(userId);
            mappingResponse = await fetch(
              `${salesforceBaseUrl}/sobjects/QF_Mapping__c/${existingRecordId}`,
              {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(mappingPayload),
              }
            );
          }
          if(!mappingResponse.ok){
            const errorData = await mappingResponse.json();
            throw new Error(
              errorData[0]?.message ||
              `Failed to update QF_Mapping__c record for node ${nodeId}: ${mappingResponse.status}`
            );
          }
        }
        finalMappingId = existingRecordId;
      } else {
        // Create new Salesforce record
        let mappingResponse = await fetch(`${salesforceBaseUrl}/sobjects/QF_Mapping__c`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mappingPayload),
        });
        if (!mappingResponse.ok) {
          if(mappingResponse.status === 401){
            tokenRefreshed = true;
            token = await fetchNewAccessToken(userId);
            mappingResponse = await fetch(`${salesforceBaseUrl}/sobjects/QF_Mapping__c`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(mappingPayload),
            });
          }
          if(!mappingResponse.ok){
            const errorData = await mappingResponse.json();
            throw new Error(
              errorData[0]?.message ||
              `Failed to create QF_Mapping__c record for node ${nodeId}: ${mappingResponse.status}`
            );
          }
        }
        const mappingDataResponse = await mappingResponse.json();
        finalMappingId = mappingDataResponse.id;
      }
      mappingIds.set(nodeId, finalMappingId);
    }

    // Update DynamoDB with combined data in FormRecords
    const currentTime = new Date().toISOString();

    // Retrieve existing data from DynamoDB using QueryCommand
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

    // Reconstruct the full FormRecords from chunks
    let combinedFormRecords = '';
    const formRecordChunks = allItems
      .filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'))
      .sort((a, b) => {
        const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
        const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
        return aNum - bNum;
      });

    for (const chunk of formRecordChunks) {
      combinedFormRecords += chunk.FormRecords.S;
    }

    let formRecords = [];
    try {
      formRecords = JSON.parse(combinedFormRecords || '[]');
    } catch (e) {
      console.error('Failed to parse FormRecords:', e);
      formRecords = [];
    }

    // Create mappings structure with Salesforce IDs
    const updatedMappings = {};
    mappings.forEach((mapping) => {
      updatedMappings[mapping.nodeId] = {
        id: mappingIds.get(mapping.nodeId),
        ...mapping,
      };
    });

    console.log('updatedmapping---> ',updatedMappings);
    


    // Find and update the specific form version in formRecords
    let formVersionFound = false;
    formRecords = formRecords.map(form => {
      const versionIndex = form.FormVersions?.findIndex(v => v.Id === formVersionId);
      if (versionIndex >= 0) {
        formVersionFound = true;
        return {
          ...form,
          FormVersions: form.FormVersions.map((version, idx) => {
            if (idx === versionIndex) {
              return {
                ...version,
                Mappings: {
                  Id: version.Id,
                  FlowId: flowId,
                  Mappings: updatedMappings,
                  Nodes: nodes, // Use nodes exactly as received in request
                  Edges: edges, // Use edges exactly as received in request
                }
              };
            }
            return version;
          })
        };
      }
      return form;
    });

    if (!formVersionFound) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: `Form version ${formVersionId} not found in existing records`,
        }),
      };
    }

    // Chunk formRecords for DynamoDB
    const formRecordsString = JSON.stringify(formRecords);
    const CHUNK_SIZE = 370000;
    const chunks = [];
    for (let i = 0; i < formRecordsString.length; i += CHUNK_SIZE) {
      chunks.push(formRecordsString.slice(i, i + CHUNK_SIZE));
    }

    // Prepare batch write requests
    const writeRequests = [
      {
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: 'Metadata' },
            InstanceUrl: { S: cleanedInstanceUrl },
            Metadata: { S: allItems.find(item => item.ChunkIndex?.S === 'Metadata')?.Metadata?.S || '{}' },
            UserProfile: { S: allItems.find(item => item.ChunkIndex?.S === 'Metadata')?.UserProfile?.S || '{}' },
            Fieldset: { S: allItems.find(item => item.ChunkIndex?.S === 'Metadata')?.Fieldset?.S || '{}' },
            CreatedAt: { S: allItems.find(item => item.ChunkIndex?.S === 'Metadata')?.CreatedAt?.S || currentTime },
            GoogleData : { S: allItems.find(item => item.ChunkIndex?.S === 'Metadata')?.GoogleData?.S || {} },
            UpdatedAt: { S: currentTime },
            FlowId: { S: flowId },
          },
        },
      },
      ...chunks.map((chunk, index) => ({
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: `FormRecords_${index}` },
            FormRecords: { S: chunk },
            CreatedAt: { S: currentTime },
            UpdatedAt: { S: currentTime },
            FlowId: { S: flowId },
          },
        },
      })),
    ];

    // Write to DynamoDB
    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [METADATA_TABLE_NAME]: writeRequests,
        },
      })
    );

    if(tokenRefreshed){
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          message: 'All mappings saved successfully',
          mappingIds: Array.from(mappingIds.values()),
          newAccessToken: token
        }),
      };
    }
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