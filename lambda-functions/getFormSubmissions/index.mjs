import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Query Salesforce with proper error handling and URL construction
 */
async function querySalesforce(instanceUrl, token, soql) {
  try {
    // Ensure instanceUrl has https protocol
    const baseUrl = instanceUrl.startsWith("https://")
      ? instanceUrl
      : `https://${instanceUrl}`;
    const encodedQuery = encodeURIComponent(soql);
    const url = `${baseUrl}/services/data/v60.0/query?q=${encodedQuery}`;

    console.log(`Executing SOQL: ${soql}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Salesforce query failed: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Salesforce query failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get access token for Salesforce API calls
 */
async function getAccessToken(userId, instanceUrl) {
  try {
    const tokenUrl =
      process.env.GET_ACCESS_TOKEN_URL ||
      "https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/prod/getAccessToken";

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, instanceUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to fetch access token: ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error("No access token returned from authentication service");
    }

    return data.access_token;
  } catch (error) {
    console.error(`Failed to get access token: ${error.message}`);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Update submission status in Salesforce
 */
async function updateSubmissionStatus(
  instanceUrl,
  token,
  submissionId,
  status
) {
  try {
    const baseUrl = instanceUrl.startsWith("https://")
      ? instanceUrl
      : `https://${instanceUrl}`;

    const url = `${baseUrl}/services/data/v60.0/sobjects/Submission__c/${submissionId}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Status__c: status,
      }),
    });

    if (response.ok) {
      console.log(
        `Successfully updated submission status: ${submissionId} to ${status}`
      );
      return { success: true };
    } else {
      const errorData = await response.json();
      console.error(
        `Failed to update submission status ${submissionId}:`,
        errorData
      );
      return {
        success: false,
        error: errorData.message || `Update failed: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(`Error updating submission status ${submissionId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Update submission archive status in Salesforce
 */
async function updateSubmissionArchiveStatus(
  instanceUrl,
  token,
  submissionId,
  archived
) {
  try {
    const baseUrl = instanceUrl.startsWith("https://")
      ? instanceUrl
      : `https://${instanceUrl}`;

    const url = `${baseUrl}/services/data/v60.0/sobjects/Submission__c/${submissionId}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Archived__c: archived,
      }),
    });

    if (response.ok) {
      console.log(
        `Successfully updated submission archive status: ${submissionId} to ${archived}`
      );
      return { success: true };
    } else {
      const errorData = await response.json();

      // Check if the error is due to missing Archived__c field
      if (errorData.message && errorData.message.includes("Archived__c")) {
        console.warn(
          `Archived__c field not found in Submission object. Please add this field to your Salesforce schema.`
        );
        return {
          success: false,
          error:
            "Archive functionality requires the 'Archived__c' checkbox field to be added to the Submission object in Salesforce.",
        };
      }

      console.error(
        `Failed to update submission archive status ${submissionId}:`,
        errorData
      );
      return {
        success: false,
        error: errorData.message || `Update failed: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(
      `Error updating submission archive status ${submissionId}:`,
      error
    );
    return { success: false, error: error.message };
  }
}

/**
 * Delete files from AWS S3
 */
async function deleteFilesFromAWS(fileUrls) {
  try {
    console.log(`Deleting ${fileUrls.length} files from AWS:`, fileUrls);

    const s3Client = new S3Client({ region: "us-east-1" });
    const bucketName = "quickform-images";

    const deleteResults = [];

    for (const fileUrl of fileUrls) {
      try {
        // Extract the key from the S3 URL
        // URL format: https://quickform-images.s3.us-east-1.amazonaws.com/1234567890_filename.ext
        const urlParts = fileUrl.split("/");
        const key = urlParts[urlParts.length - 1]; // Get the last part (filename with timestamp)

        if (!key || key === fileUrl) {
          // If we can't extract a proper key, skip this file
          deleteResults.push({
            url: fileUrl,
            success: false,
            error: "Could not extract S3 key from URL",
          });
          continue;
        }

        const deleteParams = {
          Bucket: bucketName,
          Key: key,
        };

        const deleteCommand = new DeleteObjectCommand(deleteParams);
        await s3Client.send(deleteCommand);

        deleteResults.push({
          url: fileUrl,
          success: true,
          message: `Successfully deleted ${key} from S3`,
        });

        console.log(`Successfully deleted file: ${key}`);
      } catch (fileError) {
        console.error(`Error deleting file ${fileUrl}:`, fileError);
        deleteResults.push({
          url: fileUrl,
          success: false,
          error: fileError.message,
        });
      }
    }

    return deleteResults;
  } catch (error) {
    console.error("Error in deleteFilesFromAWS:", error);
    return fileUrls.map((url) => ({
      url,
      success: false,
      error: error.message,
    }));
  }
}

/**
 * Delete submissions from Salesforce
 */
async function deleteSubmissions(instanceUrl, token, submissionIds) {
  try {
    const baseUrl = instanceUrl.startsWith("https://")
      ? instanceUrl
      : `https://${instanceUrl}`;
    const deleteResults = [];

    console.log(`Deleting ${submissionIds.length} submissions`);

    // Delete submissions one by one (Salesforce doesn't support bulk delete via REST API easily)
    for (const submissionId of submissionIds) {
      try {
        const url = `${baseUrl}/services/data/v60.0/sobjects/Submission__c/${submissionId}`;

        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          deleteResults.push({ id: submissionId, success: true });
          console.log(`Successfully deleted submission: ${submissionId}`);
        } else {
          const errorData = await response.json();
          deleteResults.push({
            id: submissionId,
            success: false,
            error: errorData.message || `Delete failed: ${response.status}`,
          });
          console.error(
            `Failed to delete submission ${submissionId}:`,
            errorData
          );
        }
      } catch (error) {
        deleteResults.push({
          id: submissionId,
          success: false,
          error: error.message,
        });
        console.error(`Error deleting submission ${submissionId}:`, error);
      }
    }

    return deleteResults;
  } catch (error) {
    console.error(`Delete operation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main Lambda handler
 *
 * OPTIMIZED APPROACH:
 * 1. Makes only 3 SOQL callouts for efficiency:
 *    - Callout 1: Get form details and ALL form versions
 *    - Callout 2: Get ALL form fields for ALL versions (crucial for proper mapping)
 *    - Callout 3: Get ALL submissions for the form (across all versions)
 * 2. Frontend handles filtering by version on the client side
 * 3. Proper field mapping per version since each version has different field IDs
 * 4. This reduces API calls and improves performance while handling schema correctly
 */
export const handler = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  // Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      },
      body: "",
    };
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody =
        typeof event.body === "string"
          ? JSON.parse(event.body)
          : event.body || {};
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError.message);
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
      };
    }

    const { userId, instanceUrl, formVersionId, formId, accessToken } =
      requestBody;

    // Support both formId and formVersionId for backward compatibility
    const targetFormVersionId = formVersionId;
    const targetFormId = formId;

    // Validate required parameters
    if (!userId || !instanceUrl || (!targetFormVersionId && !targetFormId)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        body: JSON.stringify({
          error: "Missing required parameters",
          required: ["userId", "instanceUrl", "formVersionId or formId"],
          received: {
            userId: !!userId,
            instanceUrl: !!instanceUrl,
            formVersionId: !!targetFormVersionId,
            formId: !!targetFormId,
          },
        }),
      };
    }

    // Get access token (use provided token or fetch new one)
    let token = accessToken;
    if (!token) {
      console.log("No access token provided, fetching new one...");
      token = await getAccessToken(userId, instanceUrl);
    }

    // Handle PATCH operation (update submission status or archive)
    if (event.httpMethod === "PATCH") {
      const { submissionId, status, archived } = requestBody;

      if (!submissionId || (!status && archived === undefined)) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          },
          body: JSON.stringify({
            error: "Missing required parameters",
            required: ["submissionId", "status or archived"],
          }),
        };
      }

      let updateResult;
      if (status) {
        updateResult = await updateSubmissionStatus(
          instanceUrl,
          token,
          submissionId,
          status
        );
      } else if (archived !== undefined) {
        updateResult = await updateSubmissionArchiveStatus(
          instanceUrl,
          token,
          submissionId,
          archived
        );
      }

      return {
        statusCode: updateResult.success ? 200 : 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        },
        body: JSON.stringify(updateResult),
      };
    }

    // Handle DELETE operation
    if (event.httpMethod === "DELETE") {
      const { submissionIds } = requestBody;

      if (
        !submissionIds ||
        !Array.isArray(submissionIds) ||
        submissionIds.length === 0
      ) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          },
          body: JSON.stringify({
            error: "Missing or invalid submissionIds array",
            required: "submissionIds (array of submission IDs)",
          }),
        };
      }

      console.log(`Deleting submissions: ${submissionIds.join(", ")}`);

      // First, fetch the submissions to be deleted to collect file URLs
      const submissionsToDeleteSoql = `
        SELECT Id, Submission_Data__c 
        FROM Submission__c 
        WHERE Id IN ('${submissionIds.join("','")}')
      `;

      const submissionsToDeleteResponse = await querySalesforce(
        instanceUrl,
        token,
        submissionsToDeleteSoql
      );

      const submissionsToDeleteRecords =
        submissionsToDeleteResponse.records || [];
      const fileUrls = [];

      // Collect file URLs from submissions that will be deleted
      submissionsToDeleteRecords.forEach((sub) => {
        let parsedData = {};
        if (sub.Submission_Data__c) {
          try {
            parsedData = JSON.parse(sub.Submission_Data__c);
          } catch (parseError) {
            console.warn(
              `Failed to parse submission data for ${sub.Id}: ${parseError.message}`
            );
          }
        }

        Object.values(parsedData || {}).forEach((value) => {
          if (typeof value === "string") {
            // Check if it's an S3 URL from our quickform-images bucket
            if (
              value.includes("quickform-images.s3.") ||
              value.includes("quickform-images.s3-") ||
              (value.startsWith("https://") &&
                value.includes("amazonaws.com") &&
                value.includes("quickform"))
            ) {
              fileUrls.push(value);
            }
          } else if (Array.isArray(value)) {
            // Handle arrays of file URLs (for multiple file uploads)
            value.forEach((item) => {
              if (
                typeof item === "string" &&
                (item.includes("quickform-images.s3.") ||
                  item.includes("quickform-images.s3-") ||
                  (item.startsWith("https://") &&
                    item.includes("amazonaws.com") &&
                    item.includes("quickform")))
              ) {
                fileUrls.push(item);
              }
            });
          }
        });
      });

      // Delete files from AWS if any exist
      if (fileUrls.length > 0) {
        console.log(`Found ${fileUrls.length} files to delete from AWS`);
        await deleteFilesFromAWS(fileUrls);
      }

      const deleteResults = await deleteSubmissions(
        instanceUrl,
        token,
        submissionIds
      );
      const successCount = deleteResults.filter(
        (result) => result.success
      ).length;
      const failureCount = deleteResults.length - successCount;

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        },
        body: JSON.stringify({
          success: true,
          message: `Deleted ${successCount} of ${deleteResults.length} submissions`,
          results: deleteResults,
          filesDeleted: fileUrls.length,
          summary: {
            total: deleteResults.length,
            successful: successCount,
            failed: failureCount,
          },
        }),
      };
    }

    let actualFormVersionId = targetFormVersionId;
    let formVersions = [];
    let actualFormId = targetFormId;

    // Optimized approach: Make only 2 callouts as requested
    // 1. Get all form versions for the form (not just draft)
    // 2. Get all submissions for the form (not version-specific)

    if (targetFormId) {
      console.log(`Fetching all form versions for form: ${targetFormId}`);
      actualFormId = targetFormId;
    } else if (targetFormVersionId) {
      // If only formVersionId is provided, get the form ID first
      console.log(`Getting form ID from form version: ${targetFormVersionId}`);

      const formVersionSoql = `
        SELECT Id, Form__c 
        FROM Form_Version__c 
        WHERE Id = '${targetFormVersionId}'
      `;

      const formVersionResponse = await querySalesforce(
        instanceUrl,
        token,
        formVersionSoql
      );

      if (
        formVersionResponse.records &&
        formVersionResponse.records.length > 0
      ) {
        actualFormId = formVersionResponse.records[0].Form__c;
        actualFormVersionId = targetFormVersionId;
      } else {
        throw new Error(`Form version not found: ${targetFormVersionId}`);
      }
    }

    if (!actualFormId) {
      throw new Error("No form ID available for processing");
    }

    // CALLOUT 1: Get form details and ALL form versions
    console.log(
      `Fetching form details and ALL form versions for form: ${actualFormId}`
    );

    // First get the form details to find the active version
    const formDetailsSoql = `
      SELECT Id, Name, Active_Version__c
      FROM Form__c 
      WHERE Id = '${actualFormId}'
    `;

    const formDetailsResponse = await querySalesforce(
      instanceUrl,
      token,
      formDetailsSoql
    );

    const formDetails = formDetailsResponse.records?.[0];
    if (!formDetails) {
      throw new Error(`Form not found: ${actualFormId}`);
    }

    const activeVersionFromForm = formDetails.Active_Version__c;
    console.log(
      `Form active version from Form object: ${activeVersionFromForm}`
    );

    // Get all form versions
    const versionsSoql = `
      SELECT Id, Name, Version__c, Stage__c, Form__c, CreatedDate
      FROM Form_Version__c 
      WHERE Form__c = '${actualFormId}' 
      ORDER BY Version__c DESC
    `;

    const versionsResponse = await querySalesforce(
      instanceUrl,
      token,
      versionsSoql
    );
    formVersions = versionsResponse.records || [];

    if (formVersions.length === 0) {
      throw new Error(`No form versions found for form: ${actualFormId}`);
    }

    // Determine which version to use as default
    if (!actualFormVersionId) {
      if (activeVersionFromForm) {
        // Use the active version from Form object
        actualFormVersionId = activeVersionFromForm;
        console.log(
          `Using active version from Form object: ${actualFormVersionId}`
        );
      } else {
        // Fallback: use latest published or latest version
        const publishedVersions = formVersions.filter(
          (v) => v.Stage__c === "Publish"
        );

        if (publishedVersions.length > 0) {
          actualFormVersionId = publishedVersions[0].Id;
          console.log(`Using latest published version: ${actualFormVersionId}`);
        } else {
          actualFormVersionId = formVersions[0].Id;
          console.log(`Using latest version: ${actualFormVersionId}`);
        }
      }
    }

    console.log(
      `Using form version: ${actualFormVersionId} for form: ${actualFormId}`
    );

    // CALLOUT 3: Get ALL form fields for ALL versions of this form
    // This is crucial because each version has different field IDs
    console.log(
      `Fetching ALL form fields for all versions of form: ${actualFormId}`
    );

    const allFieldsSoql = `
      SELECT Id, Name, Field_Type__c, Properties__c, Unique_Key__c, Order_Number__c, Form_Version__c
      FROM Form_Field__c 
      WHERE Form_Version__c IN (
        SELECT Id FROM Form_Version__c WHERE Form__c = '${actualFormId}'
      )
      ORDER BY Form_Version__c, Order_Number__c ASC NULLS LAST, Name ASC
    `;

    const allFieldsResponse = await querySalesforce(
      instanceUrl,
      token,
      allFieldsSoql
    );

    const allFieldRecords = allFieldsResponse.records || [];
    console.log(
      `Found ${allFieldRecords.length} total form fields across all versions`
    );

    // Create version-specific field mappings
    const fieldsByVersion = {}; // { versionId: { fieldId: fieldInfo } }
    const fieldsMap = {}; // For current/active version display
    const allFieldsMap = {}; // For preview modal - all fields from all versions

    // Group fields by version
    allFieldRecords.forEach((field) => {
      const versionId = field.Form_Version__c;

      if (!fieldsByVersion[versionId]) {
        fieldsByVersion[versionId] = {};
      }

      let fieldLabel = field.Name;
      let fieldType = field.Field_Type__c;

      // Try to extract label and type from Properties__c if available
      if (field.Properties__c) {
        try {
          const properties = JSON.parse(field.Properties__c);
          if (properties.label) {
            fieldLabel = properties.label;
          }
          if (properties.type) {
            fieldType = properties.type;
          }
        } catch (parseError) {
          console.warn(
            `Failed to parse Properties__c for field ${field.Id}: ${parseError.message}`
          );
        }
      }

      const fieldInfo = {
        label: fieldLabel || `Field_${field.Id}`,
        type: fieldType,
        properties: field.Properties__c,
        orderNumber: field.Order_Number__c,
        versionId: versionId,
      };

      // Add to version-specific mapping
      fieldsByVersion[versionId][field.Id] = fieldInfo;

      // Add to all fields map for preview (using field ID as key)
      allFieldsMap[field.Id] = fieldInfo;

      // If this field belongs to the active/current version, add to display map
      if (versionId === actualFormVersionId) {
        const staticFieldTypes = [
          "heading",
          "displaytext",
          "divider",
          "pagebreak",
          "formcalculation",
        ];
        const isStaticField =
          fieldType && staticFieldTypes.includes(fieldType.toLowerCase());

        if (!isStaticField) {
          fieldsMap[field.Id] = fieldInfo.label;
        }
      }
    });

    console.log(
      `Created field mappings for ${
        Object.keys(fieldsByVersion).length
      } versions`
    );
    console.log(
      `Active version ${actualFormVersionId} has ${
        Object.keys(fieldsByVersion[actualFormVersionId] || {}).length
      } fields`
    );

    // CALLOUT 2: Get ALL submissions for this form (across all versions)
    // This allows frontend to filter by version as needed
    console.log(`Fetching ALL submissions for form: ${actualFormId}`);

    // Try to include Archived__c field, but handle gracefully if it doesn't exist
    let submissionsSoql = `
      SELECT Id, Name, CreatedDate, LastModifiedDate, Submission_Data__c, Status__c, Form_Version__c, Archived__c 
      FROM Submission__c 
      WHERE Form_Version__c IN (
        SELECT Id FROM Form_Version__c WHERE Form__c = '${actualFormId}'
      )
      ORDER BY CreatedDate DESC
    `;

    // If Archived__c field doesn't exist, fall back to query without it
    let submissionsResponse;
    try {
      submissionsResponse = await querySalesforce(
        instanceUrl,
        token,
        submissionsSoql
      );
    } catch (error) {
      if (
        error.message.includes("Archived__c") ||
        error.message.includes("No such column")
      ) {
        console.log(
          "Archived__c field not found, falling back to query without it"
        );
        submissionsSoql = `
          SELECT Id, Name, CreatedDate, LastModifiedDate, Submission_Data__c, Status__c, Form_Version__c 
          FROM Submission__c 
          WHERE Form_Version__c IN (
            SELECT Id FROM Form_Version__c WHERE Form__c = '${actualFormId}'
          )
          ORDER BY CreatedDate DESC
        `;
        submissionsResponse = await querySalesforce(
          instanceUrl,
          token,
          submissionsSoql
        );
      } else {
        throw error;
      }
    }

    // submissionsResponse is already set above with error handling

    const submissionRecords = submissionsResponse.records || [];
    console.log(`Found ${submissionRecords.length} submissions`);

    // Process submissions data
    const submissions = submissionRecords.map((sub, index) => {
      let parsedData = {};

      if (sub.Submission_Data__c) {
        try {
          parsedData = JSON.parse(sub.Submission_Data__c);
        } catch (parseError) {
          console.error(
            `Failed to parse Submission_Data__c for ${sub.Id}: ${parseError.message}`
          );
          // Keep empty object as fallback
        }
      }

      return {
        id: sub.Id,
        name: sub.Name || `Submission ${index + 1}`,
        submissionDate: sub.CreatedDate,
        lastModified: sub.LastModifiedDate,
        status: sub.Status__c || "Unread",
        archived: sub.Archived__c === true, // Handle undefined/null gracefully
        formVersionId: sub.Form_Version__c,
        data: parsedData,
        index: index + 1,
      };
    });

    // Handle case when no submissions are found
    if (submissions.length === 0) {
      console.log(
        `No submissions found for form version: ${actualFormVersionId}`
      );
    }

    // Return successful response
    const response = {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      },
      body: JSON.stringify({
        success: true,
        submissions,
        fields: fieldsMap, // Fields for current/active version (for table display)
        allFields: allFieldsMap, // All fields from all versions (for preview)
        fieldsByVersion: fieldsByVersion, // Version-specific field mappings
        formVersions: formVersions.map((v) => ({
          id: v.Id,
          name: v.Name,
          version: v.Version__c,
          stage: v.Stage__c,
          createdDate: v.CreatedDate,
          isActive: v.Stage__c === "Publish",
        })),
        metadata: {
          totalCount: submissions.length,
          formVersionId: actualFormVersionId,
          formId: actualFormId,
          activeVersionId: actualFormVersionId,
          fetchedAt: new Date().toISOString(),
        },
      }),
    };

    console.log(`Successfully returned ${submissions.length} submissions`);
    return response;
  } catch (error) {
    console.error("Lambda execution error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

// Test function for local development (uncomment to test locally)
/*
async function testLocally() {
  const testEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
      userId: 'your-test-user-id',
      instanceUrl: 'your-salesforce-instance.salesforce.com',
      formVersionId: 'your-test-form-version-id'
    })
  };
  
  try {
    const result = await handler(testEvent);
    console.log('Test result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Uncomment the line below to run local test
// testLocally();
*/
