// src/utils/getCountries.js
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

export const getCountryList = () => {
  return getCountries()
    .map((code) => {
      const countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
      const dialCode = `+${getCountryCallingCode(code)}`;
      return {
        code,
        name: countryName || code, // Fallback to code if name is undefined
        dialCode,
      };
    })
    .filter((country) => country.name) // Exclude invalid entries
    .sort((a, b) => a.name.localeCompare(b.name));
};