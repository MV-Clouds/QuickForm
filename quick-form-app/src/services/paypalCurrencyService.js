// Static-only currency service: per directive, do not perform any runtime callouts.
// Source of truth lives in ../utils/paypalCurrencies.
// This file remains as a thin shim to avoid refactors in import sites.

import { getSupportedCurrencies as getStaticCurrencies } from "../utils/paypalCurrencies";

export async function fetchSupportedCurrencies() {
  // No network calls; always return the static list
  return getStaticCurrencies();
}

export function normalizeCurrencyLabel(c) {
  const code = c?.code || c;
  const suffix = c?.zeroDecimal ? " · 0-decimal" : "";
  const loc = c?.inCountryOnly ? " · local" : "";
  return `${code}${suffix}${loc}`;
}
