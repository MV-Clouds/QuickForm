// submit-form.js
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceData';

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

    const dataForInstance = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );

    const instanceUrl = dataForInstance.Item.InstanceUrl.S;

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
    console.log(`Created Submission__c record with Id: ${submissionId}`);

    // Fetch updated Submission_Count__c from Form_Version__c
    const formVersionQuery = `SELECT Submission_Count__c FROM Form_Version__c WHERE Id = '${formVersionId}'`;
    const formVersionQueryUrl = `${salesforceBaseUrl}/query?q=${encodeURIComponent(formVersionQuery)}`;
    const formVersionResponse = await fetch(formVersionQueryUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!formVersionResponse.ok) {
      const errorData = await formVersionResponse.json();
      throw new Error(errorData[0]?.message || 'Failed to query Form_Version__c');
    }

    const formVersionData = await formVersionResponse.json();
    const submissionCount = formVersionData.records[0]?.Submission_Count__c || 0;

    // Update DynamoDB to reflect Submission_Count__c
    const currentTime = new Date().toISOString();
    const metadataRes = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );

    let existingFormRecords = [];
    let existingMetadata = {};
    let createdAt = currentTime;

    if (metadataRes.Item) {
      if (metadataRes.Item.FormRecords?.S) {
        try {
          existingFormRecords = JSON.parse(metadataRes.Item.FormRecords.S);
        } catch (e) {
          console.warn('Failed to parse existing FormRecords:', e);
        }
      }
      if (metadataRes.Item.Metadata?.S) {
        try {
          existingMetadata = JSON.parse(metadataRes.Item.Metadata.S);
        } catch (e) {
          console.warn('Failed to parse existing Metadata:', e);
        }
      }
      createdAt = metadataRes.Item.CreatedAt?.S || currentTime;
    }

    // Update Submission_Count__c in DynamoDB
    const formIndex = existingFormRecords.findIndex((f) => f.Id === formId);
    if (formIndex >= 0) {
      const versionIndex = existingFormRecords[formIndex].FormVersions.findIndex((v) => v.Id === formVersionId);
      if (versionIndex >= 0) {
        existingFormRecords[formIndex].FormVersions[versionIndex].Submission_Count__c = submissionCount;
      }
    }

    await dynamoClient.send(
      new PutItemCommand({
        TableName: METADATA_TABLE_NAME,
        Item: {
          InstanceUrl: { S: cleanedInstanceUrl },
          UserId: { S: userId },
          Metadata: { S: JSON.stringify(existingMetadata) },
          FormRecords: { S: JSON.stringify(existingFormRecords) },
          CreatedAt: { S: createdAt },
          UpdatedAt: { S: currentTime },
        },
      })
    );

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