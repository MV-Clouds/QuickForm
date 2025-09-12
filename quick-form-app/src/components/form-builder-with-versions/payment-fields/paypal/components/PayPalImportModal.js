import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaSpinner,
  FaCheckSquare,
  FaSquare,
  FaDownload,
  FaInfoCircle,
} from "react-icons/fa";
import { fetchPaypalSubscriptions } from "../api/paypalApi";

/**
 * PayPalImportModal Component
 *
 * Modal for importing existing PayPal subscriptions with multi-select functionality
 * Shows all existing PayPal subscriptions with checkboxes for selection
 */
const PayPalImportModal = ({
  isOpen,
  onClose,
  onImport,
  selectedMerchantId,
  existingSubscriptions = [],
}) => {
  const [paypalSubscriptions, setPaypalSubscriptions] = useState([]);
  const [selectedPlans, setSelectedPlans] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  // Fetch PayPal subscriptions when modal opens
  useEffect(() => {
    if (isOpen && selectedMerchantId) {
      fetchPayPalSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedMerchantId]);

  const fetchPayPalSubscriptions = async () => {
    setLoading(true);
    setError("");

    try {
      console.log(
        "🔄 Fetching PayPal subscriptions for merchant:",
        selectedMerchantId
      );

      const {
        success,
        subscriptions = [],
        error: apiError,
      } = await fetchPaypalSubscriptions(selectedMerchantId);

      if (!success) {
        throw new Error(apiError || "Failed to fetch PayPal subscriptions");
      }

      // Filter out subscriptions that are already imported
      const existingPlanIds = new Set(
        existingSubscriptions.map((sub) => sub.planId).filter(Boolean)
      );

      const availableSubscriptions = subscriptions.filter(
        (sub) => !existingPlanIds.has(sub.id)
      );

      setPaypalSubscriptions(availableSubscriptions);
      console.log("✅ Fetched PayPal subscriptions:", availableSubscriptions);
    } catch (error) {
      console.error("❌ Error fetching PayPal subscriptions:", error);
      setError(error.message || "Failed to fetch PayPal subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedPlans.size === paypalSubscriptions.length) {
      // Deselect all
      setSelectedPlans(new Set());
    } else {
      // Select all
      setSelectedPlans(new Set(paypalSubscriptions.map((sub) => sub.id)));
    }
  };

  const handleSelectPlan = (planId) => {
    const newSelected = new Set(selectedPlans);
    if (newSelected.has(planId)) {
      newSelected.delete(planId);
    } else {
      newSelected.add(planId);
    }
    setSelectedPlans(newSelected);
  };

  const handleImport = async () => {
    if (selectedPlans.size === 0) {
      setError("Please select at least one subscription to import");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const selectedSubscriptions = paypalSubscriptions.filter((sub) =>
        selectedPlans.has(sub.id)
      );

      // Convert PayPal subscriptions to our format
      const importedSubscriptions = selectedSubscriptions.map((paypalSub) => ({
        id: `imported-${paypalSub.id}-${Date.now()}`,
        name: paypalSub.name,
        description: paypalSub.description || "",
        planId: paypalSub.id,
        status: paypalSub.status?.toLowerCase() || "active",
        source: "paypal_import",
        isExisting: true,
        planData: {
          id: paypalSub.id,
          name: paypalSub.name,
          description: paypalSub.description || "",
          status: paypalSub.status,
          billing_cycles: paypalSub.billing_cycles || [],
          payment_preferences: paypalSub.payment_preferences || {},
          taxes: paypalSub.taxes || { percentage: "0", inclusive: false },
          create_time: paypalSub.create_time,
          update_time: paypalSub.update_time,
        },
        importedAt: new Date().toISOString(),
      }));

      console.log("📥 Importing subscriptions:", importedSubscriptions);

      onImport(importedSubscriptions);
    } catch (error) {
      console.error("❌ Error importing subscriptions:", error);
      setError(error.message || "Failed to import subscriptions");
    } finally {
      setImporting(false);
    }
  };

  const formatPrice = (subscription) => {
    const billingCycle = subscription.billing_cycles?.[0];
    if (!billingCycle) return "N/A";

    const price = billingCycle.pricing_scheme?.fixed_price?.value || "0.00";
    const currency =
      billingCycle.pricing_scheme?.fixed_price?.currency_code || "USD";
    const interval =
      billingCycle.frequency?.interval_unit?.toLowerCase() || "month";
    const count = billingCycle.frequency?.interval_count || 1;

    return `${currency} ${price}/${count > 1 ? count : ""}${interval}${
      count > 1 ? "s" : ""
    }`;
  };

  const formatFrequency = (subscription) => {
    const billingCycle = subscription.billing_cycles?.[0];
    if (!billingCycle) return "N/A";

    const interval =
      billingCycle.frequency?.interval_unit?.toLowerCase() || "month";
    const count = billingCycle.frequency?.interval_count || 1;

    return count > 1 ? `Every ${count} ${interval}s` : `Every ${interval}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Import PayPal Subscriptions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Select existing PayPal subscriptions to import into your form
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin mr-2" />
              <span>Loading PayPal subscriptions...</span>
            </div>
          ) : paypalSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaInfoCircle className="mx-auto mb-4 text-4xl" />
              <p className="mb-2">
                No PayPal subscriptions available to import.
              </p>
              <p className="text-sm">
                All existing PayPal subscriptions may already be imported, or
                none exist for this merchant account.
              </p>
            </div>
          ) : (
            <>
              {/* Select All Header */}
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {selectedPlans.size === paypalSubscriptions.length ? (
                      <FaCheckSquare size={16} />
                    ) : (
                      <FaSquare size={16} />
                    )}
                    <span className="font-medium">
                      {selectedPlans.size === paypalSubscriptions.length
                        ? "Deselect All"
                        : "Select All"}
                    </span>
                  </button>
                </div>
                <span className="text-sm text-gray-600">
                  {selectedPlans.size} of {paypalSubscriptions.length} selected
                </span>
              </div>

              {/* Subscriptions List */}
              <div className="space-y-3">
                {paypalSubscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPlans.has(subscription.id)
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleSelectPlan(subscription.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {selectedPlans.has(subscription.id) ? (
                          <FaCheckSquare className="text-blue-600" size={16} />
                        ) : (
                          <FaSquare className="text-gray-400" size={16} />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">
                            {subscription.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              subscription.status?.toLowerCase() === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {subscription.status}
                          </span>
                        </div>

                        {subscription.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {subscription.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="font-medium text-blue-600">
                            {formatPrice(subscription)}
                          </span>
                          <span>{formatFrequency(subscription)}</span>
                          <span>Plan ID: {subscription.id}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedPlans.size > 0 && (
              <span>
                {selectedPlans.size} subscription
                {selectedPlans.size !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleImport}
              disabled={selectedPlans.size === 0 || importing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? (
                <>
                  <FaSpinner className="animate-spin" size={14} />
                  Importing...
                </>
              ) : (
                <>
                  <FaDownload size={14} />
                  Import Selected
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPalImportModal;
