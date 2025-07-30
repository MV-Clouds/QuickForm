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

    // if (formRecordItems.length > 0) {
    //   try {
    //     const sortedChunks = formRecordItems
    //       .sort((a, b) => {
    //         const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
    //         const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
    //         return aNum - bNum;
    //       })
    //       .map(item => item.FormRecords.S);
    //     const combinedFormRecords = sortedChunks.join('');
    //     formRecords = JSON.parse(combinedFormRecords);
    //   } catch (e) {
    //     console.warn('Failed to parse FormRecords chunks:', e);
    //   }
    // }

    if (formRecordItems.length > 0) {
      try {
        const sortedChunks = formRecordItems
          .sort((a, b) => {
            const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
            const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
            return aNum - bNum;
          })
          .map(item => {
            // Clean the string by removing any non-printable characters
            let cleanStr = item.FormRecords.S.replace(/[^\x20-\x7E]/g, '');
            // Ensure the string is properly formatted JSON
            if (!cleanStr.startsWith('[') && !cleanStr.startsWith('{')) {
              // Try to find the actual JSON start
              const jsonStart = cleanStr.search(/[{\[]/);
              if (jsonStart !== -1) {
                cleanStr = cleanStr.substring(jsonStart);
              }
            }
            return cleanStr;
          });
        
        // Verify the combined string is valid JSON
        const combinedFormRecords = sortedChunks.join('');
        if (combinedFormRecords.trim() === '') {
          console.warn('Empty FormRecords data');
          formRecords = [];
        } else {
          formRecords = JSON.parse(combinedFormRecords);
        }
      } catch (e) {
        console.error('Failed to parse FormRecords chunks:', e);
        console.error('Raw chunk data:', formRecordItems.map(item => item.FormRecords.S));
        formRecords = [];
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
    } else {
      // Enforce only one Draft per Form__c
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

    // Differential updating Form_Field__c records
    // Step 1: Query existing fields for this version
    const query = `SELECT Id, Unique_Key__c, Name, Field_Type__c, Properties__c, Page_Number__c, Order_Number__c FROM Form_Field__c WHERE Form_Version__c = '${formVersionId}'`;
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

    // Map existing fields by Unique_Key__c
    const existingFieldsMap = {};
    existingFields.forEach(f => {
      existingFieldsMap[f.Unique_Key__c] = f;
    });

    // Map new fields by Unique_Key__c
    const newFieldsMap = {};
    formData.formFields.forEach(f => {
      newFieldsMap[f.Unique_Key__c] = f;
    });

    // Determine fields to delete
    const toDelete = existingFields.filter(f => !newFieldsMap[f.Unique_Key__c]);

    // Determine fields to update
    const toUpdate = formData.formFields.filter(f => {
      const existing = existingFieldsMap[f.Unique_Key__c];
      if (!existing) return false;
      return (
        existing.Name !== f.Name ||
        existing.Field_Type__c !== f.Field_Type__c ||
        existing.Properties__c !== f.Properties__c ||
        existing.Page_Number__c !== f.Page_Number__c ||
        existing.Order_Number__c !== f.Order_Number__c
      );
    })
    .map(f => ({
      ...f,
      Id: existingFieldsMap[f.Unique_Key__c]?.Id, // add the existing Salesforce record ID here
    }));;


    // Determine fields to create
    const toCreate = formData.formFields.filter(f => !existingFieldsMap[f.Unique_Key__c]);

    const batchSize = 200;

    // Batch delete
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batchFields = toDelete.slice(i, i + batchSize);
      const ids = batchFields.map(f => f.Id).join(',');

      const deleteResponse = await fetch(
        `${salesforceBaseUrl}/composite/sobjects?ids=${encodeURIComponent(ids)}&allOrNone=true`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!deleteResponse.ok) {
        const err = await deleteResponse.json();
        throw new Error(err[0]?.message || 'Failed to batch delete form fields');
      }
    }

    // Batch update
    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize);
      const compositeUpdateRequest = {
        allOrNone: true,
        records: batch.map(f => {
          let props;
          try {
            props = JSON.parse(f.Properties__c);
          } catch {
            props = {};
          }
          if (props.validation?.subFields) delete props.validation.subFields;

          return {
            attributes: { type: 'Form_Field__c' },
            Id: f.Id,
            Form_Version__c: formVersionId,
            Name: f.Name,
            Field_Type__c: f.Field_Type__c,
            Page_Number__c: f.Page_Number__c,
            Order_Number__c: f.Order_Number__c,
            Properties__c: JSON.stringify({ ...props, subFields: props.subFields || {} }),
            Unique_Key__c: f.Unique_Key__c,
          };
        }),
      };

      const updateResponse = await fetch(`${salesforceBaseUrl}/composite/sobjects`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compositeUpdateRequest),
      });

      if (!updateResponse.ok) {
        const err = await updateResponse.json();
        throw new Error(err[0]?.message || 'Failed to batch update form fields');
      }
    }

    // // Batch create
    // for (let i = 0; i < toCreate.length; i += batchSize) {
    //   const batch = toCreate.slice(i, i + batchSize);
    //   const compositeCreateRequest = {
    //     allOrNone: true,
    //     records: batch.map(f => {
    //       let props;
    //       try {
    //         props = JSON.parse(f.Properties__c);
    //       } catch {
    //         props = {};
    //       }
    //       if (props.validation?.subFields) delete props.validation.subFields;

    //       return {
    //         attributes: { type: 'Form_Field__c' },
    //         ...f,
    //         Form_Version__c: formVersionId,
    //         Properties__c: JSON.stringify({ ...props, subFields: props.subFields || {} }),
    //       };
    //     }),
    //   };

    //   const createResponse = await fetch(`${salesforceBaseUrl}/composite/sobjects`, {
    //     method: 'POST',
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(compositeCreateRequest),
    //   });

    //   if (!createResponse.ok) {
    //     const err = await createResponse.json();
    //     throw new Error(err[0]?.message || 'Failed to batch create form fields');
    //   }
    // }

    // Batch create
    const createdFields = []; // To store fields with their Salesforce IDs
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);
      const compositeCreateRequest = {
        allOrNone: true,
        records: batch.map(f => {
          let props;
          try {
            props = JSON.parse(f.Properties__c);
          } catch {
            props = {};
          }
          if (props.validation?.subFields) delete props.validation.subFields;

          return {
            attributes: { type: 'Form_Field__c' },
            ...f,
            Form_Version__c: formVersionId,
            Properties__c: JSON.stringify({ ...props, subFields: props.subFields || {} }),
          };
        }),
      };

      const createResponse = await fetch(`${salesforceBaseUrl}/composite/sobjects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compositeCreateRequest),
      });

      if (!createResponse.ok) {
        const err = await createResponse.json();
        throw new Error(err[0]?.message || 'Failed to batch create form fields');
      }

      // Capture the created record IDs
      const createResponseData = await createResponse.json();
      createResponseData.forEach((result, index) => {
        if (result.success) {
          createdFields.push({
            ...batch[index],
            Id: result.id, // Add the Salesforce ID to the field
          });
        } else {
          throw new Error(result.errors[0]?.message || 'Failed to create a form field');
        }
      });
    }

    // Batch update
    const updatedFields = toUpdate; // Already have IDs from existingFieldsMap
    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize);
      const compositeUpdateRequest = {
        allOrNone: true,
        records: batch.map(f => {
          let props;
          try {
            props = JSON.parse(f.Properties__c);
          } catch {
            props = {};
          }
          if (props.validation?.subFields) delete props.validation.subFields;

          return {
            attributes: { type: 'Form_Field__c' },
            Id: f.Id,
            Form_Version__c: formVersionId,
            Name: f.Name,
            Field_Type__c: f.Field_Type__c,
            Page_Number__c: f.Page_Number__c,
            Order_Number__c: f.Order_Number__c,
            Properties__c: JSON.stringify({ ...props, subFields: props.subFields || {} }),
            Unique_Key__c: f.Unique_Key__c,
          };
        }),
      };

      const updateResponse = await fetch(`${salesforceBaseUrl}/composite/sobjects`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compositeUpdateRequest),
      });

      if (!updateResponse.ok) {
        const err = await updateResponse.json();
        throw new Error(err[0]?.message || 'Failed to batch update form fields');
      }
    }

    // Combine created and updated fields, preserving existing fields that weren't updated
    const allFields = [
      ...createdFields,
      ...updatedFields,
      ...existingFields.filter(f =>
        !createdFields.some(cf => cf.Unique_Key__c === f.Unique_Key__c) &&
        !updatedFields.some(uf => uf.Unique_Key__c === f.Unique_Key__c) &&
        !toDelete.some(d => d.Unique_Key__c === f.Unique_Key__c)
        ).map(f => ({
          Id: f.Id,
          Name: f.Name,
          Field_Type__c: f.Field_Type__c,
          Page_Number__c: f.Page_Number__c,
          Order_Number__c: f.Order_Number__c,
          Properties__c: f.Properties__c,
          Unique_Key__c: f.Unique_Key__c,
        })),
    ];
    // // Step 5: Update DynamoDB SalesforceMetadata table
    // const currentTime = new Date().toISOString();

    // let existingConditions = [];
    // if (Id) {
    //   const existingFormVersion = formRecords
    //     .flatMap(form => form.FormVersions)
    //     .find(version => version.Id === Id);
    //   if (existingFormVersion && existingFormVersion.Conditions) {
    //     existingConditions = existingFormVersion.Conditions;
    //   }
    // }
    // // Construct new or updated form record
    // const newFormVersionRecord = {
    //   Id: formVersionId,
    //   FormId: formId,
    //   Name: formData.formVersion.Name,
    //   Description__c: formData.formVersion.Description__c || '',
    //   Version__c: formData.formVersion.Version__c || '1',
    //   Stage__c: formData.formVersion.Stage__c || 'Draft',
    //   Submission_Count__c: formData.formVersion.Submission_Count__c || 0,
    //   Object_Info__c: formData.formVersion.Object_Info__c || [],
    //   Fields: formData.formFields, // Optionally replace with createdFormFields if needed
    //   Conditions: existingConditions,
    //   Source: 'Form_Version__c',
    // };

    // let updatedFormRecords = [...formRecords];
    // console.log('updatedFormRecords ',JSON.stringify(updatedFormRecords));
    // const formIndex = updatedFormRecords.findIndex(f => f.Id === formId);
    // if (formIndex >= 0) {
    //   const otherVersions = updatedFormRecords[formIndex].FormVersions.filter(v => v.Id !== formVersionId);
    //   if (formData.formVersion.Stage__c === 'Publish') {
    //     otherVersions.forEach(v => {
    //       if (v.Stage__c === 'Publish') v.Stage__c = 'Locked';
    //     });
    //   }
    //   updatedFormRecords[formIndex] = {
    //     ...updatedFormRecords[formIndex],
    //     LastModifiedDate: currentTime,
    //     Active_Version__c: formData.formVersion.Stage__c === 'Publish' ? `V${formData.formVersion.Version__c}` : 'None',
    //     Publish_Link__c: formUpdate?.Publish_Link__c || '',
    //     Status__c: formData.formVersion.Stage__c === 'Publish' ? 'Active' : 'Inactive',
    //     FormVersions: [newFormVersionRecord, ...otherVersions],
    //   };
    // } else {
    //   updatedFormRecords.push({
    //     Id: formId,
    //     Name: `FORM-${formId.slice(-4)}`,
    //     LastModifiedDate: currentTime,
    //     Active_Version__c: formData.formVersion.Stage__c === 'Publish' ? `V${formData.formVersion.Version__c}` : 'None',
    //     FormVersions: [newFormVersionRecord],
    //     Status__c: formData.formVersion.Stage__c === 'Publish' ? 'Active' : 'Inactive',
    //     Source: 'Form__c',
    //   });
    // }

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

    // Construct new or updated form version record
    const newFormVersionRecord = {
      Id: formVersionId,
      FormId: formId,
      Name: formData.formVersion.Name,
      Description__c: formData.formVersion.Description__c || '',
      Version__c: formData.formVersion.Version__c || '1',
      Stage__c: formData.formVersion.Stage__c || 'Draft',
      Submission_Count__c: formData.formVersion.Submission_Count__c || 0,
      Object_Info__c: formData.formVersion.Object_Info__c || [],
      Fields: allFields, // Use the combined fields with IDs
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
        LastModifiedDate: currentTime,
        Active_Version__c: formData.formVersion.Stage__c === 'Publish' ? `V${formData.formVersion.Version__c}` : 'None',
        Publish_Link__c: formUpdate?.Publish_Link__c || '',
        Status__c: formData.formVersion.Stage__c === 'Publish' ? 'Active' : 'Inactive',
        FormVersions: [newFormVersionRecord, ...otherVersions],
      };
    } else {
      updatedFormRecords.push({
        Id: formId,
        Name: `FORM-${formId.slice(-4)}`,
        LastModifiedDate: currentTime,
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
            UserProfile: { S: metadataItem.UserProfile?.S },
            Fieldset : { S: metadataItem.Fieldset?.S || {} },
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
      body: JSON.stringify({ success: true, message: 'Form saved successfully', formVersionId }),
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to save form to Salesforce' }),
    };
  }
};