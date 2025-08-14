import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FormProductManager from "./FormProductManager";

// Mock the paypalApi
jest.mock("./paypalApi", () => ({
  syncPaypalSubscriptions: jest.fn(() =>
    Promise.resolve({
      success: true,
      subscriptions: [
        {
          id: "paypal-sub-1",
          name: "PayPal Subscription",
          description: "Test subscription from PayPal",
          price: "29.99",
          currency: "USD",
          frequency: "monthly",
        },
      ],
    })
  ),
}));

describe("FormProductManager", () => {
  const mockField = {
    id: "field-1",
    type: "paypal_payment",
    subFields: {
      merchantId: "test-merchant",
      formItems: {
        product_1: {
          id: "product_1",
          type: "product",
          name: "Test Product",
          price: "19.99",
          currency: "USD",
          status: "enabled",
        },
        subscription_1: {
          id: "subscription_1",
          type: "subscription",
          name: "Test Subscription",
          price: "29.99",
          currency: "USD",
          frequency: "monthly",
          status: "enabled",
        },
      },
    },
  };

  const mockOnUpdateField = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders form product manager with existing items", () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Manage Form Products")).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("USD 19.99")).toBeInTheDocument();
  });

  test("shows empty state when no items exist", () => {
    const emptyField = {
      ...mockField,
      subFields: { ...mockField.subFields, formItems: {} },
    };

    render(
      <FormProductManager
        selectedField={emptyField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("No products found")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first product to get started")
    ).toBeInTheDocument();
  });

  test("opens create form when Add button is clicked", () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    const addButton = screen.getByText("Add Product");
    fireEvent.click(addButton);

    expect(screen.getByText("Create Product")).toBeInTheDocument();
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Price *")).toBeInTheDocument();
  });

  test("creates new product successfully", async () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    // Open create form
    fireEvent.click(screen.getByText("Add Product"));

    // Fill form
    fireEvent.change(screen.getByLabelText("Name *"), {
      target: { value: "New Product" },
    });
    fireEvent.change(screen.getByLabelText("Price *"), {
      target: { value: "39.99" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A new test product" },
    });

    // Submit form
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          formItems: expect.objectContaining({
            product_1: expect.any(Object), // Existing product
            // New product should be added with generated ID
          }),
        }),
      });
    });

    expect(screen.getByText("Item created successfully")).toBeInTheDocument();
  });

  test("edits existing product", async () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    // Click edit button
    const editButton = screen.getByTitle("Edit");
    fireEvent.click(editButton);

    expect(screen.getByText("Edit Product")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    expect(screen.getByDisplayValue("19.99")).toBeInTheDocument();

    // Update name
    fireEvent.change(screen.getByLabelText("Name *"), {
      target: { value: "Updated Product" },
    });

    // Submit form
    fireEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          formItems: expect.objectContaining({
            product_1: expect.objectContaining({
              name: "Updated Product",
            }),
          }),
        }),
      });
    });

    expect(screen.getByText("Item updated successfully")).toBeInTheDocument();
  });

  test("deletes product with confirmation", async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    // Click delete button
    const deleteButton = screen.getByTitle("Delete");
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete "Test Product"?'
    );

    await waitFor(() => {
      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          formItems: expect.not.objectContaining({
            product_1: expect.any(Object),
          }),
        }),
      });
    });

    expect(screen.getByText("Item deleted successfully")).toBeInTheDocument();
  });

  test("toggles product status", async () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    // Click disable button
    const toggleButton = screen.getByText("Disable");
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          formItems: expect.objectContaining({
            product_1: expect.objectContaining({
              status: "disabled",
            }),
          }),
        }),
      });
    });

    expect(screen.getByText("Item disabled successfully")).toBeInTheDocument();
  });

  test("imports subscriptions from PayPal", async () => {
    const { syncPaypalSubscriptions } = require("./paypalApi");

    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="subscription"
        onClose={mockOnClose}
      />
    );

    // Click import button
    const importButton = screen.getByText("Import from PayPal");
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(syncPaypalSubscriptions).toHaveBeenCalledWith("test-merchant");
    });

    await waitFor(() => {
      expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
        subFields: expect.objectContaining({
          formItems: expect.objectContaining({
            "paypal_paypal-sub-1": expect.objectContaining({
              name: "PayPal Subscription",
              source: "paypal",
              type: "subscription",
            }),
          }),
        }),
      });
    });

    expect(
      screen.getByText("Successfully imported 1 subscriptions from PayPal")
    ).toBeInTheDocument();
  });

  test("shows subscription-specific fields", () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="subscription"
        onClose={mockOnClose}
      />
    );

    // Open create form
    fireEvent.click(screen.getByText("Add Subscription"));

    expect(screen.getByLabelText("Billing Frequency")).toBeInTheDocument();
    expect(screen.getByLabelText("Trial Period (days)")).toBeInTheDocument();
  });

  test("shows donation-specific fields", () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="donation"
        onClose={mockOnClose}
      />
    );

    // Open create form
    fireEvent.click(screen.getByText("Add Donation"));

    expect(
      screen.getByLabelText("Suggested Amounts (comma-separated)")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Allow custom amount")).toBeInTheDocument();
  });

  test("shows product-specific fields", () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    // Open create form
    fireEvent.click(screen.getByText("Add Product"));

    expect(screen.getByLabelText("SKU")).toBeInTheDocument();
    expect(screen.getByLabelText("Inventory")).toBeInTheDocument();
  });

  test("requires merchant account", () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId=""
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByText("Please select a merchant account first")
    ).toBeInTheDocument();
  });

  test("closes form when cancel is clicked", () => {
    render(
      <FormProductManager
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
        selectedMerchantId="test-merchant"
        typeFilter="product"
        onClose={mockOnClose}
      />
    );

    // Open create form
    fireEvent.click(screen.getByText("Add Product"));
    expect(screen.getByText("Create Product")).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Create Product")).not.toBeInTheDocument();
  });
});
