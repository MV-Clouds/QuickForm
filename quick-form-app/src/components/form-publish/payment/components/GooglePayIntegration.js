import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePayPalScriptReducer } from "@paypal/react-paypal-js";

const GooglePayIntegration = ({
  merchantId,
  amount,
  currency = "USD",
  onSuccess,
  onError,
  isProduction = false,
  merchantCapabilities,
  createOrderHandler,
  onApproveOrder,
}) => {
  console.log("🚀 GooglePayIntegration component mounted");

  const [isGooglePayReady, setIsGooglePayReady] = useState(false);
  const [paymentsClient, setPaymentsClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const componentMounted = useRef(true);
  const initializationAttempted = useRef(false);

  // Use PayPal script reducer to monitor PayPal SDK loading state
  const [{ isResolved, isPending, isRejected }] = usePayPalScriptReducer();

  // Base configuration for Google Pay
  const baseRequest = {
    apiVersion: 2,
    apiVersionMinor: 0,
  };

  // Initialize Google Pay client
  const getGooglePaymentsClient = useCallback(() => {
    if (!componentMounted.current) return null;

    if (paymentsClient === null) {
      if (!window.google?.payments?.api) {
        throw new Error("Google Pay API not loaded");
      }

      console.log("🔄 Initializing Google Pay PaymentsClient...");
      const client = new window.google.payments.api.PaymentsClient({
        environment: isProduction ? "PRODUCTION" : "TEST",
        paymentDataCallbacks: {
          onPaymentAuthorized: onPaymentAuthorized,
        },
      });

      setPaymentsClient(client);
      console.log("✅ Google Pay PaymentsClient initialized");
      return client;
    }
    return paymentsClient;
  }, [paymentsClient, isProduction]);

  // Get Google Pay configuration from PayPal SDK
  const getGooglePayConfig = useCallback(async () => {
    if (!componentMounted.current) return null;

    try {
      console.log("🔍 Getting Google Pay config from PayPal SDK...");

      if (!window.paypal?.Googlepay) {
        throw new Error("Google Pay not available in PayPal SDK");
      }

      const googlePayConfig = await window.paypal.Googlepay().config();
      console.log("✅ Google Pay config received:", googlePayConfig);

      return {
        allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
        merchantInfo: googlePayConfig.merchantInfo,
      };
    } catch (error) {
      console.error("❌ Error getting Google Pay config:", error);
      throw error;
    }
  }, []);

  // Handle payment authorization
  const onPaymentAuthorized = useCallback(
    (paymentData) => {
      if (!componentMounted.current) {
        return Promise.resolve({ transactionState: "ERROR" });
      }

      return new Promise(async (resolve) => {
        try {
          console.log("🔄 Processing Google Pay payment...");

          // Use the same createOrder and approve handlers as PayPal buttons
          const orderData = await createOrderHandler();

          // Confirm order with PayPal using Google Pay data
          const confirmResponse = await window.paypal.Googlepay().confirmOrder({
            orderId: orderData,
            paymentMethodData: paymentData.paymentMethodData,
          });

          if (confirmResponse.status === "APPROVED") {
            // Use the same approve handler
            const result = await onApproveOrder({ orderID: orderData });

            console.log("✅ Google Pay payment successful:", result);
            onSuccess && onSuccess({ ...result, paymentMethod: "googlepay" });
            resolve({ transactionState: "SUCCESS" });
          } else {
            throw new Error("Payment not approved");
          }
        } catch (error) {
          console.error("❌ Payment processing error:", error);
          onError && onError(error);
          resolve({ transactionState: "ERROR" });
        }
      });
    },
    [createOrderHandler, onApproveOrder, onSuccess, onError]
  );

  // Check if Google Pay is ready
  const checkGooglePayReadiness = useCallback(async () => {
    if (!componentMounted.current) return false;

    try {
      const client = getGooglePaymentsClient();
      if (!client) {
        console.error("❌ Google Pay client not initialized");
        return false;
      }

      const { allowedPaymentMethods } = await getGooglePayConfig();
      if (!allowedPaymentMethods) {
        console.error("❌ No allowed payment methods in Google Pay config");
        return false;
      }

      const isReadyToPayRequest = Object.assign({}, baseRequest, {
        allowedPaymentMethods: allowedPaymentMethods,
      });

      const response = await client.isReadyToPay(isReadyToPayRequest);
      console.log("🔍 Google Pay readiness check:", response);

      if (componentMounted.current) {
        setIsGooglePayReady(response.result);
      }
      return response.result;
    } catch (error) {
      console.error("❌ Google Pay readiness check failed:", error);
      if (componentMounted.current) {
        setIsGooglePayReady(false);
        setInitializationError(
          `Google Pay readiness check failed: ${error.message}`
        );
      }
      return false;
    }
  }, [getGooglePaymentsClient, getGooglePayConfig, baseRequest]);

  // Get transaction info
  const getGoogleTransactionInfo = useCallback(() => {
    return {
      displayItems: [
        {
          label: "Subtotal",
          type: "SUBTOTAL",
          price: amount.toString(),
        },
      ],
      countryCode: merchantCapabilities?.country || "US",
      currencyCode: currency,
      totalPriceStatus: "FINAL",
      totalPrice: amount.toString(),
      totalPriceLabel: "Total",
    };
  }, [amount, currency, merchantCapabilities]);

  // Create payment data request
  const getGooglePaymentDataRequest = useCallback(async () => {
    if (!componentMounted.current) return null;

    try {
      const paymentDataRequest = Object.assign({}, baseRequest);
      const { allowedPaymentMethods, merchantInfo } =
        await getGooglePayConfig();

      if (!allowedPaymentMethods || !merchantInfo) {
        console.error("❌ Invalid Google Pay config");
        return null;
      }

      paymentDataRequest.allowedPaymentMethods = allowedPaymentMethods;
      paymentDataRequest.transactionInfo = getGoogleTransactionInfo();
      paymentDataRequest.merchantInfo = merchantInfo;
      paymentDataRequest.callbackIntents = ["PAYMENT_AUTHORIZATION"];

      return paymentDataRequest;
    } catch (error) {
      console.error("❌ Error creating payment data request:", error);
      throw error;
    }
  }, [baseRequest, getGooglePayConfig, getGoogleTransactionInfo]);

  // Handle Google Pay button click
  const onGooglePaymentButtonClicked = useCallback(async () => {
    if (!componentMounted.current) return;

    try {
      setLoading(true);
      console.log("🔄 Google Pay button clicked");

      const paymentDataRequest = await getGooglePaymentDataRequest();
      if (!paymentDataRequest) {
        throw new Error("Failed to create payment request");
      }

      const client = getGooglePaymentsClient();
      if (!client) {
        throw new Error("Google Pay client not available");
      }

      await client.loadPaymentData(paymentDataRequest);
    } catch (error) {
      console.error("❌ Google Pay button click error:", error);
      onError && onError(error);
    } finally {
      if (componentMounted.current) {
        setLoading(false);
      }
    }
  }, [getGooglePaymentDataRequest, getGooglePaymentsClient, onError]);

  // Add Google Pay button to DOM
  const addGooglePayButton = useCallback(() => {
    if (!componentMounted.current) return;

    try {
      const client = getGooglePaymentsClient();
      if (!client) {
        console.error("❌ Google Pay client not available for button creation");
        return;
      }

      const button = client.createButton({
        onClick: onGooglePaymentButtonClicked,
        buttonColor: "black",
        buttonType: "buy",
      });

      const container = document.getElementById("google-pay-button-container");
      if (container && componentMounted.current) {
        container.innerHTML = ""; // Clear existing button
        container.appendChild(button);
        console.log("✅ Google Pay button added to DOM");
      }
    } catch (error) {
      console.error("❌ Error adding Google Pay button:", error);
      if (componentMounted.current) {
        setInitializationError(
          `Failed to add Google Pay button: ${error.message}`
        );
      }
    }
  }, [getGooglePaymentsClient, onGooglePaymentButtonClicked]);

  // Initialize Google Pay
  const initializeGooglePay = useCallback(async () => {
    if (!componentMounted.current || initializationAttempted.current) return;

    try {
      initializationAttempted.current = true;
      console.log("🔄 Initializing Google Pay...");
      setInitializationError(null);

      // Check if Google Pay script is loaded
      if (!window.google?.payments?.api) {
        throw new Error("Google Pay API not loaded");
      }

      // Check readiness
      const isReady = await checkGooglePayReadiness();
      console.log("Google Pay ready:", isReady);

      if (isReady && componentMounted.current) {
        addGooglePayButton();
        console.log("✅ Google Pay initialized successfully");
      } else if (componentMounted.current) {
        setInitializationError(
          "Google Pay is not available on this device or browser"
        );
      }
    } catch (error) {
      console.error("❌ Google Pay initialization error:", error);
      if (componentMounted.current) {
        setInitializationError(
          `Failed to initialize Google Pay: ${error.message}`
        );
      }
    }
  }, [checkGooglePayReadiness, addGooglePayButton]);

  // Effect to handle PayPal SDK loading state changes
  useEffect(() => {
    if (
      isResolved &&
      !initializationAttempted.current &&
      merchantId &&
      amount &&
      currency
    ) {
      console.log(
        "✅ All conditions met, starting Google Pay initialization..."
      );

      if (window.paypal?.Googlepay) {
        initializeGooglePay();
      } else {
        setInitializationError("Google Pay not available in PayPal SDK");
      }
    } else if (isRejected) {
      console.error("❌ PayPal SDK failed to load");
      setInitializationError("PayPal SDK failed to load");
    }
  }, [
    isResolved,
    isRejected,
    initializeGooglePay,
    merchantId,
    amount,
    currency,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMounted.current = false;
    };
  }, []);

  // Render loading state while PayPal SDK is loading
  if (isPending) {
    return (
      <div className="flex items-center p-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        Loading Google Pay...
      </div>
    );
  }

  // Render error state
  if (isRejected || initializationError) {
    return (
      <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
        ❌ Google Pay Error:{" "}
        {initializationError || "PayPal SDK failed to load"}
      </div>
    );
  }

  // Render Google Pay button or not available message
  return (
    <div className="google-pay-integration">
      {isGooglePayReady ? (
        <div>
          <div
            id="google-pay-button-container"
            className="google-pay-button-container"
            style={{ minHeight: "40px", width: "100%" }}
          ></div>
          {loading && (
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              Processing Google Pay payment...
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded">
          Google Pay not available on this device or browser
        </div>
      )}
    </div>
  );
};

export default GooglePayIntegration;
