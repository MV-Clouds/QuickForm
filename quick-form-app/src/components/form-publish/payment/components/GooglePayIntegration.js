
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { usePayPalScriptReducer } from "@paypal/react-paypal-js";
// Note: No direct API calls here; order/capture are delegated to handlers

const GooglePayIntegration = ({
  merchantId,
  amount,
  currency = "USD",
  onError,
  isProduction = false,
  merchantCapabilities,
  createOrderHandler,
  onApproveOrder,
  disabled = false,
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
  // Keep a ref to the latest onPaymentAuthorized to avoid tight hook deps
  const onPaymentAuthorizedRef = useRef(null);

  const [{ isResolved, isPending, isRejected }] = usePayPalScriptReducer();

  console.log("📊 PayPal SDK State:", { isResolved, isPending, isRejected });

  console.log("⚡⚡⚡", merchantId, merchantCapabilities);

  const baseRequest = useMemo(
    () => ({
      apiVersion: 2,
      apiVersionMinor: 0,
    }),
    []
  );

  const loadGooglePayScript = useCallback(async () => {
    if (googlePayScriptLoaded || !componentMounted.current) {
      console.log("⏭️ Google Pay script already loaded or component unmounted");
      return true;
    }

    try {
      if (
        window.google &&
        window.google.payments &&
        window.google.payments.api
      ) {
        console.log("✅ Google Pay API script already loaded");
        setGooglePayScriptLoaded(true);
        return true;
      }

      if (!document.getElementById("google-pay-api-script")) {
        console.log("🔄 Loading Google Pay API script...");
        await new Promise((resolve, reject) => {
          const googleScript = document.createElement("script");
          googleScript.id = "google-pay-api-script";
          googleScript.src = "https://pay.google.com/gp/p/js/pay.js";
          googleScript.async = true;

          googleScript.onload = () => {
            console.log("✅ Google Pay API script loaded successfully");
            if (componentMounted.current) {
              setGooglePayScriptLoaded(true);
              resolve();
            }
          };

          googleScript.onerror = () => {
            console.error("❌ Failed to load Google Pay API script");
            reject(new Error("Failed to load Google Pay script"));
          };

          document.head.appendChild(googleScript);
        });
      }
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

  const getGooglePaymentsClient = useCallback(() => {
    if (!componentMounted.current) return null;

    if (paymentsClient === null) {
      if (
        !window.google ||
        !window.google.payments ||
        !window.google.payments.api
      ) {
        console.error("❌ Google Pay API not loaded");
        throw new Error("Google Pay API not loaded");
      }

      console.log("🔄 Initializing Google Pay PaymentsClient...");
      const client = new window.google.payments.api.PaymentsClient({
        environment: isProduction ? "PRODUCTION" : "TEST",
        paymentDataCallbacks: {
          onPaymentAuthorized: (paymentData) =>
            onPaymentAuthorizedRef.current
              ? onPaymentAuthorizedRef.current(paymentData)
              : Promise.resolve({ transactionState: "ERROR" }),
        },
      });

      setPaymentsClient(client);
      console.log("✅ Google Pay PaymentsClient initialized:", client);
      return client;
    }
    console.log(
      "🔄 Reusing existing Google Pay PaymentsClient:",
      paymentsClient
    );
    return paymentsClient;
  }, [paymentsClient, isProduction]);

  const getGooglePayConfig = useCallback(async () => {
    if (!componentMounted.current) return null;

    try {
      console.log("🔍 Getting Google Pay config from PayPal SDK...");
      if (!window.paypal || !window.paypal.Googlepay) {
        console.error("❌ PayPal Google Pay SDK not available");
        throw new Error("PayPal Google Pay SDK not available");
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

  const processPayment = useCallback(
    async (paymentData) => {
      try {
        const transactionInfo = getGoogleTransactionInfo();
        console.log(
          "🔄 Processing Google Pay payment using shared handlers..."
        );

        // Ensure required handlers are provided
        if (!createOrderHandler) {
          throw new Error("createOrderHandler is required for Google Pay");
        }
        if (!onApproveOrder) {
          throw new Error("onApproveOrder is required for Google Pay");
        }

        // Sanitize Google Pay paymentMethodData to match PayPal's GraphQL schema
        // Error observed: Field "cardFundingSource" is not defined by type GooglePayPaymentMethodDataInfo.
        const sanitizePaymentMethodData = (pmd) => {
          if (!pmd || typeof pmd !== "object") return pmd;
          const { info, ...rest } = pmd;
          if (!info || typeof info !== "object") return pmd;
          const allowedInfoKeys = [
            "assuranceDetails",
            "billingAddress",
            "cardDetails",
            "cardNetwork",
          ];
          const filteredInfo = {};
          for (const k of allowedInfoKeys) {
            if (info[k] !== undefined) filteredInfo[k] = info[k];
          }
          return { ...rest, info: filteredInfo };
        };

        // Create the PayPal order via shared handler
        const dataForCreate = {
          paymentSource: "googlepay",
          amount: parseFloat(transactionInfo.totalPrice),
          currency: transactionInfo.currencyCode,
          merchantId,
        };
        const actionsForCreate = {};
        const orderId = await createOrderHandler(
          dataForCreate,
          actionsForCreate
        );
        if (!orderId) {
          throw new Error("Order ID not received from createOrderHandler");
        }

        // Confirm order via PayPal Google Pay SDK
        const sanitizedPMD = sanitizePaymentMethodData(
          paymentData.paymentMethodData
        );
        console.debug("🧹 Google Pay paymentMethodData sanitized:", {
          infoKeys: Object.keys(sanitizedPMD?.info || {}),
        });

        const confirmResponse = await window.paypal.Googlepay().confirmOrder({
          orderId,
          paymentMethodData: sanitizedPMD,
        });

        if (confirmResponse.status === "PAYER_ACTION_REQUIRED") {
          await window.paypal.Googlepay().initiatePayerAction({ orderId });
        } else if (confirmResponse.status !== "APPROVED") {
          throw new Error("Payment not approved");
        }

        // Delegate capture/approval to shared onApprove handler
        const approveData = { orderID: orderId, paymentSource: "googlepay" };
        const approveActions = undefined; // Not used by our shared handler
        console.log("🔄 Calling onApproveOrder with:", approveData);
        const approveResult = await onApproveOrder(approveData, approveActions);

        return { transactionState: "SUCCESS", data: approveResult };
      } catch (error) {
        console.error("❌ Process payment error:", error);
        const errorMessage =
          error?.message || error?.toString() || "Unknown payment error";
        return {
          transactionState: "ERROR",
          error: {
            message: errorMessage,
          },
        };
      }
    },
    [getGoogleTransactionInfo, merchantId, createOrderHandler, onApproveOrder]
  );

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
            resolve({ transactionState: "SUCCESS" });
          } else {
            console.error("❌ Google Pay payment failed:", result);
            const errorMessage =
              result?.error?.message || result?.error || "Payment failed";
            const err =
              result?.error instanceof Error
                ? result.error
                : new Error(
                    typeof errorMessage === "string"
                      ? errorMessage
                      : JSON.stringify(errorMessage)
                  );
            onError && onError(err);
            resolve({ transactionState: "ERROR" });
          }
        } catch (error) {
          console.error("❌ Payment processing error:", error);
          const errorMessage =
            error?.message || error?.toString() || "Payment processing failed";
          const err =
            error instanceof Error
              ? error
              : new Error(
                  typeof errorMessage === "string"
                    ? errorMessage
                    : JSON.stringify(errorMessage)
                );
          onError && onError(err);
          resolve({ transactionState: "ERROR" });
        }
      });
    },
    [onError, processPayment]
  );

  // Keep ref pointing to latest onPaymentAuthorized implementation
  useEffect(() => {
    onPaymentAuthorizedRef.current = onPaymentAuthorized;
    return () => {
      if (onPaymentAuthorizedRef.current === onPaymentAuthorized) {
        onPaymentAuthorizedRef.current = null;
      }
    };
  }, [onPaymentAuthorized]);

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

  const onGooglePaymentButtonClicked = useCallback(async () => {
    if (!componentMounted.current) return;

    try {
      if (disabled) {
        console.warn("🛑 Google Pay click blocked: component is disabled");
        return;
      }
      setLoading(true);
      console.log("🔄 Google Pay button clicked");

      const paymentDataRequest = await getGooglePaymentDataRequest();
      console.log(
        "🔍 Payment Data Request:",
        JSON.stringify(paymentDataRequest, null, 2)
      );
      if (!paymentDataRequest) {
        throw new Error("Failed to create payment request");
      }

      const client = getGooglePaymentsClient();
      if (!client) {
        throw new Error("Google Pay client not available");
      }

      await client.loadPaymentData(paymentDataRequest);
    } catch (error) {
      console.error(
        "❌ Google Pay button click error:",
        JSON.stringify(error, null, 2)
      );
      const err =
        error instanceof Error
          ? error
          : new Error(
              error?.message || error?.toString() || "Google Pay failed"
            );
      onError && onError(err);
    } finally {
      if (componentMounted.current) {
        setLoading(false);
      }
    }
  }, [getGooglePaymentDataRequest, getGooglePaymentsClient, onError, disabled]);

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

      const waitForContainer = (attempts = 0) => {
        const container = document.getElementById(
          "google-pay-button-container"
        );

        if (container && componentMounted.current) {
          container.innerHTML = "";
          container.appendChild(button);
          console.log("✅ Google Pay button added to DOM");
        } else if (attempts < 10) {
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

  const initializeGooglePay = useCallback(async () => {
    if (!componentMounted.current || initializationAttempted.current) return;

    try {
      initializationAttempted.current = true;
      console.log("🔄 Initializing Google Pay...");
      setInitializationError(null);

      const googlePayLoaded = await loadGooglePayScript();
      console.log("😆 Google Pay script loaded:", googlePayLoaded);
      if (!googlePayLoaded || !componentMounted.current) {
        setInitializationError("Google Pay script failed to load");
        return;
      }

      if (!window.paypal || !window.paypal.Googlepay) {
        console.error("❌ PayPal Google Pay SDK not available");
        setInitializationError("PayPal Google Pay SDK not available");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("🔍 Checking Google Pay readiness...");
      const isReady = await checkGooglePayReadiness();
      console.log("✅ Google Pay readiness result:", isReady);

      if (isReady && componentMounted.current) {
        console.log("🔄 Adding Google Pay button...");
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

      initializeGooglePay();
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

  if (initializationError) {
    return (
      <div className="google-pay-integration">
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          ❌ Google Pay Error: {initializationError}
        </div>
      </div>
    );
  }

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
