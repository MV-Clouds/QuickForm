import React from "react";

/**
 * PaymentLoadingScreen Component
 * Shows loading states during payment processing
 */
const PaymentLoadingScreen = ({
  isLoading,
  loadingMessage = "Processing payment...",
  children,
}) => {
  if (!isLoading) {
    return children;
  }

  return (
    <div className="relative">
      {/* Overlay */}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
        <div className="flex flex-col items-center space-y-4 p-6">
          {/* Spinner */}
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>

          {/* Loading Message */}
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 mb-1">
              {loadingMessage}
            </p>
            <p className="text-sm text-gray-600">
              Please wait while we process your payment...
            </p>
          </div>

          {/* Security Notice */}
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Secure payment processing</span>
          </div>
        </div>
      </div>

      {/* Content (dimmed) */}
      <div className="opacity-50 pointer-events-none">{children}</div>
    </div>
  );
};

export default PaymentLoadingScreen;
