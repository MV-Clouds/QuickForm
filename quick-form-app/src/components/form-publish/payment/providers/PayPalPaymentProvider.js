import React, { useState, useCallback, useEffect, useMemo } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import {
  formatCurrency,
  generateItemNumber,
  getPaymentButtonLabel,
  getPaymentButtonColor,
  getPayPalSDKOptions,
  createPaymentUrls,
} from "../utils/paymentHelpers";
import { validatePaymentAmount } from "../utils/paymentValidation";
import PaymentStatusCallout from "../components/PaymentStatusCallout";
import PayPalCardPayment from "../components/PayPalCardPayment";
import GooglePayIntegration from "../components/GooglePayIntegration";
import PayPalDonateButton from "../components/PayPalDonateButton";
import { API_ENDPOINTS } from "../../../../config";
import {
  fetchMerchantCredentialsWithCache,
  validateMerchantCredentials,
  getProviderCredentials,
  handleCredentialError,
} from "../utils/merchantCredentials";

// PayPal credentials - should match config.js
const SANDBOX_CLIENT_ID =
  "AbYnm03NLihzGgGlRFtdNt2jx3rHYOSZySVeFE-VIsY2C0khi8zfHn1uVq4zq7yPOwKg4ynE0-jJKvYD";
const PRODUCTION_CLIENT_ID = "YOUR_PRODUCTION_CLIENT_ID";

// Fallback helper functions in case they're missing
const fallbackGenerateItemNumber = (fieldId, formId) =>
  `PAY-${fieldId}-${Date.now()}`;
const fallbackGetPaymentButtonLabel = (paymentType) => {
  // ONLY 4 ALLOWED PayPal labels: "paypal", "checkout", "buynow", "pay"
  switch (paymentType) {
    case "donation":
    case "donation_button":
      return "paypal"; // Changed from "donate" to "paypal"
    case "subscription":
      return "paypal"; // Changed from "subscribe" to "paypal"
    case "product_wise":
      return "buynow";
    case "custom_amount":
      return "pay";
    default:
      return "checkout";
  }
};
const fallbackGetPaymentButtonColor = (paymentType) => {
  switch (paymentType) {
    case "donation":
      return "blue";
    default:
      return "gold";
  }
};
const fallbackFormatCurrency = (amount, currency = "USD") =>
  `${currency} ${amount}`;

/**
 * PayPalPaymentProvider Component
 * Handles PayPal-specific payment processing with proper flow
 */
const PayPalPaymentProvider = ({
  fieldConfig,
  merchantCapabilities = {},
  formId,
  linkData,
  onPaymentStart,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  onPaymentRequirementChange, // New callback to notify form about payment requirements
  isProduction = false,
  className = "",
  formValues = {},
  validateForm,
  isLastPage = false, // Add isLastPage prop
}) => {
  // State management
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [currentItemNumber, setCurrentItemNumber] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [formValidationPassed, setFormValidationPassed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Merchant credentials state
  const [merchantCredentials, setMerchantCredentials] = useState(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState(null);

  // Extract field configuration - Handle nested subFields structure
  const subFields = fieldConfig.subFields || fieldConfig;
  const {
    paymentType,
    merchantId, // Legacy support - will be replaced by merchantAccountId
    merchantAccountId, // New secure approach - Salesforce record ID
    amount: amountConfig = {},
    donationButtonId,
    paymentMethods = {},
  } = subFields;

  // Use merchantAccountId if available, fallback to merchantId for backward compatibility
  const accountIdentifier = merchantAccountId || merchantId;

  console.log("🔍 Field config extraction:", {
    fieldConfig,
    subFields,
    merchantId,
    merchantAccountId,
    accountIdentifier,
    paymentType,
    donationButtonId,
    paymentMethods,
  });

  // Fetch merchant credentials securely
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!accountIdentifier) {
        setCredentialsError("No merchant account identifier provided");
        return;
      }

      // If accountIdentifier looks like a direct merchant ID (legacy), use it directly
      const salesforceIdPattern = /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/;
      if (!salesforceIdPattern.test(accountIdentifier)) {
        console.log("🔄 Using legacy direct merchant ID:", accountIdentifier);
        setMerchantCredentials({
          provider: "paypal",
          merchantId: accountIdentifier,
          environment: isProduction ? "production" : "sandbox",
          isActive: true,
        });
        return;
      }

      // Fetch credentials from Salesforce custom setting
      setCredentialsLoading(true);
      setCredentialsError(null);

      try {
        console.log(
          "🔐 Fetching merchant credentials for account ID:",
          accountIdentifier
        );
        const credentialsResponse = await fetchMerchantCredentialsWithCache(
          accountIdentifier
        );

        if (!credentialsResponse.success) {
          throw new Error(
            credentialsResponse.message || "Failed to fetch credentials"
          );
        }

        const credentials = credentialsResponse.credentials;

        if (!validateMerchantCredentials(credentials)) {
          throw new Error("Invalid merchant credentials received");
        }

        console.log("✅ Successfully fetched merchant credentials");
        setMerchantCredentials(credentials);
      } catch (error) {
        console.error("❌ Error fetching merchant credentials:", error);
        const errorResponse = handleCredentialError(error);
        setCredentialsError(errorResponse.message);
      } finally {
        setCredentialsLoading(false);
      }
    };

    fetchCredentials();
  }, [accountIdentifier, isProduction]);

  // Generate PayPal SDK options - Fixed implementation
  const sdkOptions = useMemo(() => {
    const clientId = isProduction ? PRODUCTION_CLIENT_ID : SANDBOX_CLIENT_ID;

    // Build funding options based on merchant capabilities - FIXED SDK validation
    const enabledFunding = [];
    if (merchantCapabilities.venmo) enabledFunding.push("venmo");
    if (merchantCapabilities.cards) enabledFunding.push("card");
    if (merchantCapabilities.payLater) enabledFunding.push("paylater");
    // Note: Google Pay is handled separately, not in enable-funding

    return {
      "client-id": clientId,
      "merchant-id": merchantCredentials?.merchantId || accountIdentifier,
      currency: amountConfig.currency || "USD",
      components: "buttons,card-fields,funding-eligibility,googlepay", // Include Google Pay
      vault: paymentType === "subscription" ? "true" : "false",
      intent: paymentType === "subscription" ? "subscription" : "capture",
      ...(enabledFunding.length > 0 && {
        "enable-funding": enabledFunding.join(","),
      }),
      "disable-funding": "credit", // Encourage alternative payment methods
    };
  }, [
    merchantCredentials,
    accountIdentifier,
    merchantCapabilities,
    paymentType,
    amountConfig.currency,
    isProduction,
  ]);

  // Initialize payment amount based on configuration
  useEffect(() => {
    if (paymentType === "custom_amount" && amountConfig.type === "static") {
      setPaymentAmount(amountConfig.value?.toString() || "");
    } else if (paymentType === "donation" && amountConfig.value) {
      setPaymentAmount(amountConfig.value?.toString() || "");
    }
  }, [paymentType, amountConfig]);

  // Payment completion state
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Notify parent form about payment requirements
  useEffect(() => {
    if (onPaymentRequirementChange) {
      const requiresPayment = paymentType !== "donation_button" && isLastPage;

      onPaymentRequirementChange({
        requiresPayment,
        paymentCompleted,
        hideSubmitButton: requiresPayment && !paymentCompleted,
        autoSubmit: false, // Will be set to true when payment completes
      });
    }
  }, [paymentType, isLastPage, paymentCompleted, onPaymentRequirementChange]);

  // Only check form validation when needed, not continuously
  const checkFormValidation = useCallback(() => {
    if (validateForm) {
      const isValid = validateForm();
      setFormValidationPassed(isValid);
      return isValid;
    }
    setFormValidationPassed(true);
    return true;
  }, [validateForm]);

  // Get available payment methods based on field configuration and merchant capabilities
  const getAvailablePaymentMethods = () => {
    const methods = [];

    // Check field configuration for enabled payment methods
    const fieldPaymentMethods = subFields.paymentMethods || {};

    console.log("🔍 Payment methods config:", {
      fieldPaymentMethods,
      merchantCapabilities,
      paymentMethods,
      subFields,
      fieldConfig,
    });

    const supportsCards =
      merchantCapabilities.cards ||
      merchantCapabilities.card ||
      Object.keys(merchantCapabilities).length === 0;
    const supportsGooglePay =
      merchantCapabilities.googlePay ||
      merchantCapabilities.googlepay ||
      Object.keys(merchantCapabilities).length === 0;

    console.log("🔍 Payment method checks:", {
      paypalCheck: fieldPaymentMethods.paypal !== false,
      cardsCheck: fieldPaymentMethods.cards !== false && supportsCards,
      venmoCheck: fieldPaymentMethods.venmo && merchantCapabilities.venmo,
      googlePayCheck: fieldPaymentMethods.googlePay && supportsGooglePay,
      supportsCards,
      supportsGooglePay,
      merchantCapabilitiesEmpty: Object.keys(merchantCapabilities).length === 0,
    });

    // Always include PayPal if enabled (default to true if not specified)
    if (fieldPaymentMethods.paypal !== false) {
      methods.push({
        id: "paypal",
        name: "PayPal",
        icon: "💳",
        description: "Pay with your PayPal account",
      });
    }

    // Add cards if enabled in field config (default to true) and supported by merchant
    if (fieldPaymentMethods.cards !== false && supportsCards) {
      methods.push({
        id: "card",
        name: "Credit/Debit Card",
        icon: "💳",
        description: "Pay with your card",
      });
    }

    // Add Venmo if enabled in field config and supported by merchant
    if (fieldPaymentMethods.venmo && merchantCapabilities.venmo) {
      methods.push({
        id: "venmo",
        name: "Venmo",
        icon: "💜",
        description: "Fast, secure mobile payments",
      });
    }

    // Add Google Pay if explicitly enabled in field config and supported by merchant
    if (fieldPaymentMethods.googlePay && supportsGooglePay) {
      methods.push({
        id: "googlepay",
        name: "Google Pay",
        icon: "🟢",
        description: "Fast, secure payments with Google Pay",
      });
    }

    console.log("🔍 Available payment methods:", methods);
    return methods;
  };

  // Auto-select payment method if only one is available
  useEffect(() => {
    const availableMethods = getAvailablePaymentMethods();
    if (availableMethods.length === 1 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(availableMethods[0].id);
      console.log("🔍 Auto-selected payment method:", availableMethods[0].id);
    }
  }, [subFields.paymentMethods, merchantCapabilities, selectedPaymentMethod]);

  // Handle amount input change
  const handleAmountChange = useCallback(
    (value) => {
      setPaymentAmount(value);
      setAmountError("");

      if (value) {
        const validation = validatePaymentAmount(value, amountConfig);
        if (!validation.isValid) {
          setAmountError(validation.error);
        }
      }
    },
    [amountConfig]
  );

  // Check if payment input is ready (not form validation)
  const isPaymentInputReady = () => {
    if (paymentType === "donation_button") {
      return !!donationButtonId;
    }

    if (paymentType === "product_wise") {
      return !!selectedProduct && !!paymentAmount && !!currentItemNumber;
    }

    if (paymentType === "custom_amount" && amountConfig.type === "static") {
      return !!amountConfig.value;
    }

    return !!paymentAmount && !amountError;
  };

  // Check if we should show payment method selection - ONLY ON LAST PAGE
  const shouldShowPaymentMethods = () => {
    // For donation_button type, don't show method selection - just show the button
    if (paymentType === "donation_button") {
      return false;
    }
    return isLastPage && isPaymentInputReady();
  };

  // Check if payment button is ready - ONLY ON LAST PAGE
  const isPaymentButtonReady = () => {
    // For donation_button type, don't need method selection
    if (paymentType === "donation_button") {
      return false; // Donation button is rendered separately
    }

    // For product_wise and subscription, need selection + last page
    if (paymentType === "product_wise" || paymentType === "subscription") {
      return (
        isLastPage &&
        !!paymentAmount &&
        !!currentItemNumber &&
        !!selectedPaymentMethod
      );
    }

    return isLastPage && isPaymentInputReady() && !!selectedPaymentMethod;
  };

  // Create PayPal order
  const createOrder = useCallback(
    async (data, actions) => {
      try {
        setIsProcessing(true);

        // Validate form before starting payment - CRITICAL STEP
        console.log("🔍 Validating form before payment...");
        if (!checkFormValidation()) {
          console.log("❌ Form validation failed - stopping payment");
          setStatusMessage({
            type: "error",
            message: "Please complete all required fields",
            details:
              "All required fields must be filled before processing payment.",
          });
          setIsProcessing(false);
          return;
        }
        console.log("✅ Form validation passed - proceeding with payment");

        // Call payment start handler
        const canProceed = onPaymentStart?.();
        if (canProceed === false) {
          setIsProcessing(false);
          return;
        }

        // Generate unique item number - Fixed field ID
        const fieldId =
          fieldConfig.id || fieldConfig.fieldId || "payment-field";
        const itemNumber = (generateItemNumber || fallbackGenerateItemNumber)(
          fieldId,
          formId
        );
        setCurrentItemNumber(itemNumber);

        // Validate amount for variable payments
        if (
          paymentType === "donation" ||
          (paymentType === "custom_amount" && amountConfig.type === "variable")
        ) {
          const validation = validatePaymentAmount(paymentAmount, amountConfig);
          if (!validation.isValid) {
            throw new Error(validation.error);
          }
        }

        // Create payment URLs - Fixed parameter order
        const paymentUrls = createPaymentUrls(
          formId,
          fieldConfig.id || "payment-field"
        );

        // Validate required fields before sending
        console.log("🔍 Validating required fields:", {
          accountIdentifier,
          merchantCredentials,
          paymentType,
          itemNumber,
          fieldConfig,
          subFields,
        });

        // For Salesforce IDs, we need credentials. For direct merchant IDs, we can proceed
        const isSalesforceId =
          accountIdentifier &&
          accountIdentifier.match(/^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/);

        if (isSalesforceId && !merchantCredentials) {
          console.error(
            "❌ Merchant credentials not available for Salesforce ID:",
            {
              accountIdentifier,
              credentialsError,
              credentialsLoading,
            }
          );
          throw new Error(
            credentialsError ||
              "Merchant credentials are required. Please check your payment field configuration."
          );
        }

        if (!isSalesforceId && !accountIdentifier) {
          console.error("❌ No merchant identifier provided:", {
            accountIdentifier,
            merchantCredentials,
          });
          throw new Error(
            "Merchant ID is required. Please check your payment field configuration."
          );
        }

        // Check if we have a valid merchant ID (either from credentials or direct)
        const effectiveMerchantId =
          merchantCredentials?.merchantId || accountIdentifier;
        if (!effectiveMerchantId) {
          console.error("❌ No valid merchant ID available:", {
            merchantCredentials,
            accountIdentifier,
            isSalesforceId,
          });
          throw new Error(
            isSalesforceId
              ? "Merchant ID is missing from credentials. Please check your merchant account configuration."
              : "Merchant ID is required. Please check your payment field configuration."
          );
        }
        if (!paymentType) {
          throw new Error("Payment type is required");
        }
        if (!itemNumber) {
          throw new Error("Item number is required");
        }
        if (!paymentUrls.returnUrl || !paymentUrls.cancelUrl) {
          throw new Error("Return and cancel URLs are required");
        }

        // Prepare payment request with all necessary parameters
        const paymentRequest = {
          action: "initiate-payment",
          merchantId: merchantCredentials?.merchantId || accountIdentifier,
          paymentType,
          returnUrl: paymentUrls.returnUrl,
          cancelUrl: paymentUrls.cancelUrl,
          itemNumber,
          amount: parseFloat(paymentAmount) || 0,
          currency: amountConfig.currency || "USD",
          itemName: fieldConfig.label || "Payment",
          donationButtonId:
            paymentType === "donation_button" ? donationButtonId : undefined,
        };

        // Add product-specific data for product_wise payments
        if (paymentType === "product_wise" && subFields.products) {
          const selectedProduct = subFields.products.find((p) =>
            currentItemNumber.includes(p.id)
          );
          if (selectedProduct) {
            paymentRequest.products = [
              {
                productId: selectedProduct.id,
                quantity: 1,
                amount: selectedProduct.price,
                name: selectedProduct.name,
                description: selectedProduct.description,
                sku: selectedProduct.sku,
              },
            ];
          }
        }

        // Add subscription-specific data for subscription payments
        if (paymentType === "subscription" && subFields.subscriptions) {
          const selectedSubscription = subFields.subscriptions.find((s) =>
            currentItemNumber.includes(s.id)
          );
          if (selectedSubscription) {
            paymentRequest.subscriptionPlan = {
              planId: selectedSubscription.planId,
              planName: selectedSubscription.name,
              planData: selectedSubscription.planData,
            };
          }
        }

        // Add form values for additional context
        if (formValues && Object.keys(formValues).length > 0) {
          paymentRequest.formData = formValues;
        }

        console.log("🔍 Payment request debug:", paymentRequest);

        // Call payment gateway API
        const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentRequest),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to initiate payment");
        }

        console.log("✅ Payment initiated:", result.data);
        return result.data.orderId;
      } catch (error) {
        console.error("❌ Payment initiation error:", error);
        setStatusMessage({
          type: "error",
          message: "Payment initiation failed",
          details: error.message,
        });
        setIsProcessing(false);
        throw error;
      }
    },
    [
      validateForm,
      onPaymentStart,
      fieldConfig,
      formId,
      paymentType,
      merchantCredentials?.merchantId || accountIdentifier,
      paymentAmount,
      amountConfig,
      donationButtonId,
    ]
  );

  // Handle payment approval
  const onApprove = useCallback(
    async (data, actions) => {
      try {
        setIsProcessing(true);

        // Capture payment
        const captureRequest = {
          action: "capture-payment",
          merchantId: merchantCredentials?.merchantId || accountIdentifier,
          orderId: data.orderID,
          paymentType,
          itemNumber: currentItemNumber,
        };

        const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(captureRequest),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to capture payment");
        }

        // Success!
        console.log("✅ Payment completed successfully!");
        setStatusMessage({
          type: "success",
          message: "Payment completed successfully!",
          details: "Submitting form automatically...",
        });

        // Update payment completion state
        setPaymentCompleted(true);

        // Prepare enhanced payment data for form submission
        const paymentData = {
          // Core identifiers
          fieldId: fieldConfig.id || fieldConfig.fieldId,
          orderId: data.orderID,
          transactionId: result.data.transactionId,

          // Payment details
          amount: parseFloat(paymentAmount),
          currency: amountConfig.currency || "USD",
          paymentType,
          paymentMethod: selectedPaymentMethod,

          // Merchant information
          merchantId: merchantCredentials?.merchantId || accountIdentifier,

          // Transaction details
          itemNumber: currentItemNumber,
          captureResult: result.data,

          // Timing
          completedAt: new Date().toISOString(),

          // Product information (for product_wise payments)
          selectedProduct: selectedProduct,

          // Field configuration context
          fieldConfig: {
            paymentType,
            amountConfig,
            paymentMethods: subFields.paymentMethods,
            behavior: subFields.behavior,
          },

          // Additional context
          originalAmount: paymentAmount,
          finalAmount: parseFloat(paymentAmount),

          // Billing/Shipping address (if collected)
          billingAddress: subFields.behavior?.collectBillingAddress
            ? result.data.payer?.address
            : null,
          shippingAddress: subFields.behavior?.collectShippingAddress
            ? result.data.purchase_units?.[0]?.shipping?.address
            : null,

          // Provider specific data
          providerData: {
            provider: "paypal",
            environment:
              process.env.NODE_ENV === "production" ? "production" : "sandbox",
            sdkVersion: window.paypal?.version || "unknown",
            payerInfo: result.data.payer
              ? {
                  payerId: result.data.payer.payer_id,
                  email: result.data.payer.email_address,
                  name: result.data.payer.name,
                }
              : null,
          },
        };

        console.log(
          "💳 Enhanced payment data prepared for submission:",
          paymentData
        );

        // Notify about payment completion and trigger auto-submit
        if (onPaymentRequirementChange) {
          onPaymentRequirementChange({
            requiresPayment: true,
            paymentCompleted: true,
            hideSubmitButton: false,
            autoSubmit: true, // Trigger auto-submit
          });
        }

        onPaymentSuccess?.(paymentData);
      } catch (error) {
        console.error("❌ Payment capture error:", error);
        setStatusMessage({
          type: "error",
          message: "Payment capture failed",
          details: error.message,
        });
        onPaymentError?.(error);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      merchantId,
      paymentType,
      currentItemNumber,
      paymentAmount,
      amountConfig,
      selectedPaymentMethod,
      onPaymentSuccess,
      onPaymentError,
    ]
  );

  // Handle payment cancellation
  const onCancel = useCallback(
    (data) => {
      console.log("💔 Payment cancelled:", data);
      setStatusMessage({
        type: "warning",
        message: "Payment was cancelled",
        details: "You can try again when ready",
      });
      setIsProcessing(false);
      onPaymentCancel?.(data);
    },
    [onPaymentCancel]
  );

  // Handle payment errors
  const onError = useCallback(
    (error) => {
      console.error("❌ PayPal payment error:", error);
      setStatusMessage({
        type: "error",
        message: "Payment error occurred",
        details: "Please try again or contact support",
      });
      setIsProcessing(false);
      onPaymentError?.(error);
    },
    [onPaymentError]
  );

  // Render amount input for variable payments
  const renderAmountInput = () => {
    // Don't show amount input for product_wise payments - amount is determined by product selection
    if (
      paymentType === "donation_button" ||
      paymentType === "product_wise" ||
      (paymentType === "custom_amount" && amountConfig.type === "static")
    ) {
      return null;
    }

    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {paymentType === "donation" ? "Donation Amount" : "Payment Amount"}
          <span className="text-red-500 ml-1">*</span>
        </label>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={paymentAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={`
              block w-full pl-7 pr-12 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500
              ${amountError ? "border-red-500" : "border-gray-300"}
            `}
            placeholder="0.00"
            disabled={isProcessing}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">
              {amountConfig.currency || "USD"}
            </span>
          </div>
        </div>

        {amountError && (
          <p className="text-red-500 text-sm mt-1">{amountError}</p>
        )}

        {/* Amount limits info */}
        {(amountConfig.minAmount || amountConfig.maxAmount) && (
          <p className="text-gray-500 text-sm mt-1">
            {amountConfig.minAmount && amountConfig.maxAmount
              ? `Amount must be between ${(
                  formatCurrency || fallbackFormatCurrency
                )(amountConfig.minAmount)} and ${(
                  formatCurrency || fallbackFormatCurrency
                )(amountConfig.maxAmount)}`
              : amountConfig.minAmount
              ? `Minimum amount: ${(formatCurrency || fallbackFormatCurrency)(
                  amountConfig.minAmount
                )}`
              : `Maximum amount: ${(formatCurrency || fallbackFormatCurrency)(
                  amountConfig.maxAmount
                )}`}
          </p>
        )}
      </div>
    );
  };

  // Render payment method selection
  const renderPaymentMethodSelection = () => {
    if (!shouldShowPaymentMethods()) {
      return null;
    }

    const availableMethods = getAvailablePaymentMethods();

    return (
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Choose Payment Method:
        </h4>
        <div className="space-y-2">
          {availableMethods.map((method) => (
            <label
              key={method.id}
              className={`
                flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                ${
                  selectedPaymentMethod === method.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }
              `}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={selectedPaymentMethod === method.id}
                onChange={(e) => {
                  e.stopPropagation(); // Prevent form submission
                  setSelectedPaymentMethod(e.target.value);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3 flex items-center">
                <span className="text-lg mr-2">{method.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {method.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {method.description}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  // Render product selection for product_wise payment type
  const renderProductSelection = () => {
    const products = subFields.products || [];

    if (products.length === 0) {
      return (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            No products configured for this payment field.
          </p>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Select Product
        </h4>

        {/* Show selected product summary */}
        {selectedProduct && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-green-800">
                  {selectedProduct.name}
                </h5>
                <p className="text-sm text-green-600">
                  Total: {selectedProduct.currency} {selectedProduct.price}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedProduct(null);
                  setPaymentAmount("");
                  setCurrentItemNumber("");
                }}
                className="text-green-600 hover:text-green-800 text-sm underline"
                type="button"
              >
                Change Selection
              </button>
            </div>
          </div>
        )}

        {/* Product selection list - hide when product is selected */}
        {!selectedProduct && (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">
                      {product.name}
                    </h5>
                    {product.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="font-medium text-blue-600">
                        {product.currency} {product.price}
                      </span>
                      {product.sku && <span>SKU: {product.sku}</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault(); // Prevent form submission
                      e.stopPropagation(); // Stop event bubbling

                      setSelectedProduct(product);
                      setPaymentAmount(product.price.toString());
                      setCurrentItemNumber(
                        `${fieldConfig.id || fieldConfig.fieldId}-${product.id}`
                      );

                      console.log(
                        "🛍️ Product selected:",
                        product.name,
                        "Price:",
                        product.price
                      );
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    type="button" // Explicitly set button type to prevent form submission
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render subscription selection for subscription payment type
  const renderSubscriptionSelection = () => {
    const subscriptions = subFields.subscriptions || [];

    if (subscriptions.length === 0) {
      return (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            No subscription plans configured for this payment field.
          </p>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Choose Subscription Plan
        </h4>
        <div className="space-y-3">
          {subscriptions.map((subscription) => {
            const billingCycle = subscription.planData?.billing_cycles?.[0];
            const price =
              billingCycle?.pricing_scheme?.fixed_price?.value || "0.00";
            const currency =
              billingCycle?.pricing_scheme?.fixed_price?.currency_code || "USD";
            const interval =
              billingCycle?.frequency?.interval_unit?.toLowerCase() || "month";
            const count = billingCycle?.frequency?.interval_count || 1;

            return (
              <div
                key={subscription.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">
                      {subscription.name}
                    </h5>
                    {subscription.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {subscription.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="font-medium text-blue-600">
                        {currency} {price}/{count > 1 ? count : ""}
                        {interval}
                        {count > 1 ? "s" : ""}
                      </span>
                      {subscription.planId && (
                        <span>Plan ID: {subscription.planId}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPaymentAmount(price);
                      setCurrentItemNumber(
                        `${fieldConfig.id || fieldConfig.fieldId}-${
                          subscription.id
                        }`
                      );
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Select Plan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render donation button for donation_button payment type
  const renderDonationButton = () => {
    if (!donationButtonId) {
      return (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            No hosted button ID configured for this donation field. Please
            configure a PayPal hosted button ID in the form builder.
          </p>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <PayPalDonateButton
          hostedButtonId={donationButtonId} // Correct parameter name
          merchantId={merchantCredentials?.merchantId || accountIdentifier}
          environment={isProduction ? "production" : "sandbox"}
          itemName={subFields.itemName || "Form Donation"}
          itemNumber={`DONATE-${
            fieldConfig.id || fieldConfig.fieldId
          }-${Date.now()}`}
          customMessage={subFields.customMessage}
          customImageUrl={subFields.customImageUrl}
          onComplete={(donationData) => {
            console.log(
              "💝 PayPal Donate button payment successful:",
              donationData
            );

            // Update payment completion state for donation button
            setPaymentCompleted(true);

            // Notify about payment completion and trigger auto-submit
            if (onPaymentRequirementChange) {
              onPaymentRequirementChange({
                requiresPayment: true,
                paymentCompleted: true,
                hideSubmitButton: false,
                autoSubmit: true, // Trigger auto-submit
              });
            }

            onPaymentSuccess?.(donationData);
          }}
          onError={(error) => {
            console.error("❌ PayPal Donate button error:", error);
            onError?.(error);
          }}
          onCancel={(data) => {
            console.log("💔 PayPal Donate button cancelled:", data);
            onCancel?.(data);
          }}
          disabled={isProcessing}
        />
      </div>
    );
  };

  // Debug logging (removed to prevent re-rendering)
  // console.log("🔍 PayPalPaymentProvider Debug:", { paymentType, merchantId });

  // Show loading state while fetching credentials or if credentials are missing for Salesforce IDs
  const isSalesforceId =
    accountIdentifier &&
    accountIdentifier.match(/^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/);
  if (credentialsLoading || (isSalesforceId && !merchantCredentials)) {
    return (
      <div className={`paypal-payment-provider ${className}`}>
        <div className="flex items-center justify-center p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-blue-700">
            Loading payment configuration...
          </span>
        </div>
      </div>
    );
  }

  // Show error state if credentials failed to load
  if (credentialsError && !merchantCredentials) {
    return (
      <div className={`paypal-payment-provider ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">❌</span>
            <div>
              <h4 className="text-red-800 font-medium">
                Payment Configuration Error
              </h4>
              <p className="text-red-600 text-sm mt-1">{credentialsError}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={sdkOptions}
      onLoadStart={() => {
        console.log("🔄 PayPal SDK loading started...", sdkOptions);
      }}
      onLoadSuccess={() => {
        console.log("✅ PayPal SDK loaded successfully!");
        console.log("🔍 window.paypal exists:", !!window.paypal);
      }}
      onLoadError={(error) => {
        console.error("❌ PayPal SDK failed to load:", error);
        setStatusMessage({
          type: "error",
          message: "Failed to load PayPal SDK",
          details: "Please check your internet connection and try again.",
        });
      }}
    >
      <div className={`paypal-payment-provider ${className}`}>
        {/* Status Messages */}
        {statusMessage && (
          <PaymentStatusCallout
            type={statusMessage.type}
            message={statusMessage.message}
            details={statusMessage.details}
            onClose={() => setStatusMessage(null)}
          />
        )}

        {/* Form Validation Warning */}
        {/* Form validation warning only shows after failed payment attempt */}

        {/* Show preview on non-last pages */}
        {!isLastPage && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💳</span>
              <span className="font-medium text-blue-800">
                {paymentType === "donation" || paymentType === "donation_button"
                  ? "Donation"
                  : paymentType === "subscription"
                  ? "Subscription"
                  : paymentType === "product_wise"
                  ? "Product Selection"
                  : "Payment"}
              </span>
            </div>
            <p className="text-sm text-blue-700">
              {paymentType === "product_wise"
                ? "Select your products below. Payment will be processed on the final page."
                : paymentType === "subscription"
                ? "Choose your subscription plan below. Payment will be processed on the final page."
                : paymentType === "donation_button"
                ? "Donation button will be available below."
                : "Payment options will be available on the final page."}
            </p>

            {/* Show configured settings preview */}
            <div className="mt-3 pt-3 border-t border-blue-300">
              <div className="text-xs text-blue-600 space-y-1">
                {amountConfig.type === "static" && amountConfig.value && (
                  <div>
                    💰 Amount:{" "}
                    {(formatCurrency || fallbackFormatCurrency)(
                      amountConfig.value,
                      amountConfig.currency || "USD"
                    )}
                  </div>
                )}
                {amountConfig.type === "variable" && (
                  <div>
                    💰 Amount: Variable (
                    {amountConfig.minAmount
                      ? `Min: ${amountConfig.minAmount}`
                      : ""}
                    {amountConfig.maxAmount
                      ? ` Max: ${amountConfig.maxAmount}`
                      : ""}
                    )
                  </div>
                )}
                {subFields.behavior?.collectBillingAddress && (
                  <div>📍 Billing address will be collected</div>
                )}
                {subFields.behavior?.collectShippingAddress && (
                  <div>🚚 Shipping address will be collected</div>
                )}
                {paymentMethods && Object.keys(paymentMethods).length > 0 && (
                  <div>
                    💳 Payment methods:{" "}
                    {Object.entries(paymentMethods)
                      .filter(([_, enabled]) => enabled)
                      .map(([method]) => method)
                      .join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Product Selection - Show on all pages for product_wise */}
        {paymentType === "product_wise" && renderProductSelection()}

        {/* Subscription Selection - Show on all pages for subscription */}
        {paymentType === "subscription" && renderSubscriptionSelection()}

        {/* Donation Button with ID - Show on all pages */}
        {paymentType === "donation_button" && renderDonationButton()}

        {/* Step 1: Amount Input (if needed) - ONLY ON LAST PAGE */}
        {isLastPage && renderAmountInput()}

        {/* Step 2: Payment Method Selection */}
        {renderPaymentMethodSelection()}

        {/* Payment Buttons Section - Unified to prevent double rendering */}
        {(isPaymentButtonReady() ||
          ((paymentType === "subscription" || paymentType === "product_wise") &&
            !isLastPage)) && (
          <div className="payment-button-container mt-6">
            {/* Show preview message for subscriptions and products on non-last pages */}
            {(paymentType === "subscription" ||
              paymentType === "product_wise") &&
              !isLastPage && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>
                      Payment will be processed on the final page.
                    </strong>
                    {paymentAmount &&
                      ` Amount: ${(formatCurrency || fallbackFormatCurrency)(
                        parseFloat(paymentAmount),
                        amountConfig.currency || "USD"
                      )}`}
                  </p>
                </div>
              )}

            {/* Ready to pay indicator - only on last page when payment is ready */}
            {isPaymentButtonReady() && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span className="text-green-700 font-medium">
                    Ready to Pay with{" "}
                    {
                      getAvailablePaymentMethods().find(
                        (m) => m.id === selectedPaymentMethod
                      )?.name
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Payment buttons - only render when actually ready */}
            {isPaymentButtonReady() && (
              <>
                {selectedPaymentMethod === "paypal" && (
                  <PayPalButtons
                    style={{
                      layout: "vertical",
                      color: (
                        getPaymentButtonColor || fallbackGetPaymentButtonColor
                      )(paymentType),
                      shape: "rect",
                      label: (
                        getPaymentButtonLabel || fallbackGetPaymentButtonLabel
                      )(paymentType)?.toLowerCase(),
                      tagline: false,
                      height: paymentType === "donation" ? 55 : 40,
                    }}
                    disabled={isProcessing || !!amountError}
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onCancel={onCancel}
                    onError={onError}
                  />
                )}

                {selectedPaymentMethod === "venmo" && (
                  <PayPalButtons
                    fundingSource="venmo"
                    style={{
                      layout: "horizontal",
                      color: "blue",
                      shape: "rect",
                      label: "pay",
                      height: 48,
                      tagline: false,
                    }}
                    disabled={isProcessing || !!amountError}
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onCancel={onCancel}
                    onError={onError}
                  />
                )}

                {selectedPaymentMethod === "card" && (
                  <PayPalCardPayment
                    createOrderHandler={createOrder}
                    onApproveOrder={onApprove}
                    onSuccess={(data) => {
                      console.log("💳 Card payment successful:", data);
                    }}
                    onError={onError}
                    onCancel={onCancel}
                    amount={parseFloat(paymentAmount) || 0}
                    currency={amountConfig.currency || "USD"}
                    disabled={isProcessing || !!amountError}
                  />
                )}

                {selectedPaymentMethod === "googlepay" && (
                  <GooglePayIntegration
                    merchantId={
                      merchantCredentials?.merchantId || accountIdentifier
                    }
                    amount={parseFloat(paymentAmount) || 0}
                    currency={amountConfig.currency || "USD"}
                    isProduction={isProduction}
                    merchantCapabilities={merchantCapabilities}
                    createOrderHandler={createOrder}
                    onApproveOrder={onApprove}
                    onSuccess={(data) => {
                      console.log("🟢 Google Pay payment successful:", data);
                    }}
                    onError={onError}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Processing payment...</p>
            </div>
          </div>
        )}
      </div>
    </PayPalScriptProvider>
  );
};

export default PayPalPaymentProvider;
