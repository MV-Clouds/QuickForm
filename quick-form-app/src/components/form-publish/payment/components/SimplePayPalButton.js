import React from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

/**
 * Simple PayPal Button Component
 * Wraps the PayPalButtons from @paypal/react-paypal-js
 */
const SimplePayPalButton = ({
  createOrder,
  createSubscription, // optional: used when intent is subscription
  onApprove,
  onCancel,
  onError,
  disabled = false,
  showSpinner = false,
  forceReRenderKeys = [],
  style = {
    shape: "rect",
    color: "blue",
    layout: "vertical",
    label: "paypal",
  },
}) => {
  const [{ isPending }] = usePayPalScriptReducer();
  console.log("🎛️ SimplePayPalButton props:", {
    hasCreateOrder: !!createOrder,
    hasCreateSubscription: !!createSubscription,
    hasOnApprove: !!onApprove,
    hasOnCancel: !!onCancel,
    hasOnError: !!onError,
    disabled,
    style,
  });

  const buttonProps = createSubscription
    ? { createSubscription }
    : { createOrder };

  // For subscription flows, PayPal recommends using the "subscribe" label
  const computedStyle = createSubscription
    ? { ...style, label: "subscribe" }
    : style;

  console.log("🎛️ Using button props:", buttonProps);
  return (
    <>
      {(showSpinner && isPending) && (
        <div className="flex items-center justify-center mb-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">Loading PayPal…</span>
        </div>
      )}
      <PayPalButtons
      // If a createSubscription handler is provided, use it; otherwise fallback to createOrder
      {...buttonProps}
      // Validate before opening the PayPal window
      onClick={(data, actions) => {
        if (disabled) {
          console.warn("🛑 PayPal button click blocked: disabled");
          return actions.reject();
        }
        console.log("▶️ PayPal button onClick resolved");
        return actions.resolve();
      }}
      onApprove={onApprove}
      onCancel={onCancel}
      onError={(e) => {
        const err =
          e instanceof Error
            ? e
            : new Error(e?.message || e?.toString() || "PayPal error");
        onError?.(err);
      }}
      disabled={disabled}
      style={computedStyle}
      forceReRender={[computedStyle, ...forceReRenderKeys]}
      fundingSource={undefined}
    />
    </>
  );
};

export default SimplePayPalButton;
