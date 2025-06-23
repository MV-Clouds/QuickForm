import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";
import ReactFlow, { useNodesState, useEdgesState, addEdge, Controls, Background, Handle } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import "reactflow/dist/style.css";

const CustomNode = ({ data, selected, id }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getNodeStyles = () => {
    const baseStyles = "relative backdrop-blur-sm border-2 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl";

    switch (data.type) {
      case "condition":
        return `${baseStyles} bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-300 hover:border-indigo-400`;
      case "loop":
        return `${baseStyles} bg-gradient-to-br from-violet-50 to-violet-100 border-violet-300 hover:border-violet-400`;
      case "formatter":
        return `${baseStyles} bg-gradient-to-br from-teal-50 to-teal-100 border-teal-300 hover:border-teal-400`;
      case "action":
        return `${baseStyles} bg-gradient-to-br from-rose-50 to-rose-100 border-rose-300 hover:border-rose-400`;
      case "utility":
        return `${baseStyles} bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 hover:border-amber-400`;
      default:
        return `${baseStyles} bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 hover:border-gray-400`;
    }
  };

  const getIconColor = () => {
    switch (data.type) {
      case "condition": return "text-indigo-600";
      case "loop": return "text-violet-600";
      case "formatter": return "text-teal-600";
      case "action": return "text-rose-600";
      case "utility": return "text-amber-600";
      default: return "text-gray-600";
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case "condition": return "🔀";
      case "loop": return "🔄";
      case "formatter": return "🎨";
      case "action": return "⚡";
      case "utility": return "🔧";
      default: return "📋";
    }
  };

  // Don't show icons for start and end nodes
  const shouldShowIcon = id !== "start" && id !== "end";

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      draggable={data.draggable !== false}
      className={`${getNodeStyles()} ${data.draggable === false ? "cursor-default" : "cursor-grab"} pointer-events-auto min-w-[120px] p-4 group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position="top"
        id="top"
        className="w-4 h-4 bg-gradient-to-r from-slate-400 to-slate-500 -top-2 left-1/2 transform -translate-x-1/2 border-2 border-white rounded-full shadow-md pointer-events-auto transition-all duration-200 hover:scale-110"
      />

      {/* Node Content */}
      <div className="flex justify-center items-center space-x-3">
        {shouldShowIcon && (
          <span className={`text-lg ${getIconColor()}`}>{getIcon()}</span>
        )}
        <div className="font-semibold text-slate-700 text-sm leading-tight">
          {data.displayLabel}
        </div>
      </div>

      {/* Hover Effect */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position="bottom"
        id="bottom"
        className="w-4 h-4 bg-gradient-to-r from-slate-400 to-slate-500 -bottom-2 left-1/2 transform -translate-x-1/2 border-2 border-white rounded-full shadow-md pointer-events-auto transition-all duration-200 hover:scale-110"
      />
    </motion.div>
  );
};

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {}, onEdgeDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const path = `M${sourceX},${sourceY} L${targetX},${targetY}`;
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="pointer-events-auto"
    >
      <defs>
        <filter id={`glow-${id}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        id={id}
        style={style}
        className={`react-flow__edge-path fill-none stroke-3 transition-all duration-300 ${isHovered ? 'filter drop-shadow-lg' : ''}`}
        stroke="#64748b"
        strokeWidth={isHovered ? "4" : "2"}
        d={path}
        filter={isHovered ? `url(#glow-${id})` : undefined}
      />

      <AnimatePresence>
        {isHovered && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="cursor-pointer"
            onClick={() => onEdgeDelete(id)}
          >
            <circle
              cx={midX}
              cy={midY}
              r="16"
              className="fill-red-500 stroke-white stroke-2 filter drop-shadow-lg"
            />
            <text
              x={midX}
              y={midY + 5}
              className="fill-white text-center text-sm font-bold"
              textAnchor="middle"
            >
              ×
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
};

const FlowDesigner = ({ initialNodes, initialEdges, setSelectedNode, setNodes: setParentNodes, setEdges: setParentEdges }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const orderCounterRef = useRef(1);
  const lastConnectTimeRef = useRef(0);

  useEffect(() => {
    setParentNodes(nodes);
    setParentEdges(edges);
  }, [nodes, edges, setParentNodes, setParentEdges]);

  // Add delete node function to window for access from CustomNode
  useEffect(() => {
    window.deleteNode = (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    };
    return () => {
      delete window.deleteNode;
    };
  }, [setNodes, setEdges]);

  const nodesWithDraggable = nodes.map((node) => ({
    ...node,
    draggable: node.draggable !== false,
  }));

  const handleNodesChange = useCallback(
    (changes) => {
      const filteredChanges = changes.filter((change) => {
        if (change.type === "position" && change.dragging) {
          const node = nodes.find((n) => n.id === change.id);
          if (node && node.draggable === false) return false;
        }
        return true;
      });
      onNodesChange(filteredChanges);
    },
    [nodes, onNodesChange]
  );

  const calculateNodeOrders = useCallback((currentNodes, currentEdges) => {
    const updatedNodes = [...currentNodes];
    const visited = new Set();
    const nodeOrders = new Map();
    const nodeLevels = new Map();
    orderCounterRef.current = 1;
    const levelNodeCounts = {};

    // First pass: Calculate levels for all nodes
    const calculateLevels = (nodeId, level = 1) => {
      if (!nodeId || visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Set level for current node (use maximum level if already set)
      const currentLevel = nodeLevels.get(nodeId) || 0;
      nodeLevels.set(nodeId, Math.max(currentLevel, level));

      // Process outgoing edges
      const outgoingEdges = currentEdges.filter(edge => edge.source === nodeId);
      
      for (const edge of outgoingEdges) {
        if (edge.target === "end") {
          // Don't process End node yet, just mark its minimum level
          const endCurrentLevel = nodeLevels.get("end") || 0;
          nodeLevels.set("end", Math.max(endCurrentLevel, level + 1));
        } else {
          calculateLevels(edge.target, level + 1);
        }
      }
    };

    // Start level calculation from start node
    const startNode = currentNodes.find(node => node.id === "start");
    if (startNode) {
      visited.clear();
      calculateLevels(startNode.id);
    }

    // Second pass: Assign orders based on levels
    visited.clear();
    const assignOrders = (nodeId, targetLevel = null) => {
      if (!nodeId || visited.has(nodeId)) return;
      
      const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId);
      if (nodeIndex === -1) return;
      
      const node = updatedNodes[nodeIndex];
      const level = targetLevel !== null ? targetLevel : (nodeLevels.get(nodeId) || 1);
      
      visited.add(nodeId);

      // Assign order if not already assigned
      let order;
      if (nodeOrders.has(nodeId)) {
        order = nodeOrders.get(nodeId);
      } else {
        order = orderCounterRef.current++;
        nodeOrders.set(nodeId, order);
      }

      // Track node counts at each level for labeling
      if (!levelNodeCounts[level]) levelNodeCounts[level] = {};
      const actionKey = node.data.action || (node.id === "start" ? "Start" : node.id === "end" ? "End" : "Condition");
      levelNodeCounts[level][actionKey] = (levelNodeCounts[level][actionKey] || 0) + 1;
      const index = levelNodeCounts[level][actionKey];

      // Generate labels
      let label = node.id === "start" ? "Start" :
        node.id === "end" ? "End" :
          node.data.action === "Condition" ? `Cond_${index}_Level${level}` :
            node.data.action === "Loop" ? `Loop_${index}_Level${level}` :
              node.data.action === "Formatter" ? `Formatter_${index}_Level${level}` :
                node.data.action === "Filter" ? `Filter_${index}_Level${level}` :
                  node.data.action === "Path" ? `Path_${index}_Level${level}` :
                    `${node.data.action}${node.data.salesforceObject ? `_${node.data.salesforceObject}` : ''}_${index}_Level${level}`;
      
      let displayLabel = node.data.action || (node.id === "start" ? "Start" : node.id === "end" ? "End" : `Condition ${index}`);

      updatedNodes[nodeIndex] = {
        ...node,
        data: { ...node.data, order, label, displayLabel },
      };

      // Process child nodes, but skip End node for now
      const childEdges = currentEdges.filter(edge => edge.source === nodeId && edge.target !== "end");
      for (const edge of childEdges) {
        assignOrders(edge.target);
      }
    };

    // Process all nodes except End
    assignOrders("start");

    // Process any unvisited nodes (except End)
    for (const node of currentNodes) {
      if (!visited.has(node.id) && node.id !== "end") {
        assignOrders(node.id);
      }
    }

    // Finally, process the End node with the highest level and order
    const endNode = currentNodes.find(node => node.id === "end");
    if (endNode) {
      const endLevel = nodeLevels.get("end") || 1;
      const maxOrder = Math.max(...Array.from(nodeOrders.values()));
      const finalOrder = maxOrder + 1;
      
      if (!levelNodeCounts[endLevel]) levelNodeCounts[endLevel] = {};
      levelNodeCounts[endLevel]["End"] = 1;
      
      const endNodeIndex = updatedNodes.findIndex(n => n.id === "end");
      if (endNodeIndex !== -1) {
        updatedNodes[endNodeIndex] = {
          ...updatedNodes[endNodeIndex],
          data: {
            ...updatedNodes[endNodeIndex].data,
            order: finalOrder,
            label: "End",
            displayLabel: "End",
          },
        };
        nodeOrders.set("end", finalOrder);
      }
    }

    return updatedNodes;
  }, []);

  const onConnect = useCallback(
    (params) => {
      const now = Date.now();
      if (now - lastConnectTimeRef.current < 100) {
        console.log("onConnect skipped due to debounce:", params);
        return;
      }
      lastConnectTimeRef.current = now;

      const sourceNode = nodes.find((node) => node.id === params.source);
      const targetNode = nodes.find((node) => node.id === params.target);

      if (!sourceNode || !targetNode) {
        console.warn("Source or target node not found:", params);
        alert("Invalid connection: Source or target node not found.");
        return;
      }

      // Prevent self-connections
      if (params.source === params.target) {
        console.log("Self-connection blocked:", params);
        alert("Cannot connect a node to itself.");
        return;
      }

      if (params.target === "start") {
        alert("Cannot connect to the Start node.");
        return;
      }

      if (params.source === "end") {
        alert("End node cannot have outgoing connections.");
        return;
      }

      if (sourceNode.data.action === "Path") {
        // Get all outgoing condition edges from the Path node
        const outgoingConditionEdges = edges.filter(
          (edge) => edge.source === params.source && edge.conditionNodeId
        );
        console.log("Outgoing condition edges:", outgoingConditionEdges);

        // Check for existing connection to the target via a condition node
        const existingConnection = outgoingConditionEdges.find((edge) => {
          const conditionNode = nodes.find((n) => n.id === edge.target);
          const nextEdge = edges.find((e) => e.source === edge.target && e.target === params.target);
          return conditionNode && nextEdge;
        });

        if (existingConnection) {
          alert("This Path node is already connected to the target node.");
          return;
        }

        // Check for potential cycles
        const createsCycle = (sourceId, targetId, edges) => {
          const visited = new Set();
          const stack = [targetId];
          while (stack.length > 0) {
            const current = stack.pop();
            if (current === sourceId) return true;
            if (visited.has(current)) continue;
            visited.add(current);
            const outgoing = edges.filter((e) => e.source === current);
            for (const edge of outgoing) {
              stack.push(edge.target);
            }
          }
          return false;
        };

        if (createsCycle(params.source, params.target, edges)) {
          alert("Cannot create a connection that forms a cycle.");
          return;
        }

        // Limit Path nodes to two outgoing condition edges
        if (outgoingConditionEdges.length >= 2) {
          alert("Path nodes can have exactly two outgoing connections.");
          return;
        }

        // Create a new condition node
        const randomNum = Math.floor(Math.random() * 10000);
        const conditionIndex = outgoingConditionEdges.length + 1;
        const conditionNodeId = `${sourceNode.id}_cond_${conditionIndex}_${randomNum}`;
        const midX = (sourceNode.position.x + targetNode.position.x) / 2;
        const midY = (sourceNode.position.y + targetNode.position.y) / 2;
        const sourceLevel = parseInt(sourceNode.data.label.match(/Level(\d+)/)?.[1] || 1);

        const newConditionNode = {
          id: conditionNodeId,
          type: "custom",
          position: { x: midX, y: midY },
          data: {
            label: `Cond_${conditionIndex}_Level${sourceLevel + 1}`,
            displayLabel: `Condition ${conditionIndex}`,
            action: "Condition",
            type: "condition",
            order: null,
            pathNodeId: params.source,
            targetNodeId: params.target,
            pathOption: "Rules",
          },
          draggable: true,
        };

        const newEdges = [
          {
            id: `e${params.source}-${conditionNodeId}`,
            source: params.source,
            target: conditionNodeId,
            type: "default",
            conditionNodeId,
          },
          {
            id: `e${conditionNodeId}-${params.target}`,
            source: conditionNodeId,
            target: params.target,
            type: "default",
            conditionNodeId,
          },
        ];

        // Update nodes and edges atomically
        setNodes((nds) => {
          const updatedNodes = [...nds, newConditionNode];
          setEdges((eds) => {
            const updatedEdges = newEdges.reduce((acc, edge) => addEdge(edge, acc), eds);
            console.log("Updated edges:", updatedEdges);
            const orderedNodes = calculateNodeOrders(updatedNodes, updatedEdges);
            setNodes(orderedNodes);
            return updatedEdges;
          });
          return updatedNodes;
        });
      } else {
        // Non-Path nodes: Allow one outgoing edge
        const hasOutgoingEdge = edges.some(
          (edge) => edge.source === params.source && !edge.conditionNodeId
        );
        if (hasOutgoingEdge) {
          alert("Each node can have only one outgoing connection, except Path nodes.");
          return;
        }

        const newEdge = {
          id: `e${params.source}-${params.target}`,
          source: params.source,
          target: params.target,
          type: "default",
        };

        setEdges((eds) => {
          const updatedEdges = addEdge(newEdge, eds);
          const updatedNodes = calculateNodeOrders(nodes, updatedEdges);
          setNodes(updatedNodes);
          return updatedEdges;
        });
      }
    },
    [edges, setEdges, nodes, setNodes, calculateNodeOrders]
  );

  const onEdgeDelete = useCallback(
    (edgeId) => {
      setEdges((eds) => {
        const edge = eds.find((e) => e.id === edgeId);
        let newEdges = eds.filter((e) => e.id !== edgeId);
        if (edge.conditionNodeId) {
          newEdges = newEdges.filter((e) => e.source !== edge.conditionNodeId && e.target !== edge.conditionNodeId);
          setNodes((nds) => nds.filter((n) => n.id !== edge.conditionNodeId));
        }
        const updatedNodes = calculateNodeOrders(nodes, newEdges);
        setNodes(updatedNodes);
        return newEdges;
      });
    },
    [setEdges, setNodes, nodes, calculateNodeOrders]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow-type");
      const action = event.dataTransfer.getData("application/reactflow-id");
      if (!type || !action) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = { x: event.clientX - reactFlowBounds.left - 50, y: event.clientY - reactFlowBounds.top - 25 };
      const randomNum = Math.floor(Math.random() * 10000);
      const nodeName = action.toLowerCase().replace("/", "_");
      const newNode = {
        id: `${nodeName}_${randomNum}`,
        type: "custom",
        position,
        data: {
          label: `${action}_Level0`,
          displayLabel: action,
          type,
          action,
          order: null,
          ...(type === "action" && action === "Create/Update" ? {
            enableConditions: false,
            returnLimit: "",
            salesforceObject: "",
            fieldMappings: [],
            conditions: []
          } : {}),
          ...(type === "action" && action === "Find" ? {
            salesforceObject: "",
            conditions: [],
            returnLimit: "",
            sortField: "",
            sortOrder: "ASC"
          } : {}),
          ...(type === "action" && action === "Filter" ? {
            salesforceObject: "",
            conditions: [],
            returnLimit: "",
            sortField: "",
            sortOrder: "ASC"
          } : {}),
          ...(type === "utility" && action === "Condition" ? {
            conditions: []
          } : {}),
          ...(type === "utility" && action === "Path" ? { pathOption: "Rules" } : {}),
          ...(type === "utility" && action === "Loop" ? {
            loopConfig: {
              loopCollection: "",
              currentItemVariableName: "",
              maxIterations: "",
              loopVariables: {
                currentIndex: false,
                counter: false,
                indexBase: "0"
              }
            }
          } : {}),
          ...(type === "utility" && action === "Formatter" ? {
            formatterConfig: {
              formatType: "date",
              operation: "",
              inputField: "",
              outputVariable: "",
              options: {}
            }
          } : {}),
        },
        draggable: true,
      };
      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        const recalculatedNodes = calculateNodeOrders(updatedNodes, edges);
        return recalculatedNodes;
      });
    },
    [setNodes, edges, calculateNodeOrders]
  );

  const onNodeClick = useCallback(
    (event, node) => {
      if (node.id !== "start") {
        const hasIncomingEdge = edges.some((edge) => edge.target === node.id);
        if (!hasIncomingEdge) {
          alert("Please connect the node with an incoming edge before configuring it.");
          return;
        }
      }
      if (["Create/Update", "Find", "Filter", "Condition", "Path", "Loop", "Formatter"].includes(node.data.action)) {
        setSelectedNode(node);
      }
    },
    [setSelectedNode, edges]
  );

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ default: (props) => <CustomEdge {...props} onEdgeDelete={onEdgeDelete} /> }), [onEdgeDelete]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 z-0" />

      {/* Flow Container */}
      <div ref={reactFlowWrapper} className="w-full h-full relative z-10">
        <ReactFlow
          nodes={nodesWithDraggable}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}
          className="w-full h-full"
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-2"
            style={{
              button: {
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                margin: '2px',
                transition: 'all 0.2s ease',
                color: '#475569'
              }
            }}
          />
          <Background
            color="#e2e8f0"
            gap={24}
            size={1}
            variant="dots"
            className="opacity-40"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowDesigner;