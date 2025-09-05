// Centralized PayPal-supported currency metadata based on official docs
// https://developer.paypal.com/docs/api/reference/currency-codes/

export const PAYPAL_CURRENCIES = [
  { code: "AUD", name: "Australian dollar" },
  { code: "BRL", name: "Brazilian real", inCountryOnly: true },
  { code: "CAD", name: "Canadian dollar" },
  { code: "CNY", name: "Chinese Renminbi", inCountryOnly: true },
  { code: "CZK", name: "Czech koruna" },
  { code: "DKK", name: "Danish krone" },
  { code: "EUR", name: "Euro" },
  { code: "HKD", name: "Hong Kong dollar" },
  { code: "HUF", name: "Hungarian forint", zeroDecimal: true },
  { code: "ILS", name: "Israeli new shekel" },
  { code: "JPY", name: "Japanese yen", zeroDecimal: true },
  { code: "MYR", name: "Malaysian ringgit", inCountryOnly: true },
  { code: "MXN", name: "Mexican peso" },
  { code: "TWD", name: "New Taiwan dollar", zeroDecimal: true },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "NOK", name: "Norwegian krone" },
  { code: "PHP", name: "Philippine peso" },
  { code: "PLN", name: "Polish złoty" },
  { code: "GBP", name: "Pound sterling" },
  { code: "RUB", name: "Russian ruble" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "SEK", name: "Swedish krona" },
  { code: "CHF", name: "Swiss franc" },
  { code: "THB", name: "Thai baht" },
  { code: "USD", name: "United States dollar" },
];

export const isZeroDecimal = (code) =>
  !!PAYPAL_CURRENCIES.find((c) => c.code === code)?.zeroDecimal;

export const isInCountryOnly = (code) =>
  !!PAYPAL_CURRENCIES.find((c) => c.code === code)?.inCountryOnly;

export const getSupportedCurrencies = ({ includeInCountry = false } = {}) =>
  PAYPAL_CURRENCIES.filter((c) => includeInCountry || !c.inCountryOnly);

export const formatCurrencyLabel = (c) => `${c.code} - ${c.name}`;

export default PAYPAL_CURRENCIES;
