import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import FlowDesigner from "./FlowDesigner";
import ActionPanel from "./ActionPanel";
import MainMenuBar from '../form-builder-with-versions/MainMenuBar';
import { XMarkIcon } from '@heroicons/react/24/solid';

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
  const {
    selectedObjects = [],
    selectedFields = {},
    fieldsData = {},
    formVersionId,
  } = location.state || {};

  const [selectedNode, setSelectedNode] = useState(null);
  const [mappings, setMappings] = useState({});
  const [formFields, setFormFields] = useState([]);
  const [salesforceObjects, setSalesforceObjects] = useState(
    selectedObjects.length > 0
      ? selectedObjects.map((obj) => ({
          name: obj.objectName,
          label: obj.objectLabel,
          fields: selectedFields[obj.objectName] || [],
          fieldDetails: fieldsData[obj.objectName] || [],
        }))
      : []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [token, setToken] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lastFetchedFormVersionId, setLastFetchedFormVersionId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

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

  const showToast = (message, type = 'error') => {
    setSaveError({ message, type });
    setTimeout(() => {
      setSaveError(null);
    }, 5000);
  };

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
      return data.access_token;
    } catch (error) {
      showToast(`Failed to fetch access token: ${error.message}. Please verify your Salesforce credentials or contact support.`, 'error');
      return null;
    }
  };

  const fetchFormFields = async (userId, instanceUrl, formVersionId) => {
    try {
      const url = process.env.REACT_APP_FETCH_METADATA_URL || "https://hmcyy3382m.execute-api.us-east-1.amazonaws.com/prod/fetchMetadata";
      if (!url) throw new Error("Metadata URL is not defined.");
      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, "");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, instanceUrl: cleanedInstanceUrl, formVersionId }),
      });
      const text = await response.text();
      let data = JSON.parse(text);
      if (!response.ok) throw new Error(data.error || `Failed to fetch form metadata: ${response.status}`);

      let formRecords = [];
      try { formRecords = JSON.parse(data.FormRecords); } catch { }

      const formVersion = formRecords.find((form) => form.FormVersions?.some((version) => version.Id === formVersionId));
      const version = formVersion?.FormVersions.find((version) => version.Id === formVersionId);
      const fields = version?.Fields || [];
      const normalizedFields = fields.map((field) => ({
        id: field.Id || field.id || `field_${field.Name || field.name}`,
        name: field.Name || field.name || field.label || "Unknown",
        type: field.Field_Type__c || field.type,
      }));
      if (normalizedFields.length === 0) showToast("No form fields found for the specified form version.", 'error');
      return normalizedFields;
    } catch (error) {
      showToast(`Failed to load form fields: ${error.message}`, 'error');
      return [];
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
        showToast(`Path node ${node.data.displayLabel} must have at least one outgoing connection.`);
        return false;
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
        if (
          (nodeMapping.formatterConfig.operation === "format_date" ||
            nodeMapping.formatterConfig.operation === "format_datetime" ||
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
    const flowId = formVersionId; // Use formVersionId as flowId

    if (!userId || !instanceUrl || !flowId) {
      showToast("Missing userId, instanceUrl, or flowId. Please log in again.", 'error');
      setIsSaving(false);
      return;
    }

    // Validate empty flow
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

    if (!token || token.split('.').length !== 3) {
      showToast("Invalid authentication token format. Please log in again.", 'error');
      setIsSaving(false);
      return;
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
      } else {
        throw new Error(`Save failed: ${data.message || "Unknown error"}`);
      }
    } catch (error) {
      showToast(error.message || "Failed to save configurations. Please check your network or contact support.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchExistingMappings = async (userId, formVersionId, instanceUrl, access_token, retries = 2) => {
    try {
      const url = process.env.REACT_APP_FETCH_MAPPINGS_URL;

      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, "");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ userId, formVersionId, instanceUrl: cleanedInstanceUrl }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 && retries > 0) {
          throw new Error("Unauthorized: Retry fetching access token");
        }
        throw new Error(data.error || `Failed to fetch existing mappings: ${response.status}`);
      }

      // Log raw mappings data for debugging
      console.log('Raw mappings data:', data.mappings);

      // Parse mappings with all properties
      const parsedMappings = Array.isArray(data.mappings)
        ? data.mappings.reduce((acc, mapping) => {
            // Use nodeId from the server response
            const nodeId = mapping.nodeId;
            if (!nodeId) {
              console.warn('Skipping mapping with missing nodeId:', mapping);
              return acc;
            }

            // Handle conditions (object or JSON string)
            let conditionsData = {};
            if (mapping.conditions && typeof mapping.conditions === 'object') {
              conditionsData = mapping.conditions;
            } else if (mapping.Conditions__c) {
              conditionsData = JSON.parse(mapping.Conditions__c);
            }

            let fieldMappings = [];
            if (mapping.Field_Mappings__c) {
              try {
                fieldMappings = typeof mapping.Field_Mappings__c === 'string' 
                  ? JSON.parse(mapping.Field_Mappings__c)
                  : mapping.Field_Mappings__c;
              } catch (e) {
                console.error('Error parsing field mappings:', e);
                fieldMappings = [];
              }
            } else if (mapping.fieldMappings) {
              fieldMappings = Array.isArray(mapping.fieldMappings) 
                ? mapping.fieldMappings 
                : [];
            }

            // Ensure each field mapping has all required properties
            fieldMappings = fieldMappings.map(fm => ({
              formFieldId: fm.formFieldId || fm.Form_Field_Id__c || '',
              fieldType: fm.fieldType || fm.Field_Type__c || '',
              salesforceField: fm.salesforceField || fm.Salesforce_Field__c || '',
              picklistValue: fm.picklistValue || fm.Picklist_Value__c || ''
            }));

            let loopConfig = {};
            if (mapping.loopConfig && typeof mapping.loopConfig === 'object') {
              loopConfig = mapping.loopConfig;
            } else if (mapping.Loop_Config__c) {
               loopConfig = JSON.parse(mapping.Loop_Config__c);
            }

            let formatterConfig = {};
            if (mapping.formatterConfig && typeof mapping.formatterConfig === 'object') {
              formatterConfig = mapping.formatterConfig;
            } else if (mapping.Formatter_Config__c) {
               formatterConfig = JSON.parse(mapping.Formatter_Config__c);
            }

            // Map action types to client-side naming
            const actionType =
              mapping.actionType === "CreateUpdate" || mapping.Type__c === "CreateUpdate"
                ? "Create/Update"
                : mapping.actionType === "Start" || mapping.Type__c === "Start"
                ? "Start"
                : mapping.actionType === "End" || mapping.Type__c === "End"
                ? "End"
                : mapping.actionType || mapping.Type__c;

            // Determine node type for UI rendering
            const nodeType =
              actionType === "Start" || actionType === "End"
                ? actionType.toLowerCase()
                : actionType === "Condition" ||
                  actionType === "Path" ||
                  actionType === "Loop" ||
                  actionType === "Formatter"
                ? "utility"
                : "action";

            return {
              ...acc,
              [nodeId]: {
                nodeId,
                actionType,
                label: mapping.label || mapping.Name || actionType,
                order: parseInt(mapping.order || mapping.Order__c, 10) || 0,
                formVersionId: mapping.formVersionId || mapping.Form_Version__c || "",
                previousNodeId: mapping.previousNodeId || mapping.Previous_Node_Id__c || null,
                nextNodeIds: (mapping.nextNodeIds || mapping.Next_Node_Id__c)
                  ? Array.isArray(mapping.nextNodeIds)
                    ? mapping.nextNodeIds
                    : mapping.nextNodeIds.split(",")
                  : [],
                salesforceObject: mapping.salesforceObject || mapping.Salesforce_Object__c || "",
                fieldMappings: fieldMappings || [],
                conditions: Array.isArray(conditionsData.conditions) ? conditionsData.conditions : [],
                logicType: conditionsData.logicType || "AND",
                customLogic: conditionsData.customLogic || "",
                pathOption: conditionsData.pathOption || "Rules",
                returnLimit: conditionsData.returnLimit || "",
                sortField: conditionsData.sortField || "",
                sortOrder: conditionsData.sortOrder || "ASC",
                enableConditions:
                  actionType === "Create/Update" ? !!conditionsData.conditions?.length : false,
                loopConfig: {
                  loopCollection: loopConfig.loopCollection || "",
                  currentItemVariableName: loopConfig.currentItemVariableName || "",
                  maxIterations: loopConfig.maxIterations || "",
                  loopVariables: loopConfig.loopVariables || {
                    currentIndex: false,
                    counter: false,
                    indexBase: "0",
                  },
                  exitConditions: Array.isArray(loopConfig.exitConditions)
                    ? loopConfig.exitConditions
                    : [],
                  logicType: loopConfig.logicType || "AND",
                  customLogic: loopConfig.customLogic || "",
                },
                formatterConfig: {
                  formatType: formatterConfig.formatType || "date",
                  operation: formatterConfig.operation || "",
                  inputField: formatterConfig.inputField || "",
                  outputVariable: formatterConfig.outputVariable || "",
                  options: formatterConfig.options || {},
                  inputField2: formatterConfig.inputField2 || "",
                  useCustomInput: formatterConfig.useCustomInput || false,
                  customValue: formatterConfig.customValue || "",
                },
                id: mapping.id || mapping.Id || "",
                type: nodeType,
                displayLabel: mapping.label || mapping.Name || actionType,
              },
            };
          }, {})
        : {};

      // Update nodes to include all mapping properties
      const updatedNodes = Array.isArray(data.nodes)
        ? data.nodes.map((node) => {
            const mapping = parsedMappings[node.id];
            if (!mapping) {
              return node; // Fallback to original node if no mapping
            }
            return {
              ...node,
              type: "custom",
              data: {
                ...node.data,
                label: mapping.label,
                displayLabel: mapping.displayLabel || mapping.label,
                action: mapping.actionType,
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
                formatterConfig: mapping.formatterConfig,
              },
            };
          })
        : [];

      return {
        mappings: parsedMappings,
        nodes: updatedNodes,
        edges: Array.isArray(data.edges) ? data.edges : [],
      };
    } catch (error) {
      showToast(`Failed to fetch existing mappings: ${error.message}`, 'error');
      return { mappings: {}, nodes: [], edges: [] };
    }
  };

  const initializeData = async () => {
    setIsLoading(true);
    setFetchError(null);

    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    const formVersionIdLocal = formVersionId;

    if (!userId || !instanceUrl || !formVersionIdLocal) {
      showToast("Missing userId, instanceUrl, or formVersionId.", 'error');
      setIsLoading(false);
      return;
    }

    try {
      let tokenToUse = token;
      if (!tokenToUse) {
        tokenToUse = await fetchAccessToken(userId, instanceUrl);
        if (!tokenToUse) {
          setIsLoading(false);
          return;
        }
        setToken(tokenToUse);
      }

      const formFieldsData = await fetchFormFields(userId, instanceUrl, formVersionIdLocal);
      setFormFields(formFieldsData);

      if (formVersionIdLocal !== lastFetchedFormVersionId) {
        let existingMappingsData = { mappings: {}, nodes: [], edges: [] };
        let retries = 2;
        while (retries > 0) {
          try {
            existingMappingsData = await fetchExistingMappings(userId, formVersionIdLocal, instanceUrl, tokenToUse, retries);
            break;
          } catch (error) {
            if (error.message.includes("Unauthorized") && retries > 0) {
              tokenToUse = await fetchAccessToken(userId, instanceUrl, retries - 1);
              if (!tokenToUse) throw new Error("Failed to refresh access token");
              setToken(tokenToUse);
              retries--;
              continue;
            }
            throw error;
          }
        }

        if (Object.keys(existingMappingsData.mappings).length > 0) {
          setMappings(existingMappingsData.mappings);
          setNodes(existingMappingsData.nodes);
          setEdges(existingMappingsData.edges);
          setLastFetchedFormVersionId(formVersionIdLocal);
        } else {
          setNodes(initialNodes);
          setEdges(initialEdges);
          setMappings({});
          setLastFetchedFormVersionId(formVersionIdLocal);
        }
      }
    } catch (error) {
      showToast(`Initialization failed: ${error.message}. Please check your connection or contact support.`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized) {
      initializeData();
      setIsInitialized(true);
    }
  }, []);

  const onDragStart = (event, nodeType, action) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.setData("application/reactflow-id", action);
    event.dataTransfer.effectAllowed = "move";
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
 
  return (
    <div className="flex h-screen">
      <MainMenuBar isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        selectedObjects={selectedObjects}
        selectedFields={selectedFields}
        fieldsData={fieldsData}
        formVersionId={formVersionId} />
      <div
        className={`flex-1 flex flex-col relative h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'
          }`}
      >
        <div className="flex flex-col h-screen bg-gray-50 font-sans relative">
          <AnimatePresence>
            {isLoading && (
              <motion.div
                className="fixed inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80 z-50"
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
                      initialNodes={nodes.length ? nodes : initialNodes}
                      initialEdges={edges.length ? edges : initialEdges}
                      setSelectedNode={setSelectedNode}
                      setNodes={setNodes}
                      setEdges={setEdges}
                    />
                  </ReactFlowProvider>
                </div>

                {selectedNode && ["Create/Update", "Find", "Filter", "Loop", "Formatter", "Condition"].includes(selectedNode.data.action) && (
                  <ActionPanel
                    nodeId={selectedNode.id}
                    nodeType={selectedNode.data.action}
                    formFields={formFields}
                    salesforceObjects={salesforceObjects}
                    mappings={mappings}
                    setMappings={setMappings}
                    setSalesforceObjects={setSalesforceObjects}
                    onClose={() => setSelectedNode(null)}
                    nodeLabel={selectedNode.data.displayLabel}
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

