import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoClient = new DynamoDBClient({});
const METADATA_TABLE_NAME = 'SalesforceChunkData';
const CHUNK_SIZE = 370000;

const fetchNewAccessToken = async (userId) => {
  let response = await fetch('https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/getAccessToken/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    console.error('Failed to fetch access token:', response.status, await response.text());
  }
  const data = await response.json();
  return data.access_token;
};

export const handler = async (event) => {
  try {
    let { instanceUrl, userId, token, status, formId } = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    let tokenRefreshed = false;

    // === 1. Update Salesforce ===
    const sfUrl = `${instanceUrl}/services/data/v60.0/sobjects/Form__c/${formId}`;
    let response = await fetch(sfUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ Status__c: status }),
    });

    if (!response.ok) {
      if (response.status === 401 && !tokenRefreshed) {
        token = await fetchNewAccessToken(userId);
        tokenRefreshed = true;
        response = await fetch(sfUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ Status__c: status }),
        });
      }
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to update Form__c: ${response.status} - ${errText}`);
      }
    }

    // === 2. Get DynamoDB Records ===
    let allItems = [];
    let ExclusiveStartKey = undefined;

    do {
      const queryResponse = await dynamoClient.send(
        new QueryCommand({
          TableName: METADATA_TABLE_NAME,
          KeyConditionExpression: "UserId = :userId",
          ExpressionAttributeValues: { ":userId": { S: userId } },
          ExclusiveStartKey,
        })
      );

      if (queryResponse.Items) {
        allItems.push(...queryResponse.Items);
      }
      ExclusiveStartKey = queryResponse.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    // Only FormRecords chunks (ignore Metadata)
    const formRecordItems = allItems.filter((item) =>
      item.ChunkIndex?.S.startsWith("FormRecords_")
    );

    let formRecords = [];
    if (formRecordItems.length > 0) {
      try {
        const sortedChunks = formRecordItems.sort((a, b) => {
          const aNum = parseInt(a.ChunkIndex.S.split("_")[1]);
          const bNum = parseInt(b.ChunkIndex.S.split("_")[1]);
          return aNum - bNum;
        });

        const combinedFormRecords = sortedChunks.map((i) => i.FormRecords.S).join("");
        formRecords = JSON.parse(combinedFormRecords);
      } catch (e) {
        console.error("Failed to parse FormRecords:", e);
        formRecords = [];
      }
    }

    // === 3. Update formVersion.Status__c ===
    let updated = false;
    for (let form of formRecords) {
      if (form.Id === formId) {
        form.Status__c = status;
        updated = true;
        break;
      }
    }

    if (!updated) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Form not found in records' }),
      };
    }

    // === 4. Chunk and Write Back to DynamoDB ===
    const formRecordsString = JSON.stringify(formRecords);
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
          CreatedAt: { S: new Date().toISOString() },
          UpdatedAt: { S: new Date().toISOString() },
        },
      },
    }));

    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: { [METADATA_TABLE_NAME]: writeRequests },
      })
    );

    // === 5. Response ===
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        message: `Status__c updated to ${status}`,
        formId,
      }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
