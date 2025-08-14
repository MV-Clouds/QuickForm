import React from "react";
import { render, screen } from "@testing-library/react";
import PaymentFieldEditor, {
  getAvailablePaymentGateways,
  createPaymentField,
} from "./PaymentFieldEditor";

// Mock the PayPalFieldEditor
jest.mock("./PayPalFieldEditor", () => {
  return function MockPayPalFieldEditor({
    selectedField,
    onUpdateField,
    className,
  }) {
    return (
      <div data-testid="paypal-field-editor" className={className}>
        PayPal Field Editor for {selectedField.id}
      </div>
    );
  };
});

describe("PaymentFieldEditor", () => {
  const mockOnUpdateField = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PayPal Payment Fields", () => {
    test("renders PayPalFieldEditor for paypal_payment field type", () => {
      const paypalField = {
        id: "field-1",
        type: "paypal_payment",
        subFields: { gateway: "paypal" },
      };

      render(
        <PaymentFieldEditor
          selectedField={paypalField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(screen.getByTestId("paypal-field-editor")).toBeInTheDocument();
      expect(
        screen.getByText("PayPal Field Editor for field-1")
      ).toBeInTheDocument();
    });

    test("renders PayPalFieldEditor for field with paypal gateway in subFields", () => {
      const paypalField = {
        id: "field-2",
        type: "payment",
        subFields: { gateway: "paypal" },
      };

      render(
        <PaymentFieldEditor
          selectedField={paypalField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(screen.getByTestId("paypal-field-editor")).toBeInTheDocument();
    });

    test("renders PayPalFieldEditor for field with paypal gateway property", () => {
      const paypalField = {
        id: "field-3",
        type: "payment",
        gateway: "paypal",
      };

      render(
        <PaymentFieldEditor
          selectedField={paypalField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(screen.getByTestId("paypal-field-editor")).toBeInTheDocument();
    });
  });

  describe("Unsupported Payment Gateways", () => {
    test("renders fallback UI for unsupported gateway", () => {
      const unsupportedField = {
        id: "field-4",
        type: "payment",
        gateway: "unsupported_gateway",
      };

      render(
        <PaymentFieldEditor
          selectedField={unsupportedField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(
        screen.getByText("Unsupported Payment Gateway")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /The payment gateway "unsupported_gateway" is not yet supported/
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText("Supported gateways: PayPal")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Coming soon: Stripe, Razorpay, Square")
      ).toBeInTheDocument();
    });

    test("renders fallback UI for unknown gateway", () => {
      const unknownField = {
        id: "field-5",
        type: "some_payment_type",
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
        screen.getByText(/The payment gateway "unknown" is not yet supported/)
      ).toBeInTheDocument();
    });
  });

  describe("Non-Payment Fields", () => {
    test("returns null for non-payment field", () => {
      const textField = {
        id: "field-6",
        type: "text",
      };

      const { container } = render(
        <PaymentFieldEditor
          selectedField={textField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test("returns null when no field is selected", () => {
      const { container } = render(
        <PaymentFieldEditor
          selectedField={null}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Future Payment Gateways", () => {
    test("renders fallback for stripe payment (not yet implemented)", () => {
      const stripeField = {
        id: "field-7",
        type: "stripe_payment",
      };

      render(
        <PaymentFieldEditor
          selectedField={stripeField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(
        screen.getByText("Unsupported Payment Gateway")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/The payment gateway "stripe" is not yet supported/)
      ).toBeInTheDocument();
    });

    test("renders fallback for razorpay payment (not yet implemented)", () => {
      const razorpayField = {
        id: "field-8",
        type: "razorpay_payment",
      };

      render(
        <PaymentFieldEditor
          selectedField={razorpayField}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(
        screen.getByText("Unsupported Payment Gateway")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/The payment gateway "razorpay" is not yet supported/)
      ).toBeInTheDocument();
    });
  });

  describe("Utility Functions", () => {
    test("getAvailablePaymentGateways returns correct gateway list", () => {
      const gateways = getAvailablePaymentGateways();

      expect(gateways).toHaveLength(4);
      expect(gateways[0]).toEqual({
        id: "paypal",
        name: "PayPal",
        description: "Accept payments via PayPal, cards, and digital wallets",
        supported: true,
        icon: "paypal",
      });
      expect(gateways[1]).toEqual({
        id: "stripe",
        name: "Stripe",
        description: "Accept credit cards and digital payments worldwide",
        supported: false,
        icon: "stripe",
      });
    });

    test("createPaymentField creates correct field structure", () => {
      const field = createPaymentField("paypal", "test-field-id");

      expect(field).toEqual({
        id: "test-field-id",
        type: "paypal_payment",
        label: "Paypal Payment",
        gateway: "paypal",
        subFields: {
          gateway: "paypal",
        },
      });
    });

    test("createPaymentField works for different gateways", () => {
      const stripeField = createPaymentField("stripe", "stripe-field");

      expect(stripeField.type).toBe("stripe_payment");
      expect(stripeField.label).toBe("Stripe Payment");
      expect(stripeField.gateway).toBe("stripe");
      expect(stripeField.subFields.gateway).toBe("stripe");
    });
  });

  describe("Gateway Detection", () => {
    test("prioritizes subFields.gateway over field.gateway", () => {
      const field = {
        id: "field-9",
        type: "payment",
        gateway: "stripe",
        subFields: { gateway: "paypal" },
      };

      render(
        <PaymentFieldEditor
          selectedField={field}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Should render PayPal editor because subFields.gateway takes priority
      expect(screen.getByTestId("paypal-field-editor")).toBeInTheDocument();
    });

    test("falls back to field.gateway when subFields.gateway is not present", () => {
      const field = {
        id: "field-10",
        type: "payment",
        gateway: "paypal",
      };

      render(
        <PaymentFieldEditor
          selectedField={field}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(screen.getByTestId("paypal-field-editor")).toBeInTheDocument();
    });

    test("infers gateway from field type when no explicit gateway", () => {
      const field = {
        id: "field-11",
        type: "paypal_payment",
      };

      render(
        <PaymentFieldEditor
          selectedField={field}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(screen.getByTestId("paypal-field-editor")).toBeInTheDocument();
    });
  });
});
