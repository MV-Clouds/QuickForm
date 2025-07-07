import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand
} from '@aws-sdk/client-dynamodb';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

const TOKEN_TABLE_NAME = 'SalesforceAuthTokens';
const METADATA_TABLE_NAME = 'SalesforceData';

export const handler = async (event) => {
  // Extract query parameters from the Lambda event
  const queryStringParameters = event.queryStringParameters || {};
  const access_token = queryStringParameters.access_token;
  const instance_url = queryStringParameters.instance_url;
  const refresh_token = queryStringParameters.refresh_token;
  const userId = queryStringParameters.userId;
  const org = queryStringParameters.org || 'production';

  // Validate required parameters
  if (!access_token || !instance_url || !userId || !refresh_token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required parameters: access_token, instance_url, or userId' }),
    };
  }

  try {
    // Clean the instance URL (remove protocol)
    const cleanedInstanceUrl = instance_url.replace(/https?:\/\//, '');
    const currentTime = new Date().toISOString();

    // 1. Upsert token to DynamoDB (similar to the iframe flow)
    const tokenItem = {
      UserId: { S: userId },
      InstanceUrl: { S: cleanedInstanceUrl },
      RefreshToken: { S: refresh_token || '' },
      AccessToken: { S: access_token },
      CreatedAt: { S: currentTime },
      UpdatedAt: { S: currentTime },
    };
    const queryResponse = await dynamoClient.send(
      new GetItemCommand({
        TableName: TOKEN_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );
    
    if (queryResponse.Item) {
      tokenItem.CreatedAt = queryResponse.Item.CreatedAt || { S : currentTime};
    }
    
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TOKEN_TABLE_NAME,
        Item: tokenItem,
      })
    );

    // 2. Fetch Salesforce objects
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

    // 3. Filter relevant objects (same logic as the iframe flow)
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
          'Share',
          'History',
          'Feed',
          'ChangeEvent',
          'Tag',
          'Vote',
          'Login',
          'EventRelation',
          'PageLayout',
          'FieldPermissions',
          'UserRole',
          'SetupEntityAccess',
          'PermissionSetAssignment',
          'UserLicense',
          'ObjectPermissions',
          'Topic',
          'StreamingChannel',
          'UserPreference',
        ];

        const isExcluded = excludedPatterns.some(pattern => obj.name.includes(pattern));
        return (isCustom || isStandard) && !isExcluded && !isMetadataComponent;
      })
      .map(obj => ({
        name: obj.name,
        label: obj.label,
      }));

    // 3. Fetch Form__c records
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
          Conditions: (version.Form_Condition__r?.records || []).map(condition => ({
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


    // 4. Check existing metadata from DynamoDB
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
        console.warn('Failed to parse existing metadata:', e);
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
      existingMetadata &&
      JSON.stringify(existingMetadata) === JSON.stringify(metadata);

    const isSameFormRecords =
      JSON.stringify(existingFormRecords) === JSON.stringify(formRecords);
      
    // 5. Only write metadata if it has changed
    if (!isSameMetadata || !isSameFormRecords) {
      const itemToWrite = {
        UserId: { S: userId },
        InstanceUrl: { S: cleanedInstanceUrl },
        Metadata: { S: JSON.stringify(metadata) },
        FormRecords: { S: JSON.stringify(formRecords) },
        CreatedAt: {
          S: existingMetadataRes.Item?.CreatedAt?.S || currentTime,
        },
        UpdatedAt: { S: currentTime },
      };
      
      console.log('Writing this item to DynamoDB:', JSON.stringify(itemToWrite, null, 2));
      await dynamoClient.send(
        new PutItemCommand({
          TableName: METADATA_TABLE_NAME,
          Item: itemToWrite,
        })
      );
      console.log('Metadata updated in DynamoDB');
    } else {
      console.log('Metadata unchanged, skipping DynamoDB update');
    }
    
    // 6. Return HTML to notify the parent window and close the popup
    const htmlResponse = `
    <html>
      <head><title>Authenticated</title></head>
      <body>
        <script>
          // Notify parent window of success and send the token
          window.opener?.postMessage(
            { type: 'login_success', userId: '${userId}', instanceUrl: '${instance_url}' },
            'https://d2bri1qui9cr5s.cloudfront.net'
          );
          window.close();
        </script>
      </body>
    </html>
    `;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: htmlResponse,
    };
  } catch (err) {
    const stackTrace = (err && err.stack) || new Error().stack;
    console.error('Error in storeMetadata:', err.message, '\nStack trace:', stackTrace);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};