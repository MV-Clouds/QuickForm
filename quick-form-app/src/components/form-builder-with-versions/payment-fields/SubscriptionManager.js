import React, { useState, useEffect } from "react";
import { FaTrash, FaEdit, FaEye, FaPlus } from "react-icons/fa";
import { formPaymentProcessor } from "./FormPaymentProcessor";
import { fetchPaypalSubscriptions as listSubscriptionPlans } from "./paypal/api/paypalApi";

/**
 * Subscription Manager Component
 * Replaces the "Save Plan" functionality with comprehensive subscription management
 */
const SubscriptionManager = ({ merchantId, onSubscriptionSelect, onClose }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (merchantId) {
      loadSubscriptions();
    }
  }, [merchantId]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get existing subscriptions from form processor registry
      const localSubscriptions =
        formPaymentProcessor.getExistingSubscriptions(merchantId);

      // Fetch subscription details from PayPal
      const paypalSubscriptions = await listSubscriptionPlans(
        merchantId,
        "sandbox"
      );

      // Merge local and PayPal data
      const mergedSubscriptions = localSubscriptions.map((local) => {
        const paypalData = paypalSubscriptions.plans?.find(
          (p) => p.id === local.planId
        );
        return {
          ...local,
          ...paypalData,
          name: paypalData?.name || `Subscription ${local.fieldId}`,
          status: paypalData?.status || "UNKNOWN",
          created_time: paypalData?.create_time,
          billing_cycles: paypalData?.billing_cycles || [],
        };
      });

      setSubscriptions(mergedSubscriptions);
    } catch (err) {
      console.error("Error loading subscriptions:", err);
      setError("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async (subscription) => {
    if (
      !window.confirm(
        `Are you sure you want to remove "${subscription.name}" from this form?`
      )
    ) {
      return;
    }

    try {
      // Remove from local registry
      const removed = formPaymentProcessor.removeSubscription(
        subscription.fieldId,
        subscription.merchantId
      );

      if (removed) {
        // Refresh the list
        await loadSubscriptions();
      }
    } catch (err) {
      console.error("Error removing subscription:", err);
      setError("Failed to remove subscription");
    }
  };

  const handleViewDetails = (subscription) => {
    setSelectedSubscription(subscription);
    setShowDetails(true);
  };

  const handleSelectSubscription = (subscription) => {
    if (onSubscriptionSelect) {
      onSubscriptionSelect(subscription);
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
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

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading subscriptions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadSubscriptions}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Manage Subscriptions
        </h2>
        <div className="flex gap-2">
          <button
            onClick={loadSubscriptions}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FaPlus className="mx-auto text-4xl mb-2" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            No Subscriptions Found
          </h3>
          <p className="text-gray-500">
            Create subscription payment fields in your form to see them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {subscriptions.map((subscription) => (
            <div
              key={`${subscription.fieldId}-${subscription.planId}`}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {subscription.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Plan ID: {subscription.planId}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        subscription.status
                      )}`}
                    >
                      {subscription.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      Field: {subscription.fieldId}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(subscription)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="View Details"
                  >
                    <FaEye />
                  </button>
                  <button
                    onClick={() => handleSelectSubscription(subscription)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="Use This Subscription"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteSubscription(subscription)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Remove from Form"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Billing:</span>
                    <span className="ml-2 text-gray-600">
                      {getBillingInfo(subscription.billing_cycles)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-600">
                      {subscription.created_time
                        ? new Date(
                            subscription.created_time
                          ).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscription Details Modal */}
      {showDetails && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Subscription Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="font-medium text-gray-700">Name:</label>
                  <p className="text-gray-600">{selectedSubscription.name}</p>
                </div>

                <div>
                  <label className="font-medium text-gray-700">Plan ID:</label>
                  <p className="text-gray-600 font-mono text-sm">
                    {selectedSubscription.planId}
                  </p>
                </div>

                <div>
                  <label className="font-medium text-gray-700">Status:</label>
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      selectedSubscription.status
                    )}`}
                  >
                    {selectedSubscription.status}
                  </span>
                </div>

                {selectedSubscription.billing_cycles &&
                  selectedSubscription.billing_cycles.length > 0 && (
                    <div>
                      <label className="font-medium text-gray-700">
                        Billing Cycles:
                      </label>
                      <div className="mt-2 space-y-2">
                        {selectedSubscription.billing_cycles.map(
                          (cycle, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {cycle.tenure_type}
                                </span>
                                <span className="text-sm text-gray-600">
                                  Sequence: {cycle.sequence}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <p>
                                  Frequency: {cycle.frequency?.interval_count}{" "}
                                  {cycle.frequency?.interval_unit}
                                </p>
                                <p>
                                  Total Cycles:{" "}
                                  {cycle.total_cycles === 0
                                    ? "Unlimited"
                                    : cycle.total_cycles}
                                </p>
                                {cycle.pricing_scheme?.fixed_price && (
                                  <p>
                                    Price:{" "}
                                    {formatCurrency(
                                      cycle.pricing_scheme.fixed_price.value,
                                      cycle.pricing_scheme.fixed_price
                                        .currency_code
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleSelectSubscription(selectedSubscription);
                  setShowDetails(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Use This Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
