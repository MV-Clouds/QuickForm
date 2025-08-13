import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToggleSwitch from './ToggleSwitch';
import functionData from './functions.json';

const functionCategories = functionData.functionCategories;

// helper function at the top of your file
const getFunctionDetails = (funcName) => {
  if (!funcName || typeof funcName !== 'string') return null;

  const normalized = funcName.toLowerCase();

  // Find the function by key (function name) in the functions object
  const funcKey = Object.keys(functionData.functions).find(
    key => key.toLowerCase() === normalized
  );

  if (!funcKey) return null;

  return {
    name: funcKey,
    ...functionData.functions[funcKey]
  };
};

// Converts the structured formula (array of parts) into a raw string for saving
const convertPartsToRawFormula = (parts) => {
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];

    if (part.type === 'field') {
      result += `{${part.id}}`;
    } else if (part.type === 'function') {
      result += part.value.replace('()', '');
    } else if (part.type === 'parenthesis' && part.value === '(' && i > 0 && parts[i - 1]?.type === 'function') {
      result += '(';
    } else {
      result += part.value;
    }
  }
  return result;
};

// Returns the correct Tailwind CSS classes for a given formula part type
const getPillStyle = (type) => {
  switch (type) {
    case 'field':
      return 'bg-[#03B2E3] text-white';
    case 'function':
      return 'bg-purple-500 text-white';
    case 'operator':
      return 'bg-[#029EC9] text-white';
    case 'number':
    case 'parenthesis':
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

// Update the parseFormulaText function to handle quoted strings
const parseFormulaText = (text, fields, functionCategories) => {
  if (!text.trim()) return [];

  const allFunctions = Object.values(functionCategories)
    .flat()
    .map(f => f.endsWith('()') ? f.slice(0, -2) : f);

  // Updated regex to capture quoted strings and function arguments
  const tokens = text.match(/(\{[^}]+\})|([a-zA-Z_]+)(?=\s*\()|("[^"]*")|('[^']*')|([0-9.]+)|([+\-*/(),\s])/g) || [];

  const parts = [];
  let lastType = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token) continue;

    let currentType = null;
    let currentValue = token;

    if (token.startsWith('{') && token.endsWith('}')) {
      const fieldId = token.substring(1, token.length - 1);
      const field = fields.find(f => f.id === fieldId);
      parts.push({ type: 'field', id: fieldId, label: field?.label || fieldId });
      currentType = 'field';
    }
    else if (allFunctions.some(f => f.toLowerCase() === token.toLowerCase())) {
      const funcName = allFunctions.find(f => f.toLowerCase() === token.toLowerCase()) || token;
      parts.push({ type: 'function', value: funcName });
      currentType = 'function';
    }
    else if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      parts.push({ type: 'string', value: token });
      currentType = 'string';
    }
    else if (!isNaN(parseFloat(token)) && isFinite(token)) {
      parts.push({ type: 'number', value: token });
      currentType = 'number';
    }
    else if (['+', '-', '*', '/'].includes(token)) {
      parts.push({ type: 'operator', value: token });
      currentType = 'operator';
    }
    else if (['(', ')'].includes(token)) {
      parts.push({ type: 'parenthesis', value: token });
      currentType = 'parenthesis';
    }
    else if (token === ',') {
      parts.push({ type: 'comma', value: token });
      currentType = 'comma';
    }

    // Auto-insert + operator when needed
    if (lastType && currentType) {
      const needsOperator = (
        (lastType === 'field' || lastType === 'number' || lastType === 'string' ||
          (lastType === 'parenthesis' && parts[parts.length - 1].value === ')')) &&
        (currentType === 'field' || currentType === 'number' || currentType === 'string' ||
          currentType === 'parenthesis' && token === '(')
      );

      if (needsOperator) {
        parts.splice(parts.length - 1, 0, { type: 'operator', value: '+' });
      }
    }

    lastType = currentType;
  }

  return parts;
};

function FormCalculationWidget({ selectedField, onUpdateField, fields }) {
  const [formulaParts, setFormulaParts] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [showFunctions, setShowFunctions] = useState(false);
  const [showOptionsInterface, setShowOptionsInterface] = useState(false);
  const [decimalPlaces, setDecimalPlaces] = useState(selectedField.decimalPlaces || 2);
  const [ignoreHiddenFields, setIgnoreHiddenFields] = useState(selectedField.ignoreHiddenFields || false);
  const [isReadOnly, setIsReadOnly] = useState(selectedField.isReadOnly || false);

  const fieldsDropdownRef = useRef(null);
  const functionsDropdownRef = useRef(null);
  const textareaRef = useRef(null);

  const disabledFieldTypes = [
    'heading', 'display text', 'divider', 'pagebreak', 'toggle',
    'imageuploader', 'fileupload', 'section', 'formcalculation',
    'signature', 'terms of service'
  ];

  const availableFields = fields?.filter((field) => field.id !== selectedField.id) || [];

  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  useEffect(() => {
    const rawFormula = selectedField?.formula || '';
    if (!rawFormula) {
      setFormulaParts([]);
      setManualInput('');
      return;
    }

    setManualInput(rawFormula);
    const parts = parseFormulaText(rawFormula, fields, functionCategories);
    setFormulaParts(parts);

    if (selectedField.decimalPlaces !== undefined) {
      setDecimalPlaces(selectedField.decimalPlaces);
    }
    if (selectedField.ignoreHiddenFields !== undefined) {
      setIgnoreHiddenFields(selectedField.ignoreHiddenFields);
    }
    if (selectedField.isReadOnly !== undefined) {
      setIsReadOnly(selectedField.isReadOnly);
    }
  }, [selectedField.id, selectedField.formula, fields]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fieldsDropdownRef.current && !fieldsDropdownRef.current.contains(event.target)) setShowFields(false);
      if (functionsDropdownRef.current && !functionsDropdownRef.current.contains(event.target)) setShowFunctions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualInputChange = (e) => {
    const text = e.target.value;
    setManualInput(text);

    // Live validation for function names
    if (text.includes('(')) {
      const funcNameMatch = text.match(/([a-zA-Z_]+)(?=\s*\()/);
      if (funcNameMatch) {
        const inputFuncName = funcNameMatch[1];
        const funcDef = getFunctionDetails(inputFuncName);
        if (!funcDef && inputFuncName) {
          setValidationErrors([`Function "${inputFuncName}" is not defined`]);
        } else {
          setValidationErrors([]);
        }
      }
    }
  };

  const addPartToFormula = (part) => {
    setFormulaParts(prev => {
      const newParts = [...prev, part];
      const newRawFormula = convertPartsToRawFormula(newParts);
      setManualInput(newRawFormula);
      return newParts;
    });
    if (isEditMode) {
      setIsEditMode(false);
    }
  };

  const handleFieldSelect = (field) => {
    addPartToFormula({ type: 'field', id: field.id, label: field.label || field.type });
    setShowFields(false);
  };

  const handleFunctionSelect = (func) => {
    // Remove parentheses if present
    const funcName = func.endsWith('()') ? func.slice(0, -2) : func;

    setFormulaParts(prev => {
      const newParts = [
        ...prev,
        { type: 'function', value: funcName },
        { type: 'parenthesis', value: '(' },
        { type: 'parenthesis', value: ')' }
      ];
      const newRawFormula = convertPartsToRawFormula(newParts);
      setManualInput(newRawFormula);
      return newParts;
    });

    if (isEditMode) {
      setIsEditMode(false);
    }
    setShowFunctions(false);
  };

  const handleOperatorOrNumberSelect = (value, type) => {
    addPartToFormula({ type, value });
  };

  const handleBackspace = () => {
    if (isEditMode) {
      return;
    } else {
      setFormulaParts(prev => {
        const newParts = prev.slice(0, -1);
        const newRawFormula = convertPartsToRawFormula(newParts);
        setManualInput(newRawFormula);
        return newParts;
      });
    }
  };

  const validateFormula = (parts) => {
    const errors = [];
    const warnings = [];
    const availableFieldIds = fields.map(f => f.id);

    // Field type mappings
    const fieldTypeMappings = {
      // Text types
      'shorttext': 'string',
      'fullname': 'string',
      'address': 'string',
      'longtext': 'string',
      'email': 'string',
      'phone': 'string',
      'dropdown': 'string',
      'checkbox': 'string',
      'radio': 'string',
      'picklist': 'string',
      // Numeric types
      'number': 'number',
      'price': 'number',
      // Date/time types
      'date': 'date',
      'datetime': 'date',
      'time': 'time',
      // Boolean
      'toggle': 'boolean',
      // Other types
      'section': null,
      'heading': null,
      'display text': null,
      'divider': null,
      'pagebreak': null,
      'imageuploader': null,
      'fileupload': null,
      'formcalculation': null,
      'signature': null,
      'terms of service': null
    };

    // Field type compatibility - disables incompatible field types
    const getFieldType = (fieldId) => {
      const field = fields.find(f => f.id === fieldId);
      return field ? fieldTypeMappings[field.type] : null;
    };

    const validateExpression = (expressionParts, context = {}) => {
      if (!expressionParts || expressionParts.length === 0) {
        return { type: 'any', valid: true };
      }

      // Handle single part
      if (expressionParts.length === 1) {
        const part = expressionParts[0];

        if (part.type === 'field') {
          if (!availableFieldIds.includes(part.id)) {
            errors.push(`Invalid field reference: "${part.id}" is not present in the form`);
            return { type: 'any', valid: false };
          }

          const fieldType = getFieldType(part.id);
          if (!fieldType) {
            errors.push(`Field type cannot be used in calculations: "${part.id}"`);
            return { type: 'any', valid: false };
          }
          return { type: fieldType, valid: true, value: `{${part.id}}` };
        }

        if (part.type === 'number') return { type: 'number', valid: true, value: part.value };
        if (part.type === 'string') return { type: 'string', valid: true, value: part.value };

        return { type: 'any', valid: true, value: part.value };
      }

      // Handle function calls
      for (let i = 0; i < expressionParts.length; i++) {
        const part = expressionParts[i];

        // Function name validation - checks if functions are defined

        if (part.type === 'function') {
          const funcDef = getFunctionDetails(part.value);
          if (!funcDef) {
            errors.push(`Undefined function: "${part.value}()"`);
            return { type: 'any', valid: false };
          }

          // Find the opening parenthesis
          let j = i + 1;
          while (j < expressionParts.length &&
            !(expressionParts[j].type === 'parenthesis' && expressionParts[j].value === '(')) {
            j++;
          }

          if (j >= expressionParts.length) {
            errors.push(`Missing opening parenthesis for function ${part.value}()`);
            return { type: 'any', valid: false };
          }

          // Parse arguments between parentheses
          let parenDepth = 1;
          let args = [];
          let currentArg = [];
          let isValid = true;

          for (let k = j + 1; k < expressionParts.length && parenDepth > 0; k++) {
            const nextPart = expressionParts[k];

            if (nextPart.type === 'parenthesis' && nextPart.value === '(') {
              parenDepth++;
            }
            else if (nextPart.type === 'parenthesis' && nextPart.value === ')') {
              parenDepth--;
              if (parenDepth === 0) {
                if (currentArg.length > 0) {
                  args.push(currentArg);
                }
                break;
              }
            }
            else if (nextPart.type === 'comma' && parenDepth === 1) {
              if (currentArg.length > 0) {
                args.push(currentArg);
                currentArg = [];
              }
              continue;
            }

            currentArg.push(nextPart);
          }

          // Argument count validation for functions (min/max args)

          if (funcDef.minArgs !== null && args.length < funcDef.minArgs) {
            errors.push(
              `Function ${funcDef.name}() requires at least ${funcDef.minArgs} arguments, ` +
              `but got ${args.length}`
            );
            isValid = false;
          }

          if (funcDef.maxArgs !== null && args.length > funcDef.maxArgs) {
            errors.push(
              `Function ${funcDef.name}() accepts at most ${funcDef.maxArgs} arguments, ` +
              `but got ${args.length}`
            );
            isValid = false;
          }

          // Validate argument types
          const validatedArgs = args.map(arg => {
            const argResult = validateExpression(arg, {
              parentFunc: funcDef.name,
              parentFuncDef: funcDef
            });
            return argResult;
          });

          // Argument type validation for functions
          validatedArgs.forEach((argResult, idx) => {
            const paramIdx = Math.min(idx, funcDef.arguments.length - 1);
            const expectedType = funcDef.arguments[paramIdx]?.type || 'any';

            if (!argResult.valid) {
              isValid = false;
            }
            else if (expectedType !== 'any' && argResult.type !== expectedType) {
              errors.push(
                `Argument ${idx + 1} of ${funcDef.name}() must be ${expectedType}, ` +
                `but got ${argResult.type} from ${argResult.value}`
              );
              isValid = false;
            }
          });

          return {
            type: funcDef.returnType,
            value: `${funcDef.name}(${validatedArgs.map(a => a.value).join(', ')})`,
            valid: isValid,
            funcName: funcDef.name
          };
        }
      }

      // Handle other cases (operators, etc.)
      return { type: 'any', valid: true, value: expressionParts.map(p => p.value).join(' ') };
    };
    // Start validation
    validateExpression(parts);

    // Operator validation - text fields only support '+'
    const textFieldsInFormula = parts
      .filter(part => part.type === 'field')
      .map(part => {
        const fieldType = getFieldType(part.id);
        return fieldType === 'string' ? part.id : null;
      })
      .filter(Boolean);

    if (textFieldsInFormula.length > 0) {
      const invalidOperators = parts.filter(part =>
        part.type === 'operator' && part.value !== '+'
      );

      if (invalidOperators.length > 0) {
        errors.push(
          `Text fields only support the "+" operator. ` +
          `Invalid operators: ${invalidOperators.map(op => op.value).join(', ')}`
        );
      }

    }

    // Consecutive operator detection and Missing operator detection 
    for (let i = 0; i < parts.length - 1; i++) {
      const current = parts[i];
      const next = parts[i + 1];

      if (current.type === 'operator' && next.type === 'operator') {
        errors.push(`Consecutive operators: "${current.value}${next.value}"`);
      }

      const needsOperator =
        (current.type === 'field' || current.type === 'number' || current.type === 'string' ||
          (current.type === 'parenthesis' && current.value === ')')) &&
        (next.type === 'field' || next.type === 'number' || next.type === 'string' ||
          (next.type === 'parenthesis' && next.value === '('));

      if (needsOperator) {
        warnings.push(`Missing operator between "${current.value}" and "${next.value}"`);
      }
    }

    return { errors, warnings };
  };

  const handleSaveFormula = () => {
    const rawFormula = convertPartsToRawFormula(formulaParts);
    const { errors, warnings } = validateFormula(formulaParts);

    setValidationErrors(errors);
    setValidationWarnings(warnings);

    if (errors.length > 0) {
      // Clear invalid formula
      if (errors.some(e => e.includes('Invalid field reference') ||
        e.includes('Function is not defined') ||
        e.includes('Invalid consecutive operators'))) {
        setManualInput('');
        setFormulaParts([]);
      }
      return;
    }

    const fieldReferences = formulaParts
      .filter(p => p.type === 'field')
      .map(p => p.id)
      .filter((id, index, self) => self.indexOf(id) === index);

    onUpdateField(selectedField.id, {
      formula: rawFormula,
      fieldReferences,
      decimalPlaces,
      ignoreHiddenFields,
      isReadOnly
    });
    setShowOptionsInterface(false);
  };

  const handleTextareaBlur = () => {
    // First check if there are any invalid function calls with dot notation
    if (manualInput.includes('".') || manualInput.includes("'.")) {
      setValidationErrors(['Invalid syntax: Use comma (,) to separate function arguments, not dot (.)']);
      setValidationWarnings([]);
      setManualInput('');
      setFormulaParts([]);
      return;
    }

    const parts = parseFormulaText(manualInput, fields, functionCategories);

    // Check if there's any invalid text that wasn't parsed into parts
    const hasInvalidText = manualInput.trim() && parts.length === 0;

    if (hasInvalidText) {
      setValidationErrors(['Invalid formula syntax. Please use valid fields, functions, or operators.']);
      setValidationWarnings([]);
      setManualInput('');
      setFormulaParts([]);
      return;
    }

    const { errors, warnings } = validateFormula(parts);

    setValidationErrors(errors);
    setValidationWarnings(warnings);

    // Only update if there are no critical errors
    if (!errors.some(e => e.includes('Invalid field reference') ||
      e.includes('Function is not defined') ||
      e.includes('Invalid syntax'))) {
      setFormulaParts(parts);
    }

    setIsEditMode(false);
  };

  const handleCalculationAreaClick = () => {
    setIsEditMode(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const length = manualInput.length;
        textareaRef.current.setSelectionRange(length, length);
      }
    }, 0);
  };


  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textareaRef.current?.blur();
    }
  };

  const handleDecimalPlacesChange = (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value)) value = 0;
    value = Math.max(0, Math.min(10, value));
    setDecimalPlaces(value);
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 max-w-md relative overflow-hidden">
      {/* Validation Messages */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Validation errors</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {validationWarnings.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Validation warnings</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {validationWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showOptionsInterface ? (
          // Options Interface with smooth animation
          <motion.div
            key="options"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="space-y-4"
          >
            <div className="flex items-center border-b pb-3">
              <button
                onClick={() => setShowOptionsInterface(false)}
                className="mr-2 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h3 className="text-lg font-medium">Calculation Options</h3>
            </div>

            <div className="space-y-4">
              <div className="mb-4 flex items-center">
                <ToggleSwitch
                  checked={isReadOnly}
                  onChange={(e) => setIsReadOnly(e.target.checked)}
                  id="required-toggle"
                />
                <span className="text-sm font-medium text-gray-700">Result field is read-only</span>
              </div>
              <div className="mb-4 flex items-center">
                <ToggleSwitch
                  checked={ignoreHiddenFields}
                  onChange={(e) => setIgnoreHiddenFields(e.target.checked)}
                  id="required-toggle"
                />
                <span className="text-sm font-medium text-gray-700">Ignore hidden fields</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decimal places</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={decimalPlaces}
                  onChange={handleDecimalPlacesChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSaveFormula}
                className="px-4 py-2 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        ) : (
          // Calculator Interface with smooth animation
          <motion.div
            key="calculator"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >

            {/* Calculation Area */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Area</label>

              {isEditMode ? (
                <textarea
                  ref={textareaRef}
                  value={manualInput}
                  onChange={handleManualInputChange}
                  onBlur={handleTextareaBlur}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="Type your formula manually... e.g., toLowerCase({field-id}) + 5"
                  className="w-full p-3 h-24 border rounded-lg bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none text-sm font-mono"
                />
              ) : (
                <div
                  onClick={handleCalculationAreaClick}
                  className="w-full p-3 h-24 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-text focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400 flex flex-wrap items-start gap-2 overflow-y-auto transition-colors"
                >
                  {formulaParts.length > 0 ? (
                    formulaParts.map((part, index) => (
                      <span key={index} className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center ${getPillStyle(part.type)}`}>
                        {part.label || part.value}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 px-1 py-1">Click here to type or use buttons to build formula...</span>
                  )}
                </div>
              )}
            </div>

            {/* ADD FIELD Button */}
            <div className="mb-4 relative" ref={fieldsDropdownRef}>
              <button
                onClick={() => setShowFields(!showFields)}
                className="w-full px-4 py-2 bg-[#028AB0] text-white rounded-lg hover:bg-[#017393] flex items-center justify-center gap-2 transition-colors"
              >
                <span>+ ADD FIELD</span>
              </button>

              <AnimatePresence>
                {showFields && (
                  <motion.div
                    className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {availableFields.length > 0 ? (
                      availableFields.map((field) => {
                        const isDisabled = disabledFieldTypes.includes(field.type);
                        return (
                          <button
                            key={field.id}
                            onClick={() => !isDisabled && handleFieldSelect(field)}
                            disabled={isDisabled}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${isDisabled
                              ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                              : 'text-gray-700 hover:bg-blue-50'
                              }`}
                          >
                            {field.label || field.type}
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">No other fields available</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Calculator Keypad */}
            <div className="mb-4">
              <div className="grid grid-cols-4 gap-2">
                {['7', '8', '9'].map((char) => (<button key={char} onClick={() => handleOperatorOrNumberSelect(char, 'number')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">{char}</button>))}
                <button onClick={() => handleOperatorOrNumberSelect('/', 'operator')} className="p-3 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors">÷</button>

                {['4', '5', '6'].map((char) => (<button key={char} onClick={() => handleOperatorOrNumberSelect(char, 'number')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">{char}</button>))}
                <button onClick={() => handleOperatorOrNumberSelect('*', 'operator')} className="p-3 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors">×</button>

                {['1', '2', '3'].map((char) => (<button key={char} onClick={() => handleOperatorOrNumberSelect(char, 'number')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">{char}</button>))}
                <button onClick={() => handleOperatorOrNumberSelect('-', 'operator')} className="p-3 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors">-</button>

                {['0', '.'].map((char) => (<button key={char} onClick={() => handleOperatorOrNumberSelect(char, 'number')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">{char}</button>))}
                <button onClick={handleBackspace} disabled={isEditMode} className={`p-3 text-white rounded-lg transition-colors flex items-center justify-center ${isEditMode ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-700 hover:bg-red-800'}`}>←</button>
                <button onClick={() => handleOperatorOrNumberSelect('+', 'operator')} className="p-3 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors">+</button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <button onClick={() => handleOperatorOrNumberSelect('(', 'parenthesis')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">(</button>
                <button onClick={() => handleOperatorOrNumberSelect(')', 'parenthesis')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">)</button>
                <div className="relative" ref={functionsDropdownRef}>
                  <button onClick={() => setShowFunctions(!showFunctions)} className="p-3 w-full bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center transition-colors">
                    <span>f(x)</span>
                  </button>
                  <AnimatePresence>
                    {showFunctions && (
                      <motion.div className="absolute z-10 bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>

                        {Object.entries(functionCategories).map(([category, funcs]) => (
                          <div key={category}>
                            <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                              {category}
                            </div>
                            {funcs.map((func) => {
                              const funcName = func.endsWith('()') ? func.slice(0, -2) : func;
                              return (
                                <button
                                  key={func}
                                  onClick={() => handleFunctionSelect(funcName)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors"
                                >
                                  {funcName}()
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer with Options */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <button
                onClick={() => setShowOptionsInterface(true)}
                className="hover:text-[#029EC9] text-blue-400 text-sm flex items-center gap-1 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Options
              </button>
              <button
                onClick={handleSaveFormula}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center gap-1 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                SAVE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FormCalculationWidget;

