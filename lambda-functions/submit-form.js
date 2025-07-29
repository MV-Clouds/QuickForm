import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
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
      throw new Error(errorData[0]?.message || 'Failed to create Submission__c record');
    }

    const submissionDataResponse = await submissionResponse.json();
    const submissionId = submissionDataResponse.id;

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
};