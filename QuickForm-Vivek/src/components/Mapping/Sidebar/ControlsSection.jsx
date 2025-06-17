import  useFlow  from '@/components/hooks/useFlow';
import React from 'react';
export default function ControlsSection() {
  const { addNode } = useFlow();

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const controlNodes = [
    { type: 'path', icon: '↗️', color: 'bg-green-100', label: 'Path' },
    { type: 'loop', icon: '🔄', color: 'bg-orange-100', label: 'Loop' },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Controls</h3>
      <div className="grid grid-cols-2 gap-2">
        {controlNodes.map(({ type, icon, color, label }) => (
          <div
            key={type}
            className={`p-2 border rounded cursor-move flex flex-col items-center ${color} hover:shadow-sm`}
            draggable
            onDragStart={(event) => onDragStart(event, type)}
            onClick={() => addNode(type, { x: 100, y: 100 })}
          >
            <span className="text-lg mb-1">{icon}</span>
            <span className="text-xs text-center">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}