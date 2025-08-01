import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

/**
 * Helper to make HTTP requests to Salesforce using fetch.
 * @param {string} url - Full URL for the HTTPS request.
 * @param {Object} options - fetch options object.
 * @returns {Promise<Object>} - Parsed JSON response.
 */
const salesforceRequest = async (url, options) => {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';

  let responseBody;
  if (contentType.includes('application/json')) {
    responseBody = await res.json();
  } else {
    responseBody = await res.text();
  }

  if (!res.ok) {
    throw { statusCode: res.status, body: responseBody };
  }
  const response = { success: true, body: responseBody , status : res.status}
  return response;
};

export const handler = async (event) => {
  try {
    const { Fieldsetobject, instanceUrl, token, userId } = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    console.log(`[${event.httpMethod}] Salesforce Fieldset__c ${event.httpMethod} operation initiated`, event.body);
    console.log(`[${event.httpMethod}] Salesforce Fieldset__c ${event.httpMethod} operation initiated`, Fieldsetobject);
    console.log(`[${event.httpMethod}] Salesforce Fieldset__c ${event.httpMethod} operation initiated`, instanceUrl);
    console.log(userId, 'userId')
    const httpMethod = event.httpMethod.toUpperCase();

    if (!Fieldsetobject || !instanceUrl || !token) {
      console.error('Missing required parameters');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing Fieldsetobject, instanceUrl, or token' }),
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      };
    }
    const parsedFieldset = typeof Fieldsetobject === 'string' ? JSON.parse(Fieldsetobject) : Fieldsetobject;
    let path = `/services/data/v60.0/sobjects/Fieldset__c`;

    if ((httpMethod === 'PATCH' || httpMethod === 'DELETE')) {
      if (!parsedFieldset.Id) {
        console.error(`[${httpMethod}] Missing Id for operation`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Missing Id in Fieldsetobject for ${httpMethod.toLowerCase()} operation` }),
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        };
      }
      path += `/${parsedFieldset.Id}`;
    }

    const url = `${instanceUrl.replace(/\/$/, '')}${path}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const fetchOptions = {
      method: httpMethod,
      headers,
    };

    if (httpMethod === 'POST') {
      fetchOptions.body = JSON.stringify(parsedFieldset);
    } else if (httpMethod === 'PATCH') {
      const { Id, ...payloadWithoutId } = parsedFieldset;
      fetchOptions.body = JSON.stringify(payloadWithoutId);
    }

    const response = await salesforceRequest(url, fetchOptions);

    console.log(`[${httpMethod}] Salesforce Fieldset__c ${httpMethod} operation successful`, response);

    if (response.success) {
      let createdAt = new Date().toISOString();
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
      let existingMetadata = {};

      const metadataItem = allItems.find(item => item.ChunkIndex?.S === 'Metadata');
      if (metadataItem?.Metadata?.S) {
        try {
          existingMetadata = JSON.parse(metadataItem.Metadata.S);
        } catch (e) {
          console.warn('Failed to parse Metadata:', e);
        }
        createdAt = metadataItem.CreatedAt?.S || createdAt;
      }
      let existingFieldset = [];

      if (metadataItem?.Fieldset?.S) {
        try {
          existingFieldset = JSON.parse(metadataItem.Fieldset.S);
        } catch (e) {
          console.warn('Failed to parse existing Fieldset array:', e);
        }
      }
      let updatedFieldset = [...existingFieldset];

      if (httpMethod === 'POST') {
        updatedFieldset.push(...(Array.isArray(parsedFieldset) ? parsedFieldset : [parsedFieldset]));
      } else if (httpMethod === 'PATCH') {
        updatedFieldset = updatedFieldset.map(item =>
          item.Id === parsedFieldset.Id ? { ...item, ...parsedFieldset } : item
        );
      } else if (httpMethod === 'DELETE') {
        updatedFieldset = updatedFieldset.filter(item => item.Id !== parsedFieldset.Id);
      }
      let writeRequests = [
        {
          PutRequest: {
            Item: {
              UserId: { S: userId },
              ChunkIndex: { S: 'Metadata' },
              InstanceUrl: { S: instanceUrl.replace(/https?:\/\//, '') },
              Metadata: { S: JSON.stringify(existingMetadata) },
              UserProfile: { S: metadataItem.UserProfile?.S || {} },
              Fieldset: { S: JSON.stringify(updatedFieldset) || {} },
              CreatedAt: { S: createdAt },
              UpdatedAt: { S: new Date().toISOString() },
            },
          },
        }
      ]
      await dynamoClient.send(
        new BatchWriteItemCommand({
          RequestItems: { [METADATA_TABLE_NAME]: writeRequests },
        })
      );
    }
    console.log(`[${httpMethod}] Salesforce Fieldset__c ${httpMethod} operation successful`, response);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ message: 'Success', response }),
    };
  } catch (error) {
    console.error(`[Error] Salesforce API error`, error);
    return {
      statusCode: error.statusCode || 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        message: 'Salesforce error',
        error: typeof error.body === 'string' ? error.body : JSON.stringify(error.body),
      }),
    };
  }
};
