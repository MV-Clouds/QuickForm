import React from "react";
import {
  FaExclamationTriangle,
  FaRedo,
  FaBug,
  FaLifeRing,
} from "react-icons/fa";
import { productionConfig } from "../config/productionConfig";

/**
 * Payment Error Boundary
 * Comprehensive error handling for payment components with production-ready features
 */
class PaymentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isReporting: false,
    };

    this.maxRetryAttempts = productionConfig.get(
      "errorHandling.maxRetryAttempts",
      3
    );
    this.enableErrorReporting = productionConfig.get(
      "errorHandling.enableErrorReporting",
      false
    );
    this.enableUserFeedback = productionConfig.get(
      "errorHandling.enableUserFeedback",
      true
    );
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `payment_error_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error(
      "💥 Payment Error Boundary caught an error:",
      error,
      errorInfo
    );

    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service in production
    if (this.enableErrorReporting) {
      this.reportError(error, errorInfo);
    }

    // Track error for analytics
    this.trackError(error, errorInfo);
  }

  // Report error to external monitoring service
  async reportError(error, errorInfo) {
    if (!this.enableErrorReporting) return;

    this.setState({ isReporting: true });

    try {
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.props.userId || "anonymous",
        formId: this.props.formId || "unknown",
        environment: productionConfig.environment,
        retryCount: this.state.retryCount,
      };

      // Send to error reporting service (replace with your actual service)
      await fetch("/api/errors/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorReport),
      });

      console.log("✅ Error reported successfully:", this.state.errorId);
    } catch (reportingError) {
      console.error("❌ Failed to report error:", reportingError);
    } finally {
      this.setState({ isReporting: false });
    }
  }

  // Track error for analytics
  trackError(error, errorInfo) {
    // Track error event (replace with your analytics service)
    if (window.gtag) {
      window.gtag("event", "exception", {
        description: error.message,
        fatal: false,
        custom_map: {
          error_id: this.state.errorId,
          component: "PaymentErrorBoundary",
          retry_count: this.state.retryCount,
        },
      });
    }

    // Track in console for development
    if (productionConfig.get("performance.enableDebugLogging")) {
      console.group("🔍 Error Tracking Details");
      console.log("Error ID:", this.state.errorId);
      console.log("Error Message:", error.message);
      console.log("Component Stack:", errorInfo.componentStack);
      console.log("Retry Count:", this.state.retryCount);
      console.groupEnd();
    }
  }

  // Handle retry attempt
  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    console.log(
      `🔄 Retrying payment component (attempt ${newRetryCount}/${this.maxRetryAttempts})`
    );

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount,
    });
  };

  // Handle feedback submission
  handleFeedbackSubmit = async (feedback) => {
    try {
      const feedbackData = {
        errorId: this.state.errorId,
        feedback,
        timestamp: new Date().toISOString(),
        userId: this.props.userId || "anonymous",
        formId: this.props.formId || "unknown",
      };

      await fetch("/api/feedback/error", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      });

      console.log("✅ Feedback submitted successfully");
    } catch (error) {
      console.error("❌ Failed to submit feedback:", error);
    }
  };

  // Get error category for better user messaging
  getErrorCategory(error) {
    if (!error) return "unknown";

    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return "network";
    }
    if (message.includes("paypal") || message.includes("payment")) {
      return "payment";
    }
    if (message.includes("validation") || message.includes("invalid")) {
      return "validation";
    }
    if (message.includes("timeout")) {
      return "timeout";
    }

    return "general";
  }

  // Get user-friendly error message
  getUserFriendlyMessage(category) {
    const messages = {
      network: {
        title: "Connection Issue",
        message:
          "We're having trouble connecting to our payment services. Please check your internet connection and try again.",
        suggestion: "Try refreshing the page or check your network connection.",
      },
      payment: {
        title: "Payment Service Issue",
        message:
          "There's a temporary issue with our payment processing. Our team has been notified.",
        suggestion:
          "Please try again in a few minutes or contact support if the issue persists.",
      },
      validation: {
        title: "Configuration Issue",
        message: "There's an issue with the payment field configuration.",
        suggestion:
          "Please check your payment settings or contact support for assistance.",
      },
      timeout: {
        title: "Request Timeout",
        message: "The request took too long to complete.",
        suggestion: "Please try again. If the issue persists, contact support.",
      },
      general: {
        title: "Unexpected Error",
        message: "Something unexpected happened with the payment component.",
        suggestion:
          "Please try refreshing the page or contact support if the issue continues.",
      },
    };

    return messages[category] || messages.general;
  }

  render() {
    if (this.state.hasError) {
      const errorCategory = this.getErrorCategory(this.state.error);
      const userMessage = this.getUserFriendlyMessage(errorCategory);
      const canRetry = this.state.retryCount < this.maxRetryAttempts;

      return (
        <div className="payment-error-boundary bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          {/* Error Header */}
          <div className="flex items-center gap-3 mb-4">
            <FaExclamationTriangle className="text-red-600 text-xl" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                {userMessage.title}
              </h3>
              <p className="text-sm text-red-600">
                Error ID: {this.state.errorId}
              </p>
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-6">
            <p className="text-red-700 mb-2">{userMessage.message}</p>
            <p className="text-sm text-red-600">{userMessage.suggestion}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-4">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaRedo size={14} />
                Try Again ({this.maxRetryAttempts - this.state.retryCount}{" "}
                attempts left)
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FaRedo size={14} />
              Refresh Page
            </button>

            <button
              onClick={() => window.open("/support", "_blank")}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaLifeRing size={14} />
              Get Help
            </button>
          </div>

          {/* Error Reporting Status */}
          {this.enableErrorReporting && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                {this.state.isReporting
                  ? "📤 Reporting error to our team..."
                  : "✅ Error has been automatically reported to our team."}
              </p>
            </div>
          )}

          {/* User Feedback */}
          {this.enableUserFeedback && (
            <UserFeedbackForm
              onSubmit={this.handleFeedbackSubmit}
              errorId={this.state.errorId}
            />
          )}

          {/* Technical Details (Development Only) */}
          {productionConfig.get("performance.enableDebugLogging") && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                <FaBug className="inline mr-1" />
                Technical Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                <div className="mb-2">
                  <strong>Error:</strong> {this.state.error?.message}
                </div>
                <div className="mb-2">
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap">
                    {this.state.error?.stack}
                  </pre>
                </div>
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// User Feedback Form Component
const UserFeedbackForm = ({ onSubmit, errorId }) => {
  const [feedback, setFeedback] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(feedback);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-700">
          ✅ Thank you for your feedback! It helps us improve the experience.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-red-200 pt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Help us improve (optional)
      </h4>
      <form onSubmit={handleSubmit}>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What were you trying to do when this error occurred? Any additional details would be helpful."
          className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
          rows={3}
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !feedback.trim()}
          className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Sending..." : "Send Feedback"}
        </button>
      </form>
    </div>
  );
};

export default PaymentErrorBoundary;
