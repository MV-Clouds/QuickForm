// fetch-form-by-link.js
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceData';

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

  const { userId, formId, accessToken } = body;

  // Validate required parameters
  if (!userId || !formId || !accessToken) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Missing userId, formId, or accessToken',
      }),
    };
  }

  try {
    const dataForInstance = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );
    const instanceUrl = dataForInstance.Item.InstanceUrl.S;
    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');

    // Fetch metadata from DynamoDB
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );

    if (!response.Item || !response.Item.FormRecords?.S) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Form metadata not found' }),
      };
    }

    // Parse FormRecords
    let formRecords;
    try {
      formRecords = JSON.parse(response.Item.FormRecords.S);
    } catch (e) {
      console.error('Failed to parse FormRecords:', e);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Failed to parse form metadata' }),
      };
    }

    // Find the form version
    // Find the matching form and its published version
    const matchedForm = formRecords.find(f => f.Id === formId);
    if (!matchedForm) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Form not found for ID: ${formId}` }),
      };
    }

    const publishedVersion = matchedForm.FormVersions.find(v => v.Stage__c === 'Publish');
    if (!publishedVersion) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `No published version found for Form ID: ${formId}` }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        formVersion: {
          Id: publishedVersion.Id,
          Form__c: formId,
          Name: publishedVersion.Name,
          Fields: publishedVersion.Fields,
          Stage__c: publishedVersion.Stage__c,
        },
      }),
    };
  } catch (error) {
    console.error('Error fetching form:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message || 'Failed to fetch form' }),
    };
  }
};