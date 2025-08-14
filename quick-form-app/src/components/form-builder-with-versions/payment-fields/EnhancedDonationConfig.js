import React, { useState, useEffect } from "react";
import {
  FaHeart,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaTrash,
  FaInfoCircle,
  FaChevronDown,
  FaChevronRight,
  FaCalendarAlt,
  FaSave,
  FaSpinner,
} from "react-icons/fa";
import { createItem as createDonationPlan } from "./paypal/api/paypalApi";

/**
 * EnhancedDonationConfig Component
 *
 * Advanced donation configuration with:
 * - Suggested donation amounts
 * - Custom amount entry
 * - Donor information collection
 * - Anonymous donation option
 * - Recurring donation schedules
 * - Impact messaging
 */
const EnhancedDonationConfig = ({
  donationConfig = {},
  onConfigChange,
  merchantCapabilities = {},
}) => {
  const [config, setConfig] = useState({
    name: "Donation",
    description: "Support our cause with a donation",
    currency: "USD",

    // Amount configuration
    suggestedAmounts: [25, 50, 100, 250, 500],
    allowCustomAmount: true,
    minAmount: 1,
    maxAmount: 10000,
    defaultAmount: 50,

    // Donor information
    collectDonorInfo: true,
    requiredFields: {
      firstName: true,
      lastName: true,
      email: true,
      phone: false,
      address: false,
    },
    allowAnonymous: true,
    allowMessage: true,
    messagePrompt: "Leave a message (optional)",

    // Recurring donations
    recurringOptions: {
      enabled: true,
      frequencies: ["monthly", "quarterly", "yearly"],
      defaultFrequency: "monthly",
      allowOneTime: true,
    },

    // Impact messaging
    impactMessages: {
      enabled: true,
      messages: {
        25: "Provides school supplies for one child",
        50: "Feeds a family for one week",
        100: "Sponsors a child's education for one month",
        250: "Provides clean water access for a family",
        500: "Funds a community health program",
      },
    },

    // Donation types
    donationType: "paypal_donate_sdk", // or "regular_checkout"

    // PayPal Donate SDK Configuration
    paypalDonateConfig: {
      hostedButtonId: "", // Optional PayPal hosted button ID
      style: {
        layout: "vertical",
        color: "blue",
        shape: "rect",
        label: "donate",
        tagline: true,
        height: 55,
      },
      customButton: {
        enabled: true,
        buttonText: "Donate with PayPal",
        backgroundColor: "#0070ba",
        textColor: "#ffffff",
      },
    },

    // Receipt and thank you
    sendReceipt: true,
    thankYouMessage: "Thank you for your generous donation!",

    ...donationConfig,
  });

  const [expandedSections, setExpandedSections] = useState({
    amounts: true,
    donor: false,
    recurring: false,
    impact: false,
    advanced: false,
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    onConfigChange?.(config);
  }, [config]);

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

  const addSuggestedAmount = () => {
    const newAmount = Math.max(...config.suggestedAmounts) + 100;
    updateConfig({
      suggestedAmounts: [...config.suggestedAmounts, newAmount].sort(
        (a, b) => a - b
      ),
    });
  };

  const removeSuggestedAmount = (index) => {
    const updatedAmounts = config.suggestedAmounts.filter(
      (_, i) => i !== index
    );
    updateConfig({ suggestedAmounts: updatedAmounts });
  };

  const updateSuggestedAmount = (index, value) => {
    const updatedAmounts = config.suggestedAmounts.map((amount, i) =>
      i === index ? parseFloat(value) || 0 : amount
    );
    updateConfig({ suggestedAmounts: updatedAmounts.sort((a, b) => a - b) });
  };

  const updateImpactMessage = (amount, message) => {
    updateNestedConfig("impactMessages", {
      messages: {
        ...config.impactMessages.messages,
        [amount]: message,
      },
    });
  };

  const saveDonationPlan = async () => {
    if (!config.name || config.suggestedAmounts.length === 0) {
      setSaveError(
        "Please fill in required fields (name and suggested amounts)"
      );
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      // NEW APPROACH: Use direct API call that returns data to frontend
      const result = await createDonationPlan(
        merchantCapabilities.merchantId || "default-merchant",
        config
      );

      if (result.success) {
        setSaveSuccess(
          result.message ||
            "Donation plan created successfully! Remember to save the form to persist changes."
        );
        setTimeout(() => setSaveSuccess(""), 5000); // Show message longer

        console.log("✅ Donation plan created:", result.donationPlan);

        // Note: The payment data is automatically updated via PaymentContext
        // when the API response includes updateType
      } else {
        setSaveError(result.error || "Failed to create donation plan");
      }
    } catch (error) {
      setSaveError(error.message || "Failed to create donation plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="enhanced-donation-config space-y-4">
      {/* Header */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaHeart className="text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">
              Advanced Donation Configuration
            </h3>
          </div>
          <button
            onClick={saveDonationPlan}
            disabled={saving || !config.name}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FaSave />
                Save Plan
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-red-700">
          Configure donation amounts, donor information collection, and impact
          messaging
        </p>

        {/* Status Messages */}
        {saveError && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-sm text-green-700">
            {saveSuccess}
          </div>
        )}
      </div>

      {/* Amount Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("amounts")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaHeart className="text-red-600" />
            <div>
              <h4 className="font-medium text-gray-900">Donation Amounts</h4>
              <p className="text-sm text-gray-600">
                {config.suggestedAmounts.length} suggested amounts configured
              </p>
            </div>
          </div>
          {expandedSections.amounts ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        {expandedSections.amounts && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={config.currency}
                    onChange={(e) => updateConfig({ currency: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Amount ({config.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.defaultAmount}
                    onChange={(e) =>
                      updateConfig({
                        defaultAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Suggested Amounts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suggested Amounts ({config.currency})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {config.suggestedAmounts.map((amount, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) =>
                          updateSuggestedAmount(index, e.target.value)
                        }
                        className="flex-1 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {config.suggestedAmounts.length > 1 && (
                        <button
                          onClick={() => removeSuggestedAmount(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FaTrash size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addSuggestedAmount}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors"
                >
                  <FaPlus className="inline mr-2" />
                  Add Suggested Amount
                </button>
              </div>

              {/* Custom Amount Settings */}
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.allowCustomAmount}
                    onChange={(e) =>
                      updateConfig({ allowCustomAmount: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Allow custom donation amounts
                  </span>
                </label>

                {config.allowCustomAmount && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Minimum Amount ({config.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.minAmount}
                        onChange={(e) =>
                          updateConfig({
                            minAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Maximum Amount ({config.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.maxAmount}
                        onChange={(e) =>
                          updateConfig({
                            maxAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Donor Information */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("donor")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaUser className="text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Donor Information</h4>
              <p className="text-sm text-gray-600">
                {config.collectDonorInfo
                  ? "Collecting donor information"
                  : "Anonymous donations only"}
              </p>
            </div>
          </div>
          {expandedSections.donor ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        {expandedSections.donor && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-4 space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.collectDonorInfo}
                  onChange={(e) =>
                    updateConfig({ collectDonorInfo: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Collect donor information
                </span>
              </label>

              {config.collectDonorInfo && (
                <div className="ml-6 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">
                      Required Fields
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.requiredFields.firstName}
                          onChange={(e) =>
                            updateNestedConfig("requiredFields", {
                              firstName: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          First Name
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.requiredFields.lastName}
                          onChange={(e) =>
                            updateNestedConfig("requiredFields", {
                              lastName: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Last Name</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.requiredFields.email}
                          onChange={(e) =>
                            updateNestedConfig("requiredFields", {
                              email: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Email</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.requiredFields.phone}
                          onChange={(e) =>
                            updateNestedConfig("requiredFields", {
                              phone: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Phone</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.requiredFields.address}
                          onChange={(e) =>
                            updateNestedConfig("requiredFields", {
                              address: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Address</span>
                      </label>
                    </div>
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.allowAnonymous}
                      onChange={(e) =>
                        updateConfig({ allowAnonymous: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      Allow anonymous donations
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.allowMessage}
                      onChange={(e) =>
                        updateConfig({ allowMessage: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      Allow donor messages
                    </span>
                  </label>

                  {config.allowMessage && (
                    <div className="ml-6">
                      <label className="block text-xs text-gray-600 mb-1">
                        Message Prompt
                      </label>
                      <input
                        type="text"
                        value={config.messagePrompt}
                        onChange={(e) =>
                          updateConfig({ messagePrompt: e.target.value })
                        }
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Leave a message (optional)"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recurring Donations */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("recurring")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">Recurring Donations</h4>
              <p className="text-sm text-gray-600">
                {config.recurringOptions.enabled
                  ? "Recurring donations enabled"
                  : "One-time donations only"}
              </p>
            </div>
          </div>
          {expandedSections.recurring ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        {expandedSections.recurring && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-4 space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.recurringOptions.enabled}
                  onChange={(e) =>
                    updateNestedConfig("recurringOptions", {
                      enabled: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable recurring donations
                </span>
              </label>

              {config.recurringOptions.enabled && (
                <div className="ml-6 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Frequencies
                    </label>
                    <div className="space-y-2">
                      {["monthly", "quarterly", "yearly"].map((frequency) => (
                        <label key={frequency} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.recurringOptions.frequencies.includes(
                              frequency
                            )}
                            onChange={(e) => {
                              const frequencies = e.target.checked
                                ? [
                                    ...config.recurringOptions.frequencies,
                                    frequency,
                                  ]
                                : config.recurringOptions.frequencies.filter(
                                    (f) => f !== frequency
                                  );
                              updateNestedConfig("recurringOptions", {
                                frequencies,
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {frequency}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Frequency
                    </label>
                    <select
                      value={config.recurringOptions.defaultFrequency}
                      onChange={(e) =>
                        updateNestedConfig("recurringOptions", {
                          defaultFrequency: e.target.value,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {config.recurringOptions.frequencies.map((frequency) => (
                        <option
                          key={frequency}
                          value={frequency}
                          className="capitalize"
                        >
                          {frequency}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.recurringOptions.allowOneTime}
                      onChange={(e) =>
                        updateNestedConfig("recurringOptions", {
                          allowOneTime: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      Also allow one-time donations
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Impact Messages */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection("impact")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FaInfoCircle className="text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">Impact Messages</h4>
              <p className="text-sm text-gray-600">
                {config.impactMessages.enabled
                  ? "Impact messages configured"
                  : "No impact messages"}
              </p>
            </div>
          </div>
          {expandedSections.impact ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        {expandedSections.impact && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-4 space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.impactMessages.enabled}
                  onChange={(e) =>
                    updateNestedConfig("impactMessages", {
                      enabled: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Show impact messages for donation amounts
                </span>
              </label>

              {config.impactMessages.enabled && (
                <div className="ml-6 space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FaInfoCircle className="text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Impact Messages
                      </span>
                    </div>
                    <p className="text-xs text-green-700">
                      Show donors what their contribution can accomplish.
                      Messages will appear when donors select or enter amounts.
                    </p>
                  </div>

                  {config.suggestedAmounts.map((amount) => (
                    <div key={amount} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-16">
                        ${amount}:
                      </span>
                      <input
                        type="text"
                        value={config.impactMessages.messages[amount] || ""}
                        onChange={(e) =>
                          updateImpactMessage(amount, e.target.value)
                        }
                        className="flex-1 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder={`What ${config.currency} ${amount} can accomplish...`}
                      />
                    </div>
                  ))}
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
                Donation type, receipts, and thank you messages
              </p>
            </div>
          </div>
          {expandedSections.advanced ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        {expandedSections.advanced && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Donation Type
                </label>
                <select
                  value={config.donationType}
                  onChange={(e) =>
                    updateConfig({ donationType: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="paypal_donate_sdk">
                    PayPal Donate SDK (Recommended)
                  </option>
                  <option value="regular_checkout">Regular Checkout</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  PayPal Donate SDK provides optimized donation experience with
                  better conversion rates
                </p>
              </div>

              {/* PayPal Donate SDK Configuration */}
              {config.donationType === "paypal_donate_sdk" && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-3">
                    PayPal Donate SDK Configuration
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Hosted Button ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={config.paypalDonateConfig?.hostedButtonId || ""}
                        onChange={(e) =>
                          updateNestedConfig("paypalDonateConfig", {
                            hostedButtonId: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Leave empty to use merchant ID"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        PayPal hosted button ID for advanced donation tracking
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Button Style
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={
                            config.paypalDonateConfig?.style?.color || "blue"
                          }
                          onChange={(e) =>
                            updateNestedConfig("paypalDonateConfig", {
                              style: {
                                ...config.paypalDonateConfig?.style,
                                color: e.target.value,
                              },
                            })
                          }
                          className="p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="blue">Blue</option>
                          <option value="gold">Gold</option>
                          <option value="silver">Silver</option>
                          <option value="white">White</option>
                          <option value="black">Black</option>
                        </select>

                        <select
                          value={
                            config.paypalDonateConfig?.style?.shape || "rect"
                          }
                          onChange={(e) =>
                            updateNestedConfig("paypalDonateConfig", {
                              style: {
                                ...config.paypalDonateConfig?.style,
                                shape: e.target.value,
                              },
                            })
                          }
                          className="p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="rect">Rectangle</option>
                          <option value="pill">Pill</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Button Height (px)
                      </label>
                      <input
                        type="number"
                        min="25"
                        max="55"
                        value={config.paypalDonateConfig?.style?.height || 55}
                        onChange={(e) =>
                          updateNestedConfig("paypalDonateConfig", {
                            style: {
                              ...config.paypalDonateConfig?.style,
                              height: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Custom Button Text
                      </label>
                      <input
                        type="text"
                        value={
                          config.paypalDonateConfig?.customButton?.buttonText ||
                          "Donate with PayPal"
                        }
                        onChange={(e) =>
                          updateNestedConfig("paypalDonateConfig", {
                            customButton: {
                              ...config.paypalDonateConfig?.customButton,
                              buttonText: e.target.value,
                            },
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Donate with PayPal"
                      />
                    </div>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          config.paypalDonateConfig?.style?.tagline !== false
                        }
                        onChange={(e) =>
                          updateNestedConfig("paypalDonateConfig", {
                            style: {
                              ...config.paypalDonateConfig?.style,
                              tagline: e.target.checked,
                            },
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-xs text-gray-700">
                        Show PayPal tagline
                      </span>
                    </label>
                  </div>

                  {/* PayPal Donate Button Preview */}
                  <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
                    <h5 className="text-xs font-medium text-gray-700 mb-2">
                      Button Preview:
                    </h5>
                    <div className="flex items-center justify-center p-4 bg-gray-50 rounded">
                      <div
                        className="px-6 py-3 rounded text-white font-medium text-sm cursor-pointer transition-colors"
                        style={{
                          backgroundColor:
                            config.paypalDonateConfig?.style?.color === "blue"
                              ? "#0070ba"
                              : config.paypalDonateConfig?.style?.color ===
                                "gold"
                              ? "#ffc439"
                              : config.paypalDonateConfig?.style?.color ===
                                "silver"
                              ? "#8c8c8c"
                              : config.paypalDonateConfig?.style?.color ===
                                "white"
                              ? "#ffffff"
                              : config.paypalDonateConfig?.style?.color ===
                                "black"
                              ? "#2c2e2f"
                              : "#0070ba",
                          color:
                            config.paypalDonateConfig?.style?.color === "white"
                              ? "#2c2e2f"
                              : "#ffffff",
                          borderRadius:
                            config.paypalDonateConfig?.style?.shape === "pill"
                              ? "25px"
                              : "4px",
                          height: `${
                            config.paypalDonateConfig?.style?.height || 55
                          }px`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "150px",
                        }}
                      >
                        {config.paypalDonateConfig?.customButton?.buttonText ||
                          "Donate with PayPal"}
                      </div>
                    </div>
                    {config.paypalDonateConfig?.style?.tagline !== false && (
                      <p className="text-xs text-gray-500 text-center mt-2">
                        The safer, easier way to donate online!
                      </p>
                    )}
                  </div>
                </div>
              )}

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.sendReceipt}
                  onChange={(e) =>
                    updateConfig({ sendReceipt: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Send donation receipts via email
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thank You Message
                </label>
                <textarea
                  value={config.thankYouMessage}
                  onChange={(e) =>
                    updateConfig({ thankYouMessage: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  rows="3"
                  placeholder="Thank you for your generous donation!"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDonationConfig;
