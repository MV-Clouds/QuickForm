import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaInfoCircle, FaPlus, FaSpinner } from "react-icons/fa";
import MerchantOnboardingModal from "../MerchantOnboardingModal";
import {
  fetchOnboardedAccounts,
  fetchMerchantCapabilities,
  setUserContext,
} from "../paypal/api/paypalApi";

/**
 * MerchantAccountSelector Component
 *
 * Provides merchant account selection functionality for PayPal payment fields
 * Following patterns from Main1.js for consistency with existing PayPal integration
 */

const MerchantAccountSelector = ({
  selectedMerchantId,
  onMerchantChange,
  onAddNewAccount,
  onCapabilitiesChange,
  disabled = false,
  className = "",
  userId = null, // Optional: can be passed from parent component
  formId = null, // Optional: can be passed from parent component
  isEditable = true
}) => {
  // State management following Main1.js patterns
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noAccountsWarning, setNoAccountsWarning] = useState("");
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [capabilitiesError, setCapabilitiesError] = useState("");
  const lastFetchedMerchantRef = useRef(null);

  // Fetch capabilities function - memoized to prevent unnecessary re-renders
  const fetchCapabilities = useCallback(async (merchantId) => {
    if (!merchantId) return;

    // Prevent duplicate calls for the same merchant
    if (merchantId === lastFetchedMerchantRef.current && capabilities) {
      console.log(
        "🔍 MerchantAccountSelector: Skipping duplicate capabilities fetch for:",
        merchantId
      );
      return;
    }

    console.log(
      "🔍 MerchantAccountSelector: fetchCapabilities called for:",
      merchantId,
      "at",
      new Date().toISOString()
    );

    setCapabilitiesLoading(true);
    setCapabilitiesError("");
    try {
      console.log("🔍 Fetching capabilities for merchant:", merchantId);
      const result = await fetchMerchantCapabilities(merchantId);
      console.log("🔍 Capabilities result:", result);

      if (result.success) {
        const capabilities = result.capabilities || {};
        console.log("🔍 Processed capabilities:", capabilities);
        setCapabilities(capabilities);
        lastFetchedMerchantRef.current = merchantId; // Update ref on successful fetch
      } else {
        throw new Error(result.error || "Failed to fetch capabilities");
      }
    } catch (err) {
      console.error("❌ Error fetching capabilities:", err);
      setCapabilitiesError(err.message);
      // Clear capabilities on error to force refresh
      setCapabilities(null);
    } finally {
      setCapabilitiesLoading(false);
    }
  }, []); // Empty dependencies to prevent infinite loops

  // Fetch onboarded accounts following Main1.js fetchOnboardedAccount pattern
  const fetchOnboardedAccount = useCallback(async () => {
    setLoading(true);
    setError("");
    setNoAccountsWarning("");

    try {
      const result = await fetchOnboardedAccounts();
      console.log(
        "🔍 MerchantAccountSelector - fetchOnboardedAccount result:",
        result
      );

      if (result.success) {
        setAccounts(result.accounts);
        if (result.hasAccounts) {
          // Auto-select first account (Salesforce record Id) if none selected
          // Only auto-select if no merchant is currently selected
          if (!selectedMerchantId && result.accounts?.length > 0) {
            const firstAccountId = result.accounts[0].Id;
            console.log(
              "🎯 Auto-selecting first merchant account:",
              firstAccountId
            );
            onMerchantChange(firstAccountId);
            // Also fetch capabilities using the PayPal merchant id from the account
            const firstPaypalMerchantId = result.accounts[0].Merchant_ID__c;
            if (firstPaypalMerchantId) {
              fetchCapabilities(firstPaypalMerchantId);
            }
          } else if (selectedMerchantId) {
            console.log(
              "🎯 Merchant already selected, skipping auto-selection:",
              selectedMerchantId
            );
            // If merchant is already selected, just fetch capabilities for the selected one
            const selectedAccount = result.accounts?.find(
              (acc) => acc.Id === selectedMerchantId
            );
            if (selectedAccount) {
              fetchCapabilities(selectedAccount.Merchant_ID__c);
            }
          }
          setNoAccountsWarning("");
        } else {
          setNoAccountsWarning(
            "No merchant accounts found. Please onboard a merchant to continue."
          );
        }
      } else {
        console.error("Fetch accounts error:", result.error);
        setError("Failed to load merchant accounts.");
        setNoAccountsWarning(
          "Failed to load merchant accounts. Please try again."
        );
      }
    } catch (err) {
      console.error("Fetch accounts error:", err);
      setError("Failed to load merchant accounts.");
      setNoAccountsWarning(
        "Failed to load merchant accounts. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [fetchCapabilities, selectedMerchantId]);

  // Set user context if provided
  useEffect(() => {
    if (userId || formId) {
      setUserContext(userId, formId);
      console.log("🔍 MerchantAccountSelector: User context set", {
        userId,
        formId,
      });
    }
  }, [userId, formId]);

  // Load accounts on component mount
  useEffect(() => {
    fetchOnboardedAccount();
  }, [fetchOnboardedAccount]);

  // Fetch capabilities when selected account (Salesforce Id) changes
  useEffect(() => {
    if (
      selectedMerchantId &&
      selectedMerchantId !== lastFetchedMerchantRef.current &&
      accounts.length > 0 // Only proceed if accounts are loaded
    ) {
      console.log(
        "🔍 MerchantAccountSelector: selected account changed, fetching capabilities:",
        selectedMerchantId,
        "Previous:",
        lastFetchedMerchantRef.current
      );
      // Map selected account Id to PayPal merchant id for capability fetch
      const selected = accounts.find((acc) => acc.Id === selectedMerchantId);
      const paypalMerchantId = selected?.Merchant_ID__c;
      if (paypalMerchantId) {
        fetchCapabilities(paypalMerchantId);
      }
    } else if (selectedMerchantId === lastFetchedMerchantRef.current) {
      console.log(
        "🔍 MerchantAccountSelector: Skipping capabilities fetch - same account:",
        selectedMerchantId
      );
    }
  }, [selectedMerchantId, accounts, fetchCapabilities]);

  // Handle merchant change and fetch capabilities
  const handleMerchantChange = (accountId) => {
    // Persist Salesforce record Id upward
    onMerchantChange(accountId);
    // For capabilities, look up PayPal merchant id from the account record
    if (accountId) {
      const selected = accounts.find((acc) => acc.Id === accountId);
      const paypalMerchantId = selected?.Merchant_ID__c;
      if (paypalMerchantId) {
        fetchCapabilities(paypalMerchantId);
      } else {
        setCapabilities(null);
      }
    } else {
      setCapabilities(null);
    }
  };

  // Retry button
  const handleRetryCapabilities = () => {
    if (selectedMerchantId) {
      const selected = accounts.find((acc) => acc.Id === selectedMerchantId);
      const paypalMerchantId = selected?.Merchant_ID__c;
      if (paypalMerchantId) {
        fetchCapabilities(paypalMerchantId);
      }
    }
  };

  // Handle retry button click
  const handleRetry = () => {
    fetchOnboardedAccount();
  };

  // Effect to call onCapabilitiesChange when capabilities state updates
  useEffect(() => {
    if (onCapabilitiesChange) {
      onCapabilitiesChange(capabilities);
    }
  }, [capabilities]);

  return (
    <div className={`merchant-account-selector ${className}`}>
      {/* Account Selection Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            PayPal Merchant Account
          </label>
          <button
            type="button"
            disabled={!isEditable}
            onClick={() => setShowOnboardingModal(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            title="Add new PayPal merchant account"
          >
            <FaPlus size={10} />
            Add Account
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <FaSpinner className="animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">
              Loading merchant accounts...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <FaInfoCircle className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-1 text-xs text-red-600 hover:text-red-700 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Accounts Warning */}
        {noAccountsWarning && !loading && !error && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <FaInfoCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-yellow-700">{noAccountsWarning}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={onAddNewAccount}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    <FaPlus size={10} />
                    Add Merchant Account
                  </button>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Dropdown - Following Main1.js pattern */}
        {accounts?.length > 0 && !loading && (
          <select
            value={selectedMerchantId || ""}
            onChange={(e) => handleMerchantChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={disabled || accounts?.length === 0 || !isEditable}
          >
            <option value="">Select a merchant account</option>
            {accounts.map((acc) => (
              <option key={acc.Id} value={acc.Id}>
                {acc.Name} ({acc.Merchant_ID__c})
              </option>
            ))}
          </select>
        )}

        {/* Selected Account Info */}
        {selectedMerchantId && accounts?.length > 0 && !loading && (
          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
            {(() => {
              const selectedAccount = accounts.find(
                (acc) => acc.Id === selectedMerchantId
              );
              if (!selectedAccount) return null;

              return (
                <div className="text-xs text-gray-600">
                  <div>
                    <strong>Account:</strong> {selectedAccount.Name}
                  </div>
                  <div>
                    <strong>Merchant ID:</strong>{" "}
                    {selectedAccount.Merchant_ID__c}
                  </div>
                  <div>
                    <strong>Status:</strong>
                    <span
                      className={`ml-1 ${
                        selectedAccount.Status__c === "Active"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedAccount.Status__c}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Capabilities Display */}
      {selectedMerchantId && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Account Capabilities
            </label>
            {capabilitiesError && (
              <button
                onClick={handleRetryCapabilities}
                className="text-xs text-blue-600 hover:underline"
              >
                Retry
              </button>
            )}
          </div>
          {capabilitiesLoading ? (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FaSpinner className="animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">
                Loading capabilities...
              </span>
            </div>
          ) : capabilitiesError ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <FaInfoCircle className="text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{capabilitiesError}</p>
                </div>
              </div>
            </div>
          ) : capabilities ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <p>
                Subscriptions:{" "}
                {capabilities.subscriptions ? "Enabled" : "Disabled"}
              </p>
              <p>
                Donations: {capabilities.donations ? "Enabled" : "Disabled"}
              </p>
              <p>Venmo: {capabilities.venmo ? "Enabled" : "Disabled"}</p>
              <p>
                Google Pay: {capabilities.googlePay ? "Enabled" : "Disabled"}
              </p>
              <p>Cards: {capabilities.cards ? "Enabled" : "Disabled"}</p>
              <p>Pay Later: {capabilities.payLater ? "Enabled" : "Disabled"}</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Merchant Onboarding Modal */}
      <MerchantOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onSuccess={(result) => {
          console.log("Merchant onboarding successful:", result);
          fetchOnboardedAccount(); // Refresh accounts list
        }}
        provider="paypal"
        isEditable = {isEditable}
      />

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <FaInfoCircle className="inline mr-1" />
        Select the PayPal merchant account to use for processing payments. You
        can add new accounts or manage existing ones through the onboarding
        process.
      </div>
    </div>
  );
};

export default MerchantAccountSelector;
