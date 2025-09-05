import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from 'react-router-dom';
import { ReactFlowProvider, addEdge } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import FlowDesigner from "./FlowDesigner";
import ActionPanel from "./ActionPanel";
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useSalesforceData } from '../Context/MetadataContext';
import FloatingAddButton from "./FloatingAddButton";
import Loader from '../Loader';

const MappingFields = ({ onSaveCallback }) => {
  const location = useLocation();
  const { formVersionId: urlFormVersionId } = useParams();
  const formVersionId = urlFormVersionId || (location.state?.formVersionId || null);
  const { metadata, formRecords, refreshData } = useSalesforceData();
  const [selectedNode, setSelectedNode] = useState(null);
  const [mappings, setMappings] = useState({});
  const [formFields, setFormFields] = useState([]);
  const [salesforceObjects, setSalesforceObjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [token, setToken] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [nodes, setNodes] = useState([]); // Initialize empty to avoid premature rendering
  const [edges, setEdges] = useState([]);
  const tokenRef = useRef(null);
  const [googleSheetConfig, setGoogleSheetConfig] = useState(null);
  const orderCounterRef = useRef(1);
  const reactFlowWrapperRef = useRef(null);
  const [addButtonPosition, setAddButtonPosition] = useState({ x: 0, y: 0 });
  const initialNodes = [];
  const initialEdges = [];

  // Calculate center position on mount and resize
  useEffect(() => {
    const updateButtonPosition = () => {
      if (reactFlowWrapperRef.current) {
        const rect = reactFlowWrapperRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        setAddButtonPosition({
          x: centerX - 24, // Half of button width (48px)
          y: centerY - 24  // Half of button height (48px)
        });
      }
    };

    // Initial position calculation
    updateButtonPosition();

    // Update position on window resize
    window.addEventListener('resize', updateButtonPosition);

    return () => {
      window.removeEventListener('resize', updateButtonPosition);
    };
  }, []);


  const fetchGoogleSheetCredentials = async (token) => {
    try {
      const response = await fetch("fetchcustomsetting/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch Google Sheet credentials.");
      }

      const data = await response.json();
      return data.credentials; // Assuming the API returns credentials in this format
    } catch (error) {
      console.error("Error fetching Google Sheet credentials:", error);
      return null;
    }
  };
  const handleGoogleSheetConfig = async (nodeId) => {
    if (!token) {
      showToast("User not authenticated. Please log in again.", "error");
      return;
    }

    const credentials = await fetchGoogleSheetCredentials(token);
    if (!credentials) {
      showToast("Failed to fetch Google Sheet credentials.", "error");
      return;
    }

    setGoogleSheetConfig({ nodeId, credentials });
  };

  const showToast = (message, type = 'error') => {
    setSaveError({ message, type });
    setTimeout(() => {
      setSaveError(null);
    }, 5000);
  };

  // Initialize Salesforce objects from metadata
  useEffect(() => {
    if (metadata && metadata.length > 0) {
      console.log('metadata  ', metadata);

      const objects = metadata.map(obj => ({
        name: obj.name,
        label: obj.label,
        fields: [],
        fieldDetails: []
      }));
      setSalesforceObjects(objects);
    }
  }, [metadata]);

  // Initialize form fields from formRecords
  useEffect(() => {
    if (formVersionId && formRecords && formRecords.length > 0) {
      const formVersion = formRecords
        .flatMap(form => form.FormVersions || [])
        .find(version => version.Id === formVersionId);

      if (formVersion && formVersion.Fields) {
        const normalizedFields = formVersion.Fields.reduce((acc, field) => {
          const properties = field.Properties__c ? JSON.parse(field.Properties__c) : {};
          const baseField = {
            id: field.Id || field.id || `field_${field.Name || field.name}`,
            name: field.Name || field.name || field.label || "Unknown",
            type: field.Field_Type__c || field.type,
            Properties__c: field.Properties__c || '{}',
            Unique_Key__c: field.Unique_Key__c || field.id,
            parentFieldId: null, // No parent for top-level fields
          };

          // Add the parent field to the accumulator
          acc.push(baseField);

          // Check for subFields and add them as separate entries
          if (properties.subFields && typeof properties.subFields === 'object') {
            Object.entries(properties.subFields).forEach(([subFieldKey, subFieldData]) => {
              const subField = {
                id: subFieldData.id || `${baseField.id}_${subFieldKey}`,
                name: subFieldData.label || subFieldKey,
                type: subFieldData.type || baseField.type, // Inherit type if not specified
                Properties__c: JSON.stringify(subFieldData),
                Unique_Key__c: subFieldData.id || `${baseField.Unique_Key__c}_${subFieldKey}`,
                parentFieldId: baseField.id, // Reference to parent field
              };
              acc.push(subField);
            });
          }

          return acc;
        }, []);
        setFormFields(normalizedFields);
      } else {
        console.warn('Form version not found or has no fields');
      }
    }
  }, [formVersionId, formRecords]);

  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    if (userId && instanceUrl && !token) {
      fetchAccessToken(userId, instanceUrl);
    }
  }, [token]);

  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    if (userId && instanceUrl && (!formRecords || formRecords.length === 0)) {
      refreshData();
    }
  }, []);


  const setNodeLabel = React.useCallback((nodeId, newLabel) => {
    setNodes(nds =>
      nds.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n))
    );
  }, [setNodes]);


  const fetchAccessToken = async (userId, instanceUrl, retries = 2) => {
    try {
      const url = process.env.REACT_APP_GET_ACCESS_TOKEN_URL || "https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/prod/getAccessToken";
      if (!url) throw new Error("Access token URL is not defined.");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, instanceUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 && retries > 0) return await fetchAccessToken(userId, instanceUrl, retries - 1);
        throw new Error(data.error || `Failed to fetch access token: ${response.status}`);
      }
      if (!data.access_token) throw new Error("No access token returned in response");
      setToken(data.access_token);
      return data.access_token;
    } catch (error) {
      showToast(`Failed to fetch access token: ${error.message}. Please verify your Salesforce credentials or contact support.`, 'error');
      return null;
    }
  };

  const fetchSalesforceFields = async (objectName) => {
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      console.log('userId:', userId, 'instanceUrl:', instanceUrl, 'token:', token);
      if (!token || !instanceUrl || !userId) {
        throw new Error('User not authenticated or instance URL missing');
      }

      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
      const response = await fetch(process.env.REACT_APP_FETCH_FIELDS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: cleanedInstanceUrl,
          objectName,
          access_token: token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch fields for ${objectName}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      showToast(`Failed to fetch fields: ${error.message}`, 'error');
      return { fields: [] };
    }
  };

  const calculateNodeOrders = useCallback((currentNodes, currentEdges) => {
    // Build graph ignoring loop self-edges to avoid skewed ordering
    const updatedNodes = [...currentNodes];
    const idToIndex = new Map();
    updatedNodes.forEach((n, i) => idToIndex.set(n.id, i));

    const filteredEdges = currentEdges.filter(
      (e) => e.source !== e.target && e.sourceHandle !== "loop" && e.targetHandle !== "loop-back"
    );

    const adjacency = new Map();
    const inDegree = new Map();
    currentNodes.forEach((n) => {
      adjacency.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    filteredEdges.forEach((e) => {
      if (adjacency.has(e.source) && inDegree.has(e.target)) {
        adjacency.get(e.source).push(e.target);
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      }
    });

    // Priority based on on-screen position: top-to-bottom then left-to-right
    const sortByPosition = (a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x);

    const queue = currentNodes
      .filter((n) => (inDegree.get(n.id) || 0) === 0)
      .sort(sortByPosition);

    const visited = new Set();
    const nodeOrders = new Map();
    orderCounterRef.current = 1;

    // Count per action for display labels
    const actionCounts = {};
    const nextDisplayLabel = (node) => {
      const actionKey = node.data.action || "Action";
      actionCounts[actionKey] = (actionCounts[actionKey] || 0) + 1;
      return node.data.displayLabel || node.data.action || `Action ${actionCounts[actionKey]}`;
    };

    // Kahn's algorithm
    while (queue.length) {
      const node = queue.shift();
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      const order = orderCounterRef.current++;
      nodeOrders.set(node.id, order);

      const idx = idToIndex.get(node.id);
      const displayLabel = nextDisplayLabel(updatedNodes[idx]);
      updatedNodes[idx] = {
        ...updatedNodes[idx],
        data: { ...updatedNodes[idx].data, order, displayLabel },
      };

      const children = adjacency.get(node.id) || [];
      for (const childId of children) {
        inDegree.set(childId, (inDegree.get(childId) || 1) - 1);
        if ((inDegree.get(childId) || 0) === 0) {
          const childNode = currentNodes.find((n) => n.id === childId);
          if (childNode) {
            queue.push(childNode);
            queue.sort(sortByPosition);
          }
        }
      }
    }

    // Remaining nodes (disconnected or in cycles) by position
    const remaining = currentNodes
      .filter((n) => !visited.has(n.id))
      .sort(sortByPosition);

    for (const node of remaining) {
      const order = orderCounterRef.current++;
      nodeOrders.set(node.id, order);
      const idx = idToIndex.get(node.id);
      const displayLabel = nextDisplayLabel(updatedNodes[idx]);
      updatedNodes[idx] = {
        ...updatedNodes[idx],
        data: { ...updatedNodes[idx].data, order, displayLabel },
      };
    }

    return updatedNodes;
  }, []);
  
  const saveAllConfiguration = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    const flowId = formVersionId;

    if (!userId || !instanceUrl || !flowId) {
      showToast("Missing userId, instanceUrl, or flowId. Please log in again.", 'error');
      setIsSaving(false);
      return;
    }

    if (!token) {
      const newToken = await fetchAccessToken(userId, instanceUrl);
      if (!newToken) {
        setIsSaving(false);
        return;
      }
      setToken(newToken);
    }

    if (nodes.length > 1) {
      for (const node of nodes) {
        const isConnected = edges.some(
          (edge) => edge.source === node.id || edge.target === node.id
        );
        if (!isConnected) {
          showToast(
            `Node ${node.data.displayLabel} is not connected. Please connect all nodes before saving.`,
            'error'
          );
          setIsSaving(false);
          return;
        }
      }
    }

    // Recalculate node orders just before saving to ensure correctness
    const recalculatedNodes = calculateNodeOrders(nodes, edges);
    setNodes(recalculatedNodes);
    const nodesForSave = recalculatedNodes;

    // Build order map to guarantee sequential topological order for save payload
    const buildOrderMap = (ns, es) => {
      const filtered = es.filter((e) => e.source !== e.target && e.sourceHandle !== 'loop' && e.targetHandle !== 'loop-back');
      const adj = new Map();
      const indeg = new Map();
      ns.forEach(n => { adj.set(n.id, []); indeg.set(n.id, 0); });
      filtered.forEach(e => {
        if (adj.has(e.source) && indeg.has(e.target)) {
          adj.get(e.source).push(e.target);
          indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
        }
      });
      const sortByPos = (a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x);
      const q = ns.filter(n => (indeg.get(n.id) || 0) === 0).sort(sortByPos);
      const orderMap = new Map();
      let counter = 1;
      const visited = new Set();
      while (q.length) {
        const node = q.shift();
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        orderMap.set(node.id, counter++);
        const children = adj.get(node.id) || [];
        for (const c of children) {
          indeg.set(c, (indeg.get(c) || 1) - 1);
          if ((indeg.get(c) || 0) === 0) {
            const childNode = ns.find(n => n.id === c);
            if (childNode) { q.push(childNode); q.sort(sortByPos); }
          }
        }
      }
      const remaining = ns.filter(n => !visited.has(n.id)).sort(sortByPos);
      for (const n of remaining) orderMap.set(n.id, counter++);
      return orderMap;
    };
    const orderMap = buildOrderMap(nodesForSave, edges);

    const allMappings = [];
    let maxOrder = 0;
    console.log('nodes==> ', nodesForSave);

    for (const node of nodesForSave) {
      const nodeMapping = mappings[node.id] || {};
      const incomingEdge = edges.find((e) => e.target === node.id);
      const outgoingEdges = edges.filter((e) => e.source === node.id);
      const previousNodeId = incomingEdge?.source;
      const nextNodeIds = outgoingEdges.map((e) => e.target).filter((id, index, self) => self.indexOf(id) === index);

      console.log('nodeMapping:', nodeMapping);

      let actionType = nodeMapping.actionType || node.data.action;
      if (actionType === "Create/Update") actionType = "CreateUpdate";
      else if (actionType === "Find") actionType = "Find";
      else if (actionType === "Filter") actionType = "Filter";
      else if (actionType === "Path") actionType = "Path";
      else if (actionType === "Loop") actionType = "Loop";
      else if (actionType === "Formatter") actionType = "Formatter";
      else if (actionType === "Condition") actionType = "Condition";
      else if (!actionType) actionType = node.data.action || "Unknown";

      const computedOrder = orderMap.get(node.id);
      const order = (computedOrder != null ? computedOrder : ++maxOrder);
      maxOrder = Math.max(maxOrder, order);

      const mappingData = {
        nodeId: node.id,
        actionType,
        salesforceObject:
          actionType === "CreateUpdate" ||
            actionType === "Find" ||
            actionType === "Filter" ||
            (actionType === "Condition" && nodeMapping.pathOption === "Rules")
            ? nodeMapping.salesforceObject || ""
            : "",
        fieldMappings: actionType === "CreateUpdate" || actionType === 'Google Sheet' ? nodeMapping.fieldMappings || [] : [],
        conditions:
          actionType === "Find" ||
            actionType === "Filter" ||
            (actionType === "CreateUpdate" && nodeMapping.enableConditions) ||
            (actionType === "Condition" && nodeMapping.pathOption === "Rules")
            ? nodeMapping.conditions || []
            : [],
        logicType:
          (actionType === "Find" ||
            actionType === "Filter" ||
            (actionType === "CreateUpdate" && nodeMapping.enableConditions) ||
            (actionType === "Condition" && nodeMapping.pathOption === "Rules"))
            ? nodeMapping.logicType || "AND"
            : null,
        customLogic: nodeMapping.logicType === "Custom" ? nodeMapping.customLogic || "" : "",
        loopConfig: actionType === "Loop" ? {
          ...nodeMapping.loopConfig,
          exitConditions: nodeMapping.loopConfig?.exitConditions || [],
          logicType: nodeMapping.loopConfig?.logicType || "AND",
          customLogic: nodeMapping.loopConfig?.logicType === "Custom" ? nodeMapping.loopConfig?.customLogic || "" : "",
        } : undefined,
        formatterConfig: actionType === "Formatter" ? nodeMapping.formatterConfig || {} : undefined,
        enableConditions: actionType === "CreateUpdate" ? nodeMapping.enableConditions || false : undefined,
        returnLimit: actionType === "Find" || actionType === "Filter" ? nodeMapping.returnLimit || "" : undefined,
        sortField: actionType === "Find" || actionType === "Filter" ? nodeMapping.sortField || "" : undefined,
        sortOrder: actionType === "Find" || actionType === "Filter" ? nodeMapping.sortOrder || "ASC" : undefined,
        pathOption: actionType === "Condition" ? nodeMapping.pathOption || "Rules" : undefined,
        storeAsContentDocument: actionType === "CreateUpdate" ? nodeMapping.storeAsContentDocument || false : undefined,
        selectedFileUploadFields: actionType === "CreateUpdate" ? nodeMapping.selectedFileUploadFields || [] : [],
        nextNodeIds,
        previousNodeId,
        label: node.data.label,
        order,
        formVersionId,
      };
      if (actionType === 'Google Sheet') {
        mappingData.selectedSheetName = nodeMapping.selectedSheetName || '';
        mappingData.spreadsheetId = nodeMapping.spreadsheetId || '';
        mappingData.sheetConditions = nodeMapping.sheetConditions || [];
        mappingData.conditionsLogic = nodeMapping.conditionsLogic || 'AND';
        mappingData.sheetcustomLogic = nodeMapping.sheetcustomLogic || '';
        mappingData.updateMultiple = nodeMapping.updateMultiple || false;
      } else if (actionType === 'FindGoogleSheet') {
        mappingData.findSheetConditions = nodeMapping.findSheetConditions || [];
        mappingData.googleSheetReturnLimit = nodeMapping.googleSheetReturnLimit || '';
        mappingData.googleSheetSortField = nodeMapping.googleSheetSortField || '';
        mappingData.googleSheetSortOrder = nodeMapping.googleSheetSortOrder || 'ASC';
        mappingData.updateMultiple = nodeMapping.updateMultiple || false;
        mappingData.findNodeName = nodeMapping.findNodeName || '';
        mappingData.spreadsheetId = nodeMapping.spreadsheetId || '';
        mappingData.sheetColumns = nodeMapping.sheetColumns || []; // Add columns to mappingData
      }

      allMappings.push(mappingData);
    }

    // const allNodeIds = allMappings.map((m) => m.nodeId);
    // for (const mapping of allMappings) {
    //   if (!validateNode(mapping.nodeId, allNodeIds)) {
    //     setIsSaving(false);
    //     return;
    //   }
    // }
    console.log('allMappings:', allMappings);

    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const saveMappingsUrl = process.env.REACT_APP_SAVE_MAPPINGS_URL;

    try {
      const payload = {
        userId,
        instanceUrl,
        flowId,
        nodes: nodesForSave,
        edges,
        mappings: allMappings,
      };

      console.log('payload  :: ', payload);

      const response = await fetch(saveMappingsUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to save configurations: ${response.status}`);

      if (data.success) {
        const updatedMappings = { ...mappings };
        allMappings.forEach((mapping, index) => {
          if (data.mappingIds && data.mappingIds[index]) {
            updatedMappings[mapping.nodeId] = { ...mapping, id: data.mappingIds[index] };
          }
        });
        setMappings(updatedMappings);
        showToast("All configurations saved successfully!", 'success');
        await refreshData();
      } else {
        throw new Error(`Save failed: ${data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.log('Error in Saving mapping', error)
      // if (error.message.includes('INVALID_JWT_FORMAT')) {
      //   const tokenResponse = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ userId }),
      //   });

      //   const tokenData = await tokenResponse.json();
      //   if (!tokenResponse.ok || tokenData.error) {
      //     throw new Error(tokenData.error || 'Failed to fetch access token');
      //   }
      //   tokenRef.current = tokenData.access_token;
      //   saveAllConfiguration();
      // }
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, mappings, token, formVersionId, calculateNodeOrders]);

  // Register the save callback when component mounts
  useEffect(() => {
    if (onSaveCallback) {
      onSaveCallback(saveAllConfiguration);
    }
  }, [onSaveCallback, saveAllConfiguration]);

  const initializeData = async () => {
    setIsLoading(true);
    console.log('FormVersion d ==>', formVersionId);
    console.log('Form Records', formRecords);

    try {
      if (!formVersionId || !formRecords || formRecords.length === 0) {
        showToast("Form version data not loaded yet", 'error');
        setIsLoading(false);
        return;
      }

      // Find the form version in formRecords
      const formVersion = formRecords
        .flatMap(form => form.FormVersions || [])
        .find(version => version.Id === formVersionId);

      if (!formVersion) {
        showToast(`Form version ${formVersionId} not found`, 'error');
        setIsLoading(false);
        return;
      }

      // Extract mappings data from formVersion
      const mappingsData = formVersion.Mappings || {};
      console.log(mappingsData)
      // Process the mappings data to match your component's expected format
      const processedMappings = {};
      const processedNodes = [];
      const processedEdges = [];

      if (mappingsData.Mappings) {
        // Process mappings
        Object.entries(mappingsData.Mappings).forEach(([nodeId, mapping]) => {
          processedMappings[nodeId] = {
            nodeId,
            actionType: mapping.actionType,
            label: mapping.label,
            order: mapping.order,
            formVersionId: mapping.formVersionId,
            previousNodeId: mapping.previousNodeId,
            nextNodeIds: mapping.nextNodeIds || [],
            salesforceObject: mapping.salesforceObject,
            fieldMappings: mapping.fieldMappings || [],
            conditions: mapping.conditions || [],
            logicType: mapping.logicType || 'AND',
            customLogic: mapping.customLogic || '',
            pathOption: mapping.pathOption || 'Rules',
            returnLimit: mapping.returnLimit,
            sortField: mapping.sortField,
            sortOrder: mapping.sortOrder || 'ASC',
            enableConditions: mapping.enableConditions || false,
            loopConfig: mapping.loopConfig || {
              loopCollection: '',
              currentItemVariableName: '',
              maxIterations: '',
              loopVariables: {
                currentIndex: false,
                counter: false,
                indexBase: "0"
              },
              exitConditions: [],
              logicType: 'AND',
              customLogic: ''
            },
            formatterConfig: mapping.formatterConfig || {
              formatType: 'date',
              operation: '',
              inputField: '',
              outputVariable: '',
              options: {},
              inputField2: '',
              useCustomInput: false,
              customValue: ''
            },
            id: mapping.id || '',
            type: (mapping.actionType === 'Condition' || mapping.actionType === 'Path' ||
              mapping.actionType === 'Loop' || mapping.actionType === 'Formatter')
              ? 'utility'
              : 'action',
            displayLabel: mapping.label || mapping.actionType,
            storeAsContentDocument: mapping.storeAsContentDocument || false,
            selectedFileUploadFields: mapping.selectedFileUploadFields || [],
            selectedSheetName: mapping.selectedSheetName || '',
            spreadsheetId: mapping.spreadsheetId || '',
            sheetConditions: mapping.sheetConditions || [],
            conditionsLogic: mapping.conditionsLogic || 'AND', // Add this
            sheetcustomLogic: mapping.sheetcustomLogic || '', // Add this
            updateMultiple: mapping.updateMultiple || false,
            googleSheetReturnLimit: mapping.googleSheetReturnLimit || '',
            googleSheetSortField: mapping.googleSheetSortField || '',
            googleSheetSortOrder: mapping.googleSheetSortOrder || 'ASC'
          };
        });

        // Process nodes
        if (mappingsData.Nodes && Array.isArray(mappingsData.Nodes)) {
          mappingsData.Nodes.forEach(node => {
            const mapping = processedMappings[node.id];
            if (mapping) {
              processedNodes.push({
                ...node,
                type: "custom",
                data: {
                  ...node.data,
                  label: mapping.label,
                  displayLabel: mapping.displayLabel || mapping.label,
                  action: mapping.actionType === "CreateUpdate" ? "Create/Update" : mapping.actionType,
                  type: mapping.type,
                  order: mapping.order,
                  salesforceObject: mapping.salesforceObject,
                  fieldMappings: mapping.fieldMappings,
                  conditions: mapping.conditions,
                  logicType: mapping.logicType,
                  customLogic: mapping.customLogic,
                  pathOption: mapping.pathOption,
                  returnLimit: mapping.returnLimit,
                  sortField: mapping.sortField,
                  sortOrder: mapping.sortOrder,
                  enableConditions: mapping.enableConditions,
                  loopConfig: mapping.loopConfig,
                  formatterConfig: mapping.formatterConfig
                }
              });
            } else {
              // Fallback for nodes without mappings
              processedNodes.push({
                ...node,
                type: "custom",
                data: {
                  ...node.data,
                  action: node.data.action || 'Unknown',
                  type: node.data.type || 'action',
                  order: node.data.order || 0
                }
              });
            }
          });
        }

        // Process edges
        if (mappingsData.Edges && Array.isArray(mappingsData.Edges)) {
          processedEdges.push(...mappingsData.Edges);
        }
      }
      // If no mappings data found, initialize with default nodes
      if (Object.keys(processedMappings).length === 0) {
        setNodes(initialNodes);
        setEdges(initialEdges);
      } else {
        setMappings(processedMappings);
        setNodes(processedNodes);
        setEdges(processedEdges);
      }

    } catch (error) {
      showToast(`Initialization failed: ${error.message}`, 'error');
      console.error('Error initializing mappings:', error);
      // Fallback to initial nodes if there's an error
      setNodes(initialNodes);
      setEdges(initialEdges);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeData();
  }, [formVersionId, formRecords]);


  const onAddNode = useCallback((nodeType, action, sourceNodeId = null, connectionType = null, targetNodeId = null, edgeIdToReplace = null) => {
    const reactFlowWrapper = document.querySelector('.react-flow');
    if (!reactFlowWrapper) return;

    const rect = reactFlowWrapper.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const randomNum = Math.floor(Math.random() * 10000);
    const nodeName = action.toLowerCase().replace("/", "_");
    const newNodeId = `${nodeName}_${randomNum}`;

    const newNode = {
      id: newNodeId,
      type: "custom",
      position: { x: centerX, y: centerY },
      data: {
        label: `${action} Node`,
        displayLabel: action,
        type: nodeType,
        action,
        order: null,
        ...(action === "Create/Update" ? {
          enableConditions: false,
          returnLimit: "",
          salesforceObject: "",
          fieldMappings: [],
          conditions: [],
          logicType: "AND",
          customLogic: "",
        } : {}),
        ...(action === "Find" ? {
          salesforceObject: "",
          conditions: [],
          returnLimit: "",
          sortField: "",
          sortOrder: "ASC",
          logicType: "AND",
          customLogic: "",
        } : {}),
        ...(action === "Filter" ? {
          salesforceObject: "",
          conditions: [],
          returnLimit: "",
          sortField: "",
          sortOrder: "ASC",
          logicType: "AND",
          customLogic: "",
        } : {}),
        ...(action === "Condition" ? {
          conditions: [],
          logicType: "AND",
          customLogic: "",
        } : {}),
        ...(action === "Path" ? { pathOption: "Rules" } : {}),
        ...(action === "Loop" ? {
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
        ...(action === "Formatter" ? {
          formatterConfig: {
            formatType: "date",
            operation: "",
            inputField: "",
            outputVariable: "",
            options: {}
          }
        } : {}),
        ...(action === 'Google Sheet') ? {
          selectedSheetName: '', // Initialize
          spreadsheetId: '', // Initialize
          sheetConditions: [], // Initialize
          conditionsLogic: 'AND', // Initialize
          sheetcustomLogic: '', // Initialize
          ...(action === "Google Sheet" ? { credentials: null, mappings: [] } : {}),
        } : {},
        ...(action === 'FindGoogleSheet') ? {
          googleSheetReturnLimit: 0, // New
          googleSheetSortField: '',     // New
          googleSheetSortOrder: 'ASC',
          columns: []
        } : {}
      },
      draggable: true,
    };

    setNodes((nds) => {
      const sourceNode = nds.find(n => n.id === sourceNodeId);
      let updatedNodes = nds;

      // If inserting between an existing edge, position node between source and target and split the edge
      if (targetNodeId && edgeIdToReplace) {
        const targetNode = nds.find(n => n.id === targetNodeId);

        // Compute midpoint position
        const position = (sourceNode && targetNode)
          ? { x: (sourceNode.position.x + targetNode.position.x) / 2, y: (sourceNode.position.y + targetNode.position.y) / 2 }
          : { x: centerX, y: centerY };

        const insertedNode = { ...newNode, position };
        updatedNodes = [...nds, insertedNode];

        setEdges((eds) => {
          const edgeToReplace = eds.find((e) => e.id === edgeIdToReplace);
          let newEdges = eds.filter((e) => e.id !== edgeIdToReplace);

          const edge1 = {
            id: `e${sourceNodeId}-${newNodeId}`,
            source: sourceNodeId,
            sourceHandle: edgeToReplace?.sourceHandle || "bottom",
            target: newNodeId,
            targetHandle: "top",
            type: "default",
            style: { stroke: '#999', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' },
            ...(edgeToReplace && edgeToReplace.conditionNodeId ? { conditionNodeId: edgeToReplace.conditionNodeId } : {})
          };

          const edge2 = {
            id: `e${newNodeId}-${targetNodeId}`,
            source: newNodeId,
            sourceHandle: "bottom",
            target: targetNodeId,
            targetHandle: edgeToReplace?.targetHandle || "top",
            type: "default",
            style: { stroke: '#999', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' },
            ...(edgeToReplace && edgeToReplace.conditionNodeId ? { conditionNodeId: edgeToReplace.conditionNodeId } : {})
          };

          newEdges = addEdge(edge1, newEdges);
          newEdges = addEdge(edge2, newEdges);

          const recalculatedNodes = calculateNodeOrders(updatedNodes, newEdges);
          setNodes(recalculatedNodes);
          return newEdges;
        });

        return updatedNodes;
      }

      // Default behavior (attach above/below an existing node)
      updatedNodes = [...nds, newNode];

      // Check if source node is a Path node
    if (sourceNode && sourceNode.data.action === "Path") {
      // Create a condition node in between
      const conditionNodeId = `condition_${randomNum}`;

      // Position condition node between source and target (newly added node)
      const midX = (sourceNode.position.x + centerX) / 2;
      const midY = (sourceNode.position.y + centerY) / 2;

      const conditionNode = {
        id: conditionNodeId,
        type: "custom",
        position: { x: midX, y: midY },
        data: {
          label: "Condition",
          displayLabel: "Condition",
          action: "Condition",
          type: "condition",
          order: null,
          pathNodeId: sourceNodeId,
          targetNodeId: newNodeId,
          pathOption: "Rules",
          conditions: [],
          logicType: "AND",
          customLogic: "",
        },
        draggable: true,
      };

      updatedNodes = [...updatedNodes, conditionNode];

      setEdges((eds) => {
        const newEdges = [
          {
            id: `e${sourceNodeId}-${conditionNodeId}`,
            source: sourceNodeId,
            sourceHandle: connectionType === 'top' ? "top" : "bottom",
            target: conditionNodeId,
            targetHandle: "top",
            type: "default",
            conditionNodeId,
          },
          {
            id: `e${conditionNodeId}-${newNodeId}`,
            source: conditionNodeId,
            sourceHandle: "bottom",
            target: newNodeId,
            targetHandle: "top",
            type: "default",
            conditionNodeId,
          }
        ];

        const updatedEdges = [...eds, ...newEdges];
        const recalculatedNodes = calculateNodeOrders(updatedNodes, updatedEdges);
        setNodes(recalculatedNodes);
        return updatedEdges;
      });
    }  else {
        // Regular connection for non-Path nodes
        let newEdge;

        if (connectionType === 'bottom') {
          newEdge = {
            id: `e${sourceNodeId}-${newNodeId}`,
            source: sourceNodeId,
            sourceHandle: "bottom",
            target: newNodeId,
            targetHandle: "top",
            type: "default",
            style: { stroke: '#999', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' },
          };
        } else if (connectionType === 'top') {
          newEdge = {
            id: `e${newNodeId}-${sourceNodeId}`,
            source: newNodeId,
            sourceHandle: "bottom",
            target: sourceNodeId,
            targetHandle: "top",
            type: "default",
            style: { stroke: '#999', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' },
          };
        }

        if (newEdge) {
          setEdges((eds) => {
            const updatedEdges = addEdge(newEdge, eds);
            const recalculatedNodes = calculateNodeOrders(updatedNodes, updatedEdges);
            setNodes(recalculatedNodes);
            return updatedEdges;
          });
        }
      }

      return updatedNodes;
    });

    console.log(`New Node ID: ${newNodeId}`);
    console.log("Updated Nodes:", JSON.stringify(nodes));
    console.log("Updated Edges:", JSON.stringify(edges));

    return newNodeId;
  }, [setNodes, calculateNodeOrders, setEdges]);

  return (
    <div className="flex p-6 h-screen bg-[#f8fafc]">
      <div className="flex-1 flex flex-col relative transition-all duration-300">
        <div className="flex flex-col border rounded bg-gray-50 font-sans relative">
           {isLoading && (
            <Loader text="Loading Mappings" fullScreen={false} />
          )}

          {!isLoading && (
            <>
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 relative z-0 h-[80vh] overflow-hidden bg-gray-100" ref={reactFlowWrapperRef}>
                  <ReactFlowProvider>
                    <FlowDesigner
                      initialNodes={nodes}
                      initialEdges={edges}
                      setSelectedNode={setSelectedNode}
                      setNodes={setNodes}
                      setEdges={setEdges}
                      onAddNode={onAddNode}
                    />
                  </ReactFlowProvider>

                  {/* Add the floating button component */}
                  <FloatingAddButton
                    onAddNode={onAddNode}
                    reactFlowWrapper={reactFlowWrapperRef}
                    nodes={nodes}
                  />
                </div>

                {selectedNode && ["Create/Update", "CreateUpdate", "Find", "Filter", "Loop", "Formatter", "Condition", 'Google Sheet', 'FindGoogleSheet'].includes(selectedNode.data.action) && (
                  <ActionPanel
                    nodeId={selectedNode.id}
                    nodeType={selectedNode.data.action}
                    formFields={formFields}
                    salesforceObjects={salesforceObjects}
                    mappings={mappings}
                    setMappings={setMappings}
                    setSalesforceObjects={setSalesforceObjects}
                    fetchSalesforceFields={fetchSalesforceFields}
                    onClose={() => setSelectedNode(null)}
                    nodeLabel={selectedNode.data.label}
                    setNodeLabel={setNodeLabel}
                    nodes={nodes}
                    edges={edges}
                    credentials={googleSheetConfig?.credentials}
                    sfToken={token}
                  />
                )}
              </div>
            </>
          )}

          <AnimatePresence>
            {saveError && (
              <motion.div
                className={`fixed top-24 right-4 ${saveError.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-5 py-3 rounded-md shadow-lg flex items-center space-x-3 z-50 max-w-sm`}
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="font-medium text-sm flex-grow">{saveError.message}</p>
                <button
                  onClick={() => setSaveError(null)}
                  className="p-1 rounded-full hover:bg-red-700 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MappingFields;
