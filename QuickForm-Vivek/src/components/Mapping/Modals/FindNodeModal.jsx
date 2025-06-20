import { useState } from 'react';
import Modal from './Modal';
import ConditionBuilder from '@/components/Mapping/common/ConditionBuilder';

export default function FindNodeModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialConfig = {} 
}) {
  const [config, setConfig] = useState({
    object: initialConfig.object || '',
    recordLimit: initialConfig.recordLimit || 100,
    conditions: initialConfig.conditions || [],
    outputFields: initialConfig.outputFields || [],
    conditionLogic: initialConfig.conditionLogic || 'AND',
  });

  const availableFields = [
    'Id', 'Name', 'Email', 'Phone', 'Amount', 
    'CreatedDate', 'Status', 'Industry', 'Type'
  ];

  const handleChange = (field, value) => {
    setConfig({
      ...config,
      [field]: value,
    });
  };

  const handleConditionsChange = (newConditions) => {
    setConfig({
      ...config,
      conditions: newConditions,
    });
  };

  const toggleOutputField = (field) => {
    const newOutputFields = config.outputFields.includes(field)
      ? config.outputFields.filter(f => f !== field)
      : [...config.outputFields, field];
    
    setConfig({
      ...config,
      outputFields: newOutputFields,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
        <h2 className="text-xl font-semibold mb-4">Find Node Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salesforce Object
            </label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={config.object}
              onChange={(e) => handleChange('object', e.target.value)}
            >
              <option value="">Select an object</option>
              <option value="Account">Account</option>
              <option value="Contact">Contact</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Lead">Lead</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Record Limit
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              className="w-full border border-gray-300 rounded-md p-2"
              value={config.recordLimit}
              onChange={(e) => handleChange('recordLimit', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conditions
            </label>
            <ConditionBuilder
              conditions={config.conditions}
              onChange={handleConditionsChange}
              logicType={config.conditionLogic}
              onLogicChange={(logic) => handleChange('conditionLogic', logic)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Fields
            </label>
            <div className="border border-gray-200 rounded p-3 max-h-40 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {availableFields.map((field) => (
                  <label key={field} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.outputFields.includes(field)}
                      onChange={() => toggleOutputField(field)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">{field}</span>
                  </label>
                ))}
              </div>
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
            onClick={() => onSave(config)}
            disabled={!config.object}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </Modal>
  );
}