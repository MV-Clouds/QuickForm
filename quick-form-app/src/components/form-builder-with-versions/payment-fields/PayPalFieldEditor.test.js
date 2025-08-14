import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PayPalFieldEditor from "./PayPalFieldEditor";

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

jest.mock("./paypalApi", () => ({
  fetchItems: jest.fn(() =>
    Promise.resolve({
      success: true,
      items: [
        { id: "1", type: "product", name: "Test Product", price: 10 },
        { id: "2", type: "subscription", name: "Test Subscription", price: 20 },
        { id: "3", type: "donation", name: "Test Donation", price: 5 },
      ],
    })
  ),
}));

jest.mock("./ProductManager", () => {
  return function MockProductManager() {
    return <div data-testid="product-manager">Product Manager</div>;
  };
});

describe("PayPalFieldEditor", () => {
  const mockField = {
    id: "field-1",
    type: "paypal_payment",
    subFields: {
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
      merchantId: "",
    },
  };

  const mockOnUpdateField = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders PayPal field editor for paypal_payment field", () => {
    render(
      <PayPalFieldEditor
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    expect(
      screen.getByText("PayPal Payment Configuration")
    ).toBeInTheDocument();
    expect(screen.getByTestId("merchant-account-selector")).toBeInTheDocument();
  });

  test("does not render for non-PayPal field types", () => {
    const nonPayPalField = { ...mockField, type: "text" };

    const { container } = render(
      <PayPalFieldEditor
        selectedField={nonPayPalField}
        onUpdateField={mockOnUpdateField}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test("updates payment type when changed", () => {
    render(
      <PayPalFieldEditor
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
  });

  test("updates amount configuration when changed", () => {
    render(
      <PayPalFieldEditor
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

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

  test("updates payment methods when changed", () => {
    render(
      <PayPalFieldEditor
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

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

  test("updates field behavior settings when changed", () => {
    render(
      <PayPalFieldEditor
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    const billingAddressCheckbox = screen.getByRole("checkbox", {
      name: /collect billing address/i,
    });
    fireEvent.click(billingAddressCheckbox);

    expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
      subFields: expect.objectContaining({
        behavior: expect.objectContaining({
          collectBillingAddress: true,
        }),
      }),
    });
  });

  test("opens product manager when manage products button is clicked", async () => {
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
      <PayPalFieldEditor
        selectedField={fieldWithProductAmount}
        onUpdateField={mockOnUpdateField}
      />
    );

    // First change amount type to product_based to show the manage button
    const amountTypeSelect = screen.getByDisplayValue("Fixed Amount");
    fireEvent.change(amountTypeSelect, { target: { value: "product_based" } });

    // Wait for the manage products button to appear
    await waitFor(() => {
      const manageButton = screen.getByText("Manage Products");
      expect(manageButton).toBeInTheDocument();
    });

    // Click the manage products button
    const manageButton = screen.getByText("Manage Products");
    fireEvent.click(manageButton);

    // Check if the modal opens
    await waitFor(() => {
      expect(screen.getByText("Manage Products")).toBeInTheDocument();
      expect(screen.getByTestId("product-manager")).toBeInTheDocument();
    });
  });

  test("loads products when merchant is selected", async () => {
    render(
      <PayPalFieldEditor
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    // Click the select merchant button
    const selectMerchantButton = screen.getByText("Select Merchant");
    fireEvent.click(selectMerchantButton);

    // Wait for the merchant to be selected and products to load
    await waitFor(() => {
      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          merchantId: "test-merchant-id",
        }),
      });
    });
  });

  test("shows information note", () => {
    render(
      <PayPalFieldEditor
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );

    expect(
      screen.getByText(/This is a PayPal payment field/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Only one payment field is allowed per form/i)
    ).toBeInTheDocument();
  });
});
