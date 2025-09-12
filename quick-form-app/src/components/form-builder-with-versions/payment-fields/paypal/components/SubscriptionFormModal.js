import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaSpinner,
  FaSave,
  FaPlus,
  FaTrash,
  FaInfoCircle,
  FaPlusCircle,
} from "react-icons/fa";
import { DEFAULT_SUBSCRIPTION_PLAN } from "../../../../../config";

/**
 * SubscriptionFormModal Component
 *
 * Full form modal for creating/editing subscriptions
 * Uses exact same structure as PayPal integration from config.js
 */

const currencies = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "CNY",
  "SEK",
  "NZD",
  "MXN",
  "SGD",
  "HKD",
  "NOK",
  "KRW",
  "TRY",
  "RUB",
  "INR",
  "BRL",
  "ZAR",
];

/**
 * TieredPricing Component
 * Handles tiered pricing configuration for subscription plans
 */
const TieredPricing = ({
  tiers,
  onTierChange,
  onAddTier,
  onRemoveTier,
  isEditing,
  currency,
  maxTiers = 10,
  errorMsg,
}) => {
  // Handle tier ending quantity change and auto-calculate starting quantities
  const handleEndingQuantityChange = (tierIndex, value) => {
    // Update the ending quantity for this tier
    onTierChange(tierIndex, "ending_quantity", value);

    // Auto-calculate starting quantities for subsequent tiers
    // This will be handled by the parent component's tier management logic
  };
  return (
    <div className="space-y-3">
      {tiers?.map((tier, idx) => {
        const isLastTier = idx === tiers.length - 1;
        // Calculate starting quantity based on previous tier's ending quantity
        let startQty = 1;
        if (idx > 0) {
          const prevTier = tiers[idx - 1];
          startQty = prevTier.ending_quantity
            ? parseInt(prevTier.ending_quantity) + 1
            : 1;
        }

        return (
          <div
            key={idx}
            className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg border"
          >
            <span className="text-sm font-medium text-gray-700 min-w-[100px]">
              {`Tier ${idx + 1}: ${startQty}${
                isLastTier
                  ? "+"
                  : tier.ending_quantity
                  ? ` - ${tier.ending_quantity}`
                  : "+"
              }`}
            </span>

            <input
              type="number"
              placeholder={isLastTier ? "∞ (infinite)" : "End Qty"}
              value={isLastTier ? "" : tier.ending_quantity || ""}
              onChange={(e) => handleEndingQuantityChange(idx, e.target.value)}
              className="px-3 py-2 w-24 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isEditing || isLastTier}
              min={startQty}
              title={
                isLastTier
                  ? "Last tier is automatically infinite"
                  : `Enter ending quantity for this tier (minimum: ${startQty})`
              }
            />

            <input
              type="number"
              placeholder="Price"
              value={tier.price?.value || ""}
              onChange={(e) =>
                onTierChange(idx, "price", {
                  ...tier.price,
                  value: e.target.value,
                })
              }
              className="px-3 py-2 w-24 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isEditing}
              min="0"
              step="0.01"
            />

            <span className="font-semibold text-gray-600">{currency}</span>

            {!isEditing && tiers.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveTier(idx)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove this tier"
              >
                <FaTrash size={14} />
              </button>
            )}
          </div>
        );
      })}

      {!isEditing && (
        <button
          type="button"
          onClick={onAddTier}
          className="flex gap-2 items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          disabled={tiers.length >= maxTiers}
        >
          <FaPlusCircle size={14} />
          Add Tier
        </button>
      )}

      {errorMsg && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
          {errorMsg}
        </div>
      )}

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p>
          • <strong>Tier Logic:</strong> First tier always starts at 1,
          subsequent tiers start at previous tier's ending + 1
        </p>
        <p>
          • <strong>Ending Quantities:</strong> Only ending quantities are
          editable (except last tier which is infinite)
        </p>
        <p>
          • <strong>Last Tier:</strong> Automatically extends to infinity (no
          ending quantity needed)
        </p>
        <p>
          • <strong>Pricing:</strong> Each tier must have a valid price per unit
        </p>
        <p>
          • <strong>Limits:</strong> Max {maxTiers} tiers allowed
        </p>
      </div>
    </div>
  );
};

const SubscriptionFormModal = ({
  isOpen,
  onClose,
  onSave,
  editingSubscription = null,
  selectedMerchantId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Track if we're in editing mode
  const isEditing = !!editingSubscription;

  // Track tax configuration state
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [initiallyHadTax, setInitiallyHadTax] = useState(false);

  // Initialize plan with default structure from config
  const [plan, setPlan] = useState({
    ...DEFAULT_SUBSCRIPTION_PLAN,
    name: "",
    description: "",
  });

  // Load editing data
  useEffect(() => {
    if (editingSubscription) {
      console.log("🔍 Loading subscription for editing:", editingSubscription);

      // Properly merge the plan data with existing billing cycles
      const existingPlanData = editingSubscription.planData || {};

      // Ensure we have proper billing cycles structure
      let billingCycles =
        existingPlanData.billing_cycles ||
        DEFAULT_SUBSCRIPTION_PLAN.billing_cycles;

      // If no billing cycles exist, create default ones
      if (!billingCycles || billingCycles.length === 0) {
        billingCycles = [
          {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: {
                value: editingSubscription.price?.toString() || "10.00",
                currency_code: existingPlanData.currency_code || "USD",
              },
            },
          },
        ];
      }

      const loadedPlan = {
        ...DEFAULT_SUBSCRIPTION_PLAN,
        ...existingPlanData,
        name: editingSubscription.name || existingPlanData.name || "",
        description:
          editingSubscription.description || existingPlanData.description || "",
        billing_cycles: billingCycles,
        currency_code: existingPlanData.currency_code || "USD",
      };

      console.log("🔍 Loaded plan data:", loadedPlan);
      setPlan(loadedPlan);

      // Check if tax was initially configured
      const hasTax =
        loadedPlan.taxes &&
        loadedPlan.taxes.percentage !== undefined &&
        loadedPlan.taxes.percentage !== "0" &&
        loadedPlan.taxes.percentage !== 0;

      setInitiallyHadTax(hasTax);
      setTaxEnabled(hasTax);
    } else {
      setPlan({
        ...DEFAULT_SUBSCRIPTION_PLAN,
        name: "",
        description: "",
      });
      setInitiallyHadTax(false);
      setTaxEnabled(false);
    }
  }, [editingSubscription, isOpen]);

  const validatePlanForCreate = (p) => {
    if (!p.name?.trim()) return "Plan name is required.";
    if (
      !p.billing_cycles ||
      !Array.isArray(p.billing_cycles) ||
      p.billing_cycles.length === 0
    )
      return "At least one billing cycle is required.";
    const hasRegular = p.billing_cycles.some(
      (c) => c.tenure_type === "REGULAR"
    );
    if (!hasRegular) return "At least one REGULAR billing cycle is required.";
    const sequences = p.billing_cycles.map((c) => c.sequence);
    if (new Set(sequences).size !== sequences.length)
      return "Billing cycles must have unique sequence numbers.";
    for (const cycle of p.billing_cycles) {
      if (
        !cycle.frequency ||
        !cycle.frequency.interval_unit ||
        !cycle.frequency.interval_count ||
        isNaN(cycle.frequency.interval_count) ||
        cycle.frequency.interval_count < 1
      ) {
        return "Each billing cycle must have a valid frequency.";
      }
      const { pricing_scheme } = cycle;
      if (!pricing_scheme) return "Pricing scheme is required for each cycle.";
      if (pricing_scheme.pricing_model === "TIERED") {
        if (!pricing_scheme.tiers || pricing_scheme.tiers.length === 0) {
          return "At least one tier is required for tiered pricing.";
        }
        for (const tier of pricing_scheme.tiers) {
          const priceVal = tier.amount?.value || tier.price?.value;
          if (
            priceVal === undefined ||
            isNaN(priceVal) ||
            Number(priceVal) < 0
          ) {
            return "Each tier must have a valid price.";
          }
          if (
            tier.ending_quantity &&
            (isNaN(tier.ending_quantity) || Number(tier.ending_quantity) <= 0)
          ) {
            return "Ending quantity for tiers must be a positive number.";
          }
        }
      } else {
        const fp = pricing_scheme.fixed_price;
        if (
          !fp ||
          fp.value === undefined ||
          isNaN(fp.value) ||
          Number(fp.value) < 0
        ) {
          return "Each billing cycle must have a valid fixed price.";
        }
      }
    }
    if (!p.payment_preferences || !p.payment_preferences.setup_fee)
      return "Payment preferences with setup fee are required.";
    if (!p.taxes || p.taxes.percentage === undefined)
      return "Taxes with percentage are required.";
    return "";
  };

  // Handle save
  const handleSave = async () => {
    if (!plan.name.trim()) {
      setError("Plan name is required");
      return;
    }

    if (!plan.description.trim()) {
      setError("Plan description is required");
      return;
    }

    if (!selectedMerchantId) {
      setError("Please select a merchant account");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate according to Main1.js rules
      if (!isEditing) {
        const v = validatePlanForCreate(plan);
        if (v) {
          setError(v);
          setLoading(false);
          return;
        }
      }

      // Store configuration only; creation happens on form save
      const result = {
        success: true,
        productId: editingSubscription?.id || `sub_${Date.now()}`,
        planId: editingSubscription?.paypalPlanId || null,
        message: "Subscription configuration saved",
      };

      if (result.success) {
        // On edit, enforce immutables: keep currency, billing cycles/pricing as-is
        let planToStore = plan;
        if (isEditing && editingSubscription?.planData) {
          planToStore = {
            ...editingSubscription.planData,
            name: plan.name,
            description: plan.description,
            payment_preferences: plan.payment_preferences,
            taxes: plan.taxes,
          };
        }

        const subscriptionData = {
          id: result.productId || result.planId,
          name: planToStore.name,
          description: planToStore.description,
          status: "ACTIVE",
          planData: planToStore,
          paypalPlanId: result.planId,
          source: isEditing ? "edited" : "form_created",
          merchantAccountId: selectedMerchantId,
          createdAt: new Date().toISOString(),
        };

        onSave(subscriptionData);
        onClose();
      } else {
        setError(result.error || "Failed to save subscription");
      }
    } catch (err) {
      console.error("Error saving subscription:", err);
      setError("Failed to save subscription");
    } finally {
      setLoading(false);
    }
  };

  // Add trial cycle
  const addTrialCycle = () => {
    const newTrialCycle = {
      frequency: { interval_unit: "MONTH", interval_count: 1 },
      tenure_type: "TRIAL",
      sequence:
        plan.billing_cycles.filter((c) => c.tenure_type === "TRIAL").length + 1,
      total_cycles: 1,
      pricing_scheme: {
        fixed_price: { value: "0.00", currency_code: plan.currency_code },
      },
    };

    setPlan((p) => ({
      ...p,
      billing_cycles: [
        ...p.billing_cycles.filter((c) => c.tenure_type === "TRIAL"),
        newTrialCycle,
        ...p.billing_cycles.filter((c) => c.tenure_type === "REGULAR"),
      ].map((cycle, index) => ({ ...cycle, sequence: index + 1 })),
    }));
  };

  // Remove trial cycle
  const removeTrialCycle = (index) => {
    setPlan((p) => ({
      ...p,
      billing_cycles: p.billing_cycles
        .filter((_, i) => i !== index)
        .map((cycle, i) => ({ ...cycle, sequence: i + 1 })),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {editingSubscription ? "Edit" : "Create"} Subscription Plan
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure your subscription plan with PayPal integration
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
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Editing Information */}
          {isEditing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FaInfoCircle className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Editing Subscription Plan
                </span>
              </div>
              <div className="text-xs text-blue-700">
                <strong>Editable:</strong> Plan name, description, payment
                preferences, taxes
                <br />
                <strong>Cannot be changed:</strong> Currency, billing cycles,
                pricing, trial periods (PayPal limitations)
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) =>
                    setPlan((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter plan name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency{" "}
                  {isEditing && (
                    <span className="text-xs text-gray-500">
                      (Cannot be changed)
                    </span>
                  )}
                </label>
                <select
                  value={plan.currency_code}
                  onChange={(e) => {
                    if (isEditing) return; // Prevent changes when editing

                    const newCurrency = e.target.value;
                    setPlan((p) => ({
                      ...p,
                      currency_code: newCurrency,
                      billing_cycles: p.billing_cycles.map((cycle) => ({
                        ...cycle,
                        pricing_scheme: {
                          ...cycle.pricing_scheme,
                          fixed_price: {
                            ...cycle.pricing_scheme.fixed_price,
                            currency_code: newCurrency,
                          },
                        },
                      })),
                      payment_preferences: {
                        ...p.payment_preferences,
                        setup_fee: {
                          ...p.payment_preferences.setup_fee,
                          currency_code: newCurrency,
                        },
                      },
                    }));
                  }}
                  disabled={isEditing}
                  className={`w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isEditing ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={plan.description}
                onChange={(e) =>
                  setPlan((p) => ({ ...p, description: e.target.value }))
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter plan description"
              />
            </div>
          </div>

          {/* Trial Periods */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Trial Periods{" "}
                {isEditing && (
                  <span className="text-xs text-gray-500">
                    (Cannot be modified)
                  </span>
                )}
              </h3>
              {!isEditing && (
                <button
                  onClick={addTrialCycle}
                  disabled={
                    plan.billing_cycles.filter((c) => c.tenure_type === "TRIAL")
                      .length >= 2
                  }
                  className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <FaPlus size={12} />
                  Add Trial
                </button>
              )}
            </div>

            {plan.billing_cycles
              .filter((cycle) => cycle.tenure_type === "TRIAL")
              .map((cycle, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 mb-3"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-800">
                      Trial Period {index + 1}
                    </h4>
                    {!isEditing && (
                      <button
                        onClick={() =>
                          removeTrialCycle(
                            plan.billing_cycles.findIndex((c) => c === cycle)
                          )
                        }
                        className="text-red-600 hover:text-red-700"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Trial Price ({plan.currency_code})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cycle.pricing_scheme.fixed_price.value}
                        onChange={(e) => {
                          if (isEditing) return; // Prevent changes when editing

                          const cycleIndex = plan.billing_cycles.findIndex(
                            (c) => c === cycle
                          );
                          setPlan((p) => ({
                            ...p,
                            billing_cycles: p.billing_cycles.map((c, i) =>
                              i === cycleIndex
                                ? {
                                    ...c,
                                    pricing_scheme: {
                                      ...c.pricing_scheme,
                                      fixed_price: {
                                        ...c.pricing_scheme.fixed_price,
                                        value: e.target.value,
                                      },
                                    },
                                  }
                                : c
                            ),
                          }));
                        }}
                        disabled={isEditing}
                        className={`w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency
                      </label>
                      <select
                        value={cycle.frequency.interval_unit}
                        onChange={(e) => {
                          if (isEditing) return; // Prevent changes when editing

                          const cycleIndex = plan.billing_cycles.findIndex(
                            (c) => c === cycle
                          );
                          setPlan((p) => ({
                            ...p,
                            billing_cycles: p.billing_cycles.map((c, i) =>
                              i === cycleIndex
                                ? {
                                    ...c,
                                    frequency: {
                                      ...c.frequency,
                                      interval_unit: e.target.value,
                                    },
                                  }
                                : c
                            ),
                          }));
                        }}
                        disabled={isEditing}
                        className={`w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                      >
                        <option value="DAY">Day</option>
                        <option value="WEEK">Week</option>
                        <option value="MONTH">Month</option>
                        <option value="YEAR">Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interval Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={cycle.frequency.interval_count}
                        onChange={(e) => {
                          const cycleIndex = plan.billing_cycles.findIndex(
                            (c) => c === cycle
                          );
                          setPlan((p) => ({
                            ...p,
                            billing_cycles: p.billing_cycles.map((c, i) =>
                              i === cycleIndex
                                ? {
                                    ...c,
                                    frequency: {
                                      ...c.frequency,
                                      interval_count:
                                        parseInt(e.target.value) || 1,
                                    },
                                  }
                                : c
                            ),
                          }));
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Cycles
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={cycle.total_cycles}
                        onChange={(e) => {
                          const cycleIndex = plan.billing_cycles.findIndex(
                            (c) => c === cycle
                          );
                          setPlan((p) => ({
                            ...p,
                            billing_cycles: p.billing_cycles.map((c, i) =>
                              i === cycleIndex
                                ? {
                                    ...c,
                                    total_cycles: parseInt(e.target.value) || 1,
                                  }
                                : c
                            ),
                          }));
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

            {plan.billing_cycles.filter((c) => c.tenure_type === "TRIAL")
              .length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No trial periods configured. Click "Add Trial" to add one.
              </div>
            )}
          </div>

          {/* Regular Billing */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Regular Billing
              </h3>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Pricing Model:{" "}
                  {isEditing && (
                    <span className="text-xs text-gray-500">
                      (Cannot be changed)
                    </span>
                  )}
                </label>
                <select
                  value={
                    plan.billing_cycles.find((c) => c.tenure_type === "REGULAR")
                      ?.pricing_scheme?.pricing_model || "FIXED"
                  }
                  onChange={(e) => {
                    if (isEditing) return; // Prevent changes when editing

                    const pricingModel = e.target.value;
                    setPlan((p) => ({
                      ...p,
                      billing_cycles: p.billing_cycles.map((c) =>
                        c.tenure_type === "REGULAR"
                          ? {
                              ...c,
                              pricing_scheme:
                                pricingModel === "FIXED"
                                  ? {
                                      fixed_price: {
                                        value: "0.00",
                                        currency_code: p.currency_code,
                                      },
                                    }
                                  : {
                                      pricing_model: "TIERED",
                                      tiers: [
                                        {
                                          starting_quantity: "1",
                                          ending_quantity: "10",
                                          amount: {
                                            value: "0.00",
                                            currency_code: p.currency_code,
                                          },
                                        },
                                      ],
                                    },
                            }
                          : c
                      ),
                    }));
                  }}
                  disabled={isEditing}
                  className={`px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isEditing ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="FIXED">Fixed Price</option>
                  <option value="TIERED">Tiered Pricing</option>
                </select>
              </div>
            </div>

            {(() => {
              const regularCycle = plan.billing_cycles.find(
                (c) => c.tenure_type === "REGULAR"
              );
              if (!regularCycle) return null;

              const isFixedPricing =
                regularCycle.pricing_scheme?.pricing_model !== "TIERED";

              return (
                <div className="border border-gray-200 rounded-lg p-4">
                  {isFixedPricing ? (
                    // Fixed Pricing
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Regular Price ({plan.currency_code}) *{" "}
                          {isEditing && (
                            <span className="text-xs text-gray-500">
                              (Cannot be changed)
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={
                            regularCycle.pricing_scheme.fixed_price?.value ||
                            "0.00"
                          }
                          onChange={(e) => {
                            if (isEditing) return; // Prevent changes when editing

                            setPlan((p) => ({
                              ...p,
                              billing_cycles: p.billing_cycles.map((c) =>
                                c.tenure_type === "REGULAR"
                                  ? {
                                      ...c,
                                      pricing_scheme: {
                                        ...c.pricing_scheme,
                                        fixed_price: {
                                          ...c.pricing_scheme.fixed_price,
                                          value: e.target.value,
                                        },
                                      },
                                    }
                                  : c
                              ),
                            }));
                          }}
                          disabled={isEditing}
                          className={`w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isEditing ? "bg-gray-100 cursor-not-allowed" : ""
                          }`}
                        />
                      </div>

                      {/* Show billing frequency information */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Billing Frequency{" "}
                          {isEditing && (
                            <span className="text-xs text-gray-500">
                              (Cannot be changed)
                            </span>
                          )}
                        </label>
                        <div
                          className={`w-full p-2 border border-gray-300 rounded-lg ${
                            isEditing ? "bg-gray-100" : "bg-white"
                          }`}
                        >
                          Every {regularCycle.frequency?.interval_count || 1}{" "}
                          {(
                            regularCycle.frequency?.interval_unit || "MONTH"
                          ).toLowerCase()}
                          {regularCycle.frequency?.interval_count > 1
                            ? "s"
                            : ""}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Cycles{" "}
                          {isEditing && (
                            <span className="text-xs text-gray-500">
                              (Cannot be changed)
                            </span>
                          )}
                        </label>
                        <div
                          className={`w-full p-2 border border-gray-300 rounded-lg ${
                            isEditing ? "bg-gray-100" : "bg-white"
                          }`}
                        >
                          {regularCycle.total_cycles === 0
                            ? "Infinite"
                            : regularCycle.total_cycles}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Tiered Pricing
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-800">
                          Pricing Tiers
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setPlan((p) => ({
                              ...p,
                              billing_cycles: p.billing_cycles.map((c) =>
                                c.tenure_type === "REGULAR"
                                  ? {
                                      ...c,
                                      pricing_scheme: {
                                        ...c.pricing_scheme,
                                        tiers: [
                                          ...(c.pricing_scheme.tiers || []),
                                          {
                                            starting_quantity: "1",
                                            ending_quantity: "10",
                                            amount: {
                                              value: "0.00",
                                              currency_code: p.currency_code,
                                            },
                                          },
                                        ],
                                      },
                                    }
                                  : c
                              ),
                            }));
                          }}
                          className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          <FaPlus size={12} />
                          Add Tier
                        </button>
                      </div>

                      {(regularCycle.pricing_scheme.tiers || []).map(
                        (tier, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-3 mb-3"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="font-medium text-gray-700">
                                Tier {index + 1}
                              </h5>
                              {(regularCycle.pricing_scheme.tiers || [])
                                .length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPlan((p) => ({
                                      ...p,
                                      billing_cycles: p.billing_cycles.map(
                                        (c) =>
                                          c.tenure_type === "REGULAR"
                                            ? {
                                                ...c,
                                                pricing_scheme: {
                                                  ...c.pricing_scheme,
                                                  tiers:
                                                    c.pricing_scheme.tiers.filter(
                                                      (_, i) => i !== index
                                                    ),
                                                },
                                              }
                                            : c
                                      ),
                                    }));
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <FaTrash size={14} />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Starting Quantity
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={tier.starting_quantity}
                                  onChange={(e) => {
                                    setPlan((p) => ({
                                      ...p,
                                      billing_cycles: p.billing_cycles.map(
                                        (c) =>
                                          c.tenure_type === "REGULAR"
                                            ? {
                                                ...c,
                                                pricing_scheme: {
                                                  ...c.pricing_scheme,
                                                  tiers:
                                                    c.pricing_scheme.tiers.map(
                                                      (t, i) =>
                                                        i === index
                                                          ? {
                                                              ...t,
                                                              starting_quantity:
                                                                e.target.value,
                                                            }
                                                          : t
                                                    ),
                                                },
                                              }
                                            : c
                                      ),
                                    }));
                                  }}
                                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Ending Quantity
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={tier.ending_quantity}
                                  onChange={(e) => {
                                    setPlan((p) => ({
                                      ...p,
                                      billing_cycles: p.billing_cycles.map(
                                        (c) =>
                                          c.tenure_type === "REGULAR"
                                            ? {
                                                ...c,
                                                pricing_scheme: {
                                                  ...c.pricing_scheme,
                                                  tiers:
                                                    c.pricing_scheme.tiers.map(
                                                      (t, i) =>
                                                        i === index
                                                          ? {
                                                              ...t,
                                                              ending_quantity:
                                                                e.target.value,
                                                            }
                                                          : t
                                                    ),
                                                },
                                              }
                                            : c
                                      ),
                                    }));
                                  }}
                                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Price ({plan.currency_code})
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={tier.amount.value}
                                  onChange={(e) => {
                                    setPlan((p) => ({
                                      ...p,
                                      billing_cycles: p.billing_cycles.map(
                                        (c) =>
                                          c.tenure_type === "REGULAR"
                                            ? {
                                                ...c,
                                                pricing_scheme: {
                                                  ...c.pricing_scheme,
                                                  tiers:
                                                    c.pricing_scheme.tiers.map(
                                                      (t, i) =>
                                                        i === index
                                                          ? {
                                                              ...t,
                                                              amount: {
                                                                ...t.amount,
                                                                value:
                                                                  e.target
                                                                    .value,
                                                              },
                                                            }
                                                          : t
                                                    ),
                                                },
                                              }
                                            : c
                                      ),
                                    }));
                                  }}
                                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Common frequency and interval fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency
                      </label>
                      <select
                        value={regularCycle.frequency.interval_unit}
                        onChange={(e) => {
                          setPlan((p) => ({
                            ...p,
                            billing_cycles: p.billing_cycles.map((c) =>
                              c.tenure_type === "REGULAR"
                                ? {
                                    ...c,
                                    frequency: {
                                      ...c.frequency,
                                      interval_unit: e.target.value,
                                    },
                                  }
                                : c
                            ),
                          }));
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="DAY">Day</option>
                        <option value="WEEK">Week</option>
                        <option value="MONTH">Month</option>
                        <option value="YEAR">Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interval Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={regularCycle.frequency.interval_count}
                        onChange={(e) => {
                          setPlan((p) => ({
                            ...p,
                            billing_cycles: p.billing_cycles.map((c) =>
                              c.tenure_type === "REGULAR"
                                ? {
                                    ...c,
                                    frequency: {
                                      ...c.frequency,
                                      interval_count:
                                        parseInt(e.target.value) || 1,
                                    },
                                  }
                                : c
                            ),
                          }));
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Cycles (0 = infinite)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={regularCycle.total_cycles}
                        onChange={(e) => {
                          setPlan((p) => ({
                            ...p,
                            billing_cycles: p.billing_cycles.map((c) =>
                              c.tenure_type === "REGULAR"
                                ? {
                                    ...c,
                                    total_cycles: parseInt(e.target.value) || 0,
                                  }
                                : c
                            ),
                          }));
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Payment Preferences */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Payment Preferences
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Setup Fee ({plan.currency_code})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={plan.payment_preferences.setup_fee?.value || "0.00"}
                  onChange={(e) => {
                    setPlan((p) => ({
                      ...p,
                      payment_preferences: {
                        ...p.payment_preferences,
                        setup_fee: {
                          value: e.target.value,
                          currency_code: p.currency_code,
                        },
                      },
                    }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  value={
                    plan.payment_preferences.payment_failure_threshold || 3
                  }
                  onChange={(e) => {
                    setPlan((p) => ({
                      ...p,
                      payment_preferences: {
                        ...p.payment_preferences,
                        payment_failure_threshold:
                          parseInt(e.target.value) || 3,
                      },
                    }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Setup Fee Failure Action
                </label>
                <select
                  value={
                    plan.payment_preferences.setup_fee_failure_action ||
                    "CONTINUE"
                  }
                  onChange={(e) => {
                    setPlan((p) => ({
                      ...p,
                      payment_preferences: {
                        ...p.payment_preferences,
                        setup_fee_failure_action: e.target.value,
                      },
                    }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CONTINUE">Continue</option>
                  <option value="CANCEL">Cancel</option>
                </select>
              </div>

              {/* Tax Configuration */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tax Configuration
                  </label>
                  {!isEditing && !initiallyHadTax && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taxEnabled}
                        onChange={(e) => {
                          setTaxEnabled(e.target.checked);
                          if (!e.target.checked) {
                            setPlan((p) => ({
                              ...p,
                              taxes: {
                                percentage: "0",
                                inclusive: false,
                              },
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">Enable Tax</span>
                    </label>
                  )}
                  {isEditing && !initiallyHadTax && (
                    <span className="text-xs text-gray-500">
                      Tax cannot be added to existing plans
                    </span>
                  )}
                </div>

                {(taxEnabled || initiallyHadTax) && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Percentage (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={plan.taxes?.percentage || "0"}
                        onChange={(e) => {
                          setPlan((p) => ({
                            ...p,
                            taxes: {
                              ...p.taxes,
                              percentage: e.target.value,
                            },
                          }));
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter tax percentage"
                      />
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={plan.taxes?.inclusive || false}
                          onChange={(e) => {
                            setPlan((p) => ({
                              ...p,
                              taxes: {
                                ...p.taxes,
                                inclusive: e.target.checked,
                              },
                            }));
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          Tax is inclusive in price
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        {plan.taxes?.inclusive
                          ? "Tax is included in the displayed price"
                          : "Tax will be added to the displayed price"}
                      </p>
                    </div>
                  </div>
                )}

                {!taxEnabled && !initiallyHadTax && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Tax is not configured for this subscription plan.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    plan.payment_preferences.auto_bill_outstanding !== false
                  }
                  onChange={(e) => {
                    setPlan((p) => ({
                      ...p,
                      payment_preferences: {
                        ...p.payment_preferences,
                        auto_bill_outstanding: e.target.checked,
                      },
                    }));
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Automatically bill outstanding amounts
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" size={14} />
                Saving...
              </>
            ) : (
              <>
                <FaSave size={14} />
                {editingSubscription ? "Update" : "Create"} Subscription
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionFormModal;
