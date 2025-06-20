import { useState } from 'react';
import Modal from './Modal';

const formatOptions = {
  text: [
    { value: 'uppercase', label: 'Uppercase' },
    { value: 'lowercase', label: 'Lowercase' },
    { value: 'capitalize', label: 'Capitalize Words' },
    { value: 'trim', label: 'Trim Whitespace' },
  ],
  number: [
    { value: 'round', label: 'Round' },
    { value: 'ceil', label: 'Round Up' },
    { value: 'floor', label: 'Round Down' },
    { value: 'fixed', label: 'Fixed Decimals' },
  ],
  date: [
    { value: 'format', label: 'Format Date' },
    { value: 'extractYear', label: 'Extract Year' },
    { value: 'extractMonth', label: 'Extract Month' },
  ],
  currency: [
    { value: 'format', label: 'Format Currency' },
    { value: 'convert', label: 'Convert Currency' },
  ],
};

export default function FormatterModal({ isOpen, onClose, onSave, initialConfig }) {
  const [config, setConfig] = useState(initialConfig || {
    field: '',
    dataType: 'text',
    operation: '',
    options: {},
  });

  const handleChange = (field, value) => {
    setConfig({
      ...config,
      [field]: value,
      // Reset operation when data type changes
      ...(field === 'dataType' ? { operation: '', options: {} } : {}),
    });
  };

  const handleOptionChange = (optionField, optionValue) => {
    setConfig({
      ...config,
      options: {
        ...config.options,
        [optionField]: optionValue,
      },
    });
  };

  const renderOptions = () => {
    switch (config.operation) {
      case 'fixed':
        return (
          <div className="mt-2">
            <label className="block text-sm text-gray-600 mb-1">Decimal Places</label>
            <input
              type="number"
              min="0"
              max="10"
              className="border border-gray-300 rounded p-2 w-full"
              value={config.options?.decimals || 2}
              onChange={(e) => handleOptionChange('decimals', e.target.value)}
            />
          </div>
        );
      case 'format':
        if (config.dataType === 'date') {
          return (
            <div className="mt-2">
              <label className="block text-sm text-gray-600 mb-1">Date Format</label>
              <select
                className="border border-gray-300 rounded p-2 w-full"
                value={config.options?.format || 'YYYY-MM-DD'}
                onChange={(e) => handleOptionChange('format', e.target.value)}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="relative">Relative (e.g., 2 days ago)</option>
              </select>
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Formatter Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field to Format</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={config.field}
              onChange={(e) => handleChange('field', e.target.value)}
            >
              <option value="">Select a field</option>
              <option value="name">Name</option>
              <option value="amount">Amount</option>
              <option value="date">Date</option>
              {/* Add more fields as needed */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={config.dataType}
              onChange={(e) => handleChange('dataType', e.target.value)}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="currency">Currency</option>
            </select>
          </div>

          {config.field && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format Operation</label>
              <select
                className="w-full border border-gray-300 rounded-md p-2"
                value={config.operation}
                onChange={(e) => handleChange('operation', e.target.value)}
              >
                <option value="">Select an operation</option>
                {formatOptions[config.dataType]?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {config.operation && renderOptions()}

          {config.operation && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
              <p className="text-sm text-gray-600">
                {generatePreview(config)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => onSave(config)}
            disabled={!config.field || !config.operation}
          >
            Apply Formatting
          </button>
        </div>
      </div>
    </Modal>
  );
}

function generatePreview(config) {
  if (!config.field || !config.operation) return 'Select a field and operation to see preview';

  const examples = {
    text: { input: '  example text  ', output: '' },
    number: { input: '123.456', output: '' },
    date: { input: new Date().toISOString(), output: '' },
    currency: { input: '1234.56', output: '' },
  };

  const example = examples[config.dataType];

  switch (config.operation) {
    case 'uppercase': return `"${example.input}" → "${example.input.toUpperCase().trim()}"`;
    case 'lowercase': return `"${example.input}" → "${example.input.toLowerCase().trim()}"`;
    case 'trim': return `"${example.input}" → "${example.input.trim()}"`;
    case 'fixed': 
      const decimals = config.options?.decimals || 2;
      return `"${example.input}" → "${parseFloat(example.input).toFixed(decimals)}"`;
    case 'format':
      if (config.dataType === 'date') {
        return `"${new Date(example.input).toISOString()}" → Formatted date`;
      }
      return `"${example.input}" → Formatted value`;
    default:
      return `"${example.input}" → Transformed value`;
  }
}