// import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

// const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
// const METADATA_TABLE_NAME = 'SalesforceChunkData';

// export const handler = async (event) => {
//   try {
//     // Extract data from the Lambda event
//     const body = JSON.parse(event.body || '{}');
//     const { userId, submissionData } = body;
//     const token = event.headers.Authorization?.split(' ')[1]; // Extract Bearer token

//     // Validate required parameters
//     if (!userId || !submissionData || !token) {
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//         body: JSON.stringify({
//           error: 'Missing required parameters: userId, submissionData, or Authorization token',
//         }),
//       };
//     }

//     const { formId, formVersionId, data } = submissionData;
//     if (!formId || !formVersionId || !data) {
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//         body: JSON.stringify({
//           error: 'Missing required submission data: formId, formVersionId, or data',
//         }),
//       };
//     }

//     // Fetch InstanceUrl from Metadata in DynamoDB
//     const queryResponse = await dynamoClient.send(
//       new QueryCommand({
//         TableName: METADATA_TABLE_NAME,
//         KeyConditionExpression: 'UserId = :userId AND ChunkIndex = :chunkIndex',
//         ExpressionAttributeValues: {
//           ':userId': { S: userId },
//           ':chunkIndex': { S: 'Metadata' },
//         },
//       })
//     );

//     const metadataItem = queryResponse.Items?.[0];
//     if (!metadataItem || !metadataItem.InstanceUrl?.S) {
//       return {
//         statusCode: 404,
//         headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//         body: JSON.stringify({ error: 'InstanceUrl not found in Metadata' }),
//       };
//     }
//     const instanceUrl = metadataItem.InstanceUrl.S;
//     const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
//     const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

//     // Create Submission__c record
//     const submissionResponse = await fetch(`${salesforceBaseUrl}/sobjects/Submission__c`, {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${token}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         Form__c: formId,
//         Form_Version__c: formVersionId,
//         Submission_Data__c: JSON.stringify(data),
//       }),
//     });

//     if (!submissionResponse.ok) {
//       const errorData = await submissionResponse.json();
//       throw new Error(errorData[0]?.message || 'Failed to create Submission__c record');
//     }

//     const submissionDataResponse = await submissionResponse.json();
//     const submissionId = submissionDataResponse.id;

//     return {
//       statusCode: 201,
//       headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//       body: JSON.stringify({
//         success: true,
//         message: 'Submission saved successfully',
//         submissionId,
//       }),
//     };
//   } catch (error) {
//     console.error('Error saving submission:', error);
//     return {
//       statusCode: error.response?.status || 500,
//       headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//       body: JSON.stringify({
//         error: error.message || 'Failed to save submission ',
//       }),
//     };
//   }
// };

import { DynamoDBClient,PutItemCommand, QueryCommand  , BatchWriteItemCommand} from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';
const LOG_TABLE_NAME = 'SF-PermanentStorage';

export const handler = async (event) => {
  let submissionId = null;
  let tempSubmissionId = null;
  try {
    // Extract data from the Lambda event
    const body = JSON.parse(event.body || '{}');
    const { userId, submissionData } = body;
    let token = event.headers.Authorization?.split(' ')[1]; // Extract Bearer token
    const fetchNewAccessToken = async (userId) => {
      const response = await fetch('https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/getAccessToken/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('Failed to fetch new access token');
      const data = await response.json();
      return data.access_token;
    };
    let tokenRefreshed = false;

    // Validate required parameters
    if (!userId || !submissionData || !token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Missing required parameters: userId, submissionData, or Authorization token',
        }),
      };
    }

    const { formId, formVersionId, data } = submissionData;
    if (!formId || !formVersionId || !data) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Missing required submission data: formId, formVersionId, or data',
        }),
      };
    }

    // Fetch InstanceUrl from Metadata in DynamoDB
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
    let formRecords = [];
    let existingMetadata = {};
    let createdAt = new Date().toISOString();

    const metadataItem = allItems.find(item => item.ChunkIndex?.S === 'Metadata');
    const formRecordItems = allItems.filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'));
    if (formRecordItems.length > 0) {
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
            formRecords = [];
            break;
          }
        }
        const combinedFormRecords = sortedChunks.map(item => item.FormRecords.S).join('');
        formRecords = JSON.parse(combinedFormRecords);
      } catch (e) {
        console.error('Failed to parse FormRecords chunks:', e);
        console.error('Raw chunk data:', formRecordItems.map(item => item.FormRecords.S));
        formRecords = [];
      }
    }
    let updatedFormRecords = [...formRecords]
    updatedFormRecords.map((record) => {
      if (record.Id === formId) {
        record.Total_Submission_Count__c += 1;
        record.FormVersions.map((version) => {
          if (version.Id === formVersionId) {
            version.Submission_Count__c += 1;
          }
        });
      }
    });
    const formRecordsString = JSON.stringify(updatedFormRecords);
    const CHUNK_SIZE = 370000;
    const chunks = [];
    for (let i = 0; i < formRecordsString.length; i += CHUNK_SIZE) {
      chunks.push(formRecordsString.slice(i, i + CHUNK_SIZE));
    }
    const oldIndexes = formRecordItems.map(i => i.ChunkIndex.S);
    const newIndexes = chunks.map((_, idx) => `FormRecords_${idx}`);

    const toDeleteChunk = oldIndexes.filter(i => !newIndexes.includes(i));
    for (const index of toDeleteChunk) {
      await dynamoClient.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [METADATA_TABLE_NAME]: [
              {
                DeleteRequest: {
                  Key: {
                    UserId: { S: userId },
                    ChunkIndex: { S: index },
                  },
                },
              },
            ],
          },
        })
      );
    }
    const currentTime = new Date().toISOString();
    const writeRequests = [
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

    if (!metadataItem || !metadataItem.InstanceUrl?.S) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'InstanceUrl not found in Metadata' }),
      };
    }
    const instanceUrl = metadataItem.InstanceUrl.S;
    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

    // Create Submission__c record
    let submissionResponse = await fetch(`${salesforceBaseUrl}/sobjects/Submission__c`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Form__c: formId,
        Form_Version__c: formVersionId,
        Submission_Data__c: JSON.stringify(data),
      }),
    });

    if (!submissionResponse.ok) {
      if (submissionResponse.status === 401 && !tokenRefreshed) {
        token = await fetchNewAccessToken(userId);
        tokenRefreshed = true;
        submissionResponse = await fetch(`${salesforceBaseUrl}/sobjects/Submission__c`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Form__c: formId,
            Form_Version__c: formVersionId,
            Submission_Data__c: JSON.stringify(data),
          }),
        });
      }
      if (!submissionResponse.ok) {
        const errorData = await submissionResponse.json();
        const tempSubmissionId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const errorMessage = errorData[0]?.message || 'Failed to create Submission__c record';

        // 1. Store failed submission data directly
        await dynamoClient.send(new PutItemCommand({
          TableName: LOG_TABLE_NAME,
          Item: {
            UserId: { S: userId },
            SK: { S: `${formId}#${tempSubmissionId}` },
            RecordId: { S: tempSubmissionId },
            RecordType: { S: 'Submission Data' },
            FormId: { S: formId },
            FormVersionId: { S: formVersionId },
            Data: { S: JSON.stringify(data) },
            Timestamp: { S: timestamp },
            Status: { S: 'Failed' },
            Message: { S: errorMessage },
            RetryStatus: { S: 'Pending' },
            RetryAttempts: { N: '0' },
          },
        }));

        // 2. Create separate log entry for the failure
        await logEventDirect({
          userId,
          submissionId: null,
          tempSubmissionId: tempSubmissionId,
          type: 'Submit',
          subType: '',
          status: 'Failed',
          message: errorMessage,
          formId,
          formVersionId,
          recordType: 'Submission Data' ,
        });

        // Return tempSubmissionId for failed case
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: false,
            message: 'Failed to create submission',
            tempSubmissionId: tempSubmissionId,
            error: errorMessage
          }),
        };
      }
    }

    const submissionDataResponse = await submissionResponse.json();
    submissionId = submissionDataResponse.id;

    // Log success asynchronously
    await logEventDirect({
      userId,
      submissionId: submissionId,
      tempSubmissionId: null,
      type: 'Submit',
      subType: '',
      status: 'Success',
      message: 'Submission created successfully',
      formId,
      formVersionId,
      recordType: 'Submission Log' // Regular log type for successful operations
    });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Submission saved successfully',
        submissionId,
      }),
    };
  } catch (error) {
    console.error('Error saving submission:', error);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: error.message || 'Failed to save submission ',
      }),
    };
  }

  // Helper function to invoke the logging  asynchronously
  async function logEventDirect(log) {
    try {
      const timestamp = new Date().toISOString();
      const recordId = log.submissionId || log.tempSubmissionId;
      const recordType = log.recordType || (log.submissionId ? 'Submission Log' : 'Temp Submission Log');
      
      // Base item structure
      const item = {
        UserId: { S: log.userId || '' },
        SK: { S: `LOG#${recordId}#${recordType}` },
        SubmissionId: { S: recordId },
        RecordType: { S: recordType },
        Type: { S: log.type },
        SubType: { S: log.subType || 'NA' },
        Status: { S: log.status },
        Message: { S: log.message || '' },
        Timestamp: { S: timestamp },
        FormId: { S: log.formId || '' },
        FormVersionId: { S: log.formVersionId || '' },
        RetryStatus: { S: 'Pending' },
        RetryAttempts: { N: '0' },
      };

      // Add submission data only for failed submissions (Submission Data record type)
      if (recordType === 'Submission Data' && log.submissionData) {
        item.SubmissionData = { S: JSON.stringify(log.submissionData) };
        // For failed submissions, also use a different SK pattern for easier querying
        item.SK = { S: `${log.formId}#${recordId}` };
      }

      await dynamoClient.send(new PutItemCommand({
        TableName: LOG_TABLE_NAME,
        Item: item
      }));
      
      console.log('Event stored in DynamoDB:', recordType);
    } catch (error) {
      console.error('Failed to store event in DynamoDB:', error);
    }
  }
};