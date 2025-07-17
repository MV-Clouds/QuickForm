import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  // Extract parameters from the Lambda event
  console.log(event);
  const { userId, instanceUrl } = event.body ? JSON.parse(event.body) : {};
  // Validate required parameters
  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({ error: 'Missing required parameter: userId' }),
    };
  }

  try {
    // Clean the instance URL (remove protocol) if provided
    const cleanedInstanceUrl = instanceUrl ? instanceUrl.replace(/https?:\/\//, '') : null;

    // Query all items from SalesforceChunkData table for the user
    const queryParams = {
      TableName: METADATA_TABLE_NAME,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
      },
    };

    const queryResponse = await dynamoClient.send(new QueryCommand(queryParams));
    const itemsToDelete = queryResponse.Items || [];

    // Perform batch deletion if there are items to delete
    if (itemsToDelete.length > 0) {
      const deleteRequests = itemsToDelete.map(item => ({
        DeleteRequest: {
          Key: {
            UserId: { S: item.UserId.S },
            ChunkIndex: { S: item.ChunkIndex.S },
          },
        },
      }));

      // BatchWriteItemCommand can handle up to 25 items per request
      const batchSize = 25;
      for (let i = 0; i < deleteRequests.length; i += batchSize) {
        const batch = deleteRequests.slice(i, i + batchSize);
        await dynamoClient.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [METADATA_TABLE_NAME]: batch,
            },
          })
        );
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({
        message: `Successfully deleted data for userId: ${userId}${cleanedInstanceUrl ? ` and instanceUrl: ${cleanedInstanceUrl}` : ''}`,
        deletedMetadataItems: itemsToDelete.length,
      }),
    };
  } catch (err) {
    const stackTrace = err?.stack || new Error().stack;
    console.error('Error in deleteUserData:', err.message, '\nStack trace:', stackTrace);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({ error: 'Failed to delete user data', details: err.message }),
    };
  }
};