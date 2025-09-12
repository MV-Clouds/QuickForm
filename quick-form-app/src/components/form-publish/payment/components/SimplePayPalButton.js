import React, { useMemo } from "react";
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
  // Minimal diagnostics only in development to avoid noisy logs that suggest remounts
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("🧩 SimplePayPalButton ready", {
      createOrder: !!createOrder,
      createSubscription: !!createSubscription,
    });
  }
  // For subscription flows, PayPal recommends using the "subscribe" label
  const styleMemo = useMemo(() => {
    const base = style || {};
    if (createSubscription) {
      return { ...base, label: "subscribe" };
    }
    return base;
  }, [createSubscription, style]);

  // Signature of the style for safe forceReRender (primitives only)
  const styleSignature = useMemo(() => {
    return [styleMemo.shape, styleMemo.color, styleMemo.layout, styleMemo.label]
      .filter(Boolean)
      .join(":");
  }, [styleMemo]);

  // Ensure we pass the correct creation callback without changing it unnecessarily
  const buttonProps = useMemo(
    () => (createSubscription ? { createSubscription } : { createOrder }),
    [createSubscription, createOrder]
  );

  return (
    <>
      {showSpinner && isPending && (
        <div className="flex items-center justify-center mb-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">Loading PayPal…</span>
        </div>
      )}
      <PayPalButtons
        // If a createSubscription handler is provided, use it; otherwise fallback to createOrder
        {...buttonProps}
        // onClick={(data, actions) => {
        //   if (disabled) {
        //     // eslint-disable-next-line no-console
        //     console.warn("🛑 PayPal button click blocked: disabled");
        //     return actions.reject();
        //   }
        //   return actions.resolve();
        // }}
        // Validate before opening the PayPal window
        // onClick={(data, actions) => {
        //   if (disabled) {
        //     console.warn("🛑 PayPal button click blocked: disabled");
        //     return actions.reject();
        //   }
        //   console.log("▶️ PayPal button onClick resolved");
        //   return actions.resolve();
        // }}
        onApprove={onApprove}
        onCancel={onCancel}
        onError={(e) => {
          const err =
            e instanceof Error
              ? e
              : new Error(e?.message || e?.toString() || "PayPal error");
          onError?.(err);
        }}
        // Avoid toggling disabled which can cause re-renders; parent should gate clicks via onClick if needed
        style={styleMemo}
        // Only re-render when external keys or style signature change; avoid object identity churn
        forceReRender={[styleSignature, ...forceReRenderKeys]}
        fundingSource={undefined}
      />
    </>
  );
};

export default SimplePayPalButton;
