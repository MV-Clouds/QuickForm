import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand
} from '@aws-sdk/client-dynamodb';

import jwt from 'jsonwebtoken';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

const TOKEN_TABLE_NAME = 'SalesforceAuthTokens';
const METADATA_TABLE_NAME = 'SalesforceData';

export const handler = async (event) => {
  const { sessionId, userId, username, audience } = event;

  if (!userId || !username) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing userId or username' }),
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    };
  }

  try {
    const currentTime = new Date().toISOString();
    let access_token, refresh_token, instance_url, cleanedInstanceUrl;

    // 1. Try to reuse existing access token
    const existingTokenRes = await dynamoClient.send(
      new GetItemCommand({
        TableName: TOKEN_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );

    if (existingTokenRes.Item) {
      const item = existingTokenRes.Item;
      access_token = item.AccessToken?.S;
      refresh_token = item.RefreshToken?.S || '';
      cleanedInstanceUrl = item.InstanceUrl?.S;
      instance_url = `https://${cleanedInstanceUrl}`;
    }

    // 2. Validate token
    if (access_token && instance_url) {
      try {
        const testRes = await fetch(`${instance_url}/services/data/v60.0/`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!testRes.ok) {
          console.log('Access token invalid, proceeding to generate new one');
          access_token = null;
        } else {
          console.log('Access token is valid, reusing');
        }
      } catch (err) {
        console.warn('Token validation request failed:', err.message);
        access_token = null;
      }
    }

    // 3. If token invalid or not found, generate new access token using JWT
    if (!access_token) {
      const secret = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: 'SalesforceConnectedApp' })
      );
      const { client_id, client_secret, private_key } = JSON.parse(secret.SecretString);

      const payload = {
        iss: client_id,
        sub: username,
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 60 * 5,
      };

      const assertion = jwt.sign(payload, private_key, { algorithm: 'RS256' });

      const params = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
        client_id,
        client_secret,
      });

      const tokenRes = await fetch(`${audience}/services/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.error_description || 'Token exchange failed');
      }

      const tokenData = await tokenRes.json();
      access_token = tokenData.access_token;
      refresh_token = tokenData.refresh_token || '';
      instance_url = tokenData.instance_url;
      cleanedInstanceUrl = instance_url.replace(/https?:\/\//, '');

      // 4. Upsert new token to DynamoDB
      const tokenItem = {
        UserId: { S: userId },
        InstanceUrl: { S: cleanedInstanceUrl },
        RefreshToken: { S: refresh_token },
        AccessToken: { S: access_token },
        CreatedAt: { S: currentTime },
        UpdatedAt: { S: currentTime },
      };

      if (existingTokenRes.Items?.length > 0) {
        tokenItem.CreatedAt = existingTokenRes.Items[0].CreatedAt || { S: currentTime };
      }

      await dynamoClient.send(
        new PutItemCommand({
          TableName: TOKEN_TABLE_NAME,
          Item: tokenItem,
        })
      );
    }

    // 5. Fetch Salesforce objects
    const objectsRes = await fetch(`${instance_url}/services/data/v60.0/sobjects/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!objectsRes.ok) {
      const errorData = await objectsRes.json();
      throw new Error(errorData.message || 'Failed to fetch objects');
    }

    const objectsData = await objectsRes.json();
    const rawObjects = objectsData.sobjects;

    const metadata = rawObjects
      .filter(obj => {
        const isCustom = obj.name.endsWith('__c');
        const isStandard = !obj.name.endsWith('__c') && obj.queryable && obj.updateable;
        const isMetadataComponent = obj.custom === false &&
          (obj.name.startsWith('Apex') ||
            obj.name.endsWith('Definition') ||
            obj.name.endsWith('Info') ||
            obj.name.includes('Settings') ||
            obj.name.includes('Permission') ||
            obj.name.includes('SetupEntity') ||
            obj.name.includes('Package') ||
            obj.name.includes('Profile') ||
            obj.name.includes('EmailTemplate') ||
            obj.name.includes('Report') ||
            obj.name.includes('Dashboard'));

        const excludedPatterns = [
          'Share', 'History', 'Feed', 'ChangeEvent', 'Tag', 'Vote', 'Login',
          'EventRelation', 'PageLayout', 'FieldPermissions', 'UserRole',
          'SetupEntityAccess', 'PermissionSetAssignment', 'UserLicense',
          'ObjectPermissions', 'Topic', 'StreamingChannel', 'UserPreference',
        ];

        const isExcluded = excludedPatterns.some(pattern => obj.name.includes(pattern));
        return (isCustom || isStandard) && !isExcluded && !isMetadataComponent;
      })
      .map(obj => ({
        name: obj.name,
        label: obj.label,
      }));

    // 6. Fetch Form__c records
    let formRecords = [];
    const query = `SELECT Id, Name, Active_Version__c,
                     (SELECT Id, Name, Form__c, Description__c, Object_Info__c, Version__c, Publish_Link__c, Stage__c, Submission_Count__c,
                       (SELECT Id, Name, Field_Type__c, Page_Number__c, Order_Number__c, Properties__c, Unique_Key__c 
                        FROM Form_Fields__r),
                        (SELECT Id, Condition_Type__c, Condition_Data__c 
                          FROM Form_Condition__r)
                      FROM Form_Versions__r ORDER BY Version__c DESC)
                     FROM Form__c`;
    let nextUrl = `${instance_url}/services/data/v60.0/query?q=${encodeURIComponent(query)}`;

    while (nextUrl) {
      const queryRes = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!queryRes.ok) {
        const errorData = await queryRes.json();
        throw new Error(errorData[0]?.message || 'Failed to fetch Form__c records');
      }

      const queryData = await queryRes.json();

      const batch = (queryData.records || []).map(record => ({
        Id: record.Id,
        Name: record.Name,
        Active_Version__c: record.Active_Version__c || null,
        FormVersions: (record.Form_Versions__r?.records || []).map(version => ({
          Id: version.Id,
          FormId: version.Form__c,
          Name: version.Name,
          Object_Info__c: version.Object_Info__c || null,
          Description__c: version.Description__c || null,
          Version__c: version.Version__c || '1',
          Publish_Link__c: version.Publish_Link__c || null,
          Stage__c: version.Stage__c || 'Draft',
          Submission_Count__c: version.Submission_Count__c || 0,
          Fields: (version.Form_Fields__r?.records || []).map(field => ({
            Id: field.Id,
            Name: field.Name,
            Field_Type__c: field.Field_Type__c,
            Page_Number__c: field.Page_Number__c,
            Order_Number__c: field.Order_Number__c,
            Properties__c: field.Properties__c,
            Unique_Key__c: field.Unique_Key__c,
          })),
          Conditions: (version.Form_Conditions__r?.records || []).map(condition => ({
            Id: condition.Id,
            Condition_Type__c: condition.Condition_Type__c,
            Condition_Data__c: condition.Condition_Data__c,
          })),
          Source: 'Form_Version__c',
        })),
        Source: 'Form__c',
      }));

      formRecords.push(...batch);

      // Prepare for next batch if available
      nextUrl = queryData.nextRecordsUrl
        ? `${instance_url}${queryData.nextRecordsUrl}`
        : null;
    }


    // 7. Check existing metadata
    const existingMetadataRes = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );

    let existingMetadata = null;
    let existingFormRecords = [];

    if (existingMetadataRes.Item?.Metadata?.S) {
      try {
        existingMetadata = JSON.parse(existingMetadataRes.Item.Metadata.S);
      } catch (e) {
        console.warn('Failed to parse existing metadata');
      }
    }

    if (existingMetadataRes.Item?.FormRecords?.S) {
      try {
        existingFormRecords = JSON.parse(existingMetadataRes.Item.FormRecords.S);
      } catch (e) {
        console.warn('Failed to parse existing FormRecords:', e);
      }
    }

    const isSameMetadata =
      existingMetadata && JSON.stringify(existingMetadata) === JSON.stringify(metadata);
    const isSameFormRecords =
      JSON.stringify(existingFormRecords) === JSON.stringify(formRecords);

    // 8. Update metadata in DynamoDB if changed
    if (!isSameMetadata || !isSameFormRecords) {
      await dynamoClient.send(
        new PutItemCommand({
          TableName: METADATA_TABLE_NAME,
          Item: {
            UserId: { S: userId },
            InstanceUrl: { S: cleanedInstanceUrl },
            Metadata: { S: JSON.stringify(metadata) },
            FormRecords: { S: JSON.stringify(formRecords) },
            CreatedAt: {
              S: existingMetadataRes.Item?.CreatedAt?.S || currentTime,
            },
            UpdatedAt: { S: currentTime },
          },
        })
      );
      console.log('Metadata updated in DynamoDB');
    } else {
      console.log('Metadata unchanged, skipping DynamoDB update');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        userId,
        instance_url,
        cleanedInstanceUrl,
        updated: !isSameMetadata,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  } catch (err) {
    console.error('Token Exchange Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};
