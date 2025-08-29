import React from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";

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
  style = {
    shape: "rect",
    color: "blue",
    layout: "vertical",
    label: "paypal",
  },
}) => {
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
  
  console.log("🎛️ Using button props:", buttonProps);
  return (
    <PayPalButtons
      // If a createSubscription handler is provided, use it; otherwise fallback to createOrder
      {...buttonProps}
      onApprove={onApprove}
      onCancel={onCancel}
      onError={onError}
      disabled={disabled}
      style={style}
    />
  );
};

export default SimplePayPalButton;
