import React, { useState } from "react";

/**
 * PaymentMethodSelector Component
 * Allows users to select payment method when multiple options are available
 */
const PaymentMethodSelector = ({
  availableMethods = [],
  selectedMethod,
  onMethodSelect,
  className = "",
}) => {
  const [hoveredMethod, setHoveredMethod] = useState(null);

  // Payment method configurations
  const methodConfigs = {
    paypal: {
      name: "PayPal",
      description: "Pay with your PayPal account",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.65 3.85-3.197 5.341-6.965 5.341h-2.312c-.228 0-.42.15-.472.374l-.718 4.54-.206 1.308-.144.911a.641.641 0 0 0 .633.74h3.94c.524 0 .968-.382 1.05-.9l.048-.302.718-4.54.048-.302c.082-.518.526-.9 1.05-.9h.662c3.606 0 6.426-1.462 7.25-5.69.343-1.77.133-3.253-.933-4.119z" />
        </svg>
      ),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    cards: {
      name: "Credit/Debit Card",
      description: "Pay with Visa, Mastercard, or other cards",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
    venmo: {
      name: "Venmo",
      description: "Pay with Venmo",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.554 4.5c.7 1.8.7 3.4.7 4.9 0 6.8-3.1 12.1-8.1 12.1-2.4 0-4.4-1.5-4.4-3.6 0-2.1 1.5-8.7 1.5-8.7h3.8s-.8 4.4-.8 6.1c0 .7.3 1.1.8 1.1 1.5 0 3.1-3.9 3.1-8.3 0-1.2-.1-2.5-.4-3.6H19.554z" />
        </svg>
      ),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    googlePay: {
      name: "Google Pay",
      description: "Pay with Google Pay",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
        </svg>
      ),
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
  };

  if (availableMethods.length <= 1) {
    return null; // Don't show selector if only one method
  }

  return (
    <div className={`mb-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Choose Payment Method
      </h3>

      <div className="grid gap-3">
        {availableMethods.map((method) => {
          const config = methodConfigs[method];
          if (!config) return null;

          const isSelected = selectedMethod === method;
          const isHovered = hoveredMethod === method;

          return (
            <button
              key={method}
              onClick={() => onMethodSelect(method)}
              onMouseEnter={() => setHoveredMethod(method)}
              onMouseLeave={() => setHoveredMethod(null)}
              className={`
                relative flex items-center p-4 border-2 rounded-lg transition-all duration-200
                ${
                  isSelected
                    ? `${config.borderColor} ${config.bgColor} ring-2 ring-offset-2 ring-blue-500`
                    : `border-gray-200 hover:${config.borderColor} hover:${config.bgColor}`
                }
                ${isHovered && !isSelected ? "transform scale-[1.02]" : ""}
              `}
            >
              {/* Selection Indicator */}
              <div
                className={`
                w-4 h-4 rounded-full border-2 mr-4 flex items-center justify-center
                ${
                  isSelected
                    ? `${config.borderColor.replace(
                        "border-",
                        "border-"
                      )} bg-current`
                    : "border-gray-300"
                }
              `}
              >
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>

              {/* Icon */}
              <div className={`${config.color} mr-4`}>{config.icon}</div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">{config.name}</div>
                <div className="text-sm text-gray-600">
                  {config.description}
                </div>
              </div>

              {/* Selected Badge */}
              {isSelected && (
                <div
                  className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${config.color} ${config.bgColor}
                `}
                >
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
