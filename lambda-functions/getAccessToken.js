import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

const TOKEN_TABLE_NAME = 'SalesforceAuthTokens';

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

  const { userId } = body;

  if (!userId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Missing userId' }),
    };
  }

  try {
    // Fetch token data from DynamoDB
    const tokenResponse = await dynamoClient.send(
      new GetItemCommand({
        TableName: TOKEN_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );
      
    const item = tokenResponse.Item;
    if (!item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Token not found for this user and instance' }),
      };
    }

    let access_token = item.AccessToken.S;
    const refresh_token = item.RefreshToken?.S || '';
    const instanceUrl = item.InstanceUrl.S;
    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');

    // Validate the access token
    const isValid = await validateAccessToken(access_token, cleanedInstanceUrl);

    if (!isValid) {
      // Access token is expired or invalid, attempt to refresh it
      if (!refresh_token) {
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Refresh token not available' }),
        };
      }

      // Fetch Salesforce client credentials from Secrets Manager
      const secret = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: 'SalesforceConnectedApp' })
      );
      const { client_id, client_secret } = JSON.parse(secret.SecretString)

      if (!client_id || !client_secret) {
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Salesforce credentials not found in Secrets Manager' }),
        };
      }

      const currentTime = new Date().toISOString();
      // Use refresh token to get a new access token
      const refreshResponse = await fetch(`https://${cleanedInstanceUrl}/services/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: client_id,
          client_secret: client_secret,
          refresh_token: refresh_token,
        }).toString(),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json();
        console.error('Error refreshing token:', errorData);
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Failed to refresh access token', details: errorData }),
        };
      }

      const refreshData = await refreshResponse.json();
      access_token = refreshData.access_token;

      // Update DynamoDB with the new access token
      await dynamoClient.send(
        new PutItemCommand({
          TableName: TOKEN_TABLE_NAME,
          Item: {
            UserId: { S: userId },
            InstanceUrl: { S: cleanedInstanceUrl },
            AccessToken: { S: access_token },
            RefreshToken: { S: refresh_token },
            CreatedAt: item.CreatedAt || { S: currentTime },
            UpdatedAt: { S: currentTime },
          },
        })
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        access_token,
        instanceUrl: instanceUrl,
      }),
    };
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to fetch access token' }),
    };
  }
};

// Validate the access token by making a test API call
const validateAccessToken = async (access_token, instanceUrl) => {
  try {
    const response = await fetch(`https://${instanceUrl}/services/data/v60.0/limits`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Token validation failed:', error, instanceUrl);
    return false;
  }
};