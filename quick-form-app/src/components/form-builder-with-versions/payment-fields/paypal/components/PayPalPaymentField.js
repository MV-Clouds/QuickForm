import React from "react";

/**
 * PayPal Payment Field Component for Form Builder Sidebar
 * This component represents a draggable PayPal payment field that can be added to forms
 */

// PayPal icon component
const PayPalIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.65 3.85-3.197 5.341-6.965 5.341h-2.312c-.228 0-.42.15-.472.374l-.718 4.54-.206 1.308-.144.911a.641.641 0 0 0 .633.74h3.94c.524 0 .968-.382 1.05-.9l.048-.302.718-4.54.048-.302c.082-.518.526-.9 1.05-.9h.662c3.606 0 6.426-1.462 7.25-5.69.343-1.77.133-3.253-.933-4.119z" />
  </svg>
);

// Default configuration for PayPal payment fields
export const paypalFieldDefaultConfig = {
  fieldType: "payment",
  gateway: "paypal",
  fieldLabel: "Payment Information",
  merchantId: null,
  paymentType: "one_time", // one_time, subscription, donation

  // Amount configuration
  amount: {
    type: "fixed", // fixed, variable, suggested, product_based
    value: 0,
    currency: "USD",
    minAmount: null,
    maxAmount: null,
    suggestions: [], // For donation suggested amounts
    allowCustomAmount: true,
    products: [], // For product-based amounts
  },

  // Subscription configuration (if applicable)
  subscription: {
    planId: null,
    frequency: "monthly",
    trialPeriod: null,
  },

  // Donation configuration (if applicable)
  donation: {
    cause: "",
    taxDeductible: false,
    anonymousOption: true,
  },

  // Payment methods configuration
  paymentMethods: {
    paypal: true,
    cards: true,
    venmo: false,
    googlePay: false,
    payLater: false,
  },

  // Field behavior settings
  behavior: {
    required: true,
    collectBillingAddress: false,
    collectShippingAddress: false,
  },

  // Standard field properties
  validation: {
    required: true,
  },

  conditionalLogic: {
    showIf: null,
    hideIf: null,
  },
};

/**
 * PayPal Payment Field Component
 * Draggable component for the payments tab in the form builder sidebar
 */
const PayPalPaymentField = ({ onDragStart, onDragEnd, fields = [] }) => {
  const fieldType = "paypal_payment";
  const label = "PayPal Payment";

  // Check if a payment field already exists
  const hasPaymentField = fields.some(
    (field) => field.type === "paypal_payment"
  );

  const handleDragStart = (e) => {
    // Prevent drag if payment field already exists
    if (hasPaymentField) {
      e.preventDefault();
      alert(
        "Only one payment field is allowed per form. Please remove the existing payment field first."
      );
      return;
    }

    e.dataTransfer.setData("fieldType", fieldType);
    e.dataTransfer.setData("fieldId", "");
    e.dataTransfer.setData("paymentGateway", "paypal");

    // Add visual feedback to the source element
    e.currentTarget.style.opacity = "0.5";
    e.currentTarget.style.transform = "scale(0.95)";

    // Create custom drag image with reduced opacity and subtle effects
    const dragElement = e.currentTarget.cloneNode(true);
    dragElement.style.position = "absolute";
    dragElement.style.top = "-1000px";
    dragElement.style.left = "-1000px";
    dragElement.style.width = e.currentTarget.offsetWidth + "px";
    dragElement.style.height = e.currentTarget.offsetHeight + "px";
    dragElement.style.opacity = "0.7";
    dragElement.style.background = "rgba(255, 255, 255, 0.7)";
    dragElement.style.borderRadius = "8px";

    // Make text slightly faded
    const textElements = dragElement.querySelectorAll("*");
    textElements.forEach((el) => {
      el.style.opacity = "0.8";
    });

    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(
      dragElement,
      e.nativeEvent.offsetX,
      e.nativeEvent.offsetY
    );

    // Clean up after drag
    setTimeout(() => {
      if (document.body.contains(dragElement)) {
        document.body.removeChild(dragElement);
      }
    }, 0);

    // Call parent drag start handler if provided
    if (onDragStart) {
      onDragStart(e, fieldType);
    }
  };

  const handleDragEnd = (e) => {
    // Reset visual feedback
    e.currentTarget.style.opacity = "";
    e.currentTarget.style.transform = "";

    // Call parent drag end handler if provided
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  return (
    <div
      draggable={!hasPaymentField}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`field-item flex items-center justify-between p-2 border rounded-lg transition-all duration-150 group ${
        hasPaymentField
          ? "border-gray-300 bg-gray-100 cursor-not-allowed opacity-60"
          : "border-gray-200 hover:bg-blue-50 cursor-grab active:cursor-grabbing"
      }`}
      title={
        hasPaymentField
          ? "Only one payment field is allowed per form"
          : "Drag to add PayPal payment field to your form"
      }
    >
      <div className="flex items-center gap-1">
        <div
          className="w-8 h-8 rounded flex items-center justify-center"
          style={{ backgroundColor: "rgba(240, 240, 240, 1)" }}
        >
          <PayPalIcon
            className={`w-5 h-5 ${
              hasPaymentField ? "text-gray-400" : "text-blue-600"
            }`}
          />
        </div>
        <span
          className={`text-sm font-medium ${
            hasPaymentField ? "text-gray-400" : "text-gray-700"
          }`}
        >
          {label}
          {hasPaymentField && (
            <span className="text-xs block text-gray-400">Already added</span>
          )}
        </span>
      </div>
      <div className="pr-1">
        <svg
          width="9"
          height="14"
          viewBox="0 0 9 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3 1.55556C3 2.41465 2.32841 3.11111 1.5 3.11111C0.671587 3.11111 0 2.41465 0 1.55556C0 0.696446 0.671587 0 1.5 0C2.32841 0 3 0.696446 3 1.55556ZM1.5 8.55556C2.32841 8.55556 3 7.85909 3 7C3 6.14091 2.32841 5.44444 1.5 5.44444C0.671587 5.44444 0 6.14091 0 7C0 7.85909 0.671587 8.55556 1.5 8.55556ZM1.5 14C2.32841 14 3 13.3035 3 12.4444C3 11.5854 2.32841 10.8889 1.5 10.8889C0.671587 10.8889 0 11.5854 0 12.4444C0 13.3035 0.671587 14 1.5 14Z"
            fill="#5F6165"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9 1.55556C9 2.41465 8.32841 3.11111 7.5 3.11111C6.67159 3.11111 6 2.41465 6 1.55556C6 0.696446 6.67159 0 7.5 0C8.32841 0 9 0.696446 9 1.55556ZM7.5 8.55556C8.32841 8.55556 9 7.85909 9 7C9 6.14091 8.32841 5.44444 7.5 5.44444C6.67159 5.44444 6 6.14091 6 7C6 7.85909 6.67159 8.55556 7.5 8.55556ZM7.5 14C8.32841 14 9 13.3035 9 12.4444C9 11.5854 8.32841 10.8889 7.5 10.8889C6.67159 10.8889 6 11.5854 6 12.4444C6 13.3035 6.67159 14 7.5 14Z"
            fill="#5F6165"
          />
        </svg>
      </div>
    </div>
  );
};

export default PayPalPaymentField;
