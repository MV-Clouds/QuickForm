import React from "react";
import { FaCreditCard, FaCheckCircle, FaLock } from "react-icons/fa";
import PayPalPaymentField from "./paypal/components/PayPalPaymentField";

/**
 * PaymentSidebar Component
 *
 * Simplified sidebar showing only payment fields for drag and drop
 */
const PaymentSidebar = ({ fields = [], onDragStart, onDragEnd,isEditable }) => {
  // Check if payment field already exists
  const hasPaymentField = fields.some(
    (field) => field.type === "paypal_payment"
  );

  return (
    <div className="payment-sidebar h-full flex flex-col">
      {/* Payment Fields Header */}
      <div className="border-b border-gray-200 mb-4 pb-4">
        <div className="flex items-center gap-2">
          <FaCreditCard className="text-blue-600" size={16} />
          <h2 className="text-lg font-semibold text-gray-900">
            Payment Fields
          </h2>
          {hasPaymentField && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              1 Added
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Drag payment fields to your form to start accepting payments
        </p>
      </div>

      {/* Payment Fields Content */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-3">
          <PayPalPaymentField
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isEditable={isEditable}
            fields={fields}
          />

          {/* Future payment gateways */}
          <div className="opacity-50 pointer-events-none">
            <div className="field-item flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-200">
                  <FaCreditCard className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-400">
                    Stripe Payment
                  </span>
                  <span className="text-xs block text-gray-400">
                    Coming Soon
                  </span>
                </div>
              </div>
              <FaLock className="text-gray-400" size={12} />
            </div>
          </div>

          <div className="opacity-50 pointer-events-none">
            <div className="field-item flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-200">
                  <FaCreditCard className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-400">
                    Razorpay Payment
                  </span>
                  <span className="text-xs block text-gray-400">
                    Coming Soon
                  </span>
                </div>
              </div>
              <FaLock className="text-gray-400" size={12} />
            </div>
          </div>
        </div>

        {hasPaymentField && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Payment Field Added
                </p>
                <p className="text-xs text-green-600">
                  Your form is ready to accept payments. Configure payment
                  settings by selecting the payment field in your form.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSidebar;
