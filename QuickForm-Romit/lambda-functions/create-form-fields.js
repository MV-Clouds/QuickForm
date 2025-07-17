import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  try {
    // Extract data from the Lambda event
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, formData, formUpdate  } = body;
    const token = event.headers.Authorization?.split(' ')[1]; // Extract Bearer token

    // Validate required parameters
    if (!userId || !instanceUrl || !formData || !token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required parameters: userId, instanceUrl, formData, or Authorization token' }),
      };
    }

    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

    let formVersionId;
    let formId; // To store Form__c ID
    const { Id, Form__c, ...formVersion } = formData.formVersion;

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

    if (metadataItem?.Metadata?.S) {
      try {
        existingMetadata = JSON.parse(metadataItem.Metadata.S);
      } catch (e) {
        console.warn('Failed to parse Metadata:', e);
      }
      createdAt = metadataItem.CreatedAt?.S || createdAt;
    }

    if (formRecordItems.length > 0) {
      try {
        const sortedChunks = formRecordItems
          .sort((a, b) => {
            const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
            const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
            return aNum - bNum;
          })
          .map(item => item.FormRecords.S);
        const combinedFormRecords = sortedChunks.join('');
        formRecords = JSON.parse(combinedFormRecords);
      } catch (e) {
        console.warn('Failed to parse FormRecords chunks:', e);
      }
    }

    // Step 1: Determine Form__c ID
    if (Id) {
      // For updates, use the provided Form__c or fetch from DynamoDB
      formId = Form__c;
      if (!formId) {

        let version = null;
        for (const form of formRecords) {
          version = form.FormVersions.find(v => v.Id === Id);
          if (version) {
            formId = version.FormId;
            break;
          }
        }

        if (!formId) {
          throw new Error(`Form__c not found for Form_Version__c ${Id}`);
        }
      }
    } else if (formVersion.Version__c !== '1') {
      // For new versions (e.g., 2, 3), find the previous version's Form__c from DynamoDB
      const previousVersion = (parseInt(formVersion.Version__c) - 1).toString();
      
      let version = null;
      for (const form of formRecords) {
        version = form.FormVersions.find(
          v => v.Name === formVersion.Name && v.Version__c === previousVersion
        );
        if (version) {
          formId = version.FormId;
          break;
        }
      }

      if (!formId) {
        throw new Error(`Form__c not found for previous Form_Version__c (Version ${previousVersion})`);
      }
    } else {
      // For version 1, create a new Form__c
      const formResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form__c`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Active_Version__c: `None`,
          Status__c: 'Inactive',
        }),
      });

      if (!formResponse.ok) {
        const errorData = await formResponse.json();
        throw new Error(errorData[0]?.message || 'Failed to create Form__c record');
      }

      const formDataResponse = await formResponse.json();
      formId = formDataResponse.id;

    }

    // Step 2: Handle Form_Version__c record
    if (Id) {
      const formVersionResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form_Version__c/${Id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formVersion, Form__c: formId }),
      });

      if (!formVersionResponse.ok) {
        const errorData = await formVersionResponse.json();
        throw new Error(errorData[0]?.message || 'Failed to update Form_Version__c record');
      }

      formVersionId = Id;

      // If publishing, update other versions
      if (formVersion.Stage__c === 'Publish') {
        const otherVersionsQuery = `SELECT Id, Stage__c FROM Form_Version__c WHERE Form__c = '${formId}' AND Id != '${formVersionId}' AND Stage__c = 'Publish'`;
        const otherVersionsUrl = `${salesforceBaseUrl}/query?q=${encodeURIComponent(otherVersionsQuery)}`;
        const otherVersionsRes = await fetch(otherVersionsUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!otherVersionsRes.ok) {
          const errorData = await otherVersionsRes.json();
          throw new Error(errorData[0]?.message || 'Failed to query other Form_Version__c records');
        }

        const otherVersionsData = await otherVersionsRes.json();
        if (otherVersionsData.records?.length > 0) {
          const compositeRequest = {
            allOrNone: true,
            records: otherVersionsData.records.map((otherVersion) => ({
              attributes: { type: 'Form_Version__c' },
              Id: otherVersion.Id,
              Stage__c: 'Locked',
            })),
          };
        
          const compositeResponse = await fetch(`${salesforceBaseUrl}/composite/sobjects`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(compositeRequest),
          });
        
          if (!compositeResponse.ok) {
            const errorData = await compositeResponse.json();
            throw new Error(errorData[0]?.message || 'Failed to update other Form_Version__c records');
          }
        }

        const updateFormResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form__c/${formId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Active_Version__c: `V${formVersion.Version__c}`,
            Publish_Link__c: formUpdate?.Publish_Link__c || '',
            Status__c: 'Active',
          }),
        });
      
        if (!updateFormResponse.ok) {
          const errorData = await updateFormResponse.json();
          throw new Error(errorData[0]?.message || 'Failed to update Form__c Active_Version__c');
        }
      }

      // Delete existing Form_Field__c records
      const query = `SELECT Id FROM Form_Field__c WHERE Form_Version__c = '${formVersionId}'`;
      const queryUrl = `${salesforceBaseUrl}/query?q=${encodeURIComponent(query)}`;
      const queryResponse = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!queryResponse.ok) {
        const errorData = await queryResponse.json();
        throw new Error(errorData[0]?.message || 'Failed to query Form_Field__c records');
      }

      const queryData = await queryResponse.json();
      const existingFields = queryData.records || [];

      if (existingFields.length > 0) {
        const ids = existingFields.map((field) => field.Id).join(',');
        const deleteResponse = await fetch(`${salesforceBaseUrl}/composite/sobjects?ids=${encodeURIComponent(ids)}&allOrNone=true`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          throw new Error(errorData[0]?.message || 'Failed to delete Form_Field__c records');
        }
      }
    } else {
      // Enforce one Draft per Form__c
      const draftQuery = `SELECT Id FROM Form_Version__c WHERE Form__c = '${formId}' AND Stage__c = 'Draft'`;
      const draftQueryUrl = `${salesforceBaseUrl}/query?q=${encodeURIComponent(draftQuery)}`;
      const draftQueryRes = await fetch(draftQueryUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!draftQueryRes.ok) {
        const errorData = await draftQueryRes.json();
        throw new Error(errorData[0]?.message || 'Failed to query Draft Form_Version__c');
      }

      const draftData = await draftQueryRes.json();
      if (draftData.records?.length > 0) {
        throw new Error('A Draft version already exists for this Form__c');
      }

      // Create new Form_Version__c record
      const formVersionResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form_Version__c`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formVersion, Form__c: formId }),
      });

      if (!formVersionResponse.ok) {
        const errorData = await formVersionResponse.json();
        throw new Error(errorData[0]?.message || 'Failed to create Form_Version__c record');
      }

      const formVersionData = await formVersionResponse.json();
      formVersionId = formVersionData.id;
    }

    // Step 3: Update Form__c Active_Version__c
    // const updateFormResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form__c/${formId}`, {
    //   method: 'PATCH',
    //   headers: {
    //     Authorization: `Bearer ${token}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     Active_Version__c: formVersion.Stage__c === 'Publish' ? `V${formVersion.Version__c}` : 'None',
    //     Status__c: formVersion.Stage__c === 'Publish' ? 'Active' : 'Inactive',
    //   }),
    // });

    // if (!updateFormResponse.ok) {
    //   const errorData = await updateFormResponse.json();
    //   throw new Error(errorData[0]?.message || 'Failed to update Form__c Active_Version__c');
    // }
    
    // Step 4: Create Form_Field__c records
    const createdFormFields = [];
    const formFieldIds = {};
    if (formData.formFields.length > 0) {
      const compositeRequest = {
        allOrNone: true,
        records: formData.formFields.map((formField) => {
          let properties;
          try {
            properties = JSON.parse(formField.Properties__c);
          } catch (e) {
            console.warn(`Failed to parse Properties__c for field ${formField.Unique_Key__c}:`, e);
            properties = {};
          }
          // Remove subFields from validation to avoid duplication
          if (properties.validation && properties.validation.subFields) {
            delete properties.validation.subFields;
          }
          return {
            attributes: { type: 'Form_Field__c' },
            ...formField,
            Form_Version__c: formVersionId,
            Properties__c: JSON.stringify({
              ...properties,
              subFields: properties.subFields || {},
            }),
          };
        }),
      };

      const formFieldResponse = await fetch(`${salesforceBaseUrl}/composite/sobjects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compositeRequest),
      });

      if (!formFieldResponse.ok) {
        const errorData = await formFieldResponse.json();
        throw new Error(errorData[0]?.message || 'Failed to create Form_Field__c records');
      }

      const formFieldData = await formFieldResponse.json();
      formFieldData.forEach((result, index) => {
        if (result.success) {
          const formField = formData.formFields[index];
          createdFormFields.push({
            Id: result.id,
            Name: formField.Name,
            Field_Type__c: formField.Field_Type__c,
            Page_Number__c: formField.Page_Number__c,
            Order_Number__c: formField.Order_Number__c,
            Properties__c: formField.Properties__c,
            Unique_Key__c: formField.Unique_Key__c,
          });
          formFieldIds[formField.Unique_Key__c] = result.id;
        } else {
          throw new Error(result.errors[0]?.message || 'Failed to create a Form_Field__c record');
        }
      });
    }


    // Step 5: Update DynamoDB SalesforceMetadata table
    const currentTime = new Date().toISOString();

    let existingConditions = [];
    if (Id) {
      const existingFormVersion = formRecords
        .flatMap(form => form.FormVersions)
        .find(version => version.Id === Id);
      if (existingFormVersion && existingFormVersion.Conditions) {
        existingConditions = existingFormVersion.Conditions;
      }
    }
    // Construct new or updated form record
    const newFormVersionRecord = {
      Id: formVersionId,
      FormId: formId,
      Name: formData.formVersion.Name,
      Description__c: formData.formVersion.Description__c || '',
      Version__c: formData.formVersion.Version__c || '1',
      Stage__c: formData.formVersion.Stage__c || 'Draft',
      Submission_Count__c: formData.formVersion.Submission_Count__c || 0,
      Object_Info__c: formData.formVersion.Object_Info__c || [],
      Fields: createdFormFields,
      Conditions: existingConditions,
      Source: 'Form_Version__c',
    };

    let updatedFormRecords = [...formRecords];
    const formIndex = updatedFormRecords.findIndex(f => f.Id === formId);
    if (formIndex >= 0) {
      const otherVersions = updatedFormRecords[formIndex].FormVersions.filter(v => v.Id !== formVersionId);
      if (formData.formVersion.Stage__c === 'Publish') {
        otherVersions.forEach(v => {
          if (v.Stage__c === 'Publish') v.Stage__c = 'Locked';
        });
      }
      updatedFormRecords[formIndex] = {
        ...updatedFormRecords[formIndex],
        Active_Version__c: formData.formVersion.Stage__c === 'Publish' ? `V${formData.formVersion.Version__c}` : 'None',
        Publish_Link__c: formUpdate?.Publish_Link__c || '',
        Status__c: formData.formVersion.Stage__c === 'Publish' ? 'Active' : 'Inactive',
        FormVersions: [newFormVersionRecord, ...otherVersions],
      };
    } else {
      updatedFormRecords.push({
        Id: formId,
        Name: `FORM-${formId.slice(-4)}`,
        Active_Version__c: formData.formVersion.Stage__c === 'Publish' ? `V${formData.formVersion.Version__c}` : 'None',
        FormVersions: [newFormVersionRecord],
        Status__c: formData.formVersion.Stage__c === 'Publish' ? 'Active' : 'Inactive',
        Source: 'Form__c',
      });
    }

    const formRecordsString = JSON.stringify(updatedFormRecords);
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
            Metadata: { S: JSON.stringify(existingMetadata) },
            CreatedAt: { S: createdAt },
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'Form saved successfully', formVersionId, formFieldIds }),
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to save form to Salesforce' }),
    };
  }
};