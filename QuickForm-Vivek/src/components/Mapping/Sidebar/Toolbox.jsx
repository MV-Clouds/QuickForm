// Toolbox.jsx
import React from 'react'
import ActionsSection from './ActionsSection';
import UtilitiesSection from './UtilitiesSection';
import ControlsSection from './ControlsSection';
export default function Toolbox() {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Toolbox</h2>
        
        <ActionsSection />
        <UtilitiesSection />
        <ControlsSection />
      </div>
    </div>
  );
}

