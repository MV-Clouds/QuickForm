import { useState } from 'react';
import Modal from './Modal';
import { useFlow } from '@/components/context/FlowContext';

export default function LoopModal({ isOpen, onClose, nodeId }) {
  const { nodes, updateNodeConfig } = useFlow();
  const node = nodes.find(n => n.id === nodeId);
  
  const [config, setConfig] = useState(node?.data?.config || {
    collectionVariable: '',
    batchSize: 1,
    outputVariable: 'currentItem'
  });

  const handleSave = () => {
    updateNodeConfig(nodeId, config);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Loop Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Variable
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
              value={config.collectionVariable}
              onChange={(e) => setConfig({...config, collectionVariable: e.target.value})}
              placeholder="Enter variable name containing array"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Size
            </label>
            <input
              type="number"
              min="1"
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
              value={config.batchSize}
              onChange={(e) => setConfig({...config, batchSize: parseInt(e.target.value) || 1})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Variable Name
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
              value={config.outputVariable}
              onChange={(e) => setConfig({...config, outputVariable: e.target.value})}
              placeholder="Name for current item variable"
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
            disabled={!config.collectionVariable}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </Modal>
  );
}