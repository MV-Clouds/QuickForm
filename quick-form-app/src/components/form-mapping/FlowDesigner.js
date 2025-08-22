import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";
import ReactFlow, { useNodesState,useReactFlow, useEdgesState, addEdge, Controls, Background, Handle, Position } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "react-modal";
import Select from "react-select";
import "reactflow/dist/style.css";

const CustomNode = ({ data, selected, id, onAddAction }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteElements } = useReactFlow();
  
  const nodeType = data.actionType || data.action || "default";

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const getNodeStyles = () => {
    const baseStyles = "relative backdrop-blur-sm border-2 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl";

    switch (nodeType) {
      case "Condition":
        return `${baseStyles} bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-300 hover:border-indigo-400`;
      case "Create/Update":
      case "CreateUpdate":
      case "Find":
        return `${baseStyles} bg-gradient-to-br from-rose-50 to-rose-100 border-rose-300 hover:border-rose-400`;
      case "Formatter":
      case "Filter":
      case "Loop":
      case "Path":
        return `${baseStyles} bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 hover:border-amber-400`;
      default:
        return `${baseStyles} bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 hover:border-gray-400`;
    }
  };

  const getIconColor = () => {
    switch (nodeType) {
      case "Condition": return "text-indigo-600";
      case "Formatter":
      case "Filter":
      case "Loop": 
      case "Path": return "text-amber-600";
      case "Create/Update":
      case "CreateUpdate":
      case "Find": return "text-rose-600";
      default: return "text-gray-600";
    }
  };

  const getIcon = () => {
    switch (nodeType) {
      case "Condition": return "🔀";
      case "Loop": return "🔄";
      case "formatter": return "🎨";
      case "Create/Update":
      case "CreateUpdate":
      case "Find": return "⚡";
      case "Formatter":
      case "Filter": 
      case "Path": return "🔧";
      default: return "📋";
    }
  };

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
        position={Position.Top}
        id="top"
        className="w-4 h-4 bg-gradient-to-r from-slate-400 to-slate-500 -top-2 left-1/2 transform -translate-x-1/2 border-2 border-white rounded-full shadow-md pointer-events-auto transition-all duration-200 hover:scale-110"
      />

      {/* Node Content */}
      <div className="flex justify-between items-center space-x-3">
        <div className="flex justify-center items-center space-x-2">
          {shouldShowIcon && (
            <span className={`text-lg ${getIconColor()}`}>{getIcon()}</span>
          )}
          <div className="font-semibold text-slate-700 text-sm leading-tight">
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
        position={Position.Bottom}
        id="bottom"
        className="w-4 h-4 bg-gradient-to-r from-slate-400 to-slate-500 -bottom-2 left-1/2 transform -translate-x-1/2 border-2 border-white rounded-full shadow-md pointer-events-auto transition-all duration-200 hover:scale-110"
      />

      {(isHovered || selected) && id !== "start" && id !== "end" && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={handleDelete}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 z-10"
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
            className="w-4 h-4 bg-gradient-to-r from-violet-400 to-violet-500 right-[-8px] top-1/2 transform -translate-y-1/2 border-2 border-white rounded-full shadow-md pointer-events-auto transition-all duration-200 hover:scale-110"
          />
          <Handle
            type="target"
            position={Position.Right}
            id="loop-back"
            className="w-4 h-4 bg-gradient-to-r from-violet-400 to-violet-500 right-[-8px] top-1/3 transform -translate-y-1/2 border-2 border-white rounded-full shadow-md pointer-events-auto transition-all duration-200 hover:scale-110"
          />
        </>
      )}
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loopNodeId, setLoopNodeId] = useState(null);
  const { deleteElements } = useReactFlow();
  const actionOptions = [
    { value: "Create/Update", label: "Create/Update" },
    { value: "Find", label: "Find" },
  ];

  useEffect(() => {
    setParentNodes(nodes);
    setParentEdges(edges);
  }, [nodes, edges, setParentNodes, setParentEdges]);


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

    const calculateLevels = (nodeId, level = 1) => {
      if (!nodeId || visited.has(nodeId)) return;
      visited.add(nodeId);
      const currentLevel = nodeLevels.get(nodeId) || 0;
      nodeLevels.set(nodeId, Math.max(currentLevel, level));
      const outgoingEdges = currentEdges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (edge.target === "end") {
          const endCurrentLevel = nodeLevels.get("end") || 0;
          nodeLevels.set("end", Math.max(endCurrentLevel, level + 1));
        } else {
          calculateLevels(edge.target, level + 1);
        }
      }
    };

    const startNode = currentNodes.find(node => node.id === "start");
    if (startNode) {
      visited.clear();
      calculateLevels(startNode.id);
    }

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
      const actionKey = node.data.action || (node.id === "start" ? "Start" : node.id === "end" ? "End" : "Condition");
      levelNodeCounts[level][actionKey] = (levelNodeCounts[level][actionKey] || 0) + 1;
      const index = levelNodeCounts[level][actionKey];

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

      const childEdges = currentEdges.filter(edge => edge.source === nodeId && edge.target !== "end");
      for (const edge of childEdges) {
        assignOrders(edge.target);
      }
    };

    assignOrders("start");
    for (const node of currentNodes) {
      if (!visited.has(node.id) && node.id !== "end") {
        assignOrders(node.id);
      }
    }

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

      if (params.target === "start") {
        alert("Cannot connect to the Start node.");
        return;
      }

      if (params.source === "end") {
        alert("End node cannot have outgoing connections.");
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
            conditions: [],
            logicType: "AND",
            customLogic: "",
          } : {}),
          ...(type === "action" && action === "Find" ? {
            salesforceObject: "",
            conditions: [],
            returnLimit: "",
            sortField: "",
            sortOrder: "ASC",
            logicType: "AND",
            customLogic: "",
          } : {}),
          ...(type === "action" && action === "Filter" ? {
            salesforceObject: "",
            conditions: [],
            returnLimit: "",
            sortField: "",
            sortOrder: "ASC",
            logicType: "AND",
            customLogic: "",
          } : {}),
          ...(type === "utility" && action === "Condition" ? {
            conditions: [],
            logicType: "AND",
            customLogic: "",
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
              },
              exitConditions: [],
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
          ...(type === "integration" && action === 'Google Sheet') ? {   
                label: `${action}_Level0`,
                displayLabel: action,
                type,
                action,
                order: null,
                selectedSheetName: '', // Initialize
                spreadsheetId: '', // Initialize
                sheetConditions: [], // Initialize
                conditionsLogic: 'AND', // Initialize
                sheetcustomLogic: '', // Initialize
                ...(action === "Google Sheet" ? { credentials: null, mappings: [] } : {}),  
              } : {}
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
      if (["Create/Update", "Find", "Filter", "Condition", "Path", "Loop", "Formatter" , 'Google Sheet'].includes(node.data.action)) {
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

  // Validate flow before saving
  const validateFlow = useCallback(() => {
    const actionNodes = nodes.filter(node => !['start', 'end'].includes(node.id));
    if (actionNodes.length === 0) {
      alert("Flow must contain at least one action node.");
      return false;
    }
    return true;
  }, [nodes]);

  const nodeTypes = useMemo(() => ({
    custom: (props) => <CustomNode {...props} onAddAction={handleAddAction} />
  }), []);
  const edgeTypes = useMemo(() => ({
    default: (props) => <CustomEdge {...props} onEdgeDelete={onEdgeDelete} />
  }), [onEdgeDelete]);

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
          onDragOver={onDragOver}
          onDrop={onDrop}
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