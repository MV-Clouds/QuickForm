import React, { useState, useEffect } from "react";
import { FaInfoCircle } from "react-icons/fa";
import MerchantAccountSelector from "./MerchantAccountSelector";
import FormProductManager from "./FormProductManager";

/**
 * PayPalFieldEditor Component
 *
 * Dedicated editor for PayPal payment field configuration
 * Handles all PayPal-specific state management and UI
 */
const PayPalFieldEditor = ({
  selectedField,
  onUpdateField,
  className = "",
}) => {
  // PayPal-specific state management
  const [paymentType, setPaymentType] = useState(
    selectedField?.subFields?.paymentType || "one_time"
  );
  const [amountType, setAmountType] = useState(
    selectedField?.subFields?.amount?.type || "static"
  );
  const [amountValue, setAmountValue] = useState(
    selectedField?.subFields?.amount?.value || 0
  );
  const [currency, setCurrency] = useState(
    selectedField?.subFields?.amount?.currency || "USD"
  );
  const [minAmount, setMinAmount] = useState(
    selectedField?.subFields?.amount?.minAmount || ""
  );
  const [maxAmount, setMaxAmount] = useState(
    selectedField?.subFields?.amount?.maxAmount || ""
  );
  const [suggestedAmounts, setSuggestedAmounts] = useState(
    selectedField?.subFields?.amount?.suggestedAmounts || ""
  );
  const [collectBillingAddress, setCollectBillingAddress] = useState(
    selectedField?.subFields?.behavior?.collectBillingAddress || false
  );
  const [collectShippingAddress, setCollectShippingAddress] = useState(
    selectedField?.subFields?.behavior?.collectShippingAddress || false
  );
  const [paypalEnabled, setPaypalEnabled] = useState(
    selectedField?.subFields?.paymentMethods?.paypal || true
  );
  const [cardsEnabled, setCardsEnabled] = useState(
    selectedField?.subFields?.paymentMethods?.cards || true
  );
  const [venmoEnabled, setVenmoEnabled] = useState(
    selectedField?.subFields?.paymentMethods?.venmo || false
  );
  const [googlePayEnabled, setGooglePayEnabled] = useState(
    selectedField?.subFields?.paymentMethods?.googlePay || false
  );
  const [selectedMerchantId, setSelectedMerchantId] = useState(
    selectedField?.subFields?.merchantId || ""
  );
  const [capabilities, setCapabilities] = useState(null);

  // Product/subscription/donation state - now from form data
  const [selectedProductId, setSelectedProductId] = useState(
    selectedField?.subFields?.amount?.productId || ""
  );
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(
    selectedField?.subFields?.subscription?.planId || ""
  );
  const [selectedDonationId, setSelectedDonationId] = useState(
    selectedField?.subFields?.donation?.id || ""
  );
  const [showManager, setShowManager] = useState(false);
  const [managerType, setManagerType] = useState("product");

  // Get items from form data instead of API
  const getFormItems = (type) => {
    const formItems = selectedField?.subFields?.formItems || {};
    return Object.values(formItems).filter((item) => item.type === type);
  };

  const products = getFormItems("product");
  const subscriptions = getFormItems("subscription");
  const donations = getFormItems("donation");

  // Update state when selectedField changes
  useEffect(() => {
    if (selectedField) {
      setPaymentType(selectedField?.subFields?.paymentType || "one_time");
      setAmountType(selectedField?.subFields?.amount?.type || "static");
      setAmountValue(selectedField?.subFields?.amount?.value || 0);
      setCurrency(selectedField?.subFields?.amount?.currency || "USD");
      setMinAmount(selectedField?.subFields?.amount?.minAmount || "");
      setMaxAmount(selectedField?.subFields?.amount?.maxAmount || "");
      setSuggestedAmounts(
        selectedField?.subFields?.amount?.suggestedAmounts || ""
      );
      setCollectBillingAddress(
        selectedField?.subFields?.behavior?.collectBillingAddress || false
      );
      setCollectShippingAddress(
        selectedField?.subFields?.behavior?.collectShippingAddress || false
      );
      setPaypalEnabled(
        selectedField?.subFields?.paymentMethods?.paypal || true
      );
      setCardsEnabled(selectedField?.subFields?.paymentMethods?.cards || true);
      setVenmoEnabled(selectedField?.subFields?.paymentMethods?.venmo || false);
      setGooglePayEnabled(
        selectedField?.subFields?.paymentMethods?.googlePay || false
      );
      setSelectedMerchantId(selectedField?.subFields?.merchantId || "");
      setSelectedProductId(selectedField?.subFields?.amount?.productId || "");
      setSelectedSubscriptionId(
        selectedField?.subFields?.subscription?.planId || ""
      );
      setSelectedDonationId(selectedField?.subFields?.donation?.id || "");
    }
  }, [selectedField]);

  // Handler for capabilities change
  const handleCapabilitiesChange = (newCapabilities) => {
    setCapabilities(newCapabilities);
  };

  // Handler for opening product manager
  const handleOpenManager = (type) => {
    setManagerType(type);
    setShowManager(true);
  };

  // Close manager modal when clicking outside
  const handleModalClose = (e) => {
    if (e.target === e.currentTarget) {
      setShowManager(false);
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showManager) {
        setShowManager(false);
      }
    };

    if (showManager) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [showManager]);

  if (!selectedField || selectedField.type !== "paypal_payment") {
    return null;
  }

  return (
    <div className={`paypal-field-editor ${className}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <svg
            className="w-6 h-6 text-blue-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.65 3.85-3.197 5.341-6.965 5.341h-2.312c-.228 0-.42.15-.472.374l-.718 4.54-.206 1.308-.144.911a.641.641 0 0 0 .633.74h3.94c.524 0 .968-.382 1.05-.9l.048-.302.718-4.54.048-.302c.082-.518.526-.9 1.05-.9h.662c3.606 0 6.426-1.462 7.25-5.69.343-1.77.133-3.253-.933-4.119z" />
          </svg>
          <h3 className="text-lg font-semibold text-blue-800">
            PayPal Payment Configuration
          </h3>
        </div>

        {/* Merchant Account Selection */}
        <MerchantAccountSelector
          selectedMerchantId={selectedMerchantId}
          onMerchantChange={(merchantId) => {
            setSelectedMerchantId(merchantId);
            const updatedSubFields = {
              ...selectedField.subFields,
              merchantId: merchantId,
            };
            onUpdateField(selectedField.id, { subFields: updatedSubFields });
          }}
          onAddNewAccount={() => {
            // Onboarding handled within MerchantAccountSelector
          }}
          onCapabilitiesChange={handleCapabilitiesChange}
        />

        {/* Payment Type - Dynamic based on capabilities */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Type
          </label>
          <select
            value={paymentType}
            onChange={(e) => {
              setPaymentType(e.target.value);
              const updatedSubFields = {
                ...selectedField.subFields,
                paymentType: e.target.value,
              };
              onUpdateField(selectedField.id, {
                subFields: updatedSubFields,
              });
            }}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="one_time">One-time Payment</option>
            <option
              value="subscription"
              disabled={!capabilities?.subscriptions}
            >
              Subscription
            </option>
            <option value="donation" disabled={!capabilities?.donations}>
              Donation
            </option>
          </select>
        </div>

        {/* Amount Configuration */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount Configuration
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Amount Type</label>
              <select
                value={amountType}
                onChange={(e) => {
                  setAmountType(e.target.value);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    amount: {
                      ...selectedField.subFields.amount,
                      type: e.target.value,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="static">Static Amount (Fixed Price)</option>
                <option value="variable">Variable Amount (User Choice)</option>
                <option value="custom">Custom Amount (User Enters)</option>
                <option value="suggested">Suggested Amounts</option>
                <option value="product_based">Product Based</option>
                <option value="subscription_based">Subscription Based</option>
                <option value="donation_based">Donation Based</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Currency</label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    amount: {
                      ...selectedField.subFields.amount,
                      currency: e.target.value,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
          </div>
          {/* Static Amount Configuration */}
          {amountType === "static" && (
            <div className="mt-2">
              <label className="text-xs text-gray-500">Amount</label>
              <input
                type="number"
                value={amountValue}
                onChange={(e) => {
                  setAmountValue(parseFloat(e.target.value) || 0);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    amount: {
                      ...selectedField.subFields.amount,
                      value: parseFloat(e.target.value) || 0,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          )}

          {/* Variable Amount Configuration */}
          {amountType === "variable" && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Min Amount</label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => {
                    setMinAmount(e.target.value);
                    const updatedSubFields = {
                      ...selectedField.subFields,
                      amount: {
                        ...selectedField.subFields.amount,
                        minAmount: e.target.value,
                      },
                    };
                    onUpdateField(selectedField.id, {
                      subFields: updatedSubFields,
                    });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Max Amount</label>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={(e) => {
                    setMaxAmount(e.target.value);
                    const updatedSubFields = {
                      ...selectedField.subFields,
                      amount: {
                        ...selectedField.subFields.amount,
                        maxAmount: e.target.value,
                      },
                    };
                    onUpdateField(selectedField.id, {
                      subFields: updatedSubFields,
                    });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="100.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {/* Custom Amount Configuration */}
          {amountType === "custom" && (
            <div className="mt-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FaInfoCircle className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Custom Amount Checkout
                  </span>
                </div>
                <p className="text-sm text-blue-700">
                  Users will be able to enter their own amount during checkout.
                  You can optionally set minimum and maximum limits.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-xs text-gray-500">
                    Min Amount (Optional)
                  </label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => {
                      setMinAmount(e.target.value);
                      const updatedSubFields = {
                        ...selectedField.subFields,
                        amount: {
                          ...selectedField.subFields.amount,
                          minAmount: e.target.value,
                        },
                      };
                      onUpdateField(selectedField.id, {
                        subFields: updatedSubFields,
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Max Amount (Optional)
                  </label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => {
                      setMaxAmount(e.target.value);
                      const updatedSubFields = {
                        ...selectedField.subFields,
                        amount: {
                          ...selectedField.subFields.amount,
                          maxAmount: e.target.value,
                        },
                      };
                      onUpdateField(selectedField.id, {
                        subFields: updatedSubFields,
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="1000.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Suggested Amounts Configuration */}
          {amountType === "suggested" && (
            <div className="mt-2">
              <label className="text-xs text-gray-500">
                Suggested Amounts (comma-separated)
              </label>
              <input
                type="text"
                value={suggestedAmounts}
                onChange={(e) => {
                  setSuggestedAmounts(e.target.value);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    amount: {
                      ...selectedField.subFields.amount,
                      suggestedAmounts: e.target.value,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="10, 25, 50, 100"
              />
            </div>
          )}

          {/* Product-Based Amount Configuration */}
          {amountType === "product_based" && (
            <div className="mt-2">
              <label className="text-xs text-gray-500">Select Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    amount: {
                      ...selectedField.subFields.amount,
                      productId: e.target.value,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenManager("product")}
                className="mt-2 text-blue-600 hover:underline"
              >
                Manage Products
              </button>
            </div>
          )}

          {/* Subscription-Based Amount Configuration */}
          {amountType === "subscription_based" && (
            <div className="mt-2">
              <label className="text-xs text-gray-500">
                Select Subscription
              </label>
              <select
                value={selectedSubscriptionId}
                onChange={(e) => {
                  setSelectedSubscriptionId(e.target.value);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    subscription: {
                      ...selectedField.subFields.subscription,
                      planId: e.target.value,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select subscription</option>
                {subscriptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${s.price})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenManager("subscription")}
                className="mt-2 text-blue-600 hover:underline"
              >
                Manage Subscriptions
              </button>
            </div>
          )}

          {/* Donation-Based Amount Configuration */}
          {amountType === "donation_based" && (
            <div className="mt-2">
              <label className="text-xs text-gray-500">Select Donation</label>
              <select
                value={selectedDonationId}
                onChange={(e) => {
                  setSelectedDonationId(e.target.value);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    donation: {
                      ...selectedField.subFields.donation,
                      id: e.target.value,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select donation</option>
                {donations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (${d.price})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenManager("donation")}
                className="mt-2 text-blue-600 hover:underline"
              >
                Manage Donations
              </button>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Methods
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={paypalEnabled}
                onChange={(e) => {
                  setPaypalEnabled(e.target.checked);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    paymentMethods: {
                      ...selectedField.subFields.paymentMethods,
                      paypal: e.target.checked,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">PayPal</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={cardsEnabled}
                onChange={(e) => {
                  setCardsEnabled(e.target.checked);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    paymentMethods: {
                      ...selectedField.subFields.paymentMethods,
                      cards: e.target.checked,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Cards</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={venmoEnabled}
                onChange={(e) => {
                  setVenmoEnabled(e.target.checked);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    paymentMethods: {
                      ...selectedField.subFields.paymentMethods,
                      venmo: e.target.checked,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Venmo</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={googlePayEnabled}
                onChange={(e) => {
                  setGooglePayEnabled(e.target.checked);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    paymentMethods: {
                      ...selectedField.subFields.paymentMethods,
                      googlePay: e.target.checked,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Google Pay</span>
            </label>
          </div>
        </div>

        {/* Field Behavior Settings */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Field Behavior
          </label>
          <div className="space-y-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={collectBillingAddress}
                onChange={(e) => {
                  setCollectBillingAddress(e.target.checked);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    behavior: {
                      ...selectedField.subFields.behavior,
                      collectBillingAddress: e.target.checked,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Collect Billing Address
              </span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={collectShippingAddress}
                onChange={(e) => {
                  setCollectShippingAddress(e.target.checked);
                  const updatedSubFields = {
                    ...selectedField.subFields,
                    behavior: {
                      ...selectedField.subFields.behavior,
                      collectShippingAddress: e.target.checked,
                    },
                  };
                  onUpdateField(selectedField.id, {
                    subFields: updatedSubFields,
                  });
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Collect Shipping Address
              </span>
            </label>
          </div>
        </div>

        {/* Information Note */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <FaInfoCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Note:</strong> This is a PayPal payment field. Only one
              payment field is allowed per form. Configure your merchant account
              and payment settings to start accepting payments.
            </div>
          </div>
        </div>
      </div>

      {/* Form Product Manager Modal */}
      {showManager && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleModalClose}
        >
          <div className="bg-white rounded-lg max-w-5xl w-full m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                Manage Form{" "}
                {managerType.charAt(0).toUpperCase() + managerType.slice(1)}s
              </h2>
              <button
                onClick={() => setShowManager(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FormProductManager
                selectedField={selectedField}
                onUpdateField={onUpdateField}
                selectedMerchantId={selectedMerchantId}
                typeFilter={managerType}
                onClose={() => setShowManager(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayPalFieldEditor;
