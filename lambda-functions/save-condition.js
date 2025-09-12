import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, condition, formVersionId, conditionId } = body;
    let token = event.headers.Authorization?.split(' ')[1];

    // const origin = event.headers.Origin || event.headers.origin;
    
    // if(origin !== "https://d2bri1qui9cr5s.cloudfront.net"){
    //   return {
    //     statusCode: 403,
    //     headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    //     body: JSON.stringify({ error: 'Unauthorized' }),
    //   };
    // }
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
    let tokenRefreshed = true;

    if (!userId || !instanceUrl || !condition || !token || !formVersionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

    let existingConditionId = null;
    let existingConditions = [];

    const query = `SELECT Id, Condition_Data__c FROM Form_Condition__c WHERE Form_Version__c = '${formVersionId}' LIMIT 1`;
    let queryResponse = await fetch(`${salesforceBaseUrl}/query?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if(!queryResponse.ok && queryResponse.status === 401) {
      token = await fetchNewAccessToken(userId);
      tokenRefreshed = true;
      queryResponse = await fetch(`${salesforceBaseUrl}/query?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }

    if (queryResponse.ok) {
      const queryData = await queryResponse.json();
      if (queryData.records.length > 0) {
        existingConditionId = queryData.records[0].Id;
        existingConditions = JSON.parse(queryData.records[0].Condition_Data__c || '[]');
      }
    }

    const conditionData = JSON.parse(condition.Condition_Data__c);
    const newCondition = {
      Id: conditionId || `local_${Date.now()}`,
      type: conditionData.type,
    
      // === New/Changed: Cleanly handle update_calculate_field type ===
      ...(conditionData.type === 'update_calculate_field'
        ? {
            conditions: (conditionData.conditions || []).map(cond => ({
              ifField: cond.ifField,
              operator: cond.operator || 'equals',
              value: cond.value || null,
            })),
            action: conditionData.action, // 'copy_field_values' or 'calculate_field'
            sourceFields: conditionData.sourceFields || [],
            // Always use `formula` (string), not calcItems
            formula: conditionData.formula || '',
            targetField: conditionData.targetField,
            logic: conditionData.logic || 'AND',
            logicExpression: conditionData.logic === 'Custom' ? (conditionData.logicExpression || '') : '',
          }
        : conditionData.type === 'dependent'
        ? {
            ifField: conditionData.ifField,
            value: conditionData.value || null,
            dependentField: conditionData.dependentField,
            dependentValues: conditionData.dependentValues,
          }
        : {
            conditions: (conditionData.conditions || []).map((cond) => ({
              ifField: cond.ifField,
              operator: cond.operator || 'equals',
              value: cond.value || null,
            })),
            logic: conditionData.logic || 'AND',
            logicExpression: conditionData.logic === 'Custom' ? (conditionData.logicExpression || '') : '',
            ...(conditionData.type === 'show_hide'
              ? {
                  thenAction: conditionData.thenAction,
                  thenFields: conditionData.thenFields,
                }
              : conditionData.type === 'skip_hide_page'
              ? {
                  thenAction: conditionData.thenAction,
                  sourcePage: conditionData.sourcePage,
                  targetPage: Array.isArray(conditionData.targetPage)
                    ? conditionData.targetPage
                    : [conditionData.targetPage].filter(Boolean),
                  ...(conditionData.thenAction === 'loop'
                    ? {
                        loopField: conditionData.loopField || '',
                        loopValue: conditionData.loopValue || '',
                        loopType: conditionData.loopType || 'static',
                      }
                    : {}),
                }
              : {
                  thenAction: conditionData.thenAction,
                  thenFields: conditionData.thenFields,
                  ...(conditionData.thenAction === 'set mask'
                    ? { maskPattern: conditionData.maskPattern }
                    : {}),
                  ...(conditionData.thenAction === 'unmask' ? { maskPattern: null } : {}),
                }),
          }),
    };
    
    
    const updatedConditions = conditionId
      ? existingConditions.map((c) => {
          const parsed = c.Condition_Data__c ? JSON.parse(c.Condition_Data__c) : c;
          return c.Id === conditionId ? newCondition : parsed;
        })
      : [...existingConditions.map((c) => (c.Condition_Data__c ? JSON.parse(c.Condition_Data__c) : c)), newCondition];



    const sfCondition = {
      Form_Version__c: formVersionId,
      Condition_Data__c: JSON.stringify(updatedConditions),
    };

    let salesforceConditionId;
    if (existingConditionId) {
      let response = await fetch(`${salesforceBaseUrl}/sobjects/Form_Condition__c/${existingConditionId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sfCondition),
      });

      if (!response.ok) {
        if (response.status === 401 && !tokenRefreshed) {
          token = await fetchNewAccessToken(userId);
          tokenRefreshed = true;
          response = await fetch(`${salesforceBaseUrl}/sobjects/Form_Condition__c/${existingConditionId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sfCondition),
          });
        }
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData[0]?.message || 'Failed to update condition');
        }
      }
      salesforceConditionId = existingConditionId;
    } else {
      let response = await fetch(`${salesforceBaseUrl}/sobjects/Form_Condition__c`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sfCondition),
      });

      if (!response.ok) {
        if (response.status === 401 && !tokenRefreshed) {
          token = await fetchNewAccessToken(userId);
          tokenRefreshed = true;
          response = await fetch(`${salesforceBaseUrl}/sobjects/Form_Condition__c`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sfCondition),
          });
        }
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData[0]?.message || 'Failed to save condition');
        }
      }
      const conditionData = await response.json();
      salesforceConditionId = conditionData.id;
    }

    if (!conditionId) {
      newCondition.Id = `${salesforceConditionId}_${newCondition.Id}`; // Only append Salesforce ID for new conditions
    }

    let allItems = [];
    let ExclusiveStartKey = undefined;

    do {
      const queryResponse = await dynamoClient.send(
        new QueryCommand({
          TableName: METADATA_TABLE_NAME,
          KeyConditionExpression: 'UserId = :userId',
          ExpressionAttributeValues: { ':userId': { S: userId } },
          ExclusiveStartKey,
        })
      );

      if (queryResponse.Items) {
        allItems.push(...queryResponse.Items);
      }

      ExclusiveStartKey = queryResponse.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    let formRecords = [];
    let existingMetadata = {};
    let createdAt = new Date().toISOString();

    const metadataItem = allItems.find(item => item.ChunkIndex?.S === 'Metadata');
    const formRecordItems = allItems.filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'));

    if (metadataItem?.Metadata?.S) {
      try {
        existingMetadata = JSON.parse(metadataItem.Metadata.S);
      } catch (e) {
        console.warn('Failed to parse Metadata:', e);
      }
      createdAt = metadataItem.CreatedAt?.S || createdAt;
    }

    if (formRecordItems.length > 0) {
      try {
        const sortedChunks = formRecordItems
          .sort((a, b) => {
            const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
            const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
            return aNum - bNum;
          });
        const expectedChunks = sortedChunks.length;
        for (let i = 0; i < expectedChunks; i++) {
          if (!sortedChunks.some(item => item.ChunkIndex.S === `FormRecords_${i}`)) {
            console.warn(`Missing chunk FormRecords_${i}`);
            formRecords = [];
            break;
          }
        }
        const combinedFormRecords = sortedChunks.map(item => item.FormRecords.S).join('');
        formRecords = JSON.parse(combinedFormRecords);
      } catch (e) {
        console.warn('Failed to parse FormRecords chunks:', e);
        formRecords = [];
      }
    }

    let formVersion = null;
    let formIndex = -1;
    for (let i = 0; i < formRecords.length; i++) {
      formVersion = formRecords[i].FormVersions.find((v) => v.Id === formVersionId);
      if (formVersion) {
        formIndex = i;
        break;
      }
    }

    if (formVersion) {
      formVersion.Conditions = updatedConditions;
      formRecords[formIndex] = { ...formRecords[formIndex] };
    } else {
      throw new Error(`Form version ${formVersionId} not found in DynamoDB`);
    }

    const formRecordsString = JSON.stringify(formRecords);
    const CHUNK_SIZE = 370000;
    const chunks = [];
    for (let i = 0; i < formRecordsString.length; i += CHUNK_SIZE) {
      chunks.push(formRecordsString.slice(i, i + CHUNK_SIZE));
    }

    let writeRequests = [
      // {
      //   PutRequest: {
      //     Item: {
      //       UserId: { S: userId },
      //       ChunkIndex: { S: 'Metadata' },
      //       InstanceUrl: { S: cleanedInstanceUrl },
      //       Metadata: { S: JSON.stringify(existingMetadata) },
      //       UserProfile  : { S: metadataItem.UserProfile?.S || "{}" },
      //       Fieldset : { S: metadataItem.Fieldset?.S || "{}" },
      //       CreatedAt: { S: createdAt },
      //       UpdatedAt: { S: new Date().toISOString() },
      //     },
      //   },
      // },
      ...chunks.map((chunk, index) => ({
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: `FormRecords_${index}` },
            FormRecords: { S: chunk },
            CreatedAt: { S: new Date().toISOString() },
            UpdatedAt: { S: new Date().toISOString() },
          },
        },
      })),
    ];

    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: { [METADATA_TABLE_NAME]: writeRequests },
      })
    );

    if(tokenRefreshed){
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, condition: newCondition, newAccessToken: token }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, condition: newCondition }),
    };
  } catch (error) {
    console.error('Error saving condition:', error);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to save condition' }),
    };
  }
};