/**
 * Payment Validation Utilities
 * Validation functions for payment data and configurations
 */

/**
 * Validate payment field configuration - Updated for dynamic structure
 */
export const validatePaymentFieldConfig = (fieldConfig) => {
  const errors = [];

  // Handle dynamic data structure: Form Version Data → Fields Data → PayPal_payment (or other gateways)
  const subFields = fieldConfig.subFields || fieldConfig || {};
  const merchantId = subFields.merchantId || fieldConfig.merchantId;
  const paymentType = subFields.paymentType || fieldConfig.paymentType;

  // Check if merchant ID is present
  if (!merchantId) {
    errors.push("Merchant account is required");
  }

  // Check payment type
  if (!paymentType) {
    errors.push("Payment type is required");
  }

  // Validate based on payment type
  switch (paymentType) {
    case "custom_amount":
      const amount = subFields.amount || fieldConfig.amount;
      if (!amount || (!amount.value && amount.type === "static")) {
        errors.push("Amount is required for custom amount payments");
      }
      break;

    case "donation_button":
      const donationButtonId =
        subFields.donationButtonId || fieldConfig.donationButtonId;
      if (!donationButtonId) {
        errors.push("Donation button ID is required");
      }
      break;

    case "subscription":
      // Subscription validation would go here
      break;

    case "product_wise":
      // Product validation would go here
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate payment amount input
 */
export const validatePaymentAmount = (amount, fieldConfig) => {
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      isValid: false,
      error: "Please enter a valid amount greater than 0",
    };
  }

  // Check minimum amount
  if (fieldConfig.amount?.minAmount) {
    const minAmount = parseFloat(fieldConfig.amount.minAmount);
    if (numAmount < minAmount) {
      return {
        isValid: false,
        error: `Amount must be at least $${minAmount.toFixed(2)}`,
      };
    }
  }

  // Check maximum amount
  if (fieldConfig.amount?.maxAmount) {
    const maxAmount = parseFloat(fieldConfig.amount.maxAmount);
    if (numAmount > maxAmount) {
      return {
        isValid: false,
        error: `Amount cannot exceed $${maxAmount.toFixed(2)}`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate donor information for donations
 */
export const validateDonorInfo = (donorInfo, isRequired = false) => {
  const errors = {};

  if (
    isRequired ||
    donorInfo.firstName ||
    donorInfo.lastName ||
    donorInfo.email
  ) {
    // First name validation
    if (isRequired && !donorInfo.firstName?.trim()) {
      errors.firstName = "First name is required";
    }

    // Last name validation
    if (isRequired && !donorInfo.lastName?.trim()) {
      errors.lastName = "Last name is required";
    }

    // Email validation
    if (donorInfo.email && !isValidEmail(donorInfo.email)) {
      errors.email = "Please enter a valid email address";
    } else if (isRequired && !donorInfo.email?.trim()) {
      errors.email = "Email is required";
    }

    // Phone validation (if provided)
    if (donorInfo.phone && !isValidPhone(donorInfo.phone)) {
      errors.phone = "Please enter a valid phone number";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate shipping address
 */
export const validateShippingAddress = (address, isRequired = false) => {
  const errors = {};

  if (isRequired || Object.values(address).some((value) => value?.trim())) {
    if (isRequired && !address.fullName?.trim()) {
      errors.fullName = "Full name is required";
    }

    if (isRequired && !address.addressLine1?.trim()) {
      errors.addressLine1 = "Address is required";
    }

    if (isRequired && !address.city?.trim()) {
      errors.city = "City is required";
    }

    if (isRequired && !address.state?.trim()) {
      errors.state = "State is required";
    }

    if (isRequired && !address.postalCode?.trim()) {
      errors.postalCode = "Postal code is required";
    }

    if (isRequired && !address.countryCode?.trim()) {
      errors.countryCode = "Country is required";
    }

    // Postal code format validation (basic)
    if (address.postalCode && address.countryCode === "US") {
      const usZipRegex = /^\d{5}(-\d{4})?$/;
      if (!usZipRegex.test(address.postalCode)) {
        errors.postalCode = "Please enter a valid US postal code";
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate product selection for product-wise payments
 */
export const validateProductSelection = (
  selectedProducts,
  availableProducts
) => {
  if (!selectedProducts || selectedProducts.length === 0) {
    return {
      isValid: false,
      error: "Please select at least one product",
    };
  }

  // Validate each selected product
  for (const product of selectedProducts) {
    const availableProduct = availableProducts.find(
      (p) => p.id === product.productId
    );

    if (!availableProduct) {
      return {
        isValid: false,
        error: `Selected product ${product.productId} is not available`,
      };
    }

    if (!product.quantity || product.quantity < 1) {
      return {
        isValid: false,
        error: `Please specify a valid quantity for ${availableProduct.name}`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Helper function to validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Helper function to validate phone format
 */
const isValidPhone = (phone) => {
  // Basic phone validation - accepts various formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, "");
  return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
};

/**
 * Validate payment method availability
 */
export const validatePaymentMethodAvailability = (
  selectedMethod,
  availableMethods,
  merchantCapabilities
) => {
  if (!availableMethods.includes(selectedMethod)) {
    return {
      isValid: false,
      error: `${selectedMethod} is not available for this payment`,
    };
  }

  // Check merchant capabilities
  switch (selectedMethod) {
    case "cards":
      if (!merchantCapabilities.cards) {
        return {
          isValid: false,
          error: "Card payments are not enabled for this merchant",
        };
      }
      break;

    case "venmo":
      if (!merchantCapabilities.venmo) {
        return {
          isValid: false,
          error: "Venmo is not available for this merchant",
        };
      }
      break;

    case "googlePay":
      if (!merchantCapabilities.googlePay) {
        return {
          isValid: false,
          error: "Google Pay is not available for this merchant",
        };
      }
      break;
  }

  return { isValid: true };
};
