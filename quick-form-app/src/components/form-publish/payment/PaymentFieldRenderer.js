import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PayPalPaymentProvider } from "./providers";
import PaymentLoadingScreen from "./components/PaymentLoadingScreen";
import PaymentStatusCallout from "./components/PaymentStatusCallout";
// import PaymentMethodSelector from "./components/PaymentMethodSelector"; // REMOVED: Now handled inside PayPalPaymentProvider
import {
  getAvailablePaymentMethods,
  formatCurrency,
  getPaymentResultFromUrl,
} from "./utils/paymentHelpers";
import { fetchMerchantCredentialsWithCache } from "./utils/merchantCredentials";
import { validatePaymentFieldConfig } from "./utils/paymentValidation";
import { API_ENDPOINTS } from "../../../config";
import { cubicBezierAsString } from "framer-motion";

/**
 * PaymentFieldRenderer Component
 * Main component that handles all payment types and providers
 */
const PaymentFieldRenderer = ({
  field,
  formId,
  linkData,
  onPaymentComplete,
  onPaymentError,
  onPaymentRequirementChange, // New callback for payment requirements
  className = "",
  formValues = {}, // Add form values for validation
  validateForm, // Add form validation function
  isLastPage = false, // Add isLastPage prop
}) => {
  // Extract field configuration - memoized to prevent re-renders
  const fieldConfig = useMemo(
    () => JSON.parse(field.Properties__c || "{}"),
    [field.Properties__c]
  );
  const fieldId = field.Id || fieldConfig.id;

  // Extract and memoize values FIRST to avoid initialization errors
  // Use merchantAccountId (Salesforce record ID) if present, otherwise fallback to direct merchantId
  const accountIdentifier = useMemo(
    () =>
      fieldConfig.subFields?.merchantAccountId ||
      fieldConfig.subFields?.merchantId ||
      fieldConfig.merchantAccountId ||
      fieldConfig.merchantId,
    [
      fieldConfig.subFields?.merchantAccountId,
      fieldConfig.subFields?.merchantId,
      fieldConfig.merchantAccountId,
      fieldConfig.merchantId,
    ]
  );

  console.log(
    "🔍 PaymentFieldRenderer - accountIdentifier:",
    accountIdentifier
  );

  const paymentType = useMemo(
    () => fieldConfig.subFields?.paymentType || fieldConfig.paymentType,
    [fieldConfig.subFields?.paymentType, fieldConfig.paymentType]
  );

  // Debug logging for data structure
  console.log("🔍 PaymentFieldRenderer - Data Structure:", {
    fieldId,
    fieldConfig,
    subFields: fieldConfig.subFields,
    accountIdentifier,
    paymentType,
    timestamp: new Date().toISOString(),
  });

  // State management - ALL hooks must be called before any early returns
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading payment options..."
  );
  const [merchantCapabilities, setMerchantCapabilities] = useState({});
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Load merchant capabilities - Fixed dependencies
  const loadMerchantCapabilities = useCallback(async () => {
    try {
      setLoadingMessage("Loading merchant capabilities...");

      // Resolve accountIdentifier to an actual merchantId if it's a Salesforce record ID
      const salesforceIdPattern = /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/;
      let effectiveMerchantId = accountIdentifier;

      if (!accountIdentifier) {
        throw new Error("Merchant account identifier is required");
      }

      if (salesforceIdPattern.test(accountIdentifier)) {
        // Try to resolve to a direct merchantId via cached credentials
        const credRes = await fetchMerchantCredentialsWithCache(
          accountIdentifier
        );
        if (!credRes || !credRes.success) {
          throw new Error(
            credRes?.message ||
              "Failed to resolve merchant from account identifier"
          );
        }
        effectiveMerchantId =
          credRes.credentials?.merchantId || effectiveMerchantId;
      }

      const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get-merchant-capabilities",
          merchantId: effectiveMerchantId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load merchant capabilities");
      }

      const capabilities =
        result.data?.capabilities || result.capabilities || {};
      setMerchantCapabilities(capabilities);

      // Determine available payment methods
      const methods = getAvailablePaymentMethods(fieldConfig, capabilities);
      setAvailablePaymentMethods(methods);

      // Auto-select payment method if only one is available
      if (methods.length === 1) {
        setSelectedPaymentMethod(methods[0]);
      } else if (methods.length > 1) {
        // Default to PayPal if available
        setSelectedPaymentMethod(
          methods.includes("paypal") ? "paypal" : methods[0]
        );
      }

      setIsLoading(false);
    } catch (error) {
      console.error("❌ Failed to load merchant capabilities:", error);
      setConfigError({
        type: "error",
        message: "Failed to load payment options",
        details: error.message,
      });
      setIsLoading(false);
    }
  }, [accountIdentifier, fieldConfig]); // Include fieldConfig since it's used in getAvailablePaymentMethods

  // Validate field configuration on mount
  useEffect(() => {
    const validation = validatePaymentFieldConfig(fieldConfig);
    if (!validation.isValid) {
      setConfigError({
        type: "error",
        message: "Payment configuration error",
        details: validation.errors.join(", "),
      });
      setIsLoading(false);
      return;
    }
    console.log("✅ Payment configuration validated");
    // Load merchant capabilities
    loadMerchantCapabilities();
  }, [fieldConfig]);

  // Check for payment result in URL (for redirected payments)
  useEffect(() => {
    const paymentResult = getPaymentResultFromUrl();
    if (paymentResult && paymentResult.fieldId === fieldId) {
      if (paymentResult.status === "success") {
        setPaymentStatus({
          type: "success",
          message: "Payment completed successfully!",
          details: "Your payment has been processed.",
        });
      } else if (paymentResult.status === "cancelled") {
        setPaymentStatus({
          type: "warning",
          message: "Payment was cancelled",
          details: "You can try again when ready.",
        });
      }

      // Clean up URL
      const url = new URL(window.location);
      url.searchParams.delete("payment");
      url.searchParams.delete("form");
      url.searchParams.delete("field");
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [fieldId]);


  // Handle payment success
  const handlePaymentSuccess = useCallback(
    (paymentData) => {
      setIsProcessingPayment(false);
      setPaymentStatus({
        type: "success",
        message: "Payment completed successfully!",
        details: `Transaction ID: ${paymentData.transactionId}`,
      });

      // Attach payment data to form submission
      const enhancedPaymentData = {
        ...paymentData,
        fieldId,
        fieldType: "paypal_payment",
        paymentConfiguration: fieldConfig,
      };

      onPaymentComplete?.(enhancedPaymentData);
    },
    [fieldId, fieldConfig, onPaymentComplete]
  );

  // Handle payment error
  const handlePaymentError = useCallback(
    (error) => {
      setIsProcessingPayment(false);
      setPaymentStatus({
        type: "error",
        message: "Payment failed",
        details:
          error.message || "An error occurred during payment processing.",
      });

      onPaymentError?.(error);
    },
    [onPaymentError]
  );

  // Handle payment cancellation
  const handlePaymentCancel = useCallback((data) => {
    setIsProcessingPayment(false);
    setPaymentStatus({
      type: "warning",
      message: "Payment was cancelled",
      details: "You can try again when ready.",
    });
  }, []);

  // Render payment provider based on selected method and field gateway
  const renderPaymentProvider = () => {
    const gateway = fieldConfig.gateway || "paypal"; // Default to PayPal

    switch (gateway) {
      case "paypal":
        return (
          <PayPalPaymentProvider
            fieldConfig={fieldConfig}
            merchantCapabilities={merchantCapabilities}
            formId={formId}
            linkData={linkData}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onPaymentCancel={handlePaymentCancel}
            onPaymentRequirementChange={onPaymentRequirementChange}
            isProduction={process.env.NODE_ENV === "production"}
            formValues={formValues}
            validateForm={validateForm}
            isLastPage={isLastPage}
          />
        );

      // Future providers can be added here:
      // case 'stripe':
      //   return <StripePaymentProvider ... />;

      default:
        return (
          <PaymentStatusCallout
            type="error"
            message="Unsupported payment gateway"
            details={`Gateway "${gateway}" is not supported.`}
          />
        );
    }
  };

  // Render field label and description
  const renderFieldInfo = () => {
    const fieldLabel = fieldConfig.label || field.Name || "Payment";
    const fieldDescription = fieldConfig.description;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {fieldLabel}
          {fieldConfig.isRequired && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </h3>

        {fieldDescription && (
          <p className="text-sm text-gray-600 mb-4">{fieldDescription}</p>
        )}

        {/* Payment type info */}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="capitalize">
            {fieldConfig.paymentType?.replace("_", " ") || "Payment"}
          </span>

          {fieldConfig.amount?.currency && (
            <span>Currency: {fieldConfig.amount.currency}</span>
          )}

          {fieldConfig.paymentType === "custom_amount" &&
            fieldConfig.amount?.type === "static" && (
              <span>
                Amount:{" "}
                {formatCurrency(
                  fieldConfig.amount.value,
                  fieldConfig.amount.currency
                )}
              </span>
            )}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <PaymentLoadingScreen
      isLoading={isLoading || isProcessingPayment}
      loadingMessage={loadingMessage}
    >
      <div className={`payment-field-renderer ${className}`}>
        {/* Field Information */}
        {renderFieldInfo()}

        {/* Configuration Error */}
        {configError && (
          <PaymentStatusCallout
            type={configError.type}
            message={configError.message}
            details={configError.details}
          />
        )}

        {/* Payment Status */}
        {paymentStatus && (
          <PaymentStatusCallout
            type={paymentStatus.type}
            message={paymentStatus.message}
            details={paymentStatus.details}
            onClose={() => setPaymentStatus(null)}
          />
        )}

        {/* Payment Method Selector - REMOVED: Now handled inside PayPalPaymentProvider */}

        {/* Payment Provider */}
        {!configError && selectedPaymentMethod && (
          <div className="payment-provider-container">
            {renderPaymentProvider()}
          </div>
        )}

        {/* No Payment Methods Available */}
        {!configError && availablePaymentMethods.length === 0 && (
          <PaymentStatusCallout
            type="warning"
            message="No payment methods available"
            details="Please contact the form owner to configure payment methods."
          />
        )}
      </div>
    </PaymentLoadingScreen>
  );
};

export default PaymentFieldRenderer;
