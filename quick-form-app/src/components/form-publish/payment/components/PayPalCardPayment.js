import React, { useEffect, useRef, useState } from "react";
import {
  PayPalCardFieldsProvider,
  PayPalCardFieldsForm,
  usePayPalCardFields,
} from "@paypal/react-paypal-js";

// Submit button component that uses the card fields
const SubmitCardPayment = ({ onError, disabled, isPaying, setIsPaying }) => {
  const { cardFieldsForm } = usePayPalCardFields();

  const handleClick = async () => {
    if (!cardFieldsForm) {
      const childErrorMessage =
        "Unable to find any child components in the <PayPalCardFieldsProvider />";
      onError(new Error(childErrorMessage));
      return;
    }

    try {
      const formState = await cardFieldsForm.getState();

      if (!formState.isFormValid) {
        onError(
          new Error("The payment form is invalid. Please check all fields.")
        );
        return;
      }

      console.log("💳 Submitting card payment...");
      setIsPaying(true);

      await cardFieldsForm.submit();
    } catch (error) {
      console.error("💳 Card payment error:", error);
      setIsPaying(false);
      onError(error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isPaying}
      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
        disabled || isPaying
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      {isPaying ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          Processing Payment...
        </div>
      ) : (
        "💳 Pay with Card"
      )}
    </button>
  );
};

// Main card payment component
const PayPalCardPayment = ({
  createOrderHandler,
  onApproveOrder,
  onError,
  onCancel,
  disabled = false,
}) => {
  const [isPaying, setIsPaying] = useState(false);
  // Expose a validator function (set by a child inside the Provider)
  const validateCardFieldsRef = useRef(async () => true);

  // Use the same createOrder function as the main PayPal buttons
  const createOrder = async (data, actions) => {
    if (!createOrderHandler) {
      throw new Error("createOrderHandler is required for card payments");
    }

    try {
      // Validate card fields before creating order (safety net)
      try {
        const isValid = await validateCardFieldsRef.current?.();
        if (!isValid) {
          const err = new Error(
            "The payment form is invalid. Please check all fields."
          );
          console.warn("💳 Blocking createOrder due to invalid card fields");
          onError?.(err);
          throw err; // Ensure SDK halts
        }
      } catch (e) {
        // If validator isn't ready or throws, block to be safe
        const err =
          e instanceof Error ? e : new Error("Unable to validate card fields");
        onError?.(err);
        throw err;
      }

      console.log("💳 Creating order for card payment using shared handler");
      return await createOrderHandler(data, actions);
    } catch (error) {
      console.error("💳 Create order error:", error);
      throw error;
    }
  };

  // Use the same approve handler as the main PayPal buttons
  const handleApprove = async (data, actions) => {
    if (!onApproveOrder) {
      throw new Error("onApproveOrder is required for card payments");
    }

    try {
      console.log("💳 Card payment approved, using shared handler");
      const result = await onApproveOrder(data, actions);
      setIsPaying(false);

      return result;
    } catch (error) {
      console.error("💳 Payment approve error:", error);
      setIsPaying(false);
      onError(error);
    }
  };

  const handleError = (error) => {
    const err =
      error instanceof Error
        ? error
        : new Error(error?.message || error?.toString() || "Card fields error");
    console.error("💳 PayPal card fields error:", err);
    setIsPaying(false);
    onError(err);
  };

  return (
    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
      <h4 className="text-md font-medium text-gray-900 mb-2 flex items-center">
        <span className="mr-2">💳</span>
        Pay with Credit or Debit Card
      </h4>

      <p className="text-sm text-gray-600 mb-4">
        Secure card payment powered by PayPal. Your card information is
        encrypted and never stored.
      </p>

      <PayPalCardFieldsProvider
        createOrder={createOrder}
        onApprove={handleApprove}
        onError={handleError}
        onCancel={(data) => {
          console.log("💳 Card payment cancelled:", data);
          setIsPaying(false);
          onCancel(data);
        }}
      >
        {/* Binder to expose card form validator up to the parent createOrder */}
        <CardFieldsValidatorBinder
          setValidator={(fn) => (validateCardFieldsRef.current = fn)}
        />
        <div className="space-y-4">
          {/* PayPal Card Fields Form - handles all card inputs automatically */}
          <PayPalCardFieldsForm />

          {/* Submit Button */}
          <div className="mt-4">
            <SubmitCardPayment
              onError={onError}
              disabled={disabled}
              isPaying={isPaying}
              setIsPaying={setIsPaying}
            />
          </div>
        </div>
      </PayPalCardFieldsProvider>

      {/* Security Notice */}
      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
        <div className="flex items-center">
          <div className="text-green-600 mr-2">🔒</div>
          <p className="text-green-700">
            Your payment information is encrypted and secure. PayPal never
            stores your card details.
          </p>
        </div>
      </div>
    </div>
  );
};

// Internal helper inside Provider context to expose validation to parent
const CardFieldsValidatorBinder = ({ setValidator }) => {
  const { cardFieldsForm } = usePayPalCardFields();

  useEffect(() => {
    const validator = async () => {
      if (!cardFieldsForm) return false;
      const formState = await cardFieldsForm.getState();
      return !!formState?.isFormValid;
    };
    setValidator(() => validator);
  }, [cardFieldsForm, setValidator]);

  return null;
};

export default PayPalCardPayment;