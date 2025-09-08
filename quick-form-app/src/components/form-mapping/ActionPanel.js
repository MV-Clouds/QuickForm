import { useState, useEffect } from "react";
import Select from "react-select";
import { getCountryList } from "../form-builder-with-versions/getCountries";
import { motion, AnimatePresence } from "framer-motion";
import timezones from "timezones-list";
import countries from "i18n-iso-countries";
import currencyCodes from "currency-codes";
import { ArrowRightOutlined } from "@ant-design/icons";
import CreatableSelect from "react-select/creatable";
import ToggleSwitch from "../form-builder-with-versions/ToggleSwitch";
import { Select as AntSelect, Spin, Button, message, Input, Switch } from "antd";
const { Option, OptGroup } = AntSelect;
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

const validateCustomLogic = (logic, conditionsLength) => {
  // Tokenize input
  const tokens = logic
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");

  let errors = [];

  // Validate individual tokens
  tokens.forEach((token, i) => {
    if (/^\d+$/.test(token)) {
      const num = parseInt(token, 10);
      if (num < 1 || num > conditionsLength) {
        errors.push(`Condition ${num} does not exist.`);
      }
    } else if (!["AND", "OR", "(", ")", ""].includes(token)) {
      errors.push(`Invalid token "${token}"`);
    }
  });

  // Check for invalid operator sequences
  for (let i = 0; i < tokens.length - 1; i++) {
    if (
      ["AND", "OR"].includes(tokens[i]) &&
      ["AND", "OR"].includes(tokens[i + 1])
    ) {
      errors.push(`Operators '${tokens[i]}' and '${tokens[i + 1]}' cannot be together—must be separated by a condition.`);
    }
  }

  // Check brackets balance
  let balance = 0;
  for (let ch of logic) {
    if (ch === "(") balance++;
    else if (ch === ")") balance--;
    if (balance < 0) {
      errors.push("Too many closing brackets");
      break;
    }
  }
  if (balance > 0) errors.push("Unclosed brackets");

  // Optionally check if logic starts/ends with AND/OR (which is usually invalid)
  if (["AND", "OR"].includes(tokens[0])) {
    errors.push("Logic cannot start with an operator.");
  }
  if (["AND", "OR"].includes(tokens[tokens.length - 1])) {
    errors.push("Logic cannot end with an operator.");
  }

  return errors;
};

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
  setNodeLabel,
  nodes,
  edges,
  sfToken
}) => {
  const isFindNode = nodeType === "Find";
  const isCreateUpdateNode = nodeType === "Create/Update";
  const isPathNode = nodeType === "Path";
  const isLoopNode = nodeType === "Loop";
  const isFormatterNode = nodeType === "Formatter";
  const isFilterNode = nodeType === "Filter";
  const isConditionNode = nodeType === "Condition";
  const isGoogleSheet = nodeType === 'Google Sheet'
  const isFindGoogleSheet = nodeType === 'FindGoogleSheet'
  // const [selectedObject, setSelectedObject] = useState("");
  const selectedObject = mappings[nodeId]?.salesforceObject || "";

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
  const [sheetName, setSheetName] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState();
  const [sheetLink, setSheetLink] = useState("");
  const [fieldMappings, setFieldMappings] = useState([]);
  const [sheetConditions, setsheetConditions] = useState([]);
  const [conditionsLogic, setConditionsLogic] = useState('AND');
  const [sheetcustomLogic, setsheetCustomLogic] = useState(''); // custom logic string e.g. "(1 AND 2) OR 3"
  const instanceUrl = sessionStorage.getItem('instanceUrl');
  const userId = sessionStorage.getItem('userId');
  const [updateMultiple, setUpdateMultiple] = useState(false); // New state variable
  const [findsortField, setfindsortfield] = useState('')
  const [findsortOrder, setfindsortOrder] = useState('ASC');
  const [findreturnLimit, setfindreturnLimit] = useState("");
  const [findSheetConditions, setFindSheetConditions] = useState([]); // New state for FindGoogleSheet conditions
  const [findConditionsLogic, setFindConditionsLogic] = useState('AND'); // New state for FindGoogleSheet conditions logic
  const [findSheetCustomLogic, setFindSheetCustomLogic] = useState(''); // New state for FindGoogleSheet custom logic
  const [findSpreadsheetId, setFindSpreadsheetId] = useState(''); // New state for FindGoogleSheet spreadsheetId
  const [findSelectedSheetName, setFindSelectedSheetName] = useState(''); // New state for FindGoogleSheet selectedSheetName
  const [findUpdateMultiple, setFindUpdateMultiple] = useState(false); // New state for FindGoogleSheet updateMultiple
  const [findGoogleSheetColumns, setFindGoogleSheetColumns] = useState([]); // New state for FindGoogleSheet columns
  const [customLabel, setCustomLabel] = useState(nodeLabel || mappings[nodeId]?.label || "");
  const [storeAsContentDocument, setStoreAsContentDocument] = useState(false);
  const [selectedFileUploadFields, setSelectedFileUploadFields] = useState([]);

  const [accordionOpen, setAccordionOpen] = useState({
    variables: false,
    iterations: false,
    exitConditions: false,
    returnLimit: false,
    sortRecords: false
  });

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

  const selectedFindNode = mappings[nodeId]?.selectedFindNode || "";

  // Clear error state when switching nodes to prevent stale messages
  useEffect(() => {
    setSaveError(null);
  }, [nodeId]);

  useEffect(() => {
    // Load node-specific mappings if they exist
    const nodeMapping = mappings[nodeId] || {};

    setLocalMappings(
      nodeMapping.fieldMappings?.length > 0
        ? nodeMapping.fieldMappings.filter((fm) => fm && (fm.salesforceField || fm.formFieldId))
        : [{ formFieldId: "", fieldType: "", salesforceField: "" }]
    );
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
    setFieldMappings(nodeMapping?.fieldMappings || []);
    setSheetName(nodeMapping?.selectedSheetName || "");
    setSpreadsheetId(nodeMapping?.spreadsheetId || "")
    setsheetConditions(nodeMapping?.sheetConditions || []);
    setConditionsLogic(nodeMapping?.conditionsLogic || 'AND');
    setsheetCustomLogic(nodeMapping?.sheetcustomLogic || '');
    const loopConfig = nodeMapping.loopConfig || {};
    setCurrentItemVariableName(loopConfig.currentItemVariableName || "item");
    setLoopVariables(loopConfig.loopVariables || { currentIndex: false, indexBase: "0", counter: false });
    setMaxIterations(loopConfig.maxIterations || "");
    setExitConditions(
      loopConfig.exitConditions?.length > 0
        ? loopConfig.exitConditions.map(c => ({ ...c, logic: undefined }))
        : [{ field: "", operator: "=", value: "", value2: "" }]
    );

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
      .filter((node) => node.data.action === "Find" || node.data.action === 'FindGoogleSheet')
      .map((node) => node.id);

    // Handle loop collection
    if (isLoopNode) {
      const loopConfig = nodeMapping.loopConfig || {};
      if (loopConfig.loopCollection && validCollectionOptions.includes(loopConfig.loopCollection)) {
        setLoopCollection(loopConfig.loopCollection);
      } else {
        setLoopCollection("");
        if (loopConfig.loopCollection) {
          setSaveError("Selected loop collection is no longer valid. Please select a valid Find node.");
        }
      }
    }
    setUpdateMultiple(nodeMapping.updateMultiple || false); // Initialize updateMultiple
    // Initialize FindGoogleSheet specific states
    setfindreturnLimit(nodeMapping.googleSheetReturnLimit || "");
    setfindsortOrder(nodeMapping.googleSheetSortOrder || "ASC");
    setfindsortfield(nodeMapping.googleSheetSortField || "");
    setFindSheetConditions(nodeMapping.findSheetConditions || []);
    setFindConditionsLogic(nodeMapping.logicType || "AND");
    setFindSheetCustomLogic(nodeMapping.customLogic || "");
    setFindSpreadsheetId(nodeMapping.spreadsheetId || "");
    setFindSelectedSheetName(nodeMapping.selectedSheetName || "");
    setFindUpdateMultiple(nodeMapping.updateMultiple || false);
    setFindGoogleSheetColumns(nodeMapping.columns || []); // Initialize FindGoogleSheet columns
    setCustomLabel((mappings[nodeId]?.label ?? nodeLabel) || "");
    setStoreAsContentDocument(nodeMapping.storeAsContentDocument || false);
    setSelectedFileUploadFields(nodeMapping.selectedFileUploadFields || []);
  }, [nodeId, mappings, nodeLabel, nodes, edges, setMappings, isFindNode, isFilterNode, isCreateUpdateNode, isConditionNode]);

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
  }, [selectedObject]);

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

  const operationOptions = [
    { value: "add", label: "Add" },
    { value: "subtract", label: "Subtract" },
    { value: "multiply", label: "Multiply" },
    { value: "divide", label: "Divide" },
  ];

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

  const handleLabelBlur = () => {
    const val = (customLabel || "").trim();
    if (setNodeLabel) setNodeLabel(nodeId, val || undefined);
    setMappings(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], label: val || undefined },
    }));
  };

  const handleMappingChange = (index, key, value, extra = {}) => {
    const newMappings = [...localMappings];
    const currentMapping = newMappings[index];

    console.log(`handleMappingChange called with index=${index}, key=${key}, value=${value}`);
    console.log(`Current mapping before change:`, currentMapping);
    console.log('localmapping ', localMappings);

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
    console.log(`handleConditionChange called with index=${index}, key=${key}, value=${value}`);

    const setState = conditionType === "exitConditions" ? setExitConditions : setConditions;
    setState((prev) =>
      prev.map((condition, i) => (i === index ? { ...condition, [key]: value } : condition))
    );
  };

  const handleFindNodeChange = (selected, isLoop = false) => {
    const findNodeId = typeof selected === "string" ? selected : (selected && typeof selected === "object" && "value" in selected ? selected.value : "");
    console.log('isLoop:', isLoop, 'findNodeId:', findNodeId);

    if (isLoop) {
      console.log('Setting loop collection to:', findNodeId);

      setLoopCollection(findNodeId);
      // Update mappings state for loop collection
      setMappings((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          loopConfig: {
            ...(prev[nodeId]?.loopConfig || {}),
            loopCollection: findNodeId,
          },
        },
      }));
    } else {
      setMappings((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          selectedFindNode: findNodeId,
        },
      }));
    }

    // Get the Salesforce object from the selected Find node
    if (!findNodeId) {
      setSaveError(null);
      handleObjectChange("");
      return;
    }
    if (mappings[findNodeId]?.salesforceObject) {
      setSaveError(null);
      handleObjectChange(mappings[findNodeId].salesforceObject);
    } else {
      setSaveError("Selected Find node has no Salesforce object configured. Open and save that Find node first.");
    }
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

  const handleObjectChange = (objectName) => {
    setMappings((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        salesforceObject: objectName,
      },
    }));
  };

  const handleObjectSelect = (selectedOption) => {
    if (!selectedOption) {
      handleObjectChange("");
      setLocalMappings([{ formFieldId: "", fieldType: "", salesforceField: "" }]);
      setSaveError(null);
      return;
    }

    const selectedObjectName = selectedOption.value;

    handleObjectChange(selectedObjectName);
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
    .filter((node) => node.data.action === "Find" || node.data.action === 'FindGoogleSheet')
    .map((node) => ({
      value: node.id,
      label: `${node.data.label}`,
    }));

  const validateSave = (localMappings, conditions, exitConditions) => {
    // Common validations for all node types
    if (logicType === "Custom" && !customLogic) {
      return { error: "Please provide a custom logic expression." };
    }

    // Filter specific validations
    if (isFilterNode) {
      if (!selectedFindNode) {
        return { error: "Please select a Find node." };
      }
    }

    // Create Update node validations
    if (isCreateUpdateNode) {
      if (selectedObject) {
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
          return { error: `Please map all required fields: ${missingRequiredFields.map(f => f.label || f.name).join(', ')}` };
        }
      }

      const validMappings = localMappings.filter((m) => {
        if (!m.salesforceField) return false;
        return m.formFieldId || m.picklistValue;
      });

      if (validMappings.length !== localMappings.length) {
        return { error: "Some field mappings have type mismatches. Please correct them before saving." };
      }

      if (validMappings.length === 0) {
        return { error: "Please add at least one complete mapping." };
      }

      if (storeAsContentDocument && selectedFileUploadFields.length === 0) {
        return { error: "Please select at least one file upload field for Content Document storage" };
      }
    }

    // Loop node validations
    if (isLoopNode) {
      if (!loopCollection) {
        return { error: "Please provide a loop collection." };
      }

      if (maxIterations && (isNaN(maxIterations) || maxIterations < 1)) {
        return { error: "Max iterations must be a positive number." };
      }

      const validCollectionOptions = getAncestorNodes(nodeId, edges, nodes)
        .filter((node) => node.data.action === "Find")
        .map((node) => node.id);
      if (loopCollection && !validCollectionOptions.includes(loopCollection)) {
        return { error: `Invalid loop collection: ${loopCollection}. Please select a valid Find node.` };
      }
    }

    // Find and Filter node validations
    if (isFindNode || isFilterNode) {
      if (returnLimit && (isNaN(returnLimit) || returnLimit < 1 || returnLimit > 100)) {
        return { error: "Return limit must be a number between 1 and 100." };
      }
    }

    // Condition node validations
    if (isConditionNode) {
      if (pathOption === "Rules" && conditions.length === 0) {
        return { error: "Please add at least one complete condition for Condition node." };
      }
    }

    // Formatter node validations
    if (isFormatterNode) {
      if (!formatterConfig.inputField || !formatterConfig.operation) {
        console.log("Validation failed: Missing inputField or operation");
        return { error: "Please provide input field and operation." };
      }

      // Validate input field type compatibility
      const selectedField = safeFormFields.find(f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField);
      if (selectedField) {
        const compatibleTypes = operationFieldTypeCompatibility[formatterConfig.formatType]?.[formatterConfig.operation] || [];
        if (compatibleTypes.length > 0 && !compatibleTypes.includes(selectedField.type)) {
          return { error: `Selected input field type (${selectedField.type}) is not compatible with operation ${formatterConfig.operation}.` };
        }
      }

      // Date format validations
      if (formatterConfig.formatType === "date") {
        if (formatterConfig.operation === "format_date" && !formatterConfig.options.format) {
          return { error: "Please provide date format." };
        }
        if ((formatterConfig.operation === "format_time" || formatterConfig.operation === "format_datetime") && (!formatterConfig.options.format || !formatterConfig.options.timezone)) {
          return { error: "Please provide format and timezone." };
        }
        if (formatterConfig.operation === "timezone_conversion" && (!formatterConfig.options.timezone || !formatterConfig.options.targetTimezone)) {
          return { error: "Please provide source and target timezone." };
        }
        if ((formatterConfig.operation === "add_date" || formatterConfig.operation === "subtract_date") && (!formatterConfig.options.unit || formatterConfig.options.value === undefined)) {
          return { error: "Please provide date unit and value." };
        }
        if (formatterConfig.operation === "date_difference") {
          if (!formatterConfig.useCustomInput && !formatterConfig.inputField2) {
            return { error: "Please provide a second input field or enable custom input." };
          }
          if (formatterConfig.useCustomInput && !formatterConfig.customValue) {
            return { error: "Please provide a custom compare date." };
          }
          if (formatterConfig.inputField2) {
            const secondField = safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2);
            if (secondField) {
              const compatibleTypes = operationFieldTypeCompatibility[formatterConfig.formatType]?.[formatterConfig.operation] || [];
              if (compatibleTypes.length > 0 && !compatibleTypes.includes(secondField.type)) {
                return { error: `Second input field type (${secondField.type}) is not compatible with operation ${formatterConfig.operation}.` };
              }
            }
          }
        }
      }

      // Number format validations
      if (formatterConfig.formatType === "number") {
        if (formatterConfig.operation === "locale_format" && !formatterConfig.options.locale) {
          return { error: "Please provide locale." };
        }
        if (formatterConfig.operation === "currency_format" && (!formatterConfig.options.currency || !formatterConfig.options.locale)) {
          return { error: "Please provide currency and locale." };
        }
        if (formatterConfig.operation === "round_number") {
          const decimals = formatterConfig.options.decimals;

          // Check if decimals is undefined, null, or not a number
          if (decimals === undefined || decimals === null || isNaN(decimals)) {
            return { error: "Please provide number of decimals." };
          }

          // Check if decimals is within valid range
          if (decimals < 0 || decimals > 15) {
            return { error: "Decimals must be between 0 and 15." };
          }
        }
        if (formatterConfig.operation === "phone_format" && (!formatterConfig.options.countryCode || !formatterConfig.options.format)) {
          return { error: "Please provide country code and format." };
        }
        if (formatterConfig.operation === "math_operation") {
          if (!formatterConfig.useCustomInput && !formatterConfig.inputField2) {
            return { error: "Please provide a second input field or enable custom input." };
          }
          if (formatterConfig.useCustomInput && formatterConfig.customValue === undefined) {
            return { error: "Please provide a custom value." };
          }
          if (!formatterConfig.options.operation) {
            return { error: "Please provide math operation." };
          }
          if (formatterConfig.inputField2) {
            const secondField = safeFormFields.find(f => f.id === formatterConfig.inputField2 || f.Unique_Key__c === formatterConfig.inputField2);
            if (secondField) {
              const compatibleTypes = operationFieldTypeCompatibility[formatterConfig.formatType]?.[formatterConfig.operation] || [];
              if (compatibleTypes.length > 0 && !compatibleTypes.includes(secondField.type)) {
                return { error: `Second input field type (${secondField.type}) is not compatible with operation ${formatterConfig.operation}.` };
              }
            }
          }
        }
      }

      // Text format validations
      if (formatterConfig.formatType === "text") {
        if (formatterConfig.operation === "replace" && (!formatterConfig.options.searchValue || !formatterConfig.options.replaceValue)) {
          return { error: "Please provide search and replace values." };
        }
        if (formatterConfig.operation === "split" && (!formatterConfig.options.delimiter || !formatterConfig.options.index)) {
          return { error: "Please provide delimiter and index." };
        }
      }
    }

    // Conditions validation for multiple node types
    const validConditions = conditions.filter((c) =>
      c.field &&
      c.operator &&
      (["IS NULL", "IS NOT NULL"].includes(c.operator) || (c.operator === "BETWEEN" ? c.value && c.value2 : c.value))
    );

    // Exit conditions validation (primarily for Loop nodes)
    const validExitConditions = exitConditions.filter((c) =>
      c.field &&
      c.operator &&
      (["IS NULL", "IS NOT NULL"].includes(c.operator) || (c.operator === "BETWEEN" ? c.value && c.value2 : c.value))
    );

    if ((isFindNode || isFilterNode || (isCreateUpdateNode && enableConditions) || (isConditionNode && pathOption === "Rules")) && validConditions.length === 0) {
      return { error: "Please add at least one complete condition." };
    }

    // Google Sheets validations
    if (isGoogleSheet) {
      if (!sheetName) {
        return { error: "Please provide a sheet name." };
      }
      if (fieldMappings.some(m => !m.column || !m.id)) {
        return { error: "Please map all columns and form fields." };
      }
      const columnNames = fieldMappings.map(m => m.column);
      if (new Set(columnNames).size !== columnNames.length) {
        return { error: "Sheet column names must be unique." };
      }
    }

    // FindGoogleSheet validations
    if (isFindGoogleSheet) {
      if (!findSpreadsheetId) {
        return { error: "Please select a Google Sheet." };
      }
      if (findreturnLimit && (isNaN(findreturnLimit) || findreturnLimit < 1 || findreturnLimit > 100)) {
        return { error: "Return Limit must be a number between 1 and 100." };
      }
    }

    // If we reach here, validation passed
    const validMappings = isCreateUpdateNode ? localMappings.filter((m) => {
      if (!m.salesforceField) return false;
      return m.formFieldId || m.picklistValue;
    }) : [];

    return { validMappings, validConditions, validExitConditions, error: null };
  };

  const saveLocalMappings = () => {
    console.log("Saving mappings for node:", nodeId, "Formatter Config:", formatterConfig);

    // Validate using the separate validation function
    const validationResult = validateSave(localMappings, conditions, exitConditions);

    if (validationResult.error) {
      setSaveError(validationResult.error);
      return;
    }

    // Extract the validated data
    const { validMappings, validConditions, validExitConditions } = validationResult;

    const loopConfig = isLoopNode
      ? {
        loopCollection,
        currentItemVariableName,
        ...(loopVariables.currentIndex || loopVariables.counter ? { loopVariables } : {}),
        ...(maxIterations ? { maxIterations } : {}),
        ...(validExitConditions.length > 0 ? { exitConditions: validExitConditions } : {}),
      }
      : undefined;

    const incomingEdge = edges.find((e) => e.target === nodeId);
    const previousNodeId = incomingEdge?.source;
    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    const nextNodeIds = outgoingEdges.map((e) => e.target).filter((id, index, self) => self.indexOf(id) === index);

    // Add Google Sheets specific data to the mappings
    const googleSheetData = isGoogleSheet ? {
      selectedSheetName: sheetName,
      fieldMappings,
      spreadsheetId,
      sheetConditions,
      conditionsLogic,
      sheetcustomLogic,
      updateMultiple,
      googleSheetReturnLimit: returnLimit,
      googleSheetSortField: sortField,
      googleSheetSortOrder: sortOrder,
    } : {};

    const findGoogleSheetData = isFindGoogleSheet ? {
      selectedSheetName: findSelectedSheetName,
      spreadsheetId: findSpreadsheetId,
      findSheetConditions,
      findConditionsLogic,
      findSheetCustomLogic,
      findUpdateMultiple,
      googleSheetReturnLimit: findreturnLimit,
      googleSheetSortField: findsortField,
      googleSheetSortOrder: findsortOrder,
      columns: findGoogleSheetColumns
    } : {};

    setMappings((prev) => {
      const updatedMappings = {
        ...prev,
        [nodeId]: {
          actionType: isCreateUpdateNode ? "CreateUpdate" : isLoopNode ? "Loop" : isFormatterNode ? "Formatter" : isFilterNode ? "Filter" : isPathNode ? "Path" : isConditionNode ? "Condition" : nodeType,
          selectedFindNode: isLoopNode ? loopCollection : (isFilterNode || isConditionNode ? selectedFindNode : ''),
          salesforceObject: isCreateUpdateNode || isFindNode || isFilterNode || (isConditionNode && pathOption === "Rules") ? selectedObject : "",
          fieldMappings: isCreateUpdateNode ? [
            ...validMappings.map(m => ({
              formFieldId: m.formFieldId,
              fieldType: m.fieldType,
              salesforceField: m.salesforceField,
              picklistValue: m.picklistValue || undefined
            })),
            {
              storeAsContentDocument: storeAsContentDocument,
              selectedFileUploadFields: selectedFileUploadFields
            }
          ] : [],
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
          storeAsContentDocument: isCreateUpdateNode ? storeAsContentDocument : undefined,
          selectedFileUploadFields: isCreateUpdateNode ? selectedFileUploadFields : [],
          previousNodeId,
          nextNodeIds,
          label: nodes.find((n) => n.id === nodeId)?.data.label || `${nodeType}_Level0`,
          ...googleSheetData,
          ...findGoogleSheetData,
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
    // Helper function to get field options based on node type and loop collection
    const getFieldOptionsForConditions = () => {
      if (isExit && isLoopNode && loopCollection) {
        const loopCollectionNode = nodes.find(node => node.id === loopCollection);
        console.log('loop node', loopCollectionNode)
        if (loopCollectionNode && loopCollectionNode.data.action === 'FindGoogleSheet') {
          const googleSheetNodeMapping = mappings[loopCollection] || {};
          console.log('sheet', googleSheetNodeMapping)
          return (googleSheetNodeMapping.sheetColumns || googleSheetNodeMapping.columns || []).map(col => ({ value: col, label: col }));
        }
      }
      // New logic for Filter node conditions
      if (isFilterNode && selectedFindNode) {
        const findNode = nodes.find(node => node.id === selectedFindNode);
        if (findNode && findNode.data.action === 'FindGoogleSheet') {
          const googleSheetNodeMapping = mappings[selectedFindNode] || {};
          return (googleSheetNodeMapping.sheetColumns || googleSheetNodeMapping.columns || []).map(col => ({ value: col, label: col }));
        }
      }
      return fieldOptions; // Default to Salesforce field options
    };
    // Helper function to get operators for a condition
    const getOperatorsForCondition = (conditionIndex) => {
      if (isExit) {
        return operatorGroups.default; // For exit conditions, use default operators
      }
      if (isExit && isLoopNode && loopCollection) {
        const loopCollectionNode = nodes.find(node => node.id === loopCollection);
        if (loopCollectionNode && loopCollectionNode.data.action === 'FindGoogleSheet') {
          // For Google Sheet columns, assume string operators for now
          return operatorGroups.text;
        }
      }
      // New logic for Filter node conditions
      if (isFilterNode && selectedFindNode) {
        const findNode = nodes.find(node => node.id === selectedFindNode);
        if (findNode && findNode.data.action === 'FindGoogleSheet') {
          return operatorGroups.text;
        }
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
        {/* Combine Conditions Section */}
        {conditionsList.length > 1 && (
          <div className="overflow-visible">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
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
              </div>

              {logicType === "Custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="col-span-2"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Logic</label>
                  <input
                    type="text"
                    value={customLogic}
                    onChange={(e) => setCustomLogic(e.target.value)}
                    placeholder="e.g., (1 AND 2) OR 3"
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500 h-9"
                  />
                </motion.div>
              )}
            </div>
            {/* Validation */}
            {logicType === "Custom" && customLogic && (
              validateCustomLogic(customLogic, conditionsList.length).length > 0 ? (
                <div className="text-red-600 text-sm mt-2">
                  {validateCustomLogic(customLogic, conditionsList.length).map((err, idx) => (
                    <div key={idx}>⚠ {err}</div>
                  ))}
                </div>
              ) : (
                <div className="text-green-600 text-sm mt-2">
                  ✅ Logic looks good
                </div>
              )
            )}
          </div>
        )}
        {/* Conditions Container */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible relative z-10">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {isExit ? "Exit Conditions" : "Conditions"}
            </h3>
          </div>

          <div className="p-4 space-y-1 relative">
            {/* Condition labels header (shown only once) */}
            {conditionsList.length > 0 && (
              <div className="grid grid-cols-12 gap-3 items-center pb-2 mb-2 border-b border-gray-100">
                <div className="col-span-1">
                  <span className="text-xs font-medium text-gray-500"></span>
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase">Field</label>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 uppercase">Operator</label>
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase">Value</label>
                </div>
                <div className="col-span-1">
                  {/* Empty header for actions column */}
                </div>
              </div>
            )}

            {conditionsList.map((condition, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative grid grid-cols-12 gap-3 items-center py-2 hover:bg-gray-50 rounded-md transition-colors duration-150"
              >
                {/* Numbering column */}
                <div className="col-span-1 flex items-center justify-center">
                  <div className="condition-number">{index + 1})</div>
                </div>

                {/* Field column */}
                <div className="col-span-4">
                  <AntSelect
                    style={{ width: "100%" }}
                    placeholder="Select Field"
                    value={condition.field || undefined}
                    onChange={(value) =>
                      handleConditionChange(index, "field", value, conditionType)
                    }
                    options={
                      isExit && currentItemVariableName
                        ? getFieldOptionsForConditions().map((opt) => ({
                          ...opt,
                          label: `${currentItemVariableName}.${opt.label}`,
                        }))
                        : getFieldOptionsForConditions()
                    }
                    disabled={!getFieldOptionsForConditions().length}
                    allowClear
                    size="small"
                  />
                </div>

                {/* Operator column */}
                <div className="col-span-2">
                  <AntSelect
                    style={{ width: "100%" }}
                    placeholder="Op"
                    value={condition.operator || undefined}
                    onChange={(value) =>
                      handleConditionChange(index, "operator", value, conditionType)
                    }
                    options={getOperatorsForCondition(index)}
                    size="small"
                  />
                </div>


                {/* Value column */}
                {condition.operator !== "IS NULL" && condition.operator !== "IS NOT NULL" && (
                  <div className="col-span-4">
                    <Input
                      style={{ width: 150 }}
                      value={condition.value}
                      onChange={(e) => handleConditionChange(index, "value", e.target.value, conditionType)}
                      placeholder={condition.operator === "BETWEEN" ? "From Value" : "Enter Value"}
                      disabled={!condition.operator}
                    />
                  </div>
                )}

                {/* Delete button column */}
                <div className="col-span-1 flex justify-center opacity-30 group-hover:opacity-100 transition-opacity duration-150">
                  {conditionsList.length > 1 && (
                    <button
                      onClick={() => removeCondition(index, conditionType)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      title="Remove condition"
                    >
                      <svg width="14" height="14" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.7601 1C11.8925 1 12 1.09029 12 1.20166V1.79833C12 1.90971 11.8925 2 11.7601 2H0.240001C0.107452 2 0 1.90971 0 1.79833V1.20166C0 1.09029 0.107452 1 0.240001 1H3.42661C3.96661 1 4.40521 0.450497 4.40521 0H7.59482C7.59482 0.450497 8.03282 1 8.57343 1H11.7601Z" fill="#0B0A0A" />
                        <path d="M11.4678 4.4502L9.61816 15.5498H2.38184L0.532227 4.4502H11.4678Z" fill="white" stroke="#262626ff" stroke-width="0.89999" />
                      </svg>
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Second row for BETWEEN operator */}
            {conditionsList.some(condition => condition.operator === "BETWEEN") && (
              conditionsList.map((condition, index) => (
                condition.operator === "BETWEEN" && (
                  <motion.div
                    key={`between-${index}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="grid grid-cols-12 gap-3 mt-1 mb-2"
                  >
                    <div className="col-span-1"></div>
                    <div className="col-span-4 col-start-2">
                      <input
                        type="text"
                        value={condition.value2}
                        onChange={(e) => handleConditionChange(index, "value2", e.target.value, conditionType)}
                        placeholder="To Value"
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500 h-9"
                      />
                    </div>
                  </motion.div>
                )
              ))
            )}

            {/* Add Condition Button */}
            <button
              onClick={() => addCondition(conditionType)}
              className="flex items-center justify-center w-full bg-[#c9eaff70] text-[#028AB0] px-4 py-2 text-sm font-medium mt-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {isExit ? "Add Exit Condition" : "Add Condition"}
            </button>
          </div>
        </div>

      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute right-0 h-full w-2/4 bg-white shadow-xl border-l border-gray-200 overflow-y-auto z-10"
    >

      <div className="p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-semibold text-gray-800"
          >
            Node Configuration
          </motion.h2>
          <button
            onClick={() => {
              setSaveError(null);
              if (onClose) onClose();
            }}
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

        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Label field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onBlur={handleLabelBlur}
                maxLength={25}
                placeholder="Enter node label"
                className="mt-1"
              />
            </div>

            {/* Type field (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Input
                value={mappings[nodeId]?.actionType || nodeType}
                readOnly
                className="mt-1 bg-gray-100 text-gray-700"
              />
            </div>
          </div>
        </div>

        {isGoogleSheet && (
          <motion.div
            className=""
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
          >
            <GoogleSheetPanel setFieldMappings={setFieldMappings} setSheetName={setSheetName} sheetName={sheetName} fieldMappings={fieldMappings} formFields={formFields} sheetLink={sheetLink} setsheetLink={setSheetLink} sfToken={sfToken} instanceUrl={instanceUrl} userId={userId} sheetconditions={sheetConditions} setsheetConditions={setsheetConditions} conditionsLogic={conditionsLogic} setConditionsLogic={setConditionsLogic}
              sheetcustomLogic={sheetcustomLogic} setsheetCustomLogic={setsheetCustomLogic} spreadsheetId={spreadsheetId} setSpreadsheetId={setSpreadsheetId} updateMultiple={updateMultiple} setUpdateMultiple={setUpdateMultiple} setFindGoogleSheetColumns={setFindGoogleSheetColumns} />
          </motion.div>
        )}
        {isFindGoogleSheet && (
          <motion.div
            className=""
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
          >
            <GoogleSheetFindPanel
              initialConfig={mappings[nodeId]}
              userId={userId}
              instanceUrl={instanceUrl}
              token={sfToken}
              sheetsApiUrl={process.env.REACT_APP_GOOGLE_SHEET}
            />
          </motion.div>
        )}
        <div className="space-y-6">
          {(isPathNode || isConditionNode) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Path Option</label>
                <AntSelect
                  value={pathOption || undefined}
                  onChange={(value) => setPathOption(value || "Rules")}
                  options={pathOptions}
                  placeholder="Select Path Option"
                  size="middle"
                  style={{ width: "100%", marginTop: "4px" }}
                  allowClear
                />
              </div>
            </motion.div>
          )}

          {(isCreateUpdateNode || isFindNode) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">Salesforce Object</label>
              <AntSelect
                style={{ marginTop: 10 }}
                placeholder={objectOptions.length ? "Select Salesforce Object" : "No Objects Available"}
                labelInValue
                value={
                  selectedObject
                    ? { value: selectedObject, label: objectOptions.find(o => o.value === selectedObject)?.label }
                    : undefined
                }
                onChange={handleObjectSelect}
                allowClear
                showSearch
                options={objectOptions}
                optionFilterProp="label"
                disabled={!objectOptions.length}
                getPopupContainer={(t) => document.body}
              />

            </motion.div>
          )}

          {(isFilterNode || (isConditionNode && pathOption == 'Rules') || isLoopNode) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isLoopNode ? "Select Collection Node" : "Select Find Node"}
                </label>

                <AntSelect
                  value={
                    (isLoopNode ? loopCollection : selectedFindNode) || undefined
                  }
                  onChange={(value) => handleFindNodeChange(value, isLoopNode)}
                  options={collectionOptions}
                  placeholder={
                    collectionOptions.length
                      ? "Select Find Node"
                      : "No Find Nodes Available"
                  }
                  size="middle"
                  style={{ width: "100%", marginTop: "4px" }}
                  allowClear
                />
                {selectedObject && (
                  <p className="text-sm text-gray-600 mt-2">
                    Using Salesforce object: <span className="font-medium">{selectedObject}</span>
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {isLoopNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div>
                {/* Max Iterations Accordion */}
                <div className="">
                  <button
                    className="w-full flex justify-between items-center px-1 py-2  text-left font-medium text-gray-700"
                    onClick={() => setAccordionOpen(prev => ({ ...prev, iterations: !prev.iterations }))}
                  >
                    <span>Max Iterations (optional)</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${accordionOpen.iterations ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {accordionOpen.iterations && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-1 pb-4"
                    >
                      <input
                        type="number"
                        value={maxIterations}
                        onChange={(e) => setMaxIterations(e.target.value)}
                        placeholder="Enter max iterations (e.g., 3)"
                        className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Exit Conditions Accordion */}
                <div className="">
                  <button
                    className="w-full flex justify-between items-center px-1 py-2  text-left font-medium text-gray-700"
                    onClick={() => setAccordionOpen(prev => ({ ...prev, exitConditions: !prev.exitConditions }))}
                  >
                    <span>Exit Conditions (optional)</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${accordionOpen.exitConditions ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {accordionOpen.exitConditions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-1 pb-4"
                    >
                      {renderConditions("exitConditions", true)}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {(isFindNode || isFilterNode || (isConditionNode && pathOption == 'Rules')) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {renderConditions("conditions")}

              {(!isConditionNode) && (
                <>
                  {/* Return Limit Accordion */}
                  <div className="pt-2">
                    <button
                      className="w-full flex justify-between items-center px-2 py-3 text-left font-medium text-gray-700"
                      onClick={() => setAccordionOpen(prev => ({ ...prev, returnLimit: !prev.returnLimit }))}
                    >
                      <span>Return Limit (optional)</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${accordionOpen.returnLimit ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {accordionOpen.returnLimit && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-1 pb-4"
                      >
                        <div>
                          <Input
                            type="number"
                            value={returnLimit}
                            onChange={(e) => setReturnLimit(e.target.value)}
                            placeholder="Leave blank for all records"
                            min="1"
                            max="100"
                          />
                          <p className="text-xs text-gray-500 mt-1">Enter a number up to 100 or leave blank to return all records.</p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Sort Records Accordion */}
                  <div className="">
                    <button
                      className="w-full flex justify-between items-center px-2 py-3 text-left font-medium text-gray-700"
                      onClick={() => setAccordionOpen(prev => ({ ...prev, sortRecords: !prev.sortRecords }))}
                    >
                      <span>Sort Records (optional)</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${accordionOpen.sortRecords ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {accordionOpen.sortRecords && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-2 pb-4"
                      >
                        <div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500">Sort Field</label>
                              <AntSelect
                                value={sortField || undefined}
                                onChange={(value) => setSortField(value)}
                                placeholder="Select Field"
                                disabled={!selectedObject}
                                allowClear
                                showSearch={false} // disables search
                                style={{ width: "100%", marginTop: 4 }}
                              >
                                {fieldOptions.map((opt) => (
                                  <Option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </Option>
                                ))}
                              </AntSelect>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-500">Sort Order</label>
                              <AntSelect
                                value={sortOrder || undefined}
                                onChange={(value) => setSortOrder(value || "ASC")}
                                placeholder="Select Order"
                                allowClear
                                showSearch={false} // disables search
                                style={{ width: "100%", marginTop: 4 }}
                              >
                                {sortOrderOptions.map((opt) => (
                                  <Option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </Option>
                                ))}
                              </AntSelect>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {isCreateUpdateNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible relative z-10">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Form Fields Mapping with Salesforce Object Fields
                  </h3>
                </div>

                <div className="p-4 space-y-1 relative">
                  {/* Header row with labels - only shown once */}
                  <div className="grid grid-cols-12 gap-3 items-center pb-2 mb-2 border-b border-gray-100">
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-500 uppercase">
                        Salesforce Field
                      </label>
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-500 uppercase">
                        Form Field
                      </label>
                    </div>
                    <div className="col-span-1">
                      {/* Empty header for actions column */}
                    </div>
                  </div>

                  {localMappings.map((mapping, index) => {
                    const isRequiredField = selectedObject && safeSalesforceObjects
                      .find(obj => obj.name === selectedObject)
                      ?.fields?.find(f => f.name === mapping.salesforceField && f.required);

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group relative grid grid-cols-12 gap-3 items-center py-2 hover:bg-gray-50 rounded-md transition-colors duration-150"
                      >
                        {/* Salesforce Field */}
                        <div className="col-span-5 relative">
                          <AntSelect
                            style={{
                              width: "100%",
                              minHeight: 36,
                              marginTop: 2,
                              backgroundColor: isRequiredField ? "#f0f9ff" : "white",
                              borderColor: isRequiredField ? "#3b82f6" : "#e5e7eb",
                              borderRadius: "0.375rem",
                              fontSize: "0.875rem"
                            }}
                            placeholder="Select field"
                            value={mapping.salesforceField || undefined}
                            onChange={(value) => handleMappingChange(index, "salesforceField", value || "")}
                            allowClear={!isRequiredField}
                            disabled={!selectedObject || isRequiredField}
                            dropdownStyle={{ zIndex: 9999 }}
                            getPopupContainer={(trigger) => document.body} // prevents clipping
                            showSearch={false} // 🔹 disables search
                          >
                            {fieldOptions.map(opt => (
                              <AntSelect.Option key={opt.value} value={opt.value}>
                                {opt.label}
                              </AntSelect.Option>
                            ))}
                          </AntSelect>

                          {isRequiredField && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Required field
                            </p>
                          )}
                        </div>


                        {/* Form Field */}
                        <div className="col-span-6 relative">
                          <AntSelect
                            style={{
                              width: "100%",
                              minHeight: 36,
                              borderRadius: "0.375rem",
                              fontSize: "0.875rem"
                            }}
                            placeholder={formFieldOptions(index).length ? "Select field" : "No options"}
                            value={(mapping.picklistValue || mapping.formFieldId) || undefined}
                            onChange={(value, option) => {
                              if (!value) {
                                handleMappingChange(index, "formFieldId", "", { fieldType: "" });
                                return;
                              }
                              const isPick = option?.isPicklistValue;
                              if (isPick) {
                                handleMappingChange(index, "picklistValue", value);
                              } else {
                                const field = safeFormFields.find(
                                  f => f.id === value || f.Unique_Key__c === value
                                );
                                handleMappingChange(index, "formFieldId", value, { fieldType: field ? field.type : "" });
                              }
                            }}
                            allowClear
                            disabled={!formFieldOptions(index).length}
                            showSearch={false} // 🔹 disables search
                          >
                            {formFieldOptions(index).flatMap(group =>
                              group.options.map(opt => (
                                <Option
                                  key={opt.value}
                                  value={opt.value}
                                  isPicklistValue={opt.isPicklistValue}
                                  isSubField={opt.isSubField}
                                  disabled={opt.isDisabled}
                                >
                                  <span
                                    style={{
                                      paddingLeft: opt.isSubField ? "24px" : "12px",
                                      color: opt.isPicklistValue ? "#0369a1" : undefined
                                    }}
                                  >
                                    {opt.label}
                                  </span>
                                </Option>
                              ))
                            )}

                          </AntSelect>
                        </div>

                        {/* Remove Button - Only shown on hover and if not required */}
                        <div className="col-span-1 flex justify-center opacity-30 group-hover:opacity-100 transition-opacity duration-150">
                          {localMappings.length > 1 && !isRequiredField && (
                            <button
                              onClick={() => removeMapping(index)}
                              className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                              title="Remove mapping"
                            >
                              <svg width="14" height="14" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.7601 1C11.8925 1 12 1.09029 12 1.20166V1.79833C12 1.90971 11.8925 2 11.7601 2H0.240001C0.107452 2 0 1.90971 0 1.79833V1.20166C0 1.09029 0.107452 1 0.240001 1H3.42661C3.96661 1 4.40521 0.450497 4.40521 0H7.59482C7.59482 0.450497 8.03282 1 8.57343 1H11.7601Z" fill="#0B0A0A" />
                                <path d="M11.4678 4.4502L9.61816 15.5498H2.38184L0.532227 4.4502H11.4678Z" fill="white" stroke="#262626ff" stroke-width="0.89999" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Add More Fields Button */}
                  <button
                    onClick={addMapping}
                    className="flex items-center justify-center w-full bg-[#c9eaff70] text-[#028AB0] px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={safeSalesforceObjects.length === 0 || !selectedObject}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Field Mapping
                  </button>
                </div>
              </div>

              {/* File Upload to Content Document Toggle */}
              <div className="overflow-visible relative z-10">
                <div className="flex items-center">
                  <ToggleSwitch
                    checked={storeAsContentDocument}
                    onChange={() => setStoreAsContentDocument(!storeAsContentDocument)}
                    id="content-document-toggle"
                  />
                  <div className="ml-3">
                    <label htmlFor="content-document-toggle" className="text-sm font-medium text-gray-700">
                      Store File Uploads as Content Documents
                    </label>
                  </div>
                </div>

                {storeAsContentDocument && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4"
                  >
                    <AntSelect
                      mode="multiple"
                      value={selectedFileUploadFields}
                      onChange={(value) => setSelectedFileUploadFields(value)}
                      placeholder="Select file upload fields"
                      style={{ width: "100%" }}
                      allowClear
                    >
                      {safeFormFields
                        .filter(field => field.type === 'fileupload')
                        .map(field => (
                          <Option key={field.id} value={field.id}>
                            {field.name}
                          </Option>
                        ))}
                    </AntSelect>
                    <p className="text-xs text-gray-500 mt-2">
                      Selected files will be uploaded as Salesforce Content Documents and linked to the record
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Enable Conditions Toggle */}
              <div className="overflow-visible relative z-10">
                <div className="p-1">
                  <div className="flex items-center">
                    <div className="mb-4 flex items-center">
                      <ToggleSwitch
                        checked={enableConditions}
                        onChange={() => {
                          if (enableConditions) {
                            setConditions([{ field: "", operator: "=", value: "", value2: "" }]);
                          }
                          setEnableConditions(!enableConditions);
                        }}
                        id="conditions-input-toggle"
                      />

                      <div className="ml-1">
                        <span className="text-sm font-medium text-gray-700">
                          Enable Conditions
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Only execute this action if the specified conditions are met
                        </p>
                      </div>
                    </div>

                  </div>

                  {enableConditions && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="pt-4 border-t border-gray-100"
                    >
                      {renderConditions("conditions")}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {isFormatterNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Formatter Type and Operation in one row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formatter Type</label>
                  <AntSelect
                    value={formatterConfig.formatType || undefined}
                    onChange={(value) => {
                      handleFormatterChange("formatType", value || "date");
                      handleFormatterChange("inputField", "");
                      handleFormatterChange("inputField2", "");
                    }}
                    placeholder="Select Formatter Type"
                    allowClear
                    showSearch={false}
                    style={{ width: "100%", marginTop: 4 }}
                  >
                    {formatterTypes.map((opt) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </AntSelect>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                  <AntSelect
                    value={
                      formatterOperations[formatterConfig.formatType]
                        .filter(opt => {
                          const compatibleTypes =
                            operationFieldTypeCompatibility[formatterConfig.formatType]?.[opt.value] || [];
                          const selectedField = safeFormFields.find(
                            f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField
                          );
                          return !selectedField || compatibleTypes.includes(selectedField.type);
                        })
                        .find(opt => opt.value === formatterConfig.operation)?.value
                    }
                    onChange={(value) => handleFormatterChange("operation", value || "")}
                    placeholder="Select Operation"
                    disabled={!formatterConfig.formatType}
                    allowClear
                    showSearch={false}   // 🔹 disables search
                    style={{ width: "100%", marginTop: 4 }}
                  >
                    {formatterOperations[formatterConfig.formatType]
                      .filter(opt => {
                        const compatibleTypes =
                          operationFieldTypeCompatibility[formatterConfig.formatType]?.[opt.value] || [];
                        const selectedField = safeFormFields.find(
                          f => f.id === formatterConfig.inputField || f.Unique_Key__c === formatterConfig.inputField
                        );
                        return !selectedField || compatibleTypes.includes(selectedField.type);
                      })
                      .map(opt => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                  </AntSelect>
                </div>
              </div>

              {/* Input Fields Section */}
              <div className={`grid gap-4 ${formatterConfig.operation === "date_difference" || formatterConfig.operation === "math_operation" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                {/* First Input Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Input Field</label>
                  <AntSelect
                    value={formatterConfig.inputField || undefined}
                    onChange={(value) => handleFormatterChange("inputField", value || "")}
                    placeholder={
                      formFieldOptions().length
                        ? "Select Form Field"
                        : "No Form Fields Available"
                    }
                    allowClear
                    showSearch={false}
                    style={{ width: "100%", marginTop: 4 }}
                  >
                    {formFieldOptions().map((group) => (
                      <OptGroup key={group.label} label={group.label}>
                        {group.options.map((opt) => (
                          <Option key={opt.value} value={opt.value}>
                            <span
                              style={{
                                paddingLeft: opt.isSubField ? "16px" : "0px",
                                color: opt.isSubField ? "#374151" : "#111827",
                                fontSize: "0.875rem",
                              }}
                            >
                              {opt.label}
                            </span>
                          </Option>
                        ))}
                      </OptGroup>
                    ))}
                  </AntSelect>
                </div>

                {/* Second Input Field + Toggle (only visible if operation requires it) */}
                {["date_difference", "math_operation"].includes(formatterConfig.operation) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Second Input Field</label>
                      <AntSelect
                        value={formatterConfig.inputField2 || undefined}
                        onChange={(value) => handleFormatterChange("inputField2", value || "")}
                        placeholder={
                          formFieldOptions(undefined, true).length
                            ? "Select Second Form Field"
                            : "No Form Fields Available"
                        }
                        allowClear
                        showSearch={false}
                        disabled={formatterConfig.useCustomInput}
                        style={{ width: "100%", marginTop: 4 }}
                      >
                        {formFieldOptions(undefined, true).map((group) => (
                          <OptGroup key={group.label} label={group.label}>
                            {group.options.map((opt) => (
                              <Option key={opt.value} value={opt.value}>
                                <span
                                  style={{
                                    paddingLeft: opt.isSubField ? "20px" : "0px",
                                    color: opt.isSubField ? "#374151" : "#111827",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {opt.label}
                                </span>
                              </Option>
                            ))}
                          </OptGroup>
                        ))}
                      </AntSelect>
                    </div>

                  </motion.div>
                )}
              </div>

              {["date_difference", "math_operation"].includes(formatterConfig.operation) && (
                <>
                  <div className="flex items-center">
                    <ToggleSwitch
                      checked={formatterConfig.useCustomInput}
                      onChange={(e) => handleFormatterChange("useCustomInput", e.target.checked)}
                      id="custom-input-toggle"
                    />
                    <span className="text-sm font-medium text-gray-700 ml-2">Use Custom Input</span>
                  </div>

                  {formatterConfig.useCustomInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4"
                    >
                      <label className="block text-sm font-medium text-gray-700">
                        {formatterConfig.operation === "date_difference" ? "Custom Compare Date" : "Custom Value"}
                      </label>
                      <Input
                        value={formatterConfig.customValue}
                        onChange={(e) => handleFormatterChange("customValue", e.target.value)}
                        placeholder={
                          formatterConfig.operation === "date_difference" ? "e.g., 2025-06-20" : "e.g., 200"
                        }
                      />
                    </motion.div>
                  )}
                </>
              )}

              {formatterConfig.formatType === "date" && formatterConfig.operation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {(formatterConfig.operation === "format_date" || formatterConfig.operation === "format_datetime") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                      <AntSelect
                        value={formatterConfig.options.format || undefined}
                        onChange={(val) => handleFormatterOptionChange("format", val)}
                        placeholder="Select Date Format"
                        style={{ width: "100%", marginTop: 4 }}
                        showSearch={false}
                        allowClear
                      >
                        {(formatterConfig.operation === "format_date" ? dateFormats : dateTimeFormats).map((opt) => (
                          <Option key={opt.value} value={opt.value}>
                            {opt.label}
                          </Option>
                        ))}
                      </AntSelect>
                    </div>

                  )}

                  {formatterConfig.operation === "format_time" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                      <AntSelect
                        value={formatterConfig.options.format || undefined}
                        onChange={(val) => handleFormatterOptionChange("format", val)}
                        placeholder="Select Time Format"
                        style={{ width: "100%", marginTop: 4 }}
                        showSearch={false}
                        allowClear
                      >
                        {timeFormats.map((opt) => (
                          <AntSelect.Option key={opt.value} value={opt.value}>
                            {opt.label}
                          </AntSelect.Option>
                        ))}
                      </AntSelect>
                    </div>

                  )}

                  {(formatterConfig.operation === "timezone_conversion" || formatterConfig.operation === "format_time" || formatterConfig.operation === "format_datetime") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Source Timezone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Source Timezone</label>
                        <AntSelect
                          value={formatterConfig.options.timezone || undefined}
                          onChange={(val) => handleFormatterOptionChange("timezone", val)}
                          placeholder="Select Source Timezone"
                          style={{ width: "100%", marginTop: 4 }}
                          showSearch={false}
                          allowClear
                        >
                          {timezoneOptions.map((opt) => (
                            <AntSelect.Option key={opt.value} value={opt.value}>
                              {opt.label}
                            </AntSelect.Option>
                          ))}
                        </AntSelect>
                      </div>

                      {/* Target Timezone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Timezone</label>
                        <AntSelect
                          value={formatterConfig.options.targetTimezone || undefined}
                          onChange={(val) => handleFormatterOptionChange("targetTimezone", val)}
                          placeholder="Select Target Timezone"
                          style={{ width: "100%", marginTop: 4 }}
                          showSearch={false}
                          allowClear
                        >
                          {timezoneOptions.map((opt) => (
                            <AntSelect.Option key={opt.value} value={opt.value}>
                              {opt.label}
                            </AntSelect.Option>
                          ))}
                        </AntSelect>
                      </div>
                    </div>

                  )}

                  {(formatterConfig.operation === "add_date" || formatterConfig.operation === "subtract_date") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Unit */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <AntSelect
                          value={formatterConfig.options.unit || undefined}
                          onChange={(val) => handleFormatterOptionChange("unit", val)}
                          placeholder="Select Unit"
                          style={{ width: "100%", marginTop: 4 }}
                          showSearch={false}
                          allowClear
                        >
                          <AntSelect.Option value="days">Days</AntSelect.Option>
                          <AntSelect.Option value="months">Months</AntSelect.Option>
                          <AntSelect.Option value="years">Years</AntSelect.Option>
                        </AntSelect>
                      </div>

                      {/* Value */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Value</label>
                        <Input
                          type="number"
                          value={formatterConfig.options.value || undefined}
                          onChange={(val) => handleFormatterOptionChange("value", val)}
                          placeholder="e.g., 3"
                          min={1}
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                      <AntSelect
                        value={formatterConfig.options.locale || undefined}
                        onChange={(val) => handleFormatterOptionChange("locale", val)}
                        placeholder="Select Locale"
                        style={{ width: "100%", marginTop: 4 }}
                        showSearch={false}
                        allowClear
                      >
                        {localeOptions.map((opt) => (
                          <AntSelect.Option key={opt.value} value={opt.value}>
                            {opt.label}
                          </AntSelect.Option>
                        ))}
                      </AntSelect>
                    </div>
                  )}
                  {formatterConfig.operation === "currency_format" && (

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Currency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <AntSelect
                          value={formatterConfig.options.currency || undefined}
                          onChange={(val) => handleFormatterOptionChange("currency", val)}
                          placeholder="Select Currency"
                          style={{ width: "100%", marginTop: 4 }}
                          showSearch
                          allowClear
                        >
                          {currencyOptions.map((opt) => (
                            <AntSelect.Option key={opt.value} value={opt.value}>
                              {opt.label}
                            </AntSelect.Option>
                          ))}
                        </AntSelect>
                      </div>

                      {/* Locale */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                        <AntSelect
                          value={formatterConfig.options.locale || undefined}
                          onChange={(val) => handleFormatterOptionChange("locale", val)}
                          placeholder="Select Locale"
                          style={{ width: "100%", marginTop: 4 }}
                          showSearch
                          allowClear
                        >
                          {localeOptions.map((opt) => (
                            <AntSelect.Option key={opt.value} value={opt.value}>
                              {opt.label}
                            </AntSelect.Option>
                          ))}
                        </AntSelect>
                      </div>
                    </div>

                  )}
                  {formatterConfig.operation === "round_number" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Decimals</label>
                      <input
                        type="number"
                        value={formatterConfig.options.decimals ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleFormatterOptionChange(
                            "decimals",
                            value === "" ? undefined : parseInt(value)
                          );
                        }}
                        placeholder="e.g., 2"
                        min={0}
                        max={15}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  {formatterConfig.operation === "phone_format" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
                        <AntSelect
                          value={formatterConfig.options.countryCode || undefined}
                          onChange={(val) => handleFormatterOptionChange("countryCode", val)}
                          options={countryOptions}
                          placeholder="Select Country Code"
                          style={{ width: "100%", marginTop: 4 }}
                          showSearch
                          optionFilterProp="label"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                        <AntSelect
                          value={formatterConfig.options.format || undefined}
                          onChange={(val) => handleFormatterOptionChange("format", val)}
                          options={phoneFormatOptions}
                          placeholder="Select Format"
                          style={{ width: "100%", marginTop: 4 }}
                        />
                      </div>

                    </div>
                  )}
                  {formatterConfig.operation === "math_operation" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                      <AntSelect
                        value={formatterConfig.options.operation || undefined}
                        onChange={(val) => handleFormatterOptionChange("operation", val)}
                        options={operationOptions}
                        placeholder="Select Operation"
                        style={{ width: "100%", marginTop: 4 }}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Search Value</label>
                        <Input
                          value={formatterConfig.options.searchValue || ""}
                          onChange={(e) => handleFormatterOptionChange("searchValue", e.target.value)}
                          placeholder="Text to replace"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Replace Value</label>
                        <Input
                          value={formatterConfig.options.replaceValue || ""}
                          onChange={(e) => handleFormatterOptionChange("replaceValue", e.target.value)}
                          placeholder="Replacement text"
                        />
                      </div>
                    </div>
                  )}
                  {formatterConfig.operation === "split" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Delimiter</label>
                        <Input
                          value={formatterConfig.options.delimiter || ""}
                          onChange={(e) => handleFormatterOptionChange("delimiter", e.target.value)}
                          placeholder="e.g., ,"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Index</label>
                        <AntSelect
                          value={formatterConfig.options.index || undefined}
                          onChange={(value) => handleFormatterOptionChange("index", value)}
                          options={splitIndexOptions}
                          placeholder="Select Index"
                          style={{ width: "100%", marginTop: 4 }}
                          showSearch={false} // disables search
                          allowClear
                        />
                      </div>

                    </div>
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
              className="px-4 py-2 text-sm font-medium save-local"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ConditionRow = ({ condition, index, onChange, onRemove, columns }) => {
  const STRING_OPERATORS = [
    { label: "Equals", value: "=" },
    { label: "Not Equals", value: "!=" },
    { label: "Contains", value: "LIKE" },
    { label: "Not Contains", value: "NOT LIKE" },
    { label: "Starts With", value: "STARTS WITH" },
    { label: "Ends With", value: "ENDS WITH" }
  ];

  const operators = STRING_OPERATORS;

  return (
    <motion.div
      key={index}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative grid grid-cols-12 gap-3 items-center py-2 hover:bg-gray-50 rounded-md transition-colors duration-150"
    >
      {/* Numbering column */}
      <div className="col-span-1 flex items-center justify-center">
        <div className="condition-number">{index + 1})</div>
      </div>

      {/* Field column */}
      <div className="col-span-4">
        <AntSelect
          style={{ width: "100%" }}
          placeholder="Select Column"
          value={condition.field || undefined}
          onChange={(value) =>
            onChange(index, {
              field: value,
              operator: "",
              value: "",
            })
          }
          options={columns.map((c) => ({ label: c, value: c }))}
          allowClear
          size="small"
        />
      </div>

      {/* Operator column */}
      <div className="col-span-2">
        <AntSelect
          style={{ width: "100%" }}
          placeholder="Operator"
          value={condition.operator || undefined}
          onChange={(operator) => onChange(index, { ...condition, operator })}
          options={operators.map((op) => ({ label: op.label, value: op.value }))}
          disabled={!condition.field}
          size="small"
        />
      </div>

      {/* Value column */}
      <div className="col-span-4">
        <Input
          style={{ width: "100%" }}
          placeholder={
            condition.operator === "BETWEEN" ? "From Value" : "Enter Value"
          }
          value={condition.value || ""}
          onChange={(e) =>
            onChange(index, { ...condition, value: e.target.value })
          }
          disabled={!condition.operator}
          size="small"
        />
      </div>

      {/* Delete button column */}
      <div className="col-span-1 flex justify-center opacity-30 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={() => onRemove(index)}
          className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
          title="Remove condition"
        >
          <svg width="14" height="14" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.7601 1C11.8925 1 12 1.09029 12 1.20166V1.79833C12 1.90971 11.8925 2 11.7601 2H0.240001C0.107452 2 0 1.90971 0 1.79833V1.20166C0 1.09029 0.107452 1 0.240001 1H3.42661C3.96661 1 4.40521 0.450497 4.40521 0H7.59482C7.59482 0.450497 8.03282 1 8.57343 1H11.7601Z" fill="#0B0A0A" />
            <path d="M11.4678 4.4502L9.61816 15.5498H2.38184L0.532227 4.4502H11.4678Z" fill="white" stroke="#262626ff" stroke-width="0.89999" />
          </svg>
        </button>
      </div>
    </motion.div>
  );

};

const ConditionsPanel = ({ columns, conditions, setConditions, sheetlogicType, setsheetLogicType, customLogic, setCustomLogic, updateMultiple, setUpdateMultiple }) => {
  const selectedLogic = sheetlogicType || 'AND';
  const [conditionsEnabled, setConditionsEnabled] = useState(false);

  const onAddCondition = () => {
    setConditions(conds => [...conds, { field: '', operator: '', value: '', fieldType: '' }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      // Use the value just before space is added
      let val = e.target.value;
      // Match the last word before the cursor (just typed)
      const match = val.split(' ')[val.split(' ').length - 1];
      if (match) {
        let num = match[1];
        let op = match.toString().toUpperCase() === 'A' ? 'AND' : 'OR';
        // Replace last word with AND/OR
        val = val.replace(/([AO])$/, op);
        setCustomLogic(val + " "); // add a space after, for continued typing
        e.preventDefault(); // prevents doubling space
      }
    }
  };

  if (!columns || columns?.length === 0) {
    // If no columns, do not show condition panel
    setsheetLogicType('AND')
    return null;
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="mb-4 flex items-center">
        <ToggleSwitch
          checked={conditionsEnabled}
          onChange={() => {
            if (conditionsEnabled) {
              // Turning OFF
              setConditions([]);
              setConditionsEnabled(false);
            } else {
              // Turning ON
              setConditionsEnabled(true);
              if (conditions.length === 0) {
                setConditions([{ field: '', operator: '', value: '', fieldType: '' }]);
              }
            }
          }}
        />
        <span className="text-sm font-medium text-gray-700">
          Enable Conditions
        </span>
      </div>

      <div className="mb-4 flex items-center">
        <ToggleSwitch
          checked={updateMultiple}
          onChange={() => setUpdateMultiple(!updateMultiple)}
          id="multiple-update-toggle"
        />
        <span className="text-sm font-medium text-gray-700">
          Update Multiple Records
        </span>
      </div>
      {conditionsEnabled && (
        <>
          {/* New AND/OR selector */}
          {conditions.length > 1 && (
            <div className="mb-4">
              <label className="block font-semibold mb-2">
                Conditions Logic
              </label>

              <div className="grid grid-cols-3 gap-3 items-center">
                {/* Dropdown 1/3 */}
                <div className="col-span-1">
                  <Select
                    className="w-full"
                    value={
                      selectedLogic
                        ? { label: selectedLogic, value: selectedLogic }
                        : null
                    }
                    onChange={(option) => {
                      setsheetLogicType(option.value);
                      if (option.value !== "Custom") setCustomLogic("");
                    }}
                    options={[
                      { label: "AND", value: "AND" },
                      { label: "OR", value: "OR" },
                      { label: "Custom", value: "Custom" }
                    ]}
                    menuPortalTarget={document.body}
                    styles={{
                      menuPortal: base => ({ ...base, zIndex: 9999 })
                    }}

                  />
                </div>

                {/* Custom input 2/3 */}
                {sheetlogicType === "Custom" && (
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={customLogic}
                      onChange={(e) => setCustomLogic(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g., (1 AND 2) OR 3"
                      className="w-full px-2 py-2 text-sm font-mono border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>

              {/* Validation */}
              {sheetlogicType === "Custom" && customLogic && (
                validateCustomLogic(customLogic, conditions.length).length > 0 ? (
                  <div className="text-red-600 text-sm mt-2">
                    {validateCustomLogic(customLogic, conditions.length).map((err, idx) => (
                      <div key={idx}>⚠ {err}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-green-600 text-sm mt-2">
                    ✅ Logic looks good
                  </div>
                )
              )}
            </div>
          )}

          <AnimatePresence>
            {conditions.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                {/* Container */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible relative z-10">
                  {/* Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      Conditions
                    </h3>
                  </div>

                  <div className="p-4 space-y-1 relative">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-3 items-center pb-2 mb-2 border-b border-gray-100">
                      <div className="col-span-1">
                        <span className="text-xs font-medium text-gray-500"></span>
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-500 uppercase">
                          Field
                        </label>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase">
                          Operator
                        </label>
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-500 uppercase">
                          Value
                        </label>
                      </div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Rows */}
                    {conditions.map((cond, i) => (
                      <ConditionRow
                        key={i}
                        index={i}
                        condition={cond}
                        onChange={(idx, updatedCond) =>
                          setConditions(conds =>
                            conds.map((c, ii) => (ii === idx ? updatedCond : c))
                          )
                        }
                        onRemove={idx =>
                          setConditions(conds => conds.filter((_, ii) => ii !== idx))
                        }
                        columns={columns}
                      />
                    ))}

                    {/* Add Condition button */}
                    <button
                      onClick={() =>
                        setConditions(conds => [
                          ...conds,
                          { field: '', operator: '', value: '', fieldType: '' }
                        ])
                      }
                      className="flex items-center justify-center w-full bg-[#c9eaff70] text-[#028AB0] px-4 py-2 text-sm font-medium mt-3"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Add Condition
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </>
      )}
    </div>
  );
};

const GoogleSheetPanel = ({ formFields, sheetName, fieldMappings, setFieldMappings, setSheetName, sheetconditions, setsheetConditions, instanceUrl, userId, sfToken, conditionsLogic, setConditionsLogic, sheetcustomLogic, setsheetCustomLogic, spreadsheetId, setSpreadsheetId, updateMultiple, setUpdateMultiple, setFindGoogleSheetColumns }) => {
  const [error, setError] = useState("");
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [conditionsEnabled, setConditionsEnabled] = useState(false);


  async function fetchSpreadsheets({ instanceUrl, sfToken, userId }) {
    const apiUrl = process.env.REACT_APP_GOOGLE_SHEET;
    console.log(apiUrl);

    if (!instanceUrl || !sfToken || !userId) {
      throw new Error("Missing required parameters: instanceUrl, sfToken, userId");
    }

    // Build URL with query parameters
    const url = new URL(apiUrl);
    url.searchParams.append("instanceUrl", instanceUrl);
    url.searchParams.append("sfToken", sfToken);
    url.searchParams.append("userId", userId);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Try to parse error details from response body if JSON
        let errorBody;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        throw new Error(`API Error ${response.status}: ${JSON.stringify(errorBody)}`);
      }

      const data = await response.json();
      return data; // expected to contain { spreadsheets: [...] }
    } catch (error) {
      // Network error or other unexpected error
      console.error("Fetch spreadsheets failed:", error);
      throw new Error(`Failed to fetch spreadsheets: ${error.message}`);
    }
  }

  useEffect(() => {
    async function loadSpreadsheets() {
      try {
        setLoading(true);
        const result = await fetchSpreadsheets({ instanceUrl, sfToken, userId });
        setSpreadsheets(result.spreadsheets);
        if (spreadsheetId) {
          const selected = result.spreadsheets.find(s => s.spreadsheetId === spreadsheetId);
          if (selected) {
            setSheetName(selected.spreadsheetName);
            setSelectedColumns(selected.columns || []);
            setFindGoogleSheetColumns(selected.columns[0])
            if (selected.columns[0]) {
              const newMappings = selected.columns[0].map(col => ({
                column: col,
                id: "",
                name: "",
                label: col
              }));
              // Only update fieldMappings if there are no existing ones from saved state
              if (fieldMappings.length === 0) {
                setFieldMappings(newMappings);
              }
            } else if (fieldMappings.length === 0) {
              setSelectedColumns([]);
              setFieldMappings([]);
            }
          }
        }
        setError(null);
        console.log('Results ==>', result.spreadsheets)
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    // Only fetch if spreadsheetId not set — else skip to avoid unnecessary API call
    // Only fetch spreadsheets if they are not already loaded or if spreadsheetId exists but columns are not loaded
    if (spreadsheets.length === 0 || (spreadsheetId && selectedColumns.length === 0)) {
      loadSpreadsheets();
    }
  }, [instanceUrl, sfToken, userId, fieldMappings.length, spreadsheets.length, selectedColumns.length]);
  // Handler when spreadsheet is selected
  // When a spreadsheet is selected, update sheetName and set its columns
  const onSpreadsheetChange = (spreadsheetId) => {
    const selected = spreadsheets.find(s => s.spreadsheetId === spreadsheetId);
    if (selected) {
      setSheetName(selected.spreadsheetName);
      setSelectedColumns(selected.columns || []);
      setSpreadsheetId(selected.spreadsheetId)
      setsheetConditions([]); // Clear conditions when changing spreadsheet
      setsheetCustomLogic(''); // Reset custom logic
      // setConditionsEnabled(true); // Enable conditions when a new spreadsheet is selected
      if (selected.columns[0]) {
        // Populate fieldMappings automatically based on columns
        setsheetConditions([])
        const newMappings = selected.columns[0]
          .map(col => ({
            column: col,
            id: "",     // no form field selected yet
            name: "",
            label: col  // keep label as trimmed column
          }));
        setFieldMappings(newMappings);
      } else {
        setSheetName("");
        setSelectedColumns([]);
        setSpreadsheetId(undefined);
        setFieldMappings([]);
        setsheetConditions([]);
        setConditionsLogic('AND');
        setsheetCustomLogic('');
        // setConditionsEnabled(false);
      }
    }
  };
  // Add a new mapping entry
  const addFieldMapping = () => {
    setFieldMappings([...fieldMappings, { column: "", id: "", name: "" }]);
    setError("");
  };

  // Remove a mapping entry
  const removeFieldMapping = (index) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
    setError("");
  };

  // Handle column name (left side): select or create
  const handleColumnChange = (index, val) => {
    const updated = [...fieldMappings];
    updated[index].column = val?.value || "";
    updated[index].label = val?.label || "Label";
    console.log(val)
    setFieldMappings(updated);
  };

  // Handle form field (right side)
  const handleFieldChange = (index, val) => {
    const field = formFields.find(f => f.id === val.value);
    const updated = [...fieldMappings];
    updated[index].id = field.id;
    updated[index].name = field.name;
    setFieldMappings(updated);
  };

  // For left-side column suggestions (show already used columns + allow new)
  const usedColumns = fieldMappings.map(m => m.column).filter(n => !!n);
  const columnOptions = usedColumns.map(col => ({ value: col, label: col }));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 600, marginRight: 15 }}>
          {loading ? "Loading Spreadsheets..." : "Select Spreadsheet"}
        </label>
        {loading ? (
          <Spin />
        ) : (
          <AntSelect
            style={{ marginTop: 10 }}
            placeholder="Select a spreadsheet"
            value={sheetName || undefined}
            onChange={onSpreadsheetChange}
            allowClear
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {spreadsheets?.map(sheet => (
              <Option key={sheet.spreadsheetId} value={sheet.spreadsheetId}>
                {sheet.spreadsheetName}
              </Option>
            ))}
          </AntSelect>
        )}

      </div>
      {!loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible relative z-10">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Form Field Mapping with Google Sheet Columns
            </h3>
          </div>

          <div className="p-4 space-y-1 relative">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-3 items-center pb-2 mb-2 border-b border-gray-100">
              <div className="col-span-5">
                <label className="block text-xs font-medium text-gray-500 uppercase">
                  Sheet Column
                </label>
              </div>
              <div className="col-span-6">
                <label className="block text-xs font-medium text-gray-500 uppercase">
                  Form Field
                </label>
              </div>
              <div className="col-span-1" />
            </div>

            {/* Mapping rows */}
            <AnimatePresence>
              {fieldMappings.map((mapping, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`group relative grid grid-cols-12 gap-3 items-center py-2 hover:bg-gray-50 rounded-md transition-colors duration-150 ${error && (!mapping.column || !mapping.id) ? "border border-red-400" : ""
                    }`}
                >
                  {/* Sheet Column */}
                  <div className="col-span-5 relative">
                    <CreatableSelect
                      value={mapping.column ? { value: mapping.column, label: mapping.label } : null}
                      onChange={val => handleColumnChange(index, val)}
                      options={formFields
                        .filter(f => !fieldMappings.some((m, i) => m.id === f.id && i !== index))
                        .map(f => ({ value: f.id, label: f.name }))}
                      isClearable
                      placeholder="Select column"
                      styles={{
                        container: base => ({ ...base, fontSize: "0.875rem" }),
                        control: base => ({ ...base, minHeight: "36px" }),
                      }}
                    />
                  </div>

                  {/* Form Field */}
                  <div className="col-span-6 relative">
                    <Select
                      value={mapping.id ? { value: mapping.id, label: mapping.name } : null}
                      onChange={val => handleFieldChange(index, val)}
                      options={formFields
                        .filter(f => !fieldMappings.some((m, i) => m.id === f.id && i !== index))
                        .map(f => ({ value: f.id, label: f.name }))}
                      isClearable
                      placeholder="Select field"
                      styles={{
                        container: base => ({ ...base, fontSize: "0.875rem" }),
                        control: base => ({ ...base, minHeight: "36px" }),
                      }}
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1 flex justify-center opacity-30 group-hover:opacity-100 transition-opacity duration-150">
                    {fieldMappings.length > 1 && (
                      <button
                        onClick={() => removeFieldMapping(index)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                        title="Remove mapping"
                      >
                        <svg width="14" height="14" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.7601 1C11.8925 1 12 1.09029 12 1.20166V1.79833C12 1.90971 11.8925 2 11.7601 2H0.240001C0.107452 2 0 1.90971 0 1.79833V1.20166C0 1.09029 0.107452 1 0.240001 1H3.42661C3.96661 1 4.40521 0.450497 4.40521 0H7.59482C7.59482 0.450497 8.03282 1 8.57343 1H11.7601Z" fill="#0B0A0A" />
                          <path d="M11.4678 4.4502L9.61816 15.5498H2.38184L0.532227 4.4502H11.4678Z" fill="white" stroke="#262626ff" strokeWidth="0.9" />
                        </svg>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add More Fields Button */}
            <button
              onClick={addFieldMapping}
              className="flex items-center justify-center w-full bg-[#c9eaff70] text-[#028AB0] px-4 py-2 text-sm font-medium mt-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Field Mapping
            </button>
          </div>
        </div>

      )}
      {error && <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ color: "#ff4d4f", marginTop: 16, fontWeight: 500 }}
      >
        {error}
      </motion.div>}
      {spreadsheetId && (
        <ConditionsPanel
          columns={selectedColumns.flat()}
          conditions={sheetconditions}
          setConditions={setsheetConditions}
          sheetlogicType={conditionsLogic}
          setsheetLogicType={setConditionsLogic}
          customLogic={sheetcustomLogic}
          setCustomLogic={setsheetCustomLogic}
          updateMultiple={updateMultiple}
          setUpdateMultiple={setUpdateMultiple}
        />
      )}
    </div>
  );
};

const GoogleSheetFindPanel = ({
  instanceUrl, userId, token,
  sheetsApiUrl, // API endpoint for list of sheets
  initialConfig // { spreadsheetId, sheetName, columnMappings, conditions, returnLimit, sortField, sortOrder }
}) => {
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(initialConfig?.spreadsheetId || "");
  const [sheetName, setSheetName] = useState(initialConfig?.sheetName || "");
  const [columns, setColumns] = useState(initialConfig?.columns || []);
  const [columnMappings, setColumnMappings] = useState(initialConfig?.columnMappings || []);
  const [findconditions, setConditions] = useState(initialConfig?.conditions || []);
  const [findlogicType, setLogicType] = useState(initialConfig?.logicType || "AND");
  const [findcustomLogic, setCustomLogic] = useState(initialConfig?.customLogic || "");
  const [findreturnLimit, setReturnLimit] = useState(initialConfig?.googleSheetReturnLimit || "");
  const [findsortField, setSortField] = useState(initialConfig?.googleSheetSortField || "");
  const [findsortOrder, setSortOrder] = useState(initialConfig?.googleSheetSortOrder || "ASC");
  const [findupdateMultiple, setupdateMultiple] = useState(initialConfig?.updateMultiple);
  const [error, setError] = useState("");
  const [accordionOpen, setAccordionOpen] = useState({
    findreturnLimit: false,
    findsortRecords: false,
  });

  // Fetch spreadsheets on mount or when dependencies change
  useEffect(() => {
    if (!instanceUrl || !userId || !token || !sheetsApiUrl) return;

    const url = new URL(sheetsApiUrl);
    url.searchParams.append("instanceUrl", instanceUrl);
    url.searchParams.append("sfToken", token);
    url.searchParams.append("userId", userId);
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const list = data.spreadsheets || [];
        setSpreadsheets(list);
      })
      .catch(err => {
        setError("Failed to fetch Google Sheets: " + err.message);
      })
      .finally(() => setLoading(false));
  }, [instanceUrl, userId, token, sheetsApiUrl]);

  // When spreadsheet is selected, populate sheetName and columns
  useEffect(() => {
    if (!spreadsheetId) {
      setSheetName("");
      setColumns([]);
      return;
    }
    const selected = spreadsheets.find(s => s.spreadsheetId === spreadsheetId);
    if (selected) {
      setSheetName(selected.spreadsheetName);
      setColumns(selected.columns[0] || []);
    }
  }, [spreadsheetId, spreadsheets]);

  // Column options for selects
  const columnOptions = columns.map(col => ({
    value: col,
    label: col
  }));

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Sheet selection */}
      <div className="mb-4">
        <label className="font-medium mb-2 block">{loading ? 'Loading...' : 'Select Google Sheet'}</label>
        {loading ? (
          <Spin />
        ) : (
          <Select
            value={spreadsheetId ? { value: spreadsheetId, label: sheetName } : null}
            onChange={opt => setSpreadsheetId(opt?.value || "")}
            options={spreadsheets.map(s => ({ value: s.spreadsheetId, label: s.spreadsheetName }))}
            placeholder="Choose Google Sheet"
            isClearable
          />
        )}
        {error && !spreadsheetId && (
          <div className="text-red-500 mt-1">{error}</div>
        )}
      </div>

      {/* Conditions Panel placeholder */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
        <ConditionsPanel columns={columns} conditions={findconditions} setConditions={setConditions}
          logicType={findlogicType} setLogicType={setLogicType} customLogic={findcustomLogic} setCustomLogic={setCustomLogic} updateMultiple={findupdateMultiple} setUpdateMultiple={setupdateMultiple} sheetlogicType={findlogicType} setsheetLogicType={setLogicType} />
        {columns.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-gray-400 text-sm flex items-center gap-2 py-2"
          >
            <span>🔎</span>
            <span>No columns available. Select a Google Sheet to begin.</span>
          </motion.div>
        )}
      </motion.div>

      {/* Return Limit Accordion */}
      <div className="mb-2">
        <button
          className="w-full flex justify-between items-center py-3 text-left font-medium text-gray-700"
          onClick={() =>
            setAccordionOpen(prev => ({ ...prev, findreturnLimit: !prev.findreturnLimit }))
          }
        >
          <span>Return Limit (max 100)</span>
          <svg
            className={`w-5 h-5 transition-transform ${accordionOpen.findreturnLimit ? "rotate-180" : ""
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {accordionOpen.findreturnLimit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className=" pb-4"
          >
            <Input
              type="number"
              value={findreturnLimit}
              min='1'
              max='100'
              onChange={(e) => setReturnLimit(e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-gray-500 mt-1">Enter a number up to 100 or leave blank to return all records.</p>
          </motion.div>
        )}
      </div>

      {/* Sort Records Accordion */}
      <div className="mb-2">
        <button
          className="w-full flex justify-between items-center py-3 text-left font-medium text-gray-700"
          onClick={() =>
            setAccordionOpen(prev => ({ ...prev, findsortRecords: !prev.findsortRecords }))
          }
        >
          <span>Sort Records</span>
          <svg
            className={`w-5 h-5 transition-transform ${accordionOpen.findsortRecords ? "rotate-180" : ""
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {accordionOpen.findsortRecords && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pb-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sort Field</label>
                <AntSelect
                  value={findsortField ? { value: findsortField, label: findsortField } : null}
                  onChange={(opt) => setSortField(opt?.value || "")}
                  options={columnOptions}
                  placeholder="Sort Field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sort Order</label>
                <AntSelect
                  value={{
                    value: findsortOrder,
                    label: findsortOrder === "ASC" ? "Ascending" : "Descending",
                  }}
                  onChange={(opt) => setSortOrder(opt)}
                  options={[
                    { value: "ASC", label: "Ascending" },
                    { value: "DESC", label: "Descending" },
                  ]}
                  placeholder="Sort Order"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>


      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-red-500 bg-red-50 p-2 rounded mb-4"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default ActionPanel;