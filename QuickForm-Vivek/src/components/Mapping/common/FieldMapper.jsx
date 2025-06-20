import { useState } from 'react';

export default function FieldMapper({ initialMappings = [], availableFields = [], onChange }) {
  const [mappings, setMappings] = useState(initialMappings.length ? initialMappings : [{ source: '', target: '' }]);

  const addMapping = () => {
    setMappings([...mappings, { source: '', target: '' }]);
  };

  const updateMapping = (index, field, value) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);
    onChange(newMappings);
  };

  const removeMapping = (index) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    setMappings(newMappings.length ? newMappings : [{ source: '', target: '' }]);
    onChange(newMappings.length ? newMappings : [{ source: '', target: '' }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Field Mappings</h3>
        <button
          type="button"
          className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
          onClick={addMapping}
        >
          + Add Mapping
        </button>
      </div>

      <div className="space-y-2">
        {mappings.map((mapping, index) => (
          <div key={index} className="flex items-center space-x-2">
            <select
              className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
              value={mapping.source}
              onChange={(e) => updateMapping(index, 'source', e.target.value)}
            >
              <option value="">Select source field</option>
              {availableFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>

            <span className="text-gray-400">→</span>

            <select
              className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
              value={mapping.target}
              onChange={(e) => updateMapping(index, 'target', e.target.value)}
            >
              <option value="">Select target field</option>
              {availableFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="text-red-500 hover:text-red-700 p-1"
              onClick={() => removeMapping(index)}
              aria-label="Remove mapping"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}