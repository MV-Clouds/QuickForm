import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaCog, FaInfoCircle } from "react-icons/fa";
import SubscriptionManagementModal from "../SubscriptionManagementModal";

// Utility functions moved outside component for better performance
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

/**
 * SimpleSubscriptionConfig Component
 *
 * Simple interface that shows "Manage Subscription" button
 * Opens modal with "Add New Subscription" and "Add from PayPal" options
 */
const SimpleSubscriptionConfig = ({
  subscriptionConfig = {},
  onConfigChange,
  selectedMerchantId,
  formId,
}) => {
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(
    subscriptionConfig.selectedSubscriptionId || ""
  );

  // Memoized load function to prevent unnecessary re-renders
  const loadSubscriptions = useCallback(() => {
    if (!formId) return;

    const storageKey = `form_subscriptions_${formId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const loadedSubscriptions = JSON.parse(stored);
        setSubscriptions(loadedSubscriptions);

        // Validate that the current selection still exists
        const currentSelectionExists = loadedSubscriptions.find(
          (s) => s.id === selectedSubscriptionId
        );

        // If current selection doesn't exist or no selection, auto-select first one
        if (!currentSelectionExists && loadedSubscriptions.length > 0) {
          setSelectedSubscriptionId(loadedSubscriptions[0].id);
        }
      } catch (e) {
        console.error("Error parsing stored subscriptions:", e);
        setSubscriptions([]);
        setSelectedSubscriptionId("");
      }
    } else {
      setSubscriptions([]);
      setSelectedSubscriptionId("");
    }
  }, [formId, selectedSubscriptionId]);

  // Load subscriptions when component mounts or formId changes
  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Update selectedSubscriptionId when subscriptionConfig changes
  useEffect(() => {
    if (subscriptionConfig.selectedSubscriptionId !== selectedSubscriptionId) {
      setSelectedSubscriptionId(
        subscriptionConfig.selectedSubscriptionId || ""
      );
    }
  }, [subscriptionConfig.selectedSubscriptionId]);

  // Memoized config object to prevent infinite loops
  const configToSend = useMemo(
    () => ({
      ...subscriptionConfig,
      selectedSubscriptionId,
      subscriptions,
    }),
    [subscriptionConfig, selectedSubscriptionId, subscriptions]
  );

  // Update parent when selection or subscriptions change
  useEffect(() => {
    onConfigChange?.(configToSend);
  }, [onConfigChange, configToSend]);

  const handleSubscriptionsChange = useCallback(
    (newSubscriptions) => {
      setSubscriptions(newSubscriptions);

      // If the currently selected subscription was deleted, clear selection
      if (
        selectedSubscriptionId &&
        !newSubscriptions.find((s) => s.id === selectedSubscriptionId)
      ) {
        setSelectedSubscriptionId("");
      }

      // If no subscription is selected but subscriptions exist, select the first one
      if (!selectedSubscriptionId && newSubscriptions.length > 0) {
        setSelectedSubscriptionId(newSubscriptions[0].id);
      }
    },
    [selectedSubscriptionId]
  );

  return (
    <div className="simple-subscription-config space-y-4">
      {/* Header with Manage Button */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaCog className="text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-800">
              Subscription Configuration
            </h3>
          </div>
          <button
            onClick={() => setShowManagementModal(true)}
            disabled={!selectedMerchantId}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Manage Subscription
          </button>
        </div>
        <p className="text-sm text-purple-700">
          {subscriptions.length > 0
            ? `${subscriptions.length} subscription plan(s) configured. Users will select one at checkout.`
            : "Create subscription plans that users can choose from in your form."}
        </p>
      </div>

      {/* Merchant Selection Warning */}
      {!selectedMerchantId && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FaInfoCircle className="text-yellow-600" />
            <span className="text-sm text-yellow-700">
              Please select a merchant account first to manage subscriptions
            </span>
          </div>
        </div>
      )}

      {/* Current Selection Display */}
      {subscriptions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Available Subscription Plans ({subscriptions.length})
          </h4>

          {/* Subscription Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Selected Plan (users can change at checkout)
            </label>
            <select
              value={selectedSubscriptionId}
              onChange={(e) => setSelectedSubscriptionId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select a subscription plan...</option>
              {subscriptions.map((subscription) => (
                <option key={subscription.id} value={subscription.id}>
                  {subscription.name ||
                    subscription.planData?.name ||
                    "Unnamed Subscription"}
                </option>
              ))}
            </select>
          </div>

          {/* Plans List */}
          <div className="space-y-2">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className={`p-2 border rounded-lg text-sm ${
                  subscription.id === selectedSubscriptionId
                    ? "border-purple-300 bg-purple-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-800">
                      {subscription.name ||
                        subscription.planData?.name ||
                        "Unnamed Subscription"}
                    </span>
                    {subscription.id === selectedSubscriptionId && (
                      <span className="ml-2 text-xs text-purple-600 font-medium">
                        (Default)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {getBillingInfo(subscription.planData || subscription)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Management Modal */}
      <SubscriptionManagementModal
        isOpen={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        selectedMerchantId={selectedMerchantId}
        formId={formId}
        onSubscriptionsChange={handleSubscriptionsChange}
      />
    </div>
  );
};

export default SimpleSubscriptionConfig;
