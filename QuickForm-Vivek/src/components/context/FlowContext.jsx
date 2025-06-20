// FlowContext.jsx
import { createContext, useContext, useState } from 'react';

const FlowContext = createContext();

export function FlowProvider({ children }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflows, setWorkflows] = useState([]);

  const addNode = (type, position) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type: 'custom',
      position,
      data: { 
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        description: getDefaultDescription(type)
      }
    };
    setNodes([...nodes, newNode]);
  };

  const updateNodeData = (nodeId, newData) => {
    setNodes(nodes.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
    ));
  };

  const value = {
    nodes,
    edges,
    selectedNode,
    workflows,
    addNode,
    updateNodeData,
    setEdges,
    setSelectedNode,
    saveWorkflow: (name) => {
      const newWorkflow = { name, nodes, edges, createdAt: new Date() };
      setWorkflows([...workflows, newWorkflow]);
    },
    loadWorkflow: (workflow) => {
      setNodes(workflow.nodes);
      setEdges(workflow.edges);
    }
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  return useContext(FlowContext);
}