import { DynamoDBClient, QueryCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

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

  const { userId, instanceUrl, formId, accessToken  } = body;
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
    // Fetch metadata from DynamoDB for the current user and instance URL
    let allItems = [];
    let ExclusiveStartKey = undefined;

    do {
      const queryResponse = await dynamoClient.send(
        new QueryCommand({
          TableName: METADATA_TABLE_NAME,
          KeyConditionExpression: 'UserId = :userId',
          ExpressionAttributeValues: {
            ':userId': { S: userId },
          },
          ExclusiveStartKey,
        })
      );

      if (queryResponse.Items) {
        allItems.push(...queryResponse.Items);
      }

      ExclusiveStartKey = queryResponse.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    if (allItems.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Metadata not found for this user and instance' }),
      };
    }

    const metadataItem = allItems.find(item => item.ChunkIndex?.S === 'Metadata');
    if(accessToken){
      const cleanedInstanceUrl = instanceUrl.replace(/^https?:\/\//, '');
      const objectsRes = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
        const now = new Date().toISOString();

        await dynamoClient.send(new PutItemCommand({
          TableName: METADATA_TABLE_NAME,
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: 'Metadata' },
            InstanceUrl: { S: cleanedInstanceUrl },
            Metadata: { S: JSON.stringify(metadata) },
            CreatedAt: { S: metadataItem?.CreatedAt?.S || now },
            UpdatedAt: { S: now },
            UserProfile : { S: JSON.stringify(metadataItem?.UserProfile?.S) }
          }
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: true, metadata : JSON.stringify(metadata) }),
        };

    }
    const formRecordItems = allItems.filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'));

    let formRecords = null;
    if (formRecordItems.length > 0) {
      try {
        // Sort chunks by ChunkIndex and combine
        const sortedChunks = formRecordItems
        .sort((a, b) => {
          const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
          const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
          return aNum - bNum;
        })
        .map(item => item.FormRecords.S);
        const combinedFormRecords = sortedChunks.join('');
        formRecords = combinedFormRecords;
      } catch (e) {
        console.warn('Failed to process FormRecords chunks:', e.message, '\nStack trace:', e.stack);
        formRecords = null; // Return null if chunk processing fails, matching original behavior
      }
    }

    
    if (formId) {
      const formRecordsParsed = JSON.parse(formRecords);
      const matchedForm = formRecordsParsed.find(f => f.Id === formId);
      if (!matchedForm) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: `Form not found for ID: ${formId}` }),
        };
      }
      console.log(matchedForm.FormVersions);
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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          formVersion: {
            Id: publishedVersion.Id,
            Form__c: formId,
            Name: publishedVersion.Name,
            Fields: publishedVersion.Fields,
            Conditions: publishedVersion.Conditions,
            Stage__c: publishedVersion.Stage__c,
          },
        }),
      };
    }

    if (!metadataItem?.Metadata?.S) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Metadata not found for this user and instance' }),
      };
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        metadata: metadataItem.Metadata.S,
        FormRecords: formRecords,
        UserProfile : metadataItem.UserProfile?.S
      }),
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to fetch metadata' }),
    };
  }
};