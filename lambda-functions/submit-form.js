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

import { DynamoDBClient,PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const lambdaClient = new LambdaClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';
const LOGGING_LAMBDA_NAME = 'submissionLogs';
const LOG_TABLE_NAME = 'SF-PermanentStorage';

export const handler = async (event) => {
  let submissionId = null;
  let tempSubmissionId = null;
  try {
    // Extract data from the Lambda event
    const body = JSON.parse(event.body || '{}');
    const { userId, submissionData } = body;
    const token = event.headers.Authorization?.split(' ')[1]; // Extract Bearer token

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
    const queryResponse = await dynamoClient.send(
      new QueryCommand({
        TableName: METADATA_TABLE_NAME,
        KeyConditionExpression: 'UserId = :userId AND ChunkIndex = :chunkIndex',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':chunkIndex': { S: 'Metadata' },
        },
      })
    );

    const metadataItem = queryResponse.Items?.[0];
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
    const submissionResponse = await fetch(`${salesforceBaseUrl}/sobjects/Submission__c`, {
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
      const errorData = await submissionResponse.json();
      const tempSubmissionId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Store full failed submission in the same table with RecordType = 'Submission Data'
      await dynamoClient.send(new PutItemCommand({
        TableName: LOG_TABLE_NAME,
        Item: {
          UserId: { S: userId },
          SK: { S: `${formId}#${tempSubmissionId}` },
          RecordId: { S: tempSubmissionId },
          RecordType: { S: 'Submission Data' }, 
          FormId: { S: formId },
          FormVersionId: { S: formVersionId },
          SubmissionData: { S: JSON.stringify(data) },
          Timestamp: { S: timestamp },
          Status: { S: 'Failed' },
          Message: { S: errorData[0]?.message || 'Failed to create Submission__c record' },
          RetryStatus: { S: 'Pending' },
          RetryAttempts: { N: '0' },
        },
      }));

      // Log failure asynchronously
      await logEvent({
        submissionId: null,
        tempSubmissionId: tempSubmissionId,
        type: 'Submit',
        subType: '',
        userId,
        response: {
          ok: false,
          error: errorData[0]?.message || 'Failed to create Submission__c record'
        }
      }, token);

       // Return tempSubmissionId for failed case
       return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          message: 'Failed to create submission',
          tempSubmissionId: tempSubmissionId,
          error: errorData[0]?.message || 'Failed to create Submission__c record'
        }),
      };
    }

    const submissionDataResponse = await submissionResponse.json();
    submissionId = submissionDataResponse.id;

    // Log success asynchronously
    await logEvent({
      submissionId,
      tempSubmissionId: null,
      type: 'Submit',
      subType: '',
      userId,
      response: {
        ok: true,
        message: 'Submission created successfully'
      }
    }, token);


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
    // Log error asynchronously if we have the required data
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        await logEvent({
          submissionId: null,
          tempSubmissionId: tempSubmissionId,
          type: 'Submit',
          subType: '',
          userId: body.userId,
          response: {
            ok: false,
            error: error.message || 'Failed to save submission'
          }
        }, event.headers?.Authorization?.split(' ')[1]);
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: error.message || 'Failed to save submission ',
      }),
    };
  }

  // Helper function to invoke the logging Lambda asynchronously
  async function logEvent(logData, token) {
    try {
      const params = {
        FunctionName: LOGGING_LAMBDA_NAME,
        InvocationType: 'Event', // Asynchronous invocation
        Payload: JSON.stringify({
          body: JSON.stringify(logData),
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      };

      await lambdaClient.send(new InvokeCommand(params));
      console.log('Log event triggered asynchronously');
    } catch (error) {
      console.error('Failed to invoke logging Lambda:', error);
    }
  }
};