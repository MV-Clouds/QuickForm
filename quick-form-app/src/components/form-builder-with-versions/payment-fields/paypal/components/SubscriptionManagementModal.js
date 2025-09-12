import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  FaTimes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaDownload,
  FaSpinner,
} from "react-icons/fa";
import SubscriptionFormModal from "./SubscriptionFormModal";
import PayPalImportModal from "./PayPalImportModal";
import { resolvePaypalMerchantId } from "../api/paypalApi";

/**
 * SubscriptionManagementModal Component
 *
 * Main modal that shows existing subscriptions and provides options to:
 * - View existing subscriptions
 * - Create new subscription
 * - Edit existing subscription
 * - Import from PayPal
 * - Delete subscriptions
 */
const SubscriptionManagementModal = ({
  isOpen,
  onClose,
  selectedField,
  onUpdateField,
  selectedMerchantId,
}) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [resolvedMerchantId, setResolvedMerchantId] = useState("");
  // Note: loading/error UI can be added if we introduce async operations here
  const [loading] = useState(false);
  const [error] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);

  // Get subscriptions from field data
  useEffect(() => {
    console.log("😁 Merchnant ID:", selectedMerchantId);
    if (isOpen && selectedField) {
      loadSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedField]);

  // Resolve the actual PayPal Merchant_ID__c from the selected account Id
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        if (!selectedMerchantId) {
          if (isMounted) setResolvedMerchantId("");
          return;
        }
        const resolved = await resolvePaypalMerchantId(selectedMerchantId);
        if (isMounted) setResolvedMerchantId(resolved || selectedMerchantId);
      } catch (e) {
        if (isMounted) setResolvedMerchantId(selectedMerchantId);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [selectedMerchantId]);

  const loadSubscriptions = () => {
    const fieldSubscriptions = selectedField?.subFields?.subscriptions || [];
    setSubscriptions(fieldSubscriptions);
    console.log("📋 Loaded subscriptions:", fieldSubscriptions);
  };

  const handleCreateNew = () => {
    setEditingSubscription(null);
    setShowSubscriptionForm(true);
  };

  const handleEdit = (subscription) => {
    setEditingSubscription(subscription);
    setShowSubscriptionForm(true);
  };

  const handleDelete = (subscriptionId) => {
    if (!window.confirm("Are you sure you want to delete this subscription?")) {
      return;
    }

    const updatedSubscriptions = subscriptions.filter(
      (sub) => sub.id !== subscriptionId
    );

    updateFieldSubscriptions(updatedSubscriptions);
    setSuccess("Subscription deleted successfully");
  };

  const handleSaveSubscription = (subscriptionData) => {
    let updatedSubscriptions;

    if (editingSubscription) {
      // Update existing
      updatedSubscriptions = subscriptions.map((sub) =>
        sub.id === editingSubscription.id ? subscriptionData : sub
      );
      setSuccess("Subscription updated successfully");
    } else {
      // Add new
      updatedSubscriptions = [...subscriptions, subscriptionData];
      setSuccess("Subscription created successfully");
    }

    updateFieldSubscriptions(updatedSubscriptions);
    setShowSubscriptionForm(false);
    setEditingSubscription(null);
  };

  const handleImportFromPayPal = () => {
    setShowImportModal(true);
  };

  const handleImportComplete = (importedSubscriptions) => {
    const updatedSubscriptions = [...subscriptions, ...importedSubscriptions];
    updateFieldSubscriptions(updatedSubscriptions);
    setShowImportModal(false);
    setSuccess(
      `Imported ${importedSubscriptions.length} subscriptions from PayPal`
    );
  };

  const updateFieldSubscriptions = (updatedSubscriptions) => {
    setSubscriptions(updatedSubscriptions);

    // Derive a minimal subscriptionConfig so builder validation passes on save
    let derivedConfig = null;
    const refSub =
      updatedSubscriptions?.[updatedSubscriptions.length - 1] ||
      updatedSubscriptions?.[0];
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

    // Update the field data
    const updatedSubFields = {
      ...selectedField.subFields,
      subscriptions: updatedSubscriptions,
      ...(derivedConfig ? { subscriptionConfig: derivedConfig } : {}),
    };

    onUpdateField(selectedField.id, { subFields: updatedSubFields });
  };

  const formatPrice = (subscription) => {
    const billingCycle = subscription.planData?.billing_cycles?.[0];
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

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Subscription Management
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Status Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus size={14} />
                Create New Subscription
              </button>

              <button
                onClick={handleImportFromPayPal}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={!resolvedMerchantId}
              >
                <FaDownload size={14} />
                Import from PayPal
              </button>
            </div>

            {/* Subscriptions List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <FaSpinner className="animate-spin mr-2" />
                <span>Loading subscriptions...</span>
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">No subscriptions configured yet.</p>
                <p className="text-sm">
                  Create a new subscription or import existing ones from PayPal.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">
                            {subscription.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              subscription.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {subscription.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                          {subscription.description || "No description"}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="font-medium text-blue-600">
                            {formatPrice(subscription)}
                          </span>
                          {subscription.planId && (
                            <span>Plan ID: {subscription.planId}</span>
                          )}
                          {subscription.source && (
                            <span>Source: {subscription.source}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(subscription)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit subscription"
                        >
                          <FaEdit size={14} />
                        </button>

                        <button
                          onClick={() => handleDelete(subscription.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete subscription"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
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
        onSave={handleSaveSubscription}
        editingSubscription={editingSubscription}
        selectedMerchantId={resolvedMerchantId}
      />

      {/* PayPal Import Modal */}
      {/* Note: selectedMerchantId here may be a Salesforce record Id; the API layer resolves it to Merchant_ID__c */}
      <PayPalImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportComplete}
        selectedMerchantId={resolvedMerchantId}
        existingSubscriptions={subscriptions}
      />
    </>,
    document.body
  );
};

export default SubscriptionManagementModal;
