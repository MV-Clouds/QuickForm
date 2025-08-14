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
  FaList,
  FaCog,
} from "react-icons/fa";
import FormSubscriptionManager from "./FormSubscriptionManager";

/**
 * ImprovedSubscriptionConfig Component
 *
 * Handles subscription configuration with:
 * - Two pricing types: Normal and Tiered-based
 * - Manage Subscription button that opens modal
 * - Add Subscription from PayPal functionality
 * - Proper amount handling based on pricing type
 */
const ImprovedSubscriptionConfig = ({
  subscriptionConfig = {},
  onConfigChange,
  merchantCapabilities = {},
  selectedMerchantId,
  formId,
}) => {
  const [config, setConfig] = useState({
    name: "",
    description: "",
    frequency: "MONTH",
    interval: 1,
    totalCycles: 0,
    currency: "USD",
    setupFee: 0,
    taxPercentage: 0,

    // Pricing configuration
    pricingType: "normal", // "normal" or "tiered"
    normalPrice: 0, // Used when pricingType is "normal"

    // Trial period configuration
    trialPeriod: {
      enabled: false,
      unit: "DAY",
      count: 7,
      price: 0,
    },

    // Tiered pricing configuration
    tieredPricing: {
      enabled: false,
      tiers: [
        { startingQuantity: 1, endingQuantity: 10, price: 29.99 },
        { startingQuantity: 11, endingQuantity: 50, price: 24.99 },
        { startingQuantity: 51, endingQuantity: null, price: 19.99 },
      ],
    },

    // Advanced settings
    advancedSettings: {
      autoBillOutstanding: true,
      setupFeeFailureAction: "CONTINUE",
      paymentFailureThreshold: 3,
      cancelUrl: "",
      returnUrl: "",
    },

    ...subscriptionConfig,
  });

  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    pricing: true,
    trial: false,
    advanced: false,
  });

  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);

  useEffect(() => {
    // Update tiered pricing enabled based on pricing type
    const updatedConfig = {
      ...config,
      tieredPricing: {
        ...config.tieredPricing,
        enabled: config.pricingType === "tiered",
      },
    };

    onConfigChange?.(updatedConfig);
  }, [config]);

  // Auto-resequence tiers when component loads or tiers change
  useEffect(() => {
    if (
      config.pricingType === "tiered" &&
      config.tieredPricing.tiers.length > 0
    ) {
      const resequencedTiers = resequenceTiers(config.tieredPricing.tiers);

      // Only update if the sequence has actually changed
      const hasChanged =
        JSON.stringify(resequencedTiers) !==
        JSON.stringify(config.tieredPricing.tiers);

      if (hasChanged) {
        console.log("🔄 Auto-resequencing tiered pricing tiers");
        updateNestedConfig("tieredPricing", {
          tiers: resequencedTiers,
        });
      }
    }
  }, [config.tieredPricing.tiers.length]); // Only run when tier count changes

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

  // Function to resequence tiers according to the rules:
  // 1. First tier always starts at 1
  // 2. Each subsequent tier starts at previous tier's ending + 1
  // 3. Last tier always has null ending (infinite)
  // 4. If a tier doesn't have an ending quantity, set a reasonable default
  const resequenceTiers = (tiers) => {
    if (tiers.length === 0) return tiers;

    return tiers.map((tier, index) => {
      const isFirstTier = index === 0;
      const isLastTier = index === tiers.length - 1;

      let startingQuantity = 1; // First tier always starts at 1
      let endingQuantity = tier.endingQuantity;

      if (!isFirstTier) {
        // For non-first tiers, start at previous tier's ending + 1
        const previousTier = tiers[index - 1];
        startingQuantity = previousTier.endingQuantity
          ? previousTier.endingQuantity + 1
          : (previousTier.startingQuantity || 1) + 10; // Fallback if previous tier has no ending
      }

      // Last tier always has null ending (infinite)
      if (isLastTier) {
        endingQuantity = null;
      } else if (!endingQuantity || endingQuantity <= startingQuantity) {
        // Set a reasonable default ending quantity if not set or invalid
        endingQuantity = startingQuantity + 9; // Default range of 10
      }

      return {
        ...tier,
        startingQuantity,
        endingQuantity,
      };
    });
  };

  const addTier = () => {
    const currentTiers = config.tieredPricing.tiers;
    let newStartingQuantity = 1;

    if (currentTiers.length > 0) {
      // Get the last tier's ending quantity
      const lastTier = currentTiers[currentTiers.length - 1];
      newStartingQuantity = lastTier.endingQuantity
        ? lastTier.endingQuantity + 1
        : 1;
    }

    const newTier = {
      startingQuantity: newStartingQuantity,
      endingQuantity: null, // Will be null for the last tier (infinite)
      price: 0,
    };

    // Update all tiers to ensure proper sequence
    const updatedTiers = [...currentTiers, newTier];
    const resequencedTiers = resequenceTiers(updatedTiers);

    updateNestedConfig("tieredPricing", {
      tiers: resequencedTiers,
    });
  };

  const removeTier = (index) => {
    const updatedTiers = config.tieredPricing.tiers.filter(
      (_, i) => i !== index
    );

    // Resequence tiers after removal
    const resequencedTiers = resequenceTiers(updatedTiers);

    updateNestedConfig("tieredPricing", { tiers: resequencedTiers });
  };

  const updateTier = (index, updates) => {
    // Validate ending quantity
    if (
      updates.hasOwnProperty("endingQuantity") &&
      updates.endingQuantity !== null
    ) {
      const currentTier = config.tieredPricing.tiers[index];

      // Ensure ending quantity is greater than starting quantity
      if (updates.endingQuantity <= currentTier.startingQuantity) {
        console.warn(
          `Ending quantity (${updates.endingQuantity}) must be greater than starting quantity (${currentTier.startingQuantity})`
        );
        updates.endingQuantity = currentTier.startingQuantity + 1;
      }
    }

    const updatedTiers = config.tieredPricing.tiers.map((tier, i) =>
      i === index ? { ...tier, ...updates } : tier
    );

    // Always resequence tiers when any quantity is updated to maintain proper sequence
    if (
      updates.hasOwnProperty("endingQuantity") ||
      updates.hasOwnProperty("startingQuantity")
    ) {
      const resequencedTiers = resequenceTiers(updatedTiers);
      updateNestedConfig("tieredPricing", { tiers: resequencedTiers });
    } else {
      updateNestedConfig("tieredPricing", { tiers: updatedTiers });
    }
  };

  const handlePricingTypeChange = (newType) => {
    updateConfig({
      pricingType: newType,
      tieredPricing: {
        ...config.tieredPricing,
        enabled: newType === "tiered",
      },
    });
  };

  return (
    <div className="improved-subscription-config space-y-4">
      {/* Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaSync className="text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-800">
              Subscription Configuration
            </h3>
          </div>
          <button
            onClick={() => setShowSubscriptionManager(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
          >
            <FaList size={14} />
            Manage Subscriptions
          </button>
        </div>
        <p className="text-sm text-purple-700">
          Configure subscription plans or manage existing ones from your PayPal
          account
        </p>
      </div>

      {/* Basic Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("basic")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaCog className="text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Basic Plan Settings</h4>
              <p className="text-sm text-gray-600">
                Plan name, billing frequency, and basic configuration
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Premium Monthly Plan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={config.currency}
                  onChange={(e) => updateConfig({ currency: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onChange={(e) => updateConfig({ frequency: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    updateConfig({ interval: parseInt(e.target.value) || 1 })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Every {config.interval} {config.frequency.toLowerCase()}(s)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Billing Cycles
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.totalCycles}
                  onChange={(e) =>
                    updateConfig({ totalCycles: parseInt(e.target.value) || 0 })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Pricing Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("pricing")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaLayerGroup className="text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">
                Pricing Configuration
              </h4>
              <p className="text-sm text-gray-600">
                {config.pricingType === "normal"
                  ? `Normal pricing: ${config.normalPrice} ${config.currency}`
                  : `Tiered pricing: ${config.tieredPricing.tiers.length} tiers`}
              </p>
            </div>
          </div>
          {expandedSections.pricing ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        {expandedSections.pricing && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-4 space-y-4">
              {/* Pricing Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Pricing Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="pricingType"
                      value="normal"
                      checked={config.pricingType === "normal"}
                      onChange={(e) => handlePricingTypeChange(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Normal Pricing
                      </div>
                      <div className="text-sm text-gray-600">
                        Fixed price for all users
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="pricingType"
                      value="tiered"
                      checked={config.pricingType === "tiered"}
                      onChange={(e) => handlePricingTypeChange(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Tiered Pricing
                      </div>
                      <div className="text-sm text-gray-600">
                        Different prices based on quantity
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Normal Pricing */}
              {config.pricingType === "normal" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price ({config.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.normalPrice}
                    onChange={(e) =>
                      updateConfig({
                        normalPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="29.99"
                  />
                </div>
              )}

              {/* Tiered Pricing */}
              {config.pricingType === "tiered" && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FaInfoCircle className="text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Tiered Pricing Information
                      </span>
                    </div>
                    <p className="text-xs text-green-700">
                      Set different prices based on quantity. Lower quantities
                      can have higher per-unit prices, encouraging customers to
                      purchase more for better value.
                    </p>
                  </div>

                  {config.tieredPricing.tiers.map((tier, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">
                            Tier {index + 1}
                          </h5>
                          <p className="text-xs text-gray-500">
                            Quantity {tier.startingQuantity}
                            {tier.endingQuantity
                              ? ` - ${tier.endingQuantity}`
                              : " - ∞"}{" "}
                            • ${tier.price} each
                          </p>
                        </div>
                        {config.tieredPricing.tiers.length > 1 && (
                          <button
                            onClick={() => removeTier(index)}
                            className="text-red-600 hover:text-red-700"
                            title="Remove this tier"
                          >
                            <FaTrash size={14} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Starting Quantity
                            {index === 0 && (
                              <span className="text-xs text-blue-600 ml-1">
                                (Always 1)
                              </span>
                            )}
                            {index > 0 && (
                              <span className="text-xs text-blue-600 ml-1">
                                (Auto-calculated)
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={tier.startingQuantity}
                            disabled={true} // Always disabled - user cannot edit
                            className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                            title={
                              index === 0
                                ? "First tier always starts at 1"
                                : "Auto-calculated from previous tier"
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Ending Quantity
                            {index ===
                              config.tieredPricing.tiers.length - 1 && (
                              <span className="text-xs text-blue-600 ml-1">
                                (Infinite)
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            min={tier.startingQuantity}
                            value={tier.endingQuantity || ""}
                            disabled={
                              index === config.tieredPricing.tiers.length - 1
                            } // Disable for last tier
                            onChange={(e) =>
                              updateTier(index, {
                                endingQuantity: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              })
                            }
                            className={`w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                              index === config.tieredPricing.tiers.length - 1
                                ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                : ""
                            }`}
                            placeholder={
                              index === config.tieredPricing.tiers.length - 1
                                ? "∞ Unlimited"
                                : "Enter ending quantity"
                            }
                            title={
                              index === config.tieredPricing.tiers.length - 1
                                ? "Last tier is always unlimited"
                                : "Enter the maximum quantity for this tier"
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {index === config.tieredPricing.tiers.length - 1
                              ? "Last tier is always unlimited"
                              : "Next tier will start at this number + 1"}
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

      {/* Advanced Settings */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("advanced")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaInfoCircle className="text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">Advanced Settings</h4>
              <p className="text-sm text-gray-600">
                Setup fees, failure handling, and URLs
              </p>
            </div>
          </div>
          {expandedSections.advanced ? <FaChevronDown /> : <FaChevronRight />}
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
                    updateConfig({ setupFee: parseFloat(e.target.value) || 0 })
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
                      paymentFailureThreshold: parseInt(e.target.value) || 3,
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

      {/* Subscription Manager Modal */}
      <FormSubscriptionManager
        isOpen={showSubscriptionManager}
        onClose={() => setShowSubscriptionManager(false)}
        selectedMerchantId={selectedMerchantId}
        formId={formId}
        onSubscriptionsChange={(subscriptions) => {
          console.log("Form subscriptions updated:", subscriptions);
          // Handle subscription changes if needed
        }}
      />
    </div>
  );
};

export default ImprovedSubscriptionConfig;
