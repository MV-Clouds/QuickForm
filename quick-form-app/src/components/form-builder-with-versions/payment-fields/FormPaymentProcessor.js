import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
} from "./paypal/api/paypalApi";

/**
 * Dynamic Form Payment Processor
 * Handles payment processing during form save with validation and provider-specific logic
 */
class FormPaymentProcessor {
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
        },
      },
      // Future providers: stripe, razorpay, square
    };

    // Store plan IDs with merchant associations
    this.planRegistry = new Map(); // Format: "subscriptionId-merchantId" -> planId
  }

  /**
   * Main validation method called before form save
   */
  async validateFormPayments(fields, formId) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const paymentFields = fields.filter(
      (field) =>
        field.type === "paypal_payment" &&
        field.subFields?.paymentType === "subscription"
    );

    if (paymentFields.length === 0) {
      return validationResults;
    }

    // Validate each payment field
    for (const field of paymentFields) {
      const fieldValidation = await this.validatePaymentField(field, formId);
      if (!fieldValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(...fieldValidation.errors);
      }
      validationResults.warnings.push(...fieldValidation.warnings);
    }

    return validationResults;
  }

  /**
   * Process payment fields during form save
   */
  async processFormPayments(fields, formId, formVersionId) {
    const results = {
      success: true,
      processedFields: [],
      errors: [],
    };

    const paymentFields = fields.filter(
      (field) => field.type === "paypal_payment"
    );

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
      } catch (error) {
        console.error(`Error processing payment field ${field.id}:`, error);
        results.errors.push({
          fieldId: field.id,
          error: error.message,
        });
        results.success = false;
      }
    }

    return results;
  }

  /**
   * Validate individual payment field
   */
  async validatePaymentField(field, formId) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const subFields = field.subFields || {};

    // Check merchant selection
    if (!subFields.merchantId) {
      validation.isValid = false;
      validation.errors.push("Merchant account must be selected");
      return validation;
    }

    // Validate payment type specific requirements
    if (subFields.paymentType === "subscription") {
      const subscriptionValidation = this.validateSubscriptionConfig(subFields);
      if (!subscriptionValidation.isValid) {
        validation.isValid = false;
        validation.errors.push(...subscriptionValidation.errors);
      }
    }

    // Check for merchant changes
    const registryKey = `${field.id}-${subFields.merchantId}`;
    const existingPlanId = this.planRegistry.get(registryKey);

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
   * Process individual payment field
   */
  async processPaymentField(field, formId, formVersionId) {
    const subFields = field.subFields || {};
    const provider = this.providers[subFields.gateway || "paypal"];

    if (!provider) {
      throw new Error(`Unsupported payment provider: ${subFields.gateway}`);
    }
    console.log(`🧾 vvvvvvvvvvvvvvvvvvvvvvvvv `, field, formId, formVersionId);
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
   * Process subscription payment field
   */
  async processSubscription(field, formId, formVersionId) {
    const subFields = field.subFields || {};
    const registryKey = `${field.id}-${subFields.merchantId}`;
    const existingPlanId = this.planRegistry.get(registryKey);

    // Check if merchant changed or no existing plan
    const shouldCreateNew =
      !existingPlanId ||
      (subFields.previousMerchantId &&
        subFields.previousMerchantId !== subFields.merchantId);

    if (shouldCreateNew) {
      return await this.createSubscriptionPlan(field, formId, formVersionId);
    } else {
      return await this.updateSubscriptionPlan(
        field,
        existingPlanId,
        formId,
        formVersionId
      );
    }
  }

  /**
   * Create new subscription plan
   */
  async createSubscriptionPlan(field, formId, formVersionId) {
    const subFields = field.subFields || {};

    // Build correct payload structure based on PayPal integration
    const planData = {
      name: subFields.subscriptionName || `Form ${formId} Subscription`,
      description:
        subFields.subscriptionDescription ||
        "Subscription plan created from form",
      frequency: subFields.billingFrequency || "MONTH",
      interval: parseInt(subFields.billingInterval) || 1,
      totalCycles: parseInt(subFields.totalCycles) || 0, // 0 = infinite
      price: parseFloat(subFields.amount?.value) || 0,
      currency: subFields.amount?.currency || "USD",
      setupFee: parseFloat(subFields.setupFee) || 0,
      taxPercentage: parseFloat(subFields.taxPercentage) || 0,

      // Trial period configuration
      trialPeriod: {
        enabled: subFields.trialPeriod?.enabled || false,
        unit: subFields.trialPeriod?.unit || "DAY",
        count: parseInt(subFields.trialPeriod?.count) || 7,
        price: parseFloat(subFields.trialPeriod?.price) || 0,
      },

      // Tiered pricing configuration
      tieredPricing: {
        enabled: subFields.tieredPricing?.enabled || false,
        tiers: subFields.tieredPricing?.tiers || [],
      },

      // Advanced settings
      advancedSettings: {
        autoBillOutstanding:
          subFields.advancedSettings?.autoBillOutstanding !== false,
        setupFeeFailureAction:
          subFields.advancedSettings?.setupFeeFailureAction || "CONTINUE",
        paymentFailureThreshold:
          parseInt(subFields.advancedSettings?.paymentFailureThreshold) || 3,
        cancelUrl: subFields.advancedSettings?.cancelUrl || "",
        returnUrl: subFields.advancedSettings?.returnUrl || "",
      },
    };

    try {
      const result = await createSubscriptionPlan(
        subFields.merchantId,
        planData,
        "sandbox" // TODO: Make this configurable
      );

      if (result.success) {
        // Store plan ID in registry
        const registryKey = `${field.id}-${subFields.merchantId}`;
        this.planRegistry.set(registryKey, result.plan.id);

        return {
          action: "created",
          planId: result.plan.id,
          productId: result.plan.productId,
          planName: result.plan.name,
          status: result.plan.status,
          merchantId: subFields.merchantId,
        };
      } else {
        throw new Error(result.error || "Failed to create subscription plan");
      }
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Update existing subscription plan
   */
  async updateSubscriptionPlan(field, existingPlanId, formId, formVersionId) {
    const subFields = field.subFields || {};

    // Build update payload - only include updatable fields
    const updateData = {
      planId: existingPlanId,
      // PayPal allows limited updates to subscription plans
      // Most changes require creating a new plan
      description:
        subFields.subscriptionDescription || "Updated subscription plan",
    };

    try {
      const result = await updateSubscriptionPlan(
        subFields.merchantId,
        updateData,
        "sandbox"
      );

      if (result.success) {
        return {
          action: "updated",
          planId: existingPlanId,
          planName: result.plan?.name,
          status: result.plan?.status,
          merchantId: subFields.merchantId,
        };
      } else {
        // If update fails, create new plan
        console.warn("Plan update failed, creating new plan:", result.error);
        return await this.createSubscriptionPlan(field, formId, formVersionId);
      }
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      // Fallback to creating new plan
      return await this.createSubscriptionPlan(field, formId, formVersionId);
    }
  }

  /**
   * Process donation payment field
   */
  async processDonation(field, formId, formVersionId) {
    // TODO: Implement donation processing
    return {
      action: "donation_configured",
      fieldId: field.id,
    };
  }

  /**
   * Process donation button payment field
   */
  async processDonationButton(field, formId, formVersionId) {
    const subFields = field.subFields || {};

    // Validate donation button configuration
    if (!subFields.donationButtonId) {
      throw new Error("Donation button ID is required");
    }

    return {
      action: "donation_button_configured",
      fieldId: field.id,
      donationButtonId: subFields.donationButtonId,
    };
  }

  /**
   * Process one-time payment field
   */
  async processOneTimePayment(field, formId, formVersionId) {
    // TODO: Implement one-time payment processing
    return {
      action: "payment_configured",
      fieldId: field.id,
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

    if (!subFields.amount?.value || subFields.amount.value <= 0) {
      validation.isValid = false;
      validation.errors.push("Subscription amount must be greater than 0");
    }

    if (!subFields.billingFrequency) {
      validation.isValid = false;
      validation.errors.push("Billing frequency is required");
    }

    if (!subFields.subscriptionName?.trim()) {
      validation.isValid = false;
      validation.errors.push("Subscription name is required");
    }

    return validation;
  }

  /**
   * Get existing subscriptions for management
   */
  getExistingSubscriptions(merchantId) {
    const subscriptions = [];

    for (const [key, planId] of this.planRegistry.entries()) {
      const [fieldId, storedMerchantId] = key.split("-");
      if (storedMerchantId === merchantId) {
        subscriptions.push({
          fieldId,
          planId,
          merchantId: storedMerchantId,
        });
      }
    }

    return subscriptions;
  }

  /**
   * Remove subscription from registry
   */
  removeSubscription(fieldId, merchantId) {
    const registryKey = `${fieldId}-${merchantId}`;
    return this.planRegistry.delete(registryKey);
  }

  /**
   * Process product-wise payment field
   */
  async processProductWisePayment(field, formId, formVersionId) {
    const subFields = field.subFields || {};

    // For product-wise payments, we don't need to create anything upfront
    // The products are stored in the field configuration and used during payment
    console.log(
      `✅ Product-wise payment field processed for field: ${field.id}`
    );

    return {
      success: true,
      fieldId: field.id,
      paymentType: "product_wise",
      products: subFields.products || [],
      message: "Product-wise payment field configured successfully",
    };
  }

  /**
   * Process custom amount payment field
   */
  async processCustomAmountPayment(field, formId, formVersionId) {
    const subFields = field.subFields || {};

    // For custom amount payments, we don't need to create anything upfront
    // The amount configuration is stored in the field and used during payment
    console.log(
      `✅ Custom amount payment field processed for field: ${field.id}`
    );

    return {
      success: true,
      fieldId: field.id,
      paymentType: "custom_amount",
      amountConfig: subFields.amount || {},
      message: "Custom amount payment field configured successfully",
    };
  }
}

// Export singleton instance
export const formPaymentProcessor = new FormPaymentProcessor();
export default FormPaymentProcessor;