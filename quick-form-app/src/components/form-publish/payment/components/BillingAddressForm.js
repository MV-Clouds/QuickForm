import React from "react";

// Minimal billing address form used when collectBillingAddress is enabled
// Shape aligns with PayPal address schema where possible
export const defaultBillingAddress = {
  address_line_1: "",
  address_line_2: "",
  admin_area_2: "", // city
  admin_area_1: "", // state/province
  postal_code: "",
  country_code: "",
};

export const validateBillingAddress = (addr) => {
  if (!addr)
    return {
      valid: false,
      missing: [
        "address_line_1",
        "admin_area_2",
        "admin_area_1",
        "postal_code",
        "country_code",
      ],
    };
  const missing = [];
  if (!addr.address_line_1?.trim()) missing.push("address_line_1");
  if (!addr.admin_area_2?.trim()) missing.push("admin_area_2");
  if (!addr.admin_area_1?.trim()) missing.push("admin_area_1");
  if (!addr.postal_code?.trim()) missing.push("postal_code");
  if (!addr.country_code?.trim()) missing.push("country_code");
  return { valid: missing.length === 0, missing };
};

const BillingAddressForm = ({ value, onChange, error }) => {
  const v = value || defaultBillingAddress;
  const handle = (field) => (e) => onChange({ ...v, [field]: e.target.value });

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <h4 className="text-sm font-medium text-gray-900 mb-3">
        Billing Address
      </h4>
      {error && (
        <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          Please fill all required billing address fields.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-700 mb-1">
            Address Line 1 *
          </label>
          <input
            className="w-full p-2 border rounded"
            value={v.address_line_1}
            onChange={handle("address_line_1")}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">
            Address Line 2
          </label>
          <input
            className="w-full p-2 border rounded"
            value={v.address_line_2}
            onChange={handle("address_line_2")}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">City *</label>
          <input
            className="w-full p-2 border rounded"
            value={v.admin_area_2}
            onChange={handle("admin_area_2")}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">
            State/Province *
          </label>
          <input
            className="w-full p-2 border rounded"
            value={v.admin_area_1}
            onChange={handle("admin_area_1")}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">
            Postal Code *
          </label>
          <input
            className="w-full p-2 border rounded"
            value={v.postal_code}
            onChange={handle("postal_code")}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">
            Country Code (e.g., US) *
          </label>
          <input
            className="w-full p-2 border rounded"
            value={v.country_code}
            onChange={handle("country_code")}
          />
        </div>
      </div>
    </div>
  );
};

export default BillingAddressForm;
