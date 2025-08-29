import React, { useEffect } from "react";
import SimplePayPalButton from "./SimplePayPalButton";
import AmountInput from "./AmountInput";
import ProductSelection from "./ProductSelection";
import SubscriptionSelection from "./SubscriptionSelection";
import PayPalCardPayment from "./PayPalCardPayment";
import GooglePayIntegration from "./GooglePayIntegration";

/**
 * Payment Content Component
 * Renders the appropriate payment interface based on selected payment method
 */
const PaymentContent = ({
  paymentMethod,
  paymentType,
  subFields,
  paymentAmount,
  amountError,
  selectedProduct,
  selectedSubscription,
  onAmountChange,
  onProductSelection,
  onSubscriptionSelection,
  createOrder,
  createSubscription,
  onApprove,
  onCancel,
  onError,
  isPaymentButtonReady,
  isProcessing,
  merchantCredentials,
}) => {
  useEffect(() => {
    console.log("SimplePayPalButton type:", typeof SimplePayPalButton);
    console.log("PayPalCardPayment type:", typeof PayPalCardPayment);
    console.log("GooglePayIntegration type:", typeof GooglePayIntegration);
    console.log("SubscriptionSelection type:", typeof SubscriptionSelection);
    console.log("AmountInput type:", typeof AmountInput);
    console.log("ProductSelection type:", typeof ProductSelection);
  });
  // Render content based on payment type
  const renderPaymentTypeContent = () => {
    switch (paymentType) {
      case "product_wise":
        return (
          <ProductSelection
            products={subFields?.products || []}
            selectedProduct={selectedProduct}
            onProductSelection={onProductSelection}
            currency={subFields?.currency || "USD"}
          />
        );

      case "subscription":
        return (
          <SubscriptionSelection
            subscriptions={subFields?.subscriptions || []}
            selectedSubscription={selectedSubscription}
            onSubscriptionSelection={onSubscriptionSelection}
            currency={subFields?.currency || "USD"}
          />
        );

      case "custom_amount":
      default:
        return (
          <AmountInput
            amount={paymentAmount}
            onAmountChange={onAmountChange}
            error={amountError}
            currency={subFields?.currency || "USD"}
            suggestedAmounts={subFields?.suggestedAmounts || []}
            placeholder={subFields?.placeholder || "Enter amount"}
          />
        );
    }
  };

  // Render payment interface based on selected method
  const renderPaymentInterface = () => {
    if (!paymentMethod) return null;

    switch (paymentMethod) {
      case "paypal":
        return (
          <div className="mt-6">
            <SimplePayPalButton
              createOrder={createOrder}
              createSubscription={
                paymentType === "subscription" ? createSubscription : undefined
              }
              onApprove={onApprove}
              onCancel={onCancel}
              onError={onError}
              disabled={!isPaymentButtonReady || isProcessing}
              style={{
                shape: "rect",
                color: "blue",
                layout: "vertical",
                label: "paypal",
              }}
            />
          </div>
        );

      case "card":
        return (
          <div className="mt-6">
            <PayPalCardPayment
              createOrderHandler={createOrder}
              onApproveOrder={onApprove}
              onSuccess={onApprove}
              onError={onError}
              disabled={!isPaymentButtonReady || isProcessing}
              merchantCredentials={merchantCredentials}
            />
          </div>
        );

      case "googlepay":
        return (
          <GooglePayIntegration
            merchantId={merchantCredentials?.merchantId}
            merchantCapabilities={merchantCredentials?.capabilities}
            amount={paymentAmount}
            currency={subFields?.currency || "USD"}
            onSuccess={onApprove}
            onError={onError}
            isProduction={false} // Or pass dynamically
            createOrderHandler={createOrder} // Pass for dynamic order creation
            onApproveOrder={onApprove} // Pass for dynamic approval
            disabled={!isPaymentButtonReady || isProcessing}
          />
        );
      default:
        return null;
    }
  };

  // Show payment summary
  const renderPaymentSummary = () => {
    let amount = 0;
    let description = "";

    if (paymentType === "product_wise" && selectedProduct) {
      amount = selectedProduct.price || 0;
      description = selectedProduct.name || "Selected Product";
    } else if (paymentType === "subscription" && selectedSubscription) {
      amount = selectedSubscription.price || 0;
      description = `${selectedSubscription.name} - ${selectedSubscription.billingPeriod}`;
    } else if (paymentType === "custom_amount" && paymentAmount) {
      amount = parseFloat(paymentAmount) || 0;
      description = "Custom Amount";
    }

    if (amount > 0) {
      return (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900">{description}</p>
              <p className="text-xs text-gray-600">
                Payment via{" "}
                {paymentMethod === "paypal"
                  ? "PayPal"
                  : paymentMethod === "card"
                  ? "Credit/Debit Card"
                  : "Google Pay"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                ${amount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-600 uppercase">
                {subFields?.currency || "USD"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="payment-content">
      {/* Payment Type Content */}
      {renderPaymentTypeContent()}

      {/* Payment Summary */}
      {renderPaymentSummary()}

      {/* Payment Interface */}
      {renderPaymentInterface()}

      {/* Processing State */}
      {isProcessing && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-blue-800 text-sm">Processing your payment...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentContent;
