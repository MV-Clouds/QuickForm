import { useState, useCallback } from 'react';

export default function useFlow() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  // Add to your useFlow hook
  const executeFlow = useCallback(async (flowNodes, flowEdges, context = {}) => {
 
  const executeNode = async (nodeId, ctx) => {
    const node = flowNodes.find(n => n.id === nodeId);
    if (!node) return ctx;

    let nextNodes = [];
    let newContext = { ...ctx };

    try {
      switch (node.data.type) {
        case 'path':
          // Evaluate path conditions
          const outgoingEdges = flowEdges.filter(e => e.source === node.id);
          const branchResults = node.data.config?.branches?.map((branch, i) => {
            const edge = outgoingEdges.find(e => e.sourceHandle === `path-${i}`);
            return {
              condition: branch.condition,
              nextNode: edge?.target,
              result: branch.condition 
                ? evaluateCondition(branch.condition, newContext) 
                : true
            };
          });

          // Find first matching path or default to first
          const selectedPath = branchResults?.find(b => b.result) || branchResults?.[0];
          if (selectedPath?.nextNode) {
            nextNodes.push(selectedPath.nextNode);
          }
          break;

        case 'loop':
          const collection = getVariable(node.data.config.collectionVariable, newContext) || [];
          const batchSize = node.data.config.batchSize || 1;
          const outputVar = node.data.config.outputVariable || 'item';

          // Process items in batches
          for (let i = 0; i < collection.length; i += batchSize) {
            const batch = collection.slice(i, i + batchSize);
            newContext = { 
              ...newContext, 
              [outputVar]: batch.length === 1 ? batch[0] : batch 
            };

            // Execute loop body
            const bodyEdge = flowEdges.find(e => 
              e.source === node.id && e.sourceHandle === 'loop-body'
            );
            if (bodyEdge?.target) {
              newContext = await executeNode(bodyEdge.target, newContext);
            }
          }

          // After loop completes
          const completeEdge = flowEdges.find(e => 
            e.source === node.id && e.sourceHandle === 'loop-complete'
          );
          if (completeEdge?.target) {
            nextNodes.push(completeEdge.target);
          }
          break;

        // ... other node types
      }
    } catch (error) {
      console.error(`Error executing node ${node.id}:`, error);
    }

    // Execute next nodes
    for (const nextNodeId of nextNodes) {
      newContext = await executeNode(nextNodeId, newContext);
    }

    return newContext;
  };

  // Start execution from the start node
  const startNode = flowNodes.find(n => n.type === 'input');
  return startNode ? executeNode(startNode.id, context) : context;
}, []);

// Helper function to evaluate conditions
function evaluateCondition(expression, context) {
  try {
    // Simple evaluation - consider using a safe evaluator like expr-eval in production
    const fn = new Function('ctx', `with(ctx) { return ${expression} }`);
    return !!fn(context);
  } catch {
    return false;
  }
}

// Helper to get nested variables
function getVariable(path, context) {
  return path.split('.').reduce((obj, key) => obj?.[key], context);
}
  const addNode = useCallback((type, position) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type: 'custom',
      position,
      data: { 
        type,
        label: getNodeLabel(type),
        description: getNodeDescription(type),
        config: getDefaultConfig(type)
      }
    };
    setNodes(nds => [...nds, newNode]);
    return newNode;
  }, []);

  const updateNodeConfig = useCallback((nodeId, newConfig) => {
    setNodes(nds => nds.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, config: newConfig } } 
        : node
    ));
  }, []);

  const deleteNode = useCallback((nodeId) => {
    setNodes(nds => nds.filter(node => node.id !== nodeId));
    setEdges(eds => eds.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
  }, []);

  const saveWorkflow = useCallback((name) => {
    const newWorkflow = { 
      id: `wf-${Date.now()}`,
      name, 
      nodes, 
      edges, 
      createdAt: new Date().toISOString() 
    };
    setWorkflows(wfs => [...wfs, newWorkflow]);
    return newWorkflow;
  }, [nodes, edges]);

  const loadWorkflow = useCallback((workflow) => {
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
  }, []);

  return {
    nodes,
    edges,
    selectedNode,
    workflows,
    addNode,
    updateNodeConfig,
    deleteNode,
    setEdges,
    setSelectedNode,
    saveWorkflow,
    loadWorkflow,
  };
}

// Helper functions
function getNodeLabel(type) {
  const labels = {
    upsert: 'Upsert Records',
    findNode: 'Find Records',
    formatter: 'Format Data',
    filter: 'Filter Records',
    condition: 'Condition',
    delay: 'Delay',
    path: 'Path',
    loop: 'Loop'
  };
  return labels[type] || type;
}


function getDefaultConfig(type) {
  const configs = {
    upsert: { object: '', recordLimit: 100, mappings: [] },
    findNode: { object: '', recordLimit: 100, conditions: [], outputFields: [] },
    formatter: { field: '', dataType: 'text', operation: '' },
    filter: { conditions: [], logic: 'AND' },
    condition: { expression: '' },
    delay: { duration: 5, unit: 'seconds' },
    path: { branches: [] },
    loop: { collectionVariable: '', batchSize: 1 }
  };
  return configs[type] || {};
}