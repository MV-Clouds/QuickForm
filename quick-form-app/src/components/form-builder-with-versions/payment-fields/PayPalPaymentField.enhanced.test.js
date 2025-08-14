import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PayPalPaymentField from "./PayPalPaymentField";

describe("PayPalPaymentField Enhanced Features", () => {
  test("renders normally when no payment fields exist", () => {
    const fields = [];
    render(<PayPalPaymentField fields={fields} />);

    const fieldElement = screen.getByText("PayPal Payment");
    expect(fieldElement).toBeInTheDocument();
    expect(fieldElement).not.toHaveClass("text-gray-400");
  });

  test("shows disabled state when payment field already exists", () => {
    const fields = [{ id: "field-1", type: "paypal_payment" }];

    render(<PayPalPaymentField fields={fields} />);

    // Check if "Already added" text is shown
    expect(screen.getByText("Already added")).toBeInTheDocument();

    // Check if the field has disabled styling
    const fieldContainer = screen
      .getByText("PayPal Payment")
      .closest(".field-item");
    expect(fieldContainer).toHaveClass("cursor-not-allowed");
    expect(fieldContainer).toHaveClass("opacity-60");
  });

  test("prevents drag when payment field already exists", () => {
    const fields = [{ id: "field-1", type: "paypal_payment" }];

    // Mock alert
    window.alert = jest.fn();

    const { container } = render(<PayPalPaymentField fields={fields} />);
    const draggableElement = container.querySelector("[draggable]");

    // Should not be draggable
    expect(draggableElement.getAttribute("draggable")).toBe("false");

    // Try to trigger drag start
    fireEvent.dragStart(draggableElement);

    // Should show alert
    expect(window.alert).toHaveBeenCalledWith(
      "Only one payment field is allowed per form. Please remove the existing payment field first."
    );
  });

  test("allows drag when no payment field exists", () => {
    const fields = [];
    const mockOnDragStart = jest.fn();

    const { container } = render(
      <PayPalPaymentField fields={fields} onDragStart={mockOnDragStart} />
    );
    const draggableElement = container.querySelector("[draggable]");

    // Should be draggable
    expect(draggableElement.getAttribute("draggable")).toBe("true");

    // Should not have disabled classes
    expect(draggableElement).not.toHaveClass("cursor-not-allowed");
    expect(draggableElement).not.toHaveClass("opacity-60");
  });

  test("shows correct tooltip when disabled", () => {
    const fields = [{ id: "field-1", type: "paypal_payment" }];

    const { container } = render(<PayPalPaymentField fields={fields} />);
    const fieldContainer = container.querySelector(".field-item");

    expect(fieldContainer.getAttribute("title")).toBe(
      "Only one payment field is allowed per form"
    );
  });

  test("shows correct tooltip when enabled", () => {
    const fields = [];

    const { container } = render(<PayPalPaymentField fields={fields} />);
    const fieldContainer = container.querySelector(".field-item");

    expect(fieldContainer.getAttribute("title")).toBe(
      "Drag to add PayPal payment field to your form"
    );
  });
});
