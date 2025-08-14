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

  // Get available payment methods based on merchant capabilities
  const getAvailablePaymentMethods = () => {
    const methods = [];

    // Always include PayPal
    methods.push({
      id: "paypal",
      name: "PayPal",
      icon: "💳",
      description: "Pay with your PayPal account",
    });

    // Add other methods based on capabilities
    if (merchantCapabilities.venmo) {
      methods.push({
        id: "venmo",
        name: "Venmo",
        icon: "💜",
        description: "Fast, secure mobile payments",
      });
    }

    if (merchantCapabilities.cards) {
      methods.push({
        id: "card",
        name: "Credit/Debit Card",
        icon: "💳",
        description: "Pay with your card",
      });
    }

    if (merchantCapabilities.googlePay) {
      methods.push({
        id: "googlepay",
        name: "Google Pay",
        icon: "🟢",
        description: "Fast, secure payments with Google Pay",
      });
    }

    return methods;
  };

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
      return isLastPage && !!donationButtonId;
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

        if (!merchantCredentials) {
          console.error("❌ Merchant credentials not available:", {
            accountIdentifier,
            credentialsError,
            credentialsLoading,
          });
          throw new Error(
            credentialsError ||
              "Merchant credentials are required. Please check your payment field configuration."
          );
        }

        if (!merchantCredentials.merchantId) {
          console.error("❌ Merchant ID is missing from credentials:", {
            merchantCredentials,
          });
          throw new Error(
            "Merchant ID is missing from credentials. Please check your merchant account configuration."
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

        // Prepare payment request
        const paymentRequest = {
          action: "initiate-payment",
          merchantId: merchantCredentials.merchantId,
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
      merchantCredentials.merchantId ,
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
          merchantId: merchantCredentials.merchantId,
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

        // Prepare payment data for form submission
        const paymentData = {
          fieldId: fieldConfig.id || fieldConfig.fieldId, // Include field ID
          orderId: data.orderID,
          transactionId: result.data.transactionId,
          amount: paymentAmount,
          currency: amountConfig.currency || "USD",
          paymentType,
          paymentMethod: selectedPaymentMethod,
          merchantId,
          itemNumber: currentItemNumber,
          captureResult: result.data,
          completedAt: new Date().toISOString(),
        };

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
    if (
      paymentType === "donation_button" ||
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

  // Debug logging (removed to prevent re-rendering)
  // console.log("🔍 PayPalPaymentProvider Debug:", { paymentType, merchantId });

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
                  : "Payment"}
              </span>
            </div>
            <p className="text-sm text-blue-700">
              Payment options will be available on the final page.
              {paymentType === "donation" &&
                " You can choose your donation amount there."}
              {paymentType === "subscription" &&
                " You can complete your subscription there."}
            </p>
          </div>
        )}

        {/* Step 1: Amount Input (if needed) - ONLY ON LAST PAGE */}
        {isLastPage && renderAmountInput()}

        {/* Step 2: Payment Method Selection */}
        {renderPaymentMethodSelection()}

        {/* Step 3: Selected Payment Button */}
        {isPaymentButtonReady() && (
          <div className="payment-button-container">
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
              <strong>
                ✅ Ready to Pay with{" "}
                {
                  getAvailablePaymentMethods().find(
                    (m) => m.id === selectedPaymentMethod
                  )?.name
                }
              </strong>
            </div>

            {selectedPaymentMethod === "paypal" && (
              <PayPalButtons
                style={{
                  layout: "vertical",
                  shape: "rect",
                  color: (
                    getPaymentButtonColor || fallbackGetPaymentButtonColor
                  )(paymentType),
                  label: (
                    getPaymentButtonLabel || fallbackGetPaymentButtonLabel
                  )(paymentType)?.toLowerCase(),
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
                disabled={isProcessing || !!amountError}
              />
            )}

            {selectedPaymentMethod === "googlepay" && (
              <GooglePayIntegration
                merchantId={merchantId}
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
          </div>
        )}

        {/* PayPal Donate Button with ID - Special case for donation_button type */}
        {paymentType === "donation_button" && isLastPage && (
          <div className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">💝</span>
                <div>
                  <h4 className="text-blue-800 font-medium">
                    PayPal Donation Button
                  </h4>
                  <p className="text-blue-600 text-sm">
                    This donation uses your pre-configured PayPal button
                    settings.
                  </p>
                </div>
              </div>
            </div>

            <PayPalDonateButton
              donationButtonId={donationButtonId}
              onSuccess={(donationData) => {
                console.log(
                  "💝 PayPal Donate button payment successful:",
                  donationData
                );
                onPaymentSuccess?.(donationData);
              }}
              onError={(error) => {
                console.error("❌ PayPal Donate button error:", error);
                onPaymentError?.(error);
              }}
              onCancel={(data) => {
                console.log("💔 PayPal Donate button cancelled:", data);
                onPaymentCancel?.(data);
              }}
              disabled={isProcessing}
            />
          </div>
        )}

        {/* Regular payment buttons section */}
        {paymentType !== "donation_button" && isPaymentButtonReady() && (
          <div className="mt-6">
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

            {selectedPaymentMethod === "paypal" && (
              <PayPalButtons
                style={{
                  layout: "vertical",
                  color: fallbackGetPaymentButtonColor(paymentType),
                  shape: "rect",
                  label: fallbackGetPaymentButtonLabel(paymentType),
                  tagline: false,
                }}
                createOrder={createOrder}
                onApprove={onApprove}
                onError={onError}
                onCancel={onCancel}
              />
            )}

            {selectedPaymentMethod === "venmo" && (
              <PayPalButtons
                fundingSource="venmo"
                style={{
                  layout: "vertical",
                  color: "blue",
                  shape: "rect",
                  label: "paypal",
                }}
                createOrder={createOrder}
                onApprove={onApprove}
                onError={onError}
                onCancel={onCancel}
              />
            )}

            {selectedPaymentMethod === "card" && (
              <PayPalCardPayment
                createOrderHandler={createOrder}
                onApproveOrder={onApprove}
                onError={onError}
                onCancel={onCancel}
                amount={parseFloat(paymentAmount) || 0}
                currency={amountConfig.currency || "USD"}
              />
            )}

            {selectedPaymentMethod === "googlepay" && (
              <GooglePayIntegration
                merchantId={merchantId}
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
