// UpsertModal.jsx
import React, { useState } from 'react';
import Modal from './Modal';
export default function UpsertModal({ isOpen, onClose, onSave }) {
  const [object, setObject] = useState('');
  const [recordLimit, setRecordLimit] = useState(100);
  const [mappings, setMappings] = useState([]);

  const addMapping = () => {
    setMappings([...mappings, { source: '', target: '' }]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
        <h2 className="text-xl font-semibold mb-4">Upsert Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salesforce Object
            </label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={object}
              onChange={(e) => setObject(e.target.value)}
            >
              <option value="">Select an object</option>
              <option value="Account">Account</option>
              <option value="Contact">Contact</option>
              {/* Add more objects */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Record Limit
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-md p-2"
              value={recordLimit}
              onChange={(e) => setRecordLimit(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Field Mappings
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={addMapping}
              >
                + Add Mapping
              </button>
            </div>
            
            <div className="space-y-2">
              {mappings.map((mapping, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Source field"
                    className="flex-1 border border-gray-300 rounded-md p-2"
                    value={mapping.source}
                    onChange={(e) => updateMapping(index, 'source', e.target.value)}
                  />
                  <span className="self-center">→</span>
                  <input
                    type="text"
                    placeholder="Target field"
                    className="flex-1 border border-gray-300 rounded-md p-2"
                    value={mapping.target}
                    onChange={(e) => updateMapping(index, 'target', e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
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
            onClick={() => onSave({ object, recordLimit, mappings })}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}