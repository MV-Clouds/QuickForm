import React from "react";
import { formatCurrency } from "../utils/paymentHelpers";
import {
  FaCheck,
  FaCalendarAlt,
  FaCrown,
  FaStar,
  FaClock,
  FaGift,
} from "react-icons/fa";

/**
 * Subscription Selection Component
 * Allows users to select from available subscription plans
 */
const SubscriptionSelection = ({
  subscriptions = [],
  selectedSubscription,
  onSubscriptionSelection,
  currency = "USD",
}) => {
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2">
          <FaCalendarAlt className="text-yellow-600" />
          <p className="text-yellow-800 text-sm font-medium">
            No subscription plans available for selection.
          </p>
        </div>
        <p className="text-yellow-700 text-xs mt-1">
          Please configure subscription plans in the form builder or contact
          support.
        </p>
      </div>
    );
  }

  // Helper function to get billing period display
  const getBillingPeriodDisplay = (subscription) => {
    const { billingPeriod, billingFrequency = 1 } = subscription;

    if (billingFrequency === 1) {
      switch (billingPeriod) {
        case "month":
          return "Monthly";
        case "year":
          return "Yearly";
        case "week":
          return "Weekly";
        case "day":
          return "Daily";
        default:
          return "Per billing cycle";
      }
    } else {
      switch (billingPeriod) {
        case "month":
          return `Every ${billingFrequency} months`;
        case "year":
          return `Every ${billingFrequency} years`;
        case "week":
          return `Every ${billingFrequency} weeks`;
        case "day":
          return `Every ${billingFrequency} days`;
        default:
          return `Every ${billingFrequency} billing cycles`;
      }
    }
  };

  // Helper function to get plan icon
  const getPlanIcon = (subscription) => {
    if (subscription.isPopular || subscription.recommended) {
      return <FaStar className="text-yellow-500" />;
    }
    if (subscription.isPremium) {
      return <FaCrown className="text-purple-500" />;
    }
    return <FaCalendarAlt className="text-blue-600" />;
  };

  // Helper function to calculate total savings
  const calculateTotalSavings = (subscription) => {
    if (
      !subscription.originalPrice ||
      subscription.originalPrice <= subscription.price
    ) {
      return 0;
    }
    return subscription.originalPrice - subscription.price;
  };

  return (
    <div className="mb-6">
      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <FaCalendarAlt className="text-blue-600" />
        Choose Your Plan
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subscriptions.map((subscription) => {
          const isSelected = selectedSubscription?.id === subscription.id;
          const billingDisplay = getBillingPeriodDisplay(subscription);
          const totalSavings = calculateTotalSavings(subscription);

          return (
            <div
              key={subscription.id}
              className={`relative border-2 rounded-lg transition-all duration-200 ${
                isSelected
                  ? "border-blue-500 bg-blue-50 shadow-lg transform scale-105"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-md"
              } ${
                subscription.isPopular || subscription.recommended
                  ? "ring-2 ring-yellow-400 ring-opacity-50"
                  : ""
              }`}
            >
              {/* Popular/Recommended badge */}
              {(subscription.isPopular || subscription.recommended) && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <FaStar className="w-3 h-3" />
                    {subscription.isPopular ? "Most Popular" : "Recommended"}
                  </div>
                </div>
              )}

              {/* Discount badge */}
              {totalSavings > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  Save{" "}
                  {Math.round(
                    (totalSavings / subscription.originalPrice) * 100
                  )}
                  %
                </div>
              )}

              <button
                onClick={() => onSubscriptionSelection(subscription)}
                className="w-full p-6 text-left"
                disabled={subscription.isDisabled}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    {getPlanIcon(subscription)}
                    <h5 className="font-medium text-gray-900">
                      {subscription.name}
                    </h5>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {subscription.description && (
                  <p className="text-gray-600 text-sm mb-4">
                    {subscription.description}
                  </p>
                )}

                {/* Pricing */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(subscription.price, currency)}
                    </span>
                    <span className="text-gray-600 text-sm">
                      / {billingDisplay.toLowerCase()}
                    </span>
                  </div>

                  {subscription.originalPrice &&
                    subscription.originalPrice > subscription.price && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500 line-through">
                          {formatCurrency(subscription.originalPrice, currency)}
                        </span>
                        <span className="text-sm text-green-600 font-medium">
                          Save {formatCurrency(totalSavings, currency)}
                        </span>
                      </div>
                    )}
                </div>

                {/* Features */}
                {subscription.features && subscription.features.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {subscription.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <FaCheck className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trial period */}
                {subscription.trialDays && subscription.trialDays > 0 && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <FaGift className="text-green-600 w-3 h-3" />
                    <p className="text-green-800 text-xs font-medium">
                      {subscription.trialDays}-day free trial included
                    </p>
                  </div>
                )}

                {/* Setup fee */}
                {subscription.setupFee && subscription.setupFee > 0 && (
                  <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded">
                    <p className="text-gray-600 text-xs flex items-center gap-1">
                      <FaClock className="w-3 h-3" />
                      One-time setup fee:{" "}
                      {formatCurrency(subscription.setupFee, currency)}
                    </p>
                  </div>
                )}

                {/* Billing cycle info */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <FaCalendarAlt className="w-3 h-3" />
                    <span>Billed {billingDisplay.toLowerCase()}</span>
                  </div>
                  {subscription.cancelAnytime && (
                    <div className="text-xs text-gray-500 mt-1">
                      Cancel anytime
                    </div>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {selectedSubscription && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FaCheck className="text-green-600" />
            <span className="text-green-800 font-medium">
              Selected Plan: {selectedSubscription.name}
            </span>
          </div>
          <div className="text-green-700 text-sm space-y-1">
            <div className="flex justify-between items-center">
              <span>Billing:</span>
              <span className="font-medium">
                {formatCurrency(selectedSubscription.price, currency)} /{" "}
                {getBillingPeriodDisplay(selectedSubscription).toLowerCase()}
              </span>
            </div>
            {selectedSubscription.trialDays &&
              selectedSubscription.trialDays > 0 && (
                <div className="flex justify-between items-center">
                  <span>Free trial:</span>
                  <span className="font-medium">
                    {selectedSubscription.trialDays} days
                  </span>
                </div>
              )}
            {selectedSubscription.setupFee &&
              selectedSubscription.setupFee > 0 && (
                <div className="flex justify-between items-center">
                  <span>Setup fee:</span>
                  <span className="font-medium">
                    {formatCurrency(selectedSubscription.setupFee, currency)}
                  </span>
                </div>
              )}
            {calculateTotalSavings(selectedSubscription) > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-green-300">
                <span className="font-medium">Total Savings:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(
                    calculateTotalSavings(selectedSubscription),
                    currency
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionSelection;
