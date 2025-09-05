/**
 * PaymentProcessor.js - Dynamic Payment Gateway Handler
 *
 * Handles payment processing for multiple providers (PayPal, Stripe, Razorpay, etc.)
 * Called from FormBuilder.js during form save process
 */

import { API_ENDPOINTS } from "../../../config";
import { fetchMerchantCredentialsWithCache } from "../../form-publish/payment/utils/merchantCredentials";

// Payment provider configurations
const PAYMENT_PROVIDERS = {
  paypal: {
    name: "PayPal",
    endpoint: API_ENDPOINTS.UNIFIED_PAYMENT_API,
    capabilities: ["subscriptions", "donations", "products", "payments"],
    actions: {
      createSubscription: "create-subscription-plan",
      updateSubscription: "update-subscription-plan",
      listSubscriptions: "list-plans",
      deleteSubscription: "delete-subscription-plan",
    },
  },
  stripe: {
    name: "Stripe",
    endpoint: API_ENDPOINTS.STRIPE_API, // Future implementation
    capabilities: ["subscriptions", "products", "payments"],
    actions: {
      createSubscription: "create-stripe-subscription",
      updateSubscription: "update-stripe-subscription",
      listSubscriptions: "list-stripe-plans",
      deleteSubscription: "delete-stripe-subscription",
    },
  },
  razorpay: {
    name: "Razorpay",
    endpoint: API_ENDPOINTS.RAZORPAY_API, // Future implementation
    capabilities: ["subscriptions", "products", "payments"],
    actions: {
      createSubscription: "create-razorpay-subscription",
      updateSubscription: "update-razorpay-subscription",
      listSubscriptions: "list-razorpay-plans",
      deleteSubscription: "delete-razorpay-subscription",
    },
  },
};

/**
 * Main Payment Processor Class
 */
class PaymentProcessor {
  constructor(userId, formId) {
    this.userId = userId;
    this.formId = formId;
  }

  /**
   * Process all payment fields during form save
   */
  async processPaymentFields(formFields, validationResult) {
    console.log("🔄 PaymentProcessor: Starting payment field processing");

    // Extract payment fields
    const paymentFields = this.extractPaymentFields(formFields);

    if (paymentFields.length === 0) {
      console.log("📝 No payment fields found");
      return { success: true, processedFields: [], errors: [] };
    }

    console.log(`🔄 Processing ${paymentFields.length} payment fields`);

    const results = [];
    const errors = [];

    // Process each payment field
    for (const field of paymentFields) {
      try {
        const result = await this.processPaymentField(field, validationResult);
        results.push({
          fieldId: field.id,
          fieldName: field.name,
          provider: field.paymentConfig.provider,
          type: field.paymentConfig.type,
          result: result,
          status: "success",
        });
      } catch (error) {
        console.error(
          `❌ Error processing payment field ${field.name}:`,
          error
        );
        errors.push({
          fieldId: field.id,
          fieldName: field.name,
          error: error.message,
        });

        // Stop processing on first error (as requested)
        throw new Error(
          `Payment processing failed for ${field.name}: ${error.message}`
        );
      }
    }

    return {
      success: errors.length === 0,
      processedFields: results,
      errors: errors,
      summary: {
        total: paymentFields.length,
        successful: results.length,
        failed: errors.length,
      },
    };
  }

  /**
   * Extract payment fields from form fields
   */
  extractPaymentFields(formFields) {
    return formFields
      .filter((field) => {
        try {
          const props = JSON.parse(field.Properties__c || "{}");
          return props.paymentConfig && props.paymentConfig.provider;
        } catch (error) {
          return false;
        }
      })
      .map((field) => {
        const props = JSON.parse(field.Properties__c || "{}");
        return {
          id: field.Unique_Key__c,
          name: field.Name,
          type: field.Field_Type__c,
          paymentConfig: props.paymentConfig,
          properties: props,
        };
      });
  }

  /**
   * Process individual payment field
   */
  async processPaymentField(field, validationResult) {
    const { paymentConfig } = field;
    const provider = PAYMENT_PROVIDERS[paymentConfig.provider];

    if (!provider) {
      throw new Error(
        `Unsupported payment provider: ${paymentConfig.provider}`
      );
    }

    console.log(`💳 Processing ${paymentConfig.type} for ${provider.name}`);

    // Handle different payment types
    switch (paymentConfig.type) {
      case "subscription":
        return await this.processSubscription(field, provider);
      case "donation":
        return await this.processDonation(field, provider);
      case "donation_button":
        return await this.processDonationButton(field, provider);
      case "product":
        return await this.processProduct(field, provider);
      case "product_wise":
        return await this.processProductWise(field, provider);
      case "custom_amount":
        return await this.processCustomAmount(field, provider);
      default:
        throw new Error(`Unsupported payment type: ${paymentConfig.type}`);
    }
  }

  /**
   * Process subscription field
   */
  async processSubscription(field, provider) {
    const { paymentConfig } = field;
    const resolvedMerchantId = await this.resolveMerchantId(paymentConfig);

    // Check if subscription plan exists for this merchant
    const existingPlan = await this.findExistingSubscriptionPlan(
      resolvedMerchantId,
      field.id,
      provider
    );

    if (existingPlan) {
      console.log(
        `🔄 Updating existing subscription plan: ${existingPlan.planId}`
      );
      const fieldResolved = {
        ...field,
        paymentConfig: { ...paymentConfig, merchantId: resolvedMerchantId },
      };
      return await this.updateSubscriptionPlan(
        fieldResolved,
        provider,
        existingPlan
      );
    } else {
      console.log(`🆕 Creating new subscription plan`);
      const fieldResolved = {
        ...field,
        paymentConfig: { ...paymentConfig, merchantId: resolvedMerchantId },
      };
      return await this.createSubscriptionPlan(fieldResolved, provider);
    }
  }

  /**
   * Find existing subscription plan for merchant and field
   */
  async findExistingSubscriptionPlan(merchantId, fieldId, provider) {
    try {
      const response = await this.makeApiRequest(provider.endpoint, {
        action: "find-subscription-plan",
        merchantId: merchantId,
        fieldId: fieldId,
        provider: provider.name.toLowerCase(),
      });

      return response.success ? response.plan : null;
    } catch (error) {
      console.log(`ℹ️ No existing plan found: ${error.message}`);
      return null;
    }
  }

  /**
   * Create new subscription plan
   */
  async createSubscriptionPlan(field, provider) {
    const { paymentConfig } = field;

    // Build correct PayPal API payload
    const planData = this.buildSubscriptionPlanData(paymentConfig, field);

    const payload = {
      action: provider.actions.createSubscription,
      merchantId: paymentConfig.merchantId,
      planData: planData,
      fieldId: field.id,
      fieldName: field.name,
      userId: this.userId,
      formId: this.formId,
    };

    console.log("📤 Creating subscription plan:", payload);

    const response = await this.makeApiRequest(provider.endpoint, payload);

    if (!response.success) {
      throw new Error(response.error || "Failed to create subscription plan");
    }

    return {
      action: "created",
      planId: response.planId,
      productId: response.productId,
      provider: provider.name.toLowerCase(),
      merchantId: paymentConfig.merchantId,
    };
  }

  /**
   * Update existing subscription plan
   */
  async updateSubscriptionPlan(field, provider, existingPlan) {
    const { paymentConfig } = field;

    // Build update payload with only updatable fields
    const updateData = this.buildSubscriptionUpdateData(paymentConfig, field);

    const payload = {
      action: provider.actions.updateSubscription,
      merchantId: paymentConfig.merchantId,
      planId: existingPlan.planId,
      updateData: updateData,
      fieldId: field.id,
      fieldName: field.name,
      userId: this.userId,
      formId: this.formId,
    };

    console.log("📤 Updating subscription plan:", payload);

    const response = await this.makeApiRequest(provider.endpoint, payload);

    if (!response.success) {
      throw new Error(response.error || "Failed to update subscription plan");
    }

    return {
      action: "updated",
      planId: existingPlan.planId,
      provider: provider.name.toLowerCase(),
      merchantId: paymentConfig.merchantId,
    };
  }

  /**
   * Build subscription plan data with correct PayPal format
   */
  buildSubscriptionPlanData(config, field) {
    const planData = {
      name: config.name || field.name,
      description: config.description || `Subscription plan for ${field.name}`,
      status: "ACTIVE",
      billing_cycles: [],
      payment_preferences: {
        auto_bill_outstanding:
          config.advancedSettings?.autoBillOutstanding !== false,
        setup_fee: {
          value: (config.setupFee || 0).toString(),
          currency_code: config.currency || "USD",
        },
        setup_fee_failure_action:
          config.advancedSettings?.setupFeeFailureAction || "CONTINUE",
        payment_failure_threshold:
          config.advancedSettings?.paymentFailureThreshold || 3,
      },
      taxes: {
        percentage: (config.taxPercentage || 0).toString(),
        inclusive: false,
      },
    };

    // Add trial period if enabled
    if (config.trialPeriod?.enabled) {
      planData.billing_cycles.push({
        frequency: {
          interval_unit: config.trialPeriod.unit || "DAY",
          interval_count: config.trialPeriod.count || 7,
        },
        tenure_type: "TRIAL",
        sequence: 1,
        total_cycles: 1,
        pricing_scheme: {
          fixed_price: {
            value: (config.trialPeriod.price || 0).toString(),
            currency_code: config.currency || "USD",
          },
        },
      });
    }

    // Add regular billing cycle
    const regularCycle = {
      frequency: {
        interval_unit: config.frequency || "MONTH",
        interval_count: config.interval || 1,
      },
      tenure_type: "REGULAR",
      sequence: config.trialPeriod?.enabled ? 2 : 1,
      total_cycles: config.totalCycles || 0,
    };

    // Handle tiered pricing
    if (
      config.tieredPricing?.enabled &&
      config.tieredPricing.tiers?.length > 0
    ) {
      planData.quantity_supported = true;
      regularCycle.pricing_scheme = {
        pricing_model: "TIERED",
        tiers: config.tieredPricing.tiers.map((tier) => ({
          starting_quantity: tier.startingQuantity.toString(),
          ending_quantity: tier.endingQuantity
            ? tier.endingQuantity.toString()
            : "999999",
          amount: {
            value: tier.price.toString(),
            currency_code: config.currency || "USD",
          },
        })),
      };
    } else {
      // Fixed pricing
      regularCycle.pricing_scheme = {
        fixed_price: {
          value: (config.price || 0).toString(),
          currency_code: config.currency || "USD",
        },
      };
    }

    planData.billing_cycles.push(regularCycle);

    return planData;
  }

  /**
   * Build subscription update data (only updatable fields)
   */
  buildSubscriptionUpdateData(config, field) {
    // PayPal allows updating limited fields
    return [
      {
        op: "replace",
        path: "/description",
        value:
          config.description || `Updated subscription plan for ${field.name}`,
      },
      {
        op: "replace",
        path: "/payment_preferences/payment_failure_threshold",
        value: config.advancedSettings?.paymentFailureThreshold || 3,
      },
    ];
  }

  /**
   * Process donation field
   */
  async processDonation(field, provider) {
    // Donations don't need PayPal plan creation upfront
    // Just store configuration for runtime processing
    return {
      action: "configured",
      type: "donation",
      provider: provider.name.toLowerCase(),
      merchantId:
        field.paymentConfig.merchantId ||
        (await this.resolveMerchantId(field.paymentConfig)),
    };
  }

  /**
   * Process donation button field
   */
  async processDonationButton(field, provider) {
    // Donation buttons use existing PayPal button IDs
    // Just store configuration for runtime processing
    const subFields = field.subFields || {};

    if (!subFields.donationButtonId) {
      throw new Error("Donation button ID is required");
    }

    return {
      action: "configured",
      type: "donation_button",
      provider: provider.name.toLowerCase(),
      merchantId:
        field.paymentConfig?.merchantId ||
        subFields.merchantId ||
        (await this.resolveMerchantId(field.paymentConfig)),
      donationButtonId: subFields.donationButtonId,
    };
  }

  /**
   * Process product field
   */
  async processProduct(field, provider) {
    // Similar to subscription but for one-time products
    const { paymentConfig } = field;
    const resolvedMerchantId = await this.resolveMerchantId(paymentConfig);

    const payload = {
      action: "create-product",
      merchantId: resolvedMerchantId,
      productData: {
        name: paymentConfig.name || field.name,
        description: paymentConfig.description || `Product for ${field.name}`,
        price: paymentConfig.price || 0,
        currency: paymentConfig.currency || "USD",
      },
      fieldId: field.id,
      fieldName: field.name,
      userId: this.userId,
      formId: this.formId,
    };

    const response = await this.makeApiRequest(provider.endpoint, payload);

    if (!response.success) {
      throw new Error(response.error || "Failed to create product");
    }

    return {
      action: "created",
      productId: response.productId,
      provider: provider.name.toLowerCase(),
      merchantId: paymentConfig.merchantId,
    };
  }

  /**
   * Make API request to payment provider
   */
  async makeApiRequest(endpoint, payload) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.REACT_APP_API_KEY || "dev-key"}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed (${response.status}): ${errorText}`
        );
      }

      const result = await response.json();
      console.log("📥 API Response:", result);

      return result;
    } catch (error) {
      console.error("❌ API Request Error:", error);
      throw error;
    }
  }

  // Resolve PayPal merchantId from field.paymentConfig
  async resolveMerchantId(paymentConfig) {
    if (paymentConfig?.merchantId) return paymentConfig.merchantId;
    if (paymentConfig?.merchantAccountId) {
      const res = await fetchMerchantCredentialsWithCache(
        paymentConfig.merchantAccountId
      );
      if (res?.success && res.credentials?.merchantId) {
        return res.credentials.merchantId;
      }
    }
    throw new Error(
      "Merchant account not configured. Please select a merchant account."
    );
  }

  /**
   * Process product-wise payment field
   */
  async processProductWise(field, provider) {
    // Product-wise payments don't need upfront processing
    // Products are stored in field configuration and used during payment
    const subFields = field.subFields || {};

    return {
      action: "configured",
      type: "product_wise",
      provider: provider.name.toLowerCase(),
      merchantId:
        field.paymentConfig?.merchantId ||
        subFields.merchantId ||
        (await this.resolveMerchantId(field.paymentConfig)),
      products: subFields.products || [],
    };
  }

  /**
   * Process custom amount payment field
   */
  async processCustomAmount(field, provider) {
    // Custom amount payments don't need upfront processing
    // Amount configuration is stored in field and used during payment
    const subFields = field.subFields || {};

    return {
      action: "configured",
      type: "custom_amount",
      provider: provider.name.toLowerCase(),
      merchantId:
        field.paymentConfig?.merchantId ||
        subFields.merchantId ||
        (await this.resolveMerchantId(field.paymentConfig)),
      amountConfig: subFields.amount || {},
    };
  }

  /**
   * Get supported providers
   */
  static getSupportedProviders() {
    return Object.keys(PAYMENT_PROVIDERS).map((key) => ({
      id: key,
      name: PAYMENT_PROVIDERS[key].name,
      capabilities: PAYMENT_PROVIDERS[key].capabilities,
    }));
  }

  /**
   * Check if provider supports capability
   */
  static providerSupports(providerId, capability) {
    const provider = PAYMENT_PROVIDERS[providerId];
    return provider ? provider.capabilities.includes(capability) : false;
  }
}

export default PaymentProcessor;
