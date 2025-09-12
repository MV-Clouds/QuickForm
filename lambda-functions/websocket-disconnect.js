import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const CONNECTIONS_TABLE = 'WebSocketConnections';

export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await dynamoClient.send(new DeleteItemCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId: { S: connectionId } },
    }));

    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Disconnect error:', error);
    return { statusCode: 500, body: 'Failed on disconnect' };
  }
};
