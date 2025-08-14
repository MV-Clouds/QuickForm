const AWS = require("aws-sdk");

/**
 * Lambda function to fetch merchant credentials from Salesforce custom settings
 * This endpoint takes a merchant account record ID and returns the actual credentials
 * Used for secure credential management - never expose credentials in public forms
 */

exports.handler = async (event) => {
  console.log(
    "🔐 Merchant Credentials Handler - Event:",
    JSON.stringify(event, null, 2)
  );

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
  };

  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "CORS preflight successful" }),
      };
    }

    // Extract merchant account ID from path parameters
    const merchantAccountId = event.pathParameters?.merchantAccountId;

    if (!merchantAccountId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Merchant Account ID is required",
          message: "Please provide a valid merchant account record ID",
        }),
      };
    }

    console.log(
      "🔍 Fetching credentials for merchant account ID:",
      merchantAccountId
    );

    // Validate the record ID format (Salesforce ID format)
    const salesforceIdPattern = /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/;
    if (!salesforceIdPattern.test(merchantAccountId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid Merchant Account ID format",
          message: "Merchant Account ID must be a valid Salesforce record ID",
        }),
      };
    }

    // Get Salesforce credentials from environment variables
    const salesforceConfig = {
      loginUrl:
        process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com",
      username: process.env.SALESFORCE_USERNAME,
      password: process.env.SALESFORCE_PASSWORD,
      securityToken: process.env.SALESFORCE_SECURITY_TOKEN,
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    };

    // Validate Salesforce configuration
    if (
      !salesforceConfig.username ||
      !salesforceConfig.password ||
      !salesforceConfig.securityToken
    ) {
      console.error("❌ Missing Salesforce configuration");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Server configuration error",
          message: "Salesforce connection not configured",
        }),
      };
    }

    // Authenticate with Salesforce
    const authResponse = await authenticateWithSalesforce(salesforceConfig);

    if (!authResponse.success) {
      console.error("❌ Salesforce authentication failed:", authResponse.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Authentication failed",
          message: "Unable to connect to Salesforce",
        }),
      };
    }

    // Query merchant credentials from custom setting
    const credentialsResponse = await fetchMerchantCredentials(
      authResponse.instanceUrl,
      authResponse.accessToken,
      merchantAccountId
    );

    if (!credentialsResponse.success) {
      console.error(
        "❌ Failed to fetch merchant credentials:",
        credentialsResponse.error
      );
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: "Merchant account not found",
          message: "Unable to find merchant account with the provided ID",
        }),
      };
    }

    const merchantCredentials = credentialsResponse.data;

    // Return the credentials (these will be used internally, not exposed to public)
    console.log(
      "✅ Successfully fetched merchant credentials for:",
      merchantAccountId
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        merchantAccountId: merchantAccountId,
        credentials: {
          provider: merchantCredentials.Provider__c,
          merchantId: merchantCredentials.Merchant_ID__c,
          clientId: merchantCredentials.Client_ID__c,
          clientSecret: merchantCredentials.Client_Secret__c,
          environment: merchantCredentials.Environment__c || "sandbox",
          isActive: merchantCredentials.Is_Active__c || false,
          accountName: merchantCredentials.Account_Name__c,
        },
        metadata: {
          recordId: merchantCredentials.Id,
          lastModified: merchantCredentials.LastModifiedDate,
          createdDate: merchantCredentials.CreatedDate,
        },
      }),
    };
  } catch (error) {
    console.error("❌ Merchant Credentials Handler Error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message:
          "An unexpected error occurred while fetching merchant credentials",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
    };
  }
};

/**
 * Authenticate with Salesforce using username/password flow
 */
async function authenticateWithSalesforce(config) {
  try {
    const https = require("https");
    const querystring = require("querystring");

    const authData = querystring.stringify({
      grant_type: "password",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password + config.securityToken,
    });

    const authOptions = {
      hostname: new URL(config.loginUrl).hostname,
      path: "/services/oauth2/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(authData),
      },
    };

    return new Promise((resolve) => {
      const req = https.request(authOptions, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.access_token) {
              resolve({
                success: true,
                accessToken: response.access_token,
                instanceUrl: response.instance_url,
              });
            } else {
              resolve({
                success: false,
                error: response.error_description || "Authentication failed",
              });
            }
          } catch (parseError) {
            resolve({
              success: false,
              error: "Invalid response from Salesforce",
            });
          }
        });
      });

      req.on("error", (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });

      req.write(authData);
      req.end();
    });
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Fetch merchant credentials from Salesforce custom setting
 */
async function fetchMerchantCredentials(
  instanceUrl,
  accessToken,
  merchantAccountId
) {
  try {
    const https = require("https");

    // SOQL query to fetch merchant credentials
    // Assuming custom setting object name is "Payment_Gateway_Setting__c"
    const query = `SELECT Id, Account_Name__c, Provider__c, Merchant_ID__c, Client_ID__c, Client_Secret__c, Environment__c, Is_Active__c, LastModifiedDate, CreatedDate FROM Payment_Gateway_Setting__c WHERE Id = '${merchantAccountId}' AND Is_Active__c = true LIMIT 1`;

    const encodedQuery = encodeURIComponent(query);
    const queryPath = `/services/data/v57.0/query/?q=${encodedQuery}`;

    const queryOptions = {
      hostname: new URL(instanceUrl).hostname,
      path: queryPath,
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    return new Promise((resolve) => {
      const req = https.request(queryOptions, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const response = JSON.parse(data);

            if (response.records && response.records.length > 0) {
              resolve({
                success: true,
                data: response.records[0],
              });
            } else {
              resolve({
                success: false,
                error: "Merchant account not found or inactive",
              });
            }
          } catch (parseError) {
            resolve({
              success: false,
              error: "Invalid response from Salesforce query",
            });
          }
        });
      });

      req.on("error", (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });

      req.end();
    });
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
