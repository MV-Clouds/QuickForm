import React, { useEffect, useState, useRef } from "react";
import { PAYPAL_DONATE_CONFIG, API_ENDPOINTS } from "../../../../config";

/**
 * PayPal Donate Button Component
 * Implements the official PayPal Donate SDK for proper donation handling
 *
 * @param {Object} props - Component props
 * @param {string} props.merchantId - Merchant ID for the donation
 * @param {string} props.environment - 'sandbox' or 'production'
 * @param {string} props.hostedButtonId - PayPal hosted button ID (for business accounts)
 * @param {string} props.business - Business email/PayerID (for personal accounts)
 * @param {string} props.itemName - Name/description of the donation purpose
 * @param {string} props.itemNumber - Unique identifier for the donation
 * @param {string} props.customMessage - Custom message for the donation
 * @param {Function} props.onComplete - Callback when donation is completed
 * @param {Function} props.onError - Callback when donation fails
 * @param {Object} props.buttonImage - Custom button image configuration
 * @param {string} props.customImageUrl - Custom image URL for the donate button
 * @param {string} props.containerId - Custom container ID (optional)
 */
const PayPalDonateButton = ({
  merchantId,
  environment = "sandbox",
  hostedButtonId,
  business,
  itemName = "General Donation",
  itemNumber,
  customMessage,
  onComplete,
  onError,
  buttonImage,
  customImageUrl,
  containerId,
  className = "",
}) => {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [donationStatus, setDonationStatus] = useState("");
  const containerRef = useRef(null);
  const buttonRendered = useRef(false);

  // Generate unique container ID if not provided
  const uniqueContainerId =
    containerId ||
    `paypal-donate-container-${Math.random().toString(36).substr(2, 9)}`;

  // Load PayPal Donate SDK
  useEffect(() => {
    const loadPayPalDonateSDK = () => {
      // Check if SDK is already loaded
      if (window.PayPal && window.PayPal.Donation) {
        console.log("✅ PayPal Donate SDK already loaded");
        setIsSDKLoaded(true);
        setIsLoading(false);
        return;
      }

      // Check if script is already being loaded
      if (
        document.querySelector(`script[src="${PAYPAL_DONATE_CONFIG.SDK_URL}"]`)
      ) {
        console.log("⏳ PayPal Donate SDK script already loading...");
        return;
      }

      console.log("🚀 Loading PayPal Donate SDK...");
      const script = document.createElement("script");
      script.src = PAYPAL_DONATE_CONFIG.SDK_URL;
      script.charset = "UTF-8";
      script.async = true;

      script.onload = () => {
        console.log("✅ PayPal Donate SDK loaded successfully");
        setIsSDKLoaded(true);
        setIsLoading(false);
        setError(null);
      };

      script.onerror = (err) => {
        console.error("❌ Failed to load PayPal Donate SDK:", err);
        setError("Failed to load PayPal Donate SDK");
        setIsLoading(false);
        if (onError) {
          onError(new Error("Failed to load PayPal Donate SDK"));
        }
      };

      document.body.appendChild(script);
    };

    loadPayPalDonateSDK();
  }, [onError]);

  // Render donate button when SDK is loaded
  useEffect(() => {
    if (!isSDKLoaded || buttonRendered.current || !containerRef.current) {
      return;
    }

    try {
      console.log("🎯 Rendering PayPal Donate Button...", {
        merchantId,
        environment,
        hostedButtonId,
        business,
        itemName,
        itemNumber,
      });

      // Get button configuration based on merchant and environment
      const buttonConfig = getButtonConfig();

      if (!buttonConfig.hosted_button_id && !buttonConfig.business) {
        throw new Error("Missing hosted_button_id or business parameter");
      }

      // Configure the donate button
      const donateButtonConfig = {
        env: environment,
        ...buttonConfig,
        image: getButtonImageConfig(),
        onComplete: handleDonationComplete,
        onError: handleDonationError,
      };

      // Add optional parameters if provided
      if (itemName) donateButtonConfig.item_name = itemName;
      if (itemNumber) donateButtonConfig.item_number = itemNumber;
      if (customMessage) donateButtonConfig.custom = customMessage;

      console.log("🔧 Donate button configuration:", donateButtonConfig);

      // Render the button
      window.PayPal.Donation.Button(donateButtonConfig).render(
        `#${uniqueContainerId}`
      );

      buttonRendered.current = true;
      console.log("✅ PayPal Donate Button rendered successfully");
    } catch (err) {
      console.error("❌ Error rendering PayPal Donate Button:", err);
      setError(`Failed to render donate button: ${err.message}`);
      if (onError) {
        onError(err);
      }
    }
  }, [
    isSDKLoaded,
    merchantId,
    environment,
    hostedButtonId,
    business,
    itemName,
    itemNumber,
    customMessage,
    buttonImage,
  ]);

  // Get button configuration based on provided parameters
  const getButtonConfig = () => {
    const config = {};

    // Use provided hostedButtonId or business (required)
    if (hostedButtonId) {
      config.hosted_button_id = hostedButtonId;
    } else if (business) {
      config.business = business;
    } else {
      throw new Error(
        "Either hostedButtonId or business parameter is required for PayPal Donate Button"
      );
    }

    return config;
  };

  // Get button image configuration
  const getButtonImageConfig = () => {
    // If custom image URL is provided and valid, use it
    if (customImageUrl && customImageUrl.trim()) {
      console.log("🖼️ Using custom donate button image:", customImageUrl);
      return {
        src: customImageUrl,
        title: "Donate with PayPal",
        alt: "Donate with PayPal button",
      };
    }

    // If buttonImage prop is provided, use it
    if (buttonImage) {
      console.log("🖼️ Using provided buttonImage configuration");
      return buttonImage;
    }

    // Use PayPal's default donate button
    console.log("🖼️ Using PayPal's default donate button image");
    return PAYPAL_DONATE_CONFIG.DEFAULT_BUTTON_IMAGE;
  };

  // Handle successful donation completion
  const handleDonationComplete = async (params) => {
    try {
      console.log("🎉 Donation completed successfully!", params);
      setDonationStatus("completed");

      // Detect if this is a recurring donation (subscription ID starts with "I-")
      const isRecurring = params.tx && params.tx.startsWith("I-");

      console.log("🔍 Donation type detection:", {
        transactionId: params.tx,
        isRecurring: isRecurring,
        status: params.st,
      });

      // Extract donation details from PayPal response
      const donationData = {
        transactionId: params.tx,
        status: params.st,
        amount: params.amt,
        currencyCode: params.cc,
        customMessage: params.cm,
        itemNumber: params.item_number,
        itemName: params.item_name,
        merchantId,
        environment,
        timestamp: new Date().toISOString(),
        isRecurring: isRecurring,
        donationType: isRecurring ? "recurring" : "one-time",
      };

      console.log("📊 Donation data:", donationData);

      // Send donation data to backend for processing
      try {
        const response = await fetch(API_ENDPOINTS.PAYMENT_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "handle-donation-complete",
            ...donationData,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log("✅ Donation processed successfully:", result);
          setDonationStatus("processed");
        } else {
          console.error("❌ Failed to process donation:", result);
          setDonationStatus("processing_failed");
        }
      } catch (backendError) {
        console.error("❌ Error communicating with backend:", backendError);
        setDonationStatus("processing_failed");
      }

      // Call user-provided onComplete callback
      if (onComplete) {
        onComplete(donationData);
      }
    } catch (err) {
      console.error("❌ Error handling donation completion:", err);
      setDonationStatus("error");
      if (onError) {
        onError(err);
      }
    }
  };

  // Handle donation errors
  const handleDonationError = (err) => {
    console.error("❌ Donation error:", err);
    setDonationStatus("error");
    setError("Donation failed. Please try again.");

    if (onError) {
      onError(err);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={`paypal-donate-loading ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-gray-600">Loading PayPal Donate Button...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div
        className={`paypal-donate-error ${className}`}
        style={{ height: "24px", width: "24px" }}
      >
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Donation Button Error
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`paypal-donate-button ${className}`}>
      {/* Donation Status Display */}
      {donationStatus && (
        <div
          className={`mb-4 p-3 rounded-md ${
            donationStatus === "completed" || donationStatus === "processed"
              ? "bg-green-50 border border-green-200"
              : donationStatus === "error" ||
                donationStatus === "processing_failed"
              ? "bg-red-50 border border-red-200"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {(donationStatus === "completed" ||
                donationStatus === "processed") && (
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {(donationStatus === "error" ||
                donationStatus === "processing_failed") && (
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  donationStatus === "completed" ||
                  donationStatus === "processed"
                    ? "text-green-800"
                    : donationStatus === "error" ||
                      donationStatus === "processing_failed"
                    ? "text-red-800"
                    : "text-blue-800"
                }`}
              >
                {donationStatus === "completed" &&
                  "Thank you! Your donation was completed successfully."}
                {donationStatus === "processed" &&
                  "Your donation has been processed and a receipt will be sent to you."}
                {donationStatus === "processing_failed" &&
                  "Donation completed but receipt processing failed. Please contact support."}
                {donationStatus === "error" &&
                  "Donation failed. Please try again or contact support."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PayPal Donate Button Container */}
      <div
        id={uniqueContainerId}
        ref={containerRef}
        className="paypal-donate-button-container"
      />

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs">
          <h4 className="font-medium text-gray-700 mb-2">Debug Info:</h4>
          <div className="space-y-1 text-gray-600">
            <div>Environment: {environment}</div>
            <div>Merchant ID: {merchantId}</div>
            <div>Container ID: {uniqueContainerId}</div>
            <div>SDK Loaded: {isSDKLoaded ? "✅" : "❌"}</div>
            <div>Button Rendered: {buttonRendered.current ? "✅" : "❌"}</div>
            {donationStatus && <div>Status: {donationStatus}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayPalDonateButton;
