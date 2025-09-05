import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const TOKEN_TABLE_NAME = "SalesforceAuthTokens";

const PAYPAL_CLIENT_ID =
  "AbYnm03NLihzGgGlRFtdNt2jx3rHYOSZySVeFE-VIsY2C0khi8zfHn1uVq4zq7yPOwKg4ynE0-jJKvYD";
const PAYPAL_CLIENT_SECRET =
  "EPhYWl3_AjVezyDCpkskZc4LYb4N6R2A9Zigz_B1KcYX5e2orHZd0Yumka44XFWSBtSb7bi5TB8LS7rB";
const PAYPAL_PARTNER_ID = "SCU5298GK2T84";

const SALESFORCE_INSTANCE_URL =
  "https://orgfarm-53dd64db2b-dev-ed.develop.my.salesforce.com";
const SALESFORCE_USER_ID = "005gL000002qyRxQAI";

// Helper: Get Salesforce access token
async function getSalesforceAccessToken() {
  try {
    const tokenResponse = await dynamoClient.send(
      new GetItemCommand({
        TableName: TOKEN_TABLE_NAME,
        Key: { UserId: { S: SALESFORCE_USER_ID } },
      })
    );
    const item = tokenResponse.Item;
    if (!item) {
      throw new Error("Token not found for this user and instance");
    }
    return item.AccessToken.S;
  } catch (error) {
    console.error("Error getting Salesforce access token:", error);
    throw new Error("Failed to get Salesforce access token");
  }
}

// Helper: Get PayPal access token for onboarding
async function getPayPalAccessTokenForOnboarding() {
  try {
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString("base64");
    const response = await fetch(
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data.error_description || "Failed to get PayPal access token"
      );
    }
    return data.access_token;
  } catch (error) {
    console.error("Error getting PayPal access token for onboarding:", error);
    throw new Error("Failed to get PayPal access token for onboarding");
  }
}

// Helper: Check if merchant name exists
async function checkMerchantNameExists(name, accessToken) {
  try {
    const nameQuery = `SELECT Id FROM Merchant_Onboarding__c WHERE Name = '${name}' LIMIT 1`;
    const response = await fetch(
      `${SALESFORCE_INSTANCE_URL}/services/data/v60.0/query?q=${encodeURIComponent(
        nameQuery
      )}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const result = await response.json();
    return result.records && result.records.length > 0;
  } catch (error) {
    console.error("Error checking merchant name:", error);
    throw new Error("Failed to check merchant name");
  }
}

// Helper: Generate PayPal onboarding URL
async function generatePayPalOnboardingUrl(returnUrl, cancelUrl) {
  try {
    const paypalAccessToken = await getPayPalAccessTokenForOnboarding();

    const onboardingPayload = {
      tracking_id: `merchant_${Date.now()}`,
      operations: [
        {
          operation: "API_INTEGRATION",
          api_integration_preference: {
            rest_api_integration: {
              integration_method: "PAYPAL",
              integration_type: "THIRD_PARTY",
              third_party_details: {
                features: ["PAYMENT", "REFUND"],
              },
            },
          },
        },
      ],
      products: ["EXPRESS_CHECKOUT"],
      legal_consents: [
        {
          type: "SHARE_DATA_CONSENT",
          granted: true,
        },
      ],
      partner_config_override: {
        partner_logo_url: "https://example.com/logo.png",
        return_url: returnUrl,
        return_url_description: "Return to your application",
        action_renewal_url: cancelUrl,
        show_add_credit_card: true,
      },
    };

    const response = await fetch(
      "https://api-m.sandbox.paypal.com/v2/customer/partner-referrals",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paypalAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(onboardingPayload),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("PayPal onboarding URL generation failed:", data);
      throw new Error(data.message || "Failed to generate onboarding URL");
    }

    return {
      onboardingUrl: data.links.find((link) => link.rel === "action_url")?.href,
      trackingId: onboardingPayload.tracking_id,
    };
  } catch (error) {
    console.error("Error generating PayPal onboarding URL:", error);
    throw new Error("Failed to generate PayPal onboarding URL");
  }
}

// Helper: Store merchant onboarding data
async function storeMerchantOnboarding(merchantData, accessToken) {
  try {
    const { name, merchantId, merchantIdInPayPal, paymentProvider, status } =
      merchantData;

    // Check for duplicate
    const checkQuery = `SELECT Id,Name, Merchant_Tracking_ID__c, Merchant_ID__c, Payment_Provider__c, Status__c 
      FROM Merchant_Onboarding__c 
      WHERE (Merchant_ID__c = '${merchantIdInPayPal}' OR Merchant_Tracking_ID__c = '${merchantId}' OR Name = '${name}')
      AND Payment_Provider__c = '${paymentProvider}' 
      LIMIT 1`;

    const checkResponse = await fetch(
      `${SALESFORCE_INSTANCE_URL}/services/data/v60.0/query?q=${encodeURIComponent(
        checkQuery
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const checkResult = await checkResponse.json();
    if (checkResult.records && checkResult.records.length > 0) {
      return {
        success: false,
        error: "DUPLICATE_MERCHANT",
        message: "User already onboarded",
        existingRecord: checkResult.records[0],
      };
    }

    // Insert new record
    const newRecordPayload = {
      Name: name,
      Is_Active__c: status === "Active",
      Merchant_ID__c: merchantIdInPayPal,
      Merchant_Tracking_ID__c: merchantId,
      Payment_Provider__c: paymentProvider,
      Status__c: status,
    };

    const createResponse = await fetch(
      `${SALESFORCE_INSTANCE_URL}/services/data/v60.0/sobjects/Merchant_Onboarding__c`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRecordPayload),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error("Error creating record:", errorData);
      throw new Error(errorData.message || "Failed to create record");
    }

    const createResult = await createResponse.json();
    return {
      success: true,
      recordId: createResult.id,
      message: "User onboarded successfully",
    };
  } catch (error) {
    console.error("Error storing merchant onboarding:", error);
    throw new Error("Failed to store merchant onboarding data");
  }
}

// Export functions for use in other handlers
export {
  getSalesforceAccessToken,
  getPayPalAccessTokenForOnboarding,
  checkMerchantNameExists,
  generatePayPalOnboardingUrl,
  storeMerchantOnboarding,
};

export const handler = async (event) => {
  try {
    const method = event.httpMethod || event.requestContext?.http?.method;
    if (method !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    const body = JSON.parse(event.body || "{}");
    const action = body.action;
    let access_token;

    console.log("🔍 Processing action:", action);

    // Get Salesforce access token for most actions (except generate-onboarding-url)
    if (action !== "generate-onboarding-url") {
      try {
        access_token = await getSalesforceAccessToken();
        console.log("✅ Salesforce access token obtained");
      } catch (error) {
        console.error("❌ Failed to get Salesforce access token:", error);
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Token not found for this user and instance",
            details: error.message,
          }),
        };
      }
    }

    // 1. Check if name exists
    if (action === "check-name") {
      const { name } = body;
      if (!name) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Name is required" }),
        };
      }

      try {
        const exists = await checkMerchantNameExists(name, access_token);
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            message: "Name check completed",
            data: {
              exists: exists,
              name: name,
            },
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        console.error("❌ Error checking merchant name:", error);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Failed to check merchant name",
            details: error.message,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    // 2. Generate PayPal onboarding URL
    if (action === "generate-onboarding-url") {
      const { returnUrl, cancelUrl } = body;

      if (!returnUrl || !cancelUrl) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "returnUrl and cancelUrl are required",
          }),
        };
      }

      try {
        const result = await generatePayPalOnboardingUrl(returnUrl, cancelUrl);
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            message: "Onboarding URL generated successfully",
            data: {
              onboardingUrl: result.onboardingUrl,
              trackingId: result.trackingId,
            },
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        console.error("❌ Error generating onboarding URL:", error);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Failed to generate onboarding URL",
            details: error.message,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }
    // 3. List all accounts
    if (action === "list-accounts") {
      try {
        const listQuery = `SELECT Id, Name, Merchant_ID__c, Merchant_Tracking_ID__c, Payment_Provider__c, Status__c FROM Merchant_Onboarding__c ORDER BY CreatedDate DESC`;
        console.log("🔍 Executing Salesforce query:", listQuery);

        const listResp = await fetch(
          `${SALESFORCE_INSTANCE_URL}/services/data/v60.0/query?q=${encodeURIComponent(
            listQuery
          )}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );

        if (!listResp.ok) {
          const errorData = await listResp.json();
          console.error("❌ Salesforce API error:", errorData);
          throw new Error(
            errorData.message || `Salesforce API error: ${listResp.status}`
          );
        }

        const listResult = await listResp.json();
        console.log("✅ Salesforce query result:", listResult);

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            message: "Accounts retrieved successfully",
            data: {
              accounts: listResult.records || [],
              count: (listResult.records || []).length,
            },
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        console.error("❌ Error listing accounts:", error);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Failed to retrieve accounts",
            details: error.message,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    // 4. Handle onboarding callback and store in Salesforce
    if (action === "store-onboarding") {
      const { name, merchantId, merchantIdInPayPal, paymentProvider, status } =
        body;

      console.log("body", body);

      // Validate required fields
      if (
        !name ||
        !merchantId ||
        !merchantIdInPayPal ||
        !paymentProvider ||
        !status
      ) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check for duplicate
      const checkQuery = `SELECT Id,Name, Merchant_Tracking_ID__c, Merchant_ID__c, Payment_Provider__c, Status__c 
        FROM Merchant_Onboarding__c 
        WHERE (Merchant_ID__c = '${merchantIdInPayPal}' OR Merchant_Tracking_ID__c = '${merchantId}' OR Name = '${name}')
        AND Payment_Provider__c = '${paymentProvider}' 
        LIMIT 1`;

      const checkResponse = await fetch(
        `${SALESFORCE_INSTANCE_URL}/services/data/v60.0/query?q=${encodeURIComponent(
          checkQuery
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("checkResponse", checkResponse.status);
      const checkResult = await checkResponse.json();
      console.log("checkResult", checkResult);

      if (checkResult.records && checkResult.records.length > 0) {
        return {
          statusCode: 409,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message: "User already onboarded",
            existingRecord: checkResult.records[0],
          }),
        };
      }

      // Fetch PayPal access token again for this secure call
      const auth = Buffer.from(
        `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
      ).toString("base64");
      const paypalTokenResp = await fetch(
        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        }
      );
      const paypalTokenData = await paypalTokenResp.json();
      const paypalAccessToken = paypalTokenData.access_token;

      // Insert new record
      const newRecordPayload = {
        Name: name,
        Is_Active__c: status === "Active",
        Merchant_ID__c: merchantIdInPayPal,
        Merchant_Tracking_ID__c: merchantId,
        Payment_Provider__c: paymentProvider,
        Status__c: status,
        // refresh_token__c : refreshToken
      };
      console.log("newRecordPayload", newRecordPayload);

      const createResponse = await fetch(
        `${SALESFORCE_INSTANCE_URL}/services/data/v60.0/sobjects/Merchant_Onboarding__c`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newRecordPayload),
        }
      );

      console.log("Salesforce API response:", createResponse);
      console.log("Salesforce API response status:", createResponse.status);
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error("Error creating record:", errorData);
        throw new Error(errorData.message || "Failed to create record");
      }
      const createResult = await createResponse.json();

      return {
        statusCode: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          message: "User onboarded successfully",
          data: {
            recordId: createResult.id,
            name: name,
            merchantId: merchantId,
            paymentProvider: paymentProvider,
            status: status,
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // 5. Get merchant credentials by account ID
    if (action === "get-merchant-credentials") {
      const { merchantAccountId } = body;

      if (!merchantAccountId) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Merchant Account ID is required",
            timestamp: new Date().toISOString(),
          }),
        };
      }

      // Validate Salesforce ID format
      const salesforceIdPattern = /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/;
      if (!salesforceIdPattern.test(merchantAccountId)) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Invalid Merchant Account ID format",
            timestamp: new Date().toISOString(),
          }),
        };
      }

      try {
        const accessToken = await getSalesforceAccessToken();

        // Query merchant credentials from Salesforce
        const credentialsQuery = `SELECT Id, Name, Merchant_ID__c, Payment_Provider__c, Status__c, CreatedDate, LastModifiedDate FROM Merchant_Onboarding__c WHERE Id = '${merchantAccountId}' AND Status__c = 'Active' LIMIT 1`;

        const response = await fetch(
          `${SALESFORCE_INSTANCE_URL}/services/data/v60.0/query?q=${encodeURIComponent(
            credentialsQuery
          )}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Failed to query merchant credentials"
          );
        }

        if (!result.records || result.records.length === 0) {
          return {
            statusCode: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
              success: false,
              error: "Merchant account not found or inactive",
              timestamp: new Date().toISOString(),
            }),
          };
        }

        const merchantRecord = result.records[0];

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            merchantAccountId: merchantAccountId,
            credentials: {
              provider: merchantRecord.Payment_Provider__c || "paypal",
              merchantId: merchantRecord.Merchant_ID__c,
              environment: "sandbox", // Default to sandbox
              isActive: merchantRecord.Status__c === "Active",
              accountName: merchantRecord.Name,
            },
            metadata: {
              recordId: merchantRecord.Id,
              lastModified: merchantRecord.LastModifiedDate,
              createdDate: merchantRecord.CreatedDate,
            },
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        console.error("❌ Error fetching merchant credentials:", error);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Failed to fetch merchant credentials",
            details: error.message,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    // Fallback for unsupported routes
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Action not found",
        action: action,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("❌ Payment Onboarding Handler Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
