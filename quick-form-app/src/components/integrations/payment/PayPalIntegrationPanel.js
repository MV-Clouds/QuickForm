import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus } from "react-icons/fa";
import { API_ENDPOINTS } from "../../../config";
import MerchantOnboardingModal from "../../form-builder-with-versions/payment-fields/MerchantOnboardingModal";

/**
 * PayPalIntegrationPanel
 * - Fetches and lists connected PayPal merchant accounts from Salesforce
 * - Provides CTA to start onboarding (Connect or Add new account type)
 * - Meant to be embedded inside Integrations.js selected app area
 */
export default function PayPalIntegrationPanel({
  onClose,
  setConnectedApps,
  allApps,
  onAccountsChange,
  reloadSignal,
}) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  // This panel is display-only; parent handles connect/onboard actions.

  const listAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(API_ENDPOINTS.UNIFIED_PAYMENT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-accounts" }),
      });
      const data = await resp.json();
      if (!resp.ok || data.success === false) {
        throw new Error(
          data.error || `Failed to load PayPal accounts (${resp.status})`
        );
      }
      const list = data?.data?.accounts || [];
      setAccounts(list);
      if (onAccountsChange) onAccountsChange(list);
      if (list.length > 0 && setConnectedApps) {
        setConnectedApps((prev) => {
          const exists = prev?.some((a) => a.id === "paypal");
          return exists
            ? prev
            : [
                ...prev,
                {
                  ...allApps.find((a) => a.id === "paypal"),
                  description: "Connected to your PayPal account.",
                },
              ];
        });
      }
    } catch (e) {
      setError(e.message || "Unable to load PayPal accounts");
    } finally {
      setLoading(false);
    }
  }, [setConnectedApps, allApps, onAccountsChange]);

  useEffect(() => {
    listAccounts();
  }, [listAccounts]);
  // Refetch when parent signals reload (e.g., after onboarding popup closes)
  useEffect(() => {
    if (reloadSignal !== undefined) {
      listAccounts();
    }
  }, [reloadSignal, listAccounts]);

  // Handle successful merchant onboarding
  const handleOnboardingSuccess = useCallback(
    (result) => {
      console.log("Merchant onboarding successful:", result);
      setShowOnboardingModal(false);
      // Refresh the accounts list
      listAccounts();
    },
    [listAccounts]
  );

  return (
    <>
      <div className="flex item-center justify-center mt-2">
        <div className="w-[42%] ">
          {error && (
            <div className="text-center text-red-600 text-sm mb-3">{error}</div>
          )}
          {loading ? (
            <motion.div
              className="bg-white rounded-lg shadow border px-4 py-4"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
              <div className="space-y-2">
                <div className="h-10 bg-gray-100 rounded" />
                <div className="h-10 bg-gray-100 rounded" />
              </div>
            </motion.div>
          ) : accounts.length === 0 ? (
            <div className="text-center text-gray-600 bg-white border rounded-lg shadow px-4 py-6">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-[#003087] to-[#009cde] text-white font-bold">
                  P
                </div>
              </div>
              <div className="text-base font-medium">
                No PayPal accounts connected yet.
              </div>
              <div className="text-xs text-gray-500 mt-1 mb-4">
                Connect your PayPal merchant account to start accepting
                payments.
              </div>
              <button
                onClick={() => setShowOnboardingModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#003087] to-[#009cde] rounded-lg hover:opacity-90 transition-opacity"
              >
                <FaPlus size={12} />
                Add PayPal Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header with Add New Account button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Connected PayPal Accounts
                  </h3>
                  <p className="text-xs text-gray-500">
                    {accounts.length} account{accounts.length !== 1 ? "s" : ""}{" "}
                    connected
                  </p>
                </div>
                <button
                  onClick={() => setShowOnboardingModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[#003087] to-[#009cde] rounded-md hover:opacity-90 transition-opacity"
                >
                  <FaPlus size={10} />
                  Add New Account
                </button>
              </div>

              {/* Accounts List */}
              <motion.div
                layout
                initial="false"
                className="flex flex-col gap-3"
              >
                <AnimatePresence>
                  {accounts.map((acc) => (
                    <motion.div
                      key={acc.Id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center bg-white rounded-lg shadow border px-4 py-3 gap-4"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#003087] to-[#009cde] text-white font-bold text-lg">
                        P
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="font-medium text-gray-900">
                          {acc.Name || "PayPal Account"}
                        </span>
                        <span className="text-xs text-gray-500 break-all">
                          Merchant ID: {acc.Merchant_ID__c || "-"}
                        </span>
                      </div>
                      <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {acc.Status__c || "Unknown"}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Merchant Onboarding Modal */}
      <MerchantOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onSuccess={handleOnboardingSuccess}
        provider="paypal"
      />
    </>
  );
}
