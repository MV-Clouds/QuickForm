import { API_ENDPOINTS } from "../../../config";

/**
 * Enhanced Dynamic Form Payment Processor
 * Handles payment processing during form save with improved validation and provider-specific logic
 * Supports multiple payment gateways and proper subscription management
 */
class EnhancedFormPaymentProcessor {
  constructor() {
    this.providers = {
      paypal: {
        name: "PayPal",
        capabilities: ["subscriptions", "donations", "products", "payments"],
        actions: {
          createSubscription: "create-subscription-plan",
          updateSubscription: "update-subscription-plan",
          createDonation: "create-donation-plan",
          createProduct: "create-product",
          listSubscriptions: "list-paypal-subscriptions",
        },
      },
      // Future providers: stripe, razorpay, square
      stripe: {
        name: "Stripe",
        capabilities: ["subscriptions", "payments", "products"],
        actions: {
          createSubscription: "create-stripe-subscription",
          updateSubscription: "update-stripe-subscription",
          createProduct: "create-stripe-product",
        },
      },
      razorpay: {
        name: "Razorpay",
        capabilities: ["subscriptions", "payments", "upi", "netbanking"],
        actions: {
          createSubscription: "create-razorpay-subscription",
          createPayment: "create-razorpay-payment",
        },
      },
      square: {
        name: "Square",
        capabilities: ["payments", "products", "catalog"],
        actions: {
          createPayment: "create-square-payment",
          createProduct: "create-square-product",
        },
      },
    };

    // Enhanced plan registry with merchant associations
    this.planRegistry = new Map(); // Format: "fieldId-merchantId-provider" -> planData
    this.merchantPlanMapping = new Map(); // Format: "merchantId-provider" -> Set of planIds
  }

  /**
   * Main validation method called before form save
   */
  async validateFormPayments(fields, formId) {
    console.log("🔍 Enhanced validation starting for form:", formId);

    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const paymentFields = fields.filter(
      (field) => field.type === "paypal_payment" // Will expand to support other types
    );

    if (paymentFields.length === 0) {
      console.log("✅ No payment fields found, validation passed");
      return validationResults;
    }

    console.log(
      `🔍 Found ${paymentFields.length} payment field(s) to validate`
    );

    // Validate each payment field
    for (const field of paymentFields) {
      const fieldValidation = await this.validatePaymentField(field, formId);
      if (!fieldValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(...fieldValidation.errors);
      }
      validationResults.warnings.push(...fieldValidation.warnings);
    }

    console.log("🔍 Validation results:", validationResults);
    return validationResults;
  }

  /**
   * Process payment fields during form save
   */
  async processFormPayments(fields, formId, formVersionId) {
    console.log("💳 Enhanced payment processing starting for form:", formId);

    const results = {
      success: true,
      processedFields: [],
      errors: [],
    };

    const paymentFields = fields.filter(
      (field) => field.type === "paypal_payment"
    );

    console.log(`💳 Found ${paymentFields.length} payment field(s) to process`);

    for (const field of paymentFields) {
      try {
        const processResult = await this.processPaymentField(
          field,
          formId,
          formVersionId
        );

        results.processedFields.push({
          fieldId: field.id,
          ...processResult,
        });

        // Update field with processing results
        field.subFields.processingResult = processResult;

        console.log(
          `✅ Successfully processed field ${field.id}:`,
          processResult
        );
      } catch (error) {
        console.error(`❌ Error processing payment field ${field.id}:`, error);
        results.errors.push({
          fieldId: field.id,
          error: error.message,
        });
        results.success = false;
      }
    }

    console.log("💳 Payment processing results:", results);
    return results;
  }

  /**
   * Validate individual payment field with enhanced checks
   */
  async validatePaymentField(field, formId) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const subFields = field.subFields || {};
    const provider = this.providers[subFields.gateway || "paypal"];

    if (!provider) {
      validation.isValid = false;
      validation.errors.push(
        `Unsupported payment provider: ${subFields.gateway}`
      );
      return validation;
    }

    // Check merchant selection - support both merchantId and merchantAccountId
    const merchantIdentifier =
      subFields.merchantAccountId || subFields.merchantId;
    if (!merchantIdentifier) {
      validation.isValid = false;
      validation.errors.push("Merchant account must be selected");
      return validation;
    }

    // Validate payment type specific requirements
    switch (subFields.paymentType) {
      case "subscription":
        const subscriptionValidation =
          this.validateSubscriptionConfig(subFields);
        if (!subscriptionValidation.isValid) {
          validation.isValid = false;
          validation.errors.push(...subscriptionValidation.errors);
        }
        break;
      case "donation":
        const donationValidation = this.validateDonationConfig(subFields);
        if (!donationValidation.isValid) {
          validation.isValid = false;
          validation.errors.push(...donationValidation.errors);
        }
        break;
      case "one_time":
        const paymentValidation = this.validatePaymentConfig(subFields);
        if (!paymentValidation.isValid) {
          validation.isValid = false;
          validation.errors.push(...paymentValidation.errors);
        }
        break;
    }

    // Check for merchant changes
    const registryKey = `${field.id}-${subFields.merchantId}-${
      subFields.gateway || "paypal"
    }`;
    const existingPlan = this.planRegistry.get(registryKey);

    if (
      subFields.previousMerchantId &&
      subFields.previousMerchantId !== subFields.merchantId
    ) {
      validation.warnings.push(
        "Merchant changed - new subscription plan will be created"
      );
    }

    return validation;
  }

  /**
   * Process individual payment field with enhanced logic
   */
  async processPaymentField(field, formId, formVersionId) {
    const subFields = field.subFields || {};
    const provider = this.providers[subFields.gateway || "paypal"];

    if (!provider) {
      throw new Error(`Unsupported payment provider: ${subFields.gateway}`);
    }

    console.log(
      `💳 Processing ${subFields.paymentType} payment for provider ${provider.name}`
    );

    switch (subFields.paymentType) {
      case "subscription":
        return await this.processSubscription(field, formId, formVersionId);
      case "donation":
        return await this.processDonation(field, formId, formVersionId);
      case "donation_button":
        return await this.processDonationButton(field, formId, formVersionId);
      case "one_time":
        return await this.processOneTimePayment(field, formId, formVersionId);
      case "product_wise":
        return await this.processProductWisePayment(
          field,
          formId,
          formVersionId
        );
      case "custom_amount":
        return await this.processCustomAmountPayment(
          field,
          formId,
          formVersionId
        );
      default:
        throw new Error(`Unsupported payment type: ${subFields.paymentType}`);
    }
  }

  /**
   * Process subscription payment field with enhanced logic
   */
  async processSubscription(field, formId, formVersionId) {
    console.log("🏆 ", field);
    const subFields = field.subFields || {};
    const provider = subFields.gateway || "paypal";
    const currentMerchantId = subFields.merchantId;
    const previousMerchantId = subFields.previousMerchantId;
    // Create registry keys for current and previous merchants
    const currentRegistryKey = `${field.id}-${currentMerchantId}-${provider}`;
    const previousRegistryKey = previousMerchantId
      ? `${field.id}-${previousMerchantId}-${provider}`
      : null;

    const existingPlan = this.planRegistry.get(currentRegistryKey);
    const previousPlan = previousRegistryKey
      ? this.planRegistry.get(previousRegistryKey)
      : null;

    console.log(`💳 Processing subscription for field ${field.id}`);
    console.log(`💳 Current merchant: ${currentMerchantId}`);
    console.log(`💳 Previous merchant: ${previousMerchantId}`);
    console.log(`💳 Current registry key: ${currentRegistryKey}`);
    console.log(`💳 Previous registry key: ${previousRegistryKey}`);
    console.log(`💳 Existing plan:`, existingPlan);
    console.log(`💳 Previous plan:`, previousPlan);

    // Check if using existing PayPal subscription
    if (
      subFields.subscriptionConfig?.useExistingPlan &&
      subFields.subscriptionConfig?.selectedExistingPlan
    ) {
      console.log(
        `💳 Using existing PayPal subscription: ${subFields.subscriptionConfig.selectedExistingPlan}`
      );

      // If merchant changed, clean up previous registry entry
      if (previousRegistryKey && previousPlan) {
        console.log(
          `💳 Cleaning up previous plan registry for merchant change`
        );
        this.planRegistry.delete(previousRegistryKey);
        this.cleanupMerchantMapping(
          previousMerchantId,
          provider,
          previousPlan.planId
        );
      }

      // Store the existing plan reference with new merchant
      const planData = {
        planId: subFields.subscriptionConfig.selectedExistingPlan,
        isExisting: true,
        source: "paypal_existing",
        merchantId: currentMerchantId,
      };

      this.planRegistry.set(currentRegistryKey, planData);
      this.updateMerchantMapping(currentMerchantId, provider, planData.planId);

      return {
        action: "linked_existing",
        planId: subFields.subscriptionConfig.selectedExistingPlan,
        planName: "Existing PayPal Subscription",
        status: "active",
        merchantId: currentMerchantId,
        provider: provider,
      };
    }

    // Determine if we should create a new plan
    const merchantChanged =
      previousMerchantId && previousMerchantId !== currentMerchantId;
    const shouldCreateNew = !existingPlan || merchantChanged;

    if (shouldCreateNew) {
      console.log(`💳 Creating new subscription plan for field ${field.id}`);
      console.log(
        `💳 Reason: ${!existingPlan ? "No existing plan" : "Merchant changed"}`
      );

      // If merchant changed, clean up previous registry entry
      if (merchantChanged && previousRegistryKey && previousPlan) {
        console.log(
          `💳 Cleaning up previous plan registry for merchant change`
        );
        this.planRegistry.delete(previousRegistryKey);
        this.cleanupMerchantMapping(
          previousMerchantId,
          provider,
          previousPlan.planId
        );
      }

      return await this.createSubscriptionPlan(field, formId, formVersionId);
    } else {
      console.log(
        `💳 Updating existing subscription plan for field ${field.id}`
      );
      return await this.updateSubscriptionPlan(
        field,
        existingPlan.planId,
        formId,
        formVersionId
      );
    }
  }

  /**
   * Create new subscription plan with correct payload structure
   */
  async createSubscriptionPlan(field, formId, formVersionId) {
    const subFields = field.subFields || {};
    const subscriptionConfig = subFields.subscriptionConfig || {};

    // Build correct payload structure based on PayPal integration
    const payload = {
      action: "create-subscription-plan",
      merchantId: subFields.merchantId,
      planData: {
        name: subscriptionConfig.name || `Form ${formId} Subscription`,
        description:
          subscriptionConfig.description ||
          "Subscription plan created from form",
        frequency: subscriptionConfig.frequency || "MONTH",
        interval: parseInt(subscriptionConfig.interval) || 1,
        totalCycles: parseInt(subscriptionConfig.totalCycles) || 0, // 0 = infinite
        price:
          parseFloat(subscriptionConfig.price) ||
          parseFloat(subFields.amount?.value) ||
          0,
        currency:
          subscriptionConfig.currency || subFields.amount?.currency || "USD",
        setupFee: parseFloat(subscriptionConfig.setupFee) || 0,
        taxPercentage: parseFloat(subscriptionConfig.taxPercentage) || 0,

        // Trial period configuration
        trialPeriod: {
          enabled: subscriptionConfig.trialPeriod?.enabled || false,
          unit: subscriptionConfig.trialPeriod?.unit || "DAY",
          count: parseInt(subscriptionConfig.trialPeriod?.count) || 7,
          price: parseFloat(subscriptionConfig.trialPeriod?.price) || 0,
        },

        // Tiered pricing configuration
        tieredPricing: {
          enabled: subscriptionConfig.tieredPricing?.enabled || false,
          tiers: subscriptionConfig.tieredPricing?.tiers || [],
        },

        // Advanced settings
        advancedSettings: {
          autoBillOutstanding:
            subscriptionConfig.advancedSettings?.autoBillOutstanding !== false,
          setupFeeFailureAction:
            subscriptionConfig.advancedSettings?.setupFeeFailureAction ||
            "CONTINUE",
          paymentFailureThreshold:
            parseInt(
              subscriptionConfig.advancedSettings?.paymentFailureThreshold
            ) || 3,
          cancelUrl: subscriptionConfig.advancedSettings?.cancelUrl || "",
          returnUrl: subscriptionConfig.advancedSettings?.returnUrl || "",
        },
      },
    };

    console.log("💳 Creating subscription with payload:", payload);

    try {
      const result = await this.makeApiRequest(
        API_ENDPOINTS.UNIFIED_PAYMENT_API,
        "POST",
        payload,
        "Failed to create subscription plan"
      );

      if (result.success) {
        // Store plan ID in registry
        const registryKey = `${field.id}-${subFields.merchantId}-${
          subFields.gateway || "paypal"
        }`;
        const planData = {
          planId: result.plan?.id || result.planId,
          productId: result.plan?.productId || result.productId,
          planName: result.plan?.name || payload.planData.name,
          status: result.plan?.status || "active",
          isExisting: false,
          source: "form_created",
        };

        this.planRegistry.set(registryKey, planData);

        // Update merchant plan mapping using helper method
        this.updateMerchantMapping(
          subFields.merchantId,
          subFields.gateway || "paypal",
          planData.planId
        );

        return {
          action: "created",
          planId: planData.planId,
          productId: planData.productId,
          planName: planData.planName,
          status: planData.status,
          merchantId: subFields.merchantAccountId || subFields.merchantId,
          provider: subFields.gateway || "paypal",
        };
      } else {
        throw new Error(result.error || "Failed to create subscription plan");
      }
    } catch (error) {
      console.error("❌ Error creating subscription plan:", error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Update existing subscription plan
   */
  async updateSubscriptionPlan(field, existingPlanId, formId, formVersionId) {
    const subFields = field.subFields || {};
    const subscriptionConfig = subFields.subscriptionConfig || {};

    // Build update payload - PayPal allows limited updates
    const payload = {
      action: "update-subscription-plan",
      merchantId: subFields.merchantAccountId || subFields.merchantId,
      planId: existingPlanId,
      updateData: {
        description:
          subscriptionConfig.description || "Updated subscription plan",
        // Note: Most subscription plan fields cannot be updated in PayPal
        // If significant changes are needed, a new plan should be created
      },
    };

    console.log("💳 Updating subscription with payload:", payload);

    try {
      const result = await this.makeApiRequest(
        API_ENDPOINTS.UNIFIED_PAYMENT_API,
        "POST",
        payload,
        "Failed to update subscription plan"
      );

      if (result.success) {
        return {
          action: "updated",
          planId: existingPlanId,
          planName: result.plan?.name || subscriptionConfig.name,
          status: result.plan?.status || "active",
          merchantId: subFields.merchantAccountId || subFields.merchantId,
          provider: subFields.gateway || "paypal",
        };
      } else {
        // If update fails, create new plan
        console.warn("💳 Plan update failed, creating new plan:", result.error);
        return await this.createSubscriptionPlan(field, formId, formVersionId);
      }
    } catch (error) {
      console.error("❌ Error updating subscription plan:", error);
      // Fallback to creating new plan
      console.log("💳 Falling back to creating new plan");
      return await this.createSubscriptionPlan(field, formId, formVersionId);
    }
  }

  /**
   * Process donation payment field
   */
  async processDonation(field, formId, formVersionId) {
    const subFields = field.subFields || {};

    console.log(`💳 Processing donation for field ${field.id}`);

    // TODO: Implement donation processing based on provider
    return {
      action: "donation_configured",
      fieldId: field.id,
      merchantId: subFields.merchantAccountId || subFields.merchantId,
      provider: subFields.gateway || "paypal",
    };
  }

  /**
   * Process donation button payment field
   */
  async processDonationButton(field, formId, formVersionId) {
    const subFields = field.subFields || {};

    console.log(`💳 Processing donation button for field ${field.id}`);

    // Validate donation button configuration
    if (!subFields.donationButtonId) {
      throw new Error("Donation button ID is required");
    }

    return {
      action: "donation_button_configured",
      fieldId: field.id,
      merchantId: subFields.merchantAccountId || subFields.merchantId,
      donationButtonId: subFields.donationButtonId,
      provider: subFields.gateway || "paypal",
    };
  }

  /**
   * Process one-time payment field
   */
  async processOneTimePayment(field, formId, formVersionId) {
    const subFields = field.subFields || {};

    console.log(`💳 Processing one-time payment for field ${field.id}`);

    // TODO: Implement one-time payment processing based on provider
    return {
      action: "payment_configured",
      fieldId: field.id,
      merchantId: subFields.merchantAccountId || subFields.merchantId,
      provider: subFields.gateway || "paypal",
    };
  }

  /**
   * Validate subscription configuration
   */
  validateSubscriptionConfig(subFields) {
    const validation = {
      isValid: true,
      errors: [],
    };

    const subscriptionConfig = subFields.subscriptionConfig || {};

    // If using existing plan, validate selection
    if (subscriptionConfig.useExistingPlan) {
      if (!subscriptionConfig.selectedExistingPlan) {
        validation.isValid = false;
        validation.errors.push("Please select an existing subscription plan");
      }
      return validation; // Skip other validations for existing plans
    }

    // Validate new plan creation
    if (!subscriptionConfig.name?.trim()) {
      validation.isValid = false;
      validation.errors.push("Subscription name is required");
    }

    const price =
      parseFloat(subscriptionConfig.price) ||
      parseFloat(subFields.amount?.value) ||
      0;
    if (price <= 0) {
      validation.isValid = false;
      validation.errors.push("Subscription amount must be greater than 0");
    }

    if (!subscriptionConfig.frequency) {
      validation.isValid = false;
      validation.errors.push("Billing frequency is required");
    }

    return validation;
  }

  /**
   * Validate donation configuration
   */
  validateDonationConfig(subFields) {
    const validation = {
      isValid: true,
      errors: [],
    };

    // TODO: Add donation-specific validation
    return validation;
  }

  /**
   * Validate payment configuration
   */
  validatePaymentConfig(subFields) {
    const validation = {
      isValid: true,
      errors: [],
    };

    // TODO: Add payment-specific validation
    return validation;
  }

  /**
   * Get existing subscriptions for management
   */
  getExistingSubscriptions(merchantId, provider = "paypal") {
    const subscriptions = [];
    const merchantKey = `${merchantId}-${provider}`;
    const planIds = this.merchantPlanMapping.get(merchantKey);

    if (planIds) {
      for (const planId of planIds) {
        // Find the registry entry for this plan
        for (const [key, planData] of this.planRegistry.entries()) {
          if (planData.planId === planId && key.includes(merchantId)) {
            const [fieldId] = key.split("-");
            subscriptions.push({
              fieldId,
              planId: planData.planId,
              planName: planData.planName,
              status: planData.status,
              merchantId,
              provider,
              isExisting: planData.isExisting,
              source: planData.source,
            });
            break;
          }
        }
      }
    }

    return subscriptions;
  }

  /**
   * Remove subscription from registry
   */
  removeSubscription(fieldId, merchantId, provider = "paypal") {
    const registryKey = `${fieldId}-${merchantId}-${provider}`;
    const planData = this.planRegistry.get(registryKey);

    if (planData) {
      // Remove from plan registry
      this.planRegistry.delete(registryKey);

      // Remove from merchant mapping
      this.cleanupMerchantMapping(merchantId, provider, planData.planId);

      return true;
    }

    return false;
  }

  /**
   * Update merchant plan mapping
   */
  updateMerchantMapping(merchantId, provider, planId) {
    const merchantKey = `${merchantId}-${provider}`;
    if (!this.merchantPlanMapping.has(merchantKey)) {
      this.merchantPlanMapping.set(merchantKey, new Set());
    }
    this.merchantPlanMapping.get(merchantKey).add(planId);
  }

  /**
   * Clean up merchant plan mapping
   */
  cleanupMerchantMapping(merchantId, provider, planId) {
    const merchantKey = `${merchantId}-${provider}`;
    const planIds = this.merchantPlanMapping.get(merchantKey);
    if (planIds) {
      planIds.delete(planId);
      if (planIds.size === 0) {
        this.merchantPlanMapping.delete(merchantKey);
      }
    }
  }

  /**
   * Process product-wise payment field
   */
  async processProductWisePayment(field, formId, formVersionId) {
    const subFields = field.subFields || {};

    console.log(`💳 Processing product-wise payment for field ${field.id}`);

    // For product-wise payments, we don't need to create anything upfront
    // The products are stored in the field configuration and used during payment
    return {
      action: "product_wise_configured",
      fieldId: field.id,
      merchantId: subFields.merchantAccountId || subFields.merchantId,
      products: subFields.products || [],
      provider: subFields.gateway || "paypal",
    };
  }

  /**
   * Process custom amount payment field
   */
  async processCustomAmountPayment(field, formId, formVersionId) {
    const subFields = field.subFields || {};

    console.log(`💳 Processing custom amount payment for field ${field.id}`);

    // For custom amount payments, we don't need to create anything upfront
    // The amount configuration is stored in the field and used during payment
    return {
      action: "custom_amount_configured",
      fieldId: field.id,
      merchantId: subFields.merchantAccountId || subFields.merchantId,
      amountConfig: subFields.amount || {},
      provider: subFields.gateway || "paypal",
    };
  }

  /**
   * Generic API request handler
   */
  async makeApiRequest(endpoint, method, payload, errorMessage) {
    try {
      console.log(`🚀 API Request: ${method} ${endpoint}`, payload);

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log(`📦 API Response:`, data);

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `API Error: ${response.status}`
        );
      }

      return { success: true, ...data };
    } catch (error) {
      console.error(`❌ ${errorMessage}:`, error);
      return {
        success: false,
        error: error.message || errorMessage,
      };
    }
  }
}

// Export singleton instance
export const enhancedFormPaymentProcessor = new EnhancedFormPaymentProcessor();
export default EnhancedFormPaymentProcessor;
