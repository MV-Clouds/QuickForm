// fetch-form-by-link.js
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceMetadata';

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

  const { userId, instanceUrl, formVersionId, accessToken } = body;

  // Validate required parameters
  if (!userId || !instanceUrl || !formVersionId || !accessToken) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Missing userId, instanceUrl, formVersionId, or accessToken',
      }),
    };
  }

  try {
    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');

    // Fetch metadata from DynamoDB
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: {
          InstanceUrl: { S: cleanedInstanceUrl },
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
    let formVersion = null;
    let formId = null;
    for (const form of formRecords) {
      const version = form.FormVersions.find(
        (v) => v.Id === formVersionId && v.Stage__c === 'Publish'
      );
      if (version) {
        formVersion = version;
        formId = form.Id;
        break;
      }
    }

    if (!formVersion) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: `Published form version not found for ID: ${formVersionId}` }),
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
          Id: formVersion.Id,
          Form__c: formId,
          Name: formVersion.Name,
          Fields: formVersion.Fields,
          Stage__c: formVersion.Stage__c,
          Publish_Link__c: formVersion.Publish_Link__c,
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