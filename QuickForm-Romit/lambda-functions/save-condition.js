import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const METADATA_TABLE_NAME = 'SalesforceData';

export const handler = async (event) => {
  try {
    console.log('Function 2');
    const body = JSON.parse(event.body || '{}');
    const { userId, instanceUrl, condition, formVersionId, conditionId } = body;
    const token = event.headers.Authorization?.split(' ')[1];

    if (!userId || !instanceUrl || !condition || !token || !formVersionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

    let existingConditionId = null;
    let existingConditions = [];

    const query = `SELECT Id, Condition_Data__c FROM Form_Condition__c WHERE Form_Version__c = '${formVersionId}' LIMIT 1`;
    const queryResponse = await fetch(`${salesforceBaseUrl}/query?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (queryResponse.ok) {
      const queryData = await queryResponse.json();
      if (queryData.records.length > 0) {
        existingConditionId = queryData.records[0].Id;
        existingConditions = JSON.parse(queryData.records[0].Condition_Data__c || '[]');
      }
    }

    const conditionData = JSON.parse(condition.Condition_Data__c);
    const newCondition = {
      Id: conditionId || `local_${Date.now()}`,
      type: conditionData.type,
      ...(conditionData.type === 'dependent'
        ? {
            ifField: conditionData.ifField,
            value: conditionData.value || null,
            dependentField: conditionData.dependentField,
            dependentValues: conditionData.dependentValues,
          }
        : {
            conditions: conditionData.conditions.map((cond) => ({
              ifField: cond.ifField,
              operator: cond.operator || 'equals',
              value: cond.value || null,
            })),
            logic: conditionData.logic || 'AND',
            ...(conditionData.type === 'show_hide'
              ? {
                  thenAction: conditionData.thenAction,
                  thenFields: conditionData.thenFields,
                }
              : conditionData.type === 'skip_hide_page'
              ? {
                  thenAction: conditionData.thenAction,
                  sourcePage: conditionData.sourcePage,
                  targetPage: conditionData.targetPage,
                }
              : {
                  thenAction: conditionData.thenAction,
                  thenFields: conditionData.thenFields,
                  ...(conditionData.thenAction === 'set mask' ? { maskPattern: conditionData.maskPattern } : {}),
                  ...(conditionData.thenAction === 'unmask' ? { maskPattern: null } : {}),
                }),
          }),
    };
    
    const updatedConditions = conditionId
      ? existingConditions.map((c) => {
          const parsed = c.Condition_Data__c ? JSON.parse(c.Condition_Data__c) : c;
          return c.Id === conditionId ? newCondition : parsed;
        })
      : [...existingConditions.map((c) => (c.Condition_Data__c ? JSON.parse(c.Condition_Data__c) : c)), newCondition];



    const sfCondition = {
      Form_Version__c: formVersionId,
      Condition_Data__c: JSON.stringify(updatedConditions),
    };

    let salesforceConditionId;
    if (existingConditionId) {
      const response = await fetch(`${salesforceBaseUrl}/sobjects/Form_Condition__c/${existingConditionId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sfCondition),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData[0]?.message || 'Failed to update condition');
      }
      salesforceConditionId = existingConditionId;
    } else {
      const response = await fetch(`${salesforceBaseUrl}/sobjects/Form_Condition__c`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sfCondition),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData[0]?.message || 'Failed to save condition');
      }
      const conditionData = await response.json();
      salesforceConditionId = conditionData.id;
    }

    if (!conditionId) {
      newCondition.Id = `${salesforceConditionId}_${newCondition.Id}`; // Only append Salesforce ID for new conditions
    }

    const existingMetadataRes = await dynamoClient.send(
      new GetItemCommand({
        TableName: METADATA_TABLE_NAME,
        Key: { UserId: { S: userId } },
      })
    );

    let formRecords = [];
    if (existingMetadataRes.Item?.FormRecords?.S) {
      formRecords = JSON.parse(existingMetadataRes.Item.FormRecords.S);
    }

    let formVersion = null;
    let formIndex = -1;
    for (let i = 0; i < formRecords.length; i++) {
      formVersion = formRecords[i].FormVersions.find((v) => v.Id === formVersionId);
      if (formVersion) {
        formIndex = i;
        break;
      }
    }

    if (formVersion) {
      formVersion.Conditions = updatedConditions;
      formRecords[formIndex] = { ...formRecords[formIndex] };
    } else {
      throw new Error(`Form version ${formVersionId} not found in DynamoDB`);
    }

    await dynamoClient.send(
      new PutItemCommand({
        TableName: METADATA_TABLE_NAME,
        Item: {
          UserId: { S: userId },
          InstanceUrl: { S: cleanedInstanceUrl },
          Metadata: { S: existingMetadataRes.Item?.Metadata?.S || '{}' },
          FormRecords: { S: JSON.stringify(formRecords) },
          CreatedAt: { S: existingMetadataRes.Item?.CreatedAt?.S || new Date().toISOString() },
          UpdatedAt: { S: new Date().toISOString() },
        },
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, condition: newCondition }),
    };
  } catch (error) {
    console.error('Error saving condition:', error);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to save condition' }),
    };
  }
};