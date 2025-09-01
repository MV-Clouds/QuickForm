import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";
import ReactFlow, { useNodesState, useReactFlow, useEdgesState, useViewport, addEdge, ControlButton, Background, Handle, Position } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "react-modal";
import Select from "react-select";
import "reactflow/dist/style.css";
import './Mapping.css';

const CustomControls = ({ handleUndo, handleRedo, canUndo, canRedo }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const getButtonStyle = (canProceed) => ({
    cursor: canProceed ? 'pointer' : 'not-allowed',
    opacity: canProceed ? 1 : 0.5,
  });

  return (
    <div className="react-flow__controls">
      <ControlButton onClick={handleUndo} title="Undo" disabled={!canUndo} style={getButtonStyle(canUndo)}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 18H14.75C16.1424 18 17.4777 17.4469 18.4623 16.4623C19.4469 15.4777 20 14.1424 20 12.75C20 11.3576 19.4469 10.0223 18.4623 9.03769C17.4777 8.05312 16.1424 7.5 14.75 7.5H5M7.5 4L4 7.5L7.5 11" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>

      </ControlButton>
      <ControlButton onClick={handleRedo} title="Redo" disabled={!canRedo} style={getButtonStyle(canRedo)}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 18H9.25C7.85761 18 6.52226 17.4469 5.53769 16.4623C4.55312 15.4777 4 14.1424 4 12.75C4 11.3576 4.55312 10.0223 5.53769 9.03769C6.52226 8.05312 7.85761 7.5 9.25 7.5H19M16.5 4L20 7.5L16.5 11" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>

      </ControlButton>
      <ControlButton onClick={() => zoomIn()} title="Zoom In">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.18549 14.9286C12.3255 14.9286 14.871 12.3702 14.871 9.21429C14.871 6.05837 12.3255 3.5 9.18549 3.5C6.04548 3.5 3.5 6.05837 3.5 9.21429C3.5 12.3702 6.04548 14.9286 9.18549 14.9286Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M10.9621 9.21484H6.91113M19.4999 19.5006L13.3028 13.3508M8.97223 7V11.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>

      </ControlButton>
      <ControlButton onClick={() => zoomOut()} title="Zoom Out">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.68549 15.4286C12.8255 15.4286 15.371 12.8702 15.371 9.71429C15.371 6.55837 12.8255 4 9.68549 4C6.54548 4 4 6.55837 4 9.71429C4 12.8702 6.54548 15.4286 9.68549 15.4286Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M11.9595 9.71484H7.41113M19.9999 20.0006L13.8028 13.8508" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>

      </ControlButton>
      <ControlButton onClick={() => fitView()} title="Fit View">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 9.33333V4H9.33333M14.6667 4H20V9.33333M4 14.6667V20H9.33333M20 14.6667V20H14.6667" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>

      </ControlButton>
    </div>
  );
};

const CustomNode = ({ data, selected, id, onAddAction, edges = [] }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteElements } = useReactFlow();

  const nodeType = data.actionType || data.action || "default";

  // Check if handles are connected
  const hasTopConnection = edges.some(edge => edge.target === id && edge.targetHandle === "top");
  const hasBottomConnection = edges.some(edge => edge.source === id && edge.sourceHandle === "bottom");

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const handleAddTop = (e) => {
    e.stopPropagation();
    // Add logic for adding node above
    console.log("Add node above", id);
  };

  const handleAddBottom = (e) => {
    e.stopPropagation();
    // Add logic for adding node below
    console.log("Add node below", id);
  };

  const getNodeIcon = () => {
    switch (nodeType) {
      case "Condition": 
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 8L3 12L7 16M17 8L21 12L17 16M14 4L10 20" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "Loop": 
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4V10H7M23 20V14H17" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "Formatter":
      case "Filter":
      case "Path":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "Create/Update":
      case "CreateUpdate":
      case "Find":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H9" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 3H21V8" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 15L21 8" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "Google Sheet":
      case "FindGoogleSheet":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8Z" stroke="#0F9D58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="#0F9D58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 13H16" stroke="#0F9D58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 17H16" stroke="#0F9D58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default: 
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="#8B5CF6" strokeWidth="2" fill="none"/>
            <circle cx="9" cy="9" r="2" stroke="#8B5CF6" strokeWidth="2" fill="none"/>
            <path d="M21 15L16 10L5 21" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      draggable={data.draggable !== false}
      className={`relative bg-white border-2 border-gray-200 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg ${data.draggable === false ? "cursor-default" : "cursor-grab"} pointer-events-auto min-w-[180px] p-4 group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Add Button - only show if no connection */}
      {!hasTopConnection && (
        <button
          onClick={handleAddTop}
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gray-300 text-black rounded-full flex items-center justify-center text-sm hover:bg-blue-600 z-10 shadow-md"
        >
          +
        </button>
      )}

      {/* Node Content */}
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {getNodeIcon()}
        </div>
        <div className="flex-1">
          <div className="font-medium text-gray-800 text-sm">
            {nodeType}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {nodeType}
          </div>
        </div>
        {data.type === "loop" && (
          <button
            onClick={() => onAddAction(id)}
            className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-blue-600"
          >
            +
          </button>
        )}
      </div>

      {/* Bottom Add Button - only show if no connection */}
      {!hasBottomConnection && (
        <button
          onClick={handleAddBottom}
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gray-300 text-black rounded-full flex items-center justify-center text-sm hover:bg-blue-600 z-10 shadow-md"
        >
          +
        </button>
      )}

      {/* Delete Button */}
      {(isHovered || selected)  && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={handleDelete}
          className="absolute -top-2 -right-2 bg-gray-300 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 z-10"
          whileHover={{ scale: 1.1 }}
        >
          ×
        </motion.button>
      )}

      {/* Loop Handles */}
      {data.type === "loop" && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="loop"
            className="w-3 h-3 bg-purple-400 right-[-6px] top-1/2 transform -translate-y-1/2 border-2 border-white rounded-full shadow-sm pointer-events-auto"
          />
          <Handle
            type="target"
            position={Position.Right}
            id="loop-back"
            className="w-3 h-3 bg-purple-400 right-[-6px] top-1/3 transform -translate-y-1/2 border-2 border-white rounded-full shadow-sm pointer-events-auto"
          />
        </>
      )}
    </motion.div>
  );
};

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {}, onEdgeSettings }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const path = `M${sourceX},${sourceY} L${targetX},${targetY}`;
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
  };

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
        strokeWidth={isHovered ? "3" : "2"}
        d={path}
        filter={isHovered ? `url(#glow-${id})` : undefined}
      />

      {/* Settings Gear Icon */}
      <AnimatePresence>
        {isHovered && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="cursor-pointer"
            onClick={handleSettingsClick}
          >
            <circle
              cx={midX}
              cy={midY}
              r="12"
              className="fill-white stroke-gray-300 stroke-2 filter drop-shadow-md"
            />
            <g transform={`translate(${midX - 8}, ${midY - 8})`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15A3 3 0 1 0 12 9A3 3 0 0 0 12 15Z" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.4 15A1.65 1.65 0 0 0 18.33 16.5L19.21 18.45A1.65 1.65 0 0 1 18.33 21H5.67A1.65 1.65 0 0 1 4.79 18.45L5.67 16.5A1.65 1.65 0 0 0 4.6 15A1.65 1.65 0 0 0 3 13.35V10.65A1.65 1.65 0 0 0 4.6 9A1.65 1.65 0 0 0 5.67 7.5L4.79 5.55A1.65 1.65 0 0 1 5.67 3H18.33A1.65 1.65 0 0 1 19.21 5.55L18.33 7.5A1.65 1.65 0 0 0 19.4 9A1.65 1.65 0 0 0 21 10.65V13.35A1.65 1.65 0 0 0 19.4 15Z" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </g>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Settings Popup */}
      {showSettings && (
        <foreignObject x={midX + 20} y={midY - 40} width="120" height="80">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm"
          >
            <button
              className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded flex items-center space-x-2"
              onClick={() => {
                console.log("Add condition to edge", id);
                setShowSettings(false);
              }}
            >
              <span>+</span>
              <span>Add</span>
            </button>
            <button
              className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded flex items-center space-x-2 text-red-600"
              onClick={() => {
                console.log("Delete edge", id);
                setShowSettings(false);
              }}
            >
              <span>🗑</span>
              <span>Delete</span>
            </button>
          </motion.div>
        </foreignObject>
      )}
    </g>
  );
};

const FlowDesigner = ({ initialNodes, initialEdges, setSelectedNode, setNodes: setParentNodes, setEdges: setParentEdges }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const orderCounterRef = useRef(1);
  const lastConnectTimeRef = useRef(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loopNodeId, setLoopNodeId] = useState(null);
  const { deleteElements } = useReactFlow();
  const actionOptions = [
    { value: "Create/Update", label: "Create/Update" },
    { value: "Find", label: "Find" },
  ];

  // ## 3. State and refs for undo/redo history
  const [history, setHistory] = useState([{ nodes: initialNodes, edges: initialEdges }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isRestoring = useRef(false);

  // Sync with parent component when initialNodes changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Debounced sync with parent component to avoid excessive updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setParentNodes(nodes);
      setParentEdges(edges);
    }, 100); // Debounce by 100ms

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, setParentNodes, setParentEdges]);

  // 4. Effect to capture changes and update history
  useEffect(() => {
    // If we are restoring from history, don't create a new entry
    if (isRestoring.current) {
      isRestoring.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      const newHistoryEntry = { nodes, edges };
      // Prevent adding duplicate states to history
      if (JSON.stringify(newHistoryEntry.nodes) === JSON.stringify(history[historyIndex].nodes) && JSON.stringify(newHistoryEntry.edges) === JSON.stringify(history[historyIndex].edges)) {
        return;
      }

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newHistoryEntry);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }, 500); // Debounce changes by 500ms

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, history, historyIndex]);

  // ## 5. Undo/Redo handler functions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isRestoring.current = true; // Set flag to prevent new history entry
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setNodes(history[newIndex].nodes);
      setEdges(history[newIndex].edges);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isRestoring.current = true; // Set flag to prevent new history entry
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setNodes(history[newIndex].nodes);
      setEdges(history[newIndex].edges);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Add self-connected edge for loop nodes
  useEffect(() => {
    nodes.forEach((node) => {
      if (node.data.type === "loop") {
        const loopEdge = edges.find(
          (edge) => edge.source === node.id && edge.sourceHandle === "loop" && edge.target === node.id && edge.targetHandle === "loop-back"
        );
        if (!loopEdge) {
          setEdges((eds) => [
            ...eds,
            {
              id: `loop-${node.id}`,
              source: node.id,
              sourceHandle: "loop",
              target: node.id,
              targetHandle: "loop-back",
              type: "default",
              animated: true,
              style: { stroke: "#8b5cf6", strokeWidth: 2 },
            },
          ]);
        }
      }
    });
  }, [nodes, edges, setEdges]);

  // Add delete node function to window
  useEffect(() => {
    window.deleteNode = (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    };
    return () => {
      delete window.deleteNode;
    };
  }, [setNodes, setEdges]);

  const nodesWithDraggable = useMemo(() => nodes.map((node) => ({
    ...node,
    draggable: node.draggable !== false,
  })), [nodes]);

  const debouncedCalculateNodeOrders = useRef(null);

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

    // Create adjacency list for faster traversal
    const adjacencyList = new Map();
    currentNodes.forEach(node => adjacencyList.set(node.id, []));
    currentEdges.forEach(edge => {
      if (adjacencyList.has(edge.source)) {
        adjacencyList.get(edge.source).push(edge.target);
      }
    });

    // Calculate levels using BFS for better performance
    const calculateLevelsBFS = () => {
      const queue = [];
      const inDegree = new Map();

      // Initialize in-degree
      currentNodes.forEach(node => inDegree.set(node.id, 0));
      currentEdges.forEach(edge => {
        if (inDegree.has(edge.target)) {
          inDegree.set(edge.target, inDegree.get(edge.target) + 1);
        }
      });

      // Find nodes with in-degree 0 (start nodes)
      currentNodes.forEach(node => {
        if (inDegree.get(node.id) === 0) {
          queue.push({ nodeId: node.id, level: 1 });
          nodeLevels.set(node.id, 1);
          visited.add(node.id);
        }
      });

      while (queue.length > 0) {
        const { nodeId, level } = queue.shift();
        const children = adjacencyList.get(nodeId) || [];

        for (const childId of children) {
          if (!visited.has(childId)) {
            const currentChildLevel = nodeLevels.get(childId) || 0;
            nodeLevels.set(childId, Math.max(currentChildLevel, level + 1));
            visited.add(childId);
            queue.push({ nodeId: childId, level: level + 1 });
          }
        }
      }
    };

    calculateLevelsBFS();

    visited.clear();
    const assignOrders = (nodeId, targetLevel = null) => {
      if (!nodeId || visited.has(nodeId)) return;
      const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId);
      if (nodeIndex === -1) return;
      const node = updatedNodes[nodeIndex];
      const level = targetLevel !== null ? targetLevel : (nodeLevels.get(nodeId) || 1);
      visited.add(nodeId);

      let order;
      if (nodeOrders.has(nodeId)) {
        order = nodeOrders.get(nodeId);
      } else {
        order = orderCounterRef.current++;
        nodeOrders.set(nodeId, order);
      }

      if (!levelNodeCounts[level]) levelNodeCounts[level] = {};
      const actionKey = node.data.action || "Action";
      levelNodeCounts[level][actionKey] = (levelNodeCounts[level][actionKey] || 0) + 1;
      const index = levelNodeCounts[level][actionKey];

      let label =
        node.data.action === "Condition" ? `Cond_${index}_Level${level}` :
          node.data.action === "Loop" ? `Loop_${index}_Level${level}` :
            node.data.action === "Formatter" ? `Formatter_${index}_Level${level}` :
              node.data.action === "Filter" ? `Filter_${index}_Level${level}` :
                node.data.action === "Path" ? `Path_${index}_Level${level}` :
                  `${node.data.action}${node.data.salesforceObject ? `_${node.data.salesforceObject}` : ''}_${index}_Level${level}`;

      let displayLabel = node.data.action || `Action ${index}`;

      updatedNodes[nodeIndex] = {
        ...node,
        data: { ...node.data, order, label, displayLabel },
      };

      const children = adjacencyList.get(nodeId) || [];
      for (const childId of children) {
        assignOrders(childId);
      }
    };

    // assign orders for all nodes
    for (const node of currentNodes) {
      if (!visited.has(node.id)) {
        assignOrders(node.id);
      }
    }

    return updatedNodes;
  }, []);


  const onConnect = useCallback(
    (params) => {
      const now = Date.now();
      if (now - lastConnectTimeRef.current < 100) {
        return;
      }
      lastConnectTimeRef.current = now;

      const sourceNode = nodes.find((node) => node.id === params.source);
      const targetNode = nodes.find((node) => node.id === params.target);

      if (!sourceNode || !targetNode) {
        alert("Invalid connection: Source or target node not found.");
        return;
      }

      if (params.source === params.target && params.sourceHandle !== "loop") {
        alert("Cannot connect a node to itself.");
        return;
      }

      if (sourceNode.data.action === "Path") {
        const outgoingConditionEdges = edges.filter(
          (edge) => edge.source === params.source && edge.conditionNodeId
        );

        const existingConnection = outgoingConditionEdges.find((edge) => {
          const conditionNode = nodes.find((n) => n.id === edge.target);
          const nextEdge = edges.find((e) => e.source === edge.target && e.target === params.target);
          return conditionNode && nextEdge;
        });

        if (existingConnection) {
          alert("This Path node is already connected to the target node.");
          return;
        }

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

        if (outgoingConditionEdges.length >= 2) {
          alert("Path nodes can have exactly two outgoing connections.");
          return;
        }

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
            conditions: [],
            logicType: "AND", // Initialize logicType
            customLogic: "",
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

        // Batch updates to avoid multiple re-renders
        setNodes((nds) => {
          const updatedNodes = [...nds, newConditionNode];
          setEdges((eds) => {
            const updatedEdges = newEdges.reduce((acc, edge) => addEdge(edge, acc), eds);
            const orderedNodes = calculateNodeOrders(updatedNodes, updatedEdges);
            setNodes(orderedNodes);
            return updatedEdges;
          });
          return updatedNodes;
        });
      } else {
        const hasOutgoingEdge = edges.some(
          (edge) => edge.source === params.source && !edge.conditionNodeId && edge.sourceHandle !== "loop"
        );
        if (hasOutgoingEdge) {
          alert("Each node can have only one outgoing connection, except Path and Loop nodes.");
          return;
        }

        const newEdge = {
          id: `e${params.source}-${params.target}`,
          source: params.source,
          sourceHandle: params.sourceHandle || null,
          target: params.target,
          targetHandle: params.targetHandle || null,
          type: "default",
          animated: params.sourceHandle === "loop",
        };

        // Batch updates to avoid multiple re-renders
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

        // Handle condition node removal for path nodes
        if (edge.conditionNodeId) {
          // Remove all edges connected to the condition node
          newEdges = newEdges.filter((e) =>
            !(e.source === edge.conditionNodeId || e.target === edge.conditionNodeId)
          );
          // Remove the condition node itself
          setNodes((nds) => nds.filter((n) => n.id !== edge.conditionNodeId));
        }

        // Also check if this was a path node connection
        const pathNodeEdge = eds.find(e =>
          e.id === edgeId &&
          nodes.some(n => n.id === e.source && n.data.action === "Path")
        );

        if (pathNodeEdge) {
          // Find and remove any associated condition nodes
          const conditionNodes = nodes.filter(n =>
            n.data.pathNodeId === pathNodeEdge.source &&
            n.data.targetNodeId === pathNodeEdge.target
          );

          conditionNodes.forEach(conditionNode => {
            newEdges = newEdges.filter(e =>
              !(e.source === conditionNode.id || e.target === conditionNode.id)
            );
            setNodes(nds => nds.filter(n => n.id !== conditionNode.id));
          });
        }

        const updatedNodes = calculateNodeOrders(nodes, newEdges);
        setNodes(updatedNodes);
        return newEdges;
      });
    },
    [setEdges, setNodes, nodes, calculateNodeOrders]
  );

  const onNodeClick = useCallback(
    (event, node) => {
      if (["Create/Update", "Find", "Filter", "Condition", "Path", "Loop", "Formatter", 'Google Sheet', 'FindGoogleSheet'].includes(node.data.action)) {
        setSelectedNode(node);
      }
    },
    [setSelectedNode, edges]
  );

  const handleAddAction = (nodeId) => {
    setLoopNodeId(nodeId);
    setIsModalOpen(true);
  };

  const handleAddActionNode = (actionType) => {
    const loopNode = nodes.find((n) => n.id === loopNodeId);
    if (!loopNode) return;

    const randomNum = Math.floor(Math.random() * 10000);
    const nodeName = actionType.toLowerCase().replace("/", "_");
    const newNodeId = `${nodeName}_${randomNum}`;
    const newNode = {
      id: newNodeId,
      type: "custom",
      position: { x: loopNode.position.x + 150, y: loopNode.position.y },
      data: {
        label: `${actionType}_Level0`,
        displayLabel: actionType,
        type: "action",
        action: actionType,
        order: null,
        ...(actionType === "Create/Update" ? {
          enableConditions: false,
          returnLimit: "",
          salesforceObject: "",
          fieldMappings: [],
          conditions: [],
          logicType: "AND",
          customLogic: "",
        } : {}),
        ...(actionType === "Find" ? {
          salesforceObject: "",
          conditions: [],
          returnLimit: "",
          sortField: "",
          sortOrder: "ASC",
          logicType: "AND",
          customLogic: "",
        } : {}),
      },
      draggable: true,
    };

    const newEdges = [
      {
        id: `e${loopNodeId}-${newNodeId}`,
        source: loopNodeId,
        sourceHandle: "loop",
        target: newNodeId,
        targetHandle: null,
        type: "default",
        animated: true,
      },
      {
        id: `e${newNodeId}-${loopNodeId}`,
        source: newNodeId,
        target: loopNodeId,
        targetHandle: "loop-back",
        type: "default",
        animated: true,
      },
    ];

    setNodes((nds) => {
      const updatedNodes = [...nds, newNode];
      setEdges((eds) => {
        const updatedEdges = newEdges.reduce((acc, edge) => addEdge(edge, acc), eds);
        const orderedNodes = calculateNodeOrders(updatedNodes, updatedEdges);
        setNodes(orderedNodes);
        return updatedEdges;
      });
      return updatedNodes;
    });

    setIsModalOpen(false);
    setLoopNodeId(null);
  };

  const nodeTypes = useMemo(() => ({
    custom: (props) => <CustomNode {...props} onAddAction={handleAddAction} />
  }), []);

  const edgeTypes = useMemo(() => ({
    default: (props) => <CustomEdge {...props} onEdgeDelete={onEdgeDelete} />
  }), [onEdgeDelete]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;


  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 z-0" />
      <div ref={reactFlowWrapper} className="w-full h-full relative z-10">
        <ReactFlow
          nodes={nodesWithDraggable}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodesDelete={useCallback((nodesToDelete) => {
            const nodeIds = nodesToDelete.map(n => n.id);
            setEdges(eds => eds.filter(e =>
              !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
            ));
          }, [setEdges])}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}
          className="w-full h-full"
          proOptions={{ hideAttribution: true }}
        >
          <CustomControls
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
          <Background
            gap={24}
            size={1}
            variant="dots"
            className="opacity-100"
          />
        </ReactFlow>
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            width: "400px",
            padding: "20px",
            borderRadius: "8px",
          },
        }}
      >
        <h2 className="text-lg font-semibold mb-4">Add Action to Loop</h2>
        <Select
          options={actionOptions}
          onChange={(selected) => handleAddActionNode(selected.value)}
          placeholder="Select Action Type"
          styles={{
            container: { borderRadius: "0.375rem", borderColor: "#e5e7eb" },
            control: { minHeight: "42px" },
            menu: { zIndex: 9999 },
          }}
        />
        <button
          onClick={() => setIsModalOpen(false)}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
      </Modal>
    </div>
  );
};

export default FlowDesigner;


