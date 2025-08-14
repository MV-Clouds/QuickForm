/**
 * Main Payment Handler - Integration with Existing PayPal Lambda Functions
 *
 * This handler routes payment requests to the appropriate existing lambda functions:
 * - paymentOnboardinghandler.js - For merchant onboarding and account management
 * - paymentGatewayHandler.js - For payment processing and transactions
 * - productSubscriptionHandler.js - For product/subscription management
 */

// Import existing lambda handlers
import { handler as onboardingHandler } from "./paymentOnboardinghandler.js";
import { handler as gatewayHandler } from "./paymentGatewayHandler.js";
import { handler as productHandler } from "./productSubscriptionHandler.js";

/**
 * Main Payment Handler - Routes requests to existing lambda functions
 */
export const handler = async (event) => {
  try {
    console.log("Payment Handler Event:", JSON.stringify(event, null, 2));

    // Parse request body
    const method = event.httpMethod || event.requestContext?.http?.method;
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action;

    console.log("Payment Handler - Method:", method, "Action:", action);

    // Validate HTTP method
    if (method !== "POST") {
      return {
        statusCode: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    // Validate action parameter
    if (!action) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing action parameter" }),
      };
    }

    // Route to appropriate handler based on action
    console.log(`🔀 Routing action "${action}" to appropriate handler`);

    // Onboarding and Account Management Actions
    const onboardingActions = [
      "check-name",
      "generate-onboarding-url",
      "store-onboarding",
      "complete-onboarding",
      "get-merchant-status",
      "list-accounts",
    ];

    // Product and Subscription Management Actions
    const productActions = [
      "create-product",
      "list-items",
      "get-item",
      "update-product",
      "delete-product",
      "create-subscription-plan",
      "create-donation-plan",
      "list-plans",
      "update-plan",
      "delete-plan",
      "list-paypal-subscriptions",
      "sync-paypal-subscriptions",
      "create-item",
      "update-item",
      // Form integration actions
      "create-product-for-form",
      "create-subscription-for-form",
      "create-donation-for-form",
    ];

    // Payment Processing Actions (handled by gateway)
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

    // Route to Onboarding Handler
    if (onboardingActions.includes(action)) {
      console.log(`📋 Routing to Onboarding Handler: ${action}`);
      return await onboardingHandler(event);
    }

    // Route to Product Handler
    if (productActions.includes(action)) {
      console.log(`📦 Routing to Product Handler: ${action}`);
      return await productHandler(event);
    }

    // Route to Gateway Handler
    if (gatewayActions.includes(action)) {
      console.log(`💳 Routing to Gateway Handler: ${action}`);
      return await gatewayHandler(event);
    }

    // Handle unknown actions
    console.error(`❌ Unknown action: ${action}`);
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Unknown action",
        action: action,
        availableActions: {
          onboarding: onboardingActions,
          products: productActions,
          gateway: gatewayActions,
        },
      }),
    };
  } catch (error) {
    console.error("❌ Payment Handler Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
    };
  }
};

/**
 * Health check endpoint
 */
export const healthCheck = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      handlers: {
        onboarding: "available",
        gateway: "available",
        products: "available",
      },
    }),
  };
};
