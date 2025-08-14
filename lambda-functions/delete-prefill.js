import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, formVersionId, prefillId } = body;
    const token = event.headers.Authorization?.split(' ')[1];

    if (!userId || !instanceUrl || !prefillId || !formVersionId || !token) {
      return { statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
         body: JSON.stringify({ error: 'Missing parameters' }) };
    }

    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

    // 1. Delete from Salesforce
    const sfResp = await fetch(`${salesforceBaseUrl}/sobjects/Prefill__c/${prefillId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!sfResp.ok && sfResp.status !== 404) {
      throw new Error(`Failed to delete from Salesforce`);
    }

    // 2. Fetch all chunks from DynamoDB
    let allItems = [];
    let ExclusiveStartKey;
    do {
      const queryResponse = await dynamoClient.send(
        new QueryCommand({
          TableName: METADATA_TABLE_NAME,
          KeyConditionExpression: 'UserId = :u',
          ExpressionAttributeValues: { ':u': { S: userId } },
          ExclusiveStartKey
        })
      );
      if (queryResponse.Items) allItems.push(...queryResponse.Items);
      ExclusiveStartKey = queryResponse.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    const metadataItem = allItems.find(i => i.ChunkIndex.S === 'Metadata');
    const formRecordItems = allItems.filter(i => i.ChunkIndex.S.startsWith('FormRecords_'));

    let formRecords = [];
    if (formRecordItems.length > 0) {
      const sortedChunks = formRecordItems.sort((a, b) => {
        const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
        const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
        return aNum - bNum;
      });
      formRecords = JSON.parse(sortedChunks.map(x => x.FormRecords.S).join(''));
    }

    // Remove from Prefills and re-sequence orders
    let deletedOrder = null;
    let updatedPrefills = [];

    for (const form of formRecords) {
      const fv = form.FormVersions.find(f => f.Id === formVersionId);
      if (fv && Array.isArray(fv.Prefills)) {
        // Find the deleted prefill order
        const deletedPrefill = fv.Prefills.find(p => p.Id === prefillId);
        deletedOrder = deletedPrefill?.Order__c || null;

        // Remove deleted prefill
        fv.Prefills = fv.Prefills.filter(p => p.Id !== prefillId);

        if (deletedOrder !== null) {
          fv.Prefills = fv.Prefills.map(p => {
            if (typeof p.Order__c === 'number' && p.Order__c > deletedOrder) {
              const updated = {
                ...p,
                Order__c: p.Order__c - 1 // only change top-level Order__c
              };
              updatedPrefills.push(updated);
              return updated;
            }
            return p;
          });
        }
        

        // Sort to ensure correct order in memory
        fv.Prefills.sort((a, b) => (a.Order__c || Infinity) - (b.Order__c || Infinity));
      }
    }

    // === Bulk update in Salesforce if needed ===
    if (updatedPrefills.length > 0) {
      const compositeRequest = {
        allOrNone: true,
        records: updatedPrefills.map((p) => ({
          attributes: { type: 'Prefill__c' },
          Id: p.Id,
          Order__c: p.Order__c
        }))
      };

      const compositeResponse = await fetch(`${salesforceBaseUrl}/composite/sobjects`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(compositeRequest)
      });

      if (!compositeResponse.ok) {
        const errorData = await compositeResponse.json();
        throw new Error(errorData[0]?.message || 'Failed to bulk update Prefill__c order in Salesforce');
      }
    }


    // Write back updated chunks
    const formRecordsString = JSON.stringify(formRecords);
    const CHUNK_SIZE = 370000;
    const chunks = [];
    for (let i = 0; i < formRecordsString.length; i += CHUNK_SIZE) {
      chunks.push(formRecordsString.slice(i, i + CHUNK_SIZE));
    }

    const writeRequests = [
      {
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: 'Metadata' },
            InstanceUrl: { S: cleanedInstanceUrl },
            Metadata: { S: metadataItem.Metadata.S },
            UserProfile: { S: metadataItem.UserProfile?.S || '{}' },
            Fieldset: { S: metadataItem.Fieldset?.S || '{}' },
            CreatedAt: { S: metadataItem.CreatedAt.S },
            UpdatedAt: { S: new Date().toISOString() }
          }
        }
      },
      ...chunks.map((chunk, index) => ({
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: `FormRecords_${index}` },
            FormRecords: { S: chunk },
            CreatedAt: { S: new Date().toISOString() },
            UpdatedAt: { S: new Date().toISOString() }
          }
        }
      }))
    ];

    await dynamoClient.send(new BatchWriteItemCommand({ RequestItems: { [METADATA_TABLE_NAME]: writeRequests } }));

    return { statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: err.message }) };
  }
};
