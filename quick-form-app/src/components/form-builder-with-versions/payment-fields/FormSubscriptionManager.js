import React, { useState, useEffect } from "react";
import {
  FaList,
  FaPlus,
  FaTrash,
  FaEdit,
  FaEye,
  FaSpinner,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaTimes,
  FaCheck,
} from "react-icons/fa";
import { fetchPaypalSubscriptions } from "./paypal/api/paypalApi";

/**
 * FormSubscriptionManager Component
 *
 * Manages subscriptions for a specific form with:
 * - List of form subscriptions
 * - Add subscriptions from PayPal with multiple selection
 * - Remove subscriptions from form
 */
const FormSubscriptionManager = ({
  isOpen,
  onClose,
  selectedMerchantId,
  formId,
  onSubscriptionsChange,
}) => {
  const [formSubscriptions, setFormSubscriptions] = useState([]);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [paypalSubscriptions, setPaypalSubscriptions] = useState([]);
  const [selectedPayPalSubs, setSelectedPayPalSubs] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load form subscriptions from localStorage or state management
  useEffect(() => {
    if (isOpen && formId) {
      loadFormSubscriptions();
    }
  }, [isOpen, formId]);

  // Clear PayPal subscriptions when merchant changes
  useEffect(() => {
    if (selectedMerchantId) {
      setPaypalSubscriptions([]);
      setSelectedPayPalSubs(new Set());
      setError("");
    }
  }, [selectedMerchantId]);

  const loadFormSubscriptions = () => {
    // Load from localStorage or your state management system
    const storageKey = `form_subscriptions_${formId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setFormSubscriptions(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing stored subscriptions:", e);
        setFormSubscriptions([]);
      }
    } else {
      setFormSubscriptions([]);
    }
  };

  const saveFormSubscriptions = (subscriptions) => {
    const storageKey = `form_subscriptions_${formId}`;
    localStorage.setItem(storageKey, JSON.stringify(subscriptions));
    setFormSubscriptions(subscriptions);
    onSubscriptionsChange?.(subscriptions);
  };

  const loadPayPalSubscriptions = async () => {
    if (!selectedMerchantId) return;

    setLoading(true);
    setError("");
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

  const handleAddFromPayPal = () => {
    setShowPayPalModal(true);
    loadPayPalSubscriptions();
  };

  const handlePayPalSubSelection = (planId, isSelected) => {
    const newSelection = new Set(selectedPayPalSubs);
    if (isSelected) {
      newSelection.add(planId);
    } else {
      newSelection.delete(planId);
    }
    setSelectedPayPalSubs(newSelection);
  };

  const handleAddSelectedSubscriptions = () => {
    const selectedSubs = paypalSubscriptions.filter((sub) =>
      selectedPayPalSubs.has(sub.id)
    );

    const newFormSubs = selectedSubs.map((sub) => ({
      id: sub.id,
      name: sub.name,
      description: sub.description,
      status: sub.status,
      billing_cycles: sub.billing_cycles,
      created_time: sub.create_time,
      source: "paypal",
      merchantId: selectedMerchantId,
      addedToForm: new Date().toISOString(),
    }));

    // Filter out duplicates
    const existingIds = new Set(formSubscriptions.map((s) => s.id));
    const uniqueNewSubs = newFormSubs.filter((s) => !existingIds.has(s.id));

    if (uniqueNewSubs.length === 0) {
      setError("All selected subscriptions are already added to this form");
      return;
    }

    const updatedSubs = [...formSubscriptions, ...uniqueNewSubs];
    saveFormSubscriptions(updatedSubs);

    setShowPayPalModal(false);
    setSelectedPayPalSubs(new Set());
    setError("");
  };

  const handleRemoveSubscription = (subscriptionId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this subscription from the form?"
      )
    ) {
      const updatedSubs = formSubscriptions.filter(
        (s) => s.id !== subscriptionId
      );
      saveFormSubscriptions(updatedSubs);
    }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Manage Form Subscriptions
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage subscriptions for Form ID: {formId}
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
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Form Subscriptions ({formSubscriptions.length})
            </h3>
            <button
              onClick={handleAddFromPayPal}
              disabled={!selectedMerchantId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlus size={14} />
              Add from PayPal
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Form Subscriptions List */}
          {formSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FaList className="mx-auto text-4xl mb-2" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No Subscriptions Added
              </h3>
              <p className="text-gray-500 mb-4">
                Add subscriptions from your PayPal account to use in this form.
              </p>
              <button
                onClick={handleAddFromPayPal}
                disabled={!selectedMerchantId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add from PayPal
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {formSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-800 mb-1">
                        {subscription.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {subscription.description || "No description"}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            subscription.status
                          )}`}
                        >
                          {subscription.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          ID: {subscription.id}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`https://www.sandbox.paypal.com/billing/plans/${subscription.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="View in PayPal"
                      >
                        <FaExternalLinkAlt />
                      </a>
                      <button
                        onClick={() =>
                          handleRemoveSubscription(subscription.id)
                        }
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Remove from Form"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">
                          Billing:
                        </span>
                        <span className="ml-2 text-gray-600">
                          {getBillingInfo(subscription.billing_cycles)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Added:
                        </span>
                        <span className="ml-2 text-gray-600">
                          {subscription.addedToForm
                            ? new Date(
                                subscription.addedToForm
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
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>

      {/* PayPal Subscriptions Modal */}
      {showPayPalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    Add Subscriptions from PayPal
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select multiple subscriptions to add to your form
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPayPalModal(false);
                    setSelectedPayPalSubs(new Set());
                    setError("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {loading ? (
                <div className="text-center py-8">
                  <FaSpinner
                    className="animate-spin text-blue-600 mx-auto mb-2"
                    size={24}
                  />
                  <p className="text-gray-600">
                    Loading PayPal subscriptions...
                  </p>
                </div>
              ) : paypalSubscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <FaInfoCircle
                    className="text-gray-400 mx-auto mb-2"
                    size={24}
                  />
                  <p className="text-gray-600">
                    No PayPal subscriptions found for this merchant
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">
                      {paypalSubscriptions.length} subscription(s) available
                    </span>
                    <span className="text-sm text-gray-600">
                      {selectedPayPalSubs.size} selected
                    </span>
                  </div>

                  {paypalSubscriptions.map((subscription) => {
                    const isSelected = selectedPayPalSubs.has(subscription.id);
                    const isAlreadyAdded = formSubscriptions.some(
                      (s) => s.id === subscription.id
                    );

                    return (
                      <div
                        key={subscription.id}
                        className={`border rounded-lg p-3 ${
                          isAlreadyAdded
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
                            disabled={isAlreadyAdded}
                            onChange={(e) =>
                              handlePayPalSubSelection(
                                subscription.id,
                                e.target.checked
                              )
                            }
                            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-800">
                                  {subscription.name}
                                  {isAlreadyAdded && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      (Already added)
                                    </span>
                                  )}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {subscription.description || "No description"}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  subscription.status
                                )}`}
                              >
                                {subscription.status}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Billing:</span>
                              <span className="ml-1">
                                {getBillingInfo(subscription.billing_cycles)}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              ID: {subscription.id}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex justify-between">
              <button
                onClick={() => {
                  setShowPayPalModal(false);
                  setSelectedPayPalSubs(new Set());
                  setError("");
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelectedSubscriptions}
                disabled={selectedPayPalSubs.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaCheck size={14} />
                Add Selected ({selectedPayPalSubs.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormSubscriptionManager;
