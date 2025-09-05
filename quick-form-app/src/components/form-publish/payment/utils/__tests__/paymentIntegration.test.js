/**
 * Payment Integration Tests
 * Comprehensive tests for the complete payment flow from field configuration to form submission
 */

import {
  standardizePaymentData,
  preparePaymentDataForSubmission,
  validatePaymentDataIntegrity,
} from "../paymentDataProcessor";
import {
  validateCompletePaymentData,
  generateValidationReport,
} from "../paymentDataValidator";

describe("Payment Integration Flow", () => {
  // Mock payment data scenarios
  const mockRawPaymentData = {
    fieldId: "payment-field-123",
    transactionId: "TXN_1234567890",
    orderId: "ORDER_9876543210",
    amount: 25.99,
    currency: "USD",
    paymentMethod: "paypal",
    paymentType: "product_wise",
    merchantId: "MERCHANT_ABC123",
    completedAt: new Date().toISOString(),
    selectedProduct: {
      id: "prod_001",
      name: "Test Product",
      price: 25.99,
      currency: "USD",
      sku: "TEST-SKU-001",
      description: "A test product for payment integration",
    },
    captureResult: {
      id: "CAPTURE_123",
      status: "COMPLETED",
      amount: { value: "25.99", currency_code: "USD" },
    },
  };

  const mockFieldConfig = {
    id: "payment-field-123",
    subFields: {
      paymentType: "product_wise",
      merchantAccountId: "MERCHANT_ABC123",
      amount: {
        type: "fixed",
        currency: "USD",
      },
      paymentMethods: {
        paypal: true,
        cards: true,
        googlePay: false,
        venmo: false,
      },
      behavior: {
        collectBillingAddress: true,
        collectShippingAddress: false,
      },
    },
  };

  const mockFormData = {
    Id: "form-456",
    Name: "Test Form",
    Fields: [
      {
        Id: "payment-field-123",
        Field_Type__c: "paypal_payment",
        Properties__c: JSON.stringify(mockFieldConfig),
      },
    ],
  };

  describe("Payment Data Standardization", () => {
    it("should standardize raw payment data correctly", () => {
      const standardized = standardizePaymentData(
        mockRawPaymentData,
        mockFieldConfig
      );

      expect(standardized).toMatchObject({
        fieldId: "payment-field-123",
        transactionId: "TXN_1234567890",
        orderId: "ORDER_9876543210",
        amount: 25.99,
        currency: "USD",
        paymentType: "product_wise",
        paymentMethod: "paypal",
        merchantId: "MERCHANT_ABC123",
        status: "completed",
      });

      expect(standardized.product).toMatchObject({
        id: "prod_001",
        name: "Test Product",
        price: 25.99,
        currency: "USD",
        sku: "TEST-SKU-001",
      });

      expect(standardized.metadata).toMatchObject({
        provider: "paypal",
        environment: expect.any(String),
      });

      expect(standardized.captureDetails).toMatchObject({
        captureId: "CAPTURE_123",
        status: "COMPLETED",
      });
    });

    it("should handle missing optional data gracefully", () => {
      const minimalData = {
        fieldId: "payment-field-123",
        amount: 10.0,
        currency: "USD",
        paymentType: "custom_amount",
        paymentMethod: "card",
      };

      const standardized = standardizePaymentData(minimalData, {});

      expect(standardized.fieldId).toBe("payment-field-123");
      expect(standardized.amount).toBe(10.0);
      expect(standardized.status).toBe("completed");
      expect(standardized.metadata).toBeDefined();
      expect(standardized.completedAt).toBeDefined();
    });

    it("should handle different payment types correctly", () => {
      const subscriptionData = {
        ...mockRawPaymentData,
        paymentType: "subscription",
        subscriptionId: "SUB_123",
        planId: "PLAN_456",
      };

      const standardized = standardizePaymentData(subscriptionData, {
        subFields: { paymentType: "subscription" },
      });

      expect(standardized.paymentType).toBe("subscription");
      expect(standardized.subscription).toMatchObject({
        subscriptionId: "SUB_123",
        planId: "PLAN_456",
      });
    });
  });

  describe("Form Submission Preparation", () => {
    it("should prepare payment data for form submission correctly", () => {
      const standardized = standardizePaymentData(
        mockRawPaymentData,
        mockFieldConfig
      );
      const prepared = preparePaymentDataForSubmission(
        standardized,
        mockFormData
      );

      expect(prepared.fieldEntry).toHaveProperty("payment_payment-field-123");
      expect(prepared.globalEntry).toHaveProperty("paymentData");
      expect(prepared.combined).toHaveProperty("payment_payment-field-123");
      expect(prepared.combined).toHaveProperty("paymentData");

      const fieldData = prepared.fieldEntry["payment_payment-field-123"];
      expect(fieldData).toMatchObject({
        fieldId: "payment-field-123",
        amount: 25.99,
        currency: "USD",
        status: "completed",
      });

      expect(fieldData.submissionId).toMatch(/^sub_\d+_[a-z0-9]+$/);
      expect(fieldData.formId).toBe("form-456");
    });

    it("should include summary data for quick access", () => {
      const standardized = standardizePaymentData(
        mockRawPaymentData,
        mockFieldConfig
      );
      const prepared = preparePaymentDataForSubmission(
        standardized,
        mockFormData
      );

      const summary = prepared.globalEntry.paymentData.summary;
      expect(summary).toMatchObject({
        amount: 25.99,
        currency: "USD",
        method: "paypal",
        type: "product_wise",
        status: "completed",
      });
    });
  });

  describe("Payment Data Validation", () => {
    it("should validate complete payment data successfully", () => {
      const standardized = standardizePaymentData(
        mockRawPaymentData,
        mockFieldConfig
      );
      const validation = validateCompletePaymentData(standardized);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(80);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect missing required fields", () => {
      const incompleteData = {
        fieldId: "payment-field-123",
        // Missing amount, currency, paymentType, etc.
      };

      const validation = validateCompletePaymentData(incompleteData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.score).toBeLessThan(50);
    });

    it("should detect data inconsistencies", () => {
      const inconsistentData = {
        ...mockRawPaymentData,
        amount: 25.99,
        selectedProduct: {
          ...mockRawPaymentData.selectedProduct,
          price: 30.0, // Different from payment amount
        },
      };

      const standardized = standardizePaymentData(
        inconsistentData,
        mockFieldConfig
      );
      const validation = validateCompletePaymentData(standardized);

      expect(
        validation.warnings.some((w) => w.includes("Amount mismatch"))
      ).toBe(true);
    });

    it("should generate comprehensive validation report", () => {
      const standardized = standardizePaymentData(
        mockRawPaymentData,
        mockFieldConfig
      );
      const report = generateValidationReport(standardized);

      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("overall");
      expect(report).toHaveProperty("validation");
      expect(report).toHaveProperty("dataSummary");
      expect(report).toHaveProperty("improvements");
      expect(report).toHaveProperty("nextSteps");

      expect(report.overall.status).toBe("PASS");
      expect(report.overall.grade).toMatch(/^[A-F][+]?$/);
      expect(report.dataSummary.hasProductInfo).toBe(true);
    });
  });

  describe("Payment Data Integrity", () => {
    it("should validate payment data integrity correctly", () => {
      const standardized = standardizePaymentData(
        mockRawPaymentData,
        mockFieldConfig
      );
      const integrity = validatePaymentDataIntegrity(
        standardized,
        mockFormData
      );

      expect(integrity.isValid).toBe(true);
      expect(integrity.score).toBeGreaterThan(80);
      expect(integrity.issues).toHaveLength(0);
    });

    it("should detect timing issues", () => {
      const oldPaymentData = {
        ...mockRawPaymentData,
        completedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      };

      const standardized = standardizePaymentData(
        oldPaymentData,
        mockFieldConfig
      );
      const integrity = validatePaymentDataIntegrity(
        standardized,
        mockFormData
      );

      expect(integrity.recommendations.some((r) => r.includes("timing"))).toBe(
        true
      );
    });

    it("should validate product-wise payment requirements", () => {
      const productPaymentWithoutProduct = {
        ...mockRawPaymentData,
        selectedProduct: null,
        product: null,
      };

      const standardized = standardizePaymentData(
        productPaymentWithoutProduct,
        mockFieldConfig
      );
      const integrity = validatePaymentDataIntegrity(
        standardized,
        mockFormData
      );

      expect(
        integrity.issues.some((i) => i.includes("product information"))
      ).toBe(true);
    });
  });

  describe("End-to-End Integration", () => {
    it("should handle complete payment flow successfully", () => {
      // Step 1: Standardize raw payment data
      const standardized = standardizePaymentData(
        mockRawPaymentData,
        mockFieldConfig
      );
      expect(standardized.fieldId).toBe("payment-field-123");

      // Step 2: Validate data integrity
      const integrity = validatePaymentDataIntegrity(
        standardized,
        mockFormData
      );
      expect(integrity.isValid).toBe(true);

      // Step 3: Prepare for form submission
      const prepared = preparePaymentDataForSubmission(
        standardized,
        mockFormData
      );
      expect(prepared.combined).toHaveProperty("paymentData");

      // Step 4: Final validation
      const finalValidation = validateCompletePaymentData(standardized);
      expect(finalValidation.isValid).toBe(true);

      // Step 5: Generate report
      const report = generateValidationReport(standardized);
      expect(report.overall.status).toBe("PASS");
    });

    it("should handle error scenarios gracefully", () => {
      const corruptedData = {
        fieldId: null,
        amount: -10,
        currency: "",
        paymentType: "invalid_type",
      };

      // Should not throw errors
      expect(() => {
        const standardized = standardizePaymentData(corruptedData, {});
        const validation = validateCompletePaymentData(standardized);
        const report = generateValidationReport(standardized);

        expect(validation.isValid).toBe(false);
        expect(report.overall.status).toBe("FAIL");
      }).not.toThrow();
    });

    it("should maintain data consistency across all processing steps", () => {
      const originalAmount = mockRawPaymentData.amount;
      const originalCurrency = mockRawPaymentData.currency;
      const originalFieldId = mockRawPaymentData.fieldId;

      // Process through all steps
      const standardized = standardizePaymentData(
        mockRawPaymentData,
        mockFieldConfig
      );
      const prepared = preparePaymentDataForSubmission(
        standardized,
        mockFormData
      );

      // Verify data consistency
      expect(standardized.amount).toBe(originalAmount);
      expect(standardized.currency).toBe(originalCurrency);
      expect(standardized.fieldId).toBe(originalFieldId);

      const fieldData = prepared.fieldEntry[`payment_${originalFieldId}`];
      expect(fieldData.amount).toBe(originalAmount);
      expect(fieldData.currency).toBe(originalCurrency);
      expect(fieldData.fieldId).toBe(originalFieldId);

      const globalData = prepared.globalEntry.paymentData;
      expect(globalData.amount).toBe(originalAmount);
      expect(globalData.currency).toBe(originalCurrency);
      expect(globalData.fieldId).toBe(originalFieldId);
    });
  });

  describe("Performance and Memory", () => {
    it("should process payment data efficiently", () => {
      const startTime = performance.now();

      // Process large dataset
      for (let i = 0; i < 100; i++) {
        const testData = { ...mockRawPaymentData, fieldId: `field-${i}` };
        const standardized = standardizePaymentData(testData, mockFieldConfig);
        const validation = validateCompletePaymentData(standardized);
        const prepared = preparePaymentDataForSubmission(
          standardized,
          mockFormData
        );
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process 100 payments in less than 1 second
      expect(processingTime).toBeLessThan(1000);
    });

    it("should not create memory leaks", () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;

      // Process many payments
      for (let i = 0; i < 1000; i++) {
        const testData = { ...mockRawPaymentData, fieldId: `field-${i}` };
        standardizePaymentData(testData, mockFieldConfig);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
