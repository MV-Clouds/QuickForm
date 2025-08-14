import React from "react";
import { render, screen } from "@testing-library/react";
import PayPalPaymentField from "./PayPalPaymentField";

describe("PayPalPaymentField", () => {
  test("renders PayPal payment field with correct label", () => {
    render(<PayPalPaymentField />);

    // Check if the PayPal Payment label is present
    expect(screen.getByText("PayPal Payment")).toBeInTheDocument();
  });

  test("has draggable attribute", () => {
    const { container } = render(<PayPalPaymentField />);
    const draggableElement = container.querySelector('[draggable="true"]');

    expect(draggableElement).toBeInTheDocument();
  });

  test("contains PayPal icon", () => {
    const { container } = render(<PayPalPaymentField />);
    const svgElement = container.querySelector("svg");

    expect(svgElement).toBeInTheDocument();
  });

  test("has correct CSS classes for styling", () => {
    const { container } = render(<PayPalPaymentField />);
    const fieldItem = container.querySelector(".field-item");

    expect(fieldItem).toHaveClass("field-item");
    expect(fieldItem).toHaveClass("hover:bg-blue-50");
    expect(fieldItem).toHaveClass("cursor-grab");
  });
});
