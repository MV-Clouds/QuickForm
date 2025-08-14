import React, { useState, useEffect } from "react";
import {
  FaCreditCard,
  FaCog,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaLock,
  FaReceipt,
  FaHeart,
  FaSync,
  FaPlus,
  FaChevronRight,
  FaChevronDown,
} from "react-icons/fa";
import PayPalPaymentField from "./paypal/components/PayPalPaymentField";
import {
  fetchOnboardedAccounts,
  initiatePayment,
} from "./paypal/api/paypalApi";
import SubscriptionManager from "./SubscriptionManager";

/**
 * Enhanced PaymentSidebar Component
 *
 * Professional sectionized sidebar with proper tabs and payment type configuration
 * Features: Payment fields, merchant management, payment type settings, advanced configuration
 */
const PaymentSidebar = ({ fields = [], onDragStart, onDragEnd }) => {
  const [activePaymentTab, setActivePaymentTab] = useState("fields");
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [merchantAccounts, setMerchantAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState("one_time");
  const [capabilities, setCapabilities] = useState(null);
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    paymentFields: true,
    merchantInfo: true,
    paymentConfig: true,
    advancedSettings: false,
    manageSubscriptions: false,
  });

  // Load merchant accounts on component mount
  useEffect(() => {
    loadMerchantAccounts();
  }, []);

  const loadMerchantAccounts = async () => {
    setLoading(true);
    try {
      const result = await fetchOnboardedAccounts();
      if (result.success) {
        setMerchantAccounts(result.accounts || []);
        // Auto-select first account if available
        if (result.accounts && result.accounts.length > 0) {
          setSelectedMerchant(result.accounts[0].Merchant_ID__c);
        }
      }
    } catch (error) {
      console.error("Failed to load merchant accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if payment field already exists
  const hasPaymentField = fields.some(
    (field) => field.type === "paypal_payment"
  );

  // Check merchant capabilities when selected
  useEffect(() => {
    if (selectedMerchant) {
      checkMerchantCapabilities();
    }
  }, [selectedMerchant]);

  const checkMerchantCapabilities = async () => {
    try {
      const result = await initiatePayment({
        action: "get-merchant-capabilities",
        merchantId: selectedMerchant,
      });

      if (result.success) {
        setCapabilities(result.capabilities);
      }
    } catch (error) {
      console.error("Failed to check capabilities:", error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Enhanced payment tabs configuration
  const paymentTabs = [
    {
      id: "fields",
      label: "Payment Fields",
      icon: FaCreditCard,
      description: "Add payment fields to your form",
      disabled: false,
      badge: hasPaymentField ? "1" : null,
    },
    // Keep only payment-related tabs; remove non-payment extras
    {
      id: "merchant",
      label: "Merchant Setup",
      icon: FaCog,
      description: "Configure merchant accounts",
      disabled: false,
      badge:
        merchantAccounts.length > 0 ? merchantAccounts.length.toString() : null,
    },
    {
      id: "payment-type",
      label: "Payment Type",
      icon: FaReceipt,
      description: "Configure payment type and settings",
      disabled: !selectedMerchant,
      badge: selectedMerchant && paymentType !== "one_time" ? "●" : null,
    },
  ];

  return (
    <div className="payment-sidebar h-full flex flex-col">
      {/* Enhanced Payment Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <div className="grid grid-cols-2 gap-1">
          {paymentTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActivePaymentTab(tab.id)}
                disabled={tab.disabled}
                className={`relative py-3 px-2 text-xs font-medium transition-colors border-b-2 ${
                  activePaymentTab === tab.id
                    ? "text-blue-600 border-blue-600 bg-blue-50"
                    : tab.disabled
                    ? "text-gray-400 border-transparent cursor-not-allowed opacity-50"
                    : "text-gray-600 border-transparent hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                }`}
                title={
                  tab.disabled
                    ? tab.id === "payment-type"
                      ? "Select a merchant account first"
                      : tab.id === "advanced"
                      ? "Configure merchant and payment type first"
                      : tab.description
                    : tab.description
                }
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <Icon size={14} />
                    {tab.badge && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-center leading-tight">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Payment Fields Tab */}
        {activePaymentTab === "fields" && (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Available Payment Fields
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                Drag payment fields to your form to start accepting payments
              </p>
            </div>

            <div className="space-y-2">
              <PayPalPaymentField
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                fields={fields}
              />

              {/* Future payment gateways */}
              <div className="opacity-50 pointer-events-none">
                <div className="field-item flex items-center justify-between p-2 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-200">
                      <FaCreditCard className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-400">
                        Stripe Payment
                      </span>
                      <span className="text-xs block text-gray-400">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                  <FaLock className="text-gray-400" size={12} />
                </div>
              </div>

              <div className="opacity-50 pointer-events-none">
                <div className="field-item flex items-center justify-between p-2 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-200">
                      <FaCreditCard className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-400">
                        Razorpay Payment
                      </span>
                      <span className="text-xs block text-gray-400">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                  <FaLock className="text-gray-400" size={12} />
                </div>
              </div>
            </div>

            {hasPaymentField && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Payment Field Added
                    </p>
                    <p className="text-xs text-blue-600">
                      Configure your payment settings in the other tabs
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Merchant Account Tab */}
        {activePaymentTab === "merchant" && (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Merchant Account
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                Select the merchant account to use for payment processing
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <FaSpinner className="animate-spin text-blue-600 mr-2" />
                <span className="text-sm text-gray-600">
                  Loading accounts...
                </span>
              </div>
            ) : merchantAccounts.length > 0 ? (
              <div className="space-y-3">
                {merchantAccounts.map((account) => (
                  <div
                    key={account.Id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMerchant === account.Merchant_ID__c
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedMerchant(account.Merchant_ID__c)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {account.Name}
                        </h4>
                        <p className="text-xs text-gray-600">
                          ID: {account.Merchant_ID__c}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.Status__c === "Active" ? (
                          <FaCheckCircle className="text-green-600" size={16} />
                        ) : (
                          <FaExclamationTriangle
                            className="text-yellow-600"
                            size={16}
                          />
                        )}
                        {selectedMerchant === account.Merchant_ID__c && (
                          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          account.Status__c === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {account.Status__c}
                      </span>
                    </div>
                  </div>
                ))}

                <button
                  onClick={loadMerchantAccounts}
                  className="w-full mt-3 py-2 px-4 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Refresh Accounts
                </button>
              </div>
            ) : (
              <div className="text-center p-8">
                <FaExclamationTriangle
                  className="mx-auto text-yellow-600 mb-3"
                  size={24}
                />
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  No Merchant Accounts
                </h4>
                <p className="text-xs text-gray-600 mb-4">
                  You need to connect a PayPal merchant account to accept
                  payments
                </p>
                <button
                  onClick={loadMerchantAccounts}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Merchant Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* Payment Type Configuration Tab */}
        {activePaymentTab === "payment-type" && (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Payment Type Configuration
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                Configure payment type and specific settings for your selected
                merchant
              </p>
            </div>

            {selectedMerchant ? (
              <div className="space-y-4">
                {/* Selected Merchant Info */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FaCheckCircle className="text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Active Merchant
                      </p>
                      <p className="text-xs text-green-600">
                        {
                          merchantAccounts.find(
                            (acc) => acc.Merchant_ID__c === selectedMerchant
                          )?.Name
                        }{" "}
                        ({selectedMerchant})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Type Selection */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection("paymentConfig")}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <FaReceipt className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">
                        Payment Type Selection
                      </span>
                    </div>
                    {expandedSections.paymentConfig ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    )}
                  </button>

                  {expandedSections.paymentConfig && (
                    <div className="px-3 pb-3 border-t border-gray-100">
                      <div className="mt-3 space-y-3">
                        {/* Payment Type Options */}
                        <div className="grid grid-cols-1 gap-2">
                          <label className="flex items-center p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name="paymentType"
                              value="one_time"
                              checked={paymentType === "one_time"}
                              onChange={(e) => setPaymentType(e.target.value)}
                              className="mr-3"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <FaCreditCard className="text-green-600" />
                                <span className="text-sm font-medium">
                                  One-time Payment
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Single payment for products or services
                              </p>
                            </div>
                          </label>

                          <label className="flex items-center p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name="paymentType"
                              value="subscription"
                              checked={paymentType === "subscription"}
                              onChange={(e) => setPaymentType(e.target.value)}
                              className="mr-3"
                              disabled={!capabilities?.subscriptions}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <FaSync className="text-purple-600" />
                                <span className="text-sm font-medium">
                                  Subscription Payment
                                  {!capabilities?.subscriptions && (
                                    <span className="text-xs text-red-600 ml-1">
                                      (Not Available)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Recurring payments with trial periods and tiered
                                pricing
                              </p>
                            </div>
                          </label>

                          <label className="flex items-center p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name="paymentType"
                              value="donation"
                              checked={paymentType === "donation"}
                              onChange={(e) => setPaymentType(e.target.value)}
                              className="mr-3"
                              disabled={!capabilities?.donations}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <FaHeart className="text-red-600" />
                                <span className="text-sm font-medium">
                                  Donation Payment
                                  {!capabilities?.donations && (
                                    <span className="text-xs text-red-600 ml-1">
                                      (Not Available)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Flexible amounts with suggested values and
                                recurring options
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Type Specific Configuration */}
                {paymentType === "subscription" && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FaSync className="text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">
                        Subscription Features Available
                      </span>
                    </div>
                    <ul className="text-xs text-purple-700 space-y-1">
                      <li>• Trial periods (free or discounted)</li>
                      <li>• Tiered pricing based on quantity</li>
                      <li>• Volume discounts</li>
                      <li>• Setup fees and cancellation handling</li>
                      <li>• Custom billing cycles</li>
                    </ul>
                  </div>
                )}

                {paymentType === "donation" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FaHeart className="text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        Donation Features Available
                      </span>
                    </div>
                    <ul className="text-xs text-red-700 space-y-1">
                      <li>• Suggested donation amounts</li>
                      <li>• Custom amount entry</li>
                      <li>• Donor information collection</li>
                      <li>• Anonymous donation option</li>
                      <li>• Recurring donation schedules</li>
                      <li>• Impact messaging</li>
                    </ul>
                  </div>
                )}

                {/* Manage Subscriptions - Only show for subscription type */}
                {paymentType === "subscription" && (
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection("manageSubscriptions")}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <FaCog className="text-purple-600" />
                        <span className="text-sm font-medium text-gray-900">
                          Manage Subscriptions
                        </span>
                      </div>
                      {expandedSections.manageSubscriptions ? (
                        <FaChevronDown />
                      ) : (
                        <FaChevronRight />
                      )}
                    </button>

                    {expandedSections.manageSubscriptions && (
                      <div className="px-3 pb-3 border-t border-gray-100">
                        <div className="mt-3 space-y-3">
                          <p className="text-xs text-gray-600">
                            View and manage existing subscription plans for this
                            merchant account
                          </p>

                          <button
                            onClick={() => setShowSubscriptionManager(true)}
                            className="w-full py-2 px-3 text-sm text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <FaCog size={12} />
                            View Subscriptions
                          </button>

                          <div className="text-xs text-gray-500 space-y-1">
                            <p>• View existing subscription plans</p>
                            <p>• Remove plans from forms</p>
                            <p>• Check plan status and details</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Next Steps */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FaPlus className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Ready to Configure
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Add a payment field to your form to configure detailed{" "}
                        {paymentType.replace("_", "-")} settings
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <FaLock className="mx-auto text-gray-400 mb-3" size={24} />
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Merchant Account Required
                </h4>
                <p className="text-xs text-gray-600">
                  Please select a merchant account in the Merchant Setup tab
                  first
                </p>
              </div>
            )}
          </div>
        )}

        {/* Advanced Settings Tab removed to simplify to payment-only essentials */}
      </div>

      {/* Footer Info */}
      <div className="border-t border-gray-200 p-3">
        <div className="text-xs text-gray-500 text-center">
          {hasPaymentField ? (
            <span className="text-green-600">
              ✓ Payment field added to form
            </span>
          ) : (
            <span>Add a payment field to start accepting payments</span>
          )}
        </div>
      </div>

      {/* Subscription Manager Modal */}
      {showSubscriptionManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <SubscriptionManager
              merchantId={selectedMerchant}
              onSubscriptionSelect={(subscription) => {
                console.log("Selected subscription:", subscription);
                setShowSubscriptionManager(false);
                // TODO: Apply subscription to payment field
              }}
              onClose={() => setShowSubscriptionManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSidebar;
