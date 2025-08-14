import React from "react";
import PayPalFieldEditorTabs from "./paypal/components/PayPalFieldEditorTabs";
// Future imports for other payment gateways
// import StripeFieldEditor from "./StripeFieldEditor";
// import RazorpayFieldEditor from "./RazorpayFieldEditor";
// import SquareFieldEditor from "./SquareFieldEditor";

/**
 * PaymentFieldEditor Component
 *
 * Generic payment field editor that routes to specific payment gateway editors
 * based on the field's gateway configuration or field type.
 *
 * This component acts as a router/container for different payment gateway editors,
 * making it easy to add new payment gateways in the future.
 */
const PaymentFieldEditor = ({
  selectedField,
  onUpdateField,
  className = "",
  userId = null,
  formId = null,
}) => {
  // Return null if no field is selected or it's not a payment field
  if (!selectedField || !isPaymentField(selectedField)) {
    return null;
  }

  // Determine which payment gateway editor to render
  const gateway = getPaymentGateway(selectedField);

  switch (gateway) {
    case "paypal":
      return (
        <PayPalFieldEditorTabs
          selectedField={selectedField}
          onUpdateField={onUpdateField}
          className={className}
          userId={userId}
          formId={formId}
        />
      );

    // Future payment gateway cases
    // case "stripe":
    //   return (
    //     <StripeFieldEditor
    //       selectedField={selectedField}
    //       onUpdateField={onUpdateField}
    //       className={className}
    //     />
    //   );

    // case "razorpay":
    //   return (
    //     <RazorpayFieldEditor
    //       selectedField={selectedField}
    //       onUpdateField={onUpdateField}
    //       className={className}
    //     />
    //   );

    // case "square":
    //   return (
    //     <SquareFieldEditor
    //       selectedField={selectedField}
    //       onUpdateField={onUpdateField}
    //       className={className}
    //     />
    //   );

    default:
      return (
        <div className={`payment-field-editor-fallback ${className}`}>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-yellow-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="text-lg font-semibold text-yellow-800">
                Unsupported Payment Gateway
              </h3>
            </div>
            <p className="text-sm text-yellow-700 mt-2">
              The payment gateway "{gateway}" is not yet supported. Please
              select a supported payment gateway or contact support.
            </p>
            <div className="mt-3">
              <p className="text-xs text-yellow-600">
                Supported gateways: PayPal
              </p>
              <p className="text-xs text-yellow-600">
                Coming soon: Stripe, Razorpay, Square
              </p>
            </div>
          </div>
        </div>
      );
  }
};

/**
 * Helper function to determine if a field is a payment field
 */
function isPaymentField(field) {
  // Check if it's a payment field by type or has payment gateway configuration
  return (
    field.type === "paypal_payment" ||
    field.type === "stripe_payment" ||
    field.type === "razorpay_payment" ||
    field.type === "square_payment" ||
    field.type === "payment" ||
    (field.subFields && field.subFields.gateway) ||
    field.gateway
  );
}

/**
 * Helper function to determine the payment gateway from field configuration
 */
function getPaymentGateway(field) {
  // Priority order for determining gateway:
  // 1. Explicit gateway in subFields
  // 2. Explicit gateway in field
  // 3. Infer from field type
  // 4. Default fallback

  if (field.subFields && field.subFields.gateway) {
    return field.subFields.gateway;
  }

  if (field.gateway) {
    return field.gateway;
  }

  // Infer from field type
  if (field.type === "paypal_payment") {
    return "paypal";
  }

  if (field.type === "stripe_payment") {
    return "stripe";
  }

  if (field.type === "razorpay_payment") {
    return "razorpay";
  }

  if (field.type === "square_payment") {
    return "square";
  }

  // Default fallback - could be configurable
  return "unknown";
}

/**
 * Helper function to get available payment gateways
 * Useful for UI components that need to show available options
 */
export function getAvailablePaymentGateways() {
  return [
    {
      id: "paypal",
      name: "PayPal",
      description: "Accept payments via PayPal, cards, and digital wallets",
      supported: true,
      icon: "paypal",
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Accept credit cards and digital payments worldwide",
      supported: false, // Will be true when implemented
      icon: "stripe",
    },
    {
      id: "razorpay",
      name: "Razorpay",
      description: "Accept payments in India with UPI, cards, and wallets",
      supported: false, // Will be true when implemented
      icon: "razorpay",
    },
    {
      id: "square",
      name: "Square",
      description: "Accept in-person and online payments with Square",
      supported: false, // Will be true when implemented
      icon: "square",
    },
  ];
}

/**
 * Helper function to create a new payment field with specified gateway
 */
export function createPaymentField(gateway, fieldId) {
  const baseField = {
    id: fieldId,
    type: `${gateway}_payment`,
    label: `${gateway.charAt(0).toUpperCase() + gateway.slice(1)} Payment`,
    gateway: gateway,
    subFields: {
      gateway: gateway,
      // Gateway-specific default configuration will be handled by individual editors
    },
  };

  return baseField;
}

export default PaymentFieldEditor;
