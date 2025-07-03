import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceData';

export const handler = async (event) => {
  try {
    // Extract data from the Lambda event
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, formData } = body;
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
    console.log('Salesforce first base url'+salesforceBaseUrl);

    let formVersionId;
    let formId; // To store Form__c ID
    const { Id, Form__c, ...formVersion } = formData.formVersion;

    // Step 1: Determine Form__c ID
    if (Id) {
      // For updates, use the provided Form__c or fetch from DynamoDB
      formId = Form__c;
      if (!formId) {
        const metadataRes = await dynamoClient.send(
          new GetItemCommand({
            TableName: METADATA_TABLE_NAME,
            Key: {
              UserId: { S: userId },
            },
          })
        );

        let formRecords = [];
        if (metadataRes.Item?.FormRecords?.S) {
          try {
            formRecords = JSON.parse(metadataRes.Item.FormRecords.S);
          } catch (e) {
            console.warn('Failed to parse FormRecords:', e);
          }
        }

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
        console.log(`Found Form__c Id: ${formId} for Form_Version__c ${Id} from DynamoDB`);
      }
    } else if (formVersion.Version__c !== '1') {
      // For new versions (e.g., 2, 3), find the previous version's Form__c from DynamoDB
      const previousVersion = (parseInt(formVersion.Version__c) - 1).toString();
      const metadataRes = await dynamoClient.send(
        new GetItemCommand({
          TableName: METADATA_TABLE_NAME,
          Key: {
            UserId: { S: userId },
          },
        })
      );

      let formRecords = [];
      if (metadataRes.Item?.FormRecords?.S) {
        try {
          formRecords = JSON.parse(metadataRes.Item.FormRecords.S);
        } catch (e) {
          console.warn('Failed to parse FormRecords:', e);
        }
      }

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
      console.log(`Found Form__c Id: ${formId} for previous version ${previousVersion} from DynamoDB`);
    } else {
      // For version 1, create a new Form__c
      const formResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form__c`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Active_Version__c: `V1`,
        }),
      });

      if (!formResponse.ok) {
        const errorData = await formResponse.json();
        throw new Error(errorData[0]?.message || 'Failed to create Form__c record');
      }

      const formDataResponse = await formResponse.json();
      formId = formDataResponse.id;
      console.log(`Created Form__c record with Id: ${formId}`);

      const existingMetadataRes = await dynamoClient.send(
        new GetItemCommand({
          TableName: METADATA_TABLE_NAME,
          Key: {
            UserId: { S: userId },
          },
        })
      );
    
      let existingFormRecords = [];
      if (existingMetadataRes.Item?.FormRecords?.S) {
        try {
          existingFormRecords = JSON.parse(existingMetadataRes.Item.FormRecords.S);
        } catch (e) {
          console.warn('Failed to parse existing FormRecords:', e);
        }
      }

      // Update DynamoDB immediately with the new Form__c
      const currentTime = new Date().toISOString();
      const newFormRecord = {
        Id: formId,
        Name: `FORM-${formId.slice(-4)}`,
        Active_Version__c: 'V1',
        FormVersions: [],
        Source: 'Form__c',
      };

      const updatedFormRecords = [...existingFormRecords, newFormRecord];

      await dynamoClient.send(
      new PutItemCommand({
        TableName: METADATA_TABLE_NAME,
        Item: {
          UserId: { S: userId },
          InstanceUrl: { S: cleanedInstanceUrl },
          Metadata: { S: existingMetadataRes.Item?.Metadata?.S || '{}' },
          FormRecords: { S: JSON.stringify(updatedFormRecords) },
          CreatedAt: { S: existingMetadataRes.Item?.CreatedAt?.S || currentTime },
          UpdatedAt: { S: currentTime },
        },
      })
    );
    }

    // Step 2: Handle Form_Version__c record (update or insert)
    if (Id) {
      // Update existing Form_Version__c record
      console.log('SalesforceBaseUrl'+salesforceBaseUrl);
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
      console.log(`Updated Form_Version__c record with Id: ${formVersionId}`);

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

      for (const field of existingFields) {
        const deleteResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form_Field__c/${field.Id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      
        if (!deleteResponse.ok && deleteResponse.status !== 204) {
          const errorData = await deleteResponse.json();
          throw new Error(errorData[0]?.message || `Failed to delete Form_Field__c record ${field.Id}`);
        }
      }
      console.log(`Deleted ${existingFields.length} existing Form_Field__c records`);
    } else {
      // Enforce one Draft per Form__c
      const draftQuery = `SELECT Id FROM Form_Version__c WHERE Form__c = '${formId}' AND Stage__c = 'Draft'`;
      const draftQueryUrl = `${salesforceBaseUrl}/query?q=${encodeURIComponent(draftQuery)}`;
      console.log(draftQueryUrl);
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
      if (draftData.records?.length > 1) {
        console.log(formVersion.Stage__c)
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
      console.log(`Created Form_Version__c record with Id: ${formVersionId}`);
    }

    // Step 3: Update Form__c Active_Version__c
    const updateFormResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form__c/${formId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Active_Version__c: formVersion.Stage__c === 'Publish' ? `V${formVersion.Version__c}` : 'None',
      }),
    });

    if (!updateFormResponse.ok) {
      const errorData = await updateFormResponse.json();
      throw new Error(errorData[0]?.message || 'Failed to update Form__c Active_Version__c');
    }
    console.log(`Updated Form__c ${formId} with Active_Version__c: ${formVersion.Stage__c === 'Publish' ? `V${formVersion.Version__c}` : 'None'}`);

    // Step 4: Create Form_Field__c records
    const createdFormFields = [];
    const formFieldIds = {};
    if (formData.formFields.length > 0) {
      const compositeRequest = {
        allOrNone: true,
        records: formData.formFields.map((formField) => ({
          attributes: { type: 'Form_Field__c' },
          ...formField,
          Form_Version__c: formVersionId,
        })),
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

    // Fetch existing metadata
    const existingMetadataRes = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );

    let existingFormRecords = [];
    let existingMetadata = null;
    let createdAt = currentTime;

    if (existingMetadataRes.Item) {
      if (existingMetadataRes.Item.FormRecords?.S) {
        try {
          existingFormRecords = JSON.parse(existingMetadataRes.Item.FormRecords.S);
        } catch (e) {
          console.warn('Failed to parse existing FormRecords:', e);
        }
      }
      if (existingMetadataRes.Item.Metadata?.S) {
        try {
          existingMetadata = JSON.parse(existingMetadataRes.Item.Metadata.S);
        } catch (e) {
          console.warn('Failed to parse existing Metadata:', e);
        }
      }
      createdAt = existingMetadataRes.Item.CreatedAt?.S || currentTime;
    }

    let existingConditions = [];
    if (Id) {
      const existingFormVersion = existingFormRecords
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
      Publish_Link__c: formData.formVersion.Publish_Link__c || '',
      Stage__c: formData.formVersion.Stage__c || 'Draft',
      Submission_Count__c: formData.formVersion.Submission_Count__c || 0,
      Object_Info__c: formData.formVersion.Object_Info__c || [],
      Fields: createdFormFields,
      Conditions: existingConditions,
      Source: 'Form_Version__c',
    };

    // Update FormRecords: Find or create Form__c record
    let updatedFormRecords = [...existingFormRecords];
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
        FormVersions: [newFormVersionRecord, ...otherVersions],
      };
    } else {
      updatedFormRecords.push({
        Id: formId,
        Name: `FORM-${formId.slice(-4)}`,
        Active_Version__c: formData.formVersion.Stage__c === 'Publish' ? `V${formData.formVersion.Version__c}` : 'None',
        FormVersions: [newFormVersionRecord],
        Source: 'Form__c',
      });
    }

    // Write to DynamoDB
    await dynamoClient.send(
      new PutItemCommand({
        TableName: METADATA_TABLE_NAME,
        Item: {
          UserId: { S: userId },
          InstanceUrl: { S: cleanedInstanceUrl },
          Metadata: { S: existingMetadata ? JSON.stringify(existingMetadata) : '{}' },
          FormRecords: { S: JSON.stringify(updatedFormRecords) },
          CreatedAt: { S: createdAt },
          UpdatedAt: { S: currentTime },
        },
      })
    );
    console.log(`Updated DynamoDB with form record: ${Id ? 'updated' : 'new'}`, newFormVersionRecord);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'Form saved successfully', formVersionId, formFieldIds }),
    };
  } catch (error) {
    console.error('Error saving form to Salesforce:', error);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to save form to Salesforce' }),
    };
  }
};

async function updateDynamoDB(instanceUrl, userId, formRecords, currentTime, existingMetadata = {}) {
  await dynamoClient.send(
    new PutItemCommand({
      TableName: METADATA_TABLE_NAME,
      Item: {
        UserId: { S: userId },
        InstanceUrl: { S: instanceUrl },
        Metadata: { S: JSON.stringify(existingMetadata) },
        FormRecords: { S: JSON.stringify(formRecords) },
        CreatedAt: { S: currentTime },
        UpdatedAt: { S: currentTime },
      },
    })
  );
}