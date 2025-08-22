import React, { useState, useMemo } from "react";
import { SelectPicker } from "rsuite";
import { Plus, Trash2, Lock } from "lucide-react";

const AdvancedFilters = ({
  isOpen,
  onClose,
  fields,
  onApplyFilters,
  currentFilters = [],
  currentStatus = "",
}) => {
  const [filters, setFilters] = useState(
    currentFilters.length > 0
      ? // Ensure incoming filters have negate field
        currentFilters.map((f) => ({ negate: false, ...f }))
      : [{ field: "", operator: "includes", value: "", negate: false }]
  );
  const [status, setStatus] = useState(currentStatus || "");

  // Helper: normalize fields prop to options and a small meta map
  const fieldEntries = useMemo(() => {
    // fields might be an object mapping id -> label OR id -> { label, type }
    return Object.entries(fields || {}).map(([id, value]) => {
      const isString = typeof value === "string";
      const label = isString ? value : value?.label || id;
      const type = isString ? null : value?.type || null;
      // Extract choices/options if provided in field metadata (common keys)
      const rawChoices = isString
        ? null
        : value?.options ||
          value?.choices ||
          value?.values ||
          value?.optionsList ||
          value?.items ||
          null;
      let choices = null;
      if (Array.isArray(rawChoices)) {
        choices = rawChoices.map((c) => {
          if (typeof c === "string") return { value: c, label: c };
          if (c && typeof c === "object")
            return {
              value: c.value ?? c.id ?? c.key ?? c.name ?? String(c),
              label: c.label ?? c.name ?? c.value ?? String(c),
            };
          return { value: String(c), label: String(c) };
        });
      }
      return {
        id,
        label,
        type: type ? String(type).toLowerCase() : null,
        choices,
      };
    });
  }, [fields]);

  const fieldOptions = fieldEntries.map((f) => ({
    value: f.id,
    label: f.label,
  }));

  // Operators per type. Each operator includes whether it needs a value and preferred input type
  const operatorsForType = (type) => {
    // normalize type and common operator sets
    const t = (type || "").toLowerCase();

    const commonText = [
      {
        value: "includes",
        label: "includes",
        needsValue: true,
        inputType: "text",
      },
      { value: "equals", label: "equals", needsValue: true, inputType: "text" },
      {
        value: "not_equals",
        label: "does not equal",
        needsValue: true,
        inputType: "text",
      },
      {
        value: "starts_with",
        label: "starts with",
        needsValue: true,
        inputType: "text",
      },
      {
        value: "ends_with",
        label: "ends with",
        needsValue: true,
        inputType: "text",
      },
      { value: "is_empty", label: "is empty", needsValue: false },
      { value: "is_not_empty", label: "is not empty", needsValue: false },
    ];

    // date/time types
    if (t.includes("date") || t === "time") {
      return [
        {
          value: "before",
          label: "before",
          needsValue: true,
          inputType: "date",
        },
        { value: "on", label: "on", needsValue: true, inputType: "date" },
        { value: "after", label: "after", needsValue: true, inputType: "date" },
        { value: "is_empty", label: "is empty", needsValue: false },
        { value: "is_not_empty", label: "is not empty", needsValue: false },
      ];
    }

    // numeric / price / rating
    if (
      t === "number" ||
      t === "price" ||
      t === "pricefield" ||
      t === "currency" ||
      t === "rating" ||
      t === "scalerating"
    ) {
      return [
        {
          value: "equals",
          label: "equals",
          needsValue: true,
          inputType: "number",
        },
        {
          value: "not_equals",
          label: "does not equal",
          needsValue: true,
          inputType: "number",
        },
        {
          value: "greater_than",
          label: "greater than",
          needsValue: true,
          inputType: "number",
        },
        {
          value: "less_than",
          label: "less than",
          needsValue: true,
          inputType: "number",
        },
        { value: "is_empty", label: "is empty", needsValue: false },
        { value: "is_not_empty", label: "is not empty", needsValue: false },
      ];
    }

    // boolean-like
    if (t === "boolean" || t === "toggle" || t === "checkbox") {
      return [
        { value: "is_true", label: "is true", needsValue: false },
        { value: "is_false", label: "is false", needsValue: false },
      ];
    }

    // multi-select / checkbox group
    if (t === "multiselect" || t === "checkboxgroup" || t === "checkboxes") {
      return [
        {
          value: "contains",
          label: "contains",
          needsValue: true,
          inputType: "text",
        },
        {
          value: "equals",
          label: "equals",
          needsValue: true,
          inputType: "text",
        },
        { value: "is_empty", label: "is empty", needsValue: false },
        { value: "is_not_empty", label: "is not empty", needsValue: false },
      ];
    }

    // picklist single-choice like dropdown or radio
    if (
      t === "dropdown" ||
      t === "radio" ||
      t === "select" ||
      t === "picklist"
    ) {
      return [
        {
          value: "equals",
          label: "equals",
          needsValue: true,
          inputType: "text",
        },
        {
          value: "not_equals",
          label: "does not equal",
          needsValue: true,
          inputType: "text",
        },
        { value: "is_empty", label: "is empty", needsValue: false },
        { value: "is_not_empty", label: "is not empty", needsValue: false },
      ];
    }

    // file / image / signature
    if (
      t === "fileupload" ||
      t === "imageuploader" ||
      t === "signature" ||
      t === "file"
    ) {
      return [
        { value: "has_file", label: "has file", needsValue: false },
        { value: "no_file", label: "does not have file", needsValue: false },
        {
          value: "filename_contains",
          label: "filename contains",
          needsValue: true,
          inputType: "text",
        },
      ];
    }

    // common contact fields (treat as text by default but prefer contains/equals)
    if (
      t === "email" ||
      t === "phone" ||
      t === "fullname" ||
      t === "address" ||
      t === "link"
    ) {
      return [
        {
          value: "contains",
          label: "contains",
          needsValue: true,
          inputType: "text",
        },
        {
          value: "equals",
          label: "equals",
          needsValue: true,
          inputType: "text",
        },
        {
          value: "starts_with",
          label: "starts with",
          needsValue: true,
          inputType: "text",
        },
        { value: "is_empty", label: "is empty", needsValue: false },
        { value: "is_not_empty", label: "is not empty", needsValue: false },
      ];
    }

    // static/display-only fields: default to no operators (fallback to text if needed)
    if (
      t === "heading" ||
      t === "displaytext" ||
      t === "divider" ||
      t === "pagebreak" ||
      t === "section" ||
      t === "formcalculation" ||
      t === "terms"
    ) {
      return commonText;
    }

    // short/long text aliases
    if (
      t === "shorttext" ||
      t === "longtext" ||
      t === "text" ||
      t === "paragraph"
    ) {
      return commonText;
    }

    // fallback
    return commonText;
  };

  // fieldOptions derived above using memo

  const addFilter = () => {
    setFilters([
      ...filters,
      { field: "", operator: "includes", value: "", negate: false },
    ]);
  };

  const removeFilter = (index) => {
    if (filters.length > 1) {
      setFilters(filters.filter((_, i) => i !== index));
    }
  };

  const updateFilter = (index, key, value) => {
    const newFilters = [...filters];
    // If field changed, reset operator/value to sensible defaults for that field type
    if (key === "field") {
      const fieldMeta = fieldEntries.find((f) => f.id === value) || null;
      const ops = operatorsForType(fieldMeta ? fieldMeta.type : null);
      const newOp = ops && ops.length > 0 ? ops[0].value : "includes";
      newFilters[index] = {
        ...newFilters[index],
        field: value,
        operator: newOp,
        value: "",
      };
    } else {
      newFilters[index] = { ...newFilters[index], [key]: value };
    }
    setFilters(newFilters);
  };

  const handleApply = () => {
    const validFilters = filters.filter((f) => {
      if (!f.field) return false;
      // operator metadata to decide if value is required
      const meta = fieldEntries.find((e) => e.id === f.field);
      const ops = operatorsForType(meta ? meta.type : null);
      const opMeta = ops.find((o) => o.value === f.operator);
      if (!opMeta) return false;
      if (opMeta.needsValue)
        return (
          f.value !== undefined &&
          f.value !== null &&
          String(f.value).trim() !== ""
        );
      return true;
    });
    onApplyFilters(validFilters, status);
    onClose();
  };

  // Validation state for UI (true when ready to apply)
  const isValid = useMemo(() => {
    if (!filters || filters.length === 0) return false;
    return filters.every((f) => {
      if (!f.field) return false;
      const meta = fieldEntries.find((e) => e.id === f.field);
      const ops = operatorsForType(meta ? meta.type : null);
      const opMeta = ops.find((o) => o.value === f.operator);
      if (!opMeta) return false;
      if (opMeta.needsValue)
        return (
          f.value !== undefined &&
          f.value !== null &&
          String(f.value).trim() !== ""
        );
      return true;
    });
  }, [filters, fieldEntries]);

  const clearAllFilters = () => {
    setFilters([{ field: "", operator: "includes", value: "" }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Advanced Filters
            </h3>
            <button
              onClick={clearAllFilters}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {/* Status selection (moved here from main header) */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Status</option>
                <option value="Unread">Unread</option>
                <option value="Read">Read</option>
              </select>
            </div>
            {filters.map((filter, index) => (
              <React.Fragment key={index}>
                <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                  {/* Field Selection */}
                  <div className="flex-1">
                    <SelectPicker
                      data={fieldOptions}
                      value={filter.field}
                      onChange={(value) => updateFilter(index, "field", value)}
                      placeholder="Choose a Field"
                      className="w-full"
                      searchable
                      cleanable={false}
                      container={() => document.body}
                    />
                  </div>

                  {/* Operator Selection */}
                  <div className="flex-1">
                    <SelectPicker
                      data={operatorsForType(
                        fieldEntries.find((f) => f.id === filter.field)?.type
                      ).map((o) => ({ value: o.value, label: o.label }))}
                      value={filter.operator}
                      onChange={(value) =>
                        updateFilter(index, "operator", value)
                      }
                      placeholder="Operator"
                      className="w-full"
                      cleanable={false}
                      container={() => document.body}
                    />
                  </div>

                  {/* Value Input (type-aware) */}
                  {(() => {
                    const fieldMeta = fieldEntries.find(
                      (f) => f.id === filter.field
                    );
                    const ops = operatorsForType(
                      fieldMeta ? fieldMeta.type : null
                    );
                    const opMeta = ops.find(
                      (o) => o.value === filter.operator
                    ) || { needsValue: true, inputType: "text" };
                    if (!opMeta.needsValue) return null;
                    const inputType = opMeta.inputType || "text";
                    // If field has choices, render a SelectPicker for value selection
                    if (
                      fieldMeta &&
                      fieldMeta.choices &&
                      fieldMeta.choices.length > 0
                    ) {
                      return (
                        <div className="flex-1">
                          <SelectPicker
                            data={fieldMeta.choices}
                            value={filter.value}
                            onChange={(v) => updateFilter(index, "value", v)}
                            placeholder="Select value"
                            className="w-full"
                            cleanable={false}
                            container={() => document.body}
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="flex-1">
                        <input
                          type={inputType}
                          value={filter.value}
                          onChange={(e) =>
                            updateFilter(index, "value", e.target.value)
                          }
                          placeholder="Enter value"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    );
                  })()}

                  {/* Except toggle */}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center text-sm gap-2">
                      <input
                        type="checkbox"
                        checked={!!filter.negate}
                        onChange={(e) =>
                          updateFilter(index, "negate", e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-gray-600">Except</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFilter(index)}
                      disabled={filters.length === 1}
                      className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400">
                      <Lock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {(() => {
                  const meta = fieldEntries.find((e) => e.id === filter.field);
                  const ops = operatorsForType(meta ? meta.type : null);
                  const opMeta = ops.find((o) => o.value === filter.operator);
                  if (!filter.field) {
                    return (
                      <div className="text-xs text-red-600 mt-1">
                        Please select a field.
                      </div>
                    );
                  }
                  if (
                    opMeta &&
                    opMeta.needsValue &&
                    (!filter.value || String(filter.value).trim() === "")
                  ) {
                    return (
                      <div className="text-xs text-red-600 mt-1">
                        This operator requires a value.
                      </div>
                    );
                  }
                  return null;
                })()}
              </React.Fragment>
            ))}
          </div>

          {/* Add Filter Button */}
          <button
            onClick={addFilter}
            className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add New Filter
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!isValid}
            className={`px-6 py-2 rounded-md font-medium ${
              isValid
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters;
