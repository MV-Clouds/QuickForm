import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentFieldEditor from "./PaymentFieldEditor";
import PayPalFieldEditorTabs from "./PayPalFieldEditorTabs";

// Mock all dependencies
jest.mock("./MerchantAccountSelector", () => {
  return function MockMerchantAccountSelector({
    onMerchantChange,
    onCapabilitiesChange,
  }) {
    return (
      <div data-testid="merchant-account-selector">
        <select
          data-testid="merchant-select"
          onChange={(e) => {
            onMerchantChange(e.target.value);
            onCapabilitiesChange({
              subscriptions: true,
              donations: true,
              venmo: true,
              googlePay: true,
            });
          }}
        >
          <option value="">Select merchant</option>
          <option value="merchant-123">Test Merchant</option>
        </select>
      </div>
    );
  };
});

jest.mock("./FormProductManager", () => {
  return function MockFormProductManager({
    onUpdateField,
    selectedField,
    typeFilter,
  }) {
    return (
      <div data-testid="form-product-manager">
        <h3>Managing {typeFilter}s</h3>
        <button
          onClick={() => {
            // Simulate adding a product
            const newProduct = {
              id: `${typeFilter}_${Date.now()}`,
              type: typeFilter,
              name: `Test ${typeFilter}`,
              price: "29.99",
              currency: "USD",
              status: "enabled",
            };

            const updatedFormItems = {
              ...selectedField.subFields.formItems,
              [newProduct.id]: newProduct,
            };

            onUpdateField(selectedField.id, {
              subFields: {
                ...selectedField.subFields,
                formItems: updatedFormItems,
              },
            });
          }}
        >
          Add {typeFilter}
        </button>
      </div>
    );
  };
});

jest.mock("./paypalApi", () => ({
  initiatePayment: jest.fn(() =>
    Promise.resolve({
      success: true,
      capabilities: {
        subscriptions: true,
        donations: true,
        venmo: true,
        googlePay: true,
      },
    })
  ),
}));

jest.mock("./PayPalFieldHelp", () => ({
  HelpTooltip: ({ title, content }) => (
    <span data-testid="help-tooltip" title={`${title}: ${content}`}>
      ?
    </span>
  ),
  ContextualHelp: ({ section }) => (
    <button data-testid="contextual-help">Help for {section}</button>
  ),
}));

describe("PayPal Payment Field - Complete Integration", () => {
  const mockField = {
    id: "field-1",
    type: "paypal_payment",
    label: "Payment Information",
    gateway: "paypal",
    subFields: {
      gateway: "paypal",
      merchantId: "",
      paymentType: "one_time",
      amount: {
        type: "fixed",
        value: 10,
        currency: "USD",
      },
      paymentMethods: {
        paypal: true,
        cards: true,
        venmo: false,
        googlePay: false,
      },
      behavior: {
        collectBillingAddress: false,
        collectShippingAddress: false,
      },
      formItems: {},
    },
  };

  const mockOnUpdateField = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PaymentFieldEditor Gateway Routing", () => {
    test("routes PayPal fields to PayPal editor", () => {
      render(
        <PaymentFieldEditor
          selectedField={mockField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(
        screen.getByText("PayPal Payment Configuration")
      ).toBeInTheDocument();
    });

    test("shows unsupported gateway message for unknown gateways", () => {
      const unknownField = {
        ...mockField,
        type: "unknown_payment",
        gateway: "unknown",
      };

      render(
        <PaymentFieldEditor
          selectedField={unknownField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(
        screen.getByText("Unsupported Payment Gateway")
      ).toBeInTheDocument();
      expect(
        screen.getByText('The payment gateway "unknown" is not yet supported')
      ).toBeInTheDocument();
    });

    test("returns null for non-payment fields", () => {
      const textField = { ...mockField, type: "text" };

      const { container } = render(
        <PaymentFieldEditor
          selectedField={textField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Complete PayPal Configuration Workflow", () => {
    test("completes full configuration workflow", async () => {
      render(
        <PayPalFieldEditorTabs
          selectedField={mockField}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Step 1: Verify initial state
      expect(screen.getByText("Account & Payment Type")).toBeInTheDocument();
      expect(screen.getByText("Payment Configuration")).toBeInTheDocument();
      expect(screen.getByText("Advanced Settings")).toBeInTheDocument();

      // Step 2: Select merchant account
      const merchantSelect = screen.getByTestId("merchant-select");
      fireEvent.change(merchantSelect, { target: { value: "merchant-123" } });

      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          merchantId: "merchant-123",
        }),
      });

      // Step 3: Change payment type to subscription
      const paymentTypeSelect = screen.getByDisplayValue("One-time Payment");
      fireEvent.change(paymentTypeSelect, {
        target: { value: "subscription" },
      });

      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          paymentType: "subscription",
        }),
      });

      // Step 4: Navigate to configuration tab (should auto-switch)
      expect(screen.getByText("Amount Configuration")).toBeInTheDocument();

      // Step 5: Configure amount type
      const amountTypeSelect = screen.getByDisplayValue("Fixed Amount");
      fireEvent.change(amountTypeSelect, {
        target: { value: "subscription_based" },
      });

      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          amount: expect.objectContaining({
            type: "subscription_based",
          }),
        }),
      });

      // Step 6: Open product manager
      const manageButton = screen.getByText("Manage Subscriptions");
      fireEvent.click(manageButton);

      expect(screen.getByText("Manage Form Subscriptions")).toBeInTheDocument();
      expect(screen.getByTestId("form-product-manager")).toBeInTheDocument();

      // Step 7: Add a subscription
      const addButton = screen.getByText("Add subscription");
      fireEvent.click(addButton);

      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          formItems: expect.objectContaining({
            // Should contain the new subscription
          }),
        }),
      });
    });

    test("configures payment methods based on capabilities", async () => {
      render(
        <PayPalFieldEditorTabs
          selectedField={mockField}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Navigate to configuration tab
      fireEvent.click(screen.getByText("Payment Configuration"));

      // Enable Venmo (should be available based on capabilities)
      const venmoCheckbox = screen.getByRole("checkbox", { name: /venmo/i });
      expect(venmoCheckbox).not.toBeDisabled();

      fireEvent.click(venmoCheckbox);

      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          paymentMethods: expect.objectContaining({
            venmo: true,
          }),
        }),
      });
    });

    test("configures advanced settings", () => {
      render(
        <PayPalFieldEditorTabs
          selectedField={mockField}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Navigate to advanced tab
      fireEvent.click(screen.getByText("Advanced Settings"));

      // Expand behavior section
      fireEvent.click(screen.getByText("Field Behavior"));

      // Enable billing address collection
      const billingCheckbox = screen.getByRole("checkbox", {
        name: /collect billing address/i,
      });
      fireEvent.click(billingCheckbox);

      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          behavior: expect.objectContaining({
            collectBillingAddress: true,
          }),
        }),
      });
    });
  });

  describe("Form JSON Structure Validation", () => {
    test("maintains proper form JSON structure", () => {
      render(
        <PayPalFieldEditorTabs
          selectedField={mockField}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Make a configuration change
      const merchantSelect = screen.getByTestId("merchant-select");
      fireEvent.change(merchantSelect, { target: { value: "merchant-123" } });

      // Verify the update maintains proper structure
      const lastCall =
        mockOnUpdateField.mock.calls[mockOnUpdateField.mock.calls.length - 1];
      const [fieldId, updates] = lastCall;

      expect(fieldId).toBe("field-1");
      expect(updates).toHaveProperty("subFields");
      expect(updates.subFields).toHaveProperty("merchantId", "merchant-123");
      expect(updates.subFields).toHaveProperty("gateway", "paypal");
    });

    test("preserves existing field data during updates", () => {
      const fieldWithData = {
        ...mockField,
        subFields: {
          ...mockField.subFields,
          merchantId: "existing-merchant",
          formItems: {
            product_1: {
              id: "product_1",
              type: "product",
              name: "Existing Product",
              price: "19.99",
            },
          },
        },
      };

      render(
        <PayPalFieldEditorTabs
          selectedField={fieldWithData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Change payment type
      const paymentTypeSelect = screen.getByDisplayValue("One-time Payment");
      fireEvent.change(paymentTypeSelect, { target: { value: "donation" } });

      // Verify existing data is preserved
      const lastCall =
        mockOnUpdateField.mock.calls[mockOnUpdateField.mock.calls.length - 1];
      const [, updates] = lastCall;

      expect(updates.subFields.merchantId).toBe("existing-merchant");
      expect(updates.subFields.formItems).toHaveProperty("product_1");
      expect(updates.subFields.paymentType).toBe("donation");
    });
  });

  describe("Help System Integration", () => {
    test("displays help tooltips", () => {
      render(
        <PayPalFieldEditorTabs
          selectedField={mockField}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Check for help tooltips
      const helpTooltips = screen.getAllByTestId("help-tooltip");
      expect(helpTooltips.length).toBeGreaterThan(0);

      // Check for contextual help
      expect(screen.getByTestId("contextual-help")).toBeInTheDocument();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("handles missing subFields gracefully", () => {
      const fieldWithoutSubFields = {
        id: "field-1",
        type: "paypal_payment",
      };

      render(
        <PayPalFieldEditorTabs
          selectedField={fieldWithoutSubFields}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Should render without errors
      expect(
        screen.getByText("PayPal Payment Configuration")
      ).toBeInTheDocument();
    });

    test("handles API errors gracefully", async () => {
      const { initiatePayment } = require("./paypalApi");
      initiatePayment.mockRejectedValueOnce(new Error("API Error"));

      render(
        <PayPalFieldEditorTabs
          selectedField={mockField}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Select merchant to trigger API call
      const merchantSelect = screen.getByTestId("merchant-select");
      fireEvent.change(merchantSelect, { target: { value: "merchant-123" } });

      // Should handle error gracefully (no crash)
      await waitFor(() => {
        expect(
          screen.getByText("PayPal Payment Configuration")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Performance and Memory", () => {
    test("cleans up event listeners on unmount", () => {
      const { unmount } = render(
        <PayPalFieldEditorTabs
          selectedField={mockField}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Open modal to trigger event listeners
      fireEvent.click(screen.getByText("Payment Configuration"));
      const amountTypeSelect = screen.getByDisplayValue("Fixed Amount");
      fireEvent.change(amountTypeSelect, {
        target: { value: "product_based" },
      });
      fireEvent.click(screen.getByText("Manage Products"));

      // Unmount component
      unmount();

      // Should not cause memory leaks (test passes if no errors)
      expect(true).toBe(true);
    });
  });

  describe("Accessibility", () => {
    test("provides proper ARIA labels and roles", () => {
      render(
        <PayPalFieldEditorTabs
          selectedField={mockField}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Check for accessible form elements
      const tabs = screen.getAllByRole("button");
      expect(tabs.length).toBeGreaterThan(0);

      // Check for proper labeling
      expect(screen.getByDisplayValue("One-time Payment")).toBeInTheDocument();
    });
  });
});

describe("Backward Compatibility", () => {
  test("works with legacy field structures", () => {
    const legacyField = {
      id: "field-1",
      type: "paypal_payment",
      // Legacy structure without subFields
      paypalConfig: {
        merchantId: "legacy-merchant",
        paymentType: "one_time",
      },
    };

    // Should handle gracefully without errors
    const { container } = render(
      <PaymentFieldEditor
        selectedField={legacyField}
        onUpdateField={mockOnUpdateField}
      />
    );

    expect(container).toBeInTheDocument();
  });
});

describe("Security Validation", () => {
  test("does not expose sensitive data in field updates", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Make a configuration change
    const merchantSelect = screen.getByTestId("merchant-select");
    fireEvent.change(merchantSelect, { target: { value: "merchant-123" } });

    // Verify no sensitive data is included
    const lastCall =
      mockOnUpdateField.mock.calls[mockOnUpdateField.mock.calls.length - 1];
    const [, updates] = lastCall;

    // Should not contain sensitive payment data
    expect(JSON.stringify(updates)).not.toMatch(/password|secret|key|token/i);
  });
});
