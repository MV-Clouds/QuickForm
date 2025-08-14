import { API_ENDPOINTS } from "../../../../../config";

/**
 * PayPal API Integration Functions
 *
 * Handles all PayPal-related API calls for the payment system
 * Updated to work with the unified PayPal lambda functions in:
 * lambda-functions/Payment lambda functions/paypal/
 */

// Get current user context (you may need to implement this based on your auth system)
const getCurrentUserContext = () => {
  // Try to get user context from various sources
  let userId = null; // Default Salesforce user ID from lambda
  let formId = null; // Generate a form ID for tracking

  try {
    // Try to get from localStorage or sessionStorage if available
    const storedUserId =
      localStorage.getItem("salesforce_user_id") ||
      sessionStorage.getItem("salesforce_user_id");
    const storedFormId =
      localStorage.getItem("current_form_id") ||
      sessionStorage.getItem("current_form_id");

    if (storedUserId) userId = storedUserId;
    if (storedFormId) formId = storedFormId;

    // Try to get from URL parameters if available
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get("userId");
    const urlFormId = urlParams.get("formId");

    if (urlUserId) userId = urlUserId;
    if (urlFormId) formId = urlFormId;
  } catch (error) {
    console.warn("Could not retrieve user context from storage or URL:", error);
  }

  console.log("🔍 PayPal API User Context:", { userId, formId });

  return { userId, formId };
};

// Set user context (can be called from UI components)
export const setUserContext = (userId, formId) => {
  try {
    if (userId) {
      localStorage.setItem("salesforce_user_id", userId);
      console.log("✅ PayPal API: User ID set to:", userId);
    }
    if (formId) {
      localStorage.setItem("current_form_id", formId);
      console.log("✅ PayPal API: Form ID set to:", formId);
    }
  } catch (error) {
    console.warn("Could not store user context:", error);
  }
};

// Clear user context
export const clearUserContext = () => {
  try {
    localStorage.removeItem("salesforce_user_id");
    localStorage.removeItem("current_form_id");
    sessionStorage.removeItem("salesforce_user_id");
    sessionStorage.removeItem("current_form_id");
    console.log("✅ PayPal API: User context cleared");
  } catch (error) {
    console.warn("Could not clear user context:", error);
  }
};

// Generic API request function - Enhanced for PayPal lambda integration
const apiRequest = async (
  url,
  method = "GET",
  data = null,
  errorMessage = "API request failed"
) => {
  try {
    console.log(`🚀 PayPal API Request: ${method} ${url}`, {
      action: data?.action,
      payload: data,
      timestamp: new Date().toISOString(),
    });

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      // Add user context for operations that need it
      const userContext = getCurrentUserContext();
      const enhancedData = {
        ...data,
        // Add userId and formId for operations that need them
        ...(needsUserContext(data?.action) && {
          userId: userContext.userId,
          formId: userContext.formId,
        }),
      };

      // Log when user context is added
      if (needsUserContext(data?.action)) {
        console.log(
          `🔍 PayPal API: Adding user context for action "${data?.action}":`,
          {
            userId: userContext.userId,
            formId: userContext.formId,
          }
        );
      }

      options.body = JSON.stringify(enhancedData);
    }

    const response = await fetch(url, options);

    console.log(
      `📡 PayPal API Response Status: ${response.status} ${response.statusText}`
    );

    let result;
    try {
      result = await response.json();
      console.log(`📦 PayPal API Response Data:`, result);
    } catch (parseError) {
      console.error("❌ Failed to parse response as JSON:", parseError);
      throw new Error("Invalid JSON response from server");
    }

    if (!response.ok) {
      console.error(`❌ PayPal API Error (${response.status}):`, {
        status: response.status,
        statusText: response.statusText,
        data: result,
        url,
        payload: data,
      });
      throw new Error(
        result.error ||
          result.message ||
          result.details ||
          `API Error: ${response.status} ${response.statusText}`
      );
    }

    // Handle different response structures from lambda functions
    if (result.success === false) {
      throw new Error(result.error || result.message || "Operation failed");
    }

    // Return success response following PayPal lambda integration pattern
    return {
      success: result.success !== false,
      ...result,
    };
  } catch (error) {
    console.error(`❌ ${errorMessage}:`, error);
    return {
      success: false,
      error: error.message || errorMessage,
    };
  }
};

// Helper function to determine if an action needs user context
const needsUserContext = (action) => {
  // Based on the paymentGatewayHandler.js, ALL gateway actions require userId and formId
  const gatewayActions = [
    "initiate-payment",
    "capture-payment",
    "get-merchant-capabilities",
    "handle-cancel",
    "get-subscription-status",
    "list-subscriptions",
    "list-transactions",
    "handle-donation-complete",
    "process-donation",
  ];

  // Form integration actions also need context
  const formActions = [
    "create-product-for-form",
    "create-subscription-for-form",
    "create-donation-for-form",
  ];

  // All gateway actions and form actions need user context
  return gatewayActions.includes(action) || formActions.includes(action);
};

const fetchMerchantAccounts = async () => {
  console.log("🔍 fetchOnboardedAccounts called");

  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    { action: "list-accounts" },
    "Failed to fetch merchant accounts"
  );

  console.log("🔍 fetchOnboardedAccounts response:", response);

  return {
    ...response,
    accounts: response.success ? response.data.accounts || [] : [],
    hasAccounts:
      response.success &&
      response.data.accounts &&
      response.data.accounts.length > 0,
  };
};

// Export fetchMerchantAccounts
export { fetchMerchantAccounts };

// Fetch onboarded accounts (alias for fetchMerchantAccounts)
export const fetchOnboardedAccounts = async () => {
  return await fetchMerchantAccounts();
};

// Fetch merchant capabilities
export const fetchMerchantCapabilities = async (merchantId) => {
  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    { action: "get-merchant-capabilities", merchantId },
    "Failed to fetch merchant capabilities"
  );

  return {
    ...response,
    capabilities: response.success ? response.capabilities || {} : {},
  };
};

// Create product
export const createProduct = async (productData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "create-product",
      ...productData,
    },
    "Failed to create product"
  );
};

// Update product
export const updateProduct = async (productData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "update-product",
      ...productData,
    },
    "Failed to update product"
  );
};

// Delete product
export const deleteProduct = async (productId, merchantId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "delete-product",
      productId,
      merchantId,
    },
    "Failed to delete product"
  );
};

// Fetch products
export const fetchProducts = async (merchantId) => {
  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "list-items",
      merchantId,
      type: "product", // Filter for products only
    },
    "Failed to fetch products"
  );

  return {
    ...response,
    products: response.success ? response.items || response.products || [] : [],
  };
};

// Fetch PayPal products
export const fetchPaypalProducts = async (merchantId) => {
  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "list-items",
      merchantId,
      type: "product",
    },
    "Failed to fetch PayPal products"
  );

  return {
    ...response,
    products: response.success ? response.items || response.products || [] : [],
  };
};

// Fetch PayPal subscriptions
export const fetchPaypalSubscriptions = async (merchantId) => {
  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "list-paypal-subscriptions",
      merchantId,
    },
    "Failed to fetch PayPal subscriptions"
  );

  return {
    ...response,
    subscriptions: response.success ? response.subscriptions || [] : [],
  };
};

// Create subscription plan
export const createSubscriptionPlan = async (planData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "create-subscription-plan",
      ...planData,
    },
    "Failed to create subscription plan"
  );
};

// Update subscription plan
export const updateSubscriptionPlan = async (planData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "update-subscription-plan",
      ...planData,
    },
    "Failed to update subscription plan"
  );
};

// Create item (subscription, product, or donation)
export const createItem = async (itemData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "create-item",
      ...itemData,
    },
    "Failed to create item"
  );
};

// Update item (subscription, product, or donation)
export const updateItem = async (itemData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "update-item",
      ...itemData,
    },
    "Failed to update item"
  );
};

// Initiate payment
export const initiatePayment = async (paymentData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "initiate-payment",
      ...paymentData,
    },
    "Failed to initiate payment"
  );
};

// Process payment
export const processPayment = async (paymentData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "process-payment",
      ...paymentData,
    },
    "Failed to process payment"
  );
};

// Get payment status
export const getPaymentStatus = async (paymentId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "get-payment-status",
      paymentId,
    },
    "Failed to get payment status"
  );
};

// Generate onboarding URL
export const generateOnboardingUrl = async (returnUrl, cancelUrl) => {
  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "generate-onboarding-url",
      returnUrl,
      cancelUrl: cancelUrl || returnUrl, // Use returnUrl as fallback for cancelUrl
    },
    "Failed to generate onboarding URL"
  );

  return {
    ...response,
    onboardingUrl: response.success ? response.data?.onboardingUrl : null,
    trackingId: response.success ? response.data?.trackingId : null,
  };
};

// Store onboarding data
export const storeOnboarding = async (onboardingData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "store-onboarding",
      ...onboardingData,
    },
    "Failed to store onboarding data"
  );
};

// Check name availability
export const checkNameAvailability = async (name) => {
  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "check-name",
      name,
    },
    "Failed to check name availability"
  );

  return {
    ...response,
    exists: response.success ? response.data?.exists || false : false,
  };
};

// Onboard merchant
export const onboardMerchant = async (onboardingData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "onboard-merchant",
      ...onboardingData,
    },
    "Failed to onboard merchant"
  );
};

// Get onboarding status
export const getOnboardingStatus = async (merchantId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "get-onboarding-status",
      merchantId,
    },
    "Failed to get onboarding status"
  );
};
// Sync PayPal subscriptions
export const syncPaypalSubscriptions = async (merchantId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "sync-paypal-subscriptions",
      merchantId,
    },
    "Failed to sync PayPal subscriptions"
  );
};

// Get single item
export const getItem = async (productId, merchantId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "get-item",
      productId,
      merchantId,
    },
    "Failed to get item"
  );
};

// List transactions
export const listTransactions = async (merchantId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "list-transactions",
      merchantId,
    },
    "Failed to list transactions"
  );
};

// Get subscription status
export const getSubscriptionStatus = async (merchantId, subscriptionId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "get-subscription-status",
      merchantId,
      subscriptionId,
    },
    "Failed to get subscription status"
  );
};

// Handle cancel
export const handleCancel = async (
  merchantId,
  itemNumber,
  paymentType,
  orderId,
  subscriptionId
) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "handle-cancel",
      merchantId,
      itemNumber,
      paymentType,
      orderId,
      subscriptionId,
    },
    "Failed to handle cancel"
  );
};

// Handle donation complete
export const handleDonationComplete = async (
  transactionId,
  merchantId,
  amount,
  currency,
  donorName,
  donorEmail,
  message
) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "handle-donation-complete",
      transactionId,
      merchantId,
      amount,
      currency,
      donorName,
      donorEmail,
      message,
    },
    "Failed to handle donation complete"
  );
};

// Additional API functions available in lambda but missing in frontend

// Complete onboarding (from lambda)
export const completeOnboarding = async (onboardingData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "complete-onboarding",
      ...onboardingData,
    },
    "Failed to complete onboarding"
  );
};

// Get merchant status (from lambda)
export const getMerchantStatus = async (merchantId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "get-merchant-status",
      merchantId,
    },
    "Failed to get merchant status"
  );
};

// Create donation plan (from lambda)
export const createDonationPlan = async (planData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "create-donation-plan",
      ...planData,
    },
    "Failed to create donation plan"
  );
};

// List plans (from lambda)
export const listPlans = async (merchantId) => {
  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "list-plans",
      merchantId,
    },
    "Failed to list plans"
  );

  return {
    ...response,
    plans: response.success ? response.plans || [] : [],
  };
};

// Update plan (from lambda)
export const updatePlan = async (planData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "update-plan",
      ...planData,
    },
    "Failed to update plan"
  );
};

// Delete plan (from lambda)
export const deletePlan = async (planId, merchantId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "delete-plan",
      planId,
      merchantId,
    },
    "Failed to delete plan"
  );
};

// Capture payment (from lambda)
export const capturePayment = async (orderId, merchantId) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "capture-payment",
      orderId,
      merchantId,
    },
    "Failed to capture payment"
  );
};

// List subscriptions (from lambda)
export const listSubscriptions = async (merchantId) => {
  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "list-subscriptions",
      merchantId,
    },
    "Failed to list subscriptions"
  );

  return {
    ...response,
    subscriptions: response.success ? response.subscriptions || [] : [],
  };
};

// Process donation (from lambda)
export const processDonation = async (donationData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "process-donation",
      ...donationData,
    },
    "Failed to process donation"
  );
};

// Form integration functions (from lambda)

// Create product for form
export const createProductForForm = async (productData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "create-product-for-form",
      ...productData,
    },
    "Failed to create product for form"
  );
};

// Create subscription for form
export const createSubscriptionForForm = async (subscriptionData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "create-subscription-for-form",
      ...subscriptionData,
    },
    "Failed to create subscription for form"
  );
};

// Create donation for form
export const createDonationForForm = async (donationData) => {
  return await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    {
      action: "create-donation-for-form",
      ...donationData,
    },
    "Failed to create donation for form"
  );
};

// Enhanced error handling for PayPal-specific errors
export const handlePayPalError = (error) => {
  console.error("PayPal API Error:", error);

  // Map common PayPal errors to user-friendly messages
  const errorMappings = {
    DUPLICATE_MERCHANT: "This merchant account is already connected.",
    INVALID_PLAN_ID: "The subscription plan ID is invalid or not found.",
    PAYPAL_API_ERROR:
      "PayPal service is temporarily unavailable. Please try again.",
    NETWORK_ERROR:
      "Network connection error. Please check your internet connection.",
    AUTHENTICATION_FAILED:
      "PayPal authentication failed. Please reconnect your account.",
  };

  const userFriendlyMessage =
    errorMappings[error.error] ||
    error.message ||
    "An unexpected error occurred.";

  return {
    success: false,
    error: error.error || "UNKNOWN_ERROR",
    message: userFriendlyMessage,
    details: error.details || error.message,
  };
};
