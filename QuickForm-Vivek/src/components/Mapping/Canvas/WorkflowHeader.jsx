import React from 'react'
import  useFlow  from '@/components/hooks/useFlow';
export default function WorkflowHeader({ onSave , handleRunFlow }) {
  const { executeFlow } = useFlow();

  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-900">QuickForm Flow Builder</h1>
        <div className="flex space-x-3">
          <button 
            className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors"
            onClick={onSave}
          >
            Save Workflow
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors" onClick={handleRunFlow}>
            Run Flow
          </button>
        </div>
      </div>
    </header>
  );
}