import React, { useEffect, useMemo } from "react";
import SimplePayPalButton from "./SimplePayPalButton";
import AmountInput from "./AmountInput";
import ProductSelection from "./ProductSelection";
import SubscriptionSelection from "./SubscriptionSelection";
import PayPalCardPayment from "./PayPalCardPayment";
import GooglePayIntegration from "./GooglePayIntegration";
import PayPalDonateButton from "./PayPalDonateButton";

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
  }, []);

  // Keep PayPal button style stable across renders
  const paypalBtnStyle = useMemo(
    () => ({
      shape: "rect",
      color: "blue",
      layout: "vertical",
      label: paymentType === "subscription" ? "subscribe" : "paypal",
    }),
    [paymentType]
  );

  const renderPaymentTypeContent = () => {
    switch (paymentType) {
      case "donation_button": {
        const donationButtonId =
          subFields?.donationButtonId || subFields?.hostedButtonId;
        return (
          <div className="mb-4">
            <PayPalDonateButton
              hostedButtonId={donationButtonId}
              environment={
                process.env.NODE_ENV === "production" ? "production" : "sandbox"
              }
              merchantId={merchantCredentials?.merchantId}
              itemName={subFields?.itemName || "Donation"}
              customMessage={subFields?.customMessage}
              customImageUrl={subFields?.customImageUrl}
              onComplete={onApprove}
              onError={onError}
              className="w-full"
            />
          </div>
        );
      }
      case "product_wise": {
        // Extract products from multiple possible locations
        const formItems = subFields?.formItems || {};
        const formItemsProducts = Object.values(formItems).filter(
          (item) => item.type === "product"
        );
        const directProducts = subFields?.products || [];

        // Combine both sources, preferring direct products if available
        const products =
          directProducts.length > 0 ? directProducts : formItemsProducts;

        console.log("🛍️ ProductSelection - Checking product sources:", {
          formItemsProducts,
          directProducts,
          finalProducts: products,
          subFields,
        });

        return (
          <ProductSelection
            products={products}
            selectedProducts={selectedProduct} // Pass as selectedProducts for backward compatibility
            onProductSelection={onProductSelection}
            currency={subFields?.currency || "USD"}
            allowMultiple={true} // Enable multiple selection for product-wise payments
          />
        );
      }
      case "subscription": {
        // Extract subscriptions from multiple possible locations
        const formItems = subFields?.formItems || {};
        const formItemsSubscriptions = Object.values(formItems).filter(
          (item) => item.type === "subscription"
        );
        const directSubscriptions = subFields?.subscriptions || [];

        // Combine both sources, preferring direct subscriptions if available
        const rawSubscriptions =
          directSubscriptions.length > 0
            ? directSubscriptions
            : formItemsSubscriptions;

        // Transform subscription data to match SubscriptionSelection component format
        const transformedSubscriptions = rawSubscriptions.map((sub) => {
          // Extract price from nested structure
          let price = 0;
          let currency = subFields?.currency || "USD";
          let billingPeriod = "month";
          let billingFrequency = 1;

          if (
            sub.planData &&
            sub.planData.billing_cycles &&
            sub.planData.billing_cycles.length > 0
          ) {
            const billingCycle = sub.planData.billing_cycles[0];
            if (
              billingCycle.pricing_scheme &&
              billingCycle.pricing_scheme.fixed_price
            ) {
              price =
                parseFloat(billingCycle.pricing_scheme.fixed_price.value) || 0;
              currency =
                billingCycle.pricing_scheme.fixed_price.currency_code ||
                currency;
            }

            // Extract billing frequency and period
            if (billingCycle.frequency) {
              billingFrequency = billingCycle.frequency.interval_count || 1;
              const intervalUnit = billingCycle.frequency.interval_unit;
              if (intervalUnit === "MONTH") billingPeriod = "month";
              else if (intervalUnit === "YEAR") billingPeriod = "year";
              else if (intervalUnit === "WEEK") billingPeriod = "week";
              else if (intervalUnit === "DAY") billingPeriod = "day";
            }
          }

          // Handle legacy price format for backward compatibility
          if (!price && sub.price) {
            price = parseFloat(sub.price) || 0;
          }

          return {
            id: sub.id,
            name: sub.name || "Subscription Plan",
            description: sub.description || "",
            price: price,
            currency: currency,
            billingPeriod: billingPeriod,
            billingFrequency: billingFrequency,
            status: sub.status || "ACTIVE",
            paypalPlanId: sub.paypalPlanId,
            planData: sub.planData, // Keep original plan data for PayPal integration
            // Add any other fields that might be used
            features: sub.features || [],
            isPopular: sub.isPopular || false,
            recommended: sub.recommended || false,
            trialDays: sub.trialDays || 0,
            setupFee: sub.setupFee || 0,
            cancelAnytime: sub.cancelAnytime !== false,
          };
        });

        console.log(
          "📅 SubscriptionSelection - Transformed subscription data:",
          {
            rawSubscriptions,
            transformedSubscriptions,
            subFields,
          }
        );

        return (
          <SubscriptionSelection
            subscriptions={transformedSubscriptions}
            selectedSubscription={selectedSubscription}
            onSubscriptionSelection={onSubscriptionSelection}
            currency={subFields?.currency || "USD"}
          />
        );
      }
      case "custom_amount": {
        const amountType = subFields?.amount?.type;
        const staticAmount = subFields?.amount?.value;
        if (amountType === "static" && staticAmount) {
          return (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Payment Amount
              </h4>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">
                    Fixed Amount:
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: subFields?.currency || "USD",
                    }).format(staticAmount)}
                  </span>
                </div>
              </div>
            </div>
          );
        }
        return (
          <AmountInput
            amount={paymentAmount}
            onAmountChange={onAmountChange}
            error={amountError}
            currency={subFields?.currency || "USD"}
            suggestedAmounts={subFields?.suggestedAmounts || []}
            placeholder={subFields?.placeholder || "Enter amount"}
            amountConfig={subFields?.amount || {}}
            paymentType={paymentType}
          />
        );
      }
      default:
        return (
          <AmountInput
            amount={paymentAmount}
            onAmountChange={onAmountChange}
            error={amountError}
            currency={subFields?.currency || "USD"}
            suggestedAmounts={subFields?.suggestedAmounts || []}
            placeholder={subFields?.placeholder || "Enter amount"}
            amountConfig={subFields?.amount || {}}
            paymentType={paymentType}
          />
        );
    }
  };

  const renderPaymentInterface = () => {
    // For subscriptions, force PayPal-only subscribe button regardless of selected payment method
    if (paymentType === "subscription") {
      return (
        <div className="mt-6">
          <SimplePayPalButton
            createOrder={undefined}
            createSubscription={createSubscription}
            onApprove={onApprove}
            onCancel={onCancel}
            onError={onError}
            disabled={!isPaymentButtonReady || isProcessing}
            style={paypalBtnStyle}
          />
        </div>
      );
    }

    if (!paymentMethod) return null;
    switch (paymentMethod) {
      case "paypal":
        return (
          <div className="mt-6">
            <SimplePayPalButton
              createOrder={createOrder}
              createSubscription={undefined}
              onApprove={onApprove}
              onCancel={onCancel}
              onError={onError}
              disabled={!isPaymentButtonReady || isProcessing}
              style={paypalBtnStyle}
            />
          </div>
        );
      case "card":
        return (
          <div className="mt-6">
            <PayPalCardPayment
              createOrderHandler={createOrder}
              onApproveOrder={onApprove}
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
            onError={onError}
            isProduction={false}
            createOrderHandler={createOrder}
            onApproveOrder={onApprove}
            disabled={!isPaymentButtonReady || isProcessing}
          />
        );
      default:
        return null;
    }
  };

  const renderPaymentSummary = () => {
    let amount = 0;
    let description = "";

    if (paymentType === "product_wise" && selectedProduct) {
      if (Array.isArray(selectedProduct)) {
        // Multiple products
        amount = selectedProduct.reduce(
          (sum, product) => sum + (product.price || 0),
          0
        );
        description =
          selectedProduct.length === 1
            ? selectedProduct[0].name
            : `${selectedProduct.length} Products Selected`;
      } else {
        // Single product
        amount = selectedProduct.price || 0;
        description = selectedProduct.name || "Selected Product";
      }
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
                {paymentType === "subscription"
                  ? "PayPal"
                  : paymentMethod === "paypal"
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
