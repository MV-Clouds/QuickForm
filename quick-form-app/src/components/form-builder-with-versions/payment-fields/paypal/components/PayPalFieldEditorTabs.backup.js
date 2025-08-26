import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  FaInfoCircle,
  FaCog,
  FaCreditCard,
  FaReceipt,
  FaHeart,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import MerchantAccountSelector from "../../shared/MerchantAccountSelector";
import FormProductManager from "../../shared/FormProductManager";
import ProductManagementModal from "../../shared/ProductManagementModal";
import SubscriptionManagementModal from "./SubscriptionManagementModal";
import { HelpTooltip, ContextualHelp } from "./PayPalFieldHelp";
import { PaymentProvider, usePaymentContext } from "../../PaymentContext";
import { fetchMerchantCredentialsWithCache } from "../../../../form-publish/payment/utils/merchantCredentials";
import { API_ENDPOINTS } from "../../../../../config";

/**
 * Internal PayPalFieldEditorTabs Component that uses PaymentContext
 *
 * Custom tab-based configuration interface for PayPal payment fields
 * Organized into sections: Account & Payment Type, Payment Configuration, Advanced Settings
 */
const PayPalFieldEditorTabsInternal = ({
  selectedField,
  onUpdateField,
  className = "",
}) => {
  // Get payment context for userId and formId
  const { userId, formId, makePaymentApiRequest } = usePaymentContext();

  // Cache for capabilities to prevent repeated API calls
  const capabilitiesCache = useRef({});

  // Memoize selectedField properties to prevent unnecessary re-renders
  const fieldId = selectedField?.id;
  const subFields = useMemo(
    () => selectedField?.subFields || {},
    [selectedField?.subFields]
  );

  // Debug: Log when selectedField changes (only when fieldId actually changes)
  useEffect(() => {
    console.log("🔍 PayPalFieldEditorTabsInternal: selectedField changed", {
      selectedFieldId: fieldId,
      timestamp: new Date().toISOString(),
    });
  }, [fieldId]);
  // Tab management
  const [activeTab, setActiveTab] = useState("account");

  // Accordion states for better organization
  const [expandedSections, setExpandedSections] = useState({
    account: true,
    paymentMethods: true,
    behavior: false,
  });

  // PayPal-specific state - Initialize from subFields with memoization
  // Support both merchantId (legacy) and merchantAccountId (new secure approach)
  const [selectedMerchantId, setSelectedMerchantId] = useState(
    () => subFields.merchantAccountId || subFields.merchantId || ""
  );
  const [paymentType, setPaymentType] = useState(
    () => subFields.paymentType || "product_wise"
  );
  const [capabilities, setCapabilities] = useState(null);
  const [accountStatus, setAccountStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [merchantDataLoaded, setMerchantDataLoaded] = useState(false);

  // Amount configuration - Initialize from subFields with memoization
  const [amountType, setAmountType] = useState(
    () => subFields.amount?.type || "fixed"
  );
  const [amountValue, setAmountValue] = useState(
    () => subFields.amount?.value || 0
  );
  const [currency, setCurrency] = useState(
    () => subFields.amount?.currency || "USD"
  );
  const [minAmount, setMinAmount] = useState(
    () => subFields.amount?.minAmount || ""
  );
  const [maxAmount, setMaxAmount] = useState(
    () => subFields.amount?.maxAmount || ""
  );

  // Payment methods - Initialize from subFields with memoization
  const [paypalEnabled, setPaypalEnabled] = useState(
    () => subFields.paymentMethods?.paypal !== false
  );
  const [cardsEnabled, setCardsEnabled] = useState(
    () => subFields.paymentMethods?.cards !== false
  );
  const [venmoEnabled, setVenmoEnabled] = useState(
    () => subFields.paymentMethods?.venmo || false
  );
  const [googlePayEnabled, setGooglePayEnabled] = useState(
    () => subFields.paymentMethods?.googlePay || false
  );

  // Behavior settings - Initialize from subFields with memoization
  const [collectBillingAddress, setCollectBillingAddress] = useState(
    () => subFields.behavior?.collectBillingAddress || false
  );
  const [collectShippingAddress, setCollectShippingAddress] = useState(
    () => subFields.behavior?.collectShippingAddress || false
  );

  // Modal state
  const [showManager, setShowManager] = useState(false);
  const [managerType, setManagerType] = useState("product");
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Modal handlers to fix button issues
  const handleOpenManager = useCallback(
    (type) => {
      console.log("🔍 Opening manager modal:", type);
      console.log("🔍 Current modal states:", {
        showProductModal,
        showSubscriptionModal,
        showManager,
        managerType,
      });

      if (type === "product") {
        console.log("🔍 Setting showProductModal to true");
        setShowProductModal(true);
      } else if (type === "subscription") {
        console.log("🔍 Setting showSubscriptionModal to true");
        setShowSubscriptionModal(true);
      } else {
        // Fallback to old modal for other types
        console.log("🔍 Using fallback modal for type:", type);
        setManagerType(type);
        setShowManager(true);
      }
    },
    [showProductModal, showSubscriptionModal, showManager, managerType]
  );

  const handleCloseManager = useCallback(() => {
    console.log("🔍 Closing manager modal");
    setShowManager(false);
    // Reset manager type after a brief delay to prevent state conflicts
    setTimeout(() => {
      setManagerType("product");
    }, 100);
  }, []);

  // Simplified update field helper - Remove aggressive debouncing for better responsiveness
  const updateField = useCallback(
    (updates) => {
      const currentSubFields = subFields;
      const updatedSubFields = {
        ...currentSubFields,
        ...updates,
      };

      // Simple change detection
      const hasChanges =
        JSON.stringify(currentSubFields) !== JSON.stringify(updatedSubFields);

      if (hasChanges) {
        console.log("🔍 PayPalFieldEditorTabs: Updating field", {
          updates,
          selectedFieldId: fieldId,
          currentSubFields,
          updatedSubFields,
        });
        onUpdateField(fieldId, { subFields: updatedSubFields });
      }
    },
    [subFields, fieldId, onUpdateField]
  );

  // No cleanup needed since we removed debouncing

  // Get form items with memoization
  const getFormItems = useCallback(
    (type) => {
      const formItems = subFields.formItems || {};
      return Object.values(formItems).filter((item) => item.type === type);
    },
    [subFields.formItems]
  );

  // Memoized event handlers - NOW updateField is available
  const handleMerchantChange = useCallback(
    (merchantId) => {
      if (merchantId !== selectedMerchantId) {
        const previousMerchantId = selectedMerchantId;
        setSelectedMerchantId(merchantId);
        setMerchantDataLoaded(true); // Mark that merchant data has been loaded

        // Clear previous account status when merchant changes
        setAccountStatus(null);
        setCapabilities(null);

        updateField({
          merchantId: merchantId, // Legacy support - keep for backward compatibility
          merchantAccountId: merchantId, // New secure approach
          previousMerchantId: previousMerchantId || undefined,
        });
      }
    },
    [selectedMerchantId, updateField]
  );

  const handleCapabilitiesChange = useCallback((caps) => {
    setCapabilities(caps);
  }, []);

  const handlePaymentTypeChange = useCallback(
    (e) => {
      const newPaymentType = e.target.value;
      console.log(
        "🔍 Payment type change triggered:",
        paymentType,
        "->",
        newPaymentType
      );

      if (newPaymentType !== paymentType) {
        // Update local state immediately for responsive UI
        setPaymentType(newPaymentType);

        // Update field data
        updateField({ paymentType: newPaymentType });

        // Removed automatic tab switching - let user navigate manually
      }
    },
    [paymentType, updateField]
  );

  const handleAmountTypeChange = useCallback(
    (e) => {
      const newAmountType = e.target.value;
      if (newAmountType !== amountType) {
        // Update local state immediately
        setAmountType(newAmountType);

        // Update field data
        updateField({
          amount: {
            ...subFields.amount,
            type: newAmountType,
          },
        });
      }
    },
    [amountType, subFields.amount, updateField]
  );

  const handleCurrencyChange = useCallback(
    (e) => {
      const newCurrency = e.target.value;
      if (newCurrency !== currency) {
        // Update local state immediately
        setCurrency(newCurrency);

        // Update field data
        updateField({
          amount: {
            ...subFields.amount,
            currency: newCurrency,
          },
        });
      }
    },
    [currency, subFields.amount, updateField]
  );

  const handleAmountValueChange = useCallback(
    (e) => {
      const inputValue = e.target.value;
      const newValue = parseFloat(inputValue) || 0;

      console.log("🔍 Amount value change:", {
        inputValue,
        newValue,
        currentAmountValue: amountValue,
        amountType,
        paymentType,
      });

      if (newValue !== amountValue) {
        // Update local state immediately
        setAmountValue(newValue);

        // Update field data
        updateField({
          amount: {
            ...subFields.amount,
            value: newValue,
          },
        });

        console.log("🔍 Updated amount field data");
      }
    },
    [amountValue, subFields.amount, updateField, amountType, paymentType]
  );

  // Optimized account status check with proper caching
  const checkAccountStatus = useCallback(async () => {
    if (!selectedMerchantId) return;

    // If capabilities already present (from child selector), treat as active and skip network calls
    if (capabilities && Object.keys(capabilities).length > 0) {
      setAccountStatus({
        status: "active",
        lastChecked: new Date().toISOString(),
        capabilities,
        merchantId: selectedMerchantId,
      });
      return;
    }

    // Check cache first using ref
    const cacheKey = selectedMerchantId;
    const cachedData = capabilitiesCache.current[cacheKey];
    if (cachedData && Date.now() - cachedData.timestamp < 10 * 60 * 1000) {
      setCapabilities(cachedData.capabilities);
      setAccountStatus({
        status: "active",
        lastChecked: new Date(cachedData.timestamp).toISOString(),
        capabilities: cachedData.capabilities,
        merchantId: selectedMerchantId,
      });
      return;
    }

    setStatusLoading(true);
    try {
      // If merchant credentials endpoint is not configured, skip resolving
      const isCredsEndpointConfigured = !(
        (API_ENDPOINTS?.MERCHANT_CREDENTIALS || "").includes(
          "YOUR_API_GATEWAY_URL"
        ) || !API_ENDPOINTS?.MERCHANT_CREDENTIALS
      );

      let resolvedMerchantId = null;

      if (isCredsEndpointConfigured) {
        try {
          const cred = await fetchMerchantCredentialsWithCache(
            selectedMerchantId
          );
          if (cred?.success && cred.credentials?.merchantId) {
            resolvedMerchantId = cred.credentials.merchantId;
          }
        } catch (e) {
          console.warn(
            "Failed to resolve merchantId from merchantAccountId",
            e
          );
        }
      }

      // If we still don't have merchantId but capabilities may arrive from child, don't surface an error
      if (!resolvedMerchantId) {
        // Defer to capabilities coming from child; just mark status as unknown without UI error
        setAccountStatus((prev) => ({
          status: "checking",
          lastChecked: new Date().toISOString(),
          capabilities: prev?.capabilities || null,
          merchantId: undefined,
        }));
        return;
      }

      const result = await makePaymentApiRequest(
        API_ENDPOINTS.UNIFIED_PAYMENT_API,
        "POST",
        {
          action: "get-merchant-capabilities",
          merchantId: resolvedMerchantId,
        },
        "Failed to get merchant capabilities"
      );

      if (result.success) {
        const loadedCaps = result.data?.capabilities || result.capabilities;
        capabilitiesCache.current[cacheKey] = {
          capabilities: loadedCaps,
          timestamp: Date.now(),
        };
        setCapabilities(loadedCaps);
        setAccountStatus({
          status: "active",
          lastChecked: new Date().toISOString(),
          capabilities: loadedCaps,
          merchantId: resolvedMerchantId,
        });
      } else {
        // Only show error if we have no capabilities to fall back on
        setAccountStatus({
          status: "error",
          error: result.error,
          lastChecked: new Date().toISOString(),
          merchantId: resolvedMerchantId,
        });
      }
    } finally {
      setStatusLoading(false);
    }
  }, [selectedMerchantId, capabilities, makePaymentApiRequest]);

  // Only check account status when merchant actually changes (not on tab switch)
  useEffect(() => {
    if (selectedMerchantId && merchantDataLoaded) {
      // Check if we already have status for this merchant
      if (accountStatus && accountStatus.merchantId === selectedMerchantId) {
        console.log(
          "🔍 Using existing account status for:",
          selectedMerchantId
        );
        return; // Don't fetch again if we already have data for this merchant
      }

      // Only fetch if we don't have status for this merchant
      console.log("🔍 Need to fetch account status for:", selectedMerchantId);
      const timeoutId = setTimeout(() => {
        checkAccountStatus();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedMerchantId, merchantDataLoaded]); // Add merchantDataLoaded to prevent initial unnecessary fetches

  // Handle payment type changes - Simplified to prevent rendering issues
  useEffect(() => {
    // Only run when payment type actually changes from subFields
    const currentPaymentType = subFields.paymentType;
    if (currentPaymentType !== paymentType) {
      console.log(
        "🔍 Payment type changed:",
        currentPaymentType,
        "->",
        paymentType
      );

      if (paymentType === "donation" && amountType !== "custom_amount") {
        setAmountType("custom_amount");
        updateField({
          paymentType,
          amount: {
            ...subFields.amount,
            type: "custom_amount",
          },
        });
      } else if (paymentType === "donation_button") {
        updateField({
          paymentType,
          donationButtonId: subFields.donationButtonId || "",
        });
      } else if (
        paymentType === "custom_amount" &&
        amountType !== "static" &&
        amountType !== "variable"
      ) {
        setAmountType("static");
        updateField({
          paymentType,
          amount: {
            ...subFields.amount,
            type: "static",
          },
        });
      } else if (paymentType === "subscription") {
        updateField({
          paymentType,
          subscriptionManaged: true,
        });
      } else {
        // For other types, just update the payment type
        updateField({
          paymentType,
        });
      }
    }
  }, [paymentType]); // Only depend on paymentType to prevent loops

  // Sync local state with selectedField changes (for external updates) - Optimized
  useEffect(() => {
    if (fieldId && subFields) {
      // Batch state updates to prevent multiple renders
      const updates = {};

      const currentMerchantId =
        subFields.merchantAccountId || subFields.merchantId || "";
      if (currentMerchantId !== selectedMerchantId) {
        updates.merchantId = currentMerchantId;
      }

      const currentPaymentType = subFields.paymentType || "product_wise";
      if (currentPaymentType !== paymentType) {
        updates.paymentType = currentPaymentType;
      }

      if (subFields.amount?.type !== amountType) {
        updates.amountType = subFields.amount?.type || "fixed";
      }
      if (subFields.amount?.value !== amountValue) {
        updates.amountValue = subFields.amount?.value || 0;
      }
      if (subFields.amount?.currency !== currency) {
        updates.currency = subFields.amount?.currency || "USD";
      }
      if (subFields.amount?.minAmount !== minAmount) {
        updates.minAmount = subFields.amount?.minAmount || "";
      }
      if (subFields.amount?.maxAmount !== maxAmount) {
        updates.maxAmount = subFields.amount?.maxAmount || "";
      }

      // Sync payment methods state
      const currentPaymentMethods = subFields.paymentMethods || {};
      if (
        currentPaymentMethods.paypal !== undefined &&
        (currentPaymentMethods.paypal !== false) !== paypalEnabled
      ) {
        updates.paypalEnabled = currentPaymentMethods.paypal !== false;
      }
      if (
        currentPaymentMethods.cards !== undefined &&
        (currentPaymentMethods.cards !== false) !== cardsEnabled
      ) {
        updates.cardsEnabled = currentPaymentMethods.cards !== false;
      }
      if (
        currentPaymentMethods.venmo !== undefined &&
        currentPaymentMethods.venmo !== venmoEnabled
      ) {
        updates.venmoEnabled = currentPaymentMethods.venmo;
      }
      if (
        currentPaymentMethods.googlePay !== undefined &&
        currentPaymentMethods.googlePay !== googlePayEnabled
      ) {
        updates.googlePayEnabled = currentPaymentMethods.googlePay;
      }

      // Apply all updates at once
      if (Object.keys(updates).length > 0) {
        console.log("🔍 Syncing state with subFields:", updates);

        if (updates.merchantId !== undefined)
          setSelectedMerchantId(updates.merchantId);
        if (updates.paymentType !== undefined) {
          setPaymentType(updates.paymentType);
          // Force re-render by updating merchant data loaded flag
          setMerchantDataLoaded(true);
        }
        if (updates.amountType !== undefined) setAmountType(updates.amountType);
        if (updates.amountValue !== undefined)
          setAmountValue(updates.amountValue);
        if (updates.currency !== undefined) setCurrency(updates.currency);
        if (updates.minAmount !== undefined) setMinAmount(updates.minAmount);
        if (updates.maxAmount !== undefined) setMaxAmount(updates.maxAmount);
        if (updates.paypalEnabled !== undefined)
          setPaypalEnabled(updates.paypalEnabled);
        if (updates.cardsEnabled !== undefined)
          setCardsEnabled(updates.cardsEnabled);
        if (updates.venmoEnabled !== undefined)
          setVenmoEnabled(updates.venmoEnabled);
        if (updates.googlePayEnabled !== undefined)
          setGooglePayEnabled(updates.googlePayEnabled);
      }
    }
  }, [
    fieldId,
    subFields.merchantAccountId,
    subFields.merchantId,
    subFields.paymentType,
    subFields.amount,
    subFields.paymentMethods,
  ]); // Only depend on actual subField values

  // Toggle accordion sections with useCallback
  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Tab definitions - memoized to prevent re-creation
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

  if (!selectedField || selectedField.type !== "paypal_payment") {
    return null;
  }

  return (
    <div className={`paypal-field-editor-tabs ${className}`}>
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
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
                        content="Connect your verified PayPal business account to accept payments. You'll need a business account with completed verification."
                      />
                    </h4>
                    <p className="text-sm text-gray-600">
                      Select and verify your PayPal merchant account
                    </p>
                  </div>
                </div>
                {expandedSections.account ? (
                  <FaChevronDown />
                ) : (
                  <FaChevronRight />
                )}
              </button>

              {expandedSections.account && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <MerchantAccountSelector
                    selectedMerchantId={selectedMerchantId}
                    onMerchantChange={handleMerchantChange}
                    onCapabilitiesChange={handleCapabilitiesChange}
                    className="mt-4"
                    userId={userId}
                    formId={formId}
                  />

                  {/* Account Status Display */}
                  {selectedMerchantId && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Account Status
                        </span>
                        <button
                          onClick={checkAccountStatus}
                          disabled={statusLoading}
                          className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          {statusLoading ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            "Refresh"
                          )}
                        </button>
                      </div>

                      {statusLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FaSpinner className="animate-spin" />
                          <span>Checking account status...</span>
                        </div>
                      ) : accountStatus ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {accountStatus.status === "active" ? (
                              <FaCheckCircle className="text-green-600" />
                            ) : (
                              <FaExclamationTriangle className="text-red-600" />
                            )}
                            <span
                              className={`text-sm font-medium ${
                                accountStatus.status === "active"
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}
                            >
                              {accountStatus.status === "active"
                                ? "Connected & Active"
                                : "Connection Issue"}
                            </span>
                          </div>

                          {accountStatus.error && (
                            <p className="text-xs text-red-600">
                              {accountStatus.error}
                            </p>
                          )}

                          <p className="text-xs text-gray-500">
                            Last checked:{" "}
                            {new Date(
                              accountStatus.lastChecked
                            ).toLocaleString()}
                          </p>
                        </div>
                      ) : null}
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
                      content="One-time: Single payments for products/services. Subscription: Recurring payments for memberships. Donation: Flexible amounts for charitable giving."
                    />
                  </h4>
                  <p className="text-sm text-gray-600">
                    Choose the type of payment to accept
                  </p>
                </div>
              </div>

              <select
                value={paymentType}
                onChange={handlePaymentTypeChange}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="product_wise">Product-wise Payment</option>
                <option value="custom_amount">Custom Amount</option>
                <option
                  value="subscription"
                  disabled={!capabilities?.subscriptions}
                >
                  Subscription{" "}
                  {!capabilities?.subscriptions ? "(Not Available)" : ""}
                </option>
                <option value="donation" disabled={!capabilities?.donations}>
                  Donation (Custom Amount){" "}
                  {!capabilities?.donations ? "(Not Available)" : ""}
                </option>
                <option
                  value="donation_button"
                  disabled={!capabilities?.donations}
                >
                  Donation (with Button ID){" "}
                  {!capabilities?.donations ? "(Not Available)" : ""}
                </option>
              </select>

              {paymentType === "product_wise" && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FaInfoCircle className="inline text-green-600 mr-2" />
                  <span className="text-sm text-green-700">
                    <strong>Product-wise payment selected!</strong> Go to the
                    "Payment Configuration" tab to manage your products and set
                    up pricing.
                  </span>
                </div>
              )}

              {paymentType !== "product_wise" &&
                paymentType !== "custom_amount" && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FaInfoCircle className="inline text-green-600 mr-2" />
                    <span className="text-sm text-green-700">
                      <strong>Payment type selected!</strong> Now go to the
                      "Payment Configuration" tab to set up your{" "}
                      {paymentType === "donation_button"
                        ? "donation button"
                        : paymentType.replace("_", " ")}{" "}
                      details.
                    </span>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Payment Configuration Tab */}
        {activeTab === "configuration" && (
          <div className="space-y-6">
            {/* Configuration based on payment type */}
            {paymentType === "product_wise" && (
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
                        onClick={() => {
                          console.log("🔍 Product Management button clicked");
                          handleOpenManager("product");
                        }}
                        className="px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
                      >
                        Manage Products
                      </button>
                    </div>

                    <div className="text-xs text-green-700">
                      Click "Manage Products" to add products, set prices,
                      configure SKUs, and import from PayPal
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <FaInfoCircle className="inline text-blue-600 mr-2" />
                    <span className="text-sm text-blue-700">
                      Products are stored with your form and can include price,
                      currency, SKU, and inventory. This works similar to
                      Jotform's product configuration.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {paymentType === "custom_amount" && (
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
                      value={amountType}
                      onChange={handleAmountTypeChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="static">
                        Static Amount (Fixed Price)
                      </option>
                      <option value="variable">
                        Variable Amount (User Choice)
                      </option>
                    </select>
                  </div>

                  {amountType === "static" && (
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
                          step="0.01"
                          min="0"
                          value={amountValue || ""}
                          onChange={handleAmountValueChange}
                          className="w-full pl-8 pr-16 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          placeholder="Enter amount (e.g., 25.00)"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">
                            {currency}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        This is the fixed amount users will pay. Enter the exact
                        price for your product or service.
                      </p>

                      {/* Currency selector for static amount */}
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                          Currency
                        </label>
                        <select
                          value={currency}
                          onChange={handleCurrencyChange}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {amountType === "variable" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={minAmount}
                          onChange={(e) => {
                            setMinAmount(e.target.value);
                            updateField({
                              amount: {
                                ...subFields.amount,
                                minAmount: e.target.value,
                              },
                            });
                          }}
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
                          step="0.01"
                          min="0"
                          value={maxAmount}
                          onChange={(e) => {
                            setMaxAmount(e.target.value);
                            updateField({
                              amount: {
                                ...subFields.amount,
                                maxAmount: e.target.value,
                              },
                            });
                          }}
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
                      value={currency}
                      onChange={handleCurrencyChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {paymentType === "subscription" && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <FaReceipt className="text-purple-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Subscription Management
                    </h4>
                    <p className="text-sm text-gray-600">
                      Manage subscription plans and settings
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Enhanced Subscription Management Section */}
                  <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FaReceipt className="text-purple-600 text-lg" />
                        <div>
                          <span className="text-sm font-semibold text-purple-800">
                            Subscription Plans
                          </span>
                          <p className="text-xs text-purple-600">
                            Create and manage recurring payment plans
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          console.log(
                            "🔍 Subscription Management button clicked"
                          );
                          handleOpenManager("subscription");
                        }}
                        className="px-6 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
                      >
                        Manage Subscriptions
                      </button>
                    </div>

                    <div className="text-xs text-purple-700">
                      Click "Manage Subscriptions" to create plans, set billing
                      cycles, and configure recurring payments
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentType === "donation" && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <FaHeart className="text-red-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Donation (Custom Amount)
                    </h4>
                    <p className="text-sm text-gray-600">
                      Configure custom amount donation settings
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Suggested Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountValue}
                        onChange={handleAmountValueChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="25.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={handleCurrencyChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Amount (Optional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={minAmount}
                        onChange={(e) => {
                          setMinAmount(e.target.value);
                          updateField({
                            amount: {
                              ...subFields.amount,
                              minAmount: e.target.value,
                            },
                          });
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Amount (Optional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={maxAmount}
                        onChange={(e) => {
                          setMaxAmount(e.target.value);
                          updateField({
                            amount: {
                              ...subFields.amount,
                              maxAmount: e.target.value,
                            },
                          });
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1000.00"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Donation Presets
                      </span>
                      <p className="text-xs text-gray-500">
                        Manage donation presets and options
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenManager("donation")}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Manage Donations
                    </button>
                  </div>
                </div>
              </div>
            )}

            {paymentType === "donation_button" && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <FaHeart className="text-red-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Donation (with Button ID)
                    </h4>
                    <p className="text-sm text-gray-600">
                      Use existing PayPal donation button
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PayPal Button ID
                    </label>
                    <input
                      type="text"
                      value={subFields.donationButtonId || ""}
                      onChange={(e) => {
                        updateField({
                          donationButtonId: e.target.value,
                        });
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter PayPal donation button ID"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Get this ID from your PayPal business account donation
                      button
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <FaInfoCircle className="inline text-blue-600 mr-2" />
                    <span className="text-sm text-blue-700">
                      No additional configuration needed. The button will use
                      the settings from your PayPal account.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Methods - Only show for types that support multiple methods */}
        {paymentType !== "donation_button" &&
          paymentType !== "subscription" && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection("paymentMethods")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FaCreditCard className="text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Payment Methods
                    </h4>
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
                        checked={paypalEnabled}
                        onChange={(e) => {
                          setPaypalEnabled(e.target.checked);
                          updateField({
                            paymentMethods: {
                              ...selectedField.subFields.paymentMethods,
                              paypal: e.target.checked,
                            },
                          });
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">PayPal</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cardsEnabled}
                        onChange={(e) => {
                          setCardsEnabled(e.target.checked);
                          updateField({
                            paymentMethods: {
                              ...selectedField.subFields.paymentMethods,
                              cards: e.target.checked,
                            },
                          });
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Credit/Debit Cards
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={venmoEnabled}
                        disabled={!capabilities?.venmo}
                        onChange={(e) => {
                          setVenmoEnabled(e.target.checked);
                          updateField({
                            paymentMethods: {
                              ...selectedField.subFields.paymentMethods,
                              venmo: e.target.checked,
                            },
                          });
                        }}
                        className="mr-2"
                      />
                      <span
                        className={`text-sm ${
                          !capabilities?.venmo
                            ? "text-gray-400"
                            : "text-gray-700"
                        }`}
                      >
                        Venmo {!capabilities?.venmo ? "(Not Available)" : ""}
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={googlePayEnabled}
                        disabled={!capabilities?.googlePay}
                        onChange={(e) => {
                          setGooglePayEnabled(e.target.checked);
                          updateField({
                            paymentMethods: {
                              ...selectedField.subFields.paymentMethods,
                              googlePay: e.target.checked,
                            },
                          });
                        }}
                        className="mr-2"
                      />
                      <span
                        className={`text-sm ${
                          !capabilities?.googlePay
                            ? "text-gray-400"
                            : "text-gray-700"
                        }`}
                      >
                        Google Pay{" "}
                        {!capabilities?.googlePay ? "(Not Available)" : ""}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* PayPal Only Notice for donation_button and subscription */}
        {(paymentType === "donation_button" ||
          paymentType === "subscription") && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FaCreditCard className="text-blue-600" />
              <div>
                <h4 className="font-medium text-gray-900">Payment Method</h4>
                <p className="text-sm text-gray-600">
                  PayPal button only - no other payment methods available
                </p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FaInfoCircle className="inline text-blue-600 mr-2" />
              <span className="text-sm text-blue-700">
                {paymentType === "donation_button"
                  ? "Donation buttons use PayPal's hosted button configuration."
                  : "Subscription payments are processed through PayPal only."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings Tab */}
      {activeTab === "advanced" && (
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
              {expandedSections.behavior ? (
                <FaChevronDown />
              ) : (
                <FaChevronRight />
              )}
            </button>

            {expandedSections.behavior && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-3 mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={collectBillingAddress}
                      onChange={(e) => {
                        setCollectBillingAddress(e.target.checked);
                        updateField({
                          behavior: {
                            ...selectedField.subFields.behavior,
                            collectBillingAddress: e.target.checked,
                          },
                        });
                      }}
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
                      checked={collectShippingAddress}
                      onChange={(e) => {
                        setCollectShippingAddress(e.target.checked);
                        updateField({
                          behavior: {
                            ...selectedField.subFields.behavior,
                            collectShippingAddress: e.target.checked,
                          },
                        });
                      }}
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
                    Payment methods availability depends on your merchant
                    account capabilities
                  </li>
                  <li>
                    Test your payment configuration before publishing the form
                  </li>
                  <li>All payment data is processed securely through PayPal</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Product Manager Modal (Legacy - for donations) */}
      {showManager && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && handleCloseManager()}
        >
          <div className="bg-white rounded-lg max-w-5xl w-full m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                Manage Form{" "}
                {managerType.charAt(0).toUpperCase() + managerType.slice(1)}s
              </h2>
              <button
                onClick={handleCloseManager}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FormProductManager
                selectedField={selectedField}
                onUpdateField={onUpdateField}
                selectedMerchantId={selectedMerchantId}
                typeFilter={managerType}
                onClose={handleCloseManager}
              />
            </div>
          </div>
        </div>
      )}

      {/* Product Management Modal */}
      <ProductManagementModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        selectedField={selectedField}
        onUpdateField={onUpdateField}
        selectedMerchantId={selectedMerchantId}
      />

      {/* Subscription Management Modal */}
      <SubscriptionManagementModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        selectedField={selectedField}
        onUpdateField={onUpdateField}
        selectedMerchantId={selectedMerchantId}
      />
    </div>
  );
};

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
      <PayPalFieldEditorTabsInternal
        selectedField={selectedField}
        onUpdateField={onUpdateField}
        className={className}
      />
    </PaymentProvider>
  );
};

export default PayPalFieldEditorTabs;
