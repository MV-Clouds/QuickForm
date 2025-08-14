import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Sidebar from "../Sidebar";

// Mock the PayPalPaymentField component
jest.mock("./PayPalPaymentField", () => {
  return function MockPayPalPaymentField() {
    return <div data-testid="paypal-payment-field">PayPal Payment Field</div>;
  };
});

describe("PayPal Payment Field Integration", () => {
  test("PayPal payment field appears in Payments tab", async () => {
    const mockThemes = [{ name: "Test Theme", color: "bg-blue-600" }];

    render(
      <Sidebar
        selectedTheme={mockThemes[0]}
        onThemeSelect={() => {}}
        themes={mockThemes}
      />
    );

    // Click on the Payments tab
    const paymentsTab = screen.getByText("Payments");

    await act(async () => {
      fireEvent.click(paymentsTab);
    });

    // Check if PayPal payment field is rendered
    expect(screen.getByTestId("paypal-payment-field")).toBeInTheDocument();
  });
});
