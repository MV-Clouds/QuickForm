/**
 * Production Configuration Manager for Payment Fields
 * Handles environment-specific settings and optimizations
 */

class ProductionConfigManager {
  constructor() {
    this.environment = process.env.NODE_ENV || "development";
    this.isProduction = this.environment === "production";
    this.config = this.loadConfiguration();
  }

  // Load environment-specific configuration
  loadConfiguration() {
    const baseConfig = {
      // Performance settings
      performance: {
        enableMonitoring: !this.isProduction, // Disable in production for performance
        enableDebugLogging: !this.isProduction,
        enableValidation: true, // Always enable validation
        debounceDelay: this.isProduction ? 300 : 500, // Faster updates in production
        cacheTimeout: this.isProduction ? 300000 : 60000, // 5min prod, 1min dev
      },

      // API settings
      api: {
        timeout: this.isProduction ? 10000 : 30000, // 10s prod, 30s dev
        retryAttempts: this.isProduction ? 3 : 1,
        retryDelay: 1000,
        enableCaching: true,
      },

      // PayPal settings
      paypal: {
        environment: this.isProduction ? "production" : "sandbox",
        clientId: this.isProduction
          ? process.env.REACT_APP_PAYPAL_PRODUCTION_CLIENT_ID
          : process.env.REACT_APP_PAYPAL_SANDBOX_CLIENT_ID,
        enableAdvancedCheckout: this.isProduction,
        enableGooglePay: this.isProduction,
        enableApplePay: this.isProduction,
      },

      // Security settings
      security: {
        enableCSRF: this.isProduction,
        enableEncryption: this.isProduction,
        validateOrigin: this.isProduction,
        enableRateLimit: this.isProduction,
      },

      // UI settings
      ui: {
        enableAnimations: true,
        enableTooltips: true,
        enableDebugPanel: !this.isProduction,
        enablePerformanceMetrics: !this.isProduction,
        theme: "default",
      },

      // Error handling
      errorHandling: {
        enableErrorBoundary: true,
        enableErrorReporting: this.isProduction,
        enableUserFeedback: true,
        enableRetry: true,
        maxRetryAttempts: 3,
      },

      // Feature flags
      features: {
        enableNewPaymentFlow: true,
        enableAdvancedValidation: true,
        enablePerformanceOptimizations: true,
        enableA11yFeatures: true,
        enableMobileOptimizations: true,
      },
    };

    // Environment-specific overrides
    if (this.isProduction) {
      return {
        ...baseConfig,
        // Production-specific optimizations
        performance: {
          ...baseConfig.performance,
          enableBundleOptimization: true,
          enableCodeSplitting: true,
          enableLazyLoading: true,
        },
        monitoring: {
          enableAnalytics: true,
          enableErrorTracking: true,
          enablePerformanceTracking: true,
          enableUserTracking: false, // Privacy-first
        },
      };
    }

    return baseConfig;
  }

  // Get configuration value
  get(path, defaultValue = null) {
    return this.getNestedValue(this.config, path) || defaultValue;
  }

  // Set configuration value
  set(path, value) {
    this.setNestedValue(this.config, path, value);
  }

  // Check if feature is enabled
  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`, false);
  }

  // Get PayPal configuration
  getPayPalConfig() {
    return {
      environment: this.get("paypal.environment"),
      clientId: this.get("paypal.clientId"),
      merchantId: null, // Set dynamically per merchant
      currency: "USD", // Default currency
      intent: "capture",
      enableFunding: this.getEnabledFunding(),
      disableFunding: this.getDisabledFunding(),
      components: this.getPayPalComponents(),
    };
  }

  // Get enabled funding sources
  getEnabledFunding() {
    const funding = [];

    if (this.get("paypal.enableAdvancedCheckout")) {
      funding.push("card");
    }

    if (this.get("paypal.enableGooglePay")) {
      funding.push("googlepay");
    }

    if (this.get("paypal.enableApplePay")) {
      funding.push("applepay");
    }

    return funding;
  }

  // Get disabled funding sources
  getDisabledFunding() {
    const disabled = [];

    if (!this.isProduction) {
      // In development, we might want to disable certain funding sources for testing
      disabled.push("credit"); // Encourage alternative payment methods in dev
    }

    return disabled;
  }

  // Get PayPal components to load
  getPayPalComponents() {
    const components = ["buttons"];

    if (this.get("paypal.enableAdvancedCheckout")) {
      components.push("card-fields");
    }

    if (this.get("paypal.enableGooglePay")) {
      components.push("googlepay");
    }

    components.push("funding-eligibility");

    return components.join(",");
  }

  // Get API configuration
  getApiConfig() {
    return {
      timeout: this.get("api.timeout"),
      retryAttempts: this.get("api.retryAttempts"),
      retryDelay: this.get("api.retryDelay"),
      enableCaching: this.get("api.enableCaching"),
      baseURL: this.getApiBaseUrl(),
    };
  }

  // Get API base URL based on environment
  getApiBaseUrl() {
    if (this.isProduction) {
      return (
        process.env.REACT_APP_PRODUCTION_API_URL || "https://api.quickform.com"
      );
    }
    return (
      process.env.REACT_APP_DEVELOPMENT_API_URL ||
      "https://dev-api.quickform.com"
    );
  }

  // Get performance configuration
  getPerformanceConfig() {
    return {
      enableMonitoring: this.get("performance.enableMonitoring"),
      enableDebugLogging: this.get("performance.enableDebugLogging"),
      enableValidation: this.get("performance.enableValidation"),
      debounceDelay: this.get("performance.debounceDelay"),
      cacheTimeout: this.get("performance.cacheTimeout"),
    };
  }

  // Get error handling configuration
  getErrorHandlingConfig() {
    return {
      enableErrorBoundary: this.get("errorHandling.enableErrorBoundary"),
      enableErrorReporting: this.get("errorHandling.enableErrorReporting"),
      enableUserFeedback: this.get("errorHandling.enableUserFeedback"),
      enableRetry: this.get("errorHandling.enableRetry"),
      maxRetryAttempts: this.get("errorHandling.maxRetryAttempts"),
    };
  }

  // Validate configuration
  validateConfiguration() {
    const errors = [];
    const warnings = [];

    // Validate PayPal configuration
    if (!this.get("paypal.clientId")) {
      errors.push("PayPal Client ID is required");
    }

    // Validate API configuration
    if (!this.getApiBaseUrl()) {
      errors.push("API Base URL is required");
    }

    // Production-specific validations
    if (this.isProduction) {
      if (this.get("performance.enableDebugLogging")) {
        warnings.push("Debug logging is enabled in production");
      }

      if (this.get("performance.enableMonitoring")) {
        warnings.push(
          "Performance monitoring is enabled in production (may impact performance)"
        );
      }

      if (!this.get("security.enableCSRF")) {
        errors.push("CSRF protection should be enabled in production");
      }
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  // Get optimized configuration for production
  getOptimizedConfig() {
    if (!this.isProduction) {
      return this.config;
    }

    return {
      ...this.config,
      // Production optimizations
      performance: {
        ...this.config.performance,
        enableMonitoring: false, // Disable for better performance
        enableDebugLogging: false,
        debounceDelay: 200, // Faster response
      },
      ui: {
        ...this.config.ui,
        enableDebugPanel: false,
        enablePerformanceMetrics: false,
      },
    };
  }

  // Helper methods
  getNestedValue(obj, path) {
    return path
      .split(".")
      .reduce((current, key) => current && current[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Print configuration summary
  printConfigSummary() {
    if (!this.get("performance.enableDebugLogging")) return;

    console.group("🔧 Production Configuration Summary");
    console.log("Environment:", this.environment);
    console.log("PayPal Environment:", this.get("paypal.environment"));
    console.log("API Base URL:", this.getApiBaseUrl());
    console.log(
      "Performance Monitoring:",
      this.get("performance.enableMonitoring")
    );
    console.log("Debug Logging:", this.get("performance.enableDebugLogging"));
    console.log(
      "Features Enabled:",
      Object.entries(this.get("features"))
        .filter(([_, enabled]) => enabled)
        .map(([name]) => name)
    );

    const validation = this.validateConfiguration();
    if (validation.errors.length > 0) {
      console.error("Configuration Errors:", validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn("Configuration Warnings:", validation.warnings);
    }

    console.groupEnd();
  }
}

// Create singleton instance
export const productionConfig = new ProductionConfigManager();

// React hook for accessing configuration
export function useProductionConfig() {
  return {
    config: productionConfig,
    get: (path, defaultValue) => productionConfig.get(path, defaultValue),
    isFeatureEnabled: (feature) => productionConfig.isFeatureEnabled(feature),
    getPayPalConfig: () => productionConfig.getPayPalConfig(),
    getApiConfig: () => productionConfig.getApiConfig(),
    getPerformanceConfig: () => productionConfig.getPerformanceConfig(),
    isProduction: productionConfig.isProduction,
    environment: productionConfig.environment,
  };
}

export default ProductionConfigManager;
