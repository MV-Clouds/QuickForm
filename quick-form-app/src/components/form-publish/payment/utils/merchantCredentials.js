import { API_ENDPOINTS } from "../../../../config";

/**
 * Utility functions for fetching merchant credentials securely
 * These functions handle the secure retrieval of payment gateway credentials
 * from Salesforce custom settings using record IDs
 */

/**
 * Fetch merchant credentials by record ID
 * @param {string} merchantAccountId - Salesforce record ID for the merchant account
 * @returns {Promise<Object>} Merchant credentials and metadata
 */
export const fetchMerchantCredentials = async (merchantAccountId) => {
  console.log("🔐 Fetching merchant credentials for ID:", merchantAccountId);

  if (!merchantAccountId) {
    throw new Error("Merchant Account ID is required");
  }

  // Validate Salesforce ID format
  const salesforceIdPattern = /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/;
  if (!salesforceIdPattern.test(merchantAccountId)) {
    throw new Error("Invalid Merchant Account ID format");
  }

  try {
    const response = await fetch(
      `${API_ENDPOINTS.MERCHANT_CREDENTIALS}/${merchantAccountId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to fetch merchant credentials: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to fetch merchant credentials");
    }

    console.log("✅ Successfully fetched merchant credentials");

    return {
      success: true,
      merchantAccountId: data.merchantAccountId,
      credentials: data.credentials,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error("❌ Error fetching merchant credentials:", error);
    throw error;
  }
};

/**
 * Cache for merchant credentials to avoid repeated API calls
 * Cache expires after 5 minutes for security
 */
const credentialsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch merchant credentials with caching
 * @param {string} merchantAccountId - Salesforce record ID for the merchant account
 * @returns {Promise<Object>} Merchant credentials and metadata
 */
export const fetchMerchantCredentialsWithCache = async (merchantAccountId) => {
  const cacheKey = merchantAccountId;
  const cached = credentialsCache.get(cacheKey);

  // Check if we have valid cached credentials
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("🎯 Using cached merchant credentials for:", merchantAccountId);
    return cached.data;
  }

  // Fetch fresh credentials
  const credentials = await fetchMerchantCredentials(merchantAccountId);

  // Cache the credentials
  credentialsCache.set(cacheKey, {
    data: credentials,
    timestamp: Date.now(),
  });

  return credentials;
};

/**
 * Clear credentials cache (useful for logout or security purposes)
 */
export const clearCredentialsCache = () => {
  console.log("🧹 Clearing merchant credentials cache");
  credentialsCache.clear();
};

/**
 * Validate merchant credentials structure
 * @param {Object} credentials - Credentials object to validate
 * @returns {boolean} True if credentials are valid
 */
export const validateMerchantCredentials = (credentials) => {
  if (!credentials || typeof credentials !== "object") {
    return false;
  }

  const required = ["provider", "merchantId", "environment", "isActive"];

  for (const field of required) {
    if (!credentials.hasOwnProperty(field)) {
      console.error(`❌ Missing required credential field: ${field}`);
      return false;
    }
  }

  if (!credentials.isActive) {
    console.error("❌ Merchant account is not active");
    return false;
  }

  return true;
};

/**
 * Get payment provider specific credentials
 * @param {Object} credentials - Full credentials object
 * @param {string} provider - Payment provider (paypal, stripe, etc.)
 * @returns {Object} Provider-specific credentials
 */
export const getProviderCredentials = (credentials, provider) => {
  if (!validateMerchantCredentials(credentials)) {
    throw new Error("Invalid merchant credentials");
  }

  if (credentials.provider.toLowerCase() !== provider.toLowerCase()) {
    throw new Error(
      `Credential provider mismatch. Expected: ${provider}, Got: ${credentials.provider}`
    );
  }

  switch (provider.toLowerCase()) {
    case "paypal":
      return {
        merchantId: credentials.merchantId,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        environment: credentials.environment,
      };

    case "stripe":
      return {
        publishableKey: credentials.clientId, // Stripe uses publishable key as client ID
        secretKey: credentials.clientSecret,
        environment: credentials.environment,
      };

    case "razorpay":
      return {
        keyId: credentials.clientId,
        keySecret: credentials.clientSecret,
        environment: credentials.environment,
      };

    case "square":
      return {
        applicationId: credentials.clientId,
        accessToken: credentials.clientSecret,
        environment: credentials.environment,
      };

    default:
      // Return generic credentials for unknown providers
      return {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        merchantId: credentials.merchantId,
        environment: credentials.environment,
      };
  }
};

/**
 * Error handler for merchant credential operations
 * @param {Error} error - Error object
 * @returns {Object} Formatted error response
 */
export const handleCredentialError = (error) => {
  console.error("❌ Merchant Credential Error:", error);

  let errorMessage = "Failed to fetch merchant credentials";
  let errorCode = "CREDENTIAL_ERROR";

  if (error.message.includes("not found")) {
    errorMessage = "Merchant account not found or inactive";
    errorCode = "ACCOUNT_NOT_FOUND";
  } else if (error.message.includes("Invalid")) {
    errorMessage = "Invalid merchant account configuration";
    errorCode = "INVALID_ACCOUNT";
  } else if (error.message.includes("Authentication")) {
    errorMessage = "Authentication failed";
    errorCode = "AUTH_FAILED";
  }

  return {
    success: false,
    error: errorCode,
    message: errorMessage,
    details: error.message,
  };
};
