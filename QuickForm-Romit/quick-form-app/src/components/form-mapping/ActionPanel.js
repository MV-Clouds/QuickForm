
import { useState, useEffect } from "react";
import Select from "react-select";
import { getCountryList } from "../form-builder-with-versions/getCountries";
import { motion, AnimatePresence } from "framer-motion";
import timezones from "timezones-list";
import countries from "i18n-iso-countries";
import currencyCodes from "currency-codes";

countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

const ActionPanel = ({
  nodeId,
  nodeType,
  formFields,
  salesforceObjects,
  mappings,
  setMappings,
  setSalesforceObjects,
  onClose,
  fetchSalesforceFields,
  nodeLabel,
  nodes,
  edges,
}) => {
  const isFindNode = nodeType === "Find";
  const isCreateUpdateNode = nodeType === "Create/Update";
  const isPathNode = nodeType === "Path";
  const isLoopNode = nodeType === "Loop";
  const isFormatterNode = nodeType === "Formatter";
  const isFilterNode = nodeType === "Filter";
  const isConditionNode = nodeType === "Condition";
  const [selectedObject, setSelectedObject] = useState("");
  const [localMappings, setLocalMappings] = useState([{ formFieldId: "", fieldType: "", salesforceField: "", picklistValue: "" }]);
  const [conditions, setConditions] = useState([{ field: "", operator: "=", value: "", value2: "" }]);
  const [logicType, setLogicType] = useState("AND");
  const [customLogic, setCustomLogic] = useState("");
  const [exitConditions, setExitConditions] = useState([{ field: "", operator: "=", value: "", value2: "" }]);
  const [saveError, setSaveError] = useState(null);
  const [loopCollection, setLoopCollection] = useState("");
  const [currentItemVariableName, setCurrentItemVariableName] = useState("");
  const [loopVariables, setLoopVariables] = useState({ currentIndex: false, indexBase: "0", counter: false });
  const [maxIterations, setMaxIterations] = useState("");
  const [loopDescription, setLoopDescription] = useState("");
  const [formatterConfig, setFormatterConfig] = useState({
    formatType: "date",
    operation: "",
    inputField: "",
    inputField2: "",
    customValue: "",
    useCustomInput: false,
    options: {},
  });
  const [enableConditions, setEnableConditions] = useState(false);
  const [returnLimit, setReturnLimit] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [pathOption, setPathOption] = useState("Rules");

  const typeMapping = {
    string: ["shorttext", "fullname", "section", "address", "longtext", "number", "price", "date", "datetime", "time", "email", "phone", "dropdown", "checkbox", "radio", "picklist"],
    double: ["number", "price"],
    currency: ["price", "number"],
    boolean: ["checkbox"],
    date: ["date"],
    datetime: ["datetime"],
    email: ["email"],
    phone: ["phone"],
    picklist: ["dropdown", "checkbox", "radio", "picklist"],
    multipicklist: ["dropdown", "checkbox", "radio", "picklist"],
    textarea: ["shorttext", "longtext", "fullname", "section", "address",],
    url: ["shorttext"],
    percent: ["number"],
    time: ["time"],
  };

  useEffect(() => {
    // Load node-specific mappings if they exist
    const nodeMapping = mappings[nodeId] || {};

    setSelectedObject(nodeMapping.salesforceObject || "");
    setLocalMappings(nodeMapping.fieldMappings?.length > 0 ? nodeMapping.fieldMappings : [{ formFieldId: "", fieldType: "", salesforceField: "" }]);
    setConditions(
      nodeMapping.conditions?.length > 0
        ? nodeMapping.conditions.map(c => ({ ...c, logic: undefined }))
        : (nodeMapping.pathOption === "Rules" || isFindNode || isFilterNode || (isCreateUpdateNode && nodeMapping.enableConditions)
          ? [{ field: "", operator: "=", value: "", value2: "" }]
          : [])
    );
    setLogicType(nodeMapping.logicType || "AND");
    setCustomLogic(nodeMapping.customLogic || "");
    setEnableConditions(nodeMapping.enableConditions || false);
    setReturnLimit(nodeMapping.returnLimit || "");
    setSortField(nodeMapping.sortField || "");
    setSortOrder(nodeMapping.sortOrder || "ASC");
    setPathOption(nodeMapping.pathOption || (isConditionNode ? "Rules" : undefined));

    const loopConfig = nodeMapping.loopConfig || {};
    setCurrentItemVariableName(loopConfig.currentItemVariableName || "");
    setLoopVariables(loopConfig.loopVariables || { currentIndex: false, indexBase: "0", counter: false });
    setMaxIterations(loopConfig.maxIterations || "");
    setExitConditions(
      loopConfig.exitConditions?.length > 0
        ? loopConfig.exitConditions.map(c => ({ ...c, logic: undefined }))
        : [{ field: "", operator: "=", value: "", value2: "" }]
    );
    setLoopDescription(loopConfig.loopDescription || "");

    const formatterConfigData = nodeMapping.formatterConfig || {};
    setFormatterConfig({
      formatType: formatterConfigData.formatType || "date",
      operation: formatterConfigData.operation || "",
      inputField: formatterConfigData.inputField || "",
      inputField2: formatterConfigData.inputField2 || "",
      customValue: formatterConfigData.customValue || "",
      useCustomInput: formatterConfigData.useCustomInput || false,
      options: formatterConfigData.options || {},
      outputVariable: formatterConfigData.outputVariable || "",
    });

    const validCollectionOptions = getAncestorNodes(nodeId, edges, nodes)
      .filter((node) => node.data.action === "Find")
      .map((node) => node.id);
    if (loopConfig.loopCollection && validCollectionOptions.includes(loopConfig.loopCollection)) {
      setLoopCollection(loopConfig.loopCollection);
    } else {
      setLoopCollection("");
      if (loopConfig.loopCollection) {
        setSaveError("Selected loop collection is no longer valid. Please select a valid Find node.");
        setMappings((prev) => ({
          ...prev,
          [nodeId]: {
            ...prev[nodeId],
            loopConfig: {
              ...(prev[nodeId]?.loopConfig || {}),
              loopCollection: "",
            },
          },
        }));
      }
    }
  }, [nodeId, mappings, nodes, edges, setMappings, isFindNode, isFilterNode, isCreateUpdateNode, isConditionNode]);

  useEffect(() => {
    if (!selectedObject) return;

    const objectExists = salesforceObjects.find(obj => obj.name === selectedObject);
    if (!objectExists?.fields?.length) {
      fetchSalesforceFields(selectedObject)
        .then((data) => {
          const newFields = data.fields || [];
          console.log('salesforce fields--> ', newFields);

          setSalesforceObjects(prev => [
            ...prev.filter(obj => obj.name !== selectedObject),
            { name: selectedObject, fields: newFields }
          ]);
        })
        .catch((error) => {
          setSaveError(`Failed to fetch fields for ${selectedObject}: ${error.message}`);
        });
    }
  }, [selectedObject, salesforceObjects, fetchSalesforceFields]);

//   useEffect(() => {
//   if (!selectedObject) return;

//   const objectExists = salesforceObjects.find(obj => obj.name === selectedObject);
//   // Only fetch if object doesn't exist or fields are undefined
//   if (!objectExists || typeof objectExists.fields === 'undefined') {
//     fetchSalesforceFields(selectedObject)
//       .then((data) => {
//         const newFields = data.fields || [];
//         console.log('salesforce fields--> ', newFields);

//         setSalesforceObjects(prev => [
//           ...prev.filter(obj => obj.name !== selectedObject),
//           { name: selectedObject, fields: newFields }
//         ]);
//       })
//       .catch((error) => {
//         setSaveError(`Failed to fetch fields for ${selectedObject}: ${error.message}`);
//       });
//   }
// }, [selectedObject, fetchSalesforceFields]);

  const operatorGroups = {
    text: [
      { value: "=", label: "Equals" },
      { value: "!=", label: "Not Equals" },
      { value: "LIKE", label: "Contains" },
      { value: "NOT LIKE", label: "Not Contains" },
      { value: "STARTS WITH", label: "Starts With" },
      { value: "ENDS WITH", label: "Ends With" },
      { value: "IS NULL", label: "Is Null" },
      { value: "IS NOT NULL", label: "Is Not Null" }
    ],
    number: [
      { value: "=", label: "Equals" },
      { value: "!=", label: "Not Equals" },
      { value: ">", label: "Greater Than" },
      { value: "<", label: "Less Than" },
      { value: ">=", label: "Greater Than or Equal To" },
      { value: "<=", label: "Less Than or Equal To" },
      { value: "BETWEEN", label: "Between" },
      { value: "IS NULL", label: "Is Null" },
      { value: "IS NOT NULL", label: "Is Not Null" }
    ],
    date: [
      { value: "=", label: "Equals" },
      { value: "!=", label: "Not Equals" },
      { value: ">", label: "After" },
      { value: "<", label: "Before" },
      { value: ">=", label: "On or After" },
      { value: "<=", label: "On or Before" },
      { value: "BETWEEN", label: "Between" },
      { value: "IS NULL", label: "Is Null" },
      { value: "IS NOT NULL", label: "Is Not Null" }
    ],
    boolean: [
      { value: "=", label: "Equals" },
      { value: "!=", label: "Not Equals" },
      { value: "IS NULL", label: "Is Null" },
      { value: "IS NOT NULL", label: "Is Not Null" }
    ],
    picklist: [
      { value: "=", label: "Equals" },
      { value: "!=", label: "Not Equals" },
      { value: "IN", label: "In" },
      { value: "NOT IN", label: "Not In" },
      { value: "IS NULL", label: "Is Null" },
      { value: "IS NOT NULL", label: "Is Not Null" }
    ],
    default: [
      { value: "=", label: "Equals" },
      { value: "!=", label: "Not Equals" },
      { value: "IS NULL", label: "Is Null" },
      { value: "IS NOT NULL", label: "Is Not Null" }
    ]
  };

  // Map Salesforce field types to our operator groups
  const fieldTypeToOperatorGroup = {
    string: 'text',
    double: 'number',
    currency: 'number',
    boolean: 'boolean',
    date: 'date',
    datetime: 'date',
    email: 'text',
    phone: 'text',
    picklist: 'picklist',
    multipicklist: 'picklist',
    textarea: 'text',
    url: 'text',
    percent: 'number',
    time: 'date'
  };

  const logicOptions = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" },
    { value: "Custom", label: "Custom" },
  ];

  const formatterTypes = [
    { value: "date", label: "Date/Time" },
    { value: "number", label: "Number" },
    { value: "text", label: "Text" },
  ];

  const formatterOperations = {
    date: [
      { value: "format_date", label: "Format Date" }, // date
      { value: "format_time", label: "Format Time" }, // time
      { value: "format_datetime", label: "Format Date and Time" }, // datetime
      { value: "timezone_conversion", label: "Timezone Conversion" }, // time, datetime
      { value: "add_date", label: "Add Date Units" },           // date, datetime
      { value: "subtract_date", label: "Subtract Date Units" }, // date, datetime
      { value: "date_difference", label: "Date Difference" },  // date
    ],
    number: [
      { value: "locale_format", label: "Locale Number Format" }, // number
      { value: "currency_format", label: "Currency Format" },   // price
      { value: "round_number", label: "Round Number" },           // number
      { value: "phone_format", label: "Format Phone Number" },    // phone
      { value: "math_operation", label: "Math Operation" },     // number
    ],
    text: [
      { value: "uppercase", label: "Uppercase" }, // shorttext, longtext, address, fullname, email
      { value: "lowercase", label: "Lowercase" }, // shorttext, longtext, address, fullname, email
      { value: "title_case", label: "Title Case" }, // shorttext, longtext, address, fullname, email
      { value: "trim_whitespace", label: "Trim Whitespace" }, // shorttext, longtext, address, fullname, email
      { value: "replace", label: "Replace Text" }, // shorttext, longtext, address, fullname, email
      { value: "extract_email", label: "Extract Email" }, // shorttext, longtext, address, fullname, email
      { value: "split", label: "Split Text" }, // shorttext, longtext, address, fullname, email
      { value: "word_count", label: "Word Count" }, // shorttext, longtext, address, fullname, email
      { value: "url_encode", label: "URL Encode" }, // shorttext, longtext, address, fullname, email
    ],
  };

  const operationFieldTypeCompatibility = {
    date: {
      format_date: ["date", "datetime"],
      format_time: ["time", "datetime"],
      format_datetime: ["datetime"],
      timezone_conversion: ["time", "datetime"],
      add_date: ["date", "datetime"],
      subtract_date: ["date", "datetime"],
      date_difference: ["date", "datetime"],
    },
    number: {
      locale_format: ["number", "price"],
      currency_format: ["price", "number"],
      round_number: ["number", "price"],
      phone_format: ["phone"],
      math_operation: ["number", "price"],
    },
    text: {
      uppercase: ["shorttext", "longtext", "address", "fullname", "email"],
      lowercase: ["shorttext", "longtext", "address", "fullname", "email"],
      title_case: ["shorttext", "longtext", "address", "fullname", "email"],
      trim_whitespace: ["shorttext", "longtext", "address", "fullname", "email"],
      replace: ["shorttext", "longtext", "address", "fullname", "email"],
      extract_email: ["shorttext", "longtext", "address", "fullname", "email"],
      split: ["shorttext", "longtext", "address", "fullname", "email"],
      word_count: ["shorttext", "longtext", "address", "fullname", "email"],
      url_encode: ["shorttext", "longtext", "address", "fullname", "email"],
    },
  };

  const dateFormats = [
    { value: "DD-MM-YYYY", label: "DD-MM-YYYY (e.g., 20-06-2025)" },
    { value: "MM-DD-YYYY", label: "MM-DD-YYYY (e.g., 06-20-2025)" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g., 2025-06-20)" },
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g., 20/06/2025)" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g., 06/20/2025)" },
  ];

  const timeFormats = [
    { value: "HH:mm:ss", label: "HH:mm:ss (e.g., 14:30:45)" },
    { value: "hh:mm:ss A", label: "hh:mm:ss A (e.g., 02:30:45 PM)" },
    { value: "HH:mm", label: "HH:mm (e.g., 14:30)" },
    { value: "hh:mm A", label: "hh:mm A (e.g., 02:30 PM)" },
  ];

  const dateTimeFormats = [
    { value: "DD-MM-YYYY HH:mm:ss", label: "DD-MM-YYYY HH:mm:ss (e.g., 20-06-2025 14:30:45)" },
    { value: "MM-DD-YYYY hh:mm:ss A", label: "MM-DD-YYYY hh:mm:ss A (e.g., 06-20-2025 02:30:45 PM)" },
    { value: "YYYY-MM-DD HH:mm", label: "YYYY-MM-DD HH:mm (e.g., 2025-06-20 14:30)" },
  ];

  const timezoneOptions = timezones.map((tz) => ({
    value: tz.tzCode,
    label: `${tz.label} (${tz.tzCode})`,
  }));

  const localeOptions = Object.entries(countries.getNames("en"))
    .map(([code, name]) => ({
      value: code.toLowerCase(),
      label: name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const currencyOptions = currencyCodes.data
    .map((currency) => ({
      value: currency.code,
      label: `${currency.currency} (${currency.code})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const phoneFormatOptions = [
    { value: "E.164", label: "E.164 (+12345678901)" },
    { value: "International", label: "International (+1 234 567 8901)" },
    { value: "National", label: "National ((234) 567-8901)" },
    { value: "No Country Code", label: "No Country Code (234 567 8901)" },
    { value: "Clean National", label: "Clean National (234-567-8901)" },
    { value: "Custom", label: "Custom" },
  ];

  const countryOptions = getCountryList().map((country) => ({
    value: country.code,
    label: `${country.name} (${country.dialCode})`,
  }));

  const splitIndexOptions = [
    { value: "first", label: "First" },
    { value: "second", label: "Second" },
    { value: "last", label: "Last" },
    { value: "second_from_last", label: "Second from Last" },
    { value: "all", label: "All" },
  ];

  const pathOptions = [
    { value: "Rules", label: "Rules" },
    { value: "Always Run", label: "Always Run" },
    { value: "Fallback", label: "Fallback" },
  ];

  const handleMappingChange = (index, key, value, extra = {}) => {
    const newMappings = [...localMappings];
    const currentMapping = newMappings[index];

    // Handle picklist value selection
    if (key === 'picklistValue') {
      newMappings[index] = {
        ...currentMapping,
        picklistValue: value,
        formFieldId: "", // Clear form field if picklist value is selected
        fieldType: "picklist"
      };
      setLocalMappings(newMappings);
      setSaveError(null);
      return;
    }

    if (key === 'formFieldId' || key === 'salesforceField') {
      let formField = null;
      let salesforceField = null;

      if (key === 'formFieldId') {
        formField = safeFormFields.find(f => f.id === value);
        salesforceField = currentMapping.salesforceField
          ? (safeSalesforceObjects
            .find(obj => obj.name === selectedObject)
            ?.fields?.find(f => f.name === currentMapping.salesforceField) || null)
          : null;
      } else { // salesforceField
        salesforceField = safeSalesforceObjects
          .find(obj => obj.name === selectedObject)
          ?.fields?.find(f => f.name === value) || null;
        formField = currentMapping.formFieldId
          ? (safeFormFields.find(f => f.id === currentMapping.formFieldId) || null)
          : null;
      }

      // Validate field types
      if (formField && salesforceField) {
        const allowedTypes = typeMapping[salesforceField.type] || [];
        let isValid = allowedTypes.includes(formField.type);

        // Special handling for checkbox/radio with picklist
        if ((formField.type === 'checkbox' || formField.type === 'radio') &&
          (salesforceField.type === 'picklist' || salesforceField.type === 'multipicklist')) {
          try {
            const properties = JSON.parse(formField.Properties__c || '{}');
            isValid = properties.options && properties.options.length > 1;
          } catch (e) {
            isValid = false;
          }
        }

        if (!isValid) {
          setSaveError(`Type mismatch: Form field type ${formField.type} is not compatible with Salesforce field type ${salesforceField.type}`);
          return;
        } else {
          setSaveError(null);
        }
      }
    }

    newMappings[index] = {
      ...currentMapping,
      [key]: value,
      ...extra,
      ...(key === 'formFieldId' ? { picklistValue: "" } : {}) // Clear picklist value if form field is selected
    };
    setLocalMappings(newMappings);
  };

  const handleConditionChange = (index, key, value, conditionType = "conditions") => {
    const setState = conditionType === "exitConditions" ? setExitConditions : setConditions;
    setState((prev) =>
      prev.map((condition, i) => (i === index ? { ...condition, [key]: value } : condition))
    );
  };

  const addMapping = () => {
    setLocalMappings((prev) => [...prev, { formFieldId: "", fieldType: "", salesforceField: "" }]);
  };

  const removeMapping = (index) => {
    setLocalMappings((prev) => prev.filter((_, i) => i !== index));
  };

  const addCondition = (conditionType = "conditions") => {
    const setState = conditionType === "exitConditions" ? setExitConditions : setConditions;
    setState((prev) => [...prev, { field: "", operator: "=", value: "", value2: "" }]);
  };

  const removeCondition = (index, conditionType = "conditions") => {
    const setState = conditionType === "exitConditions" ? setExitConditions : setConditions;
    setState((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLoopVariableChange = (variable, value) => {
    setLoopVariables((prev) => ({ ...prev, [variable]: value }));
  };

  const handleFormatterChange = (key, value) => {
    setFormatterConfig((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "formatType" ? { operation: "", options: {}, inputField2: "", customValue: "", useCustomInput: false } : {}),
      ...(key === "operation" ? { options: {}, inputField2: "", customValue: "", useCustomInput: false } : {}),
      ...(key === "useCustomInput" && !value ? { customValue: "" } : {}),
    }));
  };

  const handleFormatterOptionChange = (key, value) => {
    setFormatterConfig((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }));
  };

  // const handleObjectSelect = (selectedOption) => {
  //   if (!selectedOption) {
  //     setSelectedObject("");
  //     return;
  //   }

  //   const selectedObjectName = selectedOption.value;
  //   setSelectedObject(selectedObjectName);

  //   const shouldFetchFields =
  //     selectedObjectName &&
  //     (isFindNode || isFilterNode || isCreateUpdateNode || (isConditionNode && pathOption === "Rules"));

  //   if (!shouldFetchFields) return;

  //   fetchSalesforceFields(selectedObjectName)
  //     .then((data) => {
  //       const newFields = data.fields;

  //       setSalesforceObjects(prev => [
  //         ...prev.filter(obj => obj.name !== selectedObjectName), // remove old entry if any
  //         { name: selectedObjectName, fields: newFields }          // add fresh entry
  //       ]);
  //     })
  //     .catch((error) => {
  //       setSaveError(`Failed to fetch fields for ${selectedObjectName}: ${error.message}`);
  //     });
  // };

  const handleObjectSelect = (selectedOption) => {
    if (!selectedOption) {
      setSelectedObject("");
      setLocalMappings([{ formFieldId: "", fieldType: "", salesforceField: "" }]);
      return;
    }

    const selectedObjectName = selectedOption.value;
    setSelectedObject(selectedObjectName);

    const shouldFetchFields =
      selectedObjectName &&
      (isFindNode || isFilterNode || isCreateUpdateNode || (isConditionNode && pathOption === "Rules"));

    if (!shouldFetchFields) return;

    fetchSalesforceFields(selectedObjectName)
      .then((data) => {
        const newFields = data.fields || [];
        console.log('salesforce fields--> ', newFields);

        setSalesforceObjects(prev => [
          ...prev.filter(obj => obj.name !== selectedObjectName),
          { name: selectedObjectName, fields: newFields }
        ]);

        // Automatically add required fields to mappings
        const requiredFields = newFields.filter(field => field.required);
        if (requiredFields.length > 0 && isCreateUpdateNode) {
          const newMappings = requiredFields.map(field => ({
            salesforceField: field.name,
            formFieldId: "",
            fieldType: "",
            picklistValue: ""
          }));
          setLocalMappings(newMappings);
        }
      })
      .catch((error) => {
        setSaveError(`Failed to fetch fields for ${selectedObjectName}: ${error.message}`);
      });
  };

  const getAncestorNodes = (currentNodeId, edges, nodes) => {
    const ancestors = new Set();
    const visited = new Set();

    const traverse = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const incomingEdges = edges.filter((edge) => edge.target === nodeId);
      incomingEdges.forEach((edge) => {
        ancestors.add(edge.source);
        traverse(edge.source);
      });
    };

    traverse(currentNodeId);
    return Array.from(ancestors).map((id) => nodes.find((node) => node.id === id)).filter((node) => node);
  };

  const collectionOptions = getAncestorNodes(nodeId, edges, nodes)
    .filter((node) => node.data.action === "Find")
    .map((node) => ({
      value: node.id,
      label: `${node.data.label}.records`,
    }));

  const saveLocalMappings = () => {
    console.log("Saving mappings for node:", nodeId, "Formatter Config:", formatterConfig);

    if ((isCreateUpdateNode || isFindNode || isFilterNode || (isConditionNode && pathOption === "Rules")) && !selectedObject) {
      setSaveError("Please select a Salesforce object.");
      return;
    }

    // Check if required fields are mapped
    if (isCreateUpdateNode && selectedObject) {
      const requiredFields = safeSalesforceObjects
        .find(obj => obj.name === selectedObject)
        ?.fields?.filter(f => f.required) || [];

      const missingRequiredFields = requiredFields.filter(reqField => {
        return !localMappings.some(mapping =>
          mapping.salesforceField === reqField.name &&
          (mapping.formFieldId || mapping.picklistValue)
        );
      });

      if (missingRequiredFields.length > 0) {
        setSaveError(`Please map all required fields: ${missingRequiredFields.map(f => f.label || f.name).join(', ')}`);
        return;
      }
    }

    if (isLoopNode && (!loopCollection || !currentItemVariableName)) {
      setSaveError("Please provide a loop collection and a current item variable name.");
      return;
    }

    if (isLoopNode && maxIterations && (isNaN(maxIterations) || maxIterations < 1)) {
      setSaveError("Max iterations must be a positive number.");
      return;
    }

    if ((isFindNode || isFilterNode) && returnLimit && (isNaN(returnLimit) || returnLimit < 1 || returnLimit > 100)) {
      setSaveError("Return limit must be a number between 1 and 100.");
      return;
    }

    if (isConditionNode && pathOption === "Rules" && conditions.length === 0) {
      setSaveError("Please add at least one complete condition for Condition node.");
      return;
    }

    if (logicType === "Custom" && !customLogic) {
      setSaveError("Please provide a custom logic expression.");
      return;
    }

    if (isFormatterNode) {
      if (!formatterConfig.inputField || !formatterConfig.operation) {
        setSaveError("Please provide input field and operation.");
        console.log("Validation failed: Missing inputField or operation");
        return;
      }

      // Validate input field type compatibility
      const selectedField = safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField);
      if (selectedField) {
        const compatibleTypes = operationFieldTypeCompatibility[formatterConfig.formatType]?.[formatterConfig.operation] || [];
        if (compatibleTypes.length > 0 && !compatibleTypes.includes(selectedField.type)) {
          setSaveError(`Selected input field type (${selectedField.type}) is not compatible with operation ${formatterConfig.operation}.`);
          return;
        }
      }

      if (formatterConfig.formatType === "date") {
        if (formatterConfig.operation === "format_date" && !formatterConfig.options.format) {
          setSaveError("Please provide date format.");
          return;
        }
        if ((formatterConfig.operation === "format_time" || formatterConfig.operation === "format_datetime") && (!formatterConfig.options.format || !formatterConfig.options.timezone)) {
          setSaveError("Please provide format and timezone.");
          return;
        }
        if (formatterConfig.operation === "timezone_conversion" && (!formatterConfig.options.timezone || !formatterConfig.options.targetTimezone)) {
          setSaveError("Please provide source and target timezone.");
          return;
        }
        if ((formatterConfig.operation === "add_date" || formatterConfig.operation === "subtract_date") && (!formatterConfig.options.unit || formatterConfig.options.value === undefined)) {
          setSaveError("Please provide date unit and value.");
          return;
        }
        if (formatterConfig.operation === "date_difference") {
          if (!formatterConfig.useCustomInput && !formatterConfig.inputField2) {
            setSaveError("Please provide a second input field or enable custom input.");
            return;
          }
          if (formatterConfig.useCustomInput && !formatterConfig.customValue) {
            setSaveError("Please provide a custom compare date.");
            return;
          }
          if (formatterConfig.inputField2) {
            const secondField = safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2);
            if (secondField) {
              const compatibleTypes = operationFieldTypeCompatibility[formatterConfig.formatType]?.[formatterConfig.operation] || [];
              if (compatibleTypes.length > 0 && !compatibleTypes.includes(secondField.type)) {
                setSaveError(`Second input field type (${secondField.type}) is not compatible with operation ${formatterConfig.operation}.`);
                return;
              }
            }
          }
        }
      }
      if (formatterConfig.formatType === "number") {
        if (formatterConfig.operation === "locale_format" && !formatterConfig.options.locale) {
          setSaveError("Please provide locale.");
          return;
        }
        if (formatterConfig.operation === "currency_format" && (!formatterConfig.options.currency || !formatterConfig.options.locale)) {
          setSaveError("Please provide currency and locale.");
          return;
        }
        if (formatterConfig.operation === "round_number" && formatterConfig.options.decimals === undefined) {
          setSaveError("Please provide number of decimals.");
          return;
        }
        if (formatterConfig.operation === "phone_format" && (!formatterConfig.options.countryCode || !formatterConfig.options.format)) {
          setSaveError("Please provide country code and format.");
          return;
        }
        if (formatterConfig.operation === "math_operation") {
          if (!formatterConfig.useCustomInput && !formatterConfig.inputField2) {
            setSaveError("Please provide a second input field or enable custom input.");
            return;
          }
          if (formatterConfig.useCustomInput && formatterConfig.customValue === undefined) {
            setSaveError("Please provide a custom value.");
            return;
          }
          if (!formatterConfig.options.operation) {
            setSaveError("Please provide math operation.");
            return;
          }
          if (formatterConfig.inputField2) {
            const secondField = safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2);
            if (secondField) {
              const compatibleTypes = operationFieldTypeCompatibility[formatterConfig.formatType]?.[formatterConfig.operation] || [];
              if (compatibleTypes.length > 0 && !compatibleTypes.includes(secondField.type)) {
                setSaveError(`Second input field type (${secondField.type}) is not compatible with operation ${formatterConfig.operation}.`);
                return;
              }
            }
          }
        }
      }
      if (formatterConfig.formatType === "text") {
        if (formatterConfig.operation === "replace" && (!formatterConfig.options.searchValue || !formatterConfig.options.replaceValue)) {
          setSaveError("Please provide search and replace values.");
          return;
        }
        if (formatterConfig.operation === "split" && (!formatterConfig.options.delimiter || !formatterConfig.options.index)) {
          setSaveError("Please provide delimiter and index.");
          return;
        }
      }
    }

    const validCollectionOptions = getAncestorNodes(nodeId, edges, nodes)
      .filter((node) => node.data.action === "Find")
      .map((node) => node.id);
    if (isLoopNode && loopCollection && !validCollectionOptions.includes(loopCollection)) {
      setSaveError(`Invalid loop collection: ${loopCollection}. Please select a valid Find node.`);
      return;
    }

    const validMappings = localMappings.filter((m) => {
      if (!m.salesforceField) return false;

      // Either form field or picklist value must be set
      return m.formFieldId || m.picklistValue;
    });

    if (isCreateUpdateNode && validMappings.length !== localMappings.length) {
      setSaveError("Some field mappings have type mismatches. Please correct them before saving.");
      return;
    }

    const validConditions = conditions.filter((c) =>
      c.field &&
      c.operator &&
      (["IS NULL", "IS NOT NULL"].includes(c.operator) || (c.operator === "BETWEEN" ? c.value && c.value2 : c.value))
    );
    const validExitConditions = exitConditions.filter((c) =>
      c.field &&
      c.operator &&
      (["IS NULL", "IS NOT NULL"].includes(c.operator) || (c.operator === "BETWEEN" ? c.value && c.value2 : c.value))
    );

    if (isCreateUpdateNode && validMappings.length === 0) {
      setSaveError("Please add at least one complete mapping.");
      return;
    }

    if ((isFindNode || isFilterNode || (isCreateUpdateNode && enableConditions) || (isConditionNode && pathOption === "Rules")) && validConditions.length === 0) {
      setSaveError("Please add at least one complete condition.");
      return;
    }

    const loopConfig = isLoopNode
      ? {
        loopCollection,
        currentItemVariableName,
        ...(loopVariables.currentIndex || loopVariables.counter ? { loopVariables } : {}),
        ...(maxIterations ? { maxIterations } : {}),
        ...(validExitConditions.length > 0 ? { exitConditions: validExitConditions } : {}),
        ...(loopDescription ? { loopDescription } : {}),
      }
      : undefined;

    const incomingEdge = edges.find((e) => e.target === nodeId);
    const previousNodeId = incomingEdge?.source;
    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    const nextNodeIds = outgoingEdges.map((e) => e.target).filter((id, index, self) => self.indexOf(id) === index);

    setMappings((prev) => {
      const updatedMappings = {
        ...prev,
        [nodeId]: {
          actionType: isCreateUpdateNode ? "CreateUpdate" : isLoopNode ? "Loop" : isFormatterNode ? "Formatter" : isFilterNode ? "Filter" : isPathNode ? "Path" : isConditionNode ? "Condition" : nodeType,
          salesforceObject: isCreateUpdateNode || isFindNode || isFilterNode || (isConditionNode && pathOption === "Rules") ? selectedObject : "",
          fieldMappings: isCreateUpdateNode ? validMappings.map(m => ({
            formFieldId: m.formFieldId,
            fieldType: m.fieldType,
            salesforceField: m.salesforceField,
            picklistValue: m.picklistValue || undefined
          })) : [],
          conditions: (isFindNode || isFilterNode || (isCreateUpdateNode && enableConditions) || (isConditionNode && pathOption === "Rules")) ? validConditions : [],
          logicType: (isFindNode || isFilterNode || (isCreateUpdateNode && enableConditions) || (isConditionNode && pathOption === "Rules")) ? logicType : undefined,
          customLogic: logicType === "Custom" ? customLogic : undefined,
          loopConfig: isLoopNode ? loopConfig : undefined,
          formatterConfig: isFormatterNode ? formatterConfig : undefined,
          enableConditions: isCreateUpdateNode ? enableConditions : undefined,
          returnLimit: (isFindNode || isFilterNode) ? returnLimit : undefined,
          sortField: (isFindNode || isFilterNode) ? sortField : undefined,
          sortOrder: (isFindNode || isFilterNode) ? sortOrder : undefined,
          pathOption: isConditionNode ? pathOption : undefined,
          previousNodeId,
          nextNodeIds,
          label: nodes.find((n) => n.id === nodeId)?.data.label || `${nodeType}_Level0`,
        },
      };
      return updatedMappings;
    });

    setSaveError(null);
    console.log("Mappings saved successfully for node:", nodeId);
    onClose();
  };

  const safeFormFields = Array.isArray(formFields) ? formFields : [];
  const safeSalesforceObjects = Array.isArray(salesforceObjects) ? salesforceObjects : [];


  const formFieldOptions = (mappingIndex, isSecondInput = false) => {
    const currentSalesforceField = mappingIndex !== undefined ? localMappings[mappingIndex]?.salesforceField : null;
    const sfField = currentSalesforceField && selectedObject
      ? safeSalesforceObjects
        .find(obj => obj.name === selectedObject)
        ?.fields?.find(f => f.name === currentSalesforceField)
      : null;

    let allowedTypes = sfField ? (typeMapping[sfField?.type] || typeMapping.string) : typeMapping.string;

    // Filter form fields based on formatter type and operation
    if (isFormatterNode && formatterConfig.formatType) {
      const selectedFieldId = isSecondInput ? formatterConfig.inputField2 : formatterConfig.inputField;
      const selectedField = safeFormFields.find(f => f.id === selectedFieldId || f.Unique_Key__c === selectedFieldId);
      const selectedFieldType = selectedField ? selectedField.type : null;

      if (formatterConfig.operation && operationFieldTypeCompatibility[formatterConfig.formatType]) {
        allowedTypes = operationFieldTypeCompatibility[formatterConfig.formatType][formatterConfig.operation] || allowedTypes;
      } else {
        // Fallback to general type mapping based on formatType
        const formatTypeToFieldTypes = {
          date: ["date", "datetime", "time"],
          number: ["number", "price", "phone"],
          text: ["shorttext", "longtext", "address", "fullname", "email"],
        };
        allowedTypes = formatTypeToFieldTypes[formatterConfig.formatType] || allowedTypes;
      }
    }

    const groups = safeFormFields
      .filter(f => !f.parentFieldId)
      .map(parent => {
        const properties = parent.Properties__c ? JSON.parse(parent.Properties__c) : {};
        const subFieldsData = properties.subFields || {};
        const subFields = Object.entries(subFieldsData)
          .filter(([_, subField]) => subField.enabled !== false)
          .map(([key, subField]) => {
            const subFieldLabel = subField.label || subField.type || key.replace(/([A-Z])/g, ' $1').trim() || 'Unknown';
            const subFieldId = subField.id || `${parent.id}_${key}`;
            return {
              value: subFieldId,
              label: subFieldLabel,
              isFormField: true,
              isSubField: true,
              type: subField.type || parent.type,
            };
          })
          .filter(sub => allowedTypes.includes(sub.type));

        return {
          label: parent.name || 'Unknown',
          options: [
            {
              value: parent.id,
              label: parent.name || 'Unknown',
              isFormField: true,
              isSubField: false,
              type: parent.type,
            },
            ...subFields,
          ].filter(opt => allowedTypes.includes(opt.type)),
        };
      })
      .filter(group => group.options.length > 0);

    const orphanSubFields = safeFormFields
      .filter(f => f.parentFieldId && !safeFormFields.some(p => p.id === f.parentFieldId))
      .filter(f => {
        const properties = f.Properties__c ? JSON.parse(f.Properties__c) : {};
        return properties.enabled !== false;
      })
      .map(f => {
        const properties = f.Properties__c ? JSON.parse(f.Properties__c) : {};
        const subFieldLabel = properties.label || f.type || f.name || 'Unknown';
        return {
          value: f.id,
          label: subFieldLabel,
          isFormField: true,
          isSubField: true,
          type: f.type,
        };
      })
      .filter(sub => allowedTypes.includes(sub.type));

    if (orphanSubFields.length > 0) {
      groups.push({
        label: 'Other Fields',
        options: orphanSubFields,
      });
    }

    if (sfField && (sfField.type === 'picklist' || sfField.type === 'multipicklist') && !isFormatterNode) {
      const picklistGroup = {
        label: 'Picklist Values',
        options: sfField.values && Array.isArray(sfField.values) && sfField.values.length > 0
          ? sfField.values.map(val => ({
            value: val,
            label: val,
            isPicklistValue: true,
          }))
          : [{ value: '', label: 'No picklist values available', isDisabled: true }],
      };
      groups.unshift(picklistGroup);
    }

    return groups;
  };

  const objectOptions = safeSalesforceObjects.map((obj) => ({ value: obj.name || "", label: obj.name || "Unknown" }));

  const fieldOptions = selectedObject
    ? safeSalesforceObjects
      .find((obj) => obj.name === selectedObject)
      ?.fields?.map((f) => ({
        value: f.name,
        label: f.label || f.name || "Unknown Field",
      })) || []
    : [];

  const sortOrderOptions = [
    { value: "ASC", label: "Ascending" },
    { value: "DESC", label: "Descending" },
  ];

  const renderConditions = (conditionType = "conditions", isExit = false) => {
    const conditionsList = isExit ? exitConditions : conditions;

    // Helper function to get operators for a condition
    const getOperatorsForCondition = (conditionIndex) => {
      if (isExit) {
        return operatorGroups.default; // For exit conditions, use default operators
      }

      const condition = conditionsList[conditionIndex];
      if (!condition.field || !selectedObject) {
        return operatorGroups.default;
      }

      // Find the Salesforce field type
      const sfObject = safeSalesforceObjects.find(obj => obj.name === selectedObject);
      if (!sfObject) return operatorGroups.default;

      const sfField = sfObject.fields?.find(f => f.name === condition.field);
      if (!sfField) return operatorGroups.default;
      const operatorGroup = fieldTypeToOperatorGroup[sfField.type] || 'default';

      return operatorGroups[operatorGroup] || operatorGroups.default;
    };


    return (
      <div className="space-y-4">
        {conditionsList.length > 1 && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Combine Conditions Using</label>
            <Select
              value={logicOptions.find((opt) => opt.value === logicType) || null}
              onChange={(selected) => {
                setLogicType(selected ? selected.value : "AND");
                if (selected?.value !== "Custom") {
                  setCustomLogic("");
                }
              }}
              options={logicOptions}
              placeholder="Select Logic"
              styles={{
                container: (base) => ({
                  ...base,
                  borderRadius: "0.375rem",
                  borderColor: "#e5e7eb",
                  fontSize: "0.875rem",
                }),
                control: (base) => ({
                  ...base,
                  minHeight: "34px",
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
              classNamePrefix="select"
            />
            {logicType === "Custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2"
              >
                <input
                  type="text"
                  value={customLogic}
                  onChange={(e) => setCustomLogic(e.target.value)}
                  placeholder="e.g., (1 AND 2) OR 3"
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </motion.div>
            )}
          </div>
        )}
        {conditionsList.map((condition, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">{isExit ? `Exit Condition ${index + 1}` : `Condition ${index + 1}`}</h3>
              {conditionsList.length > 1 && (
                <button
                  onClick={() => removeCondition(index, conditionType)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5">
                <label className="block text-xs font-medium text-gray-500 mb-1">Field</label>
                {isExit ? (
                  <input
                    type="text"
                    value={condition.field}
                    onChange={(e) => handleConditionChange(index, "field", e.target.value, conditionType)}
                    placeholder={`e.g., ${currentItemVariableName || "currentRecord"}.Email`}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <Select
                    value={fieldOptions.find((opt) => opt.value === condition.field) || null}
                    onChange={(selected) => handleConditionChange(index, "field", selected ? selected.value : "", conditionType)}
                    options={fieldOptions}
                    placeholder="Select Field"
                    styles={{
                      container: (base) => ({
                        ...base,
                        borderRadius: "0.375rem",
                        borderColor: "#e5e7eb",
                        fontSize: "0.875rem",
                      }),
                      control: (base) => ({
                        ...base,
                        minHeight: "34px",
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                    }}
                    isDisabled={!selectedObject}
                    isClearable
                    classNamePrefix="select"
                  />
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Operator</label>
                <Select
                  value={getOperatorsForCondition(index).find((opt) => opt.value === condition.operator) || null}
                  onChange={(selected) => handleConditionChange(index, "operator", selected ? selected.value : "=", conditionType)}
                  options={getOperatorsForCondition(index)}
                  placeholder="Op"
                  styles={{
                    container: (base) => ({
                      ...base,
                      borderRadius: "0.375rem",
                      borderColor: "#e5e7eb",
                      fontSize: "0.875rem",
                    }),
                    control: (base) => ({
                      ...base,
                      minHeight: "34px",
                      paddingLeft: "4px",
                    }),
                    dropdownIndicator: (base) => ({
                      ...base,
                      padding: "4px",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                      minWidth: "120px",
                    }),
                    option: (base) => ({
                      ...base,
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      fontSize: "0.75rem",
                    }),
                  }}
                  classNamePrefix="select"
                />
              </div>
              {condition.operator !== "IS NULL" && condition.operator !== "IS NOT NULL" && (
                <div className="col-span-5">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {condition.operator === "BETWEEN" ? "Value (From)" : "Value"}
                  </label>
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => handleConditionChange(index, "value", e.target.value, conditionType)}
                    placeholder={condition.operator === "BETWEEN" ? "From Value" : "Enter Value"}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              {condition.operator === "BETWEEN" && (
                <div className="col-span-5 col-start-8">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Value (To)</label>
                  <input
                    type="text"
                    value={condition.value2}
                    onChange={(e) => handleConditionChange(index, "value2", e.target.value, conditionType)}
                    placeholder="To Value"
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
        <button
          onClick={() => addCondition(conditionType)}
          className="flex items-center justify-center w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-100 border border-blue-200 text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isExit ? "Add Exit Condition" : "Add Condition"}
        </button>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute right-0 h-full w-1/3 bg-white shadow-xl border-l border-gray-200 overflow-y-auto z-10"
    >

      <div className="p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-semibold text-gray-800"
          >
            {`Configuration for ${nodeLabel}`}
          </motion.h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <AnimatePresence>
          {saveError && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-500 mb-6 p-3 bg-red-50 rounded-md border border-red-100"
            >
              {saveError}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          {(isPathNode || isConditionNode) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Path Option</label>
                <Select
                  value={pathOptions.find((opt) => opt.value === pathOption) || null}
                  onChange={(selected) => setPathOption(selected ? selected.value : "Rules")}
                  options={pathOptions}
                  placeholder="Select Path Option"
                  styles={{
                    container: (base) => ({
                      ...base,
                      marginTop: "4px",
                      borderRadius: "0.375rem",
                      borderColor: "#e5e7eb",
                    }),
                    control: (base) => ({
                      ...base,
                      borderColor: "#e5e7eb",
                      minHeight: "42px",
                      "&:hover": {
                        borderColor: "#d1d5db",
                      },
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  classNamePrefix="select"
                />
              </div>
              {pathOption === "Rules" && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salesforce Object</label>
                    <Select
                      value={objectOptions.find((opt) => opt.value === selectedObject) || null}
                      onChange={handleObjectSelect}
                      options={objectOptions}
                      placeholder={objectOptions.length ? "Select Salesforce Object" : "No Objects Available"}
                      styles={{
                        container: (base) => ({
                          ...base,
                          marginTop: "4px",
                          borderRadius: "0.375rem",
                          borderColor: "#e5e7eb",
                        }),
                        control: (base) => ({
                          ...base,
                          borderColor: "#e5e7eb",
                          minHeight: "42px",
                          "&:hover": {
                            borderColor: "#d1d5db",
                          },
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                      }}
                      isClearable
                      isDisabled={!objectOptions.length}
                      classNamePrefix="select"
                    />
                  </motion.div>
                  {renderConditions("conditions")}
                </>
              )}
            </motion.div>
          )}

          {(isCreateUpdateNode || isFindNode || isFilterNode) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-50 p-4 rounded-lg border border-gray-200"
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">Salesforce Object</label>
              <Select
                value={objectOptions.find((opt) => opt.value === selectedObject) || null}
                onChange={handleObjectSelect}
                options={objectOptions}
                placeholder={objectOptions.length ? "Select Salesforce Object" : "No Objects Available"}
                styles={{
                  container: (base) => ({
                    ...base,
                    marginTop: "4px",
                    borderRadius: "0.375rem",
                    borderColor: "#e5e7eb",
                  }),
                  control: (base) => ({
                    ...base,
                    borderColor: "#e5e7eb",
                    minHeight: "42px",
                    "&:hover": {
                      borderColor: "#d1d5db",
                    },
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 9999,
                  }),
                }}
                isClearable
                isDisabled={!objectOptions.length}
                classNamePrefix="select"
              />
            </motion.div>
          )}

          {isLoopNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Loop Collection</label>
                <Select
                  value={collectionOptions.find((opt) => opt.value === loopCollection) || null}
                  onChange={(selected) => setLoopCollection(selected ? selected.value : "")}
                  options={collectionOptions}
                  placeholder={collectionOptions.length ? "Select Collection" : "No data collection available"}
                  styles={{
                    container: (base) => ({
                      ...base,
                      marginTop: "4px",
                      borderRadius: "0.375rem",
                      borderColor: "#e5e7eb",
                    }),
                    control: (base) => ({
                      ...base,
                      borderColor: "#e5e7eb",
                      minHeight: "42px",
                      "&:hover": {
                        borderColor: "#d1d5db",
                      },
                    }),
                    placeholder: (base) => ({
                      ...base,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  isClearable
                  isDisabled={!collectionOptions.length}
                  classNamePrefix="select"
                />
                {!collectionOptions.length && (
                  <p className="text-red-500 text-xs mt-2">No data collection available. Please add a Find node upstream.</p>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Item Variable Name</label>
                <input
                  type="text"
                  value={currentItemVariableName}
                  onChange={(e) => setCurrentItemVariableName(e.target.value)}
                  placeholder="e.g., currentRecord, loopItem"
                  className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Index/Counter Variables (optional)</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={loopVariables.currentIndex}
                      onChange={() => handleLoopVariableChange("currentIndex", !loopVariables.currentIndex)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Current Index</span>
                  </label>
                  {loopVariables.currentIndex && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="ml-6 space-y-2"
                    >
                      <label className="block text-sm font-medium text-gray-700">Index Base</label>
                      <Select
                        value={[{ value: "0", label: "0-based" }, { value: "1", label: "1-based" }].find((opt) => opt.value === loopVariables.indexBase) || null}
                        onChange={(selected) => handleLoopVariableChange("indexBase", selected ? selected.value : "0")}
                        options={[{ value: "0", label: "0-based" }, { value: "1", label: "1-based" }]}
                        placeholder="Select Index Base"
                        styles={{
                          container: (base) => ({
                            ...base,
                            marginTop: "4px",
                            borderRadius: "0.375rem",
                            borderColor: "#e5e7eb",
                          }),
                          control: (base) => ({
                            ...base,
                            minHeight: "42px",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999,
                          }),
                        }}
                        classNamePrefix="select"
                      />
                    </motion.div>
                  )}
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={loopVariables.counter}
                      onChange={() => handleLoopVariableChange("counter", !loopVariables.counter)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Counter (Total records processed)</span>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Iterations (optional)</label>
                <input
                  type="number"
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(e.target.value)}
                  placeholder="Enter max iterations (e.g., 3)"
                  className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Exit Conditions (optional)</h3>
                {renderConditions("exitConditions", true)}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Loop Description / Notes (optional)</label>
                <textarea
                  value={loopDescription}
                  onChange={(e) => setLoopDescription(e.target.value)}
                  placeholder="Describe the purpose of this loop"
                  className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  rows="3"
                />
              </div>
            </motion.div>
          )}

          {(isFindNode || isFilterNode) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {renderConditions("conditions")}

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Limit (optional, max 100)</label>
                <input
                  type="number"
                  value={returnLimit}
                  onChange={(e) => setReturnLimit(e.target.value)}
                  placeholder="Leave blank for all records"
                  className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">Enter a number up to 100 or leave blank to return all records.</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Sort Records (optional)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sort Field</label>
                    <Select
                      value={fieldOptions.find((opt) => opt.value === sortField) || null}
                      onChange={(selected) => setSortField(selected ? selected.value : "")}
                      options={fieldOptions}
                      placeholder="Select Field"
                      styles={{
                        container: (base) => ({
                          ...base,
                          borderRadius: "0.375rem",
                          borderColor: "#e5e7eb",
                          fontSize: "0.875rem",
                        }),
                        control: (base) => ({
                          ...base,
                          minHeight: "34px",
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                      }}
                      isDisabled={!selectedObject}
                      isClearable
                      classNamePrefix="select"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sort Order</label>
                    <Select
                      value={sortOrderOptions.find((opt) => opt.value === sortOrder) || null}
                      onChange={(selected) => setSortOrder(selected ? selected.value : "ASC")}
                      options={sortOrderOptions}
                      placeholder="Select Order"
                      styles={{
                        container: (base) => ({
                          ...base,
                          borderRadius: "0.375rem",
                          borderColor: "#e5e7eb",
                          fontSize: "0.875rem",
                        }),
                        control: (base) => ({
                          ...base,
                          minHeight: "34px",
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                      }}
                      classNamePrefix="select"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {isCreateUpdateNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                {/* {localMappings.map((mapping, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Salesforce Field</label>
                        <Select
                          // value={fieldOptions.find((opt) => opt.value === mapping.salesforceField) || null}
                          // onChange={(selected) => handleMappingChange(index, "salesforceField", selected ? selected.value : "")}
                          value={fieldOptions.find((opt) => opt.value === mapping.salesforceField) || null}
                          onChange={(selected) => handleMappingChange(index, "salesforceField", selected ? selected.value : "")}
                          options={fieldOptions}
                          placeholder="Select Field"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            placeholder: (base) => ({
                              ...base,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          isDisabled={!selectedObject}
                          isClearable
                          classNamePrefix="select"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Form Field</label>
                        <Select
                          value={
                            localMappings[index].picklistValue
                              ? {
                                value: localMappings[index].picklistValue,
                                label: localMappings[index].picklistValue,
                                isPicklistValue: true
                              }
                              : safeFormFields.find(f => f.id === localMappings[index].formFieldId || f.Unique_Key__c === localMappings[index].formFieldId)
                                ? {
                                  value: localMappings[index].formFieldId,
                                  label: safeFormFields.find(f => f.id === localMappings[index].formFieldId || f.Unique_Key__c === localMappings[index].formFieldId).name || 'Unknown',
                                  isFormField: true,
                                  isSubField: !!safeFormFields.find(f => f.id === localMappings[index].formFieldId || f.Unique_Key__c === localMappings[index].formFieldId)?.parentFieldId
                                }
                                : null
                          }
                          onChange={(selected) => {
                            if (!selected) {
                              handleMappingChange(index, 'formFieldId', '', { fieldType: '' });
                              return;
                            }
                            if (selected.isPicklistValue) {
                              handleMappingChange(index, 'picklistValue', selected.value);
                            } else {
                              const field = safeFormFields.find(f => f.id === selected.value || f.Unique_Key__c === selected.value);
                              handleMappingChange(index, 'formFieldId', selected.value, { fieldType: field ? field.type : '' });
                            }
                          }}
                          options={formFieldOptions(index)}
                          placeholder={formFieldOptions(index).length ? "Select Form Field or Picklist Value" : "No Options Available"}
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            placeholder: (base) => ({
                              ...base,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                            groupHeading: (base) => ({
                              ...base,
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              color: '#1f2937',
                              backgroundColor: '#f9fafb',
                              padding: '8px 12px',
                              borderBottom: '1px solid #e5e7eb',
                            }),
                            option: (base, { data, isDisabled }) => ({
                              ...base,
                              backgroundColor: data.isPicklistValue ? '#f0f9ff' : (data.isSubField ? '#f3f4f6' : base.backgroundColor),
                              color: isDisabled ? '#ccc' : (data.isPicklistValue ? '#0369a1' : (data.isSubField ? '#374151' : base.color)),
                              paddingLeft: data.isSubField ? '24px' : '12px',
                              cursor: isDisabled ? 'not-allowed' : 'default',
                              ':active': {
                                backgroundColor: !isDisabled && (data.isPicklistValue ? '#e0f2fe' : (data.isSubField ? '#e5e7eb' : base[':active'].backgroundColor)),
                              },
                              ':hover': {
                                backgroundColor: !isDisabled && (data.isPicklistValue ? '#e0f2fe' : (data.isSubField ? '#e5e7eb' : '#f3f4f6')),
                              },
                            }),
                          }}
                          isClearable
                          isDisabled={!formFieldOptions(index).length}
                          classNamePrefix="select"
                          getOptionIsDisabled={(option) => option.isDisabled === true}
                          formatGroupLabel={(group) => (
                            <div className="flex items-center">
                              <span>{group.label}</span>
                            </div>
                          )}
                        />
                      </div>
                      {localMappings.length > 1 && (
                        <button
                          onClick={() => removeMapping(index)}
                          className="text-red-500 hover:text-red-700 mt-7"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))} */}
                {localMappings.map((mapping, index) => {
                  const isRequiredField = selectedObject && safeSalesforceObjects
                    .find(obj => obj.name === selectedObject)
                    ?.fields?.find(f => f.name === mapping.salesforceField && f.required);

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Salesforce Field
                            {isRequiredField && (
                              <span className="ml-1 text-red-500">*</span>
                            )}
                          </label>
                          <Select
                            value={fieldOptions.find((opt) => opt.value === mapping.salesforceField) || null}
                            onChange={(selected) => handleMappingChange(index, "salesforceField", selected ? selected.value : "")}
                            options={fieldOptions}
                            placeholder="Select Field"
                            styles={{
                              container: (base) => ({
                                ...base,
                                borderRadius: "0.375rem",
                                borderColor: "#e5e7eb",
                                fontSize: "0.875rem",
                              }),
                              control: (base) => ({
                                ...base,
                                minHeight: "34px",
                                backgroundColor: isRequiredField ? '#f5f5f5' : base.backgroundColor,
                              }),
                              placeholder: (base) => ({
                                ...base,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }),
                              menu: (base) => ({
                                ...base,
                                zIndex: 9999,
                              }),
                            }}
                            isDisabled={!selectedObject || isRequiredField}
                            isClearable={!isRequiredField}
                            classNamePrefix="select"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Form Field
                            {isRequiredField && (
                              <span className="ml-1 text-red-500">*</span>
                            )}
                          </label>
                          <Select
                            value={
                              mapping.picklistValue
                                ? {
                                  value: mapping.picklistValue,
                                  label: mapping.picklistValue,
                                  isPicklistValue: true
                                }
                                : safeFormFields.find(f => f.id === mapping.formFieldId || f.Unique_Key__c === mapping.formFieldId)
                                  ? {
                                    value: mapping.formFieldId,
                                    label: safeFormFields.find(f => f.id === mapping.formFieldId || f.Unique_Key__c === mapping.formFieldId).name || 'Unknown',
                                    isFormField: true,
                                    isSubField: !!safeFormFields.find(f => f.id === mapping.formFieldId || f.Unique_Key__c === mapping.formFieldId)?.parentFieldId
                                  }
                                  : null
                            }
                            onChange={(selected) => {
                              if (!selected) {
                                handleMappingChange(index, 'formFieldId', '', { fieldType: '' });
                                return;
                              }
                              if (selected.isPicklistValue) {
                                handleMappingChange(index, 'picklistValue', selected.value);
                              } else {
                                const field = safeFormFields.find(f => f.id === selected.value || f.Unique_Key__c === selected.value);
                                handleMappingChange(index, 'formFieldId', selected.value, { fieldType: field ? field.type : '' });
                              }
                            }}
                            options={formFieldOptions(index)}
                            placeholder={formFieldOptions(index).length ? "Select Form Field or Picklist Value" : "No Options Available"}
                            styles={{
                              container: (base) => ({
                                ...base,
                                borderRadius: "0.375rem",
                                borderColor: "#e5e7eb",
                                fontSize: "0.875rem",
                              }),
                              control: (base) => ({
                                ...base,
                                minHeight: "34px",
                              }),
                              placeholder: (base) => ({
                                ...base,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }),
                              menu: (base) => ({
                                ...base,
                                zIndex: 9999,
                              }),
                              groupHeading: (base) => ({
                                ...base,
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                color: '#1f2937',
                                backgroundColor: '#f9fafb',
                                padding: '8px 12px',
                                borderBottom: '1px solid #e5e7eb',
                              }),
                              option: (base, { data, isDisabled }) => ({
                                ...base,
                                backgroundColor: data.isPicklistValue ? '#f0f9ff' : (data.isSubField ? '#f3f4f6' : base.backgroundColor),
                                color: isDisabled ? '#ccc' : (data.isPicklistValue ? '#0369a1' : (data.isSubField ? '#374151' : base.color)),
                                paddingLeft: data.isSubField ? '24px' : '12px',
                                cursor: isDisabled ? 'not-allowed' : 'default',
                                ':active': {
                                  backgroundColor: !isDisabled && (data.isPicklistValue ? '#e0f2fe' : (data.isSubField ? '#e5e7eb' : base[':active'].backgroundColor)),
                                },
                                ':hover': {
                                  backgroundColor: !isDisabled && (data.isPicklistValue ? '#e0f2fe' : (data.isSubField ? '#e5e7eb' : '#f3f4f6')),
                                },
                              }),
                            }}
                            isClearable
                            isDisabled={!formFieldOptions(index).length}
                            classNamePrefix="select"
                            getOptionIsDisabled={(option) => option.isDisabled === true}
                            formatGroupLabel={(group) => (
                              <div className="flex items-center">
                                <span>{group.label}</span>
                              </div>
                            )}
                          />
                        </div>
                        {localMappings.length > 1 && !isRequiredField && (
                          <button
                            onClick={() => removeMapping(index)}
                            className="text-red-500 hover:text-red-700 mt-7"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {isRequiredField && (
                        <p className="text-xs text-gray-500 mt-1">This is a required field in Salesforce</p>
                      )}
                    </motion.div>
                  );
                })}
                <button
                  onClick={addMapping}
                  className="flex items-center justify-center w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-100 border border-blue-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={safeSalesforceObjects.length === 0 || !selectedObject}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add More Fields
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={enableConditions}
                    onChange={() => setEnableConditions(!enableConditions)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Conditions</span>
                </label>
              </div>

              {enableConditions && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {renderConditions("conditions")}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* {isFormatterNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Formatter Type</label>
                <Select
                  value={formatterTypes.find((opt) => opt.value === formatterConfig.formatType) || null}
                  onChange={(selected) => handleFormatterChange("formatType", selected ? selected.value : "date")}
                  options={formatterTypes}
                  placeholder="Select Formatter Type"
                  styles={{
                    container: (base) => ({
                      ...base,
                      borderRadius: "0.375rem",
                      borderColor: "#e5e7eb",
                      fontSize: "0.875rem",
                    }),
                    control: (base) => ({
                      ...base,
                      minHeight: "34px",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  classNamePrefix="select"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                <Select
                  value={formatterOperations[formatterConfig.formatType].find((opt) => opt.value === formatterConfig.operation) || null}
                  onChange={(selected) => handleFormatterChange("operation", selected ? selected.value : "")}
                  options={formatterOperations[formatterConfig.formatType]}
                  placeholder="Select Operation"
                  styles={{
                    container: (base) => ({
                      ...base,
                      borderRadius: "0.375rem",
                      borderColor: "#e5e7eb",
                      fontSize: "0.875rem",
                    }),
                    control: (base) => ({
                      ...base,
                      minHeight: "34px",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  isDisabled={!formatterConfig.formatType}
                  classNamePrefix="select"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Input Field</label>
                <Select
                  value={
                    safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField)
                      ? {
                        value: formatterConfig.inputField,
                        label: safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField).name || 'Unknown',
                        isFormField: true,
                        isSubField: !!safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField)?.parentFieldId
                      }
                      : null
                  }
                  onChange={(selected) => handleFormatterChange("inputField", selected ? selected.value : "")}
                  options={formFieldOptions()}
                  placeholder={formFieldOptions().length ? "Select Form Field" : "No Form Fields Available"}
                  styles={{
                    container: (base) => ({
                      ...base,
                      borderRadius: "0.375rem",
                      borderColor: "#e5e7eb",
                      fontSize: "0.875rem",
                    }),
                    control: (base) => ({
                      ...base,
                      minHeight: "34px",
                    }),
                    placeholder: (base) => ({
                      ...base,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                    groupHeading: (base) => ({
                      ...base,
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      color: '#1f2937',
                      backgroundColor: '#f9fafb',
                      padding: '8px 12px',
                      borderBottom: '1px solid #e5e7eb',
                    }),
                    option: (base, { data, isDisabled }) => ({
                      ...base,
                      backgroundColor: data.isSubField ? '#f3f4f6' : base.backgroundColor,
                      color: isDisabled ? '#ccc' : (data.isSubField ? '#374151' : base.color),
                      paddingLeft: data.isSubField ? '24px' : '12px',
                      cursor: isDisabled ? 'not-allowed' : 'default',
                      ':active': {
                        backgroundColor: !isDisabled && (data.isSubField ? '#e5e7eb' : base[':active'].backgroundColor),
                      },
                      ':hover': {
                        backgroundColor: !isDisabled && (data.isSubField ? '#e5e7eb' : '#f3f4f6'),
                      },
                    }),
                  }}
                  isClearable
                  classNamePrefix="select"
                  formatGroupLabel={(group) => (
                    <div className="flex items-center">
                      <span>{group.label}</span>
                    </div>
                  )}
                />
              </div>

              {(formatterConfig.operation === "date_difference" || formatterConfig.operation === "math_operation") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4"
                > 
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Second Input Field</label>
                    <Select
                      value={
                        safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2)
                          ? {
                            value: formatterConfig.inputField2,
                            label: safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2).name || 'Unknown',
                            isFormField: true,
                            isSubField: !!safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2)?.parentFieldId
                          }
                          : null
                      }
                      onChange={(selected) => handleFormatterChange("inputField2", selected ? selected.value : "")}
                      options={formFieldOptions()}
                      placeholder={formFieldOptions().length ? "Select Second Form Field" : "No Form Fields Available"}
                      styles={{
                        container: (base) => ({
                          ...base,
                          borderRadius: "0.375rem",
                          borderColor: "#e5e7eb",
                          fontSize: "0.875rem",
                        }),
                        control: (base) => ({
                          ...base,
                          minHeight: "34px",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                        groupHeading: (base) => ({
                          ...base,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          color: '#1f2937',
                          backgroundColor: '#f9fafb',
                          padding: '8px 12px',
                          borderBottom: '1px solid #e5e7eb',
                        }),
                        option: (base, { data, isDisabled }) => ({
                          ...base,
                          backgroundColor: data.isSubField ? '#f3f4f6' : base.backgroundColor,
                          color: isDisabled ? '#ccc' : (data.isSubField ? '#374151' : base.color),
                          paddingLeft: data.isSubField ? '24px' : '12px',
                          cursor: isDisabled ? 'not-allowed' : 'default',
                          ':active': {
                            backgroundColor: !isDisabled && (data.isSubField ? '#e5e7eb' : base[':active'].backgroundColor),
                          },
                          ':hover': {
                            backgroundColor: !isDisabled && (data.isSubField ? '#e5e7eb' : '#f3f4f6'),
                          },
                        }),
                      }}
                      isClearable
                      isDisabled={!formFieldOptions().length || formatterConfig.useCustomInput}
                      classNamePrefix="select"
                      formatGroupLabel={(group) => (
                        <div className="flex items-center">
                          <span>{group.label}</span>
                        </div>
                      )}
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formatterConfig.useCustomInput}
                        onChange={(e) => handleFormatterChange("useCustomInput", e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Use Custom Input</span>
                    </label>
                  </div>

                  {formatterConfig.useCustomInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {formatterConfig.operation === "date_difference" ? "Custom Compare Date" : "Custom Value"}
                      </label>
                      <input
                        type="text"
                        value={formatterConfig.customValue}
                        onChange={(e) => handleFormatterChange("customValue", e.target.value)}
                        placeholder={formatterConfig.operation === "date_difference" ? "e.g., 2025-06-20" : "e.g., 200"}
                        className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}

              {formatterConfig.formatType === "date" && formatterConfig.operation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {(formatterConfig.operation === "format_date") && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                        <Select
                          value={dateFormats.find((opt) => opt.value === formatterConfig.options.format) || null}
                          onChange={(selected) => handleFormatterOptionChange("format", selected ? selected.value : "")}
                          options={formatterConfig.operation === "format_date" ? dateFormats : dateTimeFormats}
                          placeholder="Select Date Format"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}

                   {(formatterConfig.operation === "format_datetime") && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                        <Select
                          value={dateFormats.find((opt) => opt.value === formatterConfig.options.format) || null}
                          onChange={(selected) => handleFormatterOptionChange("format", selected ? selected.value : "")}
                          options={formatterConfig.operation === "format_date" ? dateFormats : dateTimeFormats}
                          placeholder="Select Date Format"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}

                  {formatterConfig.operation === "format_time" && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                        <Select
                          value={timeFormats.find((opt) => opt.value === formatterConfig.options.format) || null}
                          onChange={(selected) => handleFormatterOptionChange("format", selected ? selected.value : "")}
                          options={timeFormats}
                          placeholder="Select Time Format"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}

                  {(formatterConfig.operation === "timezone_conversion" || formatterConfig.operation === "format_time" || formatterConfig.operation === "format_datetime") && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Source Timezone</label>
                        <Select
                          value={timezoneOptions.find((opt) => opt.value === formatterConfig.options.timezone) || null}
                          onChange={(selected) => handleFormatterOptionChange("timezone", selected ? selected.value : "")}
                          options={timezoneOptions}
                          placeholder="Select Source Timezone"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Timezone</label>
                        <Select
                          value={timezoneOptions.find((opt) => opt.value === formatterConfig.options.targetTimezone) || null}
                          onChange={(selected) => handleFormatterOptionChange("targetTimezone", selected ? selected.value : "")}
                          options={timezoneOptions}
                          placeholder="Select Target Timezone"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}

                  {(formatterConfig.operation === "add_date" || formatterConfig.operation === "subtract_date") && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <Select
                          value={[{ value: "days", label: "Days" }, { value: "months", label: "Months" }, { value: "years", label: "Years" }].find((opt) => opt.value === formatterConfig.options.unit) || null}
                          onChange={(selected) => handleFormatterOptionChange("unit", selected ? selected.value : "")}
                          options={[{ value: "days", label: "Days" }, { value: "months", label: "Months" }, { value: "years", label: "Years" }]}
                          placeholder="Select Unit"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                        <input
                          type="number"
                          value={formatterConfig.options.value || ""}
                          onChange={(e) => handleFormatterOptionChange("value", e.target.value)}
                          placeholder="e.g., 3"
                          className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {formatterConfig.formatType === "number" && formatterConfig.operation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {formatterConfig.operation === "locale_format" && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                      <Select
                        value={localeOptions.find((opt) => opt.value === formatterConfig.options.locale) || null}
                        onChange={(selected) => handleFormatterOptionChange("locale", selected ? selected.value : "")}
                        options={localeOptions}
                        placeholder="Select Locale"
                        styles={{
                          container: (base) => ({
                            ...base,
                            borderRadius: "0.375rem",
                            borderColor: "#e5e7eb",
                            fontSize: "0.875rem",
                          }),
                          control: (base) => ({
                            ...base,
                            minHeight: "34px",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999,
                          }),
                        }}
                        classNamePrefix="select"
                      />
                    </div>
                  )}
                  {formatterConfig.operation === "currency_format" && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <Select
                          value={currencyOptions.find((opt) => opt.value === formatterConfig.options.currency) || null}
                          onChange={(selected) => handleFormatterOptionChange("currency", selected ? selected.value : "")}
                          options={currencyOptions}
                          placeholder="Select Currency"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                        <Select
                          value={localeOptions.find((opt) => opt.value === formatterConfig.options.locale) || null}
                          onChange={(selected) => handleFormatterOptionChange("locale", selected ? selected.value : "")}
                          options={localeOptions}
                          placeholder="Select Locale"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}
                  {formatterConfig.operation === "round_number" && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Decimals</label>
                      <input
                        type="number"
                        value={formatterConfig.options.decimals || ""}
                        onChange={(e) => handleFormatterOptionChange("decimals", e.target.value)}
                        placeholder="e.g., 2"
                        className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  )}
                  {formatterConfig.operation === "phone_format" && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
                        <Select
                          value={countryOptions.find((opt) => opt.value === formatterConfig.options.countryCode) || null}
                          onChange={(selected) => handleFormatterOptionChange("countryCode", selected ? selected.value : "")}
                          options={countryOptions}
                          placeholder="Select Country Code"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                        <Select
                          value={phoneFormatOptions.find((opt) => opt.value === formatterConfig.options.format) || null}
                          onChange={(selected) => handleFormatterOptionChange("format", selected ? selected.value : "")}
                          options={phoneFormatOptions}
                          placeholder="Select Format"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}
                  {formatterConfig.operation === "math_operation" && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                      <Select
                        value={[{ value: "add", label: "Add" }, { value: "subtract", label: "Subtract" }, { value: "multiply", label: "Multiply" }, { value: "divide", label: "Divide" }].find((opt) => opt.value === formatterConfig.options.operation) || null}
                        onChange={(selected) => handleFormatterOptionChange("operation", selected ? selected.value : "")}
                        options={[{ value: "add", label: "Add" }, { value: "subtract", label: "Subtract" }, { value: "multiply", label: "Multiply" }, { value: "divide", label: "Divide" }]}
                        placeholder="Select Operation"
                        styles={{
                          container: (base) => ({
                            ...base,
                            borderRadius: "0.375rem",
                            borderColor: "#e5e7eb",
                            fontSize: "0.875rem",
                          }),
                          control: (base) => ({
                            ...base,
                            minHeight: "34px",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999,
                          }),
                        }}
                        classNamePrefix="select"
                      />
                    </div>
                  )}
                </motion.div>
              )}
              {formatterConfig.formatType === "text" && formatterConfig.operation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {formatterConfig.operation === "replace" && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Value</label>
                        <input
                          type="text"
                          value={formatterConfig.options.searchValue || ""}
                          onChange={(e) => handleFormatterOptionChange("searchValue", e.target.value)}
                          placeholder="Text to replace"
                          className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Replace Value</label>
                        <input
                          type="text"
                          value={formatterConfig.options.replaceValue || ""}
                          onChange={(e) => handleFormatterOptionChange("replaceValue", e.target.value)}
                          placeholder="Replacement text"
                          className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                  {formatterConfig.operation === "split" && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delimiter</label>
                        <input
                          type="text"
                          value={formatterConfig.options.delimiter || ""}
                          onChange={(e) => handleFormatterOptionChange("delimiter", e.target.value)}
                          placeholder="e.g., ,"
                          className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Index</label>
                        <Select
                          value={splitIndexOptions.find((opt) => opt.value === formatterConfig.options.index) || null}
                          onChange={(selected) => handleFormatterOptionChange("index", selected ? selected.value : "")}
                          options={splitIndexOptions}
                          placeholder="Select Index"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          )} */}

          {isFormatterNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Formatter Type</label>
                <Select
                  value={formatterTypes.find((opt) => opt.value === formatterConfig.formatType) || null}
                  onChange={(selected) => handleFormatterChange("formatType", selected ? selected.value : "date")}
                  options={formatterTypes}
                  placeholder="Select Formatter Type"
                  styles={{
                    container: (base) => ({
                      ...base,
                      borderRadius: "0.375rem",
                      borderColor: "#e5e7eb",
                      fontSize: "0.875rem",
                    }),
                    control: (base) => ({
                      ...base,
                      minHeight: "34px",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  classNamePrefix="select"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                <Select
                  value={
                    formatterOperations[formatterConfig.formatType]
                      .filter(opt => {
                        const compatibleTypes = operationFieldTypeCompatibility[formatterConfig.formatType]?.[opt.value] || [];
                        const selectedField = safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField);
                        return !selectedField || compatibleTypes.includes(selectedField.type);
                      })
                      .find((opt) => opt.value === formatterConfig.operation) || null
                  }
                  onChange={(selected) => handleFormatterChange("operation", selected ? selected.value : "")}
                  options={formatterOperations[formatterConfig.formatType].filter(opt => {
                    const compatibleTypes = operationFieldTypeCompatibility[formatterConfig.formatType]?.[opt.value] || [];
                    const selectedField = safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField);
                    return !selectedField || compatibleTypes.includes(selectedField.type);
                  })}
                  placeholder="Select Operation"
                  styles={{
                    container: (base) => ({
                      ...base,
                      borderRadius: "0.375rem",
                      borderColor: "#e5e7eb",
                      fontSize: "0.875rem",
                    }),
                    control: (base) => ({
                      ...base,
                      minHeight: "34px",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  isDisabled={!formatterConfig.formatType}
                  classNamePrefix="select"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Input Field</label>
                <Select
                  value={
                    safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField)
                      ? {
                        value: formatterConfig.inputField,
                        label: safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField).name || 'Unknown',
                        isFormField: true,
                        isSubField: !!safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField)?.parentFieldId,
                      }
                      : null
                  }
                  onChange={(selected) => handleFormatterChange("inputField", selected ? selected.value : "")}
                  options={formFieldOptions()}
                  placeholder={formFieldOptions().length ? "Select Form Field" : "No Form Fields Available"}
                  styles={{
                    container: (base) => ({
                      ...base,
                      borderRadius: "0.375rem",
                      borderColor: "#e5e7eb",
                      fontSize: "0.875rem",
                    }),
                    control: (base) => ({
                      ...base,
                      minHeight: "34px",
                    }),
                    placeholder: (base) => ({
                      ...base,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                    groupHeading: (base) => ({
                      ...base,
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      color: '#1f2937',
                      backgroundColor: '#f9fafb',
                      padding: '8px 12px',
                      borderBottom: '1px solid #e5e7eb',
                    }),
                    option: (base, { data, isDisabled }) => ({
                      ...base,
                      backgroundColor: data.isSubField ? '#f3f4f6' : base.backgroundColor,
                      color: isDisabled ? '#ccc' : (data.isSubField ? '#374151' : base.color),
                      paddingLeft: data.isSubField ? '24px' : '12px',
                      cursor: isDisabled ? 'not-allowed' : 'default',
                      ':active': {
                        backgroundColor: !isDisabled && (data.isSubField ? '#e5e7eb' : base[':active'].backgroundColor),
                      },
                      ':hover': {
                        backgroundColor: !isDisabled && (data.isSubField ? '#e5e7eb' : '#f3f4f6'),
                      },
                    }),
                  }}
                  isClearable
                  classNamePrefix="select"
                  formatGroupLabel={(group) => (
                    <div className="flex items-center">
                      <span>{group.label}</span>
                    </div>
                  )}
                />
              </div>

              {(formatterConfig.operation === "date_difference" || formatterConfig.operation === "math_operation") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4"
                >
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Second Input Field</label>
                    <Select
                      value={
                        safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2)
                          ? {
                            value: formatterConfig.inputField2,
                            label: safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2).name || 'Unknown',
                            isFormField: true,
                            isSubField: !!safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2)?.parentFieldId,
                          }
                          : null
                      }
                      onChange={(selected) => handleFormatterChange("inputField2", selected ? selected.value : "")}
                      options={formFieldOptions(undefined, true)}
                      placeholder={formFieldOptions(undefined, true).length ? "Select Second Form Field" : "No Form Fields Available"}
                      styles={{
                        container: (base) => ({
                          ...base,
                          borderRadius: "0.375rem",
                          borderColor: "#e5e7eb",
                          fontSize: "0.875rem",
                        }),
                        control: (base) => ({
                          ...base,
                          minHeight: "34px",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                        groupHeading: (base) => ({
                          ...base,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          color: '#1f2937',
                          backgroundColor: '#f9fafb',
                          padding: '8px 12px',
                          borderBottom: '1px solid #e5e7eb',
                        }),
                        option: (base, { data, isDisabled }) => ({
                          ...base,
                          backgroundColor: data.isSubField ? '#f3f4f6' : base.backgroundColor,
                          color: isDisabled ? '#ccc' : (data.isSubField ? '#374151' : base.color),
                          paddingLeft: data.isSubField ? '24px' : '12px',
                          cursor: isDisabled ? 'not-allowed' : 'default',
                          ':active': {
                            backgroundColor: !isDisabled && (data.isSubField ? '#e5e7eb' : base[':active'].backgroundColor),
                          },
                          ':hover': {
                            backgroundColor: !isDisabled && (data.isSubField ? '#e5e7eb' : '#f3f4f6'),
                          },
                        }),
                      }}
                      isClearable
                      isDisabled={!formFieldOptions(undefined, true).length || formatterConfig.useCustomInput}
                      classNamePrefix="select"
                      formatGroupLabel={(group) => (
                        <div className="flex items-center">
                          <span>{group.label}</span>
                        </div>
                      )}
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formatterConfig.useCustomInput}
                        onChange={(e) => handleFormatterChange("useCustomInput", e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Use Custom Input</span>
                    </label>
                  </div>

                  {formatterConfig.useCustomInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {formatterConfig.operation === "date_difference" ? "Custom Compare Date" : "Custom Value"}
                      </label>
                      <input
                        type="text"
                        value={formatterConfig.customValue}
                        onChange={(e) => handleFormatterChange("customValue", e.target.value)}
                        placeholder={formatterConfig.operation === "date_difference" ? "e.g., 2025-06-20" : "e.g., 200"}
                        className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}

              {formatterConfig.formatType === "date" && formatterConfig.operation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {(formatterConfig.operation === "format_date" || formatterConfig.operation === "format_datetime") && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                      <Select
                        value={dateFormats.find((opt) => opt.value === formatterConfig.options.format) || null}
                        onChange={(selected) => handleFormatterOptionChange("format", selected ? selected.value : "")}
                        options={formatterConfig.operation === "format_date" ? dateFormats : dateTimeFormats}
                        placeholder="Select Date Format"
                        styles={{
                          container: (base) => ({
                            ...base,
                            borderRadius: "0.375rem",
                            borderColor: "#e5e7eb",
                            fontSize: "0.875rem",
                          }),
                          control: (base) => ({
                            ...base,
                            minHeight: "34px",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999,
                          }),
                        }}
                        classNamePrefix="select"
                      />
                    </div>
                  )}

                  {formatterConfig.operation === "format_time" && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                      <Select
                        value={timeFormats.find((opt) => opt.value === formatterConfig.options.format) || null}
                        onChange={(selected) => handleFormatterOptionChange("format", selected ? selected.value : "")}
                        options={timeFormats}
                        placeholder="Select Time Format"
                        styles={{
                          container: (base) => ({
                            ...base,
                            borderRadius: "0.375rem",
                            borderColor: "#e5e7eb",
                            fontSize: "0.875rem",
                          }),
                          control: (base) => ({
                            ...base,
                            minHeight: "34px",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999,
                          }),
                        }}
                        classNamePrefix="select"
                      />
                    </div>
                  )}

                  {(formatterConfig.operation === "timezone_conversion" || formatterConfig.operation === "format_time" || formatterConfig.operation === "format_datetime") && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Source Timezone</label>
                        <Select
                          value={timezoneOptions.find((opt) => opt.value === formatterConfig.options.timezone) || null}
                          onChange={(selected) => handleFormatterOptionChange("timezone", selected ? selected.value : "")}
                          options={timezoneOptions}
                          placeholder="Select Source Timezone"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Timezone</label>
                        <Select
                          value={timezoneOptions.find((opt) => opt.value === formatterConfig.options.targetTimezone) || null}
                          onChange={(selected) => handleFormatterOptionChange("targetTimezone", selected ? selected.value : "")}
                          options={timezoneOptions}
                          placeholder="Select Target Timezone"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}

                  {(formatterConfig.operation === "add_date" || formatterConfig.operation === "subtract_date") && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <Select
                          value={[{ value: "days", label: "Days" }, { value: "months", label: "Months" }, { value: "years", label: "Years" }].find((opt) => opt.value === formatterConfig.options.unit) || null}
                          onChange={(selected) => handleFormatterOptionChange("unit", selected ? selected.value : "")}
                          options={[{ value: "days", label: "Days" }, { value: "months", label: "Months" }, { value: "years", label: "Years" }]}
                          placeholder="Select Unit"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                        <input
                          type="number"
                          value={formatterConfig.options.value || ""}
                          onChange={(e) => handleFormatterOptionChange("value", e.target.value)}
                          placeholder="e.g., 3"
                          className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {formatterConfig.formatType === "number" && formatterConfig.operation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {formatterConfig.operation === "locale_format" && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                      <Select
                        value={localeOptions.find((opt) => opt.value === formatterConfig.options.locale) || null}
                        onChange={(selected) => handleFormatterOptionChange("locale", selected ? selected.value : "")}
                        options={localeOptions}
                        placeholder="Select Locale"
                        styles={{
                          container: (base) => ({
                            ...base,
                            borderRadius: "0.375rem",
                            borderColor: "#e5e7eb",
                            fontSize: "0.875rem",
                          }),
                          control: (base) => ({
                            ...base,
                            minHeight: "34px",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999,
                          }),
                        }}
                        classNamePrefix="select"
                      />
                    </div>
                  )}
                  {formatterConfig.operation === "currency_format" && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <Select
                          value={currencyOptions.find((opt) => opt.value === formatterConfig.options.currency) || null}
                          onChange={(selected) => handleFormatterOptionChange("currency", selected ? selected.value : "")}
                          options={currencyOptions}
                          placeholder="Select Currency"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                        <Select
                          value={localeOptions.find((opt) => opt.value === formatterConfig.options.locale) || null}
                          onChange={(selected) => handleFormatterOptionChange("locale", selected ? selected.value : "")}
                          options={localeOptions}
                          placeholder="Select Locale"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}
                  {formatterConfig.operation === "round_number" && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Decimals</label>
                      <input
                        type="number"
                        value={formatterConfig.options.decimals || ""}
                        onChange={(e) => handleFormatterOptionChange("decimals", e.target.value)}
                        placeholder="e.g., 2"
                        className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  )}
                  {formatterConfig.operation === "phone_format" && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
                        <Select
                          value={countryOptions.find((opt) => opt.value === formatterConfig.options.countryCode) || null}
                          onChange={(selected) => handleFormatterOptionChange("countryCode", selected ? selected.value : "")}
                          options={countryOptions}
                          placeholder="Select Country Code"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                        <Select
                          value={phoneFormatOptions.find((opt) => opt.value === formatterConfig.options.format) || null}
                          onChange={(selected) => handleFormatterOptionChange("format", selected ? selected.value : "")}
                          options={phoneFormatOptions}
                          placeholder="Select Format"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}
                  {formatterConfig.operation === "math_operation" && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                      <Select
                        value={[{ value: "add", label: "Add" }, { value: "subtract", label: "Subtract" }, { value: "multiply", label: "Multiply" }, { value: "divide", label: "Divide" }].find((opt) => opt.value === formatterConfig.options.operation) || null}
                        onChange={(selected) => handleFormatterOptionChange("operation", selected ? selected.value : "")}
                        options={[{ value: "add", label: "Add" }, { value: "subtract", label: "Subtract" }, { value: "multiply", label: "Multiply" }, { value: "divide", label: "Divide" }]}
                        placeholder="Select Operation"
                        styles={{
                          container: (base) => ({
                            ...base,
                            borderRadius: "0.375rem",
                            borderColor: "#e5e7eb",
                            fontSize: "0.875rem",
                          }),
                          control: (base) => ({
                            ...base,
                            minHeight: "34px",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999,
                          }),
                        }}
                        classNamePrefix="select"
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {formatterConfig.formatType === "text" && formatterConfig.operation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {formatterConfig.operation === "replace" && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Value</label>
                        <input
                          type="text"
                          value={formatterConfig.options.searchValue || ""}
                          onChange={(e) => handleFormatterOptionChange("searchValue", e.target.value)}
                          placeholder="Text to replace"
                          className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Replace Value</label>
                        <input
                          type="text"
                          value={formatterConfig.options.replaceValue || ""}
                          onChange={(e) => handleFormatterOptionChange("replaceValue", e.target.value)}
                          placeholder="Replacement text"
                          className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                  {formatterConfig.operation === "split" && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delimiter</label>
                        <input
                          type="text"
                          value={formatterConfig.options.delimiter || ""}
                          onChange={(e) => handleFormatterOptionChange("delimiter", e.target.value)}
                          placeholder="e.g., ,"
                          className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Index</label>
                        <Select
                          value={splitIndexOptions.find((opt) => opt.value === formatterConfig.options.index) || null}
                          onChange={(selected) => handleFormatterOptionChange("index", selected ? selected.value : "")}
                          options={splitIndexOptions}
                          placeholder="Select Index"
                          styles={{
                            container: (base) => ({
                              ...base,
                              borderRadius: "0.375rem",
                              borderColor: "#e5e7eb",
                              fontSize: "0.875rem",
                            }),
                            control: (base) => ({
                              ...base,
                              minHeight: "34px",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          classNamePrefix="select"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={saveLocalMappings}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ActionPanel;