import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow'; 
import 'reactflow/dist/style.css';
import CustomNode from './Node'; // Assuming Node.jsx is in the same directory
import PathNode from '@/components/Path'; // Assuming Path.jsx is in the same directory
import LoopNode from '@/components/Loop'; // Assuming Loop.jsx is in the same directory  
import { useCallback, useMemo } from 'react';
// Define node types outside the component
const nodeTypes = {
  custom: CustomNode,
  path: PathNode,
  loop: LoopNode
};

function FlowCanvas({ onNodeClick }) {
  const { project } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      
      if (typeof type === 'undefined' || !type) return;

      const position = project({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        data: { 
          type,
          label: type.charAt(0).toUpperCase() + type.slice(1),
        }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  const onEdgeUpdate = useCallback(
  (oldEdge, newConnection) => {
    setEdges((eds) => updateEdge(oldEdge, newConnection, eds));
  },
  [setEdges]
);

const isValidConnection = useCallback(
  (connection) => {
    // Prevent invalid connections to path handles
    if (connection.targetHandle && connection.targetHandle.includes('path-')) {
      return false;
    }
    return true;
  },
  []
);

  // Memoize the nodeTypes to prevent recreation on every render
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  return (
    <div 
      className="w-full h-full"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={memoizedNodeTypes}
        onNodeClick={onNodeClick}
          onEdgeUpdate={onEdgeUpdate}
        isValidConnection={isValidConnection}
        connectionMode="strict"
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

// Wrap your FlowCanvas with ReactFlowProvider in App.jsx
export default function FlowCanvasWrapper({ onNodeClick }) {
  return (
    <ReactFlowProvider>
      <FlowCanvas onNodeClick={onNodeClick} />
    </ReactFlowProvider>
  );
}