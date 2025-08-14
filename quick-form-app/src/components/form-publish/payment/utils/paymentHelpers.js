/**
 * Payment Helper Utilities
 * Common functions for payment processing
 */

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.warn("Currency formatting error:", error);
    return `$${parseFloat(amount).toFixed(2)}`;
  }
};

/**
 * Generate unique item number for payment tracking
 */
export const generateItemNumber = (fieldId, formId) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${fieldId}-${formId}-${timestamp}-${random}`;
};

/**
 * Get available payment methods based on field configuration - Updated for dynamic structure
 */
export const getAvailablePaymentMethods = (
  fieldConfig,
  merchantCapabilities = {}
) => {
  const methods = [];
  // Handle dynamic data structure
  const subFields = fieldConfig.subFields || fieldConfig || {};
  const paymentMethods =
    subFields.paymentMethods || fieldConfig.paymentMethods || {};

  // PayPal is always available if enabled
  if (paymentMethods.paypal !== false) {
    methods.push("paypal");
  }

  // Cards (if enabled and merchant supports it)
  if (paymentMethods.cards !== false && merchantCapabilities.cards) {
    methods.push("cards");
  }

  // Venmo (if enabled and merchant supports it)
  if (paymentMethods.venmo && merchantCapabilities.venmo) {
    methods.push("venmo");
  }

  // Google Pay (if enabled and merchant supports it)
  if (paymentMethods.googlePay && merchantCapabilities.googlePay) {
    methods.push("googlePay");
  }

  return methods;
};

/**
 * Get payment button label based on payment type
 */
export const getPaymentButtonLabel = (paymentType) => {
  switch (paymentType) {
    case "donation":
    case "donation_button":
      return "paypal";
    case "subscription":
      return "paypal";
    case "product_wise":
      return "buynow";
    default:
      return "pay";
  }
};

/**
 * Get payment button color based on payment type
 */
export const getPaymentButtonColor = (paymentType) => {
  switch (paymentType) {
    case "donation":
    case "donation_button":
      return "blue"; // PayPal blue for donations
    case "subscription":
      return "gold"; // PayPal gold for subscriptions
    default:
      return "gold"; // Default PayPal gold
  }
};

/**
 * Calculate total amount for product-based payments
 */
export const calculateTotalAmount = (products = []) => {
  return products.reduce((total, product) => {
    const price = parseFloat(product.price) || 0;
    const quantity = parseInt(product.quantity) || 1;
    return total + price * quantity;
  }, 0);
};

/**
 * Validate payment amount
 */
export const validatePaymentAmount = (
  amount,
  minAmount = null,
  maxAmount = null
) => {
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }

  if (minAmount !== null && numAmount < parseFloat(minAmount)) {
    return {
      isValid: false,
      error: `Amount must be at least ${formatCurrency(minAmount)}`,
    };
  }

  if (maxAmount !== null && numAmount > parseFloat(maxAmount)) {
    return {
      isValid: false,
      error: `Amount cannot exceed ${formatCurrency(maxAmount)}`,
    };
  }

  return { isValid: true };
};

/**
 * Get PayPal SDK options based on merchant capabilities
 */
export const getPayPalSDKOptions = (
  merchantCapabilities = {},
  isProduction = false
) => {
  const clientId = isProduction
    ? process.env.REACT_APP_PAYPAL_PRODUCTION_CLIENT_ID
    : process.env.REACT_APP_PAYPAL_SANDBOX_CLIENT_ID;

  const components = ["buttons"];
  const enableFunding = [];
  const disableFunding = [];

  // Add card fields if supported
  if (merchantCapabilities.cards) {
    components.push("card-fields");
  }

  // Enable funding sources based on capabilities
  if (merchantCapabilities.venmo) {
    enableFunding.push("venmo");
  }

  if (merchantCapabilities.googlePay) {
    enableFunding.push("googlepay");
  }

  if (merchantCapabilities.payLater) {
    enableFunding.push("paylater");
  }

  return {
    "client-id": clientId,
    currency: merchantCapabilities.currency || "USD",
    intent: "capture",
    components: components.join(","),
    "enable-funding":
      enableFunding.length > 0 ? enableFunding.join(",") : undefined,
    "disable-funding":
      disableFunding.length > 0 ? disableFunding.join(",") : undefined,
  };
};

/**
 * Create return and cancel URLs for payment
 */
export const createPaymentUrls = (formId, fieldId) => {
  const baseUrl = window.location.origin;
  const currentPath = window.location.pathname;

  return {
    returnUrl: `${baseUrl}${currentPath}?payment=success&form=${formId}&field=${fieldId}`,
    cancelUrl: `${baseUrl}${currentPath}?payment=cancelled&form=${formId}&field=${fieldId}`,
  };
};

/**
 * Extract payment result from URL parameters
 */
export const getPaymentResultFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const payment = urlParams.get("payment");
  const formId = urlParams.get("form");
  const fieldId = urlParams.get("field");

  if (payment && formId && fieldId) {
    return {
      status: payment, // 'success' or 'cancelled'
      formId,
      fieldId,
    };
  }

  return null;
};
