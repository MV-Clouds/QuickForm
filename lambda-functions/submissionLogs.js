import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const LOG_TABLE_NAME = 'SF-PermanentStorage';

export const handler = async (event) => {
  try {
    // Parse payload
    const body = JSON.parse(event.body || '{}');
    const {
      submissionId,
      tempSubmissionId,
      type,
      subType,
      userId,
      response
    } = body;

    const token = event.headers.Authorization?.split(' ')[1]; // Salesforce bearer token
console.log('body', body)
    if ((!submissionId && !tempSubmissionId) || !type || !response || !token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Missing required parameters: submissionId/tempSubmissionId, type, response, or Authorization token',
        }),
      };
    }

    // Step 1: Derive log details from response
    const logStatus = response.ok ? 'Success' : 'Failed';
    const logMessage = response.ok
      ? (response.message || 'Operation successful')
      : (response.error || 'Operation failed');
    const timestamp = new Date().toISOString();

    // Step 2: Fetch InstanceUrl from Metadata (DynamoDB)
    const queryResponse = await dynamoClient.send(
      new QueryCommand({
        TableName: 'SalesforceChunkData',
        KeyConditionExpression: 'UserId = :userId AND ChunkIndex = :chunkIndex',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':chunkIndex': { S: 'Metadata' },
        },
      })
    );

    const metadataItem = queryResponse.Items?.[0];
    if (!metadataItem || !metadataItem.InstanceUrl?.S) {
      throw new Error('InstanceUrl not found in Metadata');
    }

    const instanceUrl = metadataItem.InstanceUrl.S.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${instanceUrl}/services/data/v60.0`;

    // Step 3: Try Salesforce Log Creation
    const logResponse = await fetch(`${salesforceBaseUrl}/sobjects/Submission_Log__c`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Submission__c: submissionId || null,
        TempSubmissionId__c: tempSubmissionId || null,
        Type__c: type,
        SubType__c: subType || null,
        Status__c: logStatus,
        Message__c: logMessage,
        Timestamp__c: timestamp,
      }),
    });

    console.log('Salesforce Log API Response:', logResponse);

    if (!logResponse.ok) {
      const errorData = await logResponse.json();
      console.log('Salesforce Log API Error:', errorData);

      await saveLogToDynamoDB({
        userId,
        submissionId,
        tempSubmissionId,
        type,
        subType,
        recordType: 'Submission Log',
        status: logStatus,
        message: logMessage,
        timestamp
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          storedIn: 'DynamoDB',
          error: errorData[0]?.message || 'Failed to create log in Salesforce',
        }),
      };
    }

    const logResult = await logResponse.json();

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        storedIn: 'Salesforce',
        logId: logResult.id,
      }),
    };
  } catch (error) {
    console.log('Log Creation Error:', error);

    await saveLogToDynamoDB(JSON.parse(event.body || '{}'));

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: error.message || 'Unexpected error while creating log',
      }),
    };
  }
};

// --- Helper: Save Log to DynamoDB ---
async function saveLogToDynamoDB(log) {
  const recordType = log.recordType || 'Submission Log';
  try {
    const item = {
      UserId: { S: log.userId || 'UNKNOWN_USER' },
      SK: { S: `LOG#${log.timestamp}#${log.recordType}` },
      RecordId: { S: log.submissionId || log.tempSubmissionId },
      RecordType: { S: recordType },
      Type: { S: log.type },
      SubType: { S: log.subType || 'NA' },
      Status: { S: log.status },
      Message: { S: log.message || '' },
      Timestamp: { S: log.timestamp },
      RetryStatus: { S: 'Pending' },
      RetryAttempts: { N: '0' },
    };

    await dynamoClient.send(
      new PutItemCommand({
        TableName: LOG_TABLE_NAME,
        Item: item,
      })
    );

    console.log('Log saved to DynamoDB fallback:', item);
  } catch (err) {
    console.log('Failed to save log to DynamoDB fallback:', err);
  }
}
