import React, { useState } from 'react';

function FormCalculationWidget({ selectedField, onUpdateField, fields }) {
  const [formula, setFormula] = useState(selectedField?.formula || '');
  const [fieldReferences, setFieldReferences] = useState(selectedField?.fieldReferences || []);
  const [showFields, setShowFields] = useState(false);
  const [showFunctions, setShowFunctions] = useState(false);

  const calculableFields = fields?.filter((field) =>
    ['number', 'price'].includes(field.type) && field.id !== selectedField.id
  ) || [];

  const functions = [
    'SUM', 'AVERAGE', 'MIN', 'MAX', // Basic
    'SQRT', 'POWER', 'ABS', 'ROUND', // Advanced
    'IF', 'AND', 'OR', // Conditional
    'TODAY', 'DATEDIFF', 'NOW', // Date/Time
  ];

  // Convert formula to display labels instead of IDs
  const displayFormula = () => {
    let display = formula;
    fields.forEach((field) => {
      const regex = new RegExp(`\\{${field.id}\\}`, 'g');
      const label = field.label || field.type;
      display = display.replace(regex, `{${label}}`);
    });
    return display;
  };

  // Convert display formula back to raw IDs when saving or editing
  const convertToRawFormula = (displayedFormula) => {
    let raw = displayedFormula;
    fields.forEach((field) => {
      const regex = new RegExp(`\\{${field.label || field.type}\\}`, 'g');
      raw = raw.replace(regex, `{${field.id}}`);
    });
    return raw;
  };

  const handleFormulaChange = (value) => {
    const rawFormula = convertToRawFormula(value);
    setFormula(rawFormula);
  };

  const appendToFormula = (value) => {
    setFormula((prev) => prev + value);
  };

  const handleFieldSelect = (fieldId) => {
    if (!fieldReferences.includes(fieldId)) {
      const newReferences = [...fieldReferences, fieldId];
      setFieldReferences(newReferences);
      onUpdateField(selectedField.id, { fieldReferences: newReferences });
    }
    appendToFormula(`{${fieldId}}`);
    setShowFields(false);
  };

  const handleFunctionSelect = (func) => {
    appendToFormula(`${func}(`);
    setShowFunctions(false);
  };

  const handleBackspace = () => {
    setFormula((prev) => prev.slice(0, -1));
  };

  const handleClearFormula = () => {
    setFormula('');
    setFieldReferences([]);
    onUpdateField(selectedField.id, { formula: '', fieldReferences: [] });
  };

  const handleSaveFormula = () => {
    onUpdateField(selectedField.id, { formula, fieldReferences });
  };

  return (
    <div className="mb-4">
      {/* Header Section */}
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-700">Form Calculation Widget</h3>
        <p className="text-sm text-gray-500">Make simple or complex calculations and use them on your forms</p>
      </div>

      {/* Main Workspace */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Area</label>
        <input
          type="text"
          value={displayFormula()}
          onChange={(e) => handleFormulaChange(e.target.value)}
          className="w-full p-2 border rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., {Price} * {Quantity}"
        />
      </div>
      <div className="mb-4 relative">
        <button
          onClick={() => setShowFields(!showFields)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-2"
        >
          ADD FIELD
        </button>
        {showFields && (
          <div className="absolute z-10 bg-white border rounded-lg shadow-lg p-2 w-full max-h-40 overflow-y-auto">
            {calculableFields.length > 0 ? (
              calculableFields.map((field) => (
                <button
                  key={field.id}
                  onClick={() => handleFieldSelect(field.id)}
                  className="block w-full text-left px-2 py-1 text-gray-700 hover:bg-gray-100"
                >
                  {field.label || field.type}
                </button>
              ))
            ) : (
              <p className="text-sm text-gray-500 px-2 py-1">No calculable fields available (add number or price fields).</p>
            )}
          </div>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Calculator Keypad</label>
        <div className="grid grid-cols-4 gap-2">
          {['7', '8', '9', '/'].map((char) => (
            <button
              key={char}
              onClick={() => appendToFormula(char)}
              className={`p-2 rounded ${
                char === '/' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {char}
            </button>
          ))}
          {['4', '5', '6', '*'].map((char) => (
            <button
              key={char}
              onClick={() => appendToFormula(char)}
              className={`p-2 rounded ${
                char === '*' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {char}
            </button>
          ))}
          {['1', '2', '3', '-'].map((char) => (
            <button
              key={char}
              onClick={() => appendToFormula(char)}
              className={`p-2 rounded ${
                char === '-' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {char}
            </button>
          ))}
          {['0', '.', '(', ')'].map((char) => (
            <button
              key={char}
              onClick={() => appendToFormula(char)}
              className={`p-2 rounded ${
                char === '(' || char === ')' || char === '.' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {char}
            </button>
          ))}
          <button
            onClick={() => appendToFormula('+')}
            className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            +
          </button>
          <button
            onClick={handleBackspace}
            className="p-2 rounded bg-red-500 text-white hover:bg-red-600"
          >
            ←
          </button>
          <div className="relative">
            <button
              onClick={() => setShowFunctions(!showFunctions)}
              className="p-2 w-full rounded bg-purple-500 text-white hover:bg-purple-600"
            >
              f(x)
            </button>
            {showFunctions && (
              <div className="absolute z-10 bg-white border rounded-lg shadow-lg p-2 w-full max-h-40 overflow-y-auto">
                {functions.map((func) => (
                  <button
                    key={func}
                    onClick={() => handleFunctionSelect(func)}
                    className="block w-full text-left px-2 py-1 text-gray-700 hover:bg-gray-100"
                  >
                    {func}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => alert('Options not implemented yet')}
          className="text-blue-600 hover:underline text-sm"
        >
          Options
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleSaveFormula}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            SAVE
          </button>
          <button
            onClick={handleClearFormula}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default FormCalculationWidget;