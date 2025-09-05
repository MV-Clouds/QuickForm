import { renderHook, act } from "@testing-library/react";
import { usePaymentFieldState } from "../usePaymentFieldState";

describe("usePaymentFieldState", () => {
  const mockOnUpdateField = jest.fn();
  const mockFieldId = "test-field-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("State Initialization", () => {
    it("should initialize with default state when no subFields provided", () => {
      const { result } = renderHook(() =>
        usePaymentFieldState({}, mockOnUpdateField, mockFieldId)
      );

      expect(result.current.state.paymentType).toBe("product_wise");
      expect(result.current.state.paymentMethods.paypal).toBe(true);
      expect(result.current.state.paymentMethods.cards).toBe(true);
      expect(result.current.state.paymentMethods.venmo).toBe(false);
      expect(result.current.state.paymentMethods.googlePay).toBe(false);
    });

    it("should initialize from subFields when provided", () => {
      const subFields = {
        merchantAccountId: "merchant-123",
        paymentType: "subscription",
        amount: {
          type: "variable",
          value: 25.99,
          currency: "EUR",
        },
        paymentMethods: {
          paypal: true,
          cards: false,
          venmo: true,
          googlePay: true,
        },
        behavior: {
          collectBillingAddress: true,
          collectShippingAddress: false,
        },
      };

      const { result } = renderHook(() =>
        usePaymentFieldState(subFields, mockOnUpdateField, mockFieldId)
      );

      expect(result.current.state.selectedMerchantId).toBe("merchant-123");
      expect(result.current.state.paymentType).toBe("subscription");
      expect(result.current.state.amount.type).toBe("variable");
      expect(result.current.state.amount.value).toBe(25.99);
      expect(result.current.state.amount.currency).toBe("EUR");
      expect(result.current.state.paymentMethods.cards).toBe(false);
      expect(result.current.state.paymentMethods.venmo).toBe(true);
      expect(result.current.state.paymentMethods.googlePay).toBe(true);
      expect(result.current.state.behavior.collectBillingAddress).toBe(true);
    });
  });

  describe("State Updates", () => {
    it("should update merchant information correctly", () => {
      const { result } = renderHook(() =>
        usePaymentFieldState({}, mockOnUpdateField, mockFieldId)
      );

      act(() => {
        result.current.actions.updateMerchant("new-merchant-456");
      });

      expect(result.current.state.selectedMerchantId).toBe("new-merchant-456");
      expect(result.current.state.merchantDataLoaded).toBe(true);
      expect(result.current.state.isDirty).toBe(true);
    });

    it("should update payment type correctly", () => {
      const { result } = renderHook(() =>
        usePaymentFieldState({}, mockOnUpdateField, mockFieldId)
      );

      act(() => {
        result.current.actions.updatePaymentType("custom_amount");
      });

      expect(result.current.state.paymentType).toBe("custom_amount");
      expect(result.current.state.isDirty).toBe(true);
    });

    it("should update payment methods correctly", () => {
      const { result } = renderHook(() =>
        usePaymentFieldState({}, mockOnUpdateField, mockFieldId)
      );

      act(() => {
        result.current.actions.updatePaymentMethods({
          cards: false,
          googlePay: true,
        });
      });

      expect(result.current.state.paymentMethods.cards).toBe(false);
      expect(result.current.state.paymentMethods.googlePay).toBe(true);
      expect(result.current.state.paymentMethods.paypal).toBe(true); // Should preserve existing
      expect(result.current.state.isDirty).toBe(true);
    });

    it("should update amount configuration correctly", () => {
      const { result } = renderHook(() =>
        usePaymentFieldState({}, mockOnUpdateField, mockFieldId)
      );

      act(() => {
        result.current.actions.updateAmountConfig({
          type: "static",
          value: 99.99,
          currency: "GBP",
        });
      });

      expect(result.current.state.amount.type).toBe("static");
      expect(result.current.state.amount.value).toBe(99.99);
      expect(result.current.state.amount.currency).toBe("GBP");
      expect(result.current.state.isDirty).toBe(true);
    });
  });

  describe("Parent Synchronization", () => {
    it("should generate correct subFields object", () => {
      const { result } = renderHook(() =>
        usePaymentFieldState({}, mockOnUpdateField, mockFieldId)
      );

      act(() => {
        result.current.actions.updateMerchant("test-merchant");
        result.current.actions.updatePaymentType("subscription");
        result.current.actions.updatePaymentMethods({ googlePay: true });
      });

      const subFields = result.current.currentSubFields;
      expect(subFields.merchantId).toBe("test-merchant");
      expect(subFields.merchantAccountId).toBe("test-merchant");
      expect(subFields.paymentType).toBe("subscription");
      expect(subFields.paymentMethods.googlePay).toBe(true);
    });

    it("should call onUpdateField when state becomes dirty", (done) => {
      const { result } = renderHook(() =>
        usePaymentFieldState({}, mockOnUpdateField, mockFieldId)
      );

      act(() => {
        result.current.actions.updatePaymentType("donation");
      });

      // Should call onUpdateField after debounce delay
      setTimeout(() => {
        expect(mockOnUpdateField).toHaveBeenCalledWith(mockFieldId, {
          subFields: expect.objectContaining({
            paymentType: "donation",
          }),
        });
        done();
      }, 600);
    });
  });

  describe("State Persistence", () => {
    it("should maintain state across re-renders", () => {
      const { result, rerender } = renderHook(() =>
        usePaymentFieldState({}, mockOnUpdateField, mockFieldId)
      );

      act(() => {
        result.current.actions.updatePaymentType("subscription");
        result.current.actions.updateMerchant("persistent-merchant");
      });

      // Re-render the hook
      rerender();

      expect(result.current.state.paymentType).toBe("subscription");
      expect(result.current.state.selectedMerchantId).toBe(
        "persistent-merchant"
      );
    });

    it("should sync from updated subFields without losing local changes", () => {
      const initialSubFields = {
        paymentType: "product_wise",
        merchantAccountId: "initial-merchant",
      };

      const { result, rerender } = renderHook(
        ({ subFields }) =>
          usePaymentFieldState(subFields, mockOnUpdateField, mockFieldId),
        { initialProps: { subFields: initialSubFields } }
      );

      // Make local changes
      act(() => {
        result.current.actions.updatePaymentMethods({ googlePay: true });
      });

      // Update subFields from external source
      const updatedSubFields = {
        ...initialSubFields,
        merchantAccountId: "updated-merchant",
      };

      rerender({ subFields: updatedSubFields });

      // Should sync merchant but preserve local payment methods change
      expect(result.current.state.selectedMerchantId).toBe("updated-merchant");
      expect(result.current.state.paymentMethods.googlePay).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid subFields gracefully", () => {
      const invalidSubFields = {
        amount: null,
        paymentMethods: undefined,
        behavior: "invalid",
      };

      const { result } = renderHook(() =>
        usePaymentFieldState(invalidSubFields, mockOnUpdateField, mockFieldId)
      );

      expect(result.current.state.amount.type).toBe("fixed"); // Should use default
      expect(result.current.state.paymentMethods.paypal).toBe(true); // Should use default
      expect(result.current.state.behavior.collectBillingAddress).toBe(false); // Should use default
    });

    it("should handle missing onUpdateField gracefully", () => {
      const { result } = renderHook(() =>
        usePaymentFieldState({}, null, mockFieldId)
      );

      expect(() => {
        act(() => {
          result.current.actions.updatePaymentType("subscription");
        });
      }).not.toThrow();
    });
  });
});

// Integration test for the complete flow
describe("usePaymentFieldState Integration", () => {
  it("should handle complete payment field configuration flow", async () => {
    const mockOnUpdateField = jest.fn();
    const fieldId = "integration-test-field";

    const { result } = renderHook(() =>
      usePaymentFieldState({}, mockOnUpdateField, fieldId)
    );

    // Step 1: Configure merchant
    act(() => {
      result.current.actions.updateMerchant("merchant-123", {
        cards: true,
        googlePay: true,
        venmo: false,
      });
    });

    // Step 2: Set payment type
    act(() => {
      result.current.actions.updatePaymentType("product_wise");
    });

    // Step 3: Configure payment methods
    act(() => {
      result.current.actions.updatePaymentMethods({
        paypal: true,
        cards: true,
        googlePay: true,
        venmo: false,
      });
    });

    // Step 4: Configure behavior
    act(() => {
      result.current.actions.updateBehavior({
        collectBillingAddress: true,
        collectShippingAddress: false,
      });
    });

    // Verify final state
    expect(result.current.state.selectedMerchantId).toBe("merchant-123");
    expect(result.current.state.paymentType).toBe("product_wise");
    expect(result.current.state.paymentMethods.googlePay).toBe(true);
    expect(result.current.state.behavior.collectBillingAddress).toBe(true);
    expect(result.current.state.isDirty).toBe(true);

    // Verify subFields generation
    const subFields = result.current.currentSubFields;
    expect(subFields).toEqual({
      merchantId: "merchant-123",
      merchantAccountId: "merchant-123",
      paymentType: "product_wise",
      amount: {
        type: "fixed",
        value: 0,
        currency: "USD",
        minAmount: "",
        maxAmount: "",
      },
      paymentMethods: {
        paypal: true,
        cards: true,
        venmo: false,
        googlePay: true,
      },
      behavior: {
        collectBillingAddress: true,
        collectShippingAddress: false,
      },
    });
  });
});
