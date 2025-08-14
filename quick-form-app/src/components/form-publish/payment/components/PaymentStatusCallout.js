import React from "react";

/**
 * PaymentStatusCallout Component
 * Shows success, error, and info messages for payment operations
 */
const PaymentStatusCallout = ({
  type = "info",
  message,
  details,
  onClose,
  className = "",
}) => {
  if (!message) return null;

  const getStyles = () => {
    switch (type) {
      case "success":
        return {
          container: "bg-green-50 border-green-200 text-green-800",
          icon: "text-green-600",
          iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
        };
      case "error":
        return {
          container: "bg-red-50 border-red-200 text-red-800",
          icon: "text-red-600",
          iconPath:
            "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
        };
      case "warning":
        return {
          container: "bg-yellow-50 border-yellow-200 text-yellow-800",
          icon: "text-yellow-600",
          iconPath:
            "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z",
        };
      default: // info
        return {
          container: "bg-blue-50 border-blue-200 text-blue-800",
          icon: "text-blue-600",
          iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`border rounded-lg p-4 mb-4 ${styles.container} ${className}`}
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 ${styles.icon}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={styles.iconPath}
            />
          </svg>
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
          {details && <p className="text-sm mt-1 opacity-90">{details}</p>}
        </div>

        {/* Close Button */}
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 ${styles.icon} hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current`}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStatusCallout;
