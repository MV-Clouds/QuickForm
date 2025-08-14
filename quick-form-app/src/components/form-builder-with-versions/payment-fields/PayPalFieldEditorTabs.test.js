import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PayPalFieldEditorTabs from "./PayPalFieldEditorTabs";

// Mock the dependencies
jest.mock("./MerchantAccountSelector", () => {
  return function MockMerchantAccountSelector({
    onMerchantChange,
    onCapabilitiesChange,
  }) {
    return (
      <div data-testid="merchant-account-selector">
        <button
          onClick={() => {
            onMerchantChange("test-merchant-id");
            onCapabilitiesChange({
              subscriptions: true,
              donations: true,
              venmo: true,
              googlePay: true,
            });
          }}
        >
          Select Merchant
        </button>
      </div>
    );
  };
});

jest.mock("./FormProductManager", () => {
  return function MockFormProductManager() {
    return <div data-testid="form-product-manager">Form Product Manager</div>;
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

describe("PayPalFieldEditorTabs", () => {
  const mockField = {
    id: "field-1",
    type: "paypal_payment",
    subFields: {
      merchantId: "test-merchant",
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
    },
  };

  const mockOnUpdateField = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders PayPal field editor with tabs", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    expect(
      screen.getByText("PayPal Payment Configuration")
    ).toBeInTheDocument();
    expect(screen.getByText("Account & Payment Type")).toBeInTheDocument();
    expect(screen.getByText("Payment Configuration")).toBeInTheDocument();
    expect(screen.getByText("Advanced Settings")).toBeInTheDocument();
  });

  test("does not render for non-PayPal field types", () => {
    const nonPayPalField = { ...mockField, type: "text" };

    const { container } = render(
      <PayPalFieldEditorTabs
        selectedField={nonPayPalField}
        onUpdateField={mockOnUpdateField}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test("switches between tabs correctly", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Default tab should be account
    expect(screen.getByText("Merchant Account")).toBeInTheDocument();

    // Switch to configuration tab
    fireEvent.click(screen.getByText("Payment Configuration"));
    expect(screen.getByText("Amount Configuration")).toBeInTheDocument();

    // Switch to advanced tab
    fireEvent.click(screen.getByText("Advanced Settings"));
    expect(screen.getByText("Field Behavior")).toBeInTheDocument();
  });

  test("expands and collapses accordion sections", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Merchant Account section should be expanded by default
    expect(screen.getByTestId("merchant-account-selector")).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByText("Merchant Account"));
    expect(
      screen.queryByTestId("merchant-account-selector")
    ).not.toBeInTheDocument();

    // Click to expand again
    fireEvent.click(screen.getByText("Merchant Account"));
    expect(screen.getByTestId("merchant-account-selector")).toBeInTheDocument();
  });

  test("updates payment type and switches to configuration tab", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    const paymentTypeSelect = screen.getByDisplayValue("One-time Payment");
    fireEvent.change(paymentTypeSelect, { target: { value: "subscription" } });

    expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
      subFields: expect.objectContaining({
        paymentType: "subscription",
      }),
    });

    // Should auto-switch to configuration tab
    expect(screen.getByText("Amount Configuration")).toBeInTheDocument();
  });

  test("shows account status when merchant is selected", async () => {
    const { initiatePayment } = require("./paypalApi");

    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Select a merchant
    fireEvent.click(screen.getByText("Select Merchant"));

    await waitFor(() => {
      expect(initiatePayment).toHaveBeenCalledWith({
        action: "get-merchant-capabilities",
        merchantId: "test-merchant-id",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Connected & Active")).toBeInTheDocument();
    });
  });

  test("configures amount settings in configuration tab", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Switch to configuration tab
    fireEvent.click(screen.getByText("Payment Configuration"));

    // Change amount type
    const amountTypeSelect = screen.getByDisplayValue("Fixed Amount");
    fireEvent.change(amountTypeSelect, { target: { value: "variable" } });

    expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
      subFields: expect.objectContaining({
        amount: expect.objectContaining({
          type: "variable",
        }),
      }),
    });
  });

  test("shows custom amount configuration", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Switch to configuration tab
    fireEvent.click(screen.getByText("Payment Configuration"));

    // Change to custom amount
    const amountTypeSelect = screen.getByDisplayValue("Fixed Amount");
    fireEvent.change(amountTypeSelect, { target: { value: "custom" } });

    expect(screen.getByText("Custom Amount Checkout")).toBeInTheDocument();
    expect(
      screen.getByText("Users will enter their own amount during checkout")
    ).toBeInTheDocument();
  });

  test("configures payment methods", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Switch to configuration tab
    fireEvent.click(screen.getByText("Payment Configuration"));

    // Toggle Venmo
    const venmoCheckbox = screen.getByRole("checkbox", { name: /venmo/i });
    fireEvent.click(venmoCheckbox);

    expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
      subFields: expect.objectContaining({
        paymentMethods: expect.objectContaining({
          venmo: true,
        }),
      }),
    });
  });

  test("configures field behavior in advanced tab", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Switch to advanced tab
    fireEvent.click(screen.getByText("Advanced Settings"));

    // Expand behavior section
    fireEvent.click(screen.getByText("Field Behavior"));

    // Toggle billing address collection
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

  test("opens product manager modal", () => {
    const fieldWithProductAmount = {
      ...mockField,
      subFields: {
        ...mockField.subFields,
        amount: {
          ...mockField.subFields.amount,
          type: "product_based",
        },
      },
    };

    render(
      <PayPalFieldEditorTabs
        selectedField={fieldWithProductAmount}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Switch to configuration tab
    fireEvent.click(screen.getByText("Payment Configuration"));

    // Change to product based
    const amountTypeSelect = screen.getByDisplayValue("Fixed Amount");
    fireEvent.change(amountTypeSelect, { target: { value: "product_based" } });

    // Click manage products button
    const manageButton = screen.getByText("Manage Products");
    fireEvent.click(manageButton);

    expect(screen.getByText("Manage Form Products")).toBeInTheDocument();
    expect(screen.getByTestId("form-product-manager")).toBeInTheDocument();
  });

  test("closes modal when clicking outside", () => {
    const fieldWithProductAmount = {
      ...mockField,
      subFields: {
        ...mockField.subFields,
        amount: {
          ...mockField.subFields.amount,
          type: "product_based",
        },
      },
    };

    render(
      <PayPalFieldEditorTabs
        selectedField={fieldWithProductAmount}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Switch to configuration tab and open modal
    fireEvent.click(screen.getByText("Payment Configuration"));
    const amountTypeSelect = screen.getByDisplayValue("Fixed Amount");
    fireEvent.change(amountTypeSelect, { target: { value: "product_based" } });
    fireEvent.click(screen.getByText("Manage Products"));

    // Click outside modal (on backdrop)
    const modal =
      screen.getByRole("dialog", { hidden: true }) ||
      document.querySelector('[class*="fixed inset-0"]');
    if (modal) {
      fireEvent.click(modal);
    }

    // Modal should close
    expect(screen.queryByText("Manage Form Products")).not.toBeInTheDocument();
  });

  test("shows payment type specific options", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Switch to configuration tab
    fireEvent.click(screen.getByText("Payment Configuration"));

    // Should show product_based option for one_time payment
    const amountTypeSelect = screen.getByDisplayValue("Fixed Amount");
    expect(amountTypeSelect).toContainHTML(
      '<option value="product_based">Product Based</option>'
    );

    // Change to subscription payment type
    fireEvent.click(screen.getByText("Account & Payment Type"));
    const paymentTypeSelect = screen.getByDisplayValue("One-time Payment");
    fireEvent.change(paymentTypeSelect, { target: { value: "subscription" } });

    // Switch back to configuration tab
    fireEvent.click(screen.getByText("Payment Configuration"));

    // Should now show subscription_based option
    const updatedAmountTypeSelect = screen.getByDisplayValue("Fixed Amount");
    expect(updatedAmountTypeSelect).toContainHTML(
      '<option value="subscription_based">Subscription Based</option>'
    );
  });

  test("displays important notes in advanced tab", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Switch to advanced tab
    fireEvent.click(screen.getByText("Advanced Settings"));

    expect(screen.getByText("Important Notes:")).toBeInTheDocument();
    expect(
      screen.getByText("Only one payment field is allowed per form")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Test your payment configuration before publishing the form"
      )
    ).toBeInTheDocument();
  });
});
