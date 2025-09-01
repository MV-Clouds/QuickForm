import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const getOperatorsByType = (type) => {
  switch (type) {
    case "checkbox":
      return [
        { value: "==", label: "equals" },
        { value: "!=", label: "does not equal" },
      ];
    case "number":
      return [
        { value: "==", label: "equals" },
        { value: "!=", label: "does not equal" },
        { value: ">", label: "greater than" },
        { value: "<", label: "less than" },
      ];
    case "shorttext":
    case "longtext":
      return [
        { value: "==", label: "equals" },
        { value: "!=", label: "does not equal" },
        { value: "contains", label: "contains" },
      ];
    default:
      return [
        { value: "==", label: "equals" },
        { value: "!=", label: "does not equal" },
      ];
  }
};

const isValidCustomLogic = (logic, numConditions) => {
  if (!logic || logic.trim() === "") return "Custom logic required";
  if (!/^[\d\s()ANDOR]+$/i.test(logic))
    return "Only numbers, AND, OR, parentheses allowed";

  const tokens = logic
    .toUpperCase()
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .split(/\s+/)
    .filter(Boolean);

  let expectOperand = true;
  let parenCount = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (expectOperand) {
      if (t === "(") {
        parenCount++;
      } else if (/^\d+$/.test(t)) {
        const num = Number(t);
        if (num < 1 || num > numConditions)
          return `Condition index ${num} out of range (1-${numConditions})`;
        expectOperand = false;
      } else {
        return `Unexpected token '${t}' at position ${i + 1}, expected condition index or '('`;
      }
    } else {
      if (t === "AND" || t === "OR") {
        expectOperand = true;
      } else if (t === ")") {
        parenCount--;
        if (parenCount < 0)
          return "Unmatched closing parenthesis in custom logic";
      } else {
        return `Unexpected token '${t}' at position ${i + 1}, expected AND, OR, or ')'`;
      }
    }
  }
  if (expectOperand) return "Expression ends unexpectedly, missing condition index";
  if (parenCount !== 0) return "Unmatched opening parenthesis in custom logic";

  return "";
};

export const ConditionInput = ({
  appendCondition,
  removeCondition,
  conditionFields,
  formFields,
}) => {
  const [pendingRows, setPendingRows] = useState([
    { field: "", operator: "==", value: "" },
  ]);
  console.log('condition fields' , conditionFields)
  const [logicType, setLogicType] = useState("AND");
  const [customLogic, setCustomLogic] = useState("");
  const [logicError, setLogicError] = useState("");
  const fieldRefs = useRef([]);

  const updateRow = (idx, key, val) => {
    setPendingRows((rows) => {
      const newRows = [...rows];
      newRows[idx][key] = val;
      if (key === "field") {
        const ops = getOperatorsByType(
          formFields.find((f) => f.Id === val)?.Field_Type__c
        );
        newRows[idx] = { field: val, operator: ops[0]?.value || "==", value: "" };
      }
      setLogicError("");
      return newRows;
    });
  };

  const addRow = () => {
    setPendingRows((rows) => {
      const updated = [...rows, { field: "", operator: "==", value: "" }];
      setTimeout(() => {
        if (fieldRefs.current[updated.length - 1]) {
          fieldRefs.current[updated.length - 1].focus();
        }
      }, 100);
      setLogicError("");
      return updated;
    });
  };

  const removeRow = (idx) => {
    setPendingRows((rows) => {
      if (rows.length <= 1) return rows;
      const updated = rows.filter((_, i) => i !== idx);
      setLogicError("");
      return updated;
    });
  };

  const logicChange = (val) => {
    setLogicType(val);
    if (val !== "Custom") {
      setCustomLogic("");
      setLogicError("");
    }
  };

  const customLogicChange = (val) => {
    setCustomLogic(val);
    setLogicError("");
  };

  const saveLogicGroup = () => {
    const incomplete = pendingRows.some(
      (r) =>
        !r.field ||
        !r.operator ||
        (formFields.find((f) => f.Id === r.field)?.Field_Type__c === "checkbox"
          ? !(r.value === "true" || r.value === "false")
          : !r.value)
    );
    if (incomplete) {
      setLogicError("Please fill all fields in all conditions.");
      return;
    }
    if (logicType === "Custom") {
      const err = isValidCustomLogic(customLogic, pendingRows.length);
      if (err) {
        setLogicError(err);
        return;
      }
    }
    appendCondition({
      conditions: pendingRows,
      logicType,
      customLogic: logicType === "Custom" ? customLogic : null,
    });
    setPendingRows([{ field: "", operator: "==", value: "" }]);
    setLogicType("AND");
    setCustomLogic("");
    setLogicError("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="border-b border-gray-200 pb-6 bg-white rounded-xl shadow-md p-6 mb-6"
    >
      <div className="mb-2 text-xs text-gray-400">
        Enter details, then click "Save Logic Group"
      </div>
      <form className="condition-group-form flex flex-col gap-6 mb-6" onSubmit={(e) => e.preventDefault()}>
        {pendingRows.map((row, idx) => {
          const fieldObj = formFields.find((f) => f.Id === row.field);
          const ops = getOperatorsByType(fieldObj?.Field_Type__c);
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="flex flex-wrap gap-3 items-end bg-gray-50 p-2 rounded"
            >
              <div className="flex flex-col min-w-[160px]">
                <label className="text-xs font-semibold text-gray-600 mb-1">Field</label>
                <select
                  ref={(el) => (fieldRefs.current[idx] = el)}
                  value={row.field}
                  onChange={(e) => updateRow(idx, "field", e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="">Select field</option>
                  {formFields.map((f) => (
                    <option key={f.Id} value={f.Id}>{f.Name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col min-w-[120px]">
                <label className="text-xs font-semibold text-gray-600 mb-1">Operator</label>
                <select
                  value={row.operator}
                  onChange={(e) => updateRow(idx, "operator", e.target.value)}
                  className="p-2 border rounded"
                >
                  {ops.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col min-w-[140px]">
                <label className="text-xs font-semibold text-gray-600 mb-1">Value</label>
                {fieldObj?.Field_Type__c === "checkbox" ? (
                  <select
                    value={row.value}
                    onChange={(e) => updateRow(idx, "value", e.target.value)}
                    className="p-2 border rounded"
                  >
                    <option value="">Select</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    value={row.value}
                    type={fieldObj?.Field_Type__c === "number" ? "number" : "text"}
                    onChange={(e) => updateRow(idx, "value", e.target.value)}
                    placeholder="Value"
                    className="p-2 border rounded"
                  />
                )}
              </div>
              {pendingRows.length > 1 && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => removeRow(idx)}
                  className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  ×
                </motion.button>
              )}
            </motion.div>
          );
        })}
        <div className="flex gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={addRow}
            className="px-4 py-2 bg-blue-300 text-white rounded shadow hover:bg-blue-500"
          >
            + Add Condition
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveLogicGroup}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded shadow hover:from-blue-600 hover:to-blue-800"
            disabled={
              !pendingRows.every(
                (r) =>
                  r.field &&
                  r.operator &&
                  (formFields.find((f) => f.Id === r.field)?.Field_Type__c === "checkbox"
                    ? r.value === "true" || r.value === "false"
                    : r.value)
              ) || (logicType === "Custom" && logicError)
            }
          >
            Save Logic Group
          </motion.button>
        </div>
        {pendingRows.length > 1 && (
          <div className="flex items-center gap-3 mt-3">
            <label className="text-xs font-bold text-gray-700">Logic Type</label>
            <select
              value={logicType}
              onChange={(e) => logicChange(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
              <option value="Custom">Custom</option>
            </select>
            {logicType === "Custom" && (
              <input
                value={customLogic}
                onChange={(e) => customLogicChange(e.target.value)}
                className="p-2 border rounded min-w-[160px]"
                placeholder={`e.g. 1 OR (2 AND 3)`}
              />
            )}
          </div>
        )}
        {logicType === "Custom" && logicError && (
          <div className="text-xs text-red-500">{logicError}</div>
        )}
      </form>

      {/* Display existing condition groups */}
      <AnimatePresence>
        {conditionFields.length > 0 && (
          <div className="flex flex-col gap-3 mt-2">
            {conditionFields.map((group, gIdx) => (
              <motion.div
                key={gIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="p-3 bg-blue-50 border border-blue-200 rounded shadow flex flex-wrap gap-2 items-center"
              >
                {group.conditions.map((cond, idx) => {
                  const fieldObj = formFields.find((f) => f.Id === cond.field);
                  return (
                    <span
                      key={idx}
                      className="flex items-center gap-1 px-2 py-1 bg-white border rounded-full"
                    >
                      <span className="font-semibold text-blue-800">
                        {fieldObj?.Name || cond.field}
                      </span>
                      <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">
                        {fieldObj?.Field_Type__c || ""}
                      </span>
                      <span className="text-gray-700">{cond.operator}</span>
                      <span className="text-gray-900">{cond.value}</span>
                      <span className="text-xs bg-gray-200 rounded px-1 ml-1">
                        [{idx + 1}]
                      </span>
                    </span>
                  );
                })}
                <span className="ml-1 font-bold">
                  {group.logicType === "Custom"
                    ? `Logic: ${group.customLogic}`
                    : `Logic: ${group.logicType}`}
                </span>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => removeCondition(gIdx)}
                  className="ml-2 px-2 py-2 text-red-500 hover:text-red-700"
                  title="Remove Condition Group"
                >
                  ×
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
