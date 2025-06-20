import { useState } from 'react';
import Modal from './Modal';
import ConditionBuilder from '@/components/Mapping/common/ConditionBuilder';

export default function FilterModal({ isOpen, onClose, nodeId }) {
  const { nodes, updateNodeConfig } = useFlow();
  const node = nodes.find(n => n.id === nodeId);
  
  const [config, setConfig] = useState(node?.data?.config || {
    conditions: [],
    logic: 'AND'
  });

  const handleSave = () => {
    updateNodeConfig(nodeId, config);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Filter Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Conditions
            </label>
            <ConditionBuilder
              conditions={config.conditions}
              logicType={config.logic}
              onChange={(newConditions) => setConfig({...config, conditions: newConditions})}
              onLogicChange={(logic) => setConfig({...config, logic})}
            />
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
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}