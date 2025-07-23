import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  // Parse the request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  const { userId, instanceUrl } = body;

  if (!userId || !instanceUrl) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Missing userId or instanceUrl' }),
    };
  }

  try {
    // Fetch metadata from DynamoDB for the current user and instance URL
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

    if (allItems.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Metadata not found for this user and instance' }),
      };
    }

    const metadataItem = allItems.find(item => item.ChunkIndex?.S === 'Metadata');
    const formRecordItems = allItems.filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'));

    if (!metadataItem?.Metadata?.S) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Metadata not found for this user and instance' }),
      };
    }

    let formRecords = null;
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
        formRecords = combinedFormRecords;
      } catch (e) {
        console.warn('Failed to process FormRecords chunks:', e.message, '\nStack trace:', e.stack);
        formRecords = null; // Return null if chunk processing fails, matching original behavior
      }
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        metadata: metadataItem.Metadata.S,
        FormRecords: formRecords,
      }),
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to fetch metadata' }),
    };
  }
};