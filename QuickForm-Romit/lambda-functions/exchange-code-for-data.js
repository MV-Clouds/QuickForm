import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

const TOKEN_TABLE_NAME = 'SalesforceAuthTokens';
const METADATA_TABLE_NAME = 'SalesforceChunkData';

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
    const fetchSalesforceData = async (accessToken, instanceUrl, query) => {
      let allRecords = [];
      let nextUrl = `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(query)}`;
      const queryStart = Date.now();
    
      while (nextUrl) {
        const queryRes = await fetch(nextUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
    
        if (!queryRes.ok) {
          const errorData = await queryRes.json();
          throw new Error(errorData[0]?.message || `Failed to fetch records for query: ${query}`);
        }
    
        const queryData = await queryRes.json();
        allRecords.push(...(queryData.records || []));
    
        nextUrl = queryData.nextRecordsUrl
          ? `${instanceUrl}${queryData.nextRecordsUrl}`
          : null;
      }
    
      return allRecords;
    };

    const [forms, formVersions, formFields, formConditions] = await Promise.all([
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Name, Active_Version__c, Publish_Link__c FROM Form__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Name, Form__c, Description__c, Object_Info__c, Version__c, Stage__c, Submission_Count__c FROM Form_Version__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Name, Form_Version__c, Field_Type__c, Page_Number__c, Order_Number__c, Properties__c, Unique_Key__c FROM Form_Field__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Form_Version__c, Condition_Type__c, Condition_Data__c FROM Form_Condition__c'
      ),
    ]);
    const formRecords = forms.map(form => ({
      Id: form.Id,
      Name: form.Name,
      Active_Version__c: form.Active_Version__c || null,
      Source: 'Form__c',
      FormVersions: formVersions
        .filter(version => version.Form__c === form.Id)
        .map(version => ({
          Id: version.Id,
          FormId: version.Form__c,
          Name: version.Name,
          Object_Info__c: version.Object_Info__c || null,
          Description__c: version.Description__c || null,
          Version__c: version.Version__c || '1',
          Publish_Link__c: version.Publish_Link__c || null,
          Stage__c: version.Stage__c || 'Draft',
          Submission_Count__c: version.Submission_Count__c || 0,
          Source: 'Form_Version__c',
          Fields: formFields
            .filter(field => field.Form_Version__c === version.Id)
            .map(field => ({
              Id: field.Id,
              Name: field.Name,
              Field_Type__c: field.Field_Type__c,
              Page_Number__c: field.Page_Number__c,
              Order_Number__c: field.Order_Number__c,
              Properties__c: field.Properties__c,
              Unique_Key__c: field.Unique_Key__c,
            })),
          Conditions: formConditions
            .filter(condition => condition.Form_Version__c === version.Id)
            .flatMap(condition => {
              try {
                return JSON.parse(condition.Condition_Data__c || '[]').map(cond => ({
                  Id: cond.Id,
                  type: cond.type,
                  ...(cond.type === 'dependent'
                    ? {
                        ifField: cond.ifField,
                        value: cond.value || null,
                        dependentField: cond.dependentField,
                        dependentValues: cond.dependentValues || [],
                      }
                    : {
                        conditions: cond.conditions?.map(c => ({
                          ifField: c.ifField,
                          operator: c.operator || 'equals',
                          value: c.value || null,
                        })) || [],
                        logic: cond.logic || 'AND',
                        ...(cond.type === 'show_hide'
                          ? { thenAction: cond.thenAction, thenFields: cond.thenFields || [] }
                          : cond.type === 'skip_hide_page'
                          ? { thenAction: cond.thenAction, sourcePage: cond.sourcePage, targetPage: cond.targetPage }
                          : {
                              thenAction: cond.thenAction,
                              thenFields: cond.thenFields || [],
                              ...(cond.thenAction === 'set mask' ? { maskPattern: cond.maskPattern } : {}),
                              ...(cond.thenAction === 'unmask' ? { maskPattern: null } : {}),
                            }),
                      }),
                }));
              } catch (e) {
                console.warn(`Failed to parse Condition_Data__c for condition ${condition.Id}:`, e);
                return [];
              }
            }),
        }))
        .sort((a, b) => (b.Version__c || '1').localeCompare(a.Version__c || '1')), // Sort by Version__c DESC
    }));

  const queryResponseData = await dynamoClient.send(
    new QueryCommand({
      TableName: METADATA_TABLE_NAME,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
      },
    })
  );
  
    const formRecordsString = JSON.stringify(formRecords);
    const CHUNK_SIZE = 370000;
    const chunks = [];
    for (let i = 0; i < formRecordsString.length; i += CHUNK_SIZE) {
      chunks.push(formRecordsString.slice(i, i + CHUNK_SIZE));
    }

    const writeRequests = [
      {
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: 'Metadata' },
            InstanceUrl: { S: cleanedInstanceUrl },
            Metadata: { S: JSON.stringify(metadata) },
            CreatedAt: { S: queryResponseData.Items?.find(item => item.ChunkIndex?.S === 'Metadata')?.CreatedAt?.S || currentTime },
            UpdatedAt: { S: currentTime },
          },
        },
      },
      ...chunks.map((chunk, index) => ({
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: `FormRecords_${index}` },
            FormRecords: { S: chunk },
            CreatedAt: { S: currentTime },
            UpdatedAt: { S: currentTime },
          },
        },
      })),
    ];

    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [METADATA_TABLE_NAME]: writeRequests,
        },
      })
    )
    
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