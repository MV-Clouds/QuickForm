/**
 * Payment Flow Tester
 * Comprehensive testing utility for validating the entire payment field flow
 */

export class PaymentFlowTester {
  constructor() {
    this.testResults = [];
    this.isEnabled = process.env.NODE_ENV === "development";
    this.testStartTime = null;
  }

  // Start a test session
  startTestSession(sessionName = "Payment Flow Test") {
    if (!this.isEnabled) return;

    this.testStartTime = performance.now();
    this.testResults = [];
    console.group(`🧪 ${sessionName} - Started`);
    console.log(`Test session started at ${new Date().toLocaleTimeString()}`);
  }

  // End test session and print results
  endTestSession() {
    if (!this.isEnabled || !this.testStartTime) return;

    const duration = performance.now() - this.testStartTime;
    const passed = this.testResults.filter((r) => r.status === "pass").length;
    const failed = this.testResults.filter((r) => r.status === "fail").length;
    const warnings = this.testResults.filter(
      (r) => r.status === "warning"
    ).length;

    console.log(`\n📊 Test Results Summary:`);
    console.log(`Duration: ${duration.toFixed(2)}ms`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`Total: ${this.testResults.length}`);

    if (failed > 0) {
      console.group("❌ Failed Tests:");
      this.testResults
        .filter((r) => r.status === "fail")
        .forEach((test) => {
          console.error(`${test.name}: ${test.message}`);
        });
      console.groupEnd();
    }

    console.groupEnd();
    return { passed, failed, warnings, duration, results: this.testResults };
  }

  // Add test result
  addResult(name, status, message = "", data = null) {
    if (!this.isEnabled) return;

    const result = {
      name,
      status, // 'pass', 'fail', 'warning'
      message,
      data,
      timestamp: performance.now(),
    };

    this.testResults.push(result);

    const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️";
    console.log(`${icon} ${name}${message ? `: ${message}` : ""}`);
  }

  // Test state management
  testStateManagement(state, expectedValues = {}) {
    if (!this.isEnabled) return;

    console.group("🔍 Testing State Management");

    // Test state initialization
    if (state.isInitialized) {
      this.addResult(
        "State Initialization",
        "pass",
        "State properly initialized"
      );
    } else {
      this.addResult("State Initialization", "fail", "State not initialized");
    }

    // Test required fields
    if (state.paymentType) {
      this.addResult(
        "Payment Type",
        "pass",
        `Payment type: ${state.paymentType}`
      );
    } else {
      this.addResult("Payment Type", "fail", "Payment type not set");
    }

    // Test expected values
    Object.entries(expectedValues).forEach(([key, expectedValue]) => {
      const actualValue = this.getNestedValue(state, key);
      if (actualValue === expectedValue) {
        this.addResult(
          `Expected Value: ${key}`,
          "pass",
          `${key} = ${actualValue}`
        );
      } else {
        this.addResult(
          `Expected Value: ${key}`,
          "fail",
          `Expected ${expectedValue}, got ${actualValue}`
        );
      }
    });

    console.groupEnd();
  }

  // Test tab switching
  testTabSwitching(
    tabSwitchCallback,
    tabs = ["account", "configuration", "advanced"]
  ) {
    if (!this.isEnabled) return;

    console.group("🔀 Testing Tab Switching");

    tabs.forEach((tab, index) => {
      try {
        tabSwitchCallback(tab);
        this.addResult(
          `Tab Switch: ${tab}`,
          "pass",
          `Successfully switched to ${tab} tab`
        );

        // Simulate delay between tab switches
        if (index < tabs.length - 1) {
          setTimeout(() => {}, 100);
        }
      } catch (error) {
        this.addResult(
          `Tab Switch: ${tab}`,
          "fail",
          `Failed to switch to ${tab}: ${error.message}`
        );
      }
    });

    console.groupEnd();
  }

  // Test payment methods configuration
  testPaymentMethodsConfig(paymentMethods, expectedMethods = {}) {
    if (!this.isEnabled) return;

    console.group("💳 Testing Payment Methods Configuration");

    if (!paymentMethods) {
      this.addResult(
        "Payment Methods Object",
        "fail",
        "Payment methods object is null/undefined"
      );
      console.groupEnd();
      return;
    }

    // Test each payment method
    const methods = ["paypal", "cards", "venmo", "googlePay"];
    methods.forEach((method) => {
      const isEnabled = paymentMethods[method];
      const expected = expectedMethods[method];

      if (expected !== undefined) {
        if (isEnabled === expected) {
          this.addResult(
            `Payment Method: ${method}`,
            "pass",
            `${method} correctly ${isEnabled ? "enabled" : "disabled"}`
          );
        } else {
          this.addResult(
            `Payment Method: ${method}`,
            "fail",
            `${method} expected ${expected}, got ${isEnabled}`
          );
        }
      } else {
        this.addResult(
          `Payment Method: ${method}`,
          "pass",
          `${method} is ${isEnabled ? "enabled" : "disabled"}`
        );
      }
    });

    // Test that at least one method is enabled
    const hasEnabledMethod = Object.values(paymentMethods).some(
      (enabled) => enabled
    );
    if (hasEnabledMethod) {
      this.addResult(
        "Payment Methods Validation",
        "pass",
        "At least one payment method is enabled"
      );
    } else {
      this.addResult(
        "Payment Methods Validation",
        "fail",
        "No payment methods are enabled"
      );
    }

    console.groupEnd();
  }

  // Test modal functionality
  testModalFunctionality(
    modalOpenCallback,
    modalCloseCallback,
    modalType = "product"
  ) {
    if (!this.isEnabled) return;

    console.group(`🪟 Testing ${modalType} Modal`);

    try {
      // Test modal opening
      modalOpenCallback(modalType);
      this.addResult(
        `${modalType} Modal Open`,
        "pass",
        `${modalType} modal opened successfully`
      );

      // Test modal closing
      setTimeout(() => {
        try {
          modalCloseCallback();
          this.addResult(
            `${modalType} Modal Close`,
            "pass",
            `${modalType} modal closed successfully`
          );
        } catch (error) {
          this.addResult(
            `${modalType} Modal Close`,
            "fail",
            `Failed to close ${modalType} modal: ${error.message}`
          );
        }
      }, 100);
    } catch (error) {
      this.addResult(
        `${modalType} Modal Open`,
        "fail",
        `Failed to open ${modalType} modal: ${error.message}`
      );
    }

    console.groupEnd();
  }

  // Test form submission data
  testFormSubmissionData(submissionData, expectedFields = []) {
    if (!this.isEnabled) return;

    console.group("📝 Testing Form Submission Data");

    if (!submissionData) {
      this.addResult(
        "Submission Data",
        "fail",
        "Submission data is null/undefined"
      );
      console.groupEnd();
      return;
    }

    // Test required fields
    expectedFields.forEach((field) => {
      const value = this.getNestedValue(submissionData, field);
      if (value !== undefined && value !== null && value !== "") {
        this.addResult(
          `Submission Field: ${field}`,
          "pass",
          `${field} present in submission data`
        );
      } else {
        this.addResult(
          `Submission Field: ${field}`,
          "fail",
          `${field} missing from submission data`
        );
      }
    });

    // Test payment data structure
    if (submissionData.paymentData) {
      const paymentData = submissionData.paymentData;
      const requiredPaymentFields = [
        "fieldId",
        "amount",
        "currency",
        "paymentType",
        "paymentMethod",
      ];

      requiredPaymentFields.forEach((field) => {
        if (paymentData[field]) {
          this.addResult(
            `Payment Data: ${field}`,
            "pass",
            `${field} present in payment data`
          );
        } else {
          this.addResult(
            `Payment Data: ${field}`,
            "fail",
            `${field} missing from payment data`
          );
        }
      });
    } else {
      this.addResult(
        "Payment Data",
        "warning",
        "No payment data in submission (may be expected for some payment types)"
      );
    }

    console.groupEnd();
  }

  // Test performance metrics
  testPerformanceMetrics(performanceData) {
    if (!this.isEnabled) return;

    console.group("⚡ Testing Performance Metrics");

    if (!performanceData) {
      this.addResult(
        "Performance Data",
        "warning",
        "No performance data available"
      );
      console.groupEnd();
      return;
    }

    // Test render count
    if (performanceData.renders < 20) {
      this.addResult(
        "Render Count",
        "pass",
        `Render count: ${performanceData.renders}`
      );
    } else {
      this.addResult(
        "Render Count",
        "warning",
        `High render count: ${performanceData.renders}`
      );
    }

    // Test API call efficiency
    if (performanceData.apiCalls < 10) {
      this.addResult(
        "API Call Count",
        "pass",
        `API calls: ${performanceData.apiCalls}`
      );
    } else {
      this.addResult(
        "API Call Count",
        "warning",
        `High API call count: ${performanceData.apiCalls}`
      );
    }

    // Test state change efficiency
    const renderToStateRatio =
      performanceData.stateChanges > 0
        ? performanceData.renders / performanceData.stateChanges
        : 0;

    if (renderToStateRatio < 3) {
      this.addResult(
        "Render Efficiency",
        "pass",
        `${renderToStateRatio.toFixed(2)} renders per state change`
      );
    } else {
      this.addResult(
        "Render Efficiency",
        "warning",
        `Inefficient rendering: ${renderToStateRatio.toFixed(
          2
        )} renders per state change`
      );
    }

    console.groupEnd();
  }

  // Run comprehensive test suite
  runComprehensiveTest(testData) {
    this.startTestSession("Comprehensive Payment Field Test");

    if (testData.state) {
      this.testStateManagement(testData.state, testData.expectedState);
    }

    if (testData.paymentMethods) {
      this.testPaymentMethodsConfig(
        testData.paymentMethods,
        testData.expectedPaymentMethods
      );
    }

    if (testData.submissionData) {
      this.testFormSubmissionData(
        testData.submissionData,
        testData.expectedSubmissionFields
      );
    }

    if (testData.performanceData) {
      this.testPerformanceMetrics(testData.performanceData);
    }

    return this.endTestSession();
  }

  // Helper method to get nested object values
  getNestedValue(obj, path) {
    return path
      .split(".")
      .reduce((current, key) => current && current[key], obj);
  }

  // Quick validation test
  quickValidationTest(state, subFields) {
    if (!this.isEnabled) return;

    this.startTestSession("Quick Validation Test");

    // Test state validity
    if (state && state.isInitialized) {
      this.addResult("State Valid", "pass", "State is initialized and valid");
    } else {
      this.addResult(
        "State Valid",
        "fail",
        "State is not properly initialized"
      );
    }

    // Test subFields structure
    if (subFields && subFields.paymentType) {
      this.addResult("SubFields Valid", "pass", "SubFields structure is valid");
    } else {
      this.addResult(
        "SubFields Valid",
        "fail",
        "SubFields structure is invalid"
      );
    }

    return this.endTestSession();
  }
}

// Create singleton instance
export const paymentFlowTester = new PaymentFlowTester();

// React hook for testing
export function usePaymentFlowTesting() {
  const tester = paymentFlowTester;

  return {
    startTestSession: (name) => tester.startTestSession(name),
    endTestSession: () => tester.endTestSession(),
    testStateManagement: (state, expected) =>
      tester.testStateManagement(state, expected),
    testTabSwitching: (callback, tabs) =>
      tester.testTabSwitching(callback, tabs),
    testPaymentMethodsConfig: (methods, expected) =>
      tester.testPaymentMethodsConfig(methods, expected),
    testModalFunctionality: (open, close, type) =>
      tester.testModalFunctionality(open, close, type),
    testFormSubmissionData: (data, fields) =>
      tester.testFormSubmissionData(data, fields),
    testPerformanceMetrics: (data) => tester.testPerformanceMetrics(data),
    runComprehensiveTest: (data) => tester.runComprehensiveTest(data),
    quickValidationTest: (state, subFields) =>
      tester.quickValidationTest(state, subFields),
  };
}

export default PaymentFlowTester;
