import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, formVersionId } = body;

    if (!userId || !formVersionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Fetch from DynamoDB
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
    for (const form of formRecords) {
      formVersion = form.FormVersions.find(v => v.Id === formVersionId);
      if (formVersion) break;
    }

    if (!formVersion) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Form version ${formVersionId} not found` }),
      };
    }

    const conditions = formVersion.Conditions || [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ conditions }),
    };
  } catch (error) {
    console.error('Error fetching conditions:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to fetch conditions' }),
    };
  }
};