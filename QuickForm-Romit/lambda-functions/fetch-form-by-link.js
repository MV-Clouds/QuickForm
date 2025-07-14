// fetch-form-by-link.js
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

    // Fetch metadata from DynamoDB
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


    // Parse FormRecords from chunks
    const formRecordItems = allItems.filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'));
    if (formRecordItems.length === 0) {
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
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Incomplete form metadata chunks' }),
          };
        }
      }
      const combinedFormRecords = sortedChunks.map(item => item.FormRecords.S).join('');
      formRecords = JSON.parse(combinedFormRecords);
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