import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from 'react-router-dom';
import { ReactFlowProvider } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import FlowDesigner from "./FlowDesigner";
import ActionPanel from "./ActionPanel";
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useSalesforceData } from '../Context/MetadataContext';

const Sidebar = ({ onDragStart }) => {
  const actions = ["Create/Update", "Find"];
  const utilities = ["Formatter", "Filter", "Path", "Loop"];

  return (
    <motion.div
      className="w-1/5 min-w-[200px] bg-white p-6 h-full overflow-y-auto shadow-lg border-r border-gray-200"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-lg font-semibold text-gray-700 mb-6 border-b border-gray-200 pb-3">Actions</h2>
      {actions.map((action) => (
        <motion.div
          key={action}
          draggable
          onDragStart={(event) => onDragStart(event, "action", action)}
          className="mb-3 p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md cursor-grab shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 ease-in-out flex items-center justify-between text-sm"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <span>{action}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-75" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </motion.div>
      ))}
      <h2 className="text-lg font-semibold text-gray-700 mb-6 mt-8 border-b border-gray-200 pb-3">Utilities</h2>
      {utilities.map((utility) => (
        <motion.div
          key={utility}
          draggable
          onDragStart={(event) => onDragStart(event, "utility", utility)}
          className="mb-3 p-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md cursor-grab shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 ease-in-out flex items-center justify-between text-sm"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <span>{utility}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-75" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 4a1 1 0 00-1 1v3H6a1 1 0 100 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V5a1 1 0 00-1-1z" />
          </svg>
        </motion.div>
      ))}
    </motion.div>
  );
};

const MappingFields = () => {
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

  const initialNodes = [
    {
      id: "start",
      type: "custom",
      position: { x: 250, y: 50 },
      data: { label: "Start", displayLabel: "Start", order: 1, type: "start", action: "Start" },
      draggable: true,
    },
    {
      id: "end",
      type: "custom",
      position: { x: 250, y: 500 },
      data: { label: "End", displayLabel: "End", order: null, type: "end", action: "End" },
      draggable: true,
    },
  ];

  const initialEdges = [];
  console.log(metadata, 'metadata');
  
  console.log('formRecords ', formRecords);


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

  const validateNode = (nodeId, allNodeIds) => {
    if (nodeId === "start" || nodeId === "end") return true;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      showToast(`Node ${nodeId} not found.`);
      return false;
    }

    if (node.data.action === "Path") {
      const outgoingEdges = edges.filter((edge) => edge.source === nodeId && edge.conditionNodeId);
      if (outgoingEdges.length === 0) {
        if (!mappings[nodeId] || mappings[nodeId].isNew) {
          showToast(`Path node ${node.data.displayLabel} must have at least one outgoing connection.`);
          return false;
        }
      }

      for (const edge of outgoingEdges) {
        const conditionNodeId = edge.target;
        const conditionNode = nodes.find((n) => n.id === conditionNodeId);
        if (!conditionNode || conditionNode.data.action !== "Condition") {
          showToast(`Invalid condition node connected to Path node ${node.data.displayLabel}.`);
          return false;
        }

        const conditionMapping = mappings[conditionNodeId] || {};
        const validPathOption = conditionMapping.pathOption || "Rules";
        if (!["Rules", "Always Run", "Fallback"].includes(validPathOption)) {
          showToast(`Condition node ${conditionNode.data.displayLabel} for Path node ${node.data.displayLabel} must have a valid path option (Rules, Always Run, or Fallback).`);
          return false;
        }
        if (validPathOption === "Rules" && (!conditionMapping.conditions || conditionMapping.conditions.length === 0)) {
          showToast(`Condition node ${conditionNode.data.displayLabel} for Path node ${node.data.displayLabel} must have at least one condition configured when using Rules.`);
          return false;
        }
        if (validPathOption === "Rules" && conditionMapping.conditions.length > 1 && !conditionMapping.logicType) {
          showToast(`Logic type must be defined for condition node ${conditionNode.data.displayLabel} with multiple conditions.`);
          return false;
        }
        if (conditionMapping.logicType === "Custom" && !conditionMapping.customLogic) {
          showToast(`Custom logic expression must be provided for condition node ${conditionNode.data.displayLabel}.`);
          return false;
        }
      }
      return true;
    } else if (node.data.action === "Condition") {
      const conditionMapping = mappings[nodeId] || {};
      const validPathOption = conditionMapping.pathOption || "Rules";
      if (validPathOption === "Rules" && (!conditionMapping.conditions || conditionMapping.conditions.length === 0)) {
        showToast(`Condition node ${node.data.displayLabel} must have at least one condition configured when using Rules.`);
        return false;
      }
      if (validPathOption === "Rules" && conditionMapping.conditions.length > 1 && !conditionMapping.logicType) {
        showToast(`Logic type must be defined for condition node ${node.data.displayLabel} with multiple conditions.`);
        return false;
      }
      if (conditionMapping.logicType === "Custom" && !conditionMapping.customLogic) {
        showToast(`Custom logic expression must be provided for condition node ${node.data.displayLabel}.`);
        return false;
      }
      return true;
    }

    const nodeMapping = mappings[nodeId] || {};
    if (node.data.action === "Create/Update") {
      if (!nodeMapping.salesforceObject || !nodeMapping.fieldMappings || nodeMapping.fieldMappings.length === 0) {
        showToast(`No Salesforce object or complete mappings defined for node ${node.data.displayLabel}.`);
        return false;
      }
      if (nodeMapping.enableConditions && (!nodeMapping.conditions || nodeMapping.conditions.length === 0)) {
        showToast(`No complete conditions defined for node ${node.data.displayLabel} when conditions are enabled.`);
        return false;
      }
      if (nodeMapping.enableConditions && nodeMapping.conditions.length > 1 && !nodeMapping.logicType) {
        showToast(`Logic type must be defined for node ${node.data.displayLabel} with multiple conditions.`);
        return false;
      }
      if (nodeMapping.logicType === "Custom" && !nodeMapping.customLogic) {
        showToast(`Custom logic expression must be provided for node ${node.data.displayLabel}.`);
        return false;
      }
      if (nodeMapping.returnLimit && (isNaN(nodeMapping.returnLimit) || nodeMapping.returnLimit < 1 || nodeMapping.returnLimit > 100)) {
        showToast(`Return limit for node ${node.data.displayLabel} must be a number between 1 and 100.`);
        return false;
      }
    } else if (node.data.action === "Find" || node.data.action === "Filter") {
      if (!nodeMapping.salesforceObject || !nodeMapping.conditions || nodeMapping.conditions.length === 0) {
        showToast(`No Salesforce object or complete conditions defined for node ${node.data.displayLabel}.`);
        return false;
      }
      if (nodeMapping.conditions.length > 1 && !nodeMapping.logicType) {
        showToast(`Logic type must be defined for node ${node.data.displayLabel} with multiple conditions.`);
        return false;
      }
      if (nodeMapping.logicType === "Custom" && !nodeMapping.customLogic) {
        showToast(`Custom logic expression must be provided for node ${node.data.displayLabel}.`);
        return false;
      }
      if (nodeMapping.returnLimit && (isNaN(nodeMapping.returnLimit) || nodeMapping.returnLimit < 1 || nodeMapping.returnLimit > 100)) {
        showToast(`Return limit for node ${node.data.displayLabel} must be a number between 1 and 100.`);
        return false;
      }
    } else if (node.data.action === "Loop") {
      if (!nodeMapping.loopConfig || !nodeMapping.loopConfig.loopCollection || !nodeMapping.loopConfig.currentItemVariableName) {
        showToast(`Loop node ${node.data.displayLabel} must have a collection and current item variable name.`);
        return false;
      }
      const findNodeIds = allNodeIds.filter((id) => nodes.find((n) => n.id === id && n.data.action === "Find"));
      if (!findNodeIds.includes(nodeMapping.loopConfig.loopCollection)) {
        showToast(`Invalid Find node ID in loop collection for Loop node ${node.data.displayLabel}: ${nodeMapping.loopConfig.loopCollection}. Available Find nodes: ${findNodeIds.join(', ') || 'none'}.`);
        return false;
      }
      if (nodeMapping.loopConfig.maxIterations && (isNaN(nodeMapping.loopConfig.maxIterations) || nodeMapping.loopConfig.maxIterations < 1)) {
        showToast(`Max iterations for Loop node ${node.data.displayLabel} must be a positive number.`);
        return false;
      }
      if (
        nodeMapping.loopConfig.loopVariables &&
        (typeof nodeMapping.loopConfig.loopVariables !== "object" ||
          typeof nodeMapping.loopConfig.loopVariables.currentIndex !== "boolean" ||
          typeof nodeMapping.loopConfig.loopVariables.counter !== "boolean" ||
          !["0", "1"].includes(nodeMapping.loopConfig.loopVariables.indexBase))
      ) {
        showToast(`Invalid loop variables configuration for Loop node ${node.data.displayLabel}.`);
        return false;
      }
      if (nodeMapping.loopConfig.exitConditions && nodeMapping.loopConfig.exitConditions.length > 1 && !nodeMapping.loopConfig.logicType) {
        showToast(`Logic type must be defined for loop exit conditions in node ${node.data.displayLabel}.`);
        return false;
      }
      if (nodeMapping.loopConfig.logicType === "Custom" && !nodeMapping.loopConfig.customLogic) {
        showToast(`Custom logic expression must be provided for loop exit conditions in node ${node.data.displayLabel}.`);
        return false;
      }
    } else if (node.data.action === "Formatter") {
      if (!nodeMapping.formatterConfig || !nodeMapping.formatterConfig.inputField || !nodeMapping.formatterConfig.operation) {
        showToast(`Formatter node ${node.data.displayLabel} must have an input field and operation defined.`);
        return false;
      }
      if (nodeMapping.formatterConfig.formatType === "date") {
        if (nodeMapping.formatterConfig.operation === "format_date" && !nodeMapping.formatterConfig.options?.format) {
          showToast(`Formatter node ${node.data.displayLabel} must have a date format defined.`);
          return false;
        }
        if (
          (nodeMapping.formatterConfig.operation === "format_datetime" ||
            nodeMapping.formatterConfig.operation === "format_time") &&
          (!nodeMapping.formatterConfig.options?.format || !nodeMapping.formatterConfig.options?.timezone)
        ) {
          showToast(`Formatter node ${node.data.displayLabel} must have a date format and timezone defined.`);
          return false;
        }
        if (
          nodeMapping.formatterConfig.operation === "timezone_conversion" &&
          (!nodeMapping.formatterConfig.options?.timezone || !nodeMapping.formatterConfig.options?.targetTimezone)
        ) {
          showToast(`Formatter node ${node.data.displayLabel} must have source and target timezones defined.`);
          return false;
        }
        if (
          (nodeMapping.formatterConfig.operation === "add_date" || nodeMapping.formatterConfig.operation === "subtract_date") &&
          (!nodeMapping.formatterConfig.options?.unit || nodeMapping.formatterConfig.options?.value === undefined)
        ) {
          showToast(`Formatter node ${node.data.displayLabel} must have a date unit and value defined.`);
          return false;
        }
        if (
          nodeMapping.formatterConfig.operation === "date_difference" &&
          !nodeMapping.formatterConfig.inputField2 &&
          !nodeMapping.formatterConfig.useCustomInput
        ) {
          showToast(`Formatter node ${node.data.displayLabel} must have a second input field or use custom input for date difference.`);
          return false;
        }
        if (nodeMapping.formatterConfig.useCustomInput && !nodeMapping.formatterConfig.customValue) {
          showToast(`Formatter node ${node.data.displayLabel} must have a custom compare date defined.`);
          return false;
        }
      }
      if (nodeMapping.formatterConfig.formatType === "number") {
        if (nodeMapping.formatterConfig.operation === "locale_format" && !nodeMapping.formatterConfig.options?.locale) {
          showToast(`Formatter node ${node.data.displayLabel} must have a locale defined.`);
          return false;
        }
        if (
          nodeMapping.formatterConfig.operation === "currency_format" &&
          (!nodeMapping.formatterConfig.options?.currency || !nodeMapping.formatterConfig.options?.locale)
        ) {
          showToast(`Formatter node ${node.data.displayLabel} must have a currency and locale defined.`);
          return false;
        }
        if (nodeMapping.formatterConfig.operation === "round_number" && nodeMapping.formatterConfig.options?.decimals === undefined) {
          showToast(`Formatter node ${node.data.displayLabel} must have number of decimals defined.`);
          return false;
        }
        if (
          nodeMapping.formatterConfig.operation === "phone_format" &&
          (!nodeMapping.formatterConfig.options?.countryCode || !nodeMapping.formatterConfig.options?.format)
        ) {
          showToast(`Formatter node ${node.data.displayLabel} must have a country code and format defined.`);
          return false;
        }
        if (
          nodeMapping.formatterConfig.operation === "math_operation" &&
          (!nodeMapping.formatterConfig.options?.operation ||
            (!nodeMapping.formatterConfig.inputField2 && !nodeMapping.formatterConfig.useCustomInput))
        ) {
          showToast(`Formatter node ${node.data.displayLabel} must have a math operation and second input field or custom value defined.`);
          return false;
        }
        if (nodeMapping.formatterConfig.useCustomInput && nodeMapping.formatterConfig.customValue === undefined) {
          showToast(`Formatter node ${node.data.displayLabel} must have a custom value defined for math operation.`);
          return false;
        }
      }
      if (nodeMapping.formatterConfig.formatType === "text") {
        if (
          nodeMapping.formatterConfig.operation === "replace" &&
          (!nodeMapping.formatterConfig.options?.searchValue || !nodeMapping.formatterConfig.options?.replaceValue)
        ) {
          showToast(`Formatter node ${node.data.displayLabel} must have search and replace values defined.`);
          return false;
        }
        if (
          nodeMapping.formatterConfig.operation === "split" &&
          (!nodeMapping.formatterConfig.options?.delimiter || !nodeMapping.formatterConfig.options?.index)
        ) {
          showToast(`Formatter node ${node.data.displayLabel} must have a delimiter and index defined.`);
          return false;
        }
      }
    }
    return true;
  };

  const saveAllConfiguration = async () => {
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

    const actionNodes = nodes.filter(node => !['start', 'end'].includes(node.id));
    if (actionNodes.length === 0) {
      showToast("Flow must contain at least one action node.", 'error');
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

    for (const node of nodes) {
      const isConnected = edges.some((edge) => edge.source === node.id || edge.target === node.id);
      if (!isConnected && node.id !== "start" && node.id !== "end") {
        showToast(`Node ${node.data.displayLabel} is not connected. Please connect all nodes before saving.`, 'error');
        setIsSaving(false);
        return;
      }
    }

    const allMappings = [];
    let maxOrder = 0;
    for (const node of nodes) {
      const nodeMapping = mappings[node.id] || {};
      const incomingEdge = edges.find((e) => e.target === node.id);
      const outgoingEdges = edges.filter((e) => e.source === node.id);
      const previousNodeId = incomingEdge?.source;
      const nextNodeIds = outgoingEdges.map((e) => e.target).filter((id, index, self) => self.indexOf(id) === index);

      let actionType = nodeMapping.actionType || node.data.action;
      if (node.id === "start") actionType = "Start";
      else if (node.id === "end") actionType = "End";
      else if (actionType === "Create/Update") actionType = "CreateUpdate";
      else if (actionType === "Find") actionType = "Find";
      else if (actionType === "Filter") actionType = "Filter";
      else if (actionType === "Path") actionType = "Path";
      else if (actionType === "Loop") actionType = "Loop";
      else if (actionType === "Formatter") actionType = "Formatter";
      else if (actionType === "Condition") actionType = "Condition";
      else if (!actionType) actionType = node.data.action || "Unknown";

      const order = node.data.order || (actionType !== "End" ? ++maxOrder : maxOrder + 1);
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
        fieldMappings: actionType === "CreateUpdate" ? nodeMapping.fieldMappings || [] : [],
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
        nextNodeIds,
        previousNodeId,
        label: node.data.label,
        order,
        formVersionId,
      };

      allMappings.push(mappingData);
    }

    const allNodeIds = allMappings.map((m) => m.nodeId);
    for (const mapping of allMappings) {
      if (!validateNode(mapping.nodeId, allNodeIds)) {
        setIsSaving(false);
        return;
      }
    }

    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const saveMappingsUrl = process.env.REACT_APP_SAVE_MAPPINGS_URL;

    try {
      const payload = {
        userId,
        instanceUrl,
        flowId,
        nodes,
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
      if (error.message.includes('INVALID_JWT_FORMAT')) {
        const tokenResponse = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || tokenData.error) {
          throw new Error(tokenData.error || 'Failed to fetch access token');
        }
        tokenRef.current = tokenData.access_token;
        saveAllConfiguration();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const initializeData = async () => {
    setIsLoading(true);
    console.log('FormVersion d ==>' , formVersionId);
    console.log('Form Records' , formRecords);
    
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
            type: mapping.actionType === 'Start' || mapping.actionType === 'End'
              ? mapping.actionType.toLowerCase()
              : mapping.actionType === 'Condition' || mapping.actionType === 'Path' ||
                mapping.actionType === 'Loop' || mapping.actionType === 'Formatter'
                ? 'utility'
                : 'action',
            displayLabel: mapping.label || mapping.actionType
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
  }, [formVersionId,formRecords]);

  const onDragStart = (event, nodeType, action) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.setData("application/reactflow-id", action);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col relative h-screen transition-all duration-300">
        <div className="flex flex-col h-screen bg-gray-50 font-sans relative">
          <AnimatePresence>
            {isLoading && (
              <motion.div
                className="fixed inset-0 flex items-center align-center justify-center bg-gray-50 bg-opacity-10 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
                  <p className="mt-4 text-gray-700 text-lg font-medium">Loading Editor...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isLoading && (
            <>
              <motion.header
                className="bg-white p-4 flex justify-between items-center shadow-md h-16 sticky top-0 z-10 border-b border-gray-200"
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                  Field Mapping
                </h1>
                <motion.button
                  onClick={saveAllConfiguration}
                  disabled={isSaving}
                  className={`px-5 py-2 rounded-md font-medium text-white shadow-sm transition-all duration-200 ease-in-out
                    ${isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSaving ? "Saving..." : "Save All Configuration"}
                </motion.button>
              </motion.header>

              <div className="flex flex-1 overflow-hidden">
                <Sidebar onDragStart={onDragStart} />
                <div className="flex-1 relative z-0 h-[calc(100vh-64px)] overflow-hidden bg-gray-100">
                  <ReactFlowProvider>
                    <FlowDesigner
                      initialNodes={nodes}
                      initialEdges={edges}
                      setSelectedNode={setSelectedNode}
                      setNodes={setNodes}
                      setEdges={setEdges}
                    />
                  </ReactFlowProvider>
                </div>

                {selectedNode && ["Create/Update","CreateUpdate", "Find", "Filter", "Loop", "Formatter", "Condition"].includes(selectedNode.data.action) && (
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
                    nodeLabel={selectedNode.data.action}
                    nodes={nodes}
                    edges={edges}

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