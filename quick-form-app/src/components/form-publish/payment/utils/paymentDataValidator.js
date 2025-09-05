/**
 * Payment Data Validator
 * Comprehensive validation and testing utilities for payment data integrity
 */

/**
 * Validates complete payment data structure
 * @param {Object} paymentData - Payment data to validate
 * @returns {Object} Detailed validation result
 */
export function validateCompletePaymentData(paymentData) {
  const validation = {
    isValid: true,
    score: 100,
    errors: [],
    warnings: [],
    recommendations: [],
    details: {},
  };

  // Core field validation
  const coreValidation = validateCoreFields(paymentData);
  mergeValidationResults(validation, coreValidation);

  // Payment type specific validation
  const typeValidation = validatePaymentTypeSpecific(paymentData);
  mergeValidationResults(validation, typeValidation);

  // Data consistency validation
  const consistencyValidation = validateDataConsistency(paymentData);
  mergeValidationResults(validation, consistencyValidation);

  // Security validation
  const securityValidation = validateSecurityAspects(paymentData);
  mergeValidationResults(validation, securityValidation);

  // Calculate final score
  validation.score = Math.max(
    0,
    100 - validation.errors.length * 20 - validation.warnings.length * 5
  );
  validation.isValid = validation.errors.length === 0;

  return validation;
}

/**
 * Validates core required fields
 * @param {Object} paymentData - Payment data
 * @returns {Object} Validation result
 */
function validateCoreFields(paymentData) {
  const validation = { errors: [], warnings: [], recommendations: [] };

  // Required fields
  const requiredFields = [
    {
      field: "fieldId",
      message: "Field ID is required for form submission mapping",
    },
    {
      field: "amount",
      message: "Payment amount is required",
      validator: (val) => val > 0,
    },
    { field: "currency", message: "Currency is required" },
    { field: "paymentType", message: "Payment type is required" },
    { field: "paymentMethod", message: "Payment method is required" },
    { field: "completedAt", message: "Completion timestamp is required" },
  ];

  requiredFields.forEach(({ field, message, validator }) => {
    const value = paymentData[field];
    if (!value || (validator && !validator(value))) {
      validation.errors.push(`${message}: ${field}`);
    }
  });

  // Important but not critical fields
  const importantFields = [
    {
      field: "transactionId",
      message: "Transaction ID missing - may affect reconciliation",
    },
    { field: "orderId", message: "Order ID missing - may affect tracking" },
    {
      field: "merchantId",
      message: "Merchant ID missing - may affect reporting",
    },
  ];

  importantFields.forEach(({ field, message }) => {
    if (!paymentData[field]) {
      validation.warnings.push(message);
    }
  });

  return validation;
}

/**
 * Validates payment type specific requirements
 * @param {Object} paymentData - Payment data
 * @returns {Object} Validation result
 */
function validatePaymentTypeSpecific(paymentData) {
  const validation = { errors: [], warnings: [], recommendations: [] };
  const { paymentType } = paymentData;

  switch (paymentType) {
    case "product_wise":
      if (!paymentData.selectedProduct && !paymentData.product) {
        validation.errors.push(
          "Product-wise payment missing product information"
        );
      } else {
        const product = paymentData.selectedProduct || paymentData.product;
        if (!product.id) validation.warnings.push("Product missing ID");
        if (!product.name) validation.warnings.push("Product missing name");
        if (!product.price) validation.warnings.push("Product missing price");
      }

      if (!paymentData.itemNumber) {
        validation.warnings.push("Product-wise payment missing item number");
      }
      break;

    case "subscription":
      if (!paymentData.subscription) {
        validation.errors.push(
          "Subscription payment missing subscription details"
        );
      } else {
        const sub = paymentData.subscription;
        if (!sub.subscriptionId)
          validation.errors.push("Subscription missing subscription ID");
        if (!sub.planId)
          validation.warnings.push("Subscription missing plan ID");
      }
      break;

    case "donation":
    case "donation_button":
      if (paymentType === "donation_button" && !paymentData.donationButtonId) {
        validation.errors.push("Donation button payment missing button ID");
      }

      if (!paymentData.donation) {
        validation.recommendations.push(
          "Consider adding donation-specific metadata"
        );
      }
      break;

    case "custom_amount":
      if (!paymentData.customAmount) {
        validation.recommendations.push(
          "Consider adding custom amount metadata"
        );
      }
      break;

    default:
      validation.warnings.push(`Unknown payment type: ${paymentType}`);
  }

  return validation;
}

/**
 * Validates data consistency
 * @param {Object} paymentData - Payment data
 * @returns {Object} Validation result
 */
function validateDataConsistency(paymentData) {
  const validation = { errors: [], warnings: [], recommendations: [] };

  // Amount consistency
  if (paymentData.selectedProduct) {
    const productPrice = parseFloat(paymentData.selectedProduct.price);
    const paymentAmount = parseFloat(paymentData.amount);

    if (Math.abs(productPrice - paymentAmount) > 0.01) {
      validation.warnings.push(
        `Amount mismatch: product price (${productPrice}) vs payment amount (${paymentAmount})`
      );
    }
  }

  // Currency consistency
  if (paymentData.selectedProduct && paymentData.selectedProduct.currency) {
    if (paymentData.selectedProduct.currency !== paymentData.currency) {
      validation.warnings.push(
        `Currency mismatch: product (${paymentData.selectedProduct.currency}) vs payment (${paymentData.currency})`
      );
    }
  }

  // Timestamp validation
  if (paymentData.completedAt) {
    const completedTime = new Date(paymentData.completedAt);
    const now = new Date();
    const timeDiff = now - completedTime;

    if (timeDiff < 0) {
      validation.errors.push("Payment completion time is in the future");
    } else if (timeDiff > 10 * 60 * 1000) {
      // 10 minutes
      validation.warnings.push(
        "Payment completion time is more than 10 minutes ago"
      );
    }
  }

  // Field configuration consistency
  if (paymentData.fieldConfig) {
    const config = paymentData.fieldConfig;

    if (config.paymentType !== paymentData.paymentType) {
      validation.warnings.push(
        "Payment type mismatch between field config and payment data"
      );
    }

    if (
      config.amountConfig?.currency &&
      config.amountConfig.currency !== paymentData.currency
    ) {
      validation.warnings.push(
        "Currency mismatch between field config and payment data"
      );
    }
  }

  return validation;
}

/**
 * Validates security aspects
 * @param {Object} paymentData - Payment data
 * @returns {Object} Validation result
 */
function validateSecurityAspects(paymentData) {
  const validation = { errors: [], warnings: [], recommendations: [] };

  // Check for sensitive data that shouldn't be stored
  const sensitiveFields = ["creditCardNumber", "cvv", "ssn", "password"];
  sensitiveFields.forEach((field) => {
    if (paymentData[field]) {
      validation.errors.push(
        `Sensitive data detected: ${field} should not be stored`
      );
    }
  });

  // Validate transaction IDs format (basic check)
  if (paymentData.transactionId) {
    if (paymentData.transactionId.length < 10) {
      validation.warnings.push(
        "Transaction ID seems too short - verify format"
      );
    }
  }

  if (paymentData.orderId) {
    if (paymentData.orderId.length < 10) {
      validation.warnings.push("Order ID seems too short - verify format");
    }
  }

  // Check for proper data sanitization
  if (paymentData.billingAddress || paymentData.shippingAddress) {
    validation.recommendations.push(
      "Ensure address data is properly sanitized"
    );
  }

  // Provider data validation
  if (paymentData.providerData) {
    if (!paymentData.providerData.provider) {
      validation.warnings.push("Provider data missing provider identifier");
    }

    if (!paymentData.providerData.environment) {
      validation.warnings.push("Provider data missing environment identifier");
    }
  }

  return validation;
}

/**
 * Merges validation results
 * @param {Object} target - Target validation object
 * @param {Object} source - Source validation object
 */
function mergeValidationResults(target, source) {
  target.errors.push(...source.errors);
  target.warnings.push(...source.warnings);
  target.recommendations.push(...source.recommendations);
}

/**
 * Generates a comprehensive validation report
 * @param {Object} paymentData - Payment data to validate
 * @returns {Object} Detailed validation report
 */
export function generateValidationReport(paymentData) {
  const validation = validateCompletePaymentData(paymentData);

  const report = {
    timestamp: new Date().toISOString(),
    paymentId: paymentData.orderId || paymentData.transactionId || "unknown",
    fieldId: paymentData.fieldId || "unknown",

    // Overall assessment
    overall: {
      isValid: validation.isValid,
      score: validation.score,
      grade: getValidationGrade(validation.score),
      status: validation.isValid ? "PASS" : "FAIL",
    },

    // Detailed results
    validation: {
      errors: validation.errors,
      warnings: validation.warnings,
      recommendations: validation.recommendations,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      recommendationCount: validation.recommendations.length,
    },

    // Data summary
    dataSummary: {
      amount: paymentData.amount,
      currency: paymentData.currency,
      type: paymentData.paymentType,
      method: paymentData.paymentMethod,
      hasTransactionId: !!paymentData.transactionId,
      hasOrderId: !!paymentData.orderId,
      hasProductInfo: !!(paymentData.selectedProduct || paymentData.product),
      hasAddressInfo: !!(
        paymentData.billingAddress || paymentData.shippingAddress
      ),
    },

    // Recommendations for improvement
    improvements: generateImprovementSuggestions(validation),

    // Next steps
    nextSteps: generateNextSteps(validation),
  };

  return report;
}

/**
 * Gets validation grade based on score
 * @param {number} score - Validation score
 * @returns {string} Grade letter
 */
function getValidationGrade(score) {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "B+";
  if (score >= 80) return "B";
  if (score >= 75) return "C+";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Generates improvement suggestions
 * @param {Object} validation - Validation results
 * @returns {Array} Improvement suggestions
 */
function generateImprovementSuggestions(validation) {
  const suggestions = [];

  if (validation.errors.length > 0) {
    suggestions.push("Fix critical errors to ensure payment data integrity");
  }

  if (validation.warnings.length > 3) {
    suggestions.push(
      "Address warnings to improve data quality and reliability"
    );
  }

  if (validation.recommendations.length > 0) {
    suggestions.push(
      "Consider implementing recommendations for enhanced functionality"
    );
  }

  return suggestions;
}

/**
 * Generates next steps based on validation
 * @param {Object} validation - Validation results
 * @returns {Array} Next steps
 */
function generateNextSteps(validation) {
  const steps = [];

  if (validation.errors.length > 0) {
    steps.push("Review and fix all critical errors before proceeding");
    steps.push("Test payment flow to ensure errors are resolved");
  }

  if (validation.warnings.length > 0) {
    steps.push("Review warnings and determine which ones need attention");
  }

  if (validation.errors.length === 0) {
    steps.push("Payment data is valid - proceed with form submission");
    steps.push("Monitor payment processing for any issues");
  }

  return steps;
}

/**
 * Quick validation check for critical issues only
 * @param {Object} paymentData - Payment data
 * @returns {boolean} True if no critical issues
 */
export function quickValidationCheck(paymentData) {
  const coreValidation = validateCoreFields(paymentData);
  return coreValidation.errors.length === 0;
}

export default {
  validateCompletePaymentData,
  generateValidationReport,
  quickValidationCheck,
};
