import React, { useState, useCallback, useEffect, useMemo } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import {
  formatCurrency,
  generateItemNumber,
  createPaymentUrls,
} from "../utils/paymentHelpers";
import { validatePaymentAmount } from "../utils/paymentValidation";
import PaymentStatusCallout from "../components/PaymentStatusCallout";
import PaymentContent from "../components/PaymentContent";
import PayPalDonateButton from "../components/PayPalDonateButton";
import {
  validateBillingAddress,
  defaultBillingAddress,
} from "../components/BillingAddressForm";
import { API_ENDPOINTS } from "../../../../config";
import {
  fetchMerchantCredentialsWithCache,
  validateMerchantCredentials,
  handleCredentialError,
} from "../utils/merchantCredentials";

// PayPal credentials - should match config.js
const SANDBOX_CLIENT_ID =
  "AbYnm03NLihzGgGlRFtdNt2jx3rHYOSZySVeFE-VIsY2C0khi8zfHn1uVq4zq7yPOwKg4ynE0-jJKvYD";
const PRODUCTION_CLIENT_ID = "YOUR_PRODUCTION_CLIENT_ID";

// Fallback helper functions in case they're missing
const fallbackGenerateItemNumber = (fieldId, formId) =>
  `PAY-${fieldId}-${Date.now()}`;
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
  // const [formValidationPassed, setFormValidationPassed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [billingAddress, setBillingAddress] = useState(null);
  const [billingAddressError, setBillingAddressError] = useState(false);

  // Merchant credentials state
  const [merchantCredentials, setMerchantCredentials] = useState(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState(null);
  // Payment completion state
  const [paymentCompleted, setPaymentCompleted] = useState(false);

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
    console.log("PaymentContent type:", typeof PaymentContent);
    const fetchCredentials = async () => {
      console.log("Scrept provider again render ⚡⚡⚡");

      console.log("🔄 Fetching merchant credentials effect triggered");
      console.log("🔍 Account identifier:", accountIdentifier);
      if (!accountIdentifier) {
        setCredentialsError("No merchant account identifier provided");
        return;
      }

      // If accountIdentifier looks like a direct merchant ID (legacy), use it directly
      // const salesforceIdPattern = /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/;
      // if (!salesforceIdPattern.test(accountIdentifier)) {
      //   console.log("🔄 Using legacy direct merchant ID:", accountIdentifier);
      //   setMerchantCredentials({
      //     provider: "paypal",
      //     merchantId: accountIdentifier,
      //     environment: isProduction ? "production" : "sandbox",
      //     isActive: true,
      //   });
      //   return;
      // }

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

        // Normalize credentials shape from API to expected provider structure
        const raw = credentialsResponse.credentials || credentialsResponse;
        const normalized = (() => {
          const c = raw || {};
          const nested = c.credentials || {};
          const paypal = c.paypal || nested.paypal || {};
          const provider = (
            c.provider ||
            nested.provider ||
            paypal.provider ||
            "paypal"
          ).toLowerCase();
          const merchantId =
            c.merchantId || nested.merchantId || paypal.merchantId || null;
          const environment =
            c.environment ||
            nested.environment ||
            paypal.environment ||
            (isProduction ? "production" : "sandbox");
          const isActive =
            typeof c.isActive === "boolean"
              ? c.isActive
              : typeof nested.isActive === "boolean"
              ? nested.isActive
              : true;
          const capabilities =
            c.capabilities ||
            nested.capabilities ||
            paypal.capabilities ||
            credentialsResponse.metadata?.capabilities ||
            {};
          return { provider, merchantId, environment, isActive, capabilities };
        })();

        if (!validateMerchantCredentials(normalized)) {
          console.error(
            "❌ Invalid merchant credentials payload received:",
            credentialsResponse
          );
          throw new Error("Invalid merchant credentials received");
        }

        console.log("✅ Successfully fetched merchant credentials", normalized);
        setMerchantCredentials(normalized);
      } catch (error) {
        console.error("❌ Error fetching merchant credentials:", error);
        const errorResponse = handleCredentialError(error);
        setCredentialsError(errorResponse.message);
      } finally {
        setCredentialsLoading(false);
      }
    };
    console.log("🔄 Triggering credentials fetch effect:");
    fetchCredentials();
  }, [accountIdentifier, isProduction]);

  // Initialize payment amount based on configuration
  useEffect(() => {
    if (paymentType === "custom_amount" && amountConfig.type === "static") {
      setPaymentAmount(amountConfig.value?.toString() || "");
    } else if (paymentType === "donation" && amountConfig.value) {
      setPaymentAmount(amountConfig.value?.toString() || "");
    }
  }, [paymentType, amountConfig]);

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

  // Auto-select payment method if only one is available
  useEffect(() => {
    const availableMethods = getAvailablePaymentMethods();
    if (availableMethods.length === 1 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(availableMethods[0].id);
      console.log("🔍 Auto-selected payment method:", availableMethods[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subFields.paymentMethods, merchantCapabilities, selectedPaymentMethod]);

  // Precompute a stable enabled-funding signature to avoid option churn
  const enabledFundingStr = useMemo(() => {
    const flags = {
      venmo: !!merchantCapabilities?.venmo,
      card: !!(merchantCapabilities?.cards || merchantCapabilities?.card),
      paylater: !!merchantCapabilities?.payLater,
    };
    return Object.entries(flags)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(",");
  }, [
    merchantCapabilities?.venmo,
    merchantCapabilities?.cards,
    merchantCapabilities?.card,
    merchantCapabilities?.payLater,
  ]);

  // Generate PayPal SDK options - avoid null merchant-id in options and keep them stable
  const sdkOptions = useMemo(() => {
    const clientId = isProduction ? PRODUCTION_CLIENT_ID : SANDBOX_CLIENT_ID;
    const options = {
      "client-id": clientId,
      currency: amountConfig.currency || "USD",
      components: "buttons,card-fields,funding-eligibility,googlepay",
      vault: paymentType === "subscription" ? "true" : "false",
      intent: paymentType === "subscription" ? "subscription" : "capture",
      ...(enabledFundingStr && { "enable-funding": enabledFundingStr }),
      "disable-funding": "credit",
    };

    const effectiveMerchantId =
      merchantCredentials?.merchantId || accountIdentifier;
    if (effectiveMerchantId) {
      options["merchant-id"] = effectiveMerchantId;
    }
    return options;
  }, [
    enabledFundingStr,
    amountConfig.currency,
    paymentType,
    isProduction,
    merchantCredentials?.merchantId,
    accountIdentifier,
  ]);

  // Only check form validation when needed, not continuously
  const checkFormValidation = useCallback(() => {
    if (validateForm) {
      const isValid = validateForm();
      // setFormValidationPassed(isValid);
      return isValid;
    }
    // setFormValidationPassed(true);
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

  // Handle product selection (supports both single product and multiple products)
  const handleProductSelection = useCallback(
    (productOrProducts) => {
      setSelectedProduct(productOrProducts);

      // Calculate total amount for selected products
      let totalAmount = 0;
      let productNames = [];

      if (Array.isArray(productOrProducts)) {
        // Multiple products selected
        totalAmount = productOrProducts.reduce(
          (sum, product) => sum + (product.price || 0),
          0
        );
        productNames = productOrProducts.map((p) => p.name);
      } else if (productOrProducts && productOrProducts.price) {
        // Single product selected
        totalAmount = productOrProducts.price;
        productNames = [productOrProducts.name];
      }

      if (totalAmount > 0) {
        setPaymentAmount(totalAmount.toString());
        setAmountError("");

        // Generate item number for the selected product(s)
        const fieldId =
          fieldConfig.id || fieldConfig.fieldId || "payment-field";
        const itemNumber = (generateItemNumber || fallbackGenerateItemNumber)(
          fieldId,
          formId
        );
        setCurrentItemNumber(itemNumber);

        // Notify parent that payment is ready but NOT auto-submit
        // Notify parent using standardized keys
        onPaymentRequirementChange({
          requiresPayment: true,
          paymentCompleted: false,
          hideSubmitButton: true,
          autoSubmit: false, // Don't auto-submit until payment completes
          amount: totalAmount,
          currency: subFields?.currency || "USD",
          paymentMethod: "paypal_product",
          itemNumber: itemNumber,
        });

        console.log("🛍️ Product(s) selected - Payment details updated:", {
          products: productNames,
          totalPrice: totalAmount,
          itemNumber: itemNumber,
          autoSubmit: false,
        });
      }

      console.log("🛍️ Product selection updated:", {
        isArray: Array.isArray(productOrProducts),
        count: Array.isArray(productOrProducts)
          ? productOrProducts.length
          : productOrProducts
          ? 1
          : 0,
        totalAmount,
      });
    },
    [
      fieldConfig.id,
      fieldConfig.fieldId,
      formId,
      onPaymentRequirementChange,
      subFields,
    ]
  );

  // Handle subscription selection
  const handleSubscriptionSelection = useCallback(
    (subscription) => {
      setSelectedSubscription(subscription);
      if (subscription && subscription.price) {
        setPaymentAmount(subscription.price.toString());
        setAmountError("");

        // Generate item number for the selected subscription
        const fieldId =
          fieldConfig.id || fieldConfig.fieldId || "payment-field";
        const itemNumber = (generateItemNumber || fallbackGenerateItemNumber)(
          fieldId,
          formId
        );
        setCurrentItemNumber(itemNumber);

        // Notify parent that payment is ready but NOT auto-submit
        // Notify parent using standardized keys
        onPaymentRequirementChange({
          requiresPayment: true,
          paymentCompleted: false,
          hideSubmitButton: true,
          autoSubmit: false, // Wait for user approval before auto-submitting
          amount: subscription.price,
          currency: subscription.currency || subFields?.currency || "USD",
          paymentMethod: "paypal_subscription",
          itemNumber: itemNumber,
        });

        console.log("📅 Subscription selected - Payment details updated:", {
          subscription: subscription.name,
          price: subscription.price,
          currency: subscription.currency,
          itemNumber: itemNumber,
          autoSubmit: false,
        });
      }
      console.log("📅 Subscription selected:", subscription);
    },
    [
      fieldConfig.id,
      fieldConfig.fieldId,
      formId,
      onPaymentRequirementChange,
      subFields,
    ]
  );

  // Check if payment input is ready (not form validation)
  const isPaymentInputReady = () => {
    if (paymentType === "donation_button") {
      return !!donationButtonId;
    }

    if (paymentType === "product_wise") {
      // Handle both single product and multiple products
      const hasProducts = Array.isArray(selectedProduct)
        ? selectedProduct.length > 0
        : !!selectedProduct;
      return hasProducts && !!paymentAmount && !!currentItemNumber;
    }

    if (paymentType === "subscription") {
      return !!selectedSubscription && !!paymentAmount && !!currentItemNumber;
    }

    if (paymentType === "custom_amount" && amountConfig.type === "static") {
      return !!amountConfig.value;
    }

    // When billing address collection is enabled, ensure it's filled before enabling payment
    if (subFields?.behavior?.collectBillingAddress) {
      const { valid } = validateBillingAddress(
        billingAddress || defaultBillingAddress
      );
      return !!paymentAmount && !amountError && valid;
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

    // For subscription type, need selection + last page + payment method
    if (paymentType === "subscription") {
      const ready =
        isLastPage &&
        !!selectedSubscription &&
        !!paymentAmount &&
        !!currentItemNumber &&
        !!selectedPaymentMethod;

      console.log("🔍 Subscription payment button readiness check:", {
        paymentType,
        isLastPage,
        selectedSubscription: selectedSubscription?.name,
        paymentAmount,
        currentItemNumber,
        selectedPaymentMethod,
        ready,
      });

      return ready;
    }

    // For product_wise, need selection + last page
    if (paymentType === "product_wise") {
      // Handle both single product and multiple products
      const hasProducts = Array.isArray(selectedProduct)
        ? selectedProduct.length > 0
        : !!selectedProduct;

      const ready =
        isLastPage &&
        hasProducts &&
        !!paymentAmount &&
        !!currentItemNumber &&
        !!selectedPaymentMethod;

      console.log("🔍 Product payment button readiness check:", {
        paymentType,
        isLastPage,
        hasProducts,
        selectedProductType: Array.isArray(selectedProduct)
          ? "array"
          : "single",
        selectedProductCount: Array.isArray(selectedProduct)
          ? selectedProduct.length
          : selectedProduct
          ? 1
          : 0,
        paymentAmount,
        currentItemNumber,
        selectedPaymentMethod,
        ready,
      });

      return ready;
    }

    const ready =
      isLastPage && isPaymentInputReady() && !!selectedPaymentMethod;

    console.log("🔍 Payment button readiness check (general):", {
      paymentType,
      isLastPage,
      isPaymentInputReady: isPaymentInputReady(),
      selectedPaymentMethod,
      ready,
    });

    return ready;
  };

  // Create PayPal order
  const createOrder = async (data, actions) => {
    console.log("🎬 createOrder function called with data:", data);
    console.log(
      "🎬 createOrder actions available:",
      Object.keys(actions || {})
    );

    try {
      // setIsProcessing(true);
      console.log("🔄 Setting processing state to true");

      // Validate form before starting payment - CRITICAL STEP
      console.log("🔍 Validating form before payment...");
      if (!checkFormValidation()) {
        console.log("❌ Form validation failed - stopping payment");
        // setStatusMessage({
        //   type: "error",
        //   message: "Please complete all required fields",
        //   details:
        //     "All required fields must be filled before processing payment.",
        // });
        // setIsProcessing(false);
        // Throw to ensure PayPal SDK rejects onClick and does not open a window
        throw new Error("Form validation failed");
      }
      // Validate billing address if required
      if (subFields?.behavior?.collectBillingAddress) {
        const { valid } = validateBillingAddress(
          billingAddress || defaultBillingAddress
        );
        if (!valid) {
          setBillingAddressError(true);
          throw new Error("Billing address is required");
        }
      }
      console.log("✅ Form validation passed - proceeding with payment");

      // Generate unique item number - Fixed field ID
      const fieldId = fieldConfig.id || fieldConfig.fieldId || "payment-field";
      const itemNumber = (generateItemNumber || fallbackGenerateItemNumber)(
        fieldId,
        formId
      );
      // setCurrentItemNumber(itemNumber);

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
        console.error("❌ Payment type is invalid:", { paymentType });
        throw new Error("Payment type is required");
      }
      if (!itemNumber) {
        console.error("❌ Generated item number is invalid:", { itemNumber });
        throw new Error("Item number is required");
      }
      if (!paymentUrls.returnUrl || !paymentUrls.cancelUrl) {
        console.error("❌ Payment URLs are invalid:", { paymentUrls });
        throw new Error("Return and cancel URLs are required");
      }

      // Prepare payment request with all necessary parameters
      const paymentRequest = {
        action: "initiate-payment",
        merchantId: merchantCredentials?.merchantId || accountIdentifier,
        paymentType,
        returnUrl: paymentUrls.returnUrl,
        cancelUrl: paymentUrls.cancelUrl,
        itemNumber: itemNumber,
        amount: parseFloat(paymentAmount) || 0,
        currency: amountConfig.currency || "USD",
        itemName: fieldConfig.label || "Payment",
        donationButtonId:
          paymentType === "donation_button" ? donationButtonId : undefined,
      };

      // Add product-specific data for product_wise payments (support both single and multiple products)
      if (paymentType === "product_wise" && selectedProduct) {
        if (Array.isArray(selectedProduct)) {
          // Multiple products selected
          paymentRequest.products = selectedProduct.map((product) => ({
            productId: product.id,
            quantity: 1,
            amount: product.price,
            name: product.name,
            description: product.description,
            sku: product.sku,
          }));
        } else {
          // Single product selected
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

      // Add subscription-specific data for subscription payments (prefer explicit selection)
      if (paymentType === "subscription" && selectedSubscription) {
        paymentRequest.subscriptionPlan = {
          planId: selectedSubscription.planId,
          planName: selectedSubscription.name,
          planData: selectedSubscription.planData,
        };
      }

      // Add form values for additional context
      if (formValues && Object.keys(formValues).length > 0) {
        paymentRequest.formData = formValues;
      }

      console.log(
        "🔍 Payment request debug (about to initiate):",
        JSON.stringify(paymentRequest, null, 2)
      );

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
        const errorMsg =
          result.error || `HTTP ${response.status}: Failed to initiate payment`;
        console.error("❌ Payment API error:", {
          status: response.status,
          result,
          errorMsg,
        });
        throw new Error(errorMsg);
      }

      console.log("✅ Payment initiated:", result.data);
      const orderId =
        result.data?.orderId || result.data?.id || result.orderId || result.id;

      if (!orderId) {
        console.error("❌ Missing order ID in response:", result);
        throw new Error(
          "Order ID not received from payment service. Please try again."
        );
      }

      // Extra debug payload resembling what actions.order.create would have used
      const debugPayload = {
        intent: paymentType === "subscription" ? "SUBSCRIPTION" : "CAPTURE",
        purchase_units: [
          {
            amount: {
              value: parseFloat(paymentAmount) || 0,
              currency_code: amountConfig.currency || "USD",
            },
            custom_id: currentItemNumber,
          },
        ],
      };
      console.log(
        "🆔 Returning order ID to PayPal SDK:",
        orderId,
        "\n🧾 Actions.create debug payload:",
        JSON.stringify(debugPayload, null, 2)
      );

      // Don't set processing to false here - this is only order creation, not completion
      // setIsProcessing(false);  // Keep processing true until approval/cancel/error
      return orderId;
    } catch (error) {
      console.error("❌ Payment initiation error:", error);
      console.error("❌ Full error details:", {
        message: error.message,
        stack: error.stack,
        paymentType,
        merchantId: merchantCredentials?.merchantId || accountIdentifier,
        amount: paymentAmount,
        currency: amountConfig.currency,
      });
      setStatusMessage({
        type: "error",
        message: "Payment initiation failed",
        details: error.message,
      });
      setIsProcessing(false);
      throw error;
    }
  };

  // For subscription intent, PayPal Buttons require a createSubscription callback
  const createSubscription = useCallback(
    async (data, actions) => {
      // Initialize variables in outer scope for error handling
      let planId = null;
      let itemNumber = null;
      let requestBody = null;

      // Reuse the initiation flow to create a subscription via backend, then return subscription ID
      try {
        setIsProcessing(true);

        // Validate form inputs
        if (!checkFormValidation()) {
          setStatusMessage({
            type: "error",
            message: "Please complete all required fields",
            details:
              "All required fields must be filled before processing payment.",
          });
          setIsProcessing(false);
          // Throw to ensure the SDK rejects and does not proceed
          throw new Error("Form validation failed");
        }

        // Optional start hook (support async) - abort if it returns false
        // try {
        //   if (typeof onPaymentStart === "function") {
        //     const maybePromise = onPaymentStart();
        //     const proceed =
        //       typeof maybePromise?.then === "function"
        //         ? await maybePromise
        //         : maybePromise !== false;
        //     if (proceed === false) {
        //       setIsProcessing(false);
        //       throw new Error("Payment start was blocked");
        //     }
        //   }
        // } catch (hookErr) {
        //   console.error(
        //     "❌ onPaymentStart hook error (subscription):",
        //     hookErr
        //   );
        //   setIsProcessing(false);
        //   throw hookErr instanceof Error ? hookErr : new Error(String(hookErr));
        // }

        // Reuse current item number if present; otherwise generate a new one
        itemNumber = currentItemNumber;
        if (!itemNumber) {
          const fieldId =
            fieldConfig.id || fieldConfig.fieldId || "payment-field";
          itemNumber = (generateItemNumber || fallbackGenerateItemNumber)(
            fieldId,
            formId
          );
          setCurrentItemNumber(itemNumber);
        }

        // Resolve subscription plan from selection or config
        const planFromSelection =
          selectedSubscription ||
          subFields.subscriptions?.find(
            (s) => currentItemNumber && currentItemNumber.includes(s.id)
          );

        // Try multiple sources for plan ID
        planId =
          planFromSelection?.paypalPlanId ||
          planFromSelection?.planId ||
          subFields.processingResult?.planId ||
          subFields.planId ||
          subFields.subscriptions?.[0]?.paypalPlanId ||
          subFields.subscriptions?.[0]?.planId;

        console.log("🔍 Plan ID resolution:", {
          planFromSelection,
          selectedSubscription,
          processingResult: subFields.processingResult,
          resolvedPlanId: planId,
          subscriptions: subFields.subscriptions,
        });

        if (!planId) {
          throw new Error(
            "Subscription plan ID is not found. Please ensure the subscription is properly configured."
          );
        }

        const paymentUrls = createPaymentUrls(
          formId,
          fieldConfig.id || "payment-field"
        );

        requestBody = {
          action: "initiate-payment",
          merchantId: merchantCredentials?.merchantId || accountIdentifier,
          paymentType: "subscription",
          planId,
          itemNumber,
          returnUrl: paymentUrls.returnUrl,
          cancelUrl: paymentUrls.cancelUrl,
          currency: amountConfig.currency || "USD",
        };

        console.log("📤 Sending subscription request:", requestBody);

        const resp = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        const json = await resp.json();
        console.log("📥 Subscription response:", { status: resp.status, json });

        if (!resp.ok || !json.success) {
          const errorMsg =
            json.error ||
            json.message ||
            `HTTP ${resp.status}: Failed to initiate subscription`;
          console.error("❌ Subscription failed:", errorMsg);
          throw new Error(errorMsg);
        }

        // Extract subscription ID - handle different response formats
        const subscriptionId =
          json.data?.subscriptionId ||
          json.data?.id ||
          json.subscriptionId ||
          json.id;
        if (!subscriptionId) {
          console.error("❌ Missing subscription ID in response:", json);
          throw new Error("Subscription ID not received from server");
        }

        console.log(
          "🆔 Returning subscription ID to PayPal SDK:",
          subscriptionId
        );
        // The PayPal Buttons expects returning a subscription id string
        return subscriptionId;
      } catch (err) {
        console.error("❌ Subscription initiation error:", err);
        console.error("❌ Error details:", {
          message: err.message,
          stack: err.stack,
          planId: planId,
          itemNumber: itemNumber,
          merchantId: merchantCredentials?.merchantId || accountIdentifier,
        });

        setStatusMessage({
          type: "error",
          message: "Subscription initiation failed",
          details: err.message || "Unknown error occurred",
        });
        setIsProcessing(false);

        // Re-throw error to let PayPal SDK know the operation failed
        throw err;
      }
    },
    [
      checkFormValidation,
      fieldConfig,
      formId,
      subFields,
      selectedSubscription,
      amountConfig,
      merchantCredentials,
      accountIdentifier,
      currentItemNumber,
    ]
  );

  // Handle payment approval
  const onApprove = useCallback(
    async (data, actions) => {
      try {
        // setIsProcessing(true);
        console.log("🔄 Processing payment approval with data:", data);

        // Validate orderID from PayPal
        if (!data.orderID) {
          throw new Error("Order ID is missing from PayPal approval data");
        }

        const captureRequest = {
          action: "capture-payment",
          merchantId: merchantCredentials?.merchantId || accountIdentifier,
          orderId:
            paymentType !== "subscription" ? data.orderID : data.subscriptionID,
          paymentType,
          itemNumber: currentItemNumber,
        };

        console.log("📤 Sending capture request:", captureRequest);

        const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(captureRequest),
        });

        const result = await response.json();
        console.log("📥 Capture response:", {
          status: response.status,
          result,
        });

        if (!response.ok || !result.success) {
          const errorMsg =
            result.error ||
            result.message ||
            `HTTP ${response.status}: Failed to capture payment`;
          console.error("❌ Capture failed:", errorMsg);
          throw new Error(errorMsg);
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

        // Return success to PayPal SDK to complete the flow
        return paymentData;
      } catch (error) {
        console.error("❌ Payment capture error:", error);
        console.error("❌ Error details:", {
          message: error.message,
          stack: error.stack,
          orderID: data?.orderID,
          merchantId: merchantCredentials?.merchantId || accountIdentifier,
        });

        setStatusMessage({
          type: "error",
          message: "Payment capture failed",
          details: error.message || "Unknown error occurred",
        });
        onPaymentError?.(error);

        // Re-throw error to let PayPal SDK know the operation failed
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [
      accountIdentifier,
      paymentType,
      currentItemNumber,
      paymentAmount,
      amountConfig,
      selectedPaymentMethod,
      onPaymentSuccess,
      onPaymentError,
      fieldConfig.id,
      fieldConfig.fieldId,
      selectedProduct,
      subFields.behavior,
      subFields.paymentMethods,
      onPaymentRequirementChange,
      merchantCredentials?.merchantId,
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
      const err =
        error instanceof Error
          ? error
          : new Error(error?.message || error?.toString() || "Unknown error");
      console.error("❌ PayPal payment error:", err);
      setStatusMessage({
        type: "error",
        message: "Payment error occurred",
        details: err.message || "Please try again or contact support",
      });
      setIsProcessing(false);
      onPaymentError?.(err);
    },
    [onPaymentError]
  );

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
  // eslint-disable-next-line no-unused-vars
  const renderProductSelection = () => {
    // Extract products from multiple possible locations
    const formItems = subFields.formItems || {};
    const formItemsProducts = Object.values(formItems).filter(
      (item) => item.type === "product"
    );
    const directProducts = subFields.products || [];

    // Combine both sources, preferring direct products if available
    const products =
      directProducts.length > 0 ? directProducts : formItemsProducts;

    console.log("🛍️ renderProductSelection - Checking product sources:", {
      formItemsProducts,
      directProducts,
      finalProducts: products,
      subFields,
    });

    if (products.length === 0) {
      return (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            No products configured for this payment field.
          </p>
          <p className="text-yellow-600 text-xs mt-1">
            Products should be configured in the form builder using the "Manage
            Products" option.
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

                      // Use the proper product selection handler
                      handleProductSelection(product);

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
  // eslint-disable-next-line no-unused-vars
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
                    onClick={(e) => {
                      e.preventDefault(); // Prevent form submission
                      e.stopPropagation(); // Stop event bubbling

                      // Use the proper subscription selection handler
                      handleSubscriptionSelection(subscription);

                      console.log(
                        "📅 Subscription selected:",
                        subscription.name,
                        "Price:",
                        price
                      );
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    type="button" // Explicitly set button type to prevent form submission
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
  // eslint-disable-next-line no-unused-vars
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

  // Previously used dynamic key for script provider removed to avoid remounts

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

  // No merchant identifier configured
  if (!accountIdentifier) {
    return (
      <div className={`paypal-payment-provider ${className}`}>
        <PaymentStatusCallout
          type="error"
          title="Payment Configuration Error"
          message="No merchant account is configured for this payment field."
        />
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      // Avoid dynamic key to prevent unintended SDK reloads/remounts during interactions
      options={sdkOptions}
      // Keep load callbacks minimal to avoid extra state changes that can retrigger the script
      onLoadStart={() => {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.debug("🔄 PayPal SDK loading started");
        }
        console.log("✅ PayPal SDK start loading");
      }}
      onLoadSuccess={() => {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.debug("✅ PayPal SDK loaded");
        }
        console.log("✅ PayPal SDK is ready:");
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

        {/* Payment Content - Unified content rendering */}
        <PaymentContent
          paymentMethod={selectedPaymentMethod}
          paymentType={paymentType}
          subFields={subFields}
          paymentAmount={paymentAmount}
          amountError={amountError}
          selectedProduct={selectedProduct} // This can be single product or array of products
          selectedSubscription={selectedSubscription}
          onAmountChange={handleAmountChange}
          onProductSelection={handleProductSelection}
          onSubscriptionSelection={handleSubscriptionSelection}
          createOrder={createOrder}
          // Provide createSubscription for subscription flows so SDK uses correct callback
          createSubscription={
            paymentType === "subscription" ? createSubscription : undefined
          }
          onApprove={onApprove}
          onCancel={onCancel}
          onError={onError}
          isPaymentButtonReady={isPaymentButtonReady()}
          isProcessing={isProcessing}
          merchantCredentials={merchantCredentials}
          billingAddress={billingAddress || defaultBillingAddress}
          onBillingAddressChange={(addr) => {
            setBillingAddressError(false);
            setBillingAddress(addr);
          }}
          billingAddressError={billingAddressError}
        />

        {/* Payment Method Selection */}
        {renderPaymentMethodSelection()}

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
