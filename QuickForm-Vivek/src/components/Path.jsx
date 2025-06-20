import { Handle, Position } from 'reactflow';
import useFlow from '@/components/hooks/useFlow';

export default function PathNode({ id, data, selected }) {
  const { nodes, edges, updateNodeConfig } = useFlow();
  const node = nodes.find(n => n.id === id);
  const branches = node?.data?.config?.branches || [];

  return (
    <div className={`px-6 py-4 rounded-lg border-2 ${selected ? 'border-blue-500' : 'border-gray-300'} bg-white`}>
      <div className="text-center font-medium mb-2">Branch Path</div>
      
      {/* Input handle */}
      <Handle type="target" position={Position.Top} />
      
      {/* Dynamic output handles for each branch */}
      {branches.map((branch, index) => (
        <div key={index} className="relative mb-2">
          <div className="text-xs bg-gray-100 px-2 py-1 rounded inline-block mb-1">
            {branch.name || `Path ${String.fromCharCode(65 + index)}`}
          </div>
          <Handle
            type="source"
            position={Position.Bottom}
            id={`path-${index}`}
            style={{
              left: `${(100 / (branches.length + 1)) * (index + 1)}%`,
              bottom: -8,
              transform: 'translateX(-50%)'
            }}
          />
        </div>
      ))}
    </div>
  );
}