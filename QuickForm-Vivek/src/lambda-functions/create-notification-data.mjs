export const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    console.log("HTTP Method:", httpMethod);
    if (httpMethod === 'POST') {
      // Handle POST request
      try {
        // 1. Parse body (handle stringified body from API Gateway)
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  
        if (!body.notificationData) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing 'notificationData' in request body" }),
            headers: {
              "Access-Control-Allow-Origin": "*",
            }
          };
        }
  
        // 2. Extract auth token from headers
        const headers = event.headers || {};
        const authHeader = headers.Authorization || headers.authorization;
  
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return {
            statusCode: 401,
            body: JSON.stringify({ message: "Unauthorized: Missing or invalid Authorization header" }),
            headers: {
              "Access-Control-Allow-Origin": "*",
            }
          };
        }
  
        // 3. Salesforce instance URL from environment
        const instanceUrl = body.instanceUrl;
        if (!instanceUrl) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Error : Missing Instance Url" }),
            headers: {
              "Access-Control-Allow-Origin": "*",
            }
          };
        }
  
        // 4. Call Salesforce API to create Notification__c
        const sfResponse = await fetch(
          `${instanceUrl}/services/data/v60.0/sobjects/Notification__c`,
          {
            method: "POST",
            headers: {
              "Authorization": authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body.notificationData),
          }
        );
  
        // 5. Handle Salesforce response
        if (!sfResponse.ok) {
          const errorText = await sfResponse.text();
          console.error("Salesforce error:", errorText);
          return {
            statusCode: sfResponse.status,
            body: JSON.stringify({
              message: "Salesforce insert failed",
              error: errorText,
            }),
            headers: {
              "Access-Control-Allow-Origin": "*",
            }
          };
        }
  
        const responseData = await sfResponse.json();
  
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Notification record created successfully",
            id: responseData.id,
          }),
          headers: {
            "Access-Control-Allow-Origin": "*",
          }
        };
      } catch (err) {
        console.error("Internal error:", err);
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: "Internal server error",
            error: err.message,
          }),
          headers: {
            "Access-Control-Allow-Origin": "*",
          }
        };
      }
    } else if (httpMethod === 'GET') {
      // Handle GET request
      // Extract auth token from headers
      console.log('GET Event ==>', event);
      const headers = event.headers || {};
      const authHeader = headers.Authorization || headers.authorization;
  
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          statusCode: 401,
          body: JSON.stringify({ message: "Unauthorized: Missing or invalid Authorization header" }),
          headers: {
            "Access-Control-Allow-Origin": "*",
          }
        };
      }
  
      // 1. Get instance URL from query parameter
      const queryParams = event.queryStringParameters || {};
      const instanceUrl = queryParams.instanceUrl;
      console.log('Queryparams ==>', queryParams);
      console.log('instanceUrl', instanceUrl);
      if (!instanceUrl) {
        throw new Error("Missing INSTANCE_URL  ");
      }
      
      // 2. Get formID from query parameter
      const formId = queryParams.formId;
      console.log('formId', formId);
      if (!formId) {
        throw new Error("Missing formId ");
      }
      // Define your SOQL query
      const soql = encodeURIComponent(`SELECT Id, Body__c,Title__c,	Type__c,	Status__c	,Receipe__c, CreatedDate FROM Notification__c where Form__c = '${formId}' ORDER BY CreatedDate DESC`);
  
      // Make the request
      const sfResponse = await fetch(`${instanceUrl}/services/data/v60.0/query/?q=${soql}`, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });
  
      if (!sfResponse.ok) {
        const errorText = await sfResponse.text();
        console.error("Salesforce query error:", errorText);
        return {
          statusCode: sfResponse.status,
          body: JSON.stringify({ message: "Salesforce query failed", error: errorText }),
          headers: {
            "Access-Control-Allow-Origin": "*",
          }
        };
      }
  
      const data = await sfResponse.json();
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Records retrieved successfully",
          records: data.records,
        }),
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      };
    } else if (httpMethod === 'PATCH') {
      try {
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        console.log('Event Body PATCH ===>' , body);
        const { notificationId, updatedData, instanceUrl } = body;
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!notificationId || !updatedData || !instanceUrl) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing 'notificationId', 'updatedData', or 'instanceUrl'" }),
            headers: { "Access-Control-Allow-Origin": "*" },
          };
        }
  
        // 1. Fetch existing notification record
        const getResp = await fetch(
          `${instanceUrl}/services/data/v60.0/sobjects/Notification__c/${notificationId}`,
          {
            method: "GET",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        );
  
        if (!getResp.ok) {
          const errorText = await getResp.text();
          console.error("Failed to fetch existing notification:", errorText);
          return {
            statusCode: getResp.status,
            body: JSON.stringify({ message: "Failed to fetch existing record", error: errorText }),
            headers: { "Access-Control-Allow-Origin": "*" },
          };
        }
  
        const existingData = await getResp.json();
        const changedFields = {};
  
        // 2. Compare fields
        Object.keys(updatedData).forEach((key) => {
          if (existingData[key] !== updatedData[key]) {
            changedFields[key] = updatedData[key];
          }
        });
  
        if (Object.keys(changedFields).length === 0) {
          console.log("No changes detected. Skipping update.");
          return {
            statusCode: 200,
            body: JSON.stringify({ message: "No update needed. Data unchanged." }),
            headers: { "Access-Control-Allow-Origin": "*" },
          };
        }
  
        // 3. Send PATCH request
        const patchResp = await fetch(
          `${instanceUrl}/services/data/v60.0/sobjects/Notification__c/${notificationId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(changedFields),
          }
        );
  
        if (!patchResp.ok) {
          const errorText = await patchResp.text();
          console.error("Salesforce update error:", errorText);
          return {
            statusCode: patchResp.status,
            body: JSON.stringify({ message: "Salesforce update failed", error: errorText }),
            headers: { "Access-Control-Allow-Origin": "*" },
          };
        }
  
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Notification updated", updatedFields: changedFields }),
          headers: { "Access-Control-Allow-Origin": "*" },
        };
      } catch (err) {
        console.error("Patch error:", err);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Internal error during update", error: err.message }),
          headers: { "Access-Control-Allow-Origin": "*" },
        };
      }
    } else if (httpMethod === 'DELETE') {
      try {
        const { notificationId, instanceUrl } = event.queryStringParameters;
        const authHeader = event.headers.Authorization || event.headers.authorization;
  
        // Validate required parameters
        if (!notificationId || !instanceUrl) {
          console.error('Missing required parameters');
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing 'notificationId' or 'instanceUrl'" }),
            headers: { "Access-Control-Allow-Origin": "*" },
          };
        }
  
        // Validate authorization header
        if (!authHeader) {
          console.error('Authorization header missing');
          return {
            statusCode: 401,
            body: JSON.stringify({ message: "Authorization header required" }),
            headers: { "Access-Control-Allow-Origin": "*" },
          };
        }
  
        console.log(`Attempting to delete notification ${notificationId}`);
  
        // Send DELETE request to Salesforce
        const deleteResp = await fetch(
          `${instanceUrl}/services/data/v60.0/sobjects/Notification__c/${notificationId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        );
  
        // Handle successful deletion (204 No Content)
        if (deleteResp.status === 204) {
          console.log(`Successfully deleted notification ${notificationId}`);
          return {
            statusCode: 200,
            body: JSON.stringify({ message: "Notification deleted successfully" }),
            headers: { "Access-Control-Allow-Origin": "*" },
          };
        }
  
        // Handle errors from Salesforce
        const errorText = await deleteResp.text();
        console.error("Salesforce deletion error:", errorText);
        
        return {
          statusCode: deleteResp.status,
          body: JSON.stringify({ 
            message: "Failed to delete notification", 
            error: errorText,
            salesforceStatus: deleteResp.status
          }),
          headers: { "Access-Control-Allow-Origin": "*" },
        };
  
      } catch (err) {
        console.error("Delete operation error:", err);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            message: "Internal server error during deletion", 
            error: err.message 
          }),
          headers: { "Access-Control-Allow-Origin": "*" },
        };
      }
    } else {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Method Not Allowed" }),
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      };
    }
  
  };
  