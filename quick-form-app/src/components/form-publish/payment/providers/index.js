/**
 * Payment Providers Index
 * Exports all available payment providers
 */

import PayPalPaymentProvider from "./PayPalPaymentProvider";

// Export individual providers
export { PayPalPaymentProvider };

// Provider registry for future extensibility
export const PAYMENT_PROVIDERS = {
  paypal: PayPalPaymentProvider,
  // Future providers can be added here:
  // stripe: StripePaymentProvider,
  // square: SquarePaymentProvider,
};

// Get provider component by name
export const getPaymentProvider = (providerName) => {
  return PAYMENT_PROVIDERS[providerName] || null;
};

// Get available provider names
export const getAvailableProviders = () => {
  return Object.keys(PAYMENT_PROVIDERS);
};

// Default export
export default {
  PayPalPaymentProvider,
  PAYMENT_PROVIDERS,
  getPaymentProvider,
  getAvailableProviders,
};
