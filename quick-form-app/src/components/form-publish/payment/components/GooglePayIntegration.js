import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { usePayPalScriptReducer } from "@paypal/react-paypal-js";
// import { API_ENDPOINTS } from "../config";
// import { API_ENDPOINTS } from "../../../config";
import { API_ENDPOINTS } from "../../../../config";
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
  console.log("🚀 GooglePayIntegration component mounted with props:", {
    merchantId,
    amount,
    currency,
    isProduction,
    merchantCapabilities,
    createOrderHandler,
    onApproveOrder,
  });

  const [isGooglePayReady, setIsGooglePayReady] = useState(false);
  const [paymentsClient, setPaymentsClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const [googlePayScriptLoaded, setGooglePayScriptLoaded] = useState(false);
  const componentMounted = useRef(true);
  const initializationAttempted = useRef(false);

  // Use PayPal script reducer to monitor PayPal SDK loading state
  const [{ isResolved, isPending, isRejected }] = usePayPalScriptReducer();

  console.log("📊 PayPal SDK State:", { isResolved, isPending, isRejected });

  // Base configuration for Google Pay
  const baseRequest = useMemo(
    () => ({
      apiVersion: 2,
      apiVersionMinor: 0,
    }),
    []
  );

  // Load Google Pay API script
  const loadGooglePayScript = useCallback(async () => {
    if (googlePayScriptLoaded || !componentMounted.current) {
      console.log("⏭️ Google Pay script already loaded or component unmounted");
      return true;
    }

    try {
      // Check if Google Pay script is already loaded
      if (
        window.google &&
        window.google.payments &&
        window.google.payments.api
      ) {
        console.log("✅ Google Pay API script already loaded");
        setGooglePayScriptLoaded(true);
        return true;
      }

      // Load Google Pay script if not already loaded
      if (!document.getElementById("google-pay-api-script")) {
        console.log("🔄 Loading Google Pay API script...");
        await new Promise((resolve, reject) => {
          const googleScript = document.createElement("script");
          googleScript.id = "google-pay-api-script";
          googleScript.src = "https://pay.google.com/gp/p/js/pay.js";
          googleScript.async = true;

          googleScript.onload = () => {
            console.log("✅ Google Pay API script loaded successfully");
            console.log(window?.google);
            console.log();
            if (componentMounted.current) {
              console.log("success ✨");
              setGooglePayScriptLoaded(true);
              resolve();
            }
          };

          googleScript.onerror = () => {
            console.error("❌ Failed to load Google Pay API script");
            reject(new Error("Failed to load Google Pay script"));
          };

          document.head.appendChild(googleScript);
          console.log("🙌🙌🙌");
          console.log(componentMounted.current);
          componentMounted.current = true;
          console.log(componentMounted.current);
          console.log(window?.google);
        });
      }
      console.log("🙏🙏🙏🙏");
      return true;
    } catch (error) {
      console.error("❌ Google Pay script loading error:", error);
      if (componentMounted.current) {
        setInitializationError(
          `Failed to load Google Pay script: ${error.message}`
        );
      }
      return false;
    }
  }, [googlePayScriptLoaded]);

  // Initialize Google Pay client
  const getGooglePaymentsClient = useCallback(() => {
    if (!componentMounted.current) return null;

    if (paymentsClient === null) {
      if (
        !window.google ||
        !window.google.payments ||
        !window.google.payments.api
      ) {
        throw new Error("Google Pay API not loaded");
      }

      console.log("🔄 Initializing Google Pay PaymentsClient...");
      const client = new window.google.payments.api.PaymentsClient({
        environment: isProduction ? "PRODUCTION" : "TEST",
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
      console.log("🔍 window.paypal exists:", !!window.paypal);
      console.log(
        "🔍 window.paypal.Googlepay exists:",
        !!window.paypal?.Googlepay
      );

      if (!window.paypal) {
        throw new Error("PayPal SDK not loaded - window.paypal is undefined");
      }

      if (!window.paypal.Googlepay) {
        console.log("🔍 Available PayPal methods:", Object.keys(window.paypal));
        throw new Error(
          "Google Pay not available in PayPal SDK - window.paypal.Googlepay is undefined"
        );
      }

      console.log("📞 Calling window.paypal.Googlepay().config()...");
      const googlePayConfig = await window.paypal.Googlepay().config();
      console.log("✅ Google Pay config received:", googlePayConfig);

      return {
        allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
        merchantInfo: googlePayConfig.merchantInfo,
      };
    } catch (error) {
      console.error("❌ Error getting Google Pay config:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        windowPaypal: !!window.paypal,
        windowPaypalGooglepay: !!window.paypal?.Googlepay,
      });
      throw error;
    }
  }, []);

  // Get transaction info (moved here so it's defined before processPayment)
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

  // Process the payment using PayPal's Google Pay integration
  const processPayment = useCallback(
    async (paymentData) => {
      try {
        const transactionInfo = getGoogleTransactionInfo();
        console.log("🔄 Processing Google Pay payment...");

        // Create order on backend
        const orderResponse = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "initiate-payment",
            merchantId,
            amount: parseFloat(transactionInfo.totalPrice),
            currency: transactionInfo.currencyCode,
            paymentType: "googlepay",
            itemName: "Google Pay Payment",
            returnUrl: `${window.location.origin}/paypal-success`,
            cancelUrl: `${window.location.origin}/paypal-cancel`,
            itemNumber: `GPAY-${Date.now()}`,
          }),
        });

        const orderData = await orderResponse.json();
        if (!orderResponse.ok) {
          throw new Error(orderData.error || "Failed to create order");
        }

        // Extract orderId - handle both response formats
        const orderId = orderData.data?.orderId || orderData.orderId || orderData.id;
        if (!orderId) {
          throw new Error("Order ID not received from server");
        }

        // Confirm order with PayPal using Google Pay data
        const confirmResponse = await window.paypal.Googlepay().confirmOrder({
          orderId: orderId,
          paymentMethodData: paymentData.paymentMethodData,
        });

        if (confirmResponse.status === "APPROVED") {
          // Capture the payment
          const captureResponse = await fetch(
            API_ENDPOINTS.UNIFIED_PAYMENT_API,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "capture-payment",
                merchantId,
                orderId: orderId,
                paymentType: "googlepay",
                itemNumber: `GPAY-${Date.now()}`,
              }),
            }
          );

          const captureData = await captureResponse.json();
          if (captureResponse.ok) {
            return { transactionState: "SUCCESS", data: captureData };
          } else {
            throw new Error(captureData.error || "Failed to capture payment");
          }
        } else if (confirmResponse.status === "PAYER_ACTION_REQUIRED") {
          // Handle 3D Secure authentication
          await window.paypal
            .Googlepay()
            .initiatePayerAction({
              orderId: orderId,
            });

          // Retry capture after successful 3DS authentication
          const captureResponse = await fetch(
            API_ENDPOINTS.UNIFIED_PAYMENT_API,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "capture-payment",
                merchantId,
                orderId: orderId,
                paymentType: "googlepay",
                itemNumber: `GPAY-${Date.now()}`,
              }),
            }
          );

          const captureData = await captureResponse.json();
          if (captureResponse.ok) {
            return { transactionState: "SUCCESS", data: captureData };
          } else {
            throw new Error(
              captureData.error || "Failed to capture payment after 3DS"
            );
          }
        } else {
          throw new Error("Payment not approved");
        }
      } catch (error) {
        console.error("❌ Process payment error:", error);
        const errorMessage = error?.message || error?.toString() || "Unknown payment error";
        return {
          transactionState: "ERROR",
          error: {
            message: errorMessage,
          },
        };
      }
    },
    [getGoogleTransactionInfo, merchantId]
  );

  // Handle payment authorization (depends on processPayment)
  const onPaymentAuthorized = useCallback(
    (paymentData) => {
      if (!componentMounted.current) {
        return Promise.resolve({ transactionState: "ERROR" });
      }

      return new Promise(async (resolve) => {
        try {
          console.log("🔄 Processing Google Pay payment...");
          const result = await processPayment(paymentData);

          if (result.transactionState === "SUCCESS") {
            console.log("✅ Google Pay payment successful:", result);
            onSuccess && onSuccess(result);
            resolve({ transactionState: "SUCCESS" });
          } else {
            console.error("❌ Google Pay payment failed:", result);
            const errorMessage = result?.error?.message || result?.error || "Payment failed";
            onError && onError(errorMessage);
            resolve({ transactionState: "ERROR" });
          }
        } catch (error) {
          console.error("❌ Payment processing error:", error);
          const errorMessage = error?.message || error?.toString() || "Payment processing failed";
          onError && onError(errorMessage);
          resolve({ transactionState: "ERROR" });
        }
      });
    },
    [onSuccess, onError, processPayment]
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
      console.log(" 😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️ componentMounted.current");
      console.log(componentMounted.current);
      console.log(response.result);
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

  // (getGoogleTransactionInfo moved above)

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

      if (merchantCapabilities?.country === "JP") {
        paymentDataRequest.allowedPaymentMethods[0].parameters.allowedAuthMethods =
          ["PAN_ONLY"];
      }

      paymentDataRequest.transactionInfo = getGoogleTransactionInfo();
      paymentDataRequest.merchantInfo = merchantInfo;
      paymentDataRequest.callbackIntents = ["PAYMENT_AUTHORIZATION"];

      return paymentDataRequest;
    } catch (error) {
      console.error("❌ Error creating payment data request:", error);
      throw error;
    }
  }, [
    baseRequest,
    getGooglePayConfig,
    merchantCapabilities,
    getGoogleTransactionInfo,
  ]);

  // (removed duplicate processPayment definition; using the earlier one)

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
      onError && onError(error.message);
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

      // Wait for container to be available in DOM
      const waitForContainer = (attempts = 0) => {
        const container = document.getElementById(
          "google-pay-button-container"
        );

        if (container && componentMounted.current) {
          container.innerHTML = ""; // Clear existing button
          container.appendChild(button);
          console.log("✅ Google Pay button added to DOM");
        } else if (attempts < 10) {
          // Retry up to 10 times with 100ms delay
          console.log(
            `⏳ Waiting for Google Pay container (attempt ${
              attempts + 1
            }/10)...`
          );
          setTimeout(() => waitForContainer(attempts + 1), 100);
        } else {
          console.error(
            "❌ Google Pay button container not found after 10 attempts"
          );
          if (componentMounted.current) {
            setInitializationError(
              "Google Pay button container not found in DOM"
            );
          }
        }
      };

      waitForContainer();
    } catch (error) {
      console.error("❌ Error adding Google Pay button:", error);
      if (componentMounted.current) {
        setInitializationError(
          `Failed to add Google Pay button: ${error.message}`
        );
      }
    }
  }, [getGooglePaymentsClient, onGooglePaymentButtonClicked]);

  // Wire the authorization callback to the client when available
  useEffect(() => {
    if (
      paymentsClient &&
      typeof paymentsClient.updatePaymentDataCallbacks === "function"
    ) {
      try {
        paymentsClient.updatePaymentDataCallbacks({ onPaymentAuthorized });
      } catch (e) {
        // Some SDK versions don't support this; ignore gracefully
      }
    }
  }, [paymentsClient, onPaymentAuthorized]);

  // Initialize Google Pay - only when PayPal SDK is ready
  const initializeGooglePay = useCallback(async () => {
    console.log(!componentMounted.current);
    console.log(initializationAttempted.current);
    if (!componentMounted.current || initializationAttempted.current) return;

    try {
      initializationAttempted.current = true;
      console.log("🔄 Initializing Google Pay...");
      setInitializationError(null);

      // Load Google Pay script first

      const googlePayLoaded = await loadGooglePayScript();
      console.log(" 😆 Google Pay script loaded:", googlePayLoaded);
      // if (!googlePayLoaded || !componentMounted.current) {
      //   setInitializationError("Google Pay script failed to load");
      //   return;
      // }
      console.log("1.1.1");
      // Small delay to ensure everything is ready
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("2.2.2");

      // Check readiness

      console.log("check rediness");
      const isReady = await checkGooglePayReadiness();
      console.log("after check rediness");
      console.log("isready", isReady);

      console.log("Google Pay ready:", isReady);

      console.log("now next 1.2.3");

      if (isReady && componentMounted.current) {
        console.log("finally at add button ");
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
  }, [loadGooglePayScript, checkGooglePayReadiness, addGooglePayButton]);

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
      console.log("🔍 Checking window.paypal availability:", !!window.paypal);
      console.log(
        "🔍 Checking window.paypal.Googlepay availability:",
        !!window.paypal?.Googlepay
      );

      if (!!window.paypal?.Googlepay) {
        // setGooglePayScriptLoaded(true);
        initializeGooglePay();
      } else {
        initializeGooglePay();
      }
    } else if (isRejected) {
      console.error("❌ PayPal SDK failed to load");
      setInitializationError("PayPal SDK failed to load");
    } else {
      console.log("⏳ Waiting for conditions to be met...");
    }
  }, [
    isResolved,
    isRejected,
    initializeGooglePay,
    merchantId,
    amount,
    currency,
  ]);

  // Render loading state while PayPal SDK is loading
  if (isPending) {
    return (
      <div className="google-pay-integration">
        <div className="flex items-center p-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Loading PayPal SDK for Google Pay...
        </div>
      </div>
    );
  }

  // Render error state if PayPal SDK failed to load
  if (isRejected) {
    return (
      <div className="google-pay-integration">
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          ❌ PayPal SDK failed to load. Please check your internet connection or
          ad blockers.
        </div>
      </div>
    );
  }

  // Render initialization error
  if (initializationError) {
    return (
      <div className="google-pay-integration">
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          ❌ Google Pay Error: {initializationError}
        </div>
      </div>
    );
  }

  // Render Google Pay button or not available message
  return (
    <div className="google-pay-integration">
      {/* <div
            id="google-pay-button-container"
            className="google-pay-button-container"
            style={{ minHeight: "40px", width: "100%" }}
          ></div> */}
      {isGooglePayReady ? (
        <div>
          <div
            id="google-pay-button-container"
            className="google-pay-button-container"
            style={{ minHeight: "40px", width: "100%" }}
          >
            {" "}
            Hello there{" "}
          </div>
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
