import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, formData } = body;4
    const oldThankYouData = formData.ThankYou || null;

    const token = event.headers.Authorization?.split(' ')[1];

    if (!userId || !instanceUrl || !formData || !token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required parameters: userId, instanceUrl, formData, or Authorization token' }),
      };
    }

    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;
    const currentTime = new Date().toISOString();

    // Step 1: Create new Form__c
    const formCreateResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form__c`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Active_Version__c: 'None',
        Status__c: 'Inactive',
      }),
    });

    if (!formCreateResponse.ok) {
      const errorData = await formCreateResponse.json();
      throw new Error(errorData[0]?.message || 'Failed to create Form__c record');
    }

    const formCreateData = await formCreateResponse.json();
    const formId = formCreateData.id;

    // Step 2: Create Form_Version__c with Version__c = "1"
    const formVersionPayload = {
      ...formData.formVersion,
      Form__c: formId,
      Version__c: '1', // Always version 1 because it's a new cloned form
      Stage__c: 'Draft',
    };

    const formVersionResponse = await fetch(`${salesforceBaseUrl}/sobjects/Form_Version__c`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formVersionPayload),
    });

    if (!formVersionResponse.ok) {
      const errorData = await formVersionResponse.json();
      throw new Error(errorData[0]?.message || 'Failed to create Form_Version__c record');
    }

    const formVersionData = await formVersionResponse.json();
    const formVersionId = formVersionData.id;

    // Step 3: Create Form_Field__c records in batches
    const batchSize = 200;
    const formFields = formData.formFields || [];

    const createdFields = [];
    for (let i = 0; i < formFields.length; i += batchSize) {
      const batch = formFields.slice(i, i + batchSize);

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

      const createResponseData = await createResponse.json();
      createResponseData.forEach((result, index) => {
        if (result.success) {
          createdFields.push({
            ...batch[index],
            Id: result.id,
          });
        } else {
          throw new Error(result.errors[0]?.message || 'Failed to create a form field');
        }
      });
    }

    const createdPrefills = [];
    const formPrefills = formData.Prefills || [];
    console.log('Form prefills',formPrefills);
    
    for (let i = 0; i < formPrefills.length; i += batchSize) {
      const batch = formPrefills.slice(i, i + batchSize);

      const compositeCreateRequest = {
        allOrNone: true,
        records: batch.map(f => {
          let prefillData;
          try {
            prefillData = JSON.parse(f.Prefill_Data__c);
          } catch {
            prefillData = {};
          }
          const { Id, ...rest } = f;
          return {
            attributes: { type: 'Prefill__c' },
            ...rest,
            Form_Version__c: formVersionId,
            Order__c: f.Order__c,
            Prefill_Data__c: JSON.stringify({ prefillData }),
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
        throw new Error(err[0]?.message || 'Failed to batch create prefill');
      }

      const createResponseData = await createResponse.json();
      createResponseData.forEach((result, index) => {
        if (result.success) {
          createdPrefills.push({
            ...batch[index],
            Id: result.id,
          });
        } else {
          throw new Error(result.errors[0]?.message || 'Failed to create prefill');
        }
      });
    }

    const conditions = formData.conditions || [];

    const conditionBatchSize = 200;
    const createdConditions = [];

    for (let i = 0; i < conditions.length; i += conditionBatchSize) {
      const batch = conditions.slice(i, i + conditionBatchSize);

      const compositeConditionRequest = {
        allOrNone: true,
        records: [{
          attributes: { type: 'Form_Condition__c' },
          Form_Version__c: formVersionId,
          Condition_Data__c: JSON.stringify(formData.conditions),
        }],
      };

      const conditionResponse = await fetch(`${salesforceBaseUrl}/composite/sobjects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compositeConditionRequest),
      });

      if (!conditionResponse.ok) {
        const err = await conditionResponse.json();
        throw new Error(err[0]?.message || 'Failed to batch create conditions');
      }

      const conditionResponseData = await conditionResponse.json();

      conditionResponseData.forEach((result, index) => {
        if (result.success) {
          createdConditions.push(
            ...formData.conditions);
        } else {
          throw new Error(result.errors[0]?.message || 'Failed to create a condition');
        }
      });
    }

    const mappingsArray = Object.values(formData.Mappings?.Mappings || []);
    
    const nodes = Array.isArray(formData.Mappings?.Nodes) ? formData.Mappings.Nodes : [];
    const edges = Array.isArray(formData.Mappings?.Edges) ? formData.Mappings.Edges : [];

    const createdMappings = new Map();

    for (let i = 0; i < mappingsArray.length; i += batchSize) {
      const batch = mappingsArray.slice(i, i + batchSize);

      const records = batch.map(mapping => {
        const {
          nodeId,
          actionType,
          salesforceObject,
          fieldMappings,
          conditions,
          logicType,
          customLogic,
          loopConfig,
          formatterConfig,
          enableConditions,
          returnLimit,
          sortField,
          sortOrder,
          pathOption,
          nextNodeIds,
          previousNodeId,
          label,
          order,
        } = mapping;

        let conditionsJson = null;
        if (actionType === 'Condition') {
          conditionsJson = JSON.stringify({
            pathOption: pathOption || 'Rules',
            conditions: conditions || [],
            logicType: pathOption === 'Rules' && conditions?.length > 1 ? logicType || 'AND' : null,
            customLogic: logicType === 'Custom' ? customLogic || '' : null,
            returnLimit: (actionType === 'Condition' && pathOption === 'Rules') ? returnLimit || null : null,
            sortField: (actionType === 'Condition' && pathOption === 'Rules') ? sortField || null : null,
            sortOrder: (actionType === 'Condition' && pathOption === 'Rules') ? sortOrder || null : null,
          });
        } else if ((actionType === 'CreateUpdate' && enableConditions) || actionType === 'Find' || actionType === 'Filter') {
          conditionsJson = JSON.stringify({
            conditions: conditions || [],
            logicType: conditions?.length > 1 ? logicType || 'AND' : null,
            customLogic: logicType === 'Custom' ? customLogic || '' : null,
            returnLimit: (actionType === 'Find' || actionType === 'Filter') ? returnLimit || null : null,
            sortField: (actionType === 'Find' || actionType === 'Filter') ? sortField || null : null,
            sortOrder: (actionType === 'Find' || actionType === 'Filter') ? sortOrder || null : null,
          });
        }

        const nodeData = nodes.find(n => n.id === nodeId);
        const nodeConfiguration = nodeData ? { position: nodeData.position || { x: 0, y: 0 } } : null;

        return {
          attributes: { type: 'QF_Mapping__c' },
          Name: label,
          Type__c: actionType,
          Previous_Node_Id__c: previousNodeId || null,
          Next_Node_Id__c: nextNodeIds ? nextNodeIds.join(',') : null,
          Salesforce_Object__c:
            actionType === 'CreateUpdate' ||
            actionType === 'Find' ||
            actionType === 'Filter' ||
            (actionType === 'Condition' && pathOption === 'Rules')
              ? salesforceObject || null
              : null,
          Conditions__c: conditionsJson,
          Field_Mappings__c:
            actionType === 'CreateUpdate' && fieldMappings && fieldMappings.length > 0
              ? JSON.stringify(fieldMappings)
              : null,
          Loop_Config__c:
            actionType === 'Loop' && loopConfig
              ? JSON.stringify({
                  ...loopConfig,
                  exitConditions: loopConfig.exitConditions || [],
                  logicType: loopConfig.exitConditions?.length > 1 ? loopConfig.logicType || 'AND' : null,
                  customLogic: loopConfig.logicType === 'Custom' ? loopConfig.customLogic || '' : null,
                })
              : null,
          Formatter_Config__c:
            actionType === 'Formatter' && formatterConfig ? JSON.stringify(formatterConfig) : null,
          Node_Configuration__c: nodeConfiguration ? JSON.stringify(nodeConfiguration) : null,
          Order__c: order != null ? order.toString() : null,
          Form_Version__c: formVersionId,
          Node_Id__c: nodeId,
        };
      });

      const compositeRequest = {
        allOrNone: true,
        records,
      };
      

      const response = await fetch(`${salesforceBaseUrl}/composite/sobjects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compositeRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData[0]?.message || 'Failed to create QF_Mapping__c records');
      }

      const responseData = await response.json();
      responseData.forEach((result, idx) => {
        // if (!result.success) {
        //   throw new Error(result.errors[0]?.message || 'Error creating a mapping node');
        // }
        createdMappings.set(records[idx].Node_Id__c, result.id);
      });
    }

    // Build updated mappings object with Salesforce IDs
    const updatedMappings = {};
    mappingsArray.forEach(mapping => {
      updatedMappings[mapping.nodeId] = {
        ...mapping,
        id: createdMappings.get(mapping.nodeId),
      };
    });

    // Compose final Mappings object to store in DynamoDB
    const finalMappings = {
      Id: formVersionId,
      FlowId: formVersionId,
      Mappings: updatedMappings,
      Nodes: nodes,
      Edges: edges,
    };

    let newThankYouData = null;
    if (oldThankYouData) {
      // Prepare payload for new ThankYou record linked to the new Form Version
      const thankYouPayload = {
        ...oldThankYouData,
        // Ensure the new FormVersionId is set
        Form_Version__c: formVersionId,
      };

      // Salesforce expects no Id or attributes field for creation
      delete thankYouPayload.Id;
      delete thankYouPayload.attributes;

      const thankYouResponse = await fetch(`${salesforceBaseUrl}/sobjects/Thank_You__c`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(thankYouPayload),
      });

      if (!thankYouResponse.ok) {
        const err = await thankYouResponse.json();
        throw new Error(err[0]?.message || 'Failed to create cloned ThankYou record');
      }

      const thankYouCreateData = await thankYouResponse.json();

      newThankYouData = {
        Id: thankYouCreateData.id,
        Form_Version__c: formVersionId,
        Body__c: oldThankYouData.Body__c,
        Actions__c: oldThankYouData.Actions__c,
        Name: oldThankYouData.Name,
        Heading__c: oldThankYouData.Heading__c,
        Sub_Heading__c: oldThankYouData.Sub_Heading__c,
        Image_Url__c: oldThankYouData.Image_Url__c,
        Description__c: oldThankYouData.Description__c,
      };
    }

    const oldNotifications = formData.Notifications || [];

    // Prepare array to collect newly created notification records
    const newNotifications = [];

    for (const oldNotif of oldNotifications) {
      // Prepare payload for new Notification record, link to new formId
      const notifPayload = {
        ...oldNotif,
        Form__c: formId, 
      };

      // Salesforce expects no Id or attributes for new record creations
      delete notifPayload.Id;
      delete notifPayload.attributes;

      const notifResponse = await fetch(`${salesforceBaseUrl}/sobjects/Notification__c`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifPayload),
      });

      if (!notifResponse.ok) {
        const err = await notifResponse.json();
        throw new Error(err[0]?.message || 'Failed to clone Notification record');
      }

      const notifCreateData = await notifResponse.json();

      newNotifications.push({
        ...oldNotif,
        Id: notifCreateData.id,
        Form__c: formId, // confirm new form linkage
      });
    }


    // Step 4: Fetch existing form records from DynamoDB (if any)
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

    // Extract existing metadata and form records
    let createdAt = currentTime;

    const formRecordItems = allItems.filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'));

    let formRecords = [];
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
        if (combinedFormRecords.trim() !== '') {
          formRecords = JSON.parse(combinedFormRecords);
        }
      } catch (e) {
        console.warn('Failed to parse FormRecords chunks:', e);
        formRecords = [];
      }
    }

    // Step 5: Add new form with its version and fields to formRecords
    const newFormVersionRecord = {
      Id: formVersionId,
      FormId: formId,
      Name: formData.formVersion.Name,
      Description__c: formData.formVersion.Description__c || '',
      Version__c: '1',
      Stage__c: 'Draft',
      Submission_Count__c: 0,
      Object_Info__c: formData.formVersion.Object_Info__c || [],
      Fields: createdFields,
      Conditions: createdConditions,
      Prefills: createdPrefills,
      Mappings: finalMappings,
      ThankYou: newThankYouData,
      Source: 'Form_Version__c',
    };
    
    const newFormRecord = {
      Id: formId,
      Name: `FORM-${formId.slice(-4)}`,
      LastModifiedDate: currentTime,
      Active_Version__c: 'None',
      Notifications: newNotifications,
      FormVersions: [newFormVersionRecord],
      Status__c: 'Inactive',
      Source: 'Form__c',
    };

    // Add new form record; if form already exists, replace it (unlikely in clone)
    const formIndex = formRecords.findIndex(f => f.Id === formId);
    if (formIndex >= 0) {
      formRecords[formIndex] = newFormRecord;
    } else {
      formRecords.push(newFormRecord);
    }

    // Step 6: Chunk formRecords and prepare writes for DynamoDB
    const formRecordsString = JSON.stringify(formRecords);
    const CHUNK_SIZE = 370000;
    const chunks = [];
    for (let i = 0; i < formRecordsString.length; i += CHUNK_SIZE) {
      chunks.push(formRecordsString.slice(i, i + CHUNK_SIZE));
    }

    const writeRequests = chunks.map((chunk, index) => ({
      PutRequest: {
        Item: {
          UserId: { S: userId },
          ChunkIndex: { S: `FormRecords_${index}` },
          FormRecords: { S: chunk },
          CreatedAt: { S: currentTime },
          UpdatedAt: { S: currentTime },
        },
      },
    }));

    // Batch write to DynamoDB (handle max 25 items per batch)
    for (let i = 0; i < writeRequests.length; i += 25) {
      const batch = writeRequests.slice(i, i + 25);
      await dynamoClient.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [METADATA_TABLE_NAME]: batch,
          },
        })
      );
    }

    // Return success response with newly created IDs
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'Form cloned and saved successfully', formId, formVersionId }),
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to clone form' }),
    };
  }
};
