// REMOVED: DynamoDB imports - payment gateway now only handles payments
import crypto from "crypto";

// Normalize and bound itemNumber usages per PayPal limits
// - invoice_id: max 127 chars (per docs)
// - custom_id: max 127 chars (per docs)
// - PayPal-Request-Id: idempotency key, keep <= 127 and deterministic
function normalizePayPalIds(raw) {
  const base = String(raw || "").trim();
  const safe = base.replace(/[^A-Za-z0-9\-_.:@|/]/g, "-");
  const hash = crypto.createHash("sha256").update(safe).digest("hex");
  const addHash = (val, maxLen) =>
    val.length <= maxLen
      ? val
      : `${val.slice(0, Math.max(0, maxLen - 13))}-${hash.slice(0, 12)}`;
  const invoiceId = addHash(safe, 127);
  const customId = addHash(safe, 127);
  const requestId = addHash(safe, 127);
  return { invoiceId, customId, requestId };
}
// Data storage is handled by form submission to Salesforce

// Helper function to estimate next payment date for recurring donations
function getNextPaymentDate() {
  // For PayPal Donate recurring, we don't know the exact frequency
  // So we estimate monthly (most common for donations)
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return nextMonth.toISOString();
}

// REMOVED: Form data storage functions - payment gateway now only handles payments
// Data storage is handled by form submission to Salesforce

const clientId =
  "AbYnm03NLihzGgGlRFtdNt2jx3rHYOSZySVeFE-VIsY2C0khi8zfHn1uVq4zq7yPOwKg4ynE0-jJKvYD";
const clientSecret =
  "EPhYWl3_AjVezyDCpkskZc4LYb4N6R2A9Zigz_B1KcYX5e2orHZd0Yumka44XFWSBtSb7bi5TB8LS7rB";

const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

// Helper: Get PayPal access token for a merchant
async function getPayPalAccessTokenForGatewayMerchant(merchantId) {
  try {
    const response = await fetch(
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=client_credentials&target_subject=${merchantId}`,
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error(
        "Failed to get access token:",
        JSON.stringify(data, null, 2)
      );
      throw new Error(
        data.error_description || "Failed to get PayPal access token"
      );
    }
    console.log("Access token retrieved for merchant:", merchantId);
    return data.access_token;
  } catch (error) {
    console.error("Error in getPayPalAccessTokenMerchant:", error);
    throw new Error(
      `Failed to get PayPal access token for merchant:${merchantId} : ${error.message}`
    );
  }
}

async function getPayPalAccessTokenForGateway() {
  try {
    const response = await fetch(
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=client_credentials`,
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error(
        "Failed to get access token:",
        JSON.stringify(data, null, 2)
      );
      throw new Error(
        data.error_description || "Failed to get PayPal access token"
      );
    }
    return data.access_token;
  } catch (error) {
    console.error("Error in getPayPalAccessTokenMerchant:", error);
    throw new Error(`Failed to get PayPal access token: ${error.message}`);
  }
}

// Check merchant capabilities for Google Pay and Venmo - DYNAMIC VERSION
async function checkMerchantCapabilities(merchantId) {
  const accessToken = await getPayPalAccessTokenForGateway();
  const partner_Id = "SCU5298GK2T84";

  console.log("🔍 Checking merchant capabilities for:", merchantId);

  try {
    // Use the correct PayPal merchant integrations API
    const response = await fetch(
      `https://api-m.sandbox.paypal.com/v1/customer/partners/${partner_Id}/merchant-integrations/${merchantId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📡 PayPal API Response Status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Raw merchant capabilities data:", {
        merchantId,
        capabilities: data,
        timestamp: new Date().toISOString(),
      });

      // Parse capabilities from the real API response
      const capabilities = data.capabilities || [];
      const products = data.products || [];

      // Dynamically check for specific capabilities
      const hasAlternativePayments = capabilities.some(
        (cap) =>
          cap.name === "PAYPAL_CHECKOUT_ALTERNATIVE_PAYMENT_METHODS" &&
          cap.status === "ACTIVE"
      );

      const hasPayPalCheckout = capabilities.some(
        (cap) => cap.name === "PAYPAL_CHECKOUT" && cap.status === "ACTIVE"
      );

      const hasSubscriptions = capabilities.some(
        (cap) => cap.name === "SUBSCRIPTIONS" && cap.status === "ACTIVE"
      );

      const hasDonations = capabilities.some(
        (cap) => cap.name === "ACCEPT_DONATIONS" && cap.status === "ACTIVE"
      );

      const hasInstallments = capabilities.some(
        (cap) => cap.name === "INSTALLMENTS" && cap.status === "ACTIVE"
      );

      const hasPayments = capabilities.some(
        (cap) => cap.name === "PAYMENTS" && cap.status === "ACTIVE"
      );

      const hasAdvancedCheckout = capabilities.some(
        (cap) => cap.name === "ADVANCED_CHECKOUT" && cap.status === "ACTIVE"
      );

      // Check for specific payment methods in products and capabilities
      const hasVenmoProduct = products.some(
        (product) =>
          (product.name === "PAYMENT_METHODS" &&
            product.vetting_status === "SUBSCRIBED") ||
          (product.capabilities &&
            product.capabilities.includes("VENMO_PAY_PROCESSING"))
      );

      // Also check if Venmo is directly in capabilities
      const hasVenmoCapability = capabilities.some(
        (cap) => cap.name === "VENMO_PAY_PROCESSING" && cap.status === "ACTIVE"
      );

      // Check for Google Pay in both products and capabilities
      const hasGooglePayProduct = products.some(
        (product) =>
          (product.name === "GOOGLE_PAY" &&
            product.vetting_status === "SUBSCRIBED") ||
          (product.capabilities && product.capabilities.includes("GOOGLE_PAY"))
      );

      // Also check if Google Pay is directly in capabilities
      const hasGooglePayCapability = capabilities.some(
        (cap) => cap.name === "GOOGLE_PAY" && cap.status === "ACTIVE"
      );

      console.log("🔍 Parsed merchant capabilities:", {
        hasAlternativePayments,
        hasPayPalCheckout,
        hasSubscriptions,
        hasDonations,
        hasInstallments,
        hasPayments,
        hasAdvancedCheckout,
        hasVenmoProduct,
        hasVenmoCapability,
        hasGooglePayProduct,
        hasGooglePayCapability,
        paymentsReceivable: data.payments_receivable,
      });

      // Return dynamic capabilities based on actual PayPal data
      return {
        // Remove success property to avoid confusion with API response
        merchantId: merchantId,

        // Payment method capabilities (dynamic)
        paypalCheckout: hasPayPalCheckout || hasPayments,
        alternativePayments: hasAlternativePayments,
        venmo:
          hasVenmoCapability || (hasAlternativePayments && hasVenmoProduct),
        googlePay:
          hasGooglePayCapability ||
          (hasAlternativePayments && hasGooglePayProduct),
        cards: hasPayPalCheckout || hasAdvancedCheckout,
        payLater: hasInstallments,

        // Feature capabilities (dynamic)
        subscriptions: hasSubscriptions,
        donations: hasDonations,
        installments: hasInstallments,
        advancedCheckout: hasAdvancedCheckout,

        // Merchant status (dynamic)
        paymentsReceivable: data.payments_receivable || false,
        primaryEmailConfirmed: data.primary_email_confirmed || false,
        legalName: data.legal_name || null,
        primaryEmail: data.primary_email || null,
        country: data.country || "US",
        currency: data.primary_currency || "USD",

        // Account status
        accountStatus: data.account_status || "UNKNOWN",
        onboardingStatus: data.onboarding_status || "UNKNOWN",

        // Raw data for debugging and future enhancements
        rawCapabilities: capabilities,
        rawProducts: products,
        lastChecked: new Date().toISOString(),
      };
    } else {
      // Handle API errors more gracefully
      const errorData = await response.json().catch(() => ({}));
      console.warn("⚠️ PayPal API returned error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        merchantId,
      });

      // Return error response instead of static fallback
      return {
        error: "PAYPAL_API_ERROR",
        message: `PayPal API returned ${response.status}: ${response.statusText}`,
        details: errorData,
        merchantId: merchantId,

        // Minimal safe defaults - let frontend handle the error
        paypalCheckout: false,
        alternativePayments: false,
        venmo: false,
        googlePay: false,
        cards: false,
        payLater: false,
        subscriptions: false,
        donations: false,
        installments: false,

        paymentsReceivable: false,
        primaryEmailConfirmed: false,
        lastChecked: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("❌ Error checking merchant capabilities:", error);

    // Return error response instead of static fallback
    return {
      error: "NETWORK_ERROR",
      message: "Failed to connect to PayPal API",
      details: error.message,
      merchantId: merchantId,

      // Minimal safe defaults - let frontend handle the error
      paypalCheckout: false,
      alternativePayments: false,
      venmo: false,
      googlePay: false,
      cards: false,
      payLater: false,
      subscriptions: false,
      donations: false,
      installments: false,

      paymentsReceivable: false,
      primaryEmailConfirmed: false,
      lastChecked: new Date().toISOString(),
    };
  }
}

// Validate plan_id
async function validatePlanId(merchantId, planId) {
  const accessToken = await getPayPalAccessTokenForGatewayMerchant(merchantId);
  try {
    const response = await fetch(
      `https://api-m.sandbox.paypal.com/v1/billing/plans/${planId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error("Plan validation failed:", JSON.stringify(data, null, 2));
      throw new Error(data.message || "Invalid plan ID");
    }
    console.log("Plan validated:", planId);
    return true;
  } catch (error) {
    console.error("Error validating plan ID:", error);
    throw new Error(`Invalid plan ID: ${error.message}`);
  }
}

async function initiateOrder(
  merchantId,
  amount,
  currency,
  description,
  itemNumber,
  returnUrl,
  cancelUrl,
  products = [],
  shippingAddress = null,
  donorInfo = null,
  isDonation = false
) {
  const accessToken = await getPayPalAccessTokenForGatewayMerchant(merchantId);

  // Normalize and bound itemNumber usages per PayPal limits
  const { invoiceId, customId, requestId } = normalizePayPalIds(itemNumber);

  // Build items and totals if products array is provided
  const hasProducts = Array.isArray(products) && products.length > 0;
  const currencyCode = currency || "USD";

  // Zero-decimal currency handling (per PayPal docs)
  const ZERO_DECIMAL = new Set(["JPY", "HUF", "TWD"]);
  const isZeroDecimal = (code) => ZERO_DECIMAL.has(String(code).toUpperCase());
  const formatAmount = (code, val) => {
    const num = Number(val || 0);
    return isZeroDecimal(code) ? String(Math.round(num)) : num.toFixed(2);
  };

  let items = [];
  let itemsTotal = 0;
  let shippingAmount = 0;
  if (hasProducts) {
    items = products.map((p) => {
      const qty = Number(p.quantity || 1);
      const total = Number(p.amount || 0);
      const unit = qty > 0 ? total / qty : total;
      itemsTotal += total;
      return {
        name: p.name || "Item",
        quantity: String(qty),
        unit_amount: {
          currency_code: currencyCode,
          value: formatAmount(currencyCode, unit),
        },
        ...(p.sku && { sku: String(p.sku) }),
        ...(p.description && { description: p.description }),
        // Category heuristics: physical if shipping address present
        category: shippingAddress ? "PHYSICAL_GOODS" : "DIGITAL_GOODS",
      };
    });
    // Optional shipping cost from products payload
    const shippingLine = products.find((p) => p.type === "shipping");
    if (shippingLine && shippingLine.amount) {
      shippingAmount = Number(shippingLine.amount) || 0;
    }
  }

  // Single purchase unit per PayPal docs; include breakdown when items exist
  const purchaseUnit = {
    invoice_id: isDonation ? `DON-${invoiceId}` : String(invoiceId),
    custom_id: String(customId),
    ...(description && { description }),
    payee: { merchant_id: merchantId },
    amount: hasProducts
      ? {
          currency_code: currencyCode,
          value: formatAmount(currencyCode, itemsTotal + shippingAmount),
          breakdown: {
            item_total: {
              currency_code: currencyCode,
              value: formatAmount(currencyCode, itemsTotal),
            },
            ...(shippingAmount
              ? {
                  shipping: {
                    currency_code: currencyCode,
                    value: formatAmount(currencyCode, shippingAmount),
                  },
                }
              : {}),
          },
        }
      : {
          currency_code: currencyCode,
          value: formatAmount(currencyCode, amount),
        },
    ...(hasProducts && { items }),
    ...(shippingAddress && {
      shipping: {
        name: { full_name: shippingAddress.name.full_name },
        address: {
          address_line_1: shippingAddress.address.address_line_1,
          address_line_2: shippingAddress.address.address_line_2,
          admin_area_2: shippingAddress.address.admin_area_2,
          admin_area_1: shippingAddress.address.admin_area_1,
          postal_code: shippingAddress.address.postal_code,
          country_code: shippingAddress.address.country_code,
        },
      },
    }),
  };

  // Donation-specific soft descriptor
  if (isDonation) {
    purchaseUnit.soft_descriptor = "DONATION";
  }

  const payload = {
    intent: "CAPTURE",
    purchase_units: [purchaseUnit],
    payment_source: {
      paypal: {
        experience_context: {
          payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
          landing_page: "LOGIN",
          shipping_preference: shippingAddress
            ? "SET_PROVIDED_ADDRESS"
            : "GET_FROM_FILE",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      },
    },
  };

  console.log("Order payload:", JSON.stringify(payload, null, 2));
  const response = await fetch(
    "https://api-m.sandbox.paypal.com/v2/checkout/orders",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestId,
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    console.error("Order creation failed:", JSON.stringify(data, null, 2));
    throw new Error(data.message || "Failed to create PayPal order");
  }
  console.log("PayPal order created:", data.id);
  const approvalUrl =
    data.links?.find((link) => link.rel === "payer-action")?.href ||
    data.links?.find((link) => link.rel === "approve")?.href;
  return {
    orderId: data.id,
    approvalUrl,
  };
}

async function initiateSubscription(
  merchantId,
  planId,
  itemNumber,
  returnUrl,
  cancelUrl,
  quantity
) {
  if (!planId) {
    console.error("Validation error: Missing planId");
    throw new Error("Plan ID required for subscription");
  }
  await validatePlanId(merchantId, planId); // Validate plan_id
  const accessToken = await getPayPalAccessTokenForGatewayMerchant(merchantId);
  const startTime = new Date(Date.now() + 10 * 60 * 1000);
  const formattedStartTime = startTime.toISOString().split(".")[0] + "Z";
  const {
    invoiceId: _inv,
    customId,
    requestId,
  } = normalizePayPalIds(itemNumber);
  const payload = {
    plan_id: planId,
    start_time: formattedStartTime,
    custom_id: customId,
    payee: {
      merchant_id: merchantId,
    },
    application_context: {
      brand_name: "QuickForm Subscriptions",
      locale: "en-US",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      payment_method: {
        payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
      },
      return_url: returnUrl || "https://example.com/return",
      cancel_url: cancelUrl || "https://example.com/cancel",
    },
  };

  if (quantity) {
    payload.quantity = quantity.toString();
  }

  console.log("Subscription payload:", JSON.stringify(payload, null, 2));
  const response = await fetch(
    "https://api-m.sandbox.paypal.com/v1/billing/subscriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestId,
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    console.error(
      "PayPal subscription creation failed:",
      JSON.stringify(data, null, 2)
    );
    throw new Error(data.message || "Failed to create PayPal subscription");
  }
  console.log("PayPal subscription created:", data.id);
  return {
    subscriptionId: data.id,
    approvalUrl: data.links.find((link) => link.rel === "approve")?.href,
  };
}

async function captureOrder(merchantId, orderId) {
  const accessToken = await getPayPalAccessTokenForGatewayMerchant(merchantId);
  const response = await fetch(
    `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  const data = await response.json();
  if (!response.ok) {
    console.error("Order capture failed:", JSON.stringify(data, null, 2));
    throw new Error(data.message || "Failed to capture PayPal order");
  }
  console.log("PayPal order captured:", orderId);

  // Check if this is a donation and log for receipt processing
  if (
    data.purchase_units?.[0]?.custom_id?.includes("DON-") ||
    data.purchase_units?.[0]?.description?.includes("Donation")
  ) {
    console.log("🎉 Donation captured - ready for receipt processing:", {
      orderId,
      amount: data.purchase_units?.[0]?.amount?.value,
      customId: data.purchase_units?.[0]?.custom_id,
      currency: data.purchase_units?.[0]?.amount?.currency_code,
    });

    try {
      // Generate donation receipt data
      const receiptData = {
        orderId,
        amount: data.purchase_units?.[0]?.amount?.value,
        currency: data.purchase_units?.[0]?.amount?.currency_code || "USD",
        customId: data.purchase_units?.[0]?.custom_id,
        captureTime: new Date().toISOString(),
        transactionId: data.id,
      };

      console.log("📧 Donation receipt data prepared:", receiptData);
      // Here you would integrate with your email service to send donation receipt
      // await sendDonationReceipt(receiptData);
    } catch (receiptError) {
      console.error("⚠️ Error preparing donation receipt:", receiptError);
      // Don't fail the capture if receipt preparation fails
    }
  }

  return data;
}

async function getSubscriptionStatus(merchantId, subscriptionId) {
  try {
    console.log("🔑 Getting PayPal access token for merchant:", merchantId);
    const accessToken = await getPayPalAccessTokenForGatewayMerchant(
      merchantId
    );
    console.log("✅ Access token obtained successfully");

    // Validate subscription ID format
    if (!subscriptionId || typeof subscriptionId !== "string") {
      throw new Error(`Invalid subscription ID: ${subscriptionId}`);
    }

    // PayPal subscription IDs typically start with "I-" for subscriptions
    console.log("🔍 Subscription ID format check:", {
      subscriptionId,
      startsWithI: subscriptionId.startsWith("I-"),
      length: subscriptionId.length,
    });

    const apiUrl = `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionId}`;
    console.log("🌐 Making PayPal API call to:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log("📡 PayPal API response status:", response.status);

    const data = await response.json();
    console.log("📦 PayPal API response data:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("❌ Subscription status fetch failed:", {
        status: response.status,
        statusText: response.statusText,
        data: data,
        subscriptionId,
        merchantId,
      });

      // Handle specific PayPal errors
      if (response.status === 404) {
        // Check if this looks like a plan ID instead of subscription ID
        if (subscriptionId.startsWith("P-")) {
          throw new Error(
            `Invalid ID: ${subscriptionId} appears to be a plan ID. Subscription IDs start with 'I-'. Please use the actual subscription ID from PayPal.`
          );
        } else {
          throw new Error(
            `Subscription not found: ${subscriptionId}. This subscription may not exist or may have been cancelled.`
          );
        }
      } else if (response.status === 401) {
        throw new Error(
          "Authentication failed. Please check merchant credentials."
        );
      } else {
        throw new Error(
          data.message ||
            data.error_description ||
            `PayPal API error: ${response.status} ${response.statusText}`
        );
      }
    }

    if (!data.status) {
      console.error("❌ No status field in PayPal response:", data);
      throw new Error("Invalid PayPal response: missing status field");
    }

    const status = data.status.toLowerCase();
    console.log("✅ Subscription status retrieved:", status);
    return status;
  } catch (error) {
    console.error("❌ Error in getSubscriptionStatus:", {
      error: error.message,
      stack: error.stack,
      merchantId,
      subscriptionId,
    });
    throw error;
  }
}

// Export individual functions for use by other handlers
export {
  checkMerchantCapabilities,
  getPayPalAccessTokenForGateway,
  getPayPalAccessTokenForGatewayMerchant,
  initiateOrder,
  initiateSubscription,
  captureOrder,
  getSubscriptionStatus,
  validatePlanId,
};

export const handler = async (event) => {
  try {
    console.log(
      "🚀 Payment Gateway Handler - Received event:",
      JSON.stringify(event, null, 2)
    );
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    console.log("📨 HTTP method:", method);
    console.log("📦 Request body:", body);

    if (method !== "POST") {
      return {
        statusCode: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Method Not Allowed",
          message: "Only POST method is supported",
        }),
      };
    }

    // Validate action is provided
    if (!body.action) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Missing action",
          message: "Action parameter is required",
        }),
      };
    }

    // Initiate payment - UPDATED: No data storage, only payment processing
    if (body.action === "initiate-payment") {
      const {
        merchantId,
        paymentType,
        returnUrl,
        cancelUrl,
        itemNumber,
        planId,
        amount,
        currency,
        itemName,
        products,
        shippingAddress,
        quantity,
        donorInfo,
        donationFrequency,
        customRecurringData,
        isDonationSubscription,
        donationButtonId,
      } = body;

      console.log("🔍 Initiate payment with data:", body);

      // Validate required fields
      if (
        !merchantId ||
        !paymentType ||
        !returnUrl ||
        !cancelUrl ||
        !itemNumber
      ) {
        console.error("❌ Validation error: Missing required fields");
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Missing required fields",
            message:
              "merchantId, paymentType, returnUrl, cancelUrl, and itemNumber are required",
          }),
        };
      }

      console.log(
        `🎯 Processing ${paymentType} payment for merchant: ${merchantId}`
      );
      let result;

      try {
        // Handle donation subscriptions (custom recurring donations)
        if (isDonationSubscription && customRecurringData && donorInfo) {
          console.log(
            "🎯 Creating donation subscription plan for:",
            donorInfo.email || "anonymous donor"
          );

          // Import the donation subscription function
          const { createDonationSubscriptionPlan } = await import(
            "./productSubscriptionHandler.js"
          );

          // Create dynamic donation subscription plan
          const donationPlan = await createDonationSubscriptionPlan(
            merchantId,
            {
              amount: amount,
              frequency: customRecurringData.frequency,
              total_cycles: customRecurringData.total_cycles,
              currency_code: currency || "USD",
            },
            donorInfo
          );

          console.log("✅ Donation plan created:", donationPlan.id);

          // Create subscription with the new plan
          result = await initiateSubscription(
            merchantId,
            donationPlan.id,
            itemNumber,
            returnUrl,
            cancelUrl,
            1 // quantity always 1 for donations
          );

          // Return subscription details for frontend
          result = {
            ...result,
            paymentType: "donation_subscription",
            planId: donationPlan.id,
            amount: amount,
            currency: currency || "USD",
            donorInfo: donorInfo,
            customRecurringData: customRecurringData,
          };

          console.log(
            "✅ Donation subscription initiated:",
            result.subscriptionId
          );
        }
        // Handle regular subscriptions
        else if (paymentType === "subscription") {
          if (!planId) {
            return {
              statusCode: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              body: JSON.stringify({
                success: false,
                error: "Missing planId",
                message: "planId is required for subscription payments",
              }),
            };
          }

          result = await initiateSubscription(
            merchantId,
            planId,
            itemNumber,
            returnUrl,
            cancelUrl,
            quantity
          );

          // Add subscription metadata
          result = {
            ...result,
            paymentType: "subscription",
            planId: planId,
            quantity: quantity,
          };

          console.log("✅ Subscription initiated:", result.subscriptionId);
        }
        // Handle donation button (existing PayPal button ID)
        else if (paymentType === "donation_button") {
          if (!donationButtonId) {
            return {
              statusCode: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              body: JSON.stringify({
                success: false,
                error: "Missing donation button ID",
                message:
                  "donationButtonId is required for donation_button payments",
              }),
            };
          }

          // For donation buttons, return configuration for frontend rendering
          result = {
            paymentType: "donation_button",
            donationButtonId: donationButtonId,
            status: "CONFIGURED",
            message: "Donation button configured successfully",
          };

          console.log("✅ Donation button configured:", donationButtonId);
        }
        // Handle regular payments (donation, custom_amount, product_wise)
        else {
          if (!amount && (!products || products.length === 0)) {
            return {
              statusCode: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              body: JSON.stringify({
                success: false,
                error: "Amount or products required",
                message:
                  "Either amount or products array is required for payment",
              }),
            };
          }

          const totalAmount =
            products?.length > 0
              ? products.reduce((sum, p) => sum + p.amount, 0)
              : amount;

          result = await initiateOrder(
            merchantId,
            totalAmount,
            currency,
            itemName,
            itemNumber,
            returnUrl,
            cancelUrl,
            products,
            shippingAddress,
            donorInfo,
            paymentType === "donation" // isDonation flag
          );

          // Add payment metadata
          result = {
            ...result,
            paymentType: paymentType,
            amount: totalAmount,
            currency: currency || "USD",
            products: products?.length > 0 ? products : null,
            isDonation: paymentType === "donation",
            donorInfo: donorInfo || null,
            donationFrequency: donationFrequency || null,
          };

          console.log(`✅ ${paymentType} payment initiated:`, result.orderId);
        }

        // Return success response with payment details (NO DATA STORAGE)
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            data: result,
            message: `${paymentType} payment initiated successfully`,
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        console.error(`❌ Error initiating ${paymentType} payment:`, error);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Payment initiation failed",
            message: error.message,
            paymentType: paymentType,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    // Capture payment - UPDATED: No data storage, only payment processing
    if (body.action === "capture-payment") {
      const { merchantId, orderId, paymentType, itemNumber } = body;

      if (!merchantId || !orderId) {
        console.error("❌ Validation error: Missing merchantId or orderId");
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Missing required fields",
            message: "merchantId and orderId are required",
          }),
        };
      }

      try {
        console.log(`🎯 Capturing payment for order: ${orderId}`);
        const captureResult = await captureOrder(merchantId, orderId);
        const status =
          captureResult.status === "COMPLETED" ? "completed" : "failed";

        console.log(`✅ Payment capture ${status}:`, orderId);

        // Return capture result (NO DATA STORAGE)
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            message: "Payment captured successfully",
            data: {
              status: status,
              orderId: orderId,
              merchantId: merchantId,
              paymentType: paymentType || "unknown",
              itemNumber: itemNumber,
              captureResult: captureResult,
              transactionId: captureResult.id,
              amount: captureResult.purchase_units?.[0]?.amount?.value,
              currency:
                captureResult.purchase_units?.[0]?.amount?.currency_code,
            },
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        console.error("❌ Error capturing payment:", error);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Payment capture failed",
            message: error.message,
            orderId: orderId,
            merchantId: merchantId,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    // Handle PayPal Donate SDK completion - UPDATED: No data storage, only status return
    if (body.action === "handle-donation-complete") {
      const {
        transactionId,
        status,
        amount,
        currencyCode,
        customMessage,
        itemNumber,
        itemName,
        merchantId,
        environment,
        timestamp,
        isRecurring,
        donationType,
      } = body;

      console.log("🎉 Processing PayPal Donate completion:", {
        transactionId,
        status,
        amount,
        currencyCode,
        merchantId,
        environment,
        isRecurring,
        donationType,
      });

      if (!transactionId || !merchantId) {
        console.error(
          "❌ Validation error: Missing transactionId or merchantId"
        );
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Missing required fields",
            message: "transactionId and merchantId are required",
          }),
        };
      }

      try {
        // Generate unique donation record ID for reference
        const donationRecordId = isRecurring
          ? `RECURRING-${transactionId}-${Date.now()}`
          : `DONATE-${transactionId}-${Date.now()}`;

        // Determine record type and payment details
        const recordType = isRecurring ? "subscription" : "transaction";
        const paymentTypeDetail = isRecurring
          ? "paypal_donate_recurring"
          : "paypal_donate_sdk";

        console.log("✅ Donation completion processed:", {
          donationRecordId,
          recordType,
          paymentTypeDetail,
          isRecurring,
        });

        // Return donation completion data (NO DATA STORAGE)
        const donationData = {
          id: donationRecordId,
          type: recordType,
          paymentType: paymentTypeDetail,
          transactionId: transactionId,
          status: status === "Completed" ? "completed" : "pending",
          amount: amount ? parseFloat(amount) : 0,
          currencyCode: currencyCode || "USD",
          itemName: itemName || "General Donation",
          itemNumber: itemNumber || null,
          customMessage: customMessage || null,
          environment: environment || "sandbox",
          merchantId: merchantId,
          isRecurring: isRecurring,
          donationType: donationType,
          isDonation: true,
          isPayPalDonateSDK: true,
          timestamp: timestamp || new Date().toISOString(),
          // For recurring donations, include subscription-specific data
          ...(isRecurring && {
            subscriptionId: transactionId,
            subscriptionStatus: status === "Completed" ? "ACTIVE" : "PENDING",
            nextPaymentDate: getNextPaymentDate(), // Estimate next payment
            paymentCount: 1, // First payment
          }),
        };

        // Generate donation receipt data for frontend
        const receiptData = {
          donationId: donationRecordId,
          transactionId,
          amount: amount || "0",
          currencyCode: currencyCode || "USD",
          donationDate: timestamp || new Date().toISOString(),
          itemName: itemName || "General Donation",
          customMessage,
          merchantId,
          environment,
          receiptNumber: `RECEIPT-${transactionId}`,
        };

        console.log(
          "✅ Donation completion processed successfully:",
          donationRecordId
        );

        // Return donation completion data (NO DATA STORAGE)
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            message: "Donation processed successfully",
            data: donationData,
            receiptData: receiptData,
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        console.error("❌ Error processing donation:", error);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Failed to process donation",
            message: error.message,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    // Handle cancel
    // Handle cancel - Fixed version
    if (body.action === "handle-cancel") {
      const { merchantId, itemNumber, paymentType, orderId, subscriptionId } =
        body;

      console.log("Handle cancel request:", {
        merchantId,
        itemNumber,
        paymentType,
      });

      if (!merchantId || !itemNumber) {
        console.error("Validation error: Missing merchantId or itemNumber");
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Missing merchantId or itemNumber" }),
        };
      }

      try {
        console.log("Attempting to get item from DynamoDB:", {
          merchantId,
          itemNumber,
        });

        // Get form data and check transaction status
        const formData = await getFormData(userId, formId);
        if (!formData || !formData.transactions) {
          console.log(
            "Form or transactions not found, creating cancellation record"
          );

          // Add cancellation record to form data
          await addTransactionToForm(userId, formId, {
            type: "transaction",
            paymentType: paymentType || "unknown",
            status: "canceled",
            merchantId: merchantId,
            itemNumber: itemNumber,
            orderId: orderId || null,
            subscriptionId: subscriptionId || null,
          });
        } else {
          // Find existing transaction
          const transactionIndex = formData.transactions.findIndex(
            (txn) =>
              txn.itemNumber === itemNumber && txn.merchantId === merchantId
          );

          if (transactionIndex !== -1) {
            const transaction = formData.transactions[transactionIndex];

            // Check if already completed
            if (transaction.status === "completed") {
              console.log("Cannot cancel completed payment");
              return {
                statusCode: 400,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({
                  error: "Cannot cancel a completed payment",
                }),
              };
            }

            // Update transaction status to canceled
            formData.transactions[transactionIndex] = {
              ...transaction,
              status: "canceled",
              updatedAt: new Date().toISOString(),
            };

            await updateFormData(userId, formId, formData);
          } else {
            // Add new cancellation record
            await addTransactionToForm(userId, formId, {
              type: "transaction",
              paymentType: paymentType || "unknown",
              status: "canceled",
              merchantId: merchantId,
              itemNumber: itemNumber,
              orderId: orderId || null,
              subscriptionId: subscriptionId || null,
            });
          }
        }

        console.log(
          `Payment ${itemNumber} canceled successfully for merchant ${merchantId}`
        );

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message: "Payment canceled successfully",
            status: "canceled",
            itemNumber: itemNumber,
          }),
        };
      } catch (dbError) {
        console.error("DynamoDB error in handle-cancel:", dbError);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Failed to cancel payment",
            details: dbError.message,
          }),
        };
      }
    }

    // Get subscription status
    if (body.action === "get-subscription-status") {
      console.log("🔍 Processing get-subscription-status request:", {
        merchantId: body.merchantId,
        subscriptionId: body.subscriptionId,
        itemNumber: body.itemNumber,
      });

      const { merchantId, subscriptionId, itemNumber } = body;
      if (!merchantId || !subscriptionId) {
        console.error(
          "❌ Validation error: Missing merchantId or subscriptionId"
        );
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Missing merchantId or subscriptionId",
          }),
        };
      }

      try {
        console.log("🚀 Fetching subscription status from PayPal...");
        const status = await getSubscriptionStatus(merchantId, subscriptionId);
        console.log("✅ Subscription status received:", status);

        // Update transaction status in form data
        const formData = await getFormData(userId, formId);
        if (formData && formData.transactions) {
          const transactionIndex = formData.transactions.findIndex(
            (txn) =>
              txn.subscriptionId === subscriptionId &&
              txn.merchantId === merchantId
          );

          if (transactionIndex !== -1) {
            formData.transactions[transactionIndex] = {
              ...formData.transactions[transactionIndex],
              status: status,
              updatedAt: new Date().toISOString(),
            };

            await updateFormData(userId, formId, formData);
            console.log("✅ Form data updated successfully");
          }
        }

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            message: "Subscription status retrieved successfully",
            data: {
              status: status,
              subscriptionId: subscriptionId,
              merchantId: merchantId,
            },
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        console.error("❌ Error in get-subscription-status:", {
          error: error.message,
          stack: error.stack,
          merchantId,
          subscriptionId,
          itemNumber,
        });

        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: `Failed to get subscription status: ${error.message}`,
          }),
        };
      }
    }

    // List transactions
    if (body.action === "list-transactions") {
      const { merchantId } = body;
      if (!merchantId) {
        console.error("Validation error: Missing merchantId");
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Missing merchantId" }),
        };
      }

      // Get transactions from form data
      const formData = await getFormData(userId, formId);
      const transactions =
        formData?.transactions?.filter(
          (txn) => txn.merchantId === merchantId && txn.type === "transaction"
        ) || [];

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          message: "Transactions retrieved successfully",
          data: {
            transactions: transactions,
            count: transactions.length,
            merchantId: merchantId,
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Get merchant capabilities for Google Pay, Venmo, etc.
    if (body.action === "get-merchant-capabilities") {
      const { merchantId } = body;
      if (!merchantId) {
        console.error("Validation error: Missing merchantId");
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Missing merchantId" }),
        };
      }

      try {
        console.log("🔍 Checking merchant capabilities for:", merchantId);
        const capabilities = await checkMerchantCapabilities(merchantId);

        console.log("✅ Merchant capabilities retrieved:", {
          merchantId,
          capabilities,
          timestamp: new Date().toISOString(),
        });

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            message: "Merchant capabilities retrieved successfully",
            data: {
              capabilities: capabilities,
              merchantId: merchantId,
            },
            // Also include capabilities at root level for backward compatibility
            capabilities: capabilities,
            merchantId: merchantId,
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        console.error("❌ Error getting merchant capabilities:", error);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Failed to get merchant capabilities",
            details: error.message,
            merchantId: merchantId,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    // Handle IPN
    if (body.txn_type) {
      const verifyResponse = await fetch(
        "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await getPayPalAccessTokenForGatewayMerchant(
              body.business
            )}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event: body }),
        }
      );
      const verification = await verifyResponse.json();
      if (verification.verification_status !== "SUCCESS") {
        console.error("Invalid IPN:", JSON.stringify(body, null, 2));
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Invalid IPN" }),
        };
      }

      if (
        body.txn_type === "web_accept" ||
        body.txn_type === "subscr_payment"
      ) {
        const productId = body.item_number || body.custom;
        const paymentStatus = body.payment_status.toLowerCase();
        if (productId) {
          await dynamoClient.send(
            new UpdateItemCommand({
              TableName: TABLE_NAME,
              Key: {
                FormName: { S: body.business },
                productId: { S: productId },
              },
              UpdateExpression:
                "set #status = :status, #updatedAt = :updatedAt",
              ExpressionAttributeNames: {
                "#status": "status",
                "#updatedAt": "updatedAt",
              },
              ExpressionAttributeValues: {
                ":status": { S: paymentStatus },
                ":updatedAt": { S: new Date().toISOString() },
              },
            })
          );
        }
      }
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "IPN processed" }),
      };
    }

    // List subscriptions (recurring donations)
    if (body.action === "list-subscriptions") {
      const { merchantId } = body;
      if (!merchantId) {
        console.error("Validation error: Missing merchantId");
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Missing merchantId" }),
        };
      }

      // Get subscriptions from form data
      const formData = await getFormData(userId, formId);
      const subscriptions =
        formData?.transactions?.filter(
          (txn) =>
            txn.merchantId === merchantId &&
            txn.type === "subscription" &&
            txn.isRecurring === true
        ) || [];

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          message: "Subscriptions retrieved successfully",
          data: {
            subscriptions: subscriptions,
            count: subscriptions.length,
            merchantId: merchantId,
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Invalid action",
        action: body.action,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error(
      "❌ Payment Gateway Handler Error:",
      JSON.stringify(error, null, 2)
    );
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
