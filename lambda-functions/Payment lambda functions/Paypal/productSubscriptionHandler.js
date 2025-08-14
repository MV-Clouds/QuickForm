// PayPal Product & Subscription Handler
// This handler only deals with PayPal API operations
// Form data storage is handled by the form builder itself

// PayPal credentials
const PAYPAL_CLIENT_ID =
  "AbYnm03NLihzGgGlRFtdNt2jx3rHYOSZySVeFE-VIsY2C0khi8zfHn1uVq4zq7yPOwKg4ynE0-jJKvYD";
const PAYPAL_CLIENT_SECRET =
  "EPhYWl3_AjVezyDCpkskZc4LYb4N6R2A9Zigz_B1KcYX5e2orHZd0Yumka44XFWSBtSb7bi5TB8LS7rB";

// Helper: Get PayPal access token for products
async function getPayPalAccessTokenForProducts() {
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
    console.error("Error in getPayPalAccessToken:", error);
    throw new Error(`Failed to get PayPal access token: ${error.message}`);
  }
}

// Helper: Get PayPal access token for a merchant
async function getPayPalAccessTokenForMerchant(merchantId) {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
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
      console.error("Failed to get access token:", data);
      throw new Error(
        data.error_description || "Failed to get PayPal access token"
      );
    }
    console.log("Access token retrieved for merchant:", merchantId);
    return data.access_token;
  } catch (error) {
    console.error("Error in getPayPalAccessToken:", error);
    throw new Error(`Failed to get PayPal access token: ${error.message}`);
  }
}

// Helper: Create a PayPal product
async function createPayPalProduct(accessToken, name = "Default Product") {
  try {
    const response = await fetch(
      "https://api-m.sandbox.paypal.com/v1/catalogs/products",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          description: "Auto-created product for subscription",
          type: "SERVICE",
          category: "SOFTWARE",
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error("PayPal product creation failed:", data);
      throw new Error(data.message || "Failed to create PayPal product");
    }
    console.log("PayPal product created:", data.id);
    return data.id;
  } catch (error) {
    console.error("Error in createPayPalProduct:", error);
    throw new Error(`Failed to create PayPal product: ${error.message}`);
  }
}

// Helper: Create a PayPal plan
async function createPayPalPlan(merchantId, planData) {
  try {
    const accessToken = await getPayPalAccessTokenForMerchant(merchantId);
    if (!planData.product_id) {
      console.log("No product_id, creating new PayPal product...");
      const productId = await createPayPalProduct(
        accessToken,
        planData.name || "Unnamed Plan Product"
      );
      planData.product_id = productId;
    }

    // Handle tiered pricing
    const hasTiers =
      planData.billing_cycles &&
      planData.billing_cycles.some(
        (bc) =>
          bc.pricing_scheme && bc.pricing_scheme.pricing_model === "TIERED"
      );
    if (hasTiers) {
      planData.quantity_supported = true;
    }

    const response = await fetch(
      "https://api-m.sandbox.paypal.com/v1/billing/plans",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(planData),
      }
    );
    const plan = await response.json();
    if (!response.ok) {
      console.error("PayPal plan creation failed:", plan);
      throw new Error(plan.message || "Failed to create PayPal plan");
    }
    console.log("PayPal plan created:", plan.id);
    return plan;
  } catch (error) {
    console.error("Error in createPayPalPlan:", error);
    throw new Error(`Failed to create PayPal plan: ${error.message}`);
  }
}

// Helper: List PayPal subscriptions
async function listPaypalSubscriptions(merchantId) {
  try {
    const accessToken = await getPayPalAccessTokenForMerchant(merchantId);
    const allPlans = [];
    let page = 1;
    const pageSize = 20;

    while (true) {
      const response = await fetch(
        `https://api-m.sandbox.paypal.com/v1/billing/plans?page=${page}&page_size=${pageSize}&total_required=true`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("PayPal subscriptions fetch failed:", data);
        throw new Error(data.message || "Failed to fetch PayPal subscriptions");
      }

      if (data.plans && Array.isArray(data.plans)) {
        allPlans.push(...data.plans);
      }

      if (!data.plans || data.plans.length < pageSize) break;

      page++;
    }

    console.log(`Fetched ${allPlans.length} PayPal billing plans.`);
    return allPlans;
  } catch (error) {
    console.error("Error in listPaypalSubscriptions:", error);
    throw new Error(`Failed to fetch PayPal subscriptions: ${error.message}`);
  }
}

// Export functions for use in other handlers
export {
  createPayPalProduct,
  createPayPalPlan,
  getPayPalAccessTokenForProducts,
  getPayPalAccessTokenForMerchant,
  listPaypalSubscriptions,
};

export const handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    console.log("Received HTTP method:", method);
    console.log("Received body:", body);

    const { action } = body;

    switch (action) {
      case "create-product":
        return await createProduct(body);

      case "create-subscription-plan":
        return await createSubscriptionPlan(body);

      case "update-subscription-plan":
        return await updateSubscriptionPlan(body);

      case "create-donation-plan":
        return await createDonationPlan(body);

      case "list-paypal-subscriptions":
        return await listPaypalSubscriptionsAction(body);

      case "create-product-for-form":
        return await createProductForForm(body);

      case "create-subscription-for-form":
        return await createSubscriptionForForm(body);

      case "create-donation-for-form":
        return await createDonationForForm(body);

      default:
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: `Unknown action: ${action}`,
          }),
        };
    }
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};

// Action handlers - Only PayPal operations, no storage

async function createProduct(body) {
  console.log("🔄 Creating PayPal product");

  const { merchantId, name, description } = body;

  if (!merchantId || !name) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Missing required fields: merchantId, name",
      }),
    };
  }

  try {
    const accessToken = await getPayPalAccessTokenForProducts();
    const productId = await createPayPalProduct(accessToken, name);

    console.log("✅ PayPal product created:", productId);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        productId: productId,
        message: "Product created successfully",
      }),
    };
  } catch (error) {
    console.error("❌ Error creating PayPal product:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: `Failed to create product: ${error.message}`,
      }),
    };
  }
}

async function createSubscriptionPlan(body) {
  console.log("🔄 Creating PayPal subscription plan");
  console.log("📦 Received body:", JSON.stringify(body, null, 2));

  const { merchantId, planData } = body;

  if (!merchantId || !planData) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Missing required fields: merchantId, planData",
      }),
    };
  }

  try {
    // Convert the planData from EnhancedFormPaymentProcessor to PayPal format
    const paypalPlanData = {
      name: planData.name || "Subscription Plan",
      description:
        planData.description || "Subscription plan created from form",
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: planData.frequency || "MONTH",
            interval_count: planData.interval || 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: planData.totalCycles || 0,
          pricing_scheme: {
            fixed_price: {
              value: planData.price?.toString() || "10.00",
              currency_code: planData.currency || "USD",
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding:
          planData.advancedSettings?.autoBillOutstanding !== false,
        setup_fee: {
          value: planData.setupFee?.toString() || "0.00",
          currency_code: planData.currency || "USD",
        },
        setup_fee_failure_action:
          planData.advancedSettings?.setupFeeFailureAction || "CONTINUE",
        payment_failure_threshold:
          planData.advancedSettings?.paymentFailureThreshold || 3,
      },
      taxes: {
        percentage: planData.taxPercentage?.toString() || "0",
        inclusive: false,
      },
    };

    // Handle trial period if enabled
    if (planData.trialPeriod?.enabled) {
      paypalPlanData.billing_cycles.unshift({
        frequency: {
          interval_unit: planData.trialPeriod.unit || "DAY",
          interval_count: planData.trialPeriod.count || 7,
        },
        tenure_type: "TRIAL",
        sequence: 1,
        total_cycles: 1,
        pricing_scheme: {
          fixed_price: {
            value: planData.trialPeriod.price?.toString() || "0.00",
            currency_code: planData.currency || "USD",
          },
        },
      });

      // Update regular cycle sequence
      paypalPlanData.billing_cycles[1].sequence = 2;
    }

    // Handle tiered pricing if enabled
    if (
      planData.tieredPricing?.enabled &&
      planData.tieredPricing?.tiers?.length > 0
    ) {
      paypalPlanData.quantity_supported = true;
      paypalPlanData.billing_cycles[
        paypalPlanData.billing_cycles.length - 1
      ].pricing_scheme = {
        pricing_model: "TIERED",
        tiers: planData.tieredPricing.tiers.map((tier) => ({
          starting_quantity: tier.starting_quantity?.toString() || "1",
          ending_quantity: tier.ending_quantity?.toString() || "999999",
          amount: {
            value: tier.amount?.toString() || "0.00",
            currency_code: planData.currency || "USD",
          },
        })),
      };
    }

    console.log(
      "🚀 Creating PayPal plan with data:",
      JSON.stringify(paypalPlanData, null, 2)
    );
    const plan = await createPayPalPlan(merchantId, paypalPlanData);

    console.log("✅ PayPal subscription plan created:", plan.id);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        planId: plan.id,
        plan: plan,
        message: "Subscription plan created successfully",
      }),
    };
  } catch (error) {
    console.error("❌ Error creating PayPal subscription plan:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: `Failed to create subscription plan: ${error.message}`,
      }),
    };
  }
}

async function updateSubscriptionPlan(body) {
  console.log("🔄 Updating PayPal subscription plan");

  const { merchantId, planId, updateData } = body;

  if (!merchantId || !planId || !updateData) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Missing required fields: merchantId, planId, updateData",
      }),
    };
  }

  try {
    // PayPal allows limited updates to subscription plans
    const updates = [];

    if (updateData.description) {
      updates.push({
        op: "replace",
        path: "/description",
        value: updateData.description,
      });
    }

    if (updates.length > 0) {
      const accessToken = await getPayPalAccessTokenForMerchant(merchantId);
      const response = await fetch(
        `https://api-m.sandbox.paypal.com/v1/billing/plans/${planId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("PayPal plan update failed:", errorData);
        throw new Error(errorData.message || "Failed to update PayPal plan");
      }
    }

    console.log("✅ PayPal subscription plan updated:", planId);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        planId: planId,
        message: "Subscription plan updated successfully",
      }),
    };
  } catch (error) {
    console.error("❌ Error updating PayPal subscription plan:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: `Failed to update subscription plan: ${error.message}`,
      }),
    };
  }
}

async function createDonationPlan(body) {
  console.log("🔄 Creating PayPal donation plan");

  const { merchantId, config } = body;

  if (!merchantId || !config) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Missing required fields: merchantId, config",
      }),
    };
  }

  try {
    // For donations, we don't create anything in PayPal upfront
    // Just return success with donation configuration
    console.log("✅ Donation plan configured (no PayPal creation needed)");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        donationId: `donation_${Date.now()}`,
        message: "Donation plan configured successfully",
        data: {
          type: "donation",
          provider: "paypal",
          merchantId: merchantId,
          config: config,
        },
      }),
    };
  } catch (error) {
    console.error("❌ Error creating donation plan:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: `Failed to create donation plan: ${error.message}`,
      }),
    };
  }
}

async function listPaypalSubscriptionsAction(body) {
  console.log("🔄 Listing PayPal subscriptions");

  const { merchantId } = body;

  if (!merchantId) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Missing required field: merchantId",
      }),
    };
  }

  try {
    const subscriptions = await listPaypalSubscriptions(merchantId);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        subscriptions: subscriptions,
      }),
    };
  } catch (error) {
    console.error("❌ Error listing PayPal subscriptions:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: `Failed to list PayPal subscriptions: ${error.message}`,
      }),
    };
  }
}

// Form integration handlers - Only return PayPal data, no storage

async function createProductForForm(body) {
  console.log("🔄 Creating PayPal product for form (no storage)");

  const { merchantId, config, fieldId, fieldName } = body;

  if (!merchantId || !config) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Missing required fields: merchantId, config",
      }),
    };
  }

  try {
    const accessToken = await getPayPalAccessTokenForProducts();
    const productId = await createPayPalProduct(
      accessToken,
      config.name || fieldName
    );

    console.log("✅ PayPal product created:", productId);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        productId: productId,
        message: "Product created successfully",
        data: {
          productId: productId,
          fieldId: fieldId,
          type: "product",
          provider: "paypal",
          merchantId: merchantId,
          status: "active",
          config: config,
          createdAt: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error("❌ Error creating PayPal product:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: `Failed to create product: ${error.message}`,
      }),
    };
  }
}

async function createSubscriptionForForm(body) {
  console.log("🔄 Creating PayPal subscription for form (no storage)");

  const { merchantId, config, fieldId, fieldName } = body;

  if (!merchantId || !config) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Missing required fields: merchantId, config",
      }),
    };
  }

  try {
    const planData = {
      name: config.name || fieldName,
      description: config.description || `Subscription plan for ${fieldName}`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: config.frequency?.interval_unit || "MONTH",
            interval_count: config.frequency?.interval_count || 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: config.total_cycles || 0,
          pricing_scheme: {
            fixed_price: {
              value: config.amount?.toString() || "10.00",
              currency_code: config.currency || "USD",
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: "0.00",
          currency_code: config.currency || "USD",
        },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
      taxes: { percentage: "0", inclusive: false },
    };

    const plan = await createPayPalPlan(merchantId, planData);

    console.log("✅ PayPal subscription plan created:", plan.id);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        planId: plan.id,
        plan: plan,
        message: "Subscription plan created successfully",
        data: {
          productId: plan.id,
          planId: plan.id,
          fieldId: fieldId,
          name: config.name || fieldName,
          type: "subscription",
          provider: "paypal",
          merchantId: merchantId,
          status: "active",
          config: config,
          planData: planData,
          createdAt: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error("❌ Error creating PayPal subscription plan:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: `Failed to create subscription: ${error.message}`,
      }),
    };
  }
}

async function createDonationForForm(body) {
  console.log("🔄 Creating donation configuration for form (no storage)");

  const { merchantId, config, fieldId, fieldName } = body;

  if (!merchantId || !config) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Missing required fields: merchantId, config",
      }),
    };
  }

  try {
    // For donations, no PayPal creation needed upfront
    console.log("✅ Donation configuration prepared");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        donationId: `donation_${fieldId}`,
        message: "Donation configuration created successfully",
        data: {
          productId: `donation_${fieldId}`,
          fieldId: fieldId,
          name: config.name || fieldName,
          type: "donation",
          provider: "paypal",
          merchantId: merchantId,
          status: "active",
          config: {
            ...config,
            suggestedAmounts: config.suggestedAmounts || [10, 25, 50, 100],
            allowCustomAmount: config.allowCustomAmount !== false,
          },
          createdAt: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error("❌ Error creating donation configuration:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: `Failed to create donation: ${error.message}`,
      }),
    };
  }
}
