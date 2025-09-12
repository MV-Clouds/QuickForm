import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, prefillData, formVersionId, prefillId } = body
    let token = event.headers.Authorization?.split(' ')[1];
    let tokenRefreshed = false;

    if (!userId || !instanceUrl || !prefillData || !formVersionId || !token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

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

    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

    // Extract Order__c from prefillData if present
    let orderValue = null;
    if (typeof prefillData.Order__c !== 'undefined') {
      orderValue = prefillData.Order__c;
      // Remove it from the saved JSON if you don't want duplication inside Prefill_Data__c
      delete prefillData.Order__c;
    }

    const sfPrefill = {
      Form_Version__c: formVersionId,
      Prefill_Data__c: JSON.stringify(prefillData),
      ...(orderValue !== null ? { Order__c: orderValue } : {}) // only include if present
    };


    // ==== 3. Save/Update in Salesforce ====
    let salesforcePrefillId = prefillId;
    if (salesforcePrefillId) {
      let response = await fetch(`${salesforceBaseUrl}/sobjects/Prefill__c/${salesforcePrefillId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sfPrefill),
      });

      if (!response.ok) {
        if (response.status === 401 && !tokenRefreshed) {
          token = await fetchNewAccessToken(userId);
          tokenRefreshed = true;
    
          // Retry with new token
          response = await fetch(`${salesforceBaseUrl}/sobjects/Prefill__c/${salesforcePrefillId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sfPrefill),
          });
        }
    
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData[0]?.message || 'Failed to update prefill');
        }
      }
      
    } else {
      let response = await fetch(`${salesforceBaseUrl}/sobjects/Prefill__c`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sfPrefill),
      });

      if (!response.ok) {
        if (response.status === 401 && !tokenRefreshed) {
          token = await fetchNewAccessToken(userId);
          tokenRefreshed = true;
    
          // Retry with new token
          response = await fetch(`${salesforceBaseUrl}/sobjects/Prefill__c`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sfPrefill),
          });
        }
    
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData[0]?.message || 'Failed to save prefill');
        }
      }
      const prefillResp = await response.json();
      salesforcePrefillId = prefillResp.id;
    }

    // ==== 4. Update DynamoDB ====
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
      const prefills = Array.isArray(formVersion.Prefills) ? formVersion.Prefills : [];
      
      const idx = prefills.findIndex(p => p.Id === salesforcePrefillId);
      const orderToStore = orderValue !== null ? orderValue : prefillData.Order__c;
      
      if (idx >= 0) {
        prefills[idx] = { 
          Id: salesforcePrefillId,
          Prefill_Data__c: JSON.stringify(prefillData), // match SF format
          ...(orderToStore !== null ? { Order__c: orderToStore } : {})
        };
      } else {
        prefills.push({ 
          Id: salesforcePrefillId,
          Prefill_Data__c: JSON.stringify(prefillData),
          ...(orderToStore !== null ? { Order__c: orderToStore } : {})
        });
      }
    
      formVersion.Prefills = prefills;
      
      formVersion.Prefills.sort((a, b) => {
        const aOrder = typeof a.Order__c === 'number' ? a.Order__c : Infinity;
        const bOrder = typeof b.Order__c === 'number' ? b.Order__c : Infinity;
        return aOrder - bOrder;
      });
    }
    
     else {
      throw new Error(`Form version ${formVersionId} not found in DynamoDB`);
    }

    
    const formRecordsString = JSON.stringify(formRecords);
    const CHUNK_SIZE = 370000;
    const chunks = [];
    for (let i = 0; i < formRecordsString.length; i += CHUNK_SIZE) {
      chunks.push(formRecordsString.slice(i, i + CHUNK_SIZE));
    }

    let writeRequests = [
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
        body: JSON.stringify({ success: true, prefill: prefillData, newAccessToken: token }),
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, prefill: prefillData }),
    };

  } catch (error) {
    console.error('Error saving prefill:', error);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to save prefill' }),
    };
  }
};
