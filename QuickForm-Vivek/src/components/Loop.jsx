import { Handle, Position } from 'reactflow';
import useFlow from '@/components/hooks/useFlow';

export default function LoopNode({ id, data, selected }) {
  const { updateNodeConfig } = useFlow();
  
  const handleConfigChange = (field, value) => {
    updateNodeConfig(id, {
      ...data.config,
      [field]: value
    });
  };

  return (
    <div className={`px-4 py-3 rounded-lg border ${selected ? 'border-orange-500' : 'border-orange-300'} bg-orange-50`}>
      <div className="font-medium flex items-center justify-between mb-2">
        <span>Loop Over Items</span>
        <span className="text-xs bg-orange-200 px-2 py-1 rounded">LOOP</span>
      </div>
      
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Collection</label>
          <input
            type="text"
            className="w-full text-sm border border-gray-300 rounded p-1"
            value={data.config?.collectionVariable || ''}
            onChange={(e) => handleConfigChange('collectionVariable', e.target.value)}
            placeholder="items"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Batch Size</label>
            <input
              type="number"
              min="1"
              className="w-full text-sm border border-gray-300 rounded p-1"
              value={data.config?.batchSize || 1}
              onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Output As</label>
            <input
              type="text"
              className="w-full text-sm border border-gray-300 rounded p-1"
              value={data.config?.outputVariable || 'item'}
              onChange={(e) => handleConfigChange('outputVariable', e.target.value)}
              placeholder="item"
            />
          </div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} id="loop-body" />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="loop-complete" 
        style={{ right: -5 }}
      />
    </div>
  );
}