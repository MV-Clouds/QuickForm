// ConditionBuilder.jsx
import React, { useState } from 'react';

export default function ConditionBuilder({ conditions, onChange }) {
  const [logicType, setLogicType] = useState('AND');
  const [newCondition, setNewCondition] = useState({
    field: '',
    operator: 'equals',
    value: ''
  });

  const addCondition = () => {
    onChange([...conditions, newCondition]);
    setNewCondition({ field: '', operator: 'equals', value: '' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Logic:</span>
        <select
          className="border border-gray-300 rounded p-1 text-sm"
          value={logicType}
          onChange={(e) => setLogicType(e.target.value)}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      </div>

      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <div key={index} className="flex items-center space-x-2">
            <select
              className="border border-gray-300 rounded p-1 text-sm flex-1"
              value={condition.field}
              onChange={(e) => updateCondition(index, 'field', e.target.value)}
            >
              <option value="">Select field</option>
              {/* Populate with available fields */}
            </select>
            <select
              className="border border-gray-300 rounded p-1 text-sm w-32"
              value={condition.operator}
              onChange={(e) => updateCondition(index, 'operator', e.target.value)}
            >
              <option value="equals">equals</option>
              <option value="notEquals">not equals</option>
              {/* Add more operators */}
            </select>
            <input
              type="text"
              className="border border-gray-300 rounded p-1 text-sm flex-1"
              value={condition.value}
              onChange={(e) => updateCondition(index, 'value', e.target.value)}
            />
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() => removeCondition(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <select
          className="border border-gray-300 rounded p-1 text-sm flex-1"
          value={newCondition.field}
          onChange={(e) => setNewCondition({...newCondition, field: e.target.value})}
        >
          <option value="">Select field</option>
          {/* Populate with available fields */}
        </select>
        <select
          className="border border-gray-300 rounded p-1 text-sm w-32"
          value={newCondition.operator}
          onChange={(e) => setNewCondition({...newCondition, operator: e.target.value})}
        >
          <option value="equals">equals</option>
          <option value="notEquals">not equals</option>
          {/* Add more operators */}
        </select>
        <input
          type="text"
          className="border border-gray-300 rounded p-1 text-sm flex-1"
          value={newCondition.value}
          onChange={(e) => setNewCondition({...newCondition, value: e.target.value})}
        />
        <button
          type="button"
          className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
          onClick={addCondition}
          disabled={!newCondition.field}
        >
          Add
        </button>
      </div>
    </div>
  );
}