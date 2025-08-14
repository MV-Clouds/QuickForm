/**
 * PayPal Integration Configuration
 * Central configuration file for PayPal integration settings
 */

// API Endpoints
const API_ENDPOINTS = {
  // Existing individual lambda endpoints (for reference)
  PRODUCT_API: "https://kzkprg5uhh.execute-api.us-east-1.amazonaws.com/Stage1",
  PAYMENT_API: "https://e3bkx8z0f4.execute-api.us-east-1.amazonaws.com/Stage1",
  PAYMENT_ONBOARDING_HANDLER_API:
    "https://4bi3194e4l.execute-api.us-east-1.amazonaws.com/payment_onboarding_handler",

  // Unified payment handler endpoint (when deployed)
  UNIFIED_PAYMENT_API:
    "https://3b5yiz4x46.execute-api.us-east-1.amazonaws.com/Stage1",

  // Merchant credentials endpoint for secure credential fetching
  MERCHANT_CREDENTIALS: "https://YOUR_API_GATEWAY_URL/merchant-credentials",

  // For now, we'll use the existing endpoints directly
  // This allows the system to work with existing lambda functions
};

// PayPal API URLs
const PAYPAL_API_URLS = {
  SANDBOX: "https://api-m.sandbox.paypal.com",
  PRODUCTION: "https://api-m.paypal.com",
};

// PayPal Credentials
const PAYPAL_CREDENTIALS = {
  // Sandbox credentials
  SANDBOX: {
    CLIENT_ID:
      "AbYnm03NLihzGgGlRFtdNt2jx3rHYOSZySVeFE-VIsY2C0khi8zfHn1uVq4zq7yPOwKg4ynE0-jJKvYD",
    CLIENT_SECRET:
      "EPhYWl3_AjVezyDCpkskZc4LYb4N6R2A9Zigz_B1KcYX5e2orHZd0Yumka44XFWSBtSb7bi5TB8LS7rB",
  },
  // Production credentials - replace with actual production values when ready
  PRODUCTION: {
    CLIENT_ID: "YOUR_PRODUCTION_CLIENT_ID",
    CLIENT_SECRET: "YOUR_PRODUCTION_CLIENT_SECRET",
  },
};

// Default PayPal script options
const getPayPalScriptOptions = (
  merchantId,
  paymentType,
  isProduction = false
) => {
  return {
    "client-id": isProduction
      ? PAYPAL_CREDENTIALS.PRODUCTION.CLIENT_ID
      : PAYPAL_CREDENTIALS.SANDBOX.CLIENT_ID,
    "merchant-id": merchantId,
    currency: "USD",
    components: "buttons",
    vault: paymentType === "subscription",
    intent: paymentType === "subscription" ? "subscription" : "capture",
  };
};

// PayPal Donate Button Configuration
const PAYPAL_DONATE_CONFIG = {
  // Donate SDK script URL
  SDK_URL: "https://www.paypalobjects.com/donate/sdk/donate-sdk.js",
  // Default button image
  DEFAULT_BUTTON_IMAGE: {
    src: "https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif",
    title: "PayPal - The safer, easier way to pay online!",
    alt: "Donate with PayPal button",
  },
  // PayPal Donate Button Creation URLs
  BUTTON_CREATION_URLS: {
    SANDBOX: "https://sandbox.paypal.com/donate/buttons",
    PRODUCTION: "https://paypal.com/donate/buttons",
  },
};

// Custom Checkout Options
const CUSTOM_CHECKOUT_OPTIONS = {
  PRODUCT_WISE: "product_wise",
  STATIC_AMOUNT: "static_amount",
  VARIABLE_PRICE: "variable_price",
};

// Default subscription plan template
const DEFAULT_SUBSCRIPTION_PLAN = {
  name: "",
  description: "",
  currency_code: "USD",
  billing_cycles: [
    {
      frequency: { interval_unit: "MONTH", interval_count: 1 },
      tenure_type: "REGULAR",
      sequence: 1,
      total_cycles: 0,
      pricing_scheme: {
        // pricing_model should only be set for tiered pricing
        // For normal pricing, only use fixed_price
        fixed_price: { value: "10.00", currency_code: "USD" },
      },
    },
  ],
  payment_preferences: {
    auto_bill_outstanding: true,
    setup_fee: { value: "0.00", currency_code: "USD" },
    setup_fee_failure_action: "CONTINUE",
    payment_failure_threshold: 3,
  },
  taxes: { percentage: "0", inclusive: false },
};

// DynamoDB Table Name
const DYNAMODB_TABLE = "TestYash";

export {
  API_ENDPOINTS,
  PAYPAL_API_URLS,
  PAYPAL_CREDENTIALS,
  PAYPAL_DONATE_CONFIG,
  CUSTOM_CHECKOUT_OPTIONS,
  getPayPalScriptOptions,
  DEFAULT_SUBSCRIPTION_PLAN,
  DYNAMODB_TABLE,
};
