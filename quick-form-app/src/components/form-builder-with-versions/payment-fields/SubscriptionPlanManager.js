import React, { useState, useEffect } from "react";
import {
  FaSync,
  FaClock,
  FaLayerGroup,
  FaPlus,
  FaTrash,
  FaInfoCircle,
  FaChevronDown,
  FaChevronRight,
  FaSpinner,
  FaList,
  FaToggleOn,
  FaToggleOff,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { fetchPaypalSubscriptions } from "./paypal/api/paypalApi";

/**
 * SubscriptionPlanManager Component
 *
 * Replaces the direct "Save Plan" functionality with:
 * - Manage existing plans
 * - Select from existing PayPal subscriptions
 * - Toggle between create new vs select existing
 * - Plan selection dropdown
 */
const SubscriptionPlanManager = ({
  subscriptionConfig = {},
  onConfigChange,
  merchantCapabilities = {},
  selectedMerchantId,
}) => {
  const [config, setConfig] = useState({
    name: "",
    description: "",
    frequency: "MONTH",
    interval: 1,
    totalCycles: 0,
    price: 0,
    currency: "USD",
    setupFee: 0,
    taxPercentage: 0,
    trialPeriod: {
      enabled: false,
      unit: "DAY",
      count: 7,
      price: 0,
    },
    tieredPricing: {
      enabled: false,
      tiers: [
        { startingQuantity: 1, endingQuantity: 10, price: 29.99 },
        { startingQuantity: 11, endingQuantity: 50, price: 24.99 },
        { startingQuantity: 51, endingQuantity: null, price: 19.99 },
      ],
    },
    advancedSettings: {
      autoBillOutstanding: true,
      setupFeeFailureAction: "CONTINUE",
      paymentFailureThreshold: 3,
      cancelUrl: "",
      returnUrl: "",
    },
    ...subscriptionConfig,
  });

  // New state for plan management
  const [useExistingPlan, setUseExistingPlan] = useState(false);
  const [existingPlans, setExistingPlans] = useState([]);
  const [selectedExistingPlan, setSelectedExistingPlan] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [managedPlans, setManagedPlans] = useState([]);

  const [expandedSections, setExpandedSections] = useState({
    planSelection: true,
    basic: false,
    trial: false,
    tiered: false,
    advanced: false,
  });

  useEffect(() => {
    onConfigChange?.({
      ...config,
      useExistingPlan,
      selectedExistingPlan,
    });
  }, [config, useExistingPlan, selectedExistingPlan]);

  // Load existing PayPal subscriptions when merchant changes
  useEffect(() => {
    if (selectedMerchantId && useExistingPlan) {
      loadExistingPlans();
    }
  }, [selectedMerchantId, useExistingPlan]);

  const loadExistingPlans = async () => {
    if (!selectedMerchantId) return;

    setLoadingPlans(true);
    try {
      const result = await fetchPaypalSubscriptions(selectedMerchantId);
      if (result.success) {
        setExistingPlans(result.subscriptions || []);
      } else {
        console.error("Failed to load existing plans:", result.error);
        setExistingPlans([]);
      }
    } catch (error) {
      console.error("Error loading existing plans:", error);
      setExistingPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const updateConfig = (updates) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const updateNestedConfig = (section, updates) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const addTier = () => {
    const newTier = {
      startingQuantity:
        config.tieredPricing.tiers.length > 0
          ? config.tieredPricing.tiers[config.tieredPricing.tiers.length - 1]
              .endingQuantity + 1
          : 1,
      endingQuantity: null,
      price: 0,
    };

    updateNestedConfig("tieredPricing", {
      tiers: [...config.tieredPricing.tiers, newTier],
    });
  };

  const removeTier = (index) => {
    const updatedTiers = config.tieredPricing.tiers.filter(
      (_, i) => i !== index
    );
    updateNestedConfig("tieredPricing", { tiers: updatedTiers });
  };

  const updateTier = (index, updates) => {
    const updatedTiers = config.tieredPricing.tiers.map((tier, i) =>
      i === index ? { ...tier, ...updates } : tier
    );
    updateNestedConfig("tieredPricing", { tiers: updatedTiers });
  };

  return (
    <div className="subscription-plan-manager space-y-4">
      {/* Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaList className="text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-800">
              Subscription Plan Management
            </h3>
          </div>
        </div>
        <p className="text-sm text-purple-700">
          Manage subscription plans - create new or select from existing PayPal
          subscriptions
        </p>
      </div>

      {/* Plan Selection Mode */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("planSelection")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaSync className="text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Plan Selection Mode</h4>
              <p className="text-sm text-gray-600">
                {useExistingPlan
                  ? "Using existing PayPal subscription"
                  : "Creating new subscription plan"}
              </p>
            </div>
          </div>
          {expandedSections.planSelection ? (
            <FaChevronDown />
          ) : (
            <FaChevronRight />
          )}
        </button>

        {expandedSections.planSelection && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-4 space-y-4">
              {/* Toggle between create new vs select existing */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900">Plan Source</h5>
                  <p className="text-sm text-gray-600">
                    {useExistingPlan
                      ? "Select from your existing PayPal subscriptions"
                      : "Create a new subscription plan"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUseExistingPlan(!useExistingPlan);
                    if (!useExistingPlan && selectedMerchantId) {
                      loadExistingPlans();
                    }
                  }}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  {useExistingPlan ? (
                    <>
                      <FaToggleOn size={20} />
                      <span className="text-sm">Use Existing</span>
                    </>
                  ) : (
                    <>
                      <FaToggleOff size={20} />
                      <span className="text-sm">Create New</span>
                    </>
                  )}
                </button>
              </div>

              {/* Existing Plan Selection */}
              {useExistingPlan && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Existing Subscription
                    </label>
                    <button
                      onClick={loadExistingPlans}
                      disabled={loadingPlans || !selectedMerchantId}
                      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {loadingPlans ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </button>
                  </div>

                  {!selectedMerchantId ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <FaInfoCircle className="inline text-yellow-600 mr-2" />
                      <span className="text-sm text-yellow-700">
                        Please select a merchant account first
                      </span>
                    </div>
                  ) : loadingPlans ? (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FaSpinner className="animate-spin text-gray-600" />
                        <span className="text-sm text-gray-600">
                          Loading existing subscriptions...
                        </span>
                      </div>
                    </div>
                  ) : existingPlans.length === 0 ? (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <FaInfoCircle className="inline text-gray-600 mr-2" />
                      <span className="text-sm text-gray-600">
                        No existing subscriptions found for this merchant
                        account
                      </span>
                    </div>
                  ) : (
                    <select
                      value={selectedExistingPlan}
                      onChange={(e) => setSelectedExistingPlan(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a subscription plan...</option>
                      {existingPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} -{" "}
                          {
                            plan.billing_cycles?.[0]?.pricing_scheme
                              ?.fixed_price?.value
                          }{" "}
                          {
                            plan.billing_cycles?.[0]?.pricing_scheme
                              ?.fixed_price?.currency_code
                          }{" "}
                          / {plan.billing_cycles?.[0]?.frequency?.interval_unit}
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedExistingPlan && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <FaInfoCircle className="inline text-green-600 mr-2" />
                          <span className="text-sm text-green-700">
                            Selected plan will be used for this form field
                          </span>
                        </div>
                        <a
                          href={`https://www.sandbox.paypal.com/billing/plans/${selectedExistingPlan}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          View in PayPal <FaExternalLinkAlt />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Managed Plans List */}
              {managedPlans.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-gray-900 mb-2">
                    Managed Plans
                  </h5>
                  <div className="space-y-2">
                    {managedPlans.map((plan, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm text-gray-700">
                          {plan.name}
                        </span>
                        <button
                          onClick={() => {
                            setManagedPlans(
                              managedPlans.filter((_, i) => i !== index)
                            );
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Configuration sections - only show when creating new plan */}
      {!useExistingPlan && (
        <>
          {/* Basic Configuration */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection("basic")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <FaSync className="text-purple-600" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Basic Plan Settings
                  </h4>
                  <p className="text-sm text-gray-600">
                    Plan name, pricing, and billing frequency
                  </p>
                </div>
              </div>
              {expandedSections.basic ? <FaChevronDown /> : <FaChevronRight />}
            </button>

            {expandedSections.basic && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plan Name *
                    </label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => updateConfig({ name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Premium Monthly Plan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={config.currency}
                      onChange={(e) =>
                        updateConfig({ currency: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={config.description}
                      onChange={(e) =>
                        updateConfig({ description: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows="2"
                      placeholder="Describe what this subscription includes..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Billing Frequency
                    </label>
                    <select
                      value={config.frequency}
                      onChange={(e) =>
                        updateConfig({ frequency: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="DAY">Daily</option>
                      <option value="WEEK">Weekly</option>
                      <option value="MONTH">Monthly</option>
                      <option value="YEAR">Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Billing Interval
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={config.interval}
                      onChange={(e) =>
                        updateConfig({
                          interval: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Every {config.interval} {config.frequency.toLowerCase()}
                      (s)
                    </p>
                  </div>

                  {!config.tieredPricing.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price ({config.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.price}
                        onChange={(e) =>
                          updateConfig({
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="29.99"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Billing Cycles
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={config.totalCycles}
                      onChange={(e) =>
                        updateConfig({
                          totalCycles: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      0 = Infinite (until cancelled)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trial Period Configuration */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection("trial")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <FaClock className="text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Trial Period Settings
                  </h4>
                  <p className="text-sm text-gray-600">
                    {config.trialPeriod.enabled
                      ? `${
                          config.trialPeriod.count
                        } ${config.trialPeriod.unit.toLowerCase()}(s) trial`
                      : "No trial period configured"}
                  </p>
                </div>
              </div>
              {expandedSections.trial ? <FaChevronDown /> : <FaChevronRight />}
            </button>

            {expandedSections.trial && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="mt-4">
                  <label className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={config.trialPeriod.enabled}
                      onChange={(e) =>
                        updateNestedConfig("trialPeriod", {
                          enabled: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable Trial Period
                    </span>
                  </label>

                  {config.trialPeriod.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trial Duration
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={config.trialPeriod.count}
                          onChange={(e) =>
                            updateNestedConfig("trialPeriod", {
                              count: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trial Unit
                        </label>
                        <select
                          value={config.trialPeriod.unit}
                          onChange={(e) =>
                            updateNestedConfig("trialPeriod", {
                              unit: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="DAY">Days</option>
                          <option value="WEEK">Weeks</option>
                          <option value="MONTH">Months</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trial Price ({config.currency})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={config.trialPeriod.price}
                          onChange={(e) =>
                            updateNestedConfig("trialPeriod", {
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          0.00 = Free trial
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tiered Pricing Configuration */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection("tiered")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <FaLayerGroup className="text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Tiered Pricing</h4>
                  <p className="text-sm text-gray-600">
                    {config.tieredPricing.enabled
                      ? `${config.tieredPricing.tiers.length} pricing tiers configured`
                      : "Fixed pricing (no tiers)"}
                  </p>
                </div>
              </div>
              {expandedSections.tiered ? <FaChevronDown /> : <FaChevronRight />}
            </button>

            {expandedSections.tiered && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="mt-4">
                  <label className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={config.tieredPricing.enabled}
                      onChange={(e) =>
                        updateNestedConfig("tieredPricing", {
                          enabled: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable Tiered Pricing
                    </span>
                  </label>

                  {config.tieredPricing.enabled && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FaInfoCircle className="text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Tiered Pricing Information
                          </span>
                        </div>
                        <p className="text-xs text-green-700">
                          Set different prices based on quantity. Lower
                          quantities can have higher per-unit prices,
                          encouraging customers to purchase more for better
                          value.
                        </p>
                      </div>

                      {config.tieredPricing.tiers.map((tier, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-gray-900">
                              Tier {index + 1}
                            </h5>
                            {config.tieredPricing.tiers.length > 1 && (
                              <button
                                onClick={() => removeTier(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <FaTrash size={14} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Starting Quantity
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={tier.startingQuantity}
                                onChange={(e) =>
                                  updateTier(index, {
                                    startingQuantity:
                                      parseInt(e.target.value) || 1,
                                  })
                                }
                                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Ending Quantity
                              </label>
                              <input
                                type="number"
                                min={tier.startingQuantity}
                                value={tier.endingQuantity || ""}
                                onChange={(e) =>
                                  updateTier(index, {
                                    endingQuantity: e.target.value
                                      ? parseInt(e.target.value)
                                      : null,
                                  })
                                }
                                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Unlimited"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Leave empty for unlimited
                              </p>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Price per Unit ({config.currency})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tier.price}
                                onChange={(e) =>
                                  updateTier(index, {
                                    price: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={addTier}
                        className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors"
                      >
                        <FaPlus className="inline mr-2" />
                        Add Pricing Tier
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection("advanced")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <FaInfoCircle className="text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Advanced Settings
                  </h4>
                  <p className="text-sm text-gray-600">
                    Setup fees, failure handling, and URLs
                  </p>
                </div>
              </div>
              {expandedSections.advanced ? (
                <FaChevronDown />
              ) : (
                <FaChevronRight />
              )}
            </button>

            {expandedSections.advanced && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Setup Fee ({config.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.setupFee}
                      onChange={(e) =>
                        updateConfig({
                          setupFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Percentage (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={config.taxPercentage}
                      onChange={(e) =>
                        updateConfig({
                          taxPercentage: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Failure Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.advancedSettings.paymentFailureThreshold}
                      onChange={(e) =>
                        updateNestedConfig("advancedSettings", {
                          paymentFailureThreshold:
                            parseInt(e.target.value) || 3,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Cancel subscription after this many failed payments
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Setup Fee Failure Action
                    </label>
                    <select
                      value={config.advancedSettings.setupFeeFailureAction}
                      onChange={(e) =>
                        updateNestedConfig("advancedSettings", {
                          setupFeeFailureAction: e.target.value,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      <option value="CONTINUE">Continue subscription</option>
                      <option value="CANCEL">Cancel subscription</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.advancedSettings.autoBillOutstanding}
                        onChange={(e) =>
                          updateNestedConfig("advancedSettings", {
                            autoBillOutstanding: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Automatically bill outstanding amounts
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionPlanManager;
