import { API_ENDPOINTS } from "../../../../../config";

/**
 * PayPal Status API Functions
 *
 * Functions for checking real-time PayPal account status and capabilities
 */

/**
 * Check PayPal account status and capabilities
 */
export const checkPayPalAccountStatus = async (merchantId) => {
  try {
    console.log(
      `🔍 Checking PayPal account status for merchant: ${merchantId}`
    );

    const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "check-account-status",
        merchantId: merchantId,
      }),
    });

    const data = await response.json();
    console.log(`📊 Account status response:`, data);

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return {
      success: true,
      status: data.status,
      connected: data.connected,
      capabilities: data.capabilities,
      lastChecked: new Date().toISOString(),
      accountInfo: data.accountInfo,
    };
  } catch (error) {
    console.error(`❌ Error checking account status:`, error);
    return {
      success: false,
      error: error.message,
      lastChecked: new Date().toISOString(),
    };
  }
};

/**
 * Refresh merchant capabilities
 */
export const refreshMerchantCapabilities = async (merchantId) => {
  try {
    console.log(`🔄 Refreshing capabilities for merchant: ${merchantId}`);

    const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "refresh-capabilities",
        merchantId: merchantId,
      }),
    });

    const data = await response.json();
    console.log(`🔄 Capabilities refresh response:`, data);

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return {
      success: true,
      capabilities: data.capabilities,
      refreshed: true,
      lastRefreshed: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error refreshing capabilities:`, error);
    return {
      success: false,
      error: error.message,
      refreshed: false,
      lastRefreshed: new Date().toISOString(),
    };
  }
};

/**
 * Validate merchant connection
 */
export const validateMerchantConnection = async (merchantId) => {
  try {
    console.log(`🔐 Validating merchant connection: ${merchantId}`);

    const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "validate-connection",
        merchantId: merchantId,
      }),
    });

    const data = await response.json();
    console.log(`🔐 Connection validation response:`, data);

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return {
      success: true,
      valid: data.valid,
      connectionStatus: data.connectionStatus,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error validating connection:`, error);
    return {
      success: false,
      error: error.message,
      valid: false,
      validatedAt: new Date().toISOString(),
    };
  }
};

/**
 * Get merchant health score
 */
export const getMerchantHealthScore = async (merchantId) => {
  try {
    console.log(`📈 Getting health score for merchant: ${merchantId}`);

    const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "get-health-score",
        merchantId: merchantId,
      }),
    });

    const data = await response.json();
    console.log(`📈 Health score response:`, data);

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return {
      success: true,
      healthScore: data.healthScore,
      factors: data.factors,
      recommendations: data.recommendations,
      calculatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error getting health score:`, error);
    return {
      success: false,
      error: error.message,
      healthScore: 0,
      calculatedAt: new Date().toISOString(),
    };
  }
};

/**
 * Batch check multiple merchant accounts
 */
export const batchCheckAccounts = async (merchantIds) => {
  try {
    console.log(`📊 Batch checking accounts:`, merchantIds);

    const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "batch-check-accounts",
        merchantIds: merchantIds,
      }),
    });

    const data = await response.json();
    console.log(`📊 Batch check response:`, data);

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return {
      success: true,
      results: data.results,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error in batch check:`, error);
    return {
      success: false,
      error: error.message,
      results: [],
      checkedAt: new Date().toISOString(),
    };
  }
};

/**
 * Get real-time account metrics
 */
export const getAccountMetrics = async (merchantId, timeRange = "7d") => {
  try {
    console.log(
      `📊 Getting account metrics for merchant: ${merchantId}, range: ${timeRange}`
    );

    const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "get-account-metrics",
        merchantId: merchantId,
        timeRange: timeRange,
      }),
    });

    const data = await response.json();
    console.log(`📊 Account metrics response:`, data);

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return {
      success: true,
      metrics: data.metrics,
      timeRange: timeRange,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error getting account metrics:`, error);
    return {
      success: false,
      error: error.message,
      metrics: null,
      retrievedAt: new Date().toISOString(),
    };
  }
};
