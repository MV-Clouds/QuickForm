import { useState } from 'react';
import Modal from './Modal';
import { useFlow } from '@/components/context/FlowContext';

export default function PathModal({ isOpen, onClose, nodeId }) {
  const { nodes, updateNodeConfig } = useFlow();
  const node = nodes.find(n => n.id === nodeId);
  
  const [branches, setBranches] = useState(
    node?.data?.config?.branches || [
      { name: 'Path A', condition: '' },
      { name: 'Path B', condition: '' }
    ]
  );

  const handleSave = () => {
    updateNodeConfig(nodeId, { branches });
    onClose();
  };

  const addBranch = () => {
    setBranches([...branches, { 
      name: `Path ${String.fromCharCode(65 + branches.length)}`, 
      condition: '' 
    }]);
  };

  const removeBranch = (index) => {
    if (branches.length <= 2) return;
    setBranches(branches.filter((_, i) => i !== index));
  };

  const updateBranch = (index, field, value) => {
    const newBranches = [...branches];
    newBranches[index][field] = value;
    setBranches(newBranches);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Path Configuration</h2>
        
        <div className="space-y-4">
          {branches.map((branch, index) => (
            <div key={index} className="border rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">{branch.name}</h3>
                {branches.length > 2 && (
                  <button 
                    onClick={() => removeBranch(index)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Path Name</label>
                  <input
                    type="text"
                    className="w-full text-sm border border-gray-300 rounded p-1"
                    value={branch.name}
                    onChange={(e) => updateBranch(index, 'name', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Condition (optional)</label>
                  <input
                    type="text"
                    className="w-full text-sm border border-gray-300 rounded p-1"
                    value={branch.condition}
                    onChange={(e) => updateBranch(index, 'condition', e.target.value)}
                    placeholder="e.g., status === 'approved'"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={addBranch}
            className="w-full py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-dashed border-gray-300"
          >
            + Add Path
          </button>
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
            Save Paths
          </button>
        </div>
      </div>
    </Modal>
  );
}