import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  BatchWriteItemCommand
} from '@aws-sdk/client-dynamodb';

import jwt from 'jsonwebtoken';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

const TOKEN_TABLE_NAME = 'SalesforceAuthTokens';
const METADATA_TABLE_NAME = 'SalesforceChunkData';

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
    
      console.log(`Time to fetch query "${query}": ${Date.now() - queryStart} ms`);
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

    // 7. Check existing metadata
    const formRecordsString = JSON.stringify(formRecords);
    console.log('Form record string length ',formRecordsString.length);
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
    );

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
