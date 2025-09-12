import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaInfoCircle,
  FaPaypal,
  FaList,
} from "react-icons/fa";
import ReactDOM from "react-dom";
import SubscriptionFormModal from "./paypal/components/SubscriptionFormModal";
import PayPalSubscriptionImportModal from "./PayPalSubscriptionImportModal";

/**
 * SubscriptionManagementModal Component
 *
 * Main modal for managing subscriptions with two options:
 * 1. Add New Subscription (opens form modal)
 * 2. Add from PayPal (opens import modal)
 */
const SubscriptionManagementModal = ({
  isOpen,
  onClose,
  selectedMerchantId,
  formId,
  onSubscriptionsChange,
}) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [showPayPalImport, setShowPayPalImport] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);

  // Load subscriptions when modal opens
  useEffect(() => {
    if (isOpen && formId) {
      loadSubscriptions();
    }
  }, [isOpen, formId]);

  const loadSubscriptions = () => {
    const storageKey = `form_subscriptions_${formId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const loadedSubscriptions = JSON.parse(stored);
        setSubscriptions(loadedSubscriptions);
      } catch (e) {
        console.error("Error parsing stored subscriptions:", e);
        setSubscriptions([]);
      }
    } else {
      setSubscriptions([]);
    }
  };

  const saveSubscriptions = (newSubscriptions) => {
    const storageKey = `form_subscriptions_${formId}`;
    localStorage.setItem(storageKey, JSON.stringify(newSubscriptions));
    setSubscriptions(newSubscriptions);
    // Derive minimal subscriptionConfig from the most recent/new plan for validation
    let derivedConfig = null;
    const refSub =
      newSubscriptions?.[newSubscriptions.length - 1] || newSubscriptions?.[0];
    const planData = refSub?.planData || refSub;
    if (
      planData &&
      Array.isArray(planData.billing_cycles) &&
      planData.billing_cycles.length > 0
    ) {
      const regular =
        planData.billing_cycles.find((c) => c.tenure_type === "REGULAR") ||
        planData.billing_cycles[0];
      const fixed = regular?.pricing_scheme?.fixed_price || {};
      const freq = regular?.frequency || {};
      derivedConfig = {
        useExistingPlan: false,
        selectedExistingPlan: null,
        name: planData.name || refSub?.name || "",
        price: parseFloat(fixed?.value ?? refSub?.price ?? 0) || 0,
        currency: fixed?.currency_code || planData.currency_code || "USD",
        frequency: (freq?.interval_unit || "MONTH").toUpperCase(),
        interval: parseInt(freq?.interval_count || 1),
        totalCycles: parseInt(regular?.total_cycles ?? 0),
      };
    }
    onSubscriptionsChange?.(newSubscriptions, derivedConfig);
  };

  const handleAddNewSubscription = () => {
    setEditingSubscription(null);
    setShowSubscriptionForm(true);
  };

  const handleEditSubscription = (subscription) => {
    setEditingSubscription(subscription);
    setShowSubscriptionForm(true);
  };

  const handleDeleteSubscription = (subscriptionId) => {
    if (window.confirm("Are you sure you want to delete this subscription?")) {
      const newSubscriptions = subscriptions.filter(
        (s) => s.id !== subscriptionId
      );
      saveSubscriptions(newSubscriptions);
    }
  };

  const handleSubscriptionSave = (subscriptionData) => {
    let newSubscriptions;

    if (editingSubscription) {
      // Update existing subscription
      newSubscriptions = subscriptions.map((s) =>
        s.id === editingSubscription.id ? subscriptionData : s
      );
    } else {
      // Add new subscription
      newSubscriptions = [...subscriptions, subscriptionData];
    }

    saveSubscriptions(newSubscriptions);
    setShowSubscriptionForm(false);
    setEditingSubscription(null);
  };

  const handlePayPalImport = (importedSubscriptions) => {
    const newSubscriptions = [...subscriptions, ...importedSubscriptions];
    saveSubscriptions(newSubscriptions);
    setShowPayPalImport(false);
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getBillingInfo = (planData) => {
    if (!planData?.billing_cycles || planData.billing_cycles.length === 0) {
      return "No billing info";
    }

    const regularCycle = planData.billing_cycles.find(
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
    (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-5xl w-full mx-4 max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Manage Subscription Plans
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Create new subscriptions or import from PayPal
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
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleAddNewSubscription}
                disabled={!selectedMerchantId}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <FaPlus size={14} />
                Add New Subscription
              </button>

              <button
                onClick={() => setShowPayPalImport(true)}
                disabled={!selectedMerchantId}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <FaPaypal size={14} />
                Add from PayPal
              </button>
            </div>

            {/* Merchant Warning */}
            {!selectedMerchantId && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FaInfoCircle className="text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    Please select a merchant account first to manage
                    subscriptions
                  </span>
                </div>
              </div>
            )}

            {/* Subscriptions List */}
            {subscriptions.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Current Subscriptions ({subscriptions.length})
                </h3>

                {subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {subscription.name ||
                              subscription.planData?.name ||
                              "Unnamed Subscription"}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              subscription.status
                            )}`}
                          >
                            {subscription.status || "ACTIVE"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {subscription.source === "form_created"
                              ? "Form Created"
                              : "PayPal Imported"}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                          {subscription.description ||
                            subscription.planData?.description ||
                            "No description"}
                        </p>

                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Billing:</span>
                          <span className="ml-1">
                            {getBillingInfo(
                              subscription.planData || subscription
                            )}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          Created:{" "}
                          {new Date(
                            subscription.createdAt || Date.now()
                          ).toLocaleDateString()}
                          {subscription.paypalPlanId && (
                            <span className="ml-3">
                              PayPal ID: {subscription.paypalPlanId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditSubscription(subscription)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                          title="Edit subscription"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteSubscription(subscription.id)
                          }
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete subscription"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <FaList className="mx-auto text-4xl mb-2" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  No Subscription Plans Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first subscription plan or import existing ones
                  from PayPal
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleAddNewSubscription}
                    disabled={!selectedMerchantId}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <FaPlus size={14} />
                    Create New Plan
                  </button>
                  <button
                    onClick={() => setShowPayPalImport(true)}
                    disabled={!selectedMerchantId}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    <FaPaypal size={14} />
                    Import from PayPal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {subscriptions.length} subscription plan(s) configured
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Form Modal */}
        <SubscriptionFormModal
          isOpen={showSubscriptionForm}
          onClose={() => {
            setShowSubscriptionForm(false);
            setEditingSubscription(null);
          }}
          onSave={handleSubscriptionSave}
          editingSubscription={editingSubscription}
          selectedMerchantId={selectedMerchantId}
        />

        {/* PayPal Import Modal */}
        {/* Note: selectedMerchantId can be a Salesforce record Id; the nested modal/API resolves to Merchant_ID__c */}
        <PayPalSubscriptionImportModal
          isOpen={showPayPalImport}
          onClose={() => setShowPayPalImport(false)}
          onImport={handlePayPalImport}
          selectedMerchantId={selectedMerchantId}
          existingSubscriptions={subscriptions}
        />
      </div>
    ),
    document.body
  );
};

export default SubscriptionManagementModal;
