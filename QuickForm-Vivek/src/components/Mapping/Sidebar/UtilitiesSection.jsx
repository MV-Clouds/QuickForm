import React from 'react'
import useFlow from '@/components/hooks/useFlow';
export default function UtilitiesSection() {
  const { addNode } = useFlow();

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const utilityNodes = [
    { type: 'formatter', icon: '🧹', color: 'bg-purple-100' },
    { type: 'filter', icon: '🔍', color: 'bg-blue-100' },
    { type: 'condition', icon: '❓', color: 'bg-yellow-100' },
    { type: 'delay', icon: '⏱️', color: 'bg-gray-100' },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Utilities</h3>
      <div className="grid grid-cols-2 gap-2">
        {utilityNodes.map(({ type, icon, color }) => (
          <div
            key={type}
            className={`p-2 border rounded cursor-move flex flex-col items-center ${color} hover:shadow-sm`}
            draggable
            onDragStart={(event) => onDragStart(event, type)}
            onClick={() => addNode(type, { x: 100, y: 100 })}
          >
            <span className="text-lg mb-1">{icon}</span>
            <span className="text-xs text-center capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}