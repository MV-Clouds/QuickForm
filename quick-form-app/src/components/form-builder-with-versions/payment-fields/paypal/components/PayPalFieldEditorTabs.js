import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FaInfoCircle,
  FaCog,
  FaCreditCard,
  FaReceipt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import MerchantAccountSelector from "../../shared/MerchantAccountSelector";
import ProductManagementModal from "../../shared/ProductManagementModal";
import SubscriptionManagementModal from "./SubscriptionManagementModal";
import { HelpTooltip, ContextualHelp } from "./PayPalFieldHelp";
import { PaymentProvider, usePaymentContext } from "../../PaymentContext";
import { usePaymentFieldState } from "../hooks/usePaymentFieldState";
import { usePerformanceMonitor } from "../utils/performanceMonitor";
import { usePaymentFieldValidation } from "../utils/paymentFieldValidator";
import {
  getSupportedCurrencies,
  formatCurrencyLabel,
  isZeroDecimal,
  isInCountryOnly,
} from "../../../../../utils/paypalCurrencies";

/**
 * Refactored PayPal Field Editor with Centralized State Management
 *
 * Key improvements:
 * - Centralized state management with usePaymentFieldState hook
 * - Proper state persistence across tab changes
 * - Optimized re-rendering with React.memo and useMemo
 * - Clean separation of concerns
 */
const PayPalFieldEditorTabsRefactored = ({
  selectedField,
  onUpdateField,
  className = "",
}) => {
  // Get payment context
  const { userId, formId } = usePaymentContext();

  // Extract field data
  const fieldId = selectedField?.id;
  const subFields = useMemo(
    () => selectedField?.subFields || {},
    [selectedField?.subFields]
  );

  // Use centralized state management
  const { state, actions, isInitialized } = usePaymentFieldState(
    subFields,
    onUpdateField,
    fieldId
  );

  useEffect(() => {
    console.log("🎛️ PayPalFieldEditorTabsRefactored state:", state);
  }, [state]);

  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor("PayPalFieldEditorTabs");

  // Validation utilities
  const validator = usePaymentFieldValidation();

  // UI-only state (doesn't need to persist)
  const [activeTab, setActiveTab] = useState("account");
  const [expandedSections, setExpandedSections] = useState({
    account: true,
    paymentMethods: true,
    behavior: false,
  });

  // Modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  // Currency options are sourced locally; no network call for now

  // Debug logging
  console.log("🔍 PayPalFieldEditorTabsRefactored render:", {
    fieldId,
    isInitialized,
    state: state,
    activeTab,
    timestamp: new Date().toISOString(),
  });

  // Modal handlers
  const handleOpenManager = useCallback(
    (type) => {
      console.log("🔍 Opening manager modal:", type);
      performanceMonitor.trackModalOpen(type);

      if (type === "product") {
        setShowProductModal(true);
      } else if (type === "subscription") {
        setShowSubscriptionModal(true);
      }
    },
    [performanceMonitor]
  );

  // Toggle accordion sections
  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Event handlers with proper state management
  const handleMerchantChange = useCallback(
    (merchantId) => {
      console.log("🔍 Merchant changed:", merchantId);
      performanceMonitor.trackStateChange("UPDATE_MERCHANT", { merchantId });
      actions.updateMerchant(merchantId);

      // Also clear merchant-bound items from the field to avoid leaking previous merchant data
      try {
        if (selectedField && onUpdateField) {
          const sub = selectedField.subFields || {};
          // Filter out product/subscription items from formItems map while keeping other types (e.g., donation)
          const oldFormItems = sub.formItems || {};
          const filteredFormItems = Object.fromEntries(
            Object.entries(oldFormItems).filter(([, v]) =>
              v && v.type
                ? v.type !== "product" && v.type !== "subscription"
                : true
            )
          );

          const clearedSubFields = {
            ...sub,
            // Persist the newly selected merchant account id; capabilities resolver will fill merchantId later
            merchantAccountId: merchantId,
            // Clear merchant-specific collections
            products: [],
            subscriptions: [],
            // Remove any derived subscription config so validation doesn't reference stale data
            subscriptionConfig: undefined,
            // Remove any product/subscription references inside amount/subscription configs
            amount: sub.amount
              ? { ...sub.amount, productId: undefined }
              : sub.amount,
            subscription: sub.subscription
              ? { ...sub.subscription, planId: undefined }
              : sub.subscription,
            formItems: filteredFormItems,
          };

          onUpdateField(selectedField.id, { subFields: clearedSubFields });
        }
      } catch (e) {
        console.warn(
          "Failed to clear merchant-bound items on merchant change:",
          e
        );
      }
    },
    [actions, performanceMonitor, onUpdateField, selectedField]
  );

  const handlePaymentTypeChange = useCallback(
    (e) => {
      const newPaymentType = e.target.value;
      console.log("🔍 Payment type changed:", newPaymentType);
      performanceMonitor.trackStateChange("UPDATE_PAYMENT_TYPE", {
        paymentType: newPaymentType,
      });
      actions.updatePaymentType(newPaymentType);
    },
    [actions, performanceMonitor]
  );

  const handleAmountConfigChange = useCallback(
    (updates) => {
      console.log("🔍 Amount config changed:", updates);
      performanceMonitor.trackStateChange("UPDATE_AMOUNT_CONFIG", updates);
      actions.updateAmountConfig(updates);
    },
    [actions, performanceMonitor]
  );

  const handlePaymentMethodChange = useCallback(
    (method, enabled) => {
      console.log("🔍 Payment method changed:", method, enabled);
      actions.updatePaymentMethods({ [method]: enabled });
    },
    [actions]
  );

  const handleBehaviorChange = useCallback(
    (updates) => {
      console.log("🔍 Behavior changed:", updates);
      actions.updateBehavior(updates);
    },
    [actions]
  );

  // Tab definitions
  const tabs = useMemo(
    () => [
      {
        id: "account",
        label: "Account & Payment Type",
        icon: FaCog,
        description: "Configure merchant account and payment type",
      },
      {
        id: "configuration",
        label: "Payment Configuration",
        icon: FaCreditCard,
        description: "Configure amounts, products, and payment methods",
      },
      {
        id: "advanced",
        label: "Advanced Settings",
        icon: FaReceipt,
        description: "Additional settings and behavior options",
      },
    ],
    []
  );

  // Don't render until state is initialized
  if (
    !selectedField ||
    selectedField.type !== "paypal_payment" ||
    !isInitialized
  ) {
    return (
      <div className="flex items-center justify-center p-8">
        <FaSpinner className="animate-spin mr-2" />
        <span>Loading payment configuration...</span>
      </div>
    );
  }

  return (
    <div className={`paypal-field-editor-tabs-refactored ${className}`}>
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.65 3.85-3.197 5.341-6.965 5.341h-2.312c-.228 0-.42.15-.472.374l-.718 4.54-.206 1.308-.144.911a.641.641 0 0 0 .633.74h3.94c.524 0 .968-.382 1.05-.9l.048-.302.718-4.54.048-.302c.082-.518.526-.9 1.05-.9h.662c3.606 0 6.426-1.462 7.25-5.69.343-1.77.133-3.253-.933-4.119z" />
            </svg>
            <h3 className="text-lg font-semibold text-blue-800">
              PayPal Payment Configuration
            </h3>
          </div>
          <ContextualHelp section="merchantAccount" />
        </div>
        <p className="text-sm text-blue-700">
          Configure your PayPal payment field with organized settings sections
        </p>

        {/* State debug info (remove in production) */}
        <div className="mt-2 text-xs text-blue-600">
          Last updated:{" "}
          {state.lastUpdated
            ? new Date(state.lastUpdated).toLocaleTimeString()
            : "Never"}{" "}
          | Dirty: {state.isDirty ? "Yes" : "No"}
          {(() => {
            const validationResults = validator.validateState(state, "Header");
            const summary = validator.getSummary(validationResults);
            return summary.errors > 0
              ? ` | ❌ ${summary.errors} errors`
              : summary.warnings > 0
              ? ` | ⚠️ ${summary.warnings} warnings`
              : " | ✅ Valid";
          })()}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                const previousTab = activeTab;
                performanceMonitor.trackTabSwitch(previousTab, tab.id);
                setActiveTab(tab.id);
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-blue-600 border-blue-600 bg-blue-50"
                  : "text-gray-600 border-transparent hover:text-gray-800 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Account & Payment Type Tab */}
        {activeTab === "account" && (
          <AccountTab
            state={state}
            actions={actions}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            onMerchantChange={handleMerchantChange}
            onPaymentTypeChange={handlePaymentTypeChange}
            userId={userId}
            formId={formId}
          />
        )}

        {/* Payment Configuration Tab */}
        {activeTab === "configuration" && (
          <ConfigurationTab
            state={state}
            actions={actions}
            selectedField={selectedField}
            onUpdateField={onUpdateField}
            onAmountConfigChange={handleAmountConfigChange}
            onPaymentMethodChange={handlePaymentMethodChange}
            onOpenManager={handleOpenManager}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        )}

        {/* Advanced Settings Tab */}
        {activeTab === "advanced" && (
          <AdvancedTab
            state={state}
            actions={actions}
            onBehaviorChange={handleBehaviorChange}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        )}
      </div>

      {/* Modals */}
      <ProductManagementModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        selectedField={selectedField}
        onUpdateField={onUpdateField}
        selectedMerchantId={state.capabilities?.merchantId || ""}
      />

      <SubscriptionManagementModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        selectedField={selectedField}
        onUpdateField={onUpdateField}
        selectedMerchantId={state.capabilities?.merchantId || ""}
      />
    </div>
  );
};

// Account Tab Component
const AccountTab = React.memo(
  ({
    state,
    actions,
    expandedSections,
    toggleSection,
    onMerchantChange,
    onPaymentTypeChange,
    userId,
    formId,
  }) => (
    <div className="space-y-6">
      {/* Merchant Account Section */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("account")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaCog className="text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                Merchant Account
                <HelpTooltip
                  title="Merchant Account Setup"
                  content="Connect your verified PayPal business account to accept payments."
                />
              </h4>
              <p className="text-sm text-gray-600">
                Select and verify your PayPal merchant account
              </p>
            </div>
          </div>
          {expandedSections.account ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        {expandedSections.account && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <MerchantAccountSelector
              selectedMerchantId={state.selectedMerchantId}
              onMerchantChange={onMerchantChange}
              onCapabilitiesChange={actions.updateCapabilities}
              className="mt-4"
              userId={userId}
              formId={formId}
            />

            {/* Account Status Display */}
            {state.selectedMerchantId && state.accountStatus && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {state.accountStatus.status === "active" ? (
                    <FaCheckCircle className="text-green-600" />
                  ) : (
                    <FaExclamationTriangle className="text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      state.accountStatus.status === "active"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {state.accountStatus.status === "active"
                      ? "Connected & Active"
                      : "Connection Issue"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Type Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <FaCreditCard className="text-blue-600" />
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              Payment Type
              <HelpTooltip
                title="Payment Types"
                content="Choose the type of payment to accept: products, subscriptions, donations, or custom amounts."
              />
            </h4>
            <p className="text-sm text-gray-600">
              Choose the type of payment to accept
            </p>
          </div>
        </div>

        <select
          value={state.paymentType}
          onChange={onPaymentTypeChange}
          className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="product_wise">Product-wise Payment</option>
          <option value="custom_amount">Custom Amount</option>
          <option
            value="subscription"
            disabled={!state.capabilities?.subscriptions}
          >
            Subscription{" "}
            {!state.capabilities?.subscriptions ? "(Not Available)" : ""}
          </option>
          <option value="donation" disabled={!state.capabilities?.donations}>
            Donation (Custom Amount){" "}
            {!state.capabilities?.donations ? "(Not Available)" : ""}
          </option>
          <option
            value="donation_button"
            disabled={!state.capabilities?.donations}
          >
            Donation (with Button ID){" "}
            {!state.capabilities?.donations ? "(Not Available)" : ""}
          </option>
        </select>

        {/* Payment type guidance */}
        {state.paymentType === "product_wise" && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <FaInfoCircle className="inline text-green-600 mr-2" />
            <span className="text-sm text-green-700">
              <strong>Product-wise payment selected!</strong> Go to the "Payment
              Configuration" tab to manage your products and set up pricing.
            </span>
          </div>
        )}
      </div>
    </div>
  )
);

// Configuration Tab Component
const ConfigurationTab = React.memo(
  ({
    state,
    actions,
    selectedField,
    onUpdateField,
    onAmountConfigChange,
    onPaymentMethodChange,
    onOpenManager,
    expandedSections,
    toggleSection,
  }) => (
    <div className="space-y-6">
      {/* Product-wise Payment Configuration */}
      {state.paymentType === "product_wise" && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <FaReceipt className="text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">
                Product-wise Payment
              </h4>
              <p className="text-sm text-gray-600">
                Configure your product list and pricing. Users will select
                products and totals will be calculated automatically.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Enhanced Product Management Section */}
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <FaReceipt className="text-green-600 text-lg" />
                  <div>
                    <span className="text-sm font-semibold text-green-800">
                      Product Management
                    </span>
                    <p className="text-xs text-green-600">
                      Add, edit, import, and manage products for this form
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenManager("product")}
                  disabled={!state.selectedMerchantId}
                  title={
                    !state.selectedMerchantId
                      ? "Select a merchant account first"
                      : undefined
                  }
                  className={`px-6 py-3 text-white text-sm font-medium rounded-lg transition-colors shadow-md ${
                    !state.selectedMerchantId
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 hover:shadow-lg"
                  }`}
                >
                  Manage Products
                </button>
              </div>
              <div className="text-xs text-green-700">
                Click "Manage Products" to add products, set prices, configure
                SKUs, and import from PayPal
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <FaInfoCircle className="inline text-blue-600 mr-2" />
              <span className="text-sm text-blue-700">
                Products are stored with your form and can include price,
                currency, SKU, and inventory.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Custom Amount Configuration */}
      {state.paymentType === "custom_amount" && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <FaReceipt className="text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">
                Custom Amount Configuration
              </h4>
              <p className="text-sm text-gray-600">
                Configure how users can enter custom amounts
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount Type
              </label>
              <select
                value={state.amount.type}
                onChange={(e) => onAmountConfigChange({ type: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="static">Static Amount (Fixed Price)</option>
                <option value="variable">Variable Amount (User Choice)</option>
              </select>
            </div>

            {state.amount.type === "static" && (
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  Fixed Amount *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step={isZeroDecimal(state.amount.currency) ? 1 : 0.01}
                    min={isZeroDecimal(state.amount.currency) ? 1 : 0}
                    value={state.amount.value || ""}
                    onChange={(e) =>
                      onAmountConfigChange({
                        value: isZeroDecimal(state.amount.currency)
                          ? parseInt(e.target.value || 0, 10)
                          : parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-8 pr-16 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Enter amount (e.g., 25.00)"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">
                      {state.amount.currency}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  This is the fixed amount users will pay. Enter the exact price
                  for your product or service.
                </p>

                {/* Currency is configured once below; duplicate selector removed */}
              </div>
            )}

            {state.amount.type === "variable" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Amount
                  </label>
                  <input
                    type="number"
                    step={isZeroDecimal(state.amount.currency) ? 1 : 0.01}
                    min={isZeroDecimal(state.amount.currency) ? 1 : 0}
                    value={state.amount.minAmount}
                    onChange={(e) =>
                      onAmountConfigChange({
                        minAmount: isZeroDecimal(state.amount.currency)
                          ? parseInt(e.target.value || 0, 10)
                          : e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Amount
                  </label>
                  <input
                    type="number"
                    step={isZeroDecimal(state.amount.currency) ? 1 : 0.01}
                    min={isZeroDecimal(state.amount.currency) ? 1 : 0}
                    value={state.amount.maxAmount}
                    onChange={(e) =>
                      onAmountConfigChange({
                        maxAmount: isZeroDecimal(state.amount.currency)
                          ? parseInt(e.target.value || 0, 10)
                          : e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000.00"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={state.amount.currency}
                onChange={(e) =>
                  onAmountConfigChange({ currency: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getSupportedCurrencies().map((c) => (
                  <option key={c.code} value={c.code}>
                    {formatCurrencyLabel(c)}
                  </option>
                ))}
              </select>
              {isInCountryOnly(state.amount.currency) && (
                <p className="text-xs text-amber-700 mt-1">
                  Note: {state.amount.currency} is supported only for merchants
                  in-country.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subscription Configuration */}
      {state.paymentType === "subscription" && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <FaReceipt className="text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">Subscriptions</h4>
              <p className="text-sm text-gray-600">
                Create and manage subscription plans for this form
              </p>
            </div>
          </div>

          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FaReceipt className="text-purple-600 text-lg" />
                <div>
                  <span className="text-sm font-semibold text-purple-800">
                    Subscription Management
                  </span>
                  <p className="text-xs text-purple-700">
                    Add, edit, import, and manage subscription plans
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenManager("subscription")}
                disabled={!state.selectedMerchantId}
                title={
                  !state.selectedMerchantId
                    ? "Select a merchant account first"
                    : undefined
                }
                className={`px-6 py-3 text-white text-sm font-medium rounded-lg transition-colors shadow-md ${
                  !state.selectedMerchantId
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 hover:shadow-lg"
                }`}
              >
                Manage Subscriptions
              </button>
            </div>
            <div className="text-xs text-purple-800">
              Click "Manage Subscriptions" to create plans, set billing cycles,
              prices, and import existing PayPal plans
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods - Only show for types that support multiple methods */}
      {state.paymentType !== "donation_button" &&
        state.paymentType !== "subscription" && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection("paymentMethods")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <FaCreditCard className="text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Payment Methods</h4>
                  <p className="text-sm text-gray-600">
                    Choose which payment methods to accept
                  </p>
                </div>
              </div>
              {expandedSections.paymentMethods ? (
                <FaChevronDown />
              ) : (
                <FaChevronRight />
              )}
            </button>

            {expandedSections.paymentMethods && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={state.paymentMethods.paypal}
                      onChange={(e) =>
                        onPaymentMethodChange("paypal", e.target.checked)
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">PayPal</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={state.paymentMethods.cards}
                      onChange={(e) =>
                        onPaymentMethodChange("cards", e.target.checked)
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      Credit/Debit Cards
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={state.paymentMethods.venmo}
                      disabled={!state.capabilities?.venmo}
                      onChange={(e) =>
                        onPaymentMethodChange("venmo", e.target.checked)
                      }
                      className="mr-2"
                    />
                    <span
                      className={`text-sm ${
                        !state.capabilities?.venmo
                          ? "text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      Venmo{" "}
                      {!state.capabilities?.venmo ? "(Not Available)" : ""}
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={state.paymentMethods.googlePay}
                      disabled={!state.capabilities?.googlePay}
                      onChange={(e) =>
                        onPaymentMethodChange("googlePay", e.target.checked)
                      }
                      className="mr-2"
                    />
                    <span
                      className={`text-sm ${
                        !state.capabilities?.googlePay
                          ? "text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      Google Pay{" "}
                      {!state.capabilities?.googlePay ? "(Not Available)" : ""}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
);

// Advanced Tab Component
const AdvancedTab = React.memo(
  ({ state, actions, onBehaviorChange, expandedSections, toggleSection }) => (
    <div className="space-y-6">
      {/* Field Behavior */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("behavior")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaCog className="text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">Field Behavior</h4>
              <p className="text-sm text-gray-600">
                Configure additional field behavior and data collection
              </p>
            </div>
          </div>
          {expandedSections.behavior ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        {expandedSections.behavior && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="space-y-3 mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={state.behavior.collectBillingAddress}
                  onChange={(e) =>
                    onBehaviorChange({
                      collectBillingAddress: e.target.checked,
                    })
                  }
                  className="mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Collect Billing Address
                  </span>
                  <p className="text-xs text-gray-500">
                    Request billing address during payment
                  </p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={state.behavior.collectShippingAddress}
                  onChange={(e) =>
                    onBehaviorChange({
                      collectShippingAddress: e.target.checked,
                    })
                  }
                  className="mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Collect Shipping Address
                  </span>
                  <p className="text-xs text-gray-500">
                    Request shipping address during payment
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Information Panel */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FaInfoCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <strong>Important Notes:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Only one payment field is allowed per form</li>
              <li>
                Payment methods availability depends on your merchant account
                capabilities
              </li>
              <li>
                Test your payment configuration before publishing the form
              </li>
              <li>All payment data is processed securely through PayPal</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Debug Information (remove in production) */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2">
          Debug Information
        </h5>
        <div className="text-xs text-gray-600 space-y-1">
          <div>State Initialized: {state.isInitialized ? "Yes" : "No"}</div>
          <div>State Dirty: {state.isDirty ? "Yes" : "No"}</div>
          <div>
            Last Updated:{" "}
            {state.lastUpdated
              ? new Date(state.lastUpdated).toLocaleString()
              : "Never"}
          </div>
          <div>Merchant ID: {state.selectedMerchantId || "Not set"}</div>
          <div>Payment Type: {state.paymentType}</div>
          <div>
            Payment Methods:{" "}
            {Object.entries(state.paymentMethods)
              .filter(([_, enabled]) => enabled)
              .map(([method]) => method)
              .join(", ")}
          </div>
        </div>
      </div>
    </div>
  )
);

// Wrapper component with PaymentProvider
const PayPalFieldEditorTabs = ({
  selectedField,
  onUpdateField,
  userId,
  formId,
  className = "",
}) => {
  return (
    <PaymentProvider userId={userId} formId={formId}>
      <PayPalFieldEditorTabsRefactored
        selectedField={selectedField}
        onUpdateField={onUpdateField}
        className={className}
      />
    </PaymentProvider>
  );
};

export default PayPalFieldEditorTabs;
