import {
  DynamoDBClient,
  QueryCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const METADATA_TABLE_NAME = "SalesforceChunkData";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { userId, instanceUrl, conditionId, formVersionId } = body;
    const token = event.headers.Authorization?.split(" ")[1];

    if (!userId || !instanceUrl || !conditionId || !formVersionId || !token) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing required parameters" }),
      };
    }

    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, "");
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;

    // Fetch existing conditions from Salesforce
    let existingConditionId = null;
    let existingConditions = [];
    const query = `SELECT Id, Condition_Data__c FROM Form_Condition__c WHERE Form_Version__c = '${formVersionId}' LIMIT 1`;
    const queryResponse = await fetch(
      `${salesforceBaseUrl}/query?q=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (queryResponse.ok) {
      const queryData = await queryResponse.json();
      if (queryData.records.length > 0) {
        existingConditionId = queryData.records[0].Id;
        existingConditions = JSON.parse(
          queryData.records[0].Condition_Data__c || "[]"
        );
      }
    }

    // Filter out the condition to delete
    const updatedConditions = existingConditions.filter(
      (c) => c.Id !== conditionId
    );

    // Update Salesforce
    if (existingConditionId) {
      if (updatedConditions.length > 0) {
        const response = await fetch(
          `${salesforceBaseUrl}/sobjects/Form_Condition__c/${existingConditionId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Condition_Data__c: JSON.stringify(updatedConditions),
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData[0]?.message || "Failed to update condition"
          );
        }
      } else {
        // Delete the record if no conditions remain
        const response = await fetch(
          `${salesforceBaseUrl}/sobjects/Form_Condition__c/${existingConditionId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData[0]?.message || "Failed to delete condition"
          );
        }
      }
    }

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

    let formRecords = [];
    let existingMetadata = {};
    let createdAt = new Date().toISOString();

    const metadataItem = allItems.find(
      (item) => item.ChunkIndex?.S === "Metadata"
    );
    const formRecordItems = allItems.filter((item) =>
      item.ChunkIndex?.S.startsWith("FormRecords_")
    );

    if (metadataItem?.Metadata?.S) {
      try {
        existingMetadata = JSON.parse(metadataItem.Metadata.S);
      } catch (e) {
        console.warn("Failed to parse Metadata:", e);
      }
      createdAt = metadataItem.CreatedAt?.S || createdAt;
    }

    if (formRecordItems.length > 0) {
      try {
        const sortedChunks = formRecordItems.sort((a, b) => {
          const aNum = parseInt(a.ChunkIndex.S.split("_")[1]);
          const bNum = parseInt(b.ChunkIndex.S.split("_")[1]);
          return aNum - bNum;
        });
        const expectedChunks = sortedChunks.length;
        for (let i = 0; i < expectedChunks; i++) {
          if (
            !sortedChunks.some(
              (item) => item.ChunkIndex.S === `FormRecords_${i}`
            )
          ) {
            console.warn(`Missing chunk FormRecords_${i}`);
            formRecords = [];
            break;
          }
        }
        const combinedFormRecords = sortedChunks
          .map((item) => item.FormRecords.S)
          .join("");
        formRecords = JSON.parse(combinedFormRecords);
      } catch (e) {
        console.warn("Failed to parse FormRecords chunks:", e);
        formRecords = [];
      }
    }

    let formVersion = null;
    let formIndex = -1;
    for (let i = 0; i < formRecords.length; i++) {
      formVersion = formRecords[i].FormVersions.find(
        (v) => v.Id === formVersionId
      );
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

    const formRecordsString = JSON.stringify(formRecords);
    const CHUNK_SIZE = 370000;
    const chunks = [];
    for (let i = 0; i < formRecordsString.length; i += CHUNK_SIZE) {
      chunks.push(formRecordsString.slice(i, i + CHUNK_SIZE));
    }

    let writeRequests = [
      {
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: "Metadata" },
            InstanceUrl: { S: cleanedInstanceUrl },
            Metadata: { S: JSON.stringify(existingMetadata) },
            CreatedAt: { S: createdAt },
            UpdatedAt: { S: new Date().toISOString() },
          },
        },
      },
      ...chunks.map((chunk, index) => ({
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: `FormRecords_${index}` },
            FormRecords: { S: chunk },
            CreatedAt: { S: new Date().toISOString() },
            UpdatedAt: { S: new Date().toISOString() },
          },
        },
      })),
    ];

    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: { [METADATA_TABLE_NAME]: writeRequests },
      })
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error.message || "Failed to delete condition",
      }),
    };
  }
};
