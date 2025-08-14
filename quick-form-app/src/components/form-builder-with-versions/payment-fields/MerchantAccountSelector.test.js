import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MerchantAccountSelector from "./MerchantAccountSelector";

describe("MerchantAccountSelector", () => {
  const mockOnMerchantChange = jest.fn();
  const mockOnAddNewAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state initially", () => {
    render(
      <MerchantAccountSelector
        selectedMerchantId=""
        onMerchantChange={mockOnMerchantChange}
        onAddNewAccount={mockOnAddNewAccount}
      />
    );

    expect(
      screen.getByText("Loading merchant accounts...")
    ).toBeInTheDocument();
  });

  test("renders merchant account dropdown after loading", async () => {
    render(
      <MerchantAccountSelector
        selectedMerchantId=""
        onMerchantChange={mockOnMerchantChange}
        onAddNewAccount={mockOnAddNewAccount}
      />
    );

    // Wait for dropdown to appear
    const dropdown = await waitFor(() => screen.getByRole("combobox"), {
      timeout: 3000,
    });
    expect(dropdown).toBeInTheDocument();

    // Check if dropdown options are rendered
    expect(
      screen.getByText("Main Business Account (MERCHANT123)")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Secondary Store (MERCHANT456)")
    ).toBeInTheDocument();
  });

  test("calls onMerchantChange when account is selected", async () => {
    render(
      <MerchantAccountSelector
        selectedMerchantId=""
        onMerchantChange={mockOnMerchantChange}
        onAddNewAccount={mockOnAddNewAccount}
      />
    );

    // Wait for dropdown to appear
    const dropdown = await waitFor(() => screen.getByRole("combobox"), {
      timeout: 3000,
    });

    fireEvent.change(dropdown, { target: { value: "MERCHANT123" } });
    expect(mockOnMerchantChange).toHaveBeenCalledWith("MERCHANT123");
  });

  test("shows help text", () => {
    render(
      <MerchantAccountSelector
        selectedMerchantId=""
        onMerchantChange={mockOnMerchantChange}
        onAddNewAccount={mockOnAddNewAccount}
      />
    );

    expect(
      screen.getByText(
        /Select the PayPal merchant account to use for processing payments/
      )
    ).toBeInTheDocument();
  });
});
