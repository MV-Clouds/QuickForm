import { useState } from 'react';
import Modal from './Modal';
import  useFlow  from '@/components/hooks/useFlow';
export default function SaveWorkflowModal({ isOpen, onClose }) {
  const [workflowName, setWorkflowName] = useState('');
  const { saveWorkflow } = useFlow();

  const handleSave = () => {
    if (!workflowName.trim()) return;
    
    saveWorkflow(workflowName);
    setWorkflowName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Save Workflow</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Workflow Name
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md p-2"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Enter workflow name"
          />
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
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
              workflowName.trim()
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-blue-400 cursor-not-allowed'
            }`}
            onClick={handleSave}
            disabled={!workflowName.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}