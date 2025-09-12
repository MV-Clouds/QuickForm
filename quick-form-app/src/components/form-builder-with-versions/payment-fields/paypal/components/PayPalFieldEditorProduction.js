import React, { Suspense, lazy } from "react";
import { FaSpinner, FaCreditCard } from "react-icons/fa";
import PaymentErrorBoundary from "./PaymentErrorBoundary";
import { useProductionConfig } from "../config/productionConfig";
import { usePerformanceMonitor } from "../utils/performanceMonitor";
import { usePaymentFieldValidation } from "../utils/paymentFieldValidator";

// Lazy load the main component for better performance
const PayPalFieldEditorTabs = lazy(() => import("./PayPalFieldEditorTabs"));

/**
 * Production-Ready PayPal Field Editor
 * Includes error boundaries, performance monitoring, lazy loading, and production optimizations
 */
const PayPalFieldEditorProduction = ({
  selectedField,
  onUpdateField,
  userId,
  formId,
  className = "",
}) => {
  const { isProduction, getPerformanceConfig } = useProductionConfig();
  const performanceMonitor = usePerformanceMonitor(
    "PayPalFieldEditorProduction"
  );
  const validator = usePaymentFieldValidation();

  // Performance tracking
  React.useEffect(() => {
    performanceMonitor.trackRender("PayPalFieldEditorProduction");
  });

  // Validate props
  React.useEffect(() => {
    if (getPerformanceConfig().enableValidation) {
      const validationResults = [];

      if (!selectedField) {
        validationResults.push({
          type: "error",
          field: "selectedField",
          message: "selectedField is required",
        });
      }

      if (!onUpdateField) {
        validationResults.push({
          type: "error",
          field: "onUpdateField",
          message: "onUpdateField callback is required",
        });
      }

      if (!userId) {
        validationResults.push({
          type: "warning",
          field: "userId",
          message: "userId not provided",
        });
      }

      if (!formId) {
        validationResults.push({
          type: "warning",
          field: "formId",
          message: "formId not provided",
        });
      }

      if (validationResults.length > 0) {
        validator.printResults(
          validationResults,
          "PayPal Field Editor Props Validation"
        );
      }
    }
  }, [
    selectedField,
    onUpdateField,
    userId,
    formId,
    getPerformanceConfig,
    validator,
  ]);

  // Loading component
  const LoadingFallback = () => (
    <div className="flex items-center justify-center p-8 bg-blue-50 border border-blue-200 rounded-lg">
      <FaSpinner className="animate-spin text-blue-600 mr-3" size={20} />
      <div>
        <p className="text-blue-800 font-medium">
          Loading Payment Configuration
        </p>
        <p className="text-blue-600 text-sm">
          Initializing PayPal payment field editor...
        </p>
      </div>
    </div>
  );

  // Error fallback component
  const ErrorFallback = ({ error, retry }) => (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <FaCreditCard className="text-red-600 text-xl" />
        <div>
          <h3 className="text-lg font-semibold text-red-800">
            Payment Configuration Error
          </h3>
          <p className="text-sm text-red-600">
            Unable to load payment field configuration
          </p>
        </div>
      </div>

      <p className="text-red-700 mb-4">
        {isProduction
          ? "There was an issue loading the payment configuration. Please try again."
          : `Development Error: ${error?.message || "Unknown error"}`}
      </p>

      <div className="flex gap-3">
        <button
          onClick={retry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );

  // Don't render if required props are missing
  if (!selectedField || !onUpdateField) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Payment field configuration is not available. Please ensure the field
          is properly selected.
        </p>
      </div>
    );
  }

  return (
    <div className={`paypal-field-editor-production ${className}`}>
      {/* Production Configuration Info */}
      {!isProduction && getPerformanceConfig().enableDebugLogging && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FaCreditCard size={14} />
            <span>
              Environment: {isProduction ? "Production" : "Development"} |
              Performance Monitoring:{" "}
              {getPerformanceConfig().enableMonitoring ? "Enabled" : "Disabled"}{" "}
              | Validation:{" "}
              {getPerformanceConfig().enableValidation ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      )}

      {/* Error Boundary with Production Features */}
      <PaymentErrorBoundary
        userId={userId}
        formId={formId}
        fallback={ErrorFallback}
      >
        {/* Suspense for Lazy Loading */}
        <Suspense fallback={<LoadingFallback />}>
          <PayPalFieldEditorTabs
            selectedField={selectedField}
            onUpdateField={onUpdateField}
            userId={userId}
            formId={formId}
            className={className}
          />
        </Suspense>
      </PaymentErrorBoundary>
    </div>
  );
};

export default PayPalFieldEditorProduction;
