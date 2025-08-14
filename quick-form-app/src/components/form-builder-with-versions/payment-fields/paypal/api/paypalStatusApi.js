import { API_ENDPOINTS } from "../../../config";

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

    const response = await fetch(API_ENDPOINTS.PAYMENT_API, {
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
      connected: false,
      status: "error",
      lastChecked: new Date().toISOString(),
    };
  }
};

/**
 * Refresh merchant account capabilities
 */
export const refreshMerchantCapabilities = async (merchantId) => {
  try {
    console.log(`🔄 Refreshing capabilities for merchant: ${merchantId}`);

    const response = await fetch(API_ENDPOINTS.PAYMENT_API, {
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
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error refreshing capabilities:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Update account status in form data
 */
export const updateAccountStatusInForm = async (
  fieldId,
  merchantId,
  statusData,
  onUpdateField
) => {
  try {
    // Get current field data
    const currentField = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (!currentField) {
      throw new Error("Field not found");
    }

    // Update the field with new status data
    const updatedSubFields = {
      merchantId: merchantId,
      accountStatus: {
        ...statusData,
        lastUpdated: new Date().toISOString(),
      },
    };

    // Call the update function
    onUpdateField(fieldId, { subFields: updatedSubFields });

    console.log(`✅ Updated account status in form for field: ${fieldId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error updating account status in form:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Validate merchant account connection
 */
export const validateMerchantConnection = async (merchantId) => {
  try {
    console.log(`🔐 Validating merchant connection: ${merchantId}`);

    const response = await fetch(API_ENDPOINTS.PAYMENT_API, {
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
      isValid: data.isValid,
      connectionDetails: data.connectionDetails,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error validating connection:`, error);
    return {
      success: false,
      error: error.message,
      isValid: false,
    };
  }
};

/**
 * Get merchant account health score
 */
export const getMerchantHealthScore = async (merchantId) => {
  try {
    console.log(`📈 Getting health score for merchant: ${merchantId}`);

    const response = await fetch(API_ENDPOINTS.PAYMENT_API, {
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
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error getting health score:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Batch check multiple merchant accounts
 */
export const batchCheckAccounts = async (merchantIds) => {
  try {
    console.log(`📊 Batch checking accounts:`, merchantIds);

    const response = await fetch(API_ENDPOINTS.PAYMENT_API, {
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
    };
  }
};

/**
 * Schedule automatic status checks
 */
export const scheduleStatusCheck = (merchantId, intervalMinutes = 30) => {
  const intervalId = setInterval(async () => {
    console.log(`⏰ Scheduled status check for merchant: ${merchantId}`);
    const result = await checkPayPalAccountStatus(merchantId);

    // Emit custom event for status update
    window.dispatchEvent(
      new CustomEvent("paypal-status-update", {
        detail: { merchantId, status: result },
      })
    );
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log(`🛑 Stopped scheduled checks for merchant: ${merchantId}`);
  };
};

/**
 * Listen for status updates
 */
export const onStatusUpdate = (callback) => {
  const handleStatusUpdate = (event) => {
    callback(event.detail);
  };

  window.addEventListener("paypal-status-update", handleStatusUpdate);

  // Return cleanup function
  return () => {
    window.removeEventListener("paypal-status-update", handleStatusUpdate);
  };
};
