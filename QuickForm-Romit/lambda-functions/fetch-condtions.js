import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceData';

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
    const dynamoResponse = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: { UserId: { S: userId } },
      })
    );

    let formRecords = [];
    if (dynamoResponse.Item?.FormRecords?.S) {
      formRecords = JSON.parse(dynamoResponse.Item.FormRecords.S);
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