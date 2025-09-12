/**
 * Payment Data Processor
 * Handles standardization and optimization of payment data for form submissions
 */

/**
 * Standardizes payment data structure for consistent form submission
 * @param {Object} rawPaymentData - Raw payment data from payment provider
 * @param {Object} fieldConfig - Payment field configuration
 * @returns {Object} Standardized payment data
 */
export function standardizePaymentData(rawPaymentData, fieldConfig = {}) {
  const timestamp = new Date().toISOString();

  // Extract field configuration details
  const subFields = fieldConfig.subFields || {};
  const paymentType = subFields.paymentType || rawPaymentData.paymentType;
  const merchantId =
    subFields.merchantAccountId ||
    subFields.merchantId ||
    rawPaymentData.merchantId;

  // Base payment data structure
  const standardizedData = {
    // Transaction identifiers
    fieldId: rawPaymentData.fieldId || fieldConfig.id,
    transactionId: rawPaymentData.transactionId,
    orderId: rawPaymentData.orderId,

    // Payment details
    amount: parseFloat(rawPaymentData.amount) || 0,
    currency: rawPaymentData.currency || "USD",
    paymentType: paymentType,
    paymentMethod: rawPaymentData.paymentMethod,

    // Merchant information
    merchantId: merchantId,

    // Status and timing
    status: "completed",
    completedAt: timestamp,
    processedAt: timestamp,

    // Additional metadata
    metadata: {
      provider: "paypal",
      environment:
        process.env.NODE_ENV === "production" ? "production" : "sandbox",
      userAgent: navigator.userAgent,
      timestamp: timestamp,
    },
  };

  // Add payment type specific data
  switch (paymentType) {
    case "product_wise":
      if (rawPaymentData.selectedProduct) {
        standardizedData.product = {
          id: rawPaymentData.selectedProduct.id,
          name: rawPaymentData.selectedProduct.name,
          price: rawPaymentData.selectedProduct.price,
          currency: rawPaymentData.selectedProduct.currency,
          sku: rawPaymentData.selectedProduct.sku,
          description: rawPaymentData.selectedProduct.description,
        };
      }
      if (rawPaymentData.itemNumber) {
        standardizedData.itemNumber = rawPaymentData.itemNumber;
      }
      break;

    case "subscription":
      if (rawPaymentData.subscriptionId) {
        standardizedData.subscription = {
          subscriptionId: rawPaymentData.subscriptionId,
          planId: rawPaymentData.planId,
          planName: rawPaymentData.planName,
          billingCycle: rawPaymentData.billingCycle,
        };
      }
      break;

    case "donation":
    case "donation_button":
      standardizedData.donation = {
        isDonation: true,
        donationButtonId: rawPaymentData.donationButtonId,
        donorInfo: rawPaymentData.donorInfo,
      };
      break;

    case "custom_amount":
      standardizedData.customAmount = {
        userEntered: true,
        originalAmount: rawPaymentData.originalAmount,
        finalAmount: rawPaymentData.amount,
      };
      break;
  }

  // Add billing/shipping address if collected
  if (rawPaymentData.billingAddress) {
    standardizedData.billingAddress = sanitizeAddress(
      rawPaymentData.billingAddress
    );
  }

  if (rawPaymentData.shippingAddress) {
    standardizedData.shippingAddress = sanitizeAddress(
      rawPaymentData.shippingAddress
    );
  }

  // Add capture result details (for debugging and reconciliation)
  if (rawPaymentData.captureResult) {
    standardizedData.captureDetails = {
      captureId: rawPaymentData.captureResult.id,
      status: rawPaymentData.captureResult.status,
      amount: rawPaymentData.captureResult.amount,
      fees: rawPaymentData.captureResult.seller_receivable_breakdown
        ?.paypal_fee,
    };
  }

  // Validate required fields
  const validation = validatePaymentData(standardizedData);
  if (!validation.isValid) {
    console.warn("⚠️ Payment data validation warnings:", validation.warnings);
  }

  return standardizedData;
}

/**
 * Sanitizes address data to remove sensitive information
 * @param {Object} address - Raw address data
 * @returns {Object} Sanitized address data
 */
function sanitizeAddress(address) {
  if (!address || typeof address !== "object") return null;

  return {
    name: address.name || address.recipient_name,
    addressLine1: address.address_line_1 || address.line1,
    addressLine2: address.address_line_2 || address.line2,
    city: address.admin_area_2 || address.city,
    state: address.admin_area_1 || address.state,
    postalCode: address.postal_code || address.zip,
    countryCode: address.country_code || address.country,
  };
}

/**
 * Validates payment data structure
 * @param {Object} paymentData - Payment data to validate
 * @returns {Object} Validation result
 */
function validatePaymentData(paymentData) {
  const warnings = [];
  const errors = [];

  // Required fields validation
  if (!paymentData.fieldId) errors.push("Missing fieldId");
  if (!paymentData.transactionId) warnings.push("Missing transactionId");
  if (!paymentData.orderId) warnings.push("Missing orderId");
  if (!paymentData.amount || paymentData.amount <= 0)
    errors.push("Invalid amount");
  if (!paymentData.currency) warnings.push("Missing currency");
  if (!paymentData.paymentType) warnings.push("Missing paymentType");
  if (!paymentData.paymentMethod) warnings.push("Missing paymentMethod");
  if (!paymentData.merchantId) warnings.push("Missing merchantId");

  // Type-specific validation
  if (paymentData.paymentType === "product_wise" && !paymentData.product) {
    warnings.push("Product-wise payment missing product details");
  }

  if (paymentData.paymentType === "subscription" && !paymentData.subscription) {
    warnings.push("Subscription payment missing subscription details");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Prepares payment data for form submission
 * @param {Object} standardizedPaymentData - Standardized payment data
 * @param {Object} formData - Form data context
 * @returns {Object} Form submission ready payment data
 */
export function preparePaymentDataForSubmission(
  standardizedPaymentData,
  formData = {}
) {
  // Create form field entry for the payment data
  const paymentFieldEntry = {
    [`payment_${standardizedPaymentData.fieldId}`]: {
      ...standardizedPaymentData,
      submissionId: generateSubmissionId(),
      formId: formData.Id || formData.formId,
      submittedAt: new Date().toISOString(),
    },
  };

  // Create global payment data entry
  const globalPaymentData = {
    paymentData: {
      ...standardizedPaymentData,
      // Add summary for easy access
      summary: {
        amount: standardizedPaymentData.amount,
        currency: standardizedPaymentData.currency,
        method: standardizedPaymentData.paymentMethod,
        type: standardizedPaymentData.paymentType,
        status: standardizedPaymentData.status,
        completedAt: standardizedPaymentData.completedAt,
      },
    },
  };

  return {
    fieldEntry: paymentFieldEntry,
    globalEntry: globalPaymentData,
    combined: {
      ...paymentFieldEntry,
      ...globalPaymentData,
    },
  };
}

/**
 * Generates a unique submission ID for tracking
 * @returns {string} Unique submission ID
 */
function generateSubmissionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `sub_${timestamp}_${random}`;
}

/**
 * Extracts payment summary for quick access
 * @param {Object} paymentData - Complete payment data
 * @returns {Object} Payment summary
 */
export function extractPaymentSummary(paymentData) {
  return {
    fieldId: paymentData.fieldId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    method: paymentData.paymentMethod,
    type: paymentData.paymentType,
    status: paymentData.status,
    transactionId: paymentData.transactionId,
    orderId: paymentData.orderId,
    completedAt: paymentData.completedAt,
    merchantId: paymentData.merchantId,
  };
}

/**
 * Formats payment data for display
 * @param {Object} paymentData - Payment data to format
 * @returns {Object} Formatted display data
 */
export function formatPaymentDataForDisplay(paymentData) {
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return {
    amount: formatCurrency(paymentData.amount, paymentData.currency),
    method: paymentData.paymentMethod?.toUpperCase() || "UNKNOWN",
    type: paymentData.paymentType?.replace("_", " ").toUpperCase() || "UNKNOWN",
    status: paymentData.status?.toUpperCase() || "UNKNOWN",
    completedAt: formatDate(paymentData.completedAt),
    transactionId: paymentData.transactionId || "N/A",
    orderId: paymentData.orderId || "N/A",
  };
}

/**
 * Validates payment data integrity before submission
 * @param {Object} paymentData - Payment data to validate
 * @param {Object} formData - Form context data
 * @returns {Object} Validation result with recommendations
 */
export function validatePaymentDataIntegrity(paymentData, formData = {}) {
  const issues = [];
  const recommendations = [];

  // Check data completeness
  if (!paymentData.transactionId) {
    issues.push(
      "Missing transaction ID - payment may not be properly recorded"
    );
    recommendations.push("Ensure payment provider returns transaction ID");
  }

  if (!paymentData.captureDetails) {
    recommendations.push(
      "Consider including capture details for better reconciliation"
    );
  }

  // Check data consistency
  if (paymentData.amount <= 0) {
    issues.push("Invalid payment amount");
  }

  if (paymentData.paymentType === "product_wise" && !paymentData.product) {
    issues.push("Product-wise payment missing product information");
    recommendations.push("Include selected product details in payment data");
  }

  // Check timing
  const completedTime = new Date(paymentData.completedAt);
  const now = new Date();
  const timeDiff = now - completedTime;

  if (timeDiff > 5 * 60 * 1000) {
    // 5 minutes
    recommendations.push(
      "Payment completion time is more than 5 minutes ago - verify timing"
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations,
    score: Math.max(0, 100 - issues.length * 20 - recommendations.length * 5),
  };
}

export default {
  standardizePaymentData,
  preparePaymentDataForSubmission,
  extractPaymentSummary,
  formatPaymentDataForDisplay,
  validatePaymentDataIntegrity,
};
