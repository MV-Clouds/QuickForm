import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaSpinner,
  FaCheck,
  FaInfoCircle,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { fetchPaypalSubscriptions } from "../api/paypalApi";

/**
 * PayPalSubscriptionImportModal Component
 *
 * Modal for importing existing PayPal subscriptions
 * with multiple checkbox selection
 */
const PayPalSubscriptionImportModal = ({
  isOpen,
  onClose,
  onImport,
  selectedMerchantId,
  existingSubscriptions = [],
}) => {
  const [paypalSubscriptions, setPaypalSubscriptions] = useState([]);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && selectedMerchantId) {
      loadPayPalSubscriptions();
    }
  }, [isOpen, selectedMerchantId]);

  const loadPayPalSubscriptions = async () => {
    setLoading(true);
    setError("");
    setSelectedSubscriptions(new Set());

    try {
      const result = await fetchPaypalSubscriptions(selectedMerchantId);
      if (result.success) {
        setPaypalSubscriptions(result.subscriptions || []);
      } else {
        setError(result.error || "Failed to load PayPal subscriptions");
        setPaypalSubscriptions([]);
      }
    } catch (err) {
      console.error("Error loading PayPal subscriptions:", err);
      setError("Failed to load PayPal subscriptions");
      setPaypalSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionToggle = (subscriptionId, isSelected) => {
    const newSelection = new Set(selectedSubscriptions);
    if (isSelected) {
      newSelection.add(subscriptionId);
    } else {
      newSelection.delete(subscriptionId);
    }
    setSelectedSubscriptions(newSelection);
  };

  const handleImport = () => {
    const selectedSubs = paypalSubscriptions.filter((sub) =>
      selectedSubscriptions.has(sub.id)
    );

    if (selectedSubs.length === 0) {
      setError("Please select at least one subscription to import");
      return;
    }

    // Transform PayPal subscriptions to our format
    const transformedSubs = selectedSubs.map((sub) => ({
      id: sub.id,
      name: sub.name,
      description: sub.description,
      status: sub.status,
      planData: {
        name: sub.name,
        description: sub.description,
        currency_code:
          sub.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.currency_code ||
          "USD",
        billing_cycles: sub.billing_cycles || [],
        payment_preferences: sub.payment_preferences || {},
        taxes: sub.taxes || { percentage: "0", inclusive: false },
      },
      paypalPlanId: sub.id,
      source: "paypal_imported",
    }));

    onImport(transformedSubs);
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getBillingInfo = (billingCycles) => {
    if (!billingCycles || billingCycles.length === 0) return "No billing info";

    const regularCycle = billingCycles.find(
      (cycle) => cycle.tenure_type === "REGULAR"
    );
    if (!regularCycle) return "No regular billing cycle";

    const frequency = regularCycle.frequency;
    const price = regularCycle.pricing_scheme?.fixed_price;

    if (!frequency || !price) return "Incomplete billing info";

    return `${formatCurrency(price.value, price.currency_code)} every ${
      frequency.interval_count
    } ${frequency.interval_unit.toLowerCase()}(s)`;
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "text-green-600 bg-green-100";
      case "INACTIVE":
        return "text-red-600 bg-red-100";
      case "CREATED":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const isAlreadyImported = (subscriptionId) => {
    return existingSubscriptions.some(
      (sub) => sub.id === subscriptionId || sub.paypalPlanId === subscriptionId
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Import PayPal Subscriptions
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Select multiple subscriptions from your PayPal account to import
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <FaSpinner
                className="animate-spin text-blue-600 mx-auto mb-2"
                size={24}
              />
              <p className="text-gray-600">Loading PayPal subscriptions...</p>
            </div>
          ) : paypalSubscriptions.length === 0 ? (
            <div className="text-center py-8">
              <FaInfoCircle className="text-gray-400 mx-auto mb-2" size={24} />
              <p className="text-gray-600">
                No PayPal subscriptions found for this merchant
              </p>
              <button
                onClick={loadPayPalSubscriptions}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Selection Summary */}
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">
                  {paypalSubscriptions.length} subscription(s) available
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {selectedSubscriptions.size} selected
                </span>
              </div>

              {/* Subscriptions List */}
              <div className="space-y-3">
                {paypalSubscriptions.map((subscription) => {
                  const isSelected = selectedSubscriptions.has(subscription.id);
                  const isImported = isAlreadyImported(subscription.id);

                  return (
                    <div
                      key={subscription.id}
                      className={`border rounded-lg p-4 ${
                        isImported
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : isSelected
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isImported}
                          onChange={(e) =>
                            handleSubscriptionToggle(
                              subscription.id,
                              e.target.checked
                            )
                          }
                          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-800">
                                {subscription.name}
                                {isImported && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    (Already imported)
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {subscription.description || "No description"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  subscription.status
                                )}`}
                              >
                                {subscription.status}
                              </span>
                              <a
                                href={`https://www.sandbox.paypal.com/billing/plans/${subscription.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                                title="View in PayPal"
                              >
                                <FaExternalLinkAlt size={12} />
                              </a>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Billing:</span>
                            <span className="ml-1">
                              {getBillingInfo(subscription.billing_cycles)}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            Plan ID: {subscription.id}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedSubscriptions.size === 0 || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaCheck size={14} />
            Import Selected ({selectedSubscriptions.size})
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayPalSubscriptionImportModal;
