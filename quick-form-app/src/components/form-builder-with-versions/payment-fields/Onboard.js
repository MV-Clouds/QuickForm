import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { API_ENDPOINTS } from "../../../config";

// PayPal SDK configuration (use sandbox for testing)
const PAYPAL_CLIENT_ID =
  "AbYnm03NLihzGgGlRFtdNt2jx3rHYOSZySVeFE-VIsY2C0khi8zfHn1uVq4zq7yPOwKg4ynE0-jJKvYD";
const paypalScriptOptions = {
  clientId: PAYPAL_CLIENT_ID,
  components: "buttons",
  intent: "capture",
};

function PayPalOnboardingButton({
  name,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState(null);
  const popupRef = useRef(null);
  const intervalRef = useRef(null);

  const handleOnboardingClick = async () => {
    if (disabled || isProcessing) return;

    setIsProcessing(true);
    try {
      // Generate onboarding URL
      const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-onboarding-url",
          returnUrl: window.location.origin + "/onboarding-callback",
        }),
      });

      const data = await response.json();
      if (!data.onboardingUrl) {
        throw new Error("Failed to get onboarding URL");
      }

      setOnboardingUrl(data.onboardingUrl);

      // Open popup with better dimensions and positioning
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;

      popupRef.current = window.open(
        data.onboardingUrl,
        "paypal_onboarding",
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,resizable=yes,scrollbars=yes`
      );

      // Monitor popup for completion
      intervalRef.current = setInterval(() => {
        if (!popupRef.current || popupRef.current.closed) {
          clearInterval(intervalRef.current);
          setIsProcessing(false);
          onCancel?.("Onboarding was cancelled or window was closed");
          return;
        }

        try {
          if (
            popupRef.current.location &&
            popupRef.current.location.pathname === "/onboarding-callback"
          ) {
            const urlParams = new URLSearchParams(
              popupRef.current.location.search
            );
            const merchantIdInPayPal = urlParams.get("merchantIdInPayPal");
            const accountStatus = urlParams.get("accountStatus");
            const merchantId = urlParams.get("merchantId");

            popupRef.current.close();
            clearInterval(intervalRef.current);
            setIsProcessing(false);

            if (
              merchantIdInPayPal &&
              accountStatus === "BUSINESS_ACCOUNT" &&
              merchantId
            ) {
              // Store onboarding data
              handleStoreOnboarding(name, merchantId, merchantIdInPayPal);
            } else {
              onError?.("Invalid onboarding data received");
            }
          }
        } catch (e) {
          // Ignore cross-origin errors until redirected to our domain
        }
      }, 500);
    } catch (error) {
      setIsProcessing(false);
      onError?.(error.message || "Failed to start onboarding process");
    }
  };

  const handleStoreOnboarding = async (
    name,
    merchantId,
    merchantIdInPayPal
  ) => {
    try {
      const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "store-onboarding",
          name,
          merchantId,
          merchantIdInPayPal,
          paymentProvider: "PayPal",
          status: "Active",
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        onSuccess?.("Onboarding completed successfully!");
      } else if (response.status === 409) {
        onError?.(data.message || "Account already exists");
      } else {
        onError?.(data.error || "Failed to complete onboarding");
      }
    } catch (error) {
      onError?.("Error storing onboarding information");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  return (
    <motion.button
      className={`inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 min-w-[200px] max-w-[300px] ${
        disabled || isProcessing
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
      }`}
      disabled={disabled || isProcessing}
      onClick={handleOnboardingClick}
      whileTap={{ scale: disabled || isProcessing ? 1 : 0.95 }}
      whileHover={{ scale: disabled || isProcessing ? 1 : 1.02 }}
    >
      {isProcessing ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          <span className="text-sm">Processing...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.65 3.85-3.197 5.341-6.965 5.341h-2.312c-.228 0-.42.15-.472.374l-.718 4.54-.206 1.308-.144.911a.641.641 0 0 0 .633.74h3.94c.524 0 .968-.382 1.05-.9l.048-.302.718-4.54.048-.302c.082-.518.526-.9 1.05-.9h.662c3.606 0 6.426-1.462 7.25-5.69.343-1.77.133-3.253-.933-4.119z" />
          </svg>
          <span className="text-sm font-medium">Connect with PayPal</span>
        </div>
      )}
    </motion.button>
  );
}

function Onboard() {
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState(""); // '', 'checking', 'exists', 'unique'
  const [onboardingStatus, setOnboardingStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch accounts on mount and after onboarding
  const fetchAccounts = async () => {
    setIsLoading(true);
    setError("");
    try {
      console.log("here");
      const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-accounts" }),
      });
      console.log("response", response.status);
      const data = await response.json();
      console.log("data", data);
      setAccounts(data.accounts || []);
    } catch (err) {
      console.log("err", err);
      setError("Failed to load accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("hello");
    fetchAccounts();
  }, []);

  // Name uniqueness check
  const checkName = async (inputName) => {
    setNameStatus("checking");
    setError("");
    try {
      const response = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-name", name: inputName }),
      });
      const data = await response.json();
      setNameStatus(data.exists ? "exists" : "unique");
    } catch {
      setNameStatus("");
      setError("Could not check name uniqueness.");
    }
  };

  // Handle onboarding success
  const handleOnboardingSuccess = (message) => {
    setOnboardingStatus(message);
    setError("");
    setName(""); // Clear the name field
    setNameStatus(""); // Reset name status
    fetchAccounts(); // Refresh the accounts list
  };

  // Handle onboarding error
  const handleOnboardingError = (errorMessage) => {
    setError(errorMessage);
    setOnboardingStatus("");
  };

  // Handle onboarding cancel
  const handleOnboardingCancel = (message) => {
    setOnboardingStatus(message);
    setError("");
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: 30, transition: { duration: 0.3 } },
  };
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };
  const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  return (
    <PayPalScriptProvider options={paypalScriptOptions}>
      <motion.div
        className="flex flex-col items-center p-4 min-h-screen bg-gray-100"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <motion.div
          className="p-6 w-full max-w-4xl bg-white rounded-lg shadow-lg"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.h1
            className="mb-8 text-3xl font-bold text-center text-blue-700"
            variants={fadeInUp}
          >
            PayPal Account Onboarding
          </motion.h1>

          {/* Add New Account */}
          <motion.div
            className="space-y-6 mb-8"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Input Section */}
            <motion.div className="space-y-3" variants={fadeIn}>
              <motion.input
                type="text"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors text-center"
                placeholder="Enter unique account name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameStatus("");
                  setOnboardingStatus("");
                  setError("");
                }}
                onBlur={() => name && checkName(name)}
                disabled={isLoading}
                variants={fadeIn}
              />

              {/* Name Status Indicator */}
              <motion.div
                className="flex items-center justify-center min-h-[24px]"
                variants={fadeIn}
              >
                {nameStatus === "checking" && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Checking availability...</span>
                  </div>
                )}
                {nameStatus === "exists" && (
                  <div className="flex items-center gap-2 text-red-600">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm">
                      Name already exists. Please choose another.
                    </span>
                  </div>
                )}
                {nameStatus === "unique" && (
                  <div className="flex items-center gap-2 text-green-600">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm">
                      Great! This name is available.
                    </span>
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* PayPal Onboarding Button */}
            <motion.div className="flex justify-center pt-2" variants={fadeIn}>
              <PayPalOnboardingButton
                name={name}
                disabled={!name || nameStatus !== "unique" || isLoading}
                onSuccess={handleOnboardingSuccess}
                onError={handleOnboardingError}
                onCancel={handleOnboardingCancel}
              />
            </motion.div>
          </motion.div>

          {/* Status Messages */}
          <AnimatePresence>
            {onboardingStatus && (
              <motion.div
                className="p-3 mb-6 text-center text-green-800 bg-green-50 rounded-lg border border-green-200"
                {...fadeIn}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    {onboardingStatus}
                  </span>
                </div>
              </motion.div>
            )}
            {error && (
              <motion.div
                className="p-3 mb-6 text-center text-red-800 bg-red-50 rounded-lg border border-red-200"
                {...fadeIn}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </motion.div>
            )}
            {isLoading && (
              <motion.div
                className="p-3 mb-6 text-center text-blue-800 bg-blue-50 rounded-lg border border-blue-200"
                {...fadeIn}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-800 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                  <span className="text-sm font-medium">
                    Loading accounts...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Account List */}
          <motion.div
            className="mt-8"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Your Accounts
              </h2>
              <motion.button
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                onClick={fetchAccounts}
                disabled={isLoading}
                whileTap={{ scale: 0.95 }}
                variants={fadeIn}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </motion.button>
            </div>
            <div className="overflow-x-auto">
              <motion.table
                className="min-w-full rounded border"
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Merchant ID</th>
                    <th className="px-4 py-2">Tracking ID</th>
                    <th className="px-4 py-2">Provider</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <AnimatePresence>
                  <tbody>
                    {accounts.length === 0 ? (
                      <motion.tr key="empty" {...fadeIn}>
                        <td colSpan={5} className="py-4 text-center">
                          No accounts onboarded yet.
                        </td>
                      </motion.tr>
                    ) : (
                      accounts.map((acc, idx) => (
                        <motion.tr
                          key={acc.Id ? acc.Id : `row-${idx}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            transition: { delay: idx * 0.05 },
                          }}
                          exit={{ opacity: 0, y: 20 }}
                          whileHover={{
                            scale: 1.02,
                            backgroundColor: "#f0f9ff",
                          }}
                          className="border-t"
                        >
                          <td className="px-4 py-2 font-semibold">
                            {acc.Name}
                          </td>
                          <td className="px-4 py-2">{acc.Merchant_ID__c}</td>
                          <td className="px-4 py-2">
                            {acc.Merchant_Tracking_ID__c}
                          </td>
                          <td className="px-4 py-2">
                            {acc.Payment_Provider__c}
                          </td>
                          <td className="px-4 py-2">{acc.Status__c}</td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </AnimatePresence>
              </motion.table>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </PayPalScriptProvider>
  );
}

export default Onboard;
