import React, { useState, useEffect } from "react";
import { formatCurrency } from "../utils/paymentHelpers";
import { FaDollarSign, FaHeart, FaExclamationTriangle } from "react-icons/fa";

/**
 * Amount Input Component
 * Allows users to enter custom payment amounts
 */
const AmountInput = ({
  paymentAmount,
  amountError,
  onAmountChange,
  amountConfig = {},
  paymentType = "custom_amount",
}) => {
  const [inputValue, setInputValue] = useState(paymentAmount || "");
  const [isFocused, setIsFocused] = useState(false);

  const {
    currency = "USD",
    minAmount,
    maxAmount,
    suggestedAmounts = [],
    placeholder,
    label,
    description,
  } = amountConfig;

  // Update input value when paymentAmount changes externally
  useEffect(() => {
    if (paymentAmount !== inputValue) {
      setInputValue(paymentAmount || "");
    }
  }, [paymentAmount, inputValue]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;

    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
      onAmountChange(value);
    }
  };

  // Handle suggested amount selection
  const handleSuggestedAmountClick = (amount) => {
    const amountStr = amount.toString();
    setInputValue(amountStr);
    onAmountChange(amountStr);
  };

  // Get appropriate icon based on payment type
  const getIcon = () => {
    switch (paymentType) {
      case "donation":
        return <FaHeart className="text-red-500" />;
      default:
        return <FaDollarSign className="text-green-600" />;
    }
  };

  // Get appropriate labels based on payment type
  const getLabels = () => {
    switch (paymentType) {
      case "donation":
        return {
          title: label || "Donation Amount",
          placeholder: placeholder || "Enter donation amount",
          description: description || "Enter the amount you'd like to donate",
        };
      default:
        return {
          title: label || "Payment Amount",
          placeholder: placeholder || "Enter amount",
          description: description || "Enter the payment amount",
        };
    }
  };

  const labels = getLabels();

  return (
    <div className="mb-6">
      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        {getIcon()}
        {labels.title}
      </h4>

      {labels.description && (
        <p className="text-gray-600 text-sm mb-4">{labels.description}</p>
      )}

      {/* Suggested amounts */}
      {suggestedAmounts && suggestedAmounts.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">
            {paymentType === "donation"
              ? "Quick donation amounts:"
              : "Suggested amounts:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedAmounts.map((amount, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedAmountClick(amount)}
                className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${
                  parseFloat(inputValue) === amount
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                {formatCurrency(amount, currency)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Amount input */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-lg font-medium">
              {currency === "USD" ? "$" : currency}
            </span>
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={labels.placeholder}
            className={`block w-full pl-8 pr-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
              amountError
                ? "border-red-300 bg-red-50"
                : isFocused
                ? "border-blue-300 bg-blue-50"
                : "border-gray-300 bg-white"
            }`}
          />
        </div>

        {/* Amount validation feedback */}
        {amountError && (
          <div className="mt-2 flex items-center gap-2 text-red-600">
            <FaExclamationTriangle className="w-4 h-4" />
            <span className="text-sm">{amountError}</span>
          </div>
        )}

        {/* Amount constraints display */}
        {(minAmount || maxAmount) && !amountError && (
          <div className="mt-2 text-sm text-gray-600">
            {minAmount && maxAmount ? (
              <span>
                Amount must be between {formatCurrency(minAmount, currency)} and{" "}
                {formatCurrency(maxAmount, currency)}
              </span>
            ) : minAmount ? (
              <span>Minimum amount: {formatCurrency(minAmount, currency)}</span>
            ) : (
              <span>Maximum amount: {formatCurrency(maxAmount, currency)}</span>
            )}
          </div>
        )}

        {/* Live amount preview */}
        {inputValue && !amountError && parseFloat(inputValue) > 0 && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-green-800 font-medium">
                {paymentType === "donation"
                  ? "Donation Amount:"
                  : "Payment Amount:"}
              </span>
              <span className="text-green-900 text-lg font-bold">
                {formatCurrency(parseFloat(inputValue), currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Additional payment type specific information */}
      {paymentType === "donation" && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            💝 Thank you for your generous donation! Every contribution makes a
            difference.
          </p>
        </div>
      )}
    </div>
  );
};

export default AmountInput;
