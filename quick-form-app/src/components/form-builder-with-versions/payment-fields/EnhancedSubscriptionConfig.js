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
  FaSave,
  FaSpinner,
} from "react-icons/fa";
import SubscriptionPlanManager from "./SubscriptionPlanManager";

/**
 * EnhancedSubscriptionConfig Component
 *
 * Advanced subscription configuration with:
 * - Trial periods (free or discounted)
 * - Tiered pricing based on quantity
 * - Volume discounts
 * - Setup fees and cancellation handling
 * - Custom billing cycles
 */
const EnhancedSubscriptionConfig = ({
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
    totalCycles: 0, // 0 = infinite
    price: 0,
    currency: "USD",
    setupFee: 0,
    taxPercentage: 0,

    // Trial period configuration
    trialPeriod: {
      enabled: false,
      unit: "DAY",
      count: 7,
      price: 0, // 0 = free trial
    },

    // Tiered pricing configuration
    tieredPricing: {
      enabled: false,
      tiers: [
        { startingQuantity: 1, endingQuantity: 10, price: 29.99 },
        { startingQuantity: 11, endingQuantity: 50, price: 24.99 },
        { startingQuantity: 51, endingQuantity: null, price: 19.99 }, // null = unlimited
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
    trial: false,
    tiered: false,
    advanced: false,
  });

  useEffect(() => {
    onConfigChange?.(config);
  }, [config]);

  return (
    <div className="enhanced-subscription-config space-y-4">
      {/* Use the new SubscriptionPlanManager */}
      <SubscriptionPlanManager
        subscriptionConfig={config}
        onConfigChange={(newConfig) => {
          setConfig(newConfig);
          onConfigChange?.(newConfig);
        }}
        merchantCapabilities={merchantCapabilities}
        selectedMerchantId={selectedMerchantId}
      />
    </div>
  );
};

export default EnhancedSubscriptionConfig;
