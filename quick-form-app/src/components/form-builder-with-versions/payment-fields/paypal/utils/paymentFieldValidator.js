/**
 * Payment Field Validator
 * Comprehensive validation utility for payment field configuration and functionality
 */

export class PaymentFieldValidator {
  constructor() {
    this.validationResults = [];
    this.isEnabled = process.env.NODE_ENV === "development";
  }

  // Validate payment field state structure
  validateState(state, context = "Unknown") {
    const results = [];

    try {
      // Required fields validation
      if (!state) {
        results.push({
          type: "error",
          field: "state",
          message: "State object is null or undefined",
          context,
        });
        return results;
      }

      // Merchant configuration validation
      if (!state.selectedMerchantId) {
        results.push({
          type: "warning",
          field: "selectedMerchantId",
          message: "No merchant ID selected",
          context,
        });
      }

      // Payment type validation
      const validPaymentTypes = [
        "product_wise",
        "custom_amount",
        "subscription",
        "donation",
        "donation_button",
      ];
      if (!validPaymentTypes.includes(state.paymentType)) {
        results.push({
          type: "error",
          field: "paymentType",
          message: `Invalid payment type: ${state.paymentType}`,
          context,
        });
      }

      // Amount configuration validation
      if (state.amount) {
        if (
          state.paymentType === "custom_amount" &&
          state.amount.type === "static" &&
          (!state.amount.value || state.amount.value <= 0)
        ) {
          results.push({
            type: "error",
            field: "amount.value",
            message: "Static amount must be greater than 0",
            context,
          });
        }

        if (state.amount.type === "variable") {
          if (
            state.amount.minAmount &&
            state.amount.maxAmount &&
            parseFloat(state.amount.minAmount) >=
              parseFloat(state.amount.maxAmount)
          ) {
            results.push({
              type: "error",
              field: "amount",
              message: "Min amount must be less than max amount",
              context,
            });
          }
        }

        // Currency and zero-decimal validation
        try {
          const {
            getSupportedCurrencies,
          } = require("../../../../../utils/paypalCurrencies");
          const list = getSupportedCurrencies();
          const validCurrencies = list.map((c) => c.code);
          const selectedCurrency = list.find(
            (c) => c.code === state.amount.currency
          );
          if (!validCurrencies.includes(state.amount.currency)) {
            results.push({
              type: "warning",
              field: "amount.currency",
              message: `Unsupported currency: ${state.amount.currency}`,
              context,
            });
          }
          if (selectedCurrency?.zeroDecimal) {
            const valuesToCheck = [];
            if (state.amount.type === "static")
              valuesToCheck.push(state.amount.value);
            if (state.amount.type === "variable")
              valuesToCheck.push(
                state.amount.minAmount,
                state.amount.maxAmount
              );
            valuesToCheck
              .filter((v) => v !== undefined && v !== null && v !== "")
              .forEach((v) => {
                if (Number(v) % 1 !== 0) {
                  results.push({
                    type: "error",
                    field: "amount",
                    message: `${state.amount.currency} doesn't support decimals; use whole numbers`,
                    context,
                  });
                }
              });
          }
        } catch (_) {
          // ignore dynamic currency checks failure
        }
      }

      // Payment methods validation
      if (state.paymentMethods) {
        const hasAnyMethodEnabled = Object.values(state.paymentMethods).some(
          (enabled) => enabled
        );
        if (!hasAnyMethodEnabled) {
          results.push({
            type: "error",
            field: "paymentMethods",
            message: "At least one payment method must be enabled",
            context,
          });
        }

        // PayPal should always be available
        if (!state.paymentMethods.paypal) {
          results.push({
            type: "warning",
            field: "paymentMethods.paypal",
            message: "PayPal is disabled - this may limit payment options",
            context,
          });
        }
      }

      // Behavior validation
      if (state.behavior) {
        // No specific validation needed for behavior settings currently
      }

      // State metadata validation
      if (!state.isInitialized) {
        results.push({
          type: "warning",
          field: "isInitialized",
          message: "State not properly initialized",
          context,
        });
      }
    } catch (error) {
      results.push({
        type: "error",
        field: "validation",
        message: `Validation error: ${error.message}`,
        context,
      });
    }

    return results;
  }

  // Validate subFields structure for form submission
  validateSubFields(subFields, context = "SubFields") {
    const results = [];

    try {
      if (!subFields) {
        results.push({
          type: "error",
          field: "subFields",
          message: "SubFields object is null or undefined",
          context,
        });
        return results;
      }

      // Check required fields
      if (!subFields.merchantId && !subFields.merchantAccountId) {
        results.push({
          type: "error",
          field: "merchant",
          message: "Either merchantId or merchantAccountId is required",
          context,
        });
      }

      if (!subFields.paymentType) {
        results.push({
          type: "error",
          field: "paymentType",
          message: "Payment type is required",
          context,
        });
      }

      // Validate payment type specific requirements
      switch (subFields.paymentType) {
        case "product_wise":
          if (!subFields.products || subFields.products.length === 0) {
            results.push({
              type: "warning",
              field: "products",
              message: "No products configured for product-wise payment",
              context,
            });
          }
          break;

        case "custom_amount":
          if (!subFields.amount) {
            results.push({
              type: "error",
              field: "amount",
              message:
                "Amount configuration required for custom amount payment",
              context,
            });
          }
          break;

        case "subscription":
          if (
            !subFields.subscriptions ||
            subFields.subscriptions.length === 0
          ) {
            results.push({
              type: "warning",
              field: "subscriptions",
              message: "No subscription plans configured",
              context,
            });
          }
          break;

        case "donation_button":
          if (!subFields.donationButtonId) {
            results.push({
              type: "error",
              field: "donationButtonId",
              message:
                "Donation button ID required for donation button payment",
              context,
            });
          }
          break;
        default:
          // Unknown payment type - no specific checks
          break;
      }

      // Validate payment methods structure
      if (subFields.paymentMethods) {
        const validMethods = ["paypal", "cards", "venmo", "googlePay"];
        Object.keys(subFields.paymentMethods).forEach((method) => {
          if (!validMethods.includes(method)) {
            results.push({
              type: "warning",
              field: "paymentMethods",
              message: `Unknown payment method: ${method}`,
              context,
            });
          }
        });
      }
    } catch (error) {
      results.push({
        type: "error",
        field: "validation",
        message: `SubFields validation error: ${error.message}`,
        context,
      });
    }

    return results;
  }

  // Validate payment field for form submission
  validateForSubmission(fieldData, context = "Submission") {
    const results = [];

    try {
      if (!fieldData) {
        results.push({
          type: "error",
          field: "fieldData",
          message: "Field data is required for submission",
          context,
        });
        return results;
      }

      // Check field structure
      if (!fieldData.id) {
        results.push({
          type: "error",
          field: "id",
          message: "Field ID is required",
          context,
        });
      }

      if (fieldData.type !== "paypal_payment") {
        results.push({
          type: "error",
          field: "type",
          message: `Invalid field type for payment: ${fieldData.type}`,
          context,
        });
      }

      // Validate subFields
      const subFieldsResults = this.validateSubFields(
        fieldData.subFields,
        `${context}.subFields`
      );
      results.push(...subFieldsResults);
    } catch (error) {
      results.push({
        type: "error",
        field: "validation",
        message: `Submission validation error: ${error.message}`,
        context,
      });
    }

    return results;
  }

  // Validate payment data structure
  validatePaymentData(paymentData, context = "PaymentData") {
    const results = [];

    try {
      if (!paymentData) {
        results.push({
          type: "error",
          field: "paymentData",
          message: "Payment data is required",
          context,
        });
        return results;
      }

      // Required payment data fields
      const requiredFields = [
        "fieldId",
        "orderId",
        "amount",
        "currency",
        "paymentType",
        "paymentMethod",
      ];
      requiredFields.forEach((field) => {
        if (!paymentData[field]) {
          results.push({
            type: "error",
            field,
            message: `${field} is required in payment data`,
            context,
          });
        }
      });

      // Validate amount
      if (
        paymentData.amount &&
        (isNaN(paymentData.amount) || paymentData.amount <= 0)
      ) {
        results.push({
          type: "error",
          field: "amount",
          message: "Payment amount must be a positive number",
          context,
        });
      }

      // Validate currency
      // Use centralized PayPal currency list
      const {
        getSupportedCurrencies,
      } = require("../../../../../utils/paypalCurrencies");
      const validCurrencies = getSupportedCurrencies().map((c) => c.code);
      if (
        paymentData.currency &&
        !validCurrencies.includes(paymentData.currency)
      ) {
        results.push({
          type: "warning",
          field: "currency",
          message: `Unsupported currency in payment data: ${paymentData.currency}`,
          context,
        });
      }

      // Validate payment method
      const validPaymentMethods = ["paypal", "card", "venmo", "googlepay"];
      if (
        paymentData.paymentMethod &&
        !validPaymentMethods.includes(paymentData.paymentMethod)
      ) {
        results.push({
          type: "warning",
          field: "paymentMethod",
          message: `Unknown payment method: ${paymentData.paymentMethod}`,
          context,
        });
      }
    } catch (error) {
      results.push({
        type: "error",
        field: "validation",
        message: `Payment data validation error: ${error.message}`,
        context,
      });
    }

    return results;
  }

  // Run comprehensive validation
  runFullValidation(data) {
    const results = [];

    if (data.state) {
      results.push(...this.validateState(data.state, "State"));
    }

    if (data.subFields) {
      results.push(...this.validateSubFields(data.subFields, "SubFields"));
    }

    if (data.fieldData) {
      results.push(...this.validateForSubmission(data.fieldData, "FieldData"));
    }

    if (data.paymentData) {
      results.push(
        ...this.validatePaymentData(data.paymentData, "PaymentData")
      );
    }

    return results;
  }

  // Print validation results
  printResults(results, title = "Validation Results") {
    if (!this.isEnabled || !results || results.length === 0) {
      console.log(`✅ ${title}: All validations passed`);
      return;
    }

    console.group(`🔍 ${title}`);

    const errors = results.filter((r) => r.type === "error");
    const warnings = results.filter((r) => r.type === "warning");

    if (errors.length > 0) {
      console.group(`❌ Errors (${errors.length})`);
      errors.forEach((error) => {
        console.error(`[${error.context}] ${error.field}: ${error.message}`);
      });
      console.groupEnd();
    }

    if (warnings.length > 0) {
      console.group(`⚠️ Warnings (${warnings.length})`);
      warnings.forEach((warning) => {
        console.warn(
          `[${warning.context}] ${warning.field}: ${warning.message}`
        );
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  // Quick validation helper
  isValid(results) {
    return !results || results.filter((r) => r.type === "error").length === 0;
  }

  // Get validation summary
  getSummary(results) {
    if (!results) return { errors: 0, warnings: 0, isValid: true };

    const errors = results.filter((r) => r.type === "error").length;
    const warnings = results.filter((r) => r.type === "warning").length;

    return {
      errors,
      warnings,
      total: results.length,
      isValid: errors === 0,
    };
  }
}

// Create singleton instance
export const paymentFieldValidator = new PaymentFieldValidator();

// React hook for validation
export function usePaymentFieldValidation() {
  const validator = paymentFieldValidator;

  return {
    validateState: (state, context) => validator.validateState(state, context),
    validateSubFields: (subFields, context) =>
      validator.validateSubFields(subFields, context),
    validateForSubmission: (fieldData, context) =>
      validator.validateForSubmission(fieldData, context),
    validatePaymentData: (paymentData, context) =>
      validator.validatePaymentData(paymentData, context),
    runFullValidation: (data) => validator.runFullValidation(data),
    printResults: (results, title) => validator.printResults(results, title),
    isValid: (results) => validator.isValid(results),
    getSummary: (results) => validator.getSummary(results),
  };
}

export default PaymentFieldValidator;
