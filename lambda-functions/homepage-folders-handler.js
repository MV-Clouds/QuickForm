import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand
} from '@aws-sdk/client-dynamodb';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({});
const METADATA_TABLE_NAME = 'SalesforceChunkData';

// Helper response functions
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

const errorResponse = (message, details = {}) => ({
  statusCode: 400,
  headers,
  body: JSON.stringify({ error: message, details }),
});

const successResponse = (data) => ({
  statusCode: 200,
  headers,
  body: JSON.stringify(data)
});

// ------------------ REUSABLE EXISTING ------------------
const bulkDeleteFolders = async (instanceUrl, folderIds, authHeaders) => {
  if (!folderIds.length) return;
  const recordsToDelete = folderIds.map(id => ({
    method: "DELETE",
    url: `/services/data/v60.0/sobjects/Folder__c/${id}`,
    referenceId : `FolderDelete_${id}`
  }));
  console.log('Records to delete:', recordsToDelete)
  const compositeBody = { allOrNone: true, compositeRequest: recordsToDelete };
  const res = await fetch(`${instanceUrl}/services/data/v60.0/composite`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(compositeBody)
  });
  console.log('Bulk delete response:', await res.json());
  if (!res.ok) {
    let error = {};
    try { error = await res.json(); } catch { }
    console.error('Bulk delete failed:', error);
    throw new Error("Bulk delete failed");
  }
};
// ------------------ NEW SEPARATE FUNCTIONS ------------------

// Bulk delete handler
const handleBulkDelete = async ({ userId, instanceUrl, folderIds, token }) => {
  if (!folderIds?.length) return errorResponse("No folderIds provided");

  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log("Bulk deleting folders:", folderIds);
  // 1) Delete in Salesforce
  await bulkDeleteFolders(instanceUrl, folderIds, authHeaders);
  console.log("Bulk delete successful");
  // 2) Update DynamoDB
  const metadataItem = await getMetadataItem(userId);
  if (!metadataItem) return errorResponse("Metadata not found");

  const existingFolders = JSON.parse(metadataItem.Folders?.S || '[]');
  const updatedFolders = existingFolders.filter(f => !folderIds.includes(f.Id));

  await dynamoClient.send(new PutItemCommand({
    TableName: METADATA_TABLE_NAME,
    Item: {
      UserId: { S: userId },
      ChunkIndex: { S: 'Metadata' },
      InstanceUrl: { S: metadataItem?.InstanceUrl?.S || instanceUrl },
      Metadata: { S: metadataItem?.Metadata.S || '' },
      CreatedAt: { S: metadataItem?.CreatedAt?.S || new Date().toISOString() },
      UpdatedAt: { S: new Date().toISOString() },
      UserProfile: { S: metadataItem?.UserProfile?.S || '' },
      Folders: { S: JSON.stringify(updatedFolders) }
    },
  }));

  return successResponse({ message: "Bulk delete successful", deleted: folderIds });
};

// Toggle Favorite handler
const handleToggleFavorite = async ({ userId, instanceUrl, folderId, token }) => {
  if (!folderId) return errorResponse("folderId required");

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  console.log(`Toggling favorite for folderId: ${folderId}`);
  // Get metadata
  const metadataItem = await getMetadataItem(userId);
  if (!metadataItem) return errorResponse("Metadata not found");

  const existingFolders = JSON.parse(metadataItem.Folders?.S || '[]');
  const folder = existingFolders.find(f => f.Id === folderId[0]);
  console.log('Folder found in cache:', folder);
  if (!folder) return errorResponse("Folder not found in cache");

  const newFavoriteVal = !folder.IsFavorite__c || false;

  // 1) Update in Salesforce
  const favRes = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Folder__c/${folderId[0]}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ IsFavorite__c: newFavoriteVal })
  });
  const responseBody = await favRes.text();
  console.log('Salesforce favorite update response:', responseBody);
  if (!favRes.ok) {
    let error = {};
    try { error = await favRes.json(); } catch {}
    console.error("Failed to toggle favorite:", error);
    return errorResponse("Failed Salesforce favorite update", error);
  }

  // 2) Update in DynamoDB
  const updatedFolders = existingFolders.map(f => {
    if (f.Id === folderId[0]) return { ...f, IsFavorite__c: newFavoriteVal };
    return f;
  });

  await dynamoClient.send(new PutItemCommand({
    TableName: METADATA_TABLE_NAME,
    Item: {
      UserId: { S: userId },
      ChunkIndex: { S: 'Metadata' },
      InstanceUrl: { S: metadataItem.InstanceUrl?.S || instanceUrl },
      Metadata: { S: metadataItem?.Metadata?.S || '' },
      CreatedAt: { S: metadataItem?.CreatedAt.S || new Date().toISOString() },
      UpdatedAt: { S: new Date().toISOString() },
      UserProfile: { S: metadataItem?.UserProfile.S || '' },
      Folders: { S: JSON.stringify(updatedFolders) }
    },
  }));

  return successResponse({ message: "Favorite toggled", folderId, isFavorite: newFavoriteVal });
};
// Bulk toggle favorite in Salesforce
const bulkToggleFavoriteFolders = async (instanceUrl, folderIds, favoriteValue, authHeaders) => {
  if (!folderIds.length) return;

  const recordsToUpdate = folderIds.map(id => ({
    method: "PATCH",
    url: `/services/data/v60.0/sobjects/Folder__c/${id}`,
    body: { IsFavorite__c: favoriteValue },
    referenceId: `FolderFavUpdate_${id}`
  }));

  console.log("Bulk toggle request to Salesforce:", recordsToUpdate);

  const compositeBody = {
    allOrNone: true,
    compositeRequest: recordsToUpdate
  };

  const res = await fetch(`${instanceUrl}/services/data/v60.0/composite`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(compositeBody)
  });

  const responseJson = await res.json();
  console.log("Bulk toggle Salesforce response:", responseJson);

  if (!res.ok) {
    console.error("Bulk toggle favorite failed:", responseJson);
    throw new Error("Salesforce bulk favorite toggle failed");
  }

  return responseJson;
};

// ------------------ NEW BULK HANDLER ------------------
const handleBulkToggleFavorite = async ({ userId, instanceUrl, folderId, token }) => {
  const folderIds = folderId || [];
  if (!folderIds?.length) return errorResponse("No folderIds provided");

  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log("Bulk toggling favorite for folders:", folderIds);

  // Get metadata
  const metadataItem = await getMetadataItem(userId);
  if (!metadataItem) return errorResponse("Metadata not found");

  const existingFolders = JSON.parse(metadataItem.Folders?.S || '[]');

  // Determine target favorite value from the first folder
  const firstFolder = existingFolders.find(f => folderIds.includes(f.Id));
  if (!firstFolder) return errorResponse("First folder not found in cache");

  const newFavoriteVal = !firstFolder.IsFavorite__c || false;

  // 1) Bulk update in Salesforce
  await bulkToggleFavoriteFolders(instanceUrl, folderIds, newFavoriteVal, authHeaders);

  // 2) Update DynamoDB cache
  const updatedFolders = existingFolders.map(f => {
    if (folderIds.includes(f.Id)) return { ...f, IsFavorite__c: newFavoriteVal };
    return f;
  });

  await dynamoClient.send(new PutItemCommand({
    TableName: METADATA_TABLE_NAME,
    Item: {
      UserId: { S: userId },
      ChunkIndex: { S: 'Metadata' },
      InstanceUrl: { S: metadataItem.InstanceUrl?.S || instanceUrl },
      Metadata: { S: metadataItem?.Metadata?.S || '' },
      CreatedAt: { S: metadataItem?.CreatedAt?.S || new Date().toISOString() },
      UpdatedAt: { S: new Date().toISOString() },
      UserProfile: { S: metadataItem?.UserProfile?.S || '' },
      Folders: { S: JSON.stringify(updatedFolders) }
    },
  }));

  return successResponse({
    message: "Bulk favorite toggled",
    folderIds,
    isFavorite: newFavoriteVal
  });
};

// Helper function: Query DynamoDB for user metadata item
const getMetadataItem = async (userId) => {
  console.log(`Fetching metadata for userId: ${userId}`);
  const allItems = [];
  let ExclusiveStartKey = undefined;

  do {
    console.log('Querying DynamoDB items with ExclusiveStartKey:', ExclusiveStartKey);
    const queryRes = await dynamoClient.send(
      new QueryCommand({
        TableName: METADATA_TABLE_NAME,
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
        },
        ExclusiveStartKey,
      })
    );

    if (queryRes.Items) {
      console.log(`Retrieved ${queryRes.Items.length} items.`);
      allItems.push(...queryRes.Items);
    }

    ExclusiveStartKey = queryRes.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  const metadataItem = allItems.find(item => item.ChunkIndex?.S === 'Metadata');
  console.log('Metadata item found:', !!metadataItem);
  return metadataItem;
};

// Main Lambda handler
export const handler = async (event) => {
  console.log('Request event:', JSON.stringify(event));

  try {
    // Parse request body if string
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { userId, instanceUrl } = body || {};
    const method = (event.httpMethod || '').toUpperCase();
    const stage = event.requestContext?.stage; // GET /bulkFolder or /toggleFavorite
    console.log(`Method: ${method}, Stage: ${stage}`);
    // Extract Authorization token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      console.error('Missing Authorization header');
      return errorResponse('Missing Authorization header');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Invalid Authorization header format');
      return errorResponse('Invalid Authorization header format');
    }
    if (method === "POST" && stage === "bulkFolder") {
      console.log('Handling bulk delete');
      console.log('Body:', body)
      return await handleBulkDelete({
        userId: body.userId,
        instanceUrl: body.instanceUrl,
        folderIds: body.selectedFolderIds,
        token
      });
      console.log('Bulk delete handled');
    }
    
    if (method === "POST" && stage === "toggleFavorite") {
      console.log('Handling toggle favorite');  
      return await handleBulkToggleFavorite({
        userId: body.userId,
        instanceUrl: body.instanceUrl,
        folderId: body.selectedFolderIds,
        token
      });
    }
    const accessToken = token;

    // Sanitize instance URL (strip protocol)
    const cleanedInstanceUrl = instanceUrl?.replace(/^https?:\/\//, '');
    console.log(`Cleaned instanceUrl: ${cleanedInstanceUrl}`);

    // Prepare Salesforce request headers
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // ========================= POST Method: Create or Update Folder =========================
    if (method === "POST") {
      console.log('Handling POST method');

      const {
        folderName,
        description = "",
        parentFolderId = null,
        folderId = null,
        formIds = ''
      } = body;

      if (!folderName) {
        console.error('Missing folderName in POST request');
        return errorResponse("Missing folderName");
      }

      // If both folderId and parentFolderId are provided, treat POST as UPDATE
      if (folderId && parentFolderId) {
        console.log(`Updating folder with folderId: ${folderId}, parentFolderId: ${parentFolderId}`);
        const metadataItem = await getMetadataItem(userId);
        if (!metadataItem) return errorResponse('Metadata not found');

        const existingFolders = JSON.parse(metadataItem.Folders?.S || '[]');
        // Check duplicate name at same parent level
        const duplicateFolder = existingFolders.find(f =>
          f.Id !== folderId &&
          f.Name?.trim().toLowerCase() === folderName.trim().toLowerCase() &&
          (f.Parent_Folder__c || '') === (parentFolderId || '')
        );

        if (duplicateFolder) {
          return errorResponse(`Folder with name "${folderName}" already exists at the same level`);
        }
        // 1) Update Salesforce Folder__c record
        const updateRes = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Folder__c/${folderId}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({
            Name: folderName,
            Description__c: description,
            Parent_Folder__c: parentFolderId || null,
            FormIds__c: formIds
          })
        });

        if (!updateRes.ok) {
          let error = {};
          try { error = await updateRes.json(); } catch { }
          console.error('Failed to update Folder__c in Salesforce:', error);
          return errorResponse("Failed to update Folder__c", error);
        }

        // 2) Update folder list in DynamoDB metadata
        const updatedFolders = existingFolders.map(folder => {
          if (folder.Id === folderId) {
            return {
              ...folder,
              Name: folderName,
              Description__c: description,
              Parent_Folder__c: parentFolderId || '',
              FormIds: formIds
            };
          }
          return folder;
        });

        const now = new Date().toISOString();

        await dynamoClient.send(new PutItemCommand({
          TableName: METADATA_TABLE_NAME,
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: 'Metadata' },
            InstanceUrl: { S: cleanedInstanceUrl },
            Metadata: { S: metadataItem?.Metadata.S },
            CreatedAt: { S: metadataItem?.CreatedAt.S },
            UpdatedAt: { S: now },
            UserProfile: { S: metadataItem?.UserProfile.S },
            Folders: { S: JSON.stringify(updatedFolders) },
          },
        }));

        console.log('Folder updated successfully via POST');
        return successResponse({ message: "Folder updated via POST", folderId });
      }

      // Otherwise, create new folder

      console.log('Creating new Folder__c in Salesforce');
      // Fetch metadata before create/update to validate
      const metadataItem = await getMetadataItem(userId);
      if (!metadataItem) return errorResponse('Metadata not found for duplicate check');

      const existingFolders = JSON.parse(metadataItem.Folders?.S || '[]');

      // Check duplicate name at same parent level
      const duplicateFolder = existingFolders.find(f =>
        f.Name?.trim().toLowerCase() === folderName.trim().toLowerCase() &&
        (f.Parent_Folder__c || '') === (parentFolderId || '')
      );

      if (duplicateFolder) {
        return errorResponse(`Folder with name "${folderName}" already exists at the same level`);
      }

      // 1) Create Folder__c record in Salesforce
      const createRes = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Folder__c`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          Name: folderName,
          Description__c: description,
          Parent_Folder__c: parentFolderId || null,
          FormIds__c: formIds.join(",")
        })
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        console.error('Failed to create Folder__c in Salesforce:', createData);
        return errorResponse("Failed to create Folder__c", createData);
      }

      const newFolderId = createData.id;
      console.log('New Folder__c created with id:', newFolderId);

      // 2) Update DynamoDB metadata with new folder info
      const folderData = {
        Id: newFolderId,
        Name: folderName,
        Description__c: description,
        Parent_Folder__c: parentFolderId || "",
        FormIds: formIds.length ? formIds.join(",") : ""
      };
      console.log('Folder data to be stored:', folderData);
      // // Fetch metadata for userId from DynamoDB
      // let allItems = [];
      // let ExclusiveStartKey = undefined;
      // do {
      //   const queryResponse = await dynamoClient.send(
      //     new QueryCommand({
      //       TableName: METADATA_TABLE_NAME,
      //       KeyConditionExpression: 'UserId = :userId',
      //       ExpressionAttributeValues: {
      //         ':userId': { S: userId },
      //       },
      //       ExclusiveStartKey,
      //     })
      //   );

      //   if (queryResponse.Items) {
      //     allItems.push(...queryResponse.Items);
      //   }

      //   ExclusiveStartKey = queryResponse.LastEvaluatedKey;
      // } while (ExclusiveStartKey);

      // if (allItems.length === 0) {
      //   console.error('No metadata found for this user and instance');
      //   return {
      //     statusCode: 404,
      //     headers,
      //     body: JSON.stringify({ error: 'Metadata not found for this user and instance' }),
      //   };
      // }
      // console.log(`Fetched ${allItems.length} items from DynamoDB`);
      // const metadataItem = allItems.find(item => item.ChunkIndex?.S === 'Metadata');
      // console.log('Metadata item found:', !!metadataItem, metadataItem);
      if (accessToken) {
        const now = new Date().toISOString();
        const existingFolders = metadataItem?.Folders?.S
          ? JSON.parse(metadataItem.Folders.S)
          : [];

        const updatedFolders = [...existingFolders, folderData];
        console.log('Updated folders:', updatedFolders);
        console.log('Metadata item:', cleanedInstanceUrl);
        await dynamoClient.send(new PutItemCommand({
          TableName: METADATA_TABLE_NAME,
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: 'Metadata' },
            InstanceUrl: { S: cleanedInstanceUrl },
            Metadata: { S: metadataItem?.Metadata.S },
            CreatedAt: { S: metadataItem?.CreatedAt?.S || now },
            UpdatedAt: { S: now },
            UserProfile: { S: metadataItem?.UserProfile?.S },
            Folders: { S: JSON.stringify(updatedFolders) }
          }
        }));

        console.log('Folder created and metadata updated in DynamoDB');
        return successResponse({ message: "Folder created", folderId: newFolderId });
      }
    }

    // ========================= PATCH Method: Update Folder =========================
    if (method === "PATCH") {
      console.log('Handling PATCH method');

      const {
        folderId,
        folderName,
        description = "",
        parentFolderId = null,
        formIds = [] // array of string ids
      } = body;

      if (!folderId) {
        console.error('Missing folderId in PATCH request');
        return errorResponse("Missing folderId");
      }

      console.log(`Updating Folder__c with folderId: ${folderId}`);

      // 1) Update Folder__c in Salesforce
      const updateRes = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Folder__c/${folderId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          ...(folderName !== undefined ? { Name: folderName } : {}),
          Description__c: description,
          Parent_Folder__c: parentFolderId || null,
          FormIds__c: formIds.join(",")
        })
      });

      if (!updateRes.ok) {
        let error = {};
        try { error = await updateRes.json(); } catch { }
        console.error('Failed to update Folder__c in Salesforce:', error);
        return errorResponse("Failed to update Folder__c", error);
      }

      // 2) Update folder in DynamoDB metadata
      const metadataItem = await getMetadataItem(userId);
      if (!metadataItem) {
        console.error('Metadata not found for user in PATCH');
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Metadata not found' }),
        };
      }

      const existingFolders = JSON.parse(metadataItem.Folders?.S || '[]');

      // Note: corrected folder id variable case - folderId not FolderId
      const updatedFolders = existingFolders.map(folder => {
        if (folder.Id === folderId) {
          return {
            ...folder,
            Name: folderName,
            Description__c: description,
            Parent_Folder__c: parentFolderId || '',
            FormIds__c: formIds.join(',')
          };
        }
        return folder;
      });

      const now = new Date().toISOString();

      await dynamoClient.send(new PutItemCommand({
        TableName: METADATA_TABLE_NAME,
        Item: {
          UserId: { S: userId },
          ChunkIndex: { S: 'Metadata' },
          InstanceUrl: { S: cleanedInstanceUrl },
          Metadata: { S: metadataItem?.Metadata.S },
          CreatedAt: { S: metadataItem?.CreatedAt.S },
          UpdatedAt: { S: now },
          UserProfile: { S: metadataItem?.UserProfile.S },
          Folders: { S: JSON.stringify(updatedFolders) },
        },
      }));

      console.log('Folder updated successfully via PATCH');
      return successResponse({ message: "Folder updated", folderId });
    }

    // ========================= DELETE Method: Delete Folder =========================
    if (method === "DELETE") {
      console.log('Handling DELETE method');
      const { userId: deleteUserId, instanceUrl: deleteInstanceUrl, folderId } = event.queryStringParameters || {};

      if (!folderId) {
        console.error('Missing folderId in DELETE request');
        return errorResponse("Missing folderId");
      }

      // Sanitize instanceUrl used in delete
      const cleanedDeleteInstanceUrl = deleteInstanceUrl?.replace(/^https?:\/\//, '');

      console.log(`Deleting folder with folderId: ${folderId} for userId: ${deleteUserId}`);

      // 1) Delete Folder__c in Salesforce
      const delRes = await fetch(`${deleteInstanceUrl}/services/data/v60.0/sobjects/Folder__c/${folderId}`, {
        method: "DELETE",
        headers: authHeaders
      });

      if (!delRes.ok) {
        let error = {};
        try { error = await delRes.json(); } catch { }
        console.error('Failed to delete Folder__c in Salesforce:', error);
        return errorResponse("Failed to delete Folder__c", error);
      }
      console.log('Folder deleted successfully from Salesforce');

      const metadataItem = await getMetadataItem(deleteUserId);
      if (!metadataItem) {
        console.error('Metadata not found for user in DELETE');
        return errorResponse('Metadata not found');
      }
      const existingFolders = JSON.parse(metadataItem.Folders?.S || '[]');
      const updatedFolders = existingFolders
        .filter(folder => folder.Id !== folderId)
        .map(folder => {
          if (folder.Parent_Folder__c) {
            const parents = folder.Parent_Folder__c.split(',');
            // If the folder has ONLY the deleted parent → delete the whole folder
            if (parents.length === 1 && parents[0] === folderId) {
              return null; // mark for removal
            }
            // Else → just remove the deleted parentId from list
            if (parents.includes(folderId)) {
              return { ...folder, Parent_Folder__c: parents.filter(p => p !== folderId).join(',') };
            }
          }
          return folder;
        })
        .filter(Boolean); // remove null entries

      const removedFolderIds = existingFolders
        .filter(f => f.Id !== folderId && f.Parent_Folder__c?.split(',').length === 1 && f.Parent_Folder__c === folderId)
        .map(f => f.Id);

      // Perform bulk delete if needed
      if (removedFolderIds.length) {
        await bulkDeleteFolders(deleteInstanceUrl, removedFolderIds, authHeaders);
      }
      //  Prepare updated child folders
      const updatedChildFolders = updatedFolders.map(f => ({
        attributes: { type: "Folder__c" },
        Id: f.Id,
        Parent_Folder__c: f.Parent_Folder__c
          ?.split(",")
          .filter(id => id !== folderId)
          .join(",")
      }));
      console.log('Updated child folders:', updatedChildFolders);
      // 5️⃣ Make a single composite batch PATCH request to Salesforce
      if (updatedChildFolders.length > 0) {
        console.log(`Updating ${updatedChildFolders.length} child folders in one batch`);
        const compositeRes = await fetch(`${deleteInstanceUrl}/services/data/v60.0/composite/sobjects`, {
          method: "PATCH",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ allOrNone: true, records: updatedChildFolders })
        });

        if (!compositeRes.ok) {
          let error = {};
          try { error = await compositeRes.json(); } catch { }
          console.error('Failed to update child folders:', error);
          return errorResponse("Failed to update child folders", error);
        }
      }
      // 2) Remove folder from DynamoDB metadata
      const now = new Date().toISOString();

      await dynamoClient.send(new PutItemCommand({
        TableName: METADATA_TABLE_NAME,
        Item: {
          UserId: { S: deleteUserId },
          ChunkIndex: { S: 'Metadata' },
          InstanceUrl: { S: cleanedDeleteInstanceUrl },
          Metadata: { S: metadataItem?.Metadata.S },
          CreatedAt: { S: metadataItem?.CreatedAt.S },
          UpdatedAt: { S: now },
          UserProfile: { S: metadataItem?.UserProfile.S },
          Folders: { S: JSON.stringify(updatedFolders) },
        },
      }));

      console.log('Folder deleted successfully');
      return successResponse({ message: "Folder deleted", folderId });
    }

    // ========================= Unknown HTTP Method =========================
    console.error('Unknown httpMethod/action:', method);
    return errorResponse("Unknown httpMethod/action");

  } catch (error) {
    console.error('Server error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error", details: error.message }),
    };
  }
};
