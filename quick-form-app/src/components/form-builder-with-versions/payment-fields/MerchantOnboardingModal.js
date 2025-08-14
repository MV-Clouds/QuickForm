import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTimes,
  FaSpinner,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  generateOnboardingUrl,
  storeOnboarding,
  checkNameAvailability,
} from "./paypal/api/paypalApi";

/**
 * MerchantOnboardingModal Component
 *
 * Professional modal for PayPal merchant onboarding with:
 * - Proper modal backdrop and close functionality
 * - Name existence checking
 * - PayPal-only merchant onboarding
 * - Loading states and error handling
 */
const MerchantOnboardingModal = ({
  isOpen,
  onClose,
  onSuccess,
  provider = "paypal", // Only PayPal for now
}) => {
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState(""); // '', 'checking', 'exists', 'unique'
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const popupRef = useRef(null);
  const intervalRef = useRef(null);
  const nameCheckTimeoutRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setNameStatus("");
      setIsProcessing(false);
      setError("");
      setSuccess("");
    } else {
      // Cleanup when modal closes
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    }
  }, [isOpen]);

  // Debounced name checking
  const checkName = async (inputName) => {
    if (!inputName.trim()) {
      setNameStatus("");
      return;
    }

    setNameStatus("checking");
    setError("");

    try {
      const result = await checkNameAvailability(inputName.trim());

      if (result.success) {
        setNameStatus(result.exists ? "exists" : "unique");
      } else {
        setNameStatus("");
        setError("Could not check name availability");
      }
    } catch (error) {
      setNameStatus("");
      setError("Error checking name availability");
    }
  };

  // Handle name input change with debounced checking
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    setNameStatus("");
    setError("");
    setSuccess("");

    // Clear previous timeout
    if (nameCheckTimeoutRef.current) {
      clearTimeout(nameCheckTimeoutRef.current);
    }

    // Set new timeout for name checking
    if (newName.trim()) {
      nameCheckTimeoutRef.current = setTimeout(() => {
        checkName(newName);
      }, 500);
    }
  };

  // Handle PayPal onboarding
  const handleOnboarding = async () => {
    if (!name.trim() || nameStatus !== "unique" || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");

    try {
      // Generate onboarding URL
      const urlResult = await generateOnboardingUrl(
        window.location.origin + "/onboarding-callback"
      );

      if (!urlResult.success || !urlResult.onboardingUrl) {
        throw new Error("Failed to generate onboarding URL");
      }

      // Open PayPal onboarding popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;

      popupRef.current = window.open(
        urlResult.onboardingUrl,
        "paypal_onboarding",
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,resizable=yes,scrollbars=yes`
      );

      // Monitor popup for completion
      intervalRef.current = setInterval(() => {
        if (!popupRef.current || popupRef.current.closed) {
          clearInterval(intervalRef.current);
          setIsProcessing(false);
          setError("Onboarding was cancelled or window was closed");
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

            if (
              merchantIdInPayPal &&
              accountStatus === "BUSINESS_ACCOUNT" &&
              merchantId
            ) {
              // Store onboarding data
              handleStoreOnboarding(
                name.trim(),
                merchantId,
                merchantIdInPayPal
              );
            } else {
              setIsProcessing(false);
              setError("Invalid onboarding data received from PayPal");
            }
          }
        } catch (e) {
          // Ignore cross-origin errors until redirected to our domain
        }
      }, 500);
    } catch (error) {
      setIsProcessing(false);
      setError(error.message || "Failed to start onboarding process");
    }
  };

  // Store onboarding data
  const handleStoreOnboarding = async (
    name,
    merchantId,
    merchantIdInPayPal
  ) => {
    try {
      const result = await storeOnboarding({
        name,
        merchantId,
        merchantIdInPayPal,
        paymentProvider: "PayPal",
        status: "Active",
      });

      setIsProcessing(false);

      if (result.success) {
        setSuccess("PayPal merchant account connected successfully!");
        setTimeout(() => {
          onSuccess?.(result);
          onClose();
        }, 2000);
      } else {
        setError(result.error || "Failed to save merchant account");
      }
    } catch (error) {
      setIsProcessing(false);
      setError("Error saving merchant account information");
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (isProcessing) {
      // Don't allow closing while processing
      return;
    }
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen && !isProcessing) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      if (nameCheckTimeoutRef.current) {
        clearTimeout(nameCheckTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black bg-opacity-50" />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md bg-white rounded-lg shadow-xl"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.65 3.85-3.197 5.341-6.965 5.341h-2.312c-.228 0-.42.15-.472.374l-.718 4.54-.206 1.308-.144.911a.641.641 0 0 0 .633.74h3.94c.524 0 .968-.382 1.05-.9l.048-.302.718-4.54.048-.302c.082-.518.526-.9 1.05-.9h.662c3.606 0 6.426-1.462 7.25-5.69.343-1.77.133-3.253-.933-4.119z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Connect PayPal Account
                </h3>
                <p className="text-sm text-gray-600">
                  Add a new PayPal merchant account
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaTimes size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Account Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter a unique name for this account"
                maxLength={50}
              />

              {/* Name Status */}
              <div className="mt-2 min-h-[20px]">
                {nameStatus === "checking" && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <FaSpinner className="animate-spin" size={12} />
                    <span className="text-xs">Checking availability...</span>
                  </div>
                )}
                {nameStatus === "exists" && (
                  <div className="flex items-center gap-2 text-red-600">
                    <FaExclamationTriangle size={12} />
                    <span className="text-xs">
                      This name already exists. Please choose another.
                    </span>
                  </div>
                )}
                {nameStatus === "unique" && (
                  <div className="flex items-center gap-2 text-green-600">
                    <FaCheck size={12} />
                    <span className="text-xs">
                      Great! This name is available.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <FaExclamationTriangle size={16} />
                  <span className="text-sm font-medium">Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <FaCheck size={16} />
                  <span className="text-sm font-medium">Success</span>
                </div>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                What happens next?
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>
                  • You'll be redirected to PayPal to connect your account
                </li>
                <li>• Complete the PayPal onboarding process</li>
                <li>• Your account will be available for payment processing</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleOnboarding}
              disabled={!name.trim() || nameStatus !== "unique" || isProcessing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="animate-spin" size={14} />
                  Processing...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.65 3.85-3.197 5.341-6.965 5.341h-2.312c-.228 0-.42.15-.472.374l-.718 4.54-.206 1.308-.144.911a.641.641 0 0 0 .633.74h3.94c.524 0 .968-.382 1.05-.9l.048-.302.718-4.54.048-.302c.082-.518.526-.9 1.05-.9h.662c3.606 0 6.426-1.462 7.25-5.69.343-1.77.133-3.253-.933-4.119z" />
                  </svg>
                  Connect with PayPal
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MerchantOnboardingModal;
