import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Select, Button, Input, Modal } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import MainMenuBar from '../form-builder-with-versions/MainMenuBar'; // Replaced Sidebar with MainMenuBar
import { FaPlus, FaSave, FaTrash, FaEdit, FaEye } from 'react-icons/fa';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  Handle,
  applyNodeChanges,
  applyEdgeChanges,
} from 'react-flow-renderer';
import './Conditions.css';

const { TabPane } = Tabs;
const { Option } = Select;
// Utility: Generate 100 distinct bracket colors (as background)
const BRACKET_COLORS = [
  '#FF4500', '#FF6EB4', '#32CD32', '#FFD700', '#800080', '#FF1493', '#00CED1', '#FF8C00', '#8B0000', '#006400',
  '#8B008B', '#00BFFF', '#228B22', '#DAA520', '#4B0082', '#FF69B4', '#48D1CC', '#FF7F50', '#A52A2A', '#228B22',
  '#BA55D3', '#87CEFA', '#9ACD32', '#FF6347', '#9400D3', '#FF00FF', '#40E0D0', '#FF4500', '#A52A2A', '#2E8B57',
  '#D2691E', '#7B68EE', '#00FA9A', '#FFA07A', '#8A2BE2', '#FF6EB4', '#20B2AA', '#FF6347', '#B22222', '#556B2F',
  '#9932CC', '#ADD8E6', '#7FFF00', '#FF69B4', '#800000', '#48D1CC', '#DA70D6', '#00BFFF', '#9ACD32', '#FF4500',
  '#4B0082', '#66CDAA', '#FF8C00', '#8B0000', '#00FF7F', '#FF1493', '#2E8B57', '#D2691E', '#7B68EE', '#00FA9A',
  '#FFA07A', '#8A2BE2',  '#B22222', '#20B2AA', '#FF6347', '#B22222', '#556B2F', '#9932CC', '#ADD8E6', '#7FFF00',
  '#FF69B4', '#800000', '#48D1CC', '#DA70D6', '#00BFFF', '#9ACD32', '#FF4500', '#4B0082', '#66CDAA', '#FF8C00',
  '#8B0000', '#00FF7F', '#FF1493', '#2E8B57', '#D2691E', '#7B68EE', '#00FA9A', '#FFA07A', '#8A2BE2', '#FF6EB4',
  '#20B2AA', '#FF6347', '#1E90FF', '#556B2F', '#9932CC', '#ADD8E6', '#7FFF00', '#FF69B4', '#800000', '#48D1CC'
];


const Conditions = ({ formVersionId }) => {
  const navigate = useNavigate();
  const [conditions, setConditions] = useState([]);
  const [fields, setFields] = useState([]);
  const [formRecords, setFormRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [token, setToken] = useState(null);
  const [newCondition, setNewCondition] = useState({
    type: 'show_hide',
    conditions: [{ ifField: '', operator: '', value: '' }],
    logic: 'AND', // Default logic for combining multiple conditions (not used in dependent tab)
    logicExpression: '',
    thenAction: 'show',
    thenFields: [],
    dependentField: '',
    dependentValues: [],
    maskPattern: '',
    sourcePage: '',
    targetPage: [], // Changed to array to support multiple hide pages
    // For dependent tab, use single condition fields
    ifField: '',
    value: '',
    loopField: '', // New: Field for loop condition
    loopValue: '', // New: Static value for loop
    loopType: 'static', // New: 'static' or 'field' for loop value source
  });
  const [editingConditionId, setEditingConditionId] = useState(null);
  const [pages, setPages] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isCalcModalVisible, setIsCalcModalVisible] = useState(false);
  const [calcExpression, setCalcExpression] = useState(''); // local modal expression
  const [calcFields, setCalcFields] = useState([]); // fields list for Add Field dropdown
  const [calcFieldToAdd, setCalcFieldToAdd] = useState(''); // selected field to add
  const [fieldPills, setFieldPills] = React.useState([]);
  const [isShowHideModalVisible, setIsShowHideModalVisible] = React.useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [logicValidationError, setLogicValidationError] = useState(null);
  const canShowPreview = newCondition.logic === 'Custom' && !logicValidationError && newCondition.logicExpression.trim().length > 0;

  // Show preview icon only if logic is Custom and expression valid
  const handleLogicExpressionBlur = () => {
    
    if (newCondition.logic === 'Custom') {
      const validationError = validateCustomLogic(newCondition.logicExpression, newCondition.conditions.length);
      setLogicValidationError(validationError);
    } else {
      setLogicValidationError(null);
    }
  };


  // Handler for preview icon click
  const openPreview = () => {
    setIsPreviewVisible(true);
    setIsShowHideModalVisible(false); // hide editing modal
  };

  const closePreview = () => {
    setIsPreviewVisible(false);
    setIsShowHideModalVisible(true); // show editing modal back
  };
  // Animation variants for Framer Motion
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  // Fetch form fields, conditions, and access token
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userId = sessionStorage.getItem('userId');
        const instanceUrl = sessionStorage.getItem('instanceUrl');
        if (!userId || !instanceUrl) throw new Error('Missing userId or instanceUrl.');

        // Fetch access token
        const response = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, instanceUrl }),
        });
        const tokenData = await response.json();
        if (!response.ok) throw new Error(tokenData.error || 'Failed to fetch access token');
        setToken(tokenData.access_token);

        // Fetch metadata
        const metadataResponse = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenData.access_token}`,
          },
          body: JSON.stringify({
            userId,
            instanceUrl: instanceUrl.replace(/https?:\/\//, ''),
          }),
        });

        const data = await metadataResponse.json();
        if (!metadataResponse.ok) throw new Error(data.error || 'Failed to fetch metadata');

        const records = JSON.parse(data.FormRecords || '[]');
        setFormRecords(records);
        let formVersion = null;
        for (const form of records) {
          formVersion = form.FormVersions.find((v) => v.Id === formVersionId);
          if (formVersion) break;
        }

        if (!formVersion) throw new Error(`Form version ${formVersionId} not found`);
        console.log('Form Version Data:', formVersion);
        setFields(formVersion.Fields || []);
        const parsedConditions = Array.isArray(formVersion.Conditions)
          ? formVersion.Conditions.flat().map((c) => ({
              ...c,
              ...JSON.parse(c.Condition_Data__c || '{}'),
              logicExpression: c.logic === 'Custom' ? (c.logicExpression || '') : '',            }))
          : [];
        setConditions(parsedConditions);
        console.log('Parsed Conditions:', parsedConditions);
        
        const uniquePageNumbers = [...new Set(formVersion.Fields.map((field) => field.Page_Number__c))].sort((a, b) => a - b);
        console.log('Unique Page Numbers:', uniquePageNumbers);
        const derivedPages = uniquePageNumbers.map((pageNum, index) => ({
          Id: `page_${pageNum}`,
          Name: `Page ${pageNum}`,
          Fields: formVersion.Fields.filter((f) => f.Page_Number__c === pageNum).map((f) => f.Unique_Key__c),
        }));
        console.log('Dervied Pages:', derivedPages);
        
        setPages(derivedPages);

        // Initialize nodes for pages
        const pageNodes = derivedPages.map((page, index) => ({
          id: page.Id,
          type: 'customNode',
          data: {
            label: page.Name,
            onClick: () => {
              setSelectedNode(page.Id);
              setIsModalVisible(true);
            },
          },
          position: { x: 300, y: index * 200 + 50 }, // Linear left-to-right layout
        }));
        setNodes(pageNodes);
        const conditionGroups = parsedConditions
          .filter((c) => c.type === 'skip_hide_page')
          .reduce((acc, condition) => {
            const conditionData = condition.Condition_Data__c ? JSON.parse(condition.Condition_Data__c) : condition;
            if (conditionData.thenAction === 'loop') {
              const key = `${conditionData.sourcePage}-loop`;
              if (!acc[key]) {
                acc[key] = {
                  source: conditionData.sourcePage,
                  target: conditionData.sourcePage, // Loop targets same page
                  thenAction: 'loop',
                  conditions: [],
                };
              }
              acc[key].conditions.push(conditionData);
            } else {
              conditionData.targetPage.forEach((target) => {
                const key = `${conditionData.sourcePage}-${conditionData.thenAction}-${target}`;
                if (!acc[key]) {
                  acc[key] = {
                    source: conditionData.sourcePage,
                    target,
                    thenAction: conditionData.thenAction,
                    conditions: [],
                  };
                }
                acc[key].conditions.push(conditionData);
              });
            }
            return acc;
          }, {});
        // Initialize edges with variable positioning
        const pageEdges = Object.values(conditionGroups).map((group, idx) => {
          const sourceNode = pageNodes.find((n) => n.id === group.source);
          const targetNode = pageNodes.find((n) => n.id === group.target);
          if (!sourceNode || !targetNode) return null;

          const offset = (idx - (Object.values(conditionGroups).filter(g => g.source === group.source && g.thenAction === group.thenAction).length - 1) / 2) * 50;
          return {
            id: `${group.source}-${group.thenAction}-${group.target}`,
            source: group.source,
            target: group.target,
            label: group.thenAction === 'loop'
              ? `Loop (${group.conditions.length} condition${group.conditions.length > 1 ? 's' : ''})`
              : group.conditions.map((c) => `${c.thenAction} ${pages.find((p) => p.Id === c.targetPage[0])?.Name || 'Unknown'}`)?.join(', '),
            type: 'smoothstep',
            animated: group.thenAction === 'skip to' || group.thenAction === 'loop',
            style: {
              stroke: group.thenAction === 'skip to' ? '#1a73e8' : group.thenAction === 'hide' ? '#ff4d4f' : '#00cc00', // Green for loop
              strokeWidth: 2,
              zIndex: 10 + idx,
            },
            markerEnd: { type: 'arrowclosed' },
            data: { conditions: group.conditions },
          };
        }).filter(Boolean);

        const defaultEdges = derivedPages.slice(0, -1).map((page, index) => {
          const sourceNode = pageNodes.find((n) => n.id === page.Id);
          const targetNode = pageNodes.find((n) => n.id === derivedPages[index + 1].Id);
          return {
            id: `default_${page.Id}_to_${derivedPages[index + 1].Id}`,
            source: page.Id,
            target: derivedPages[index + 1].Id,
            label: 'Next',
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#999', strokeWidth: 2, strokeDasharray: '5,5', zIndex: 5 },
            markerEnd: { type: 'arrowclosed' },
          };
        });
        setEdges([...pageEdges, ...defaultEdges]);
        

      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [formVersionId]);

  useEffect(() => {
    if (isCalcModalVisible) {
      setCalcExpression(newCondition.formula || '');
    }
  }, [isCalcModalVisible, newCondition.formula]);


  const checkForContradiction = (newCondition, existingConditions) => {
    const oppositeActions = {
      show: 'hide',
      hide: 'show',
      require: "don't require",
      "don't require": 'require',
      enable: 'disable',
      disable: 'enable',
      'set mask': 'unmask',
      unmask: 'set mask',
    };

    for (const condition of existingConditions) {
      const conditionData = condition.Condition_Data__c ? JSON.parse(condition.Condition_Data__c || '{}') : condition;
      if (conditionData.type !== newCondition.type) continue;

      let isSameIf = false;
      if (newCondition.type === 'dependent') {
        isSameIf =
          conditionData.ifField === newCondition.ifField &&
          conditionData.value === newCondition.value;
      } else {
        isSameIf =
          newCondition.conditions?.length === conditionData.conditions?.length &&
          newCondition.conditions?.every((newCond, index) => {
            const existingCond = conditionData.conditions?.[index];
            if (!existingCond) return false;
            return (
              existingCond.ifField === newCond.ifField &&
              existingCond.operator === newCond.operator &&
              existingCond.value === newCond.value
            );
          }) && conditionData.logic === newCondition.logic;
      }

      const existingThenFields = Array.isArray(conditionData.thenFields)
        ? conditionData.thenFields
        : [conditionData.thenFields].filter(Boolean);
      const newThenFields = Array.isArray(newCondition.thenFields)
        ? newCondition.thenFields
        : [newCondition.thenFields].filter(Boolean);

      if (newCondition.type === 'show_hide' && isSameIf) {
        if (
          oppositeActions[conditionData.thenAction] === newCondition.thenAction &&
          existingThenFields.some((field) => newThenFields.includes(field))
        ) {
          return `Contradictory condition found: Cannot ${newCondition.thenAction} the same field(s) when ${conditionData.thenAction} is already set with ${conditionData.logic} logic for the same condition group.`;
        }
      } else if (newCondition.type === 'enable_require_mask' && isSameIf) {
        if (
          oppositeActions[conditionData.thenAction] === newCondition.thenAction &&
          existingThenFields.some((field) => newThenFields.includes(field))
        ) {
          return `Contradictory condition found: Cannot ${newCondition.thenAction} the same field(s) when ${conditionData.thenAction} is already set with ${conditionData.logic} logic for the same condition group.`;
        }
      } else if (
        newCondition.type === 'dependent' &&
        isSameIf &&
        conditionData.dependentField === newCondition.dependentField &&
        JSON.stringify(conditionData.dependentValues) !== JSON.stringify(newCondition.dependentValues)
      ) {
        return `Contradictory condition found: Cannot set different dependent values for the same controlling field and value.`;
      } else if (newCondition.type === 'skip_hide_page' && isSameIf) {
        if (newCondition.thenAction === 'loop') {
          if (conditionData.thenAction === 'loop' && conditionData.sourcePage === newCondition.sourcePage) {
            return 'Contradictory condition found: Only one loop condition is allowed per page.';
          }
          if (newCondition.sourcePage !== newCondition.targetPage[0]) {
            return 'Loop condition must target the same page as the source page.';
          }
        }
        if (
          conditionData.thenAction === newCondition.thenAction &&
          conditionData.targetPage === newCondition.targetPage
        ) {
          return `Contradictory condition found: Cannot ${newCondition.thenAction} the same page with the same condition group under ${conditionData.logic} logic.`;
        }
        if (
          newCondition.thenAction === 'hide' &&
          (newCondition.targetPage === pages[0]?.Id || newCondition.targetPage === pages[pages.length - 1]?.Id)
        ) {
          return 'Cannot hide the first or last page.';
        }
      }
    }
    return null;
  };

  const validateCustomLogic = (logicExpression, conditionCount) => {
    if (!logicExpression) return 'Custom logic expression is required';

    // Check for valid characters (digits, AND, OR, parentheses, spaces)
    if (!/^[0-9\s()ANDOR]+$/.test(logicExpression)) {
      return 'Invalid characters in logic expression. Use numbers, AND, OR, parentheses, and spaces only.';
    }

    // Check for valid condition indices
    const indices = logicExpression.match(/\d+/g) || [];
    const uniqueIndices = [...new Set(indices.map(Number))];
    if (uniqueIndices.length === 0) {
      return 'Logic expression must include at least one condition index.';
    }
    if (uniqueIndices.some((i) => i < 1 || i > conditionCount)) {
      return `Condition indices must be between 1 and ${conditionCount}.`;
    }
    if (uniqueIndices.length !== conditionCount) {
      return `All conditions (1 to ${conditionCount}) must be included in the logic expression.`;
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of logicExpression) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return 'Unmatched closing parenthesis.';
    }
    if (parenCount !== 0) return 'Unmatched opening parenthesis.';

    // Tokenize the expression
    const tokens = logicExpression
      .replace(/\(/g, ' ( ')
      .replace(/\)/g, ' ) ')
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length < 3) return 'Logic expression is too short.';

    // Validate token sequence using a state machine
    let expectOperand = true; // true: expect number or '(', false: expect operator or ')'
    let parenDepth = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (expectOperand) {
        if (/^\d+$/.test(token)) {
          expectOperand = false; // After a number, expect an operator or ')'
        } else if (token === '(') {
          parenDepth++;
          // Still expect an operand (number or another '(')
        } else {
          return `Invalid token at position ${i + 1}: Expected number or '(', got ${token}.`;
        }
      } else {
        if (['AND', 'OR'].includes(token)) {
          expectOperand = true; // After an operator, expect a number or '('
        } else if (token === ')') {
          parenDepth--;
          if (parenDepth < 0) return 'Unmatched closing parenthesis.';
          // After ')', expect an operator or another ')' if still in parentheses
          expectOperand = false;
        } else {
          return `Invalid token at position ${i + 1}: Expected 'AND', 'OR', or ')', got ${token}.`;
        }
      }
    }

    // Ensure the expression doesn't end expecting an operand
    if (expectOperand) {
      return 'Expression ends unexpectedly; missing a condition index.';
    }

    // Ensure parentheses are balanced at the end
    if (parenDepth !== 0) return 'Unmatched opening parenthesis.';

    return null;
  };

  const editCondition = (condition) => {
    console.log('Editing condition:', condition);
    const conditionData = condition.Condition_Data__c ? JSON.parse(condition.Condition_Data__c || '{}') : condition;
    setNewCondition({
      type: conditionData.type,
      conditions: conditionData.type === 'dependent'
        ? [{ ifField: conditionData.ifField || '', operator: 'equals', value: conditionData.value || '' }]
        : conditionData.conditions || [{ ifField: '', operator: '', value: '' }],
      logic: conditionData.type !== 'dependent' ? conditionData.logic || 'AND' : 'AND',
      logicExpression: conditionData.logic === 'Custom' ? conditionData.logicExpression || '' : '',
      thenAction: conditionData.thenAction || (conditionData.type === 'enable_require_mask' ? 'require' : conditionData.type === 'skip_hide_page' ? 'skip to' : 'show'),
      thenFields: conditionData.type !== 'dependent' && conditionData.type !== 'skip_hide_page'
        ? (Array.isArray(conditionData.thenFields) ? conditionData.thenFields : [conditionData.thenFields].filter(Boolean))
        : [],
      dependentField: conditionData.dependentField || '',
      dependentValues: conditionData.dependentValues || [],
      maskPattern: conditionData.maskPattern || '',
      sourcePage: conditionData.sourcePage || '',
      targetPage: Array.isArray(conditionData.targetPage) ? conditionData.targetPage : [conditionData.targetPage].filter(Boolean),
      ifField: conditionData.type === 'dependent' ? conditionData.ifField || '' : '',
      value: conditionData.type === 'dependent' ? conditionData.value || '' : '',
      loopField: conditionData.loopField || '',
      loopValue: conditionData.loopValue || '',
      loopType: conditionData.loopType || 'static',
    });
    setEditingConditionId(conditionData.Id);
    if (conditionData.type === 'skip_hide_page') {
      setSelectedNode(conditionData.sourcePage);
      setIsModalVisible(true);
    }
    else if (conditionData.type === 'update_calculate_field') {
      setNewCondition({
        ...newCondition,
        type: 'update_calculate_field',
        conditions: conditionData.conditions || [{ ifField: '', operator: '', value: '' }],
        action: conditionData.action || '',
        sourceFields: conditionData.sourceFields || [],
        formula: convertFormulaKeysToLabels(conditionData.formula || ''),
        targetField: conditionData.targetField || '',
         logic: conditionData.type !== 'dependent' ? conditionData.logic || 'AND' : 'AND',
        logicExpression: conditionData.logic === 'Custom' ? conditionData.logicExpression || '' : '',
      });
      setEditingConditionId(conditionData.Id);
    }
  };

  const saveCondition = async (conditionId = null) => {
    if (!token) {
      setError('Access token not available');
      return;
    }
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) throw new Error('Missing userId or instanceUrl.');
      // Validate custom logic if selected
      if (newCondition.logic === 'Custom') {
        const validationError = validateCustomLogic(newCondition.logicExpression, newCondition.conditions.length);
        if (validationError) throw new Error(validationError);
      }
      const contradictionError = checkForContradiction(newCondition, conditions.filter(c => c.Id !== conditionId));
      if (contradictionError) {
        setError(contradictionError);
        return;
      }
      let conditionData;
      if (newCondition.type === 'show_hide') {
        if (!newCondition.conditions?.every((c) => c.ifField && c.operator)) {
          throw new Error('Missing required fields for show/hide condition');
        }
        conditionData = {
          Form_Version__c: formVersionId,
          Condition_Data__c: JSON.stringify({
            Id: editingConditionId || `local_${Date.now()}`,
            type: 'show_hide',
            conditions: newCondition.conditions?.map((c) => ({
              ifField: c.ifField,
              operator: c.operator,
              value: c.value || null,
            })),
            logic: newCondition.logic,
            logicExpression: newCondition.logic === 'Custom' ? newCondition.logicExpression : '',
            thenAction: newCondition.thenAction,
            thenFields: newCondition.thenFields,
          }),
        };
      } else if (newCondition.type === 'update_calculate_field') {
        if (
          !newCondition.conditions?.[0]?.ifField ||
          !newCondition.conditions?.[0]?.operator ||
          !newCondition.action ||
          !newCondition.targetField ||
          (newCondition.action === 'copy_field_values' && !(newCondition.sourceFields && newCondition.sourceFields.length))
        ) {
          throw new Error('Missing required fields for update/calculate condition');
        }
        conditionData = {
          Form_Version__c: formVersionId,
          Condition_Data__c: JSON.stringify({
            Id: editingConditionId || `local_${Date.now()}`,
            type: 'update_calculate_field',
            conditions: newCondition.conditions,
            action: newCondition.action,
            sourceFields: newCondition.sourceFields || [],
            formula: convertFormulaLabelsToKeys(newCondition.formula || ''),
            targetField: newCondition.targetField,
            logic: newCondition.logic,
            logicExpression: newCondition.logic === 'Custom' ? newCondition.logicExpression : '',
          }),
        };
      } else if (newCondition.type === 'dependent') {
        if (!newCondition.ifField || !newCondition.value || !newCondition.dependentField || newCondition.dependentValues.length === 0) {
          throw new Error('Missing required fields for dependent condition');
        }
        conditionData = {
          Form_Version__c: formVersionId,
          Condition_Data__c: JSON.stringify({
            Id: editingConditionId || `local_${Date.now()}`,
            type: 'dependent',
            ifField: newCondition.ifField,
            value: newCondition.value,
            dependentField: newCondition.dependentField,
            dependentValues: newCondition.dependentValues,
          }),
        };
      } else if (newCondition.type === 'skip_hide_page') {
        console.log('Processing skip/hide page condition:', newCondition);
        if (!newCondition.conditions?.every((c) => c.ifField && c.operator) || !newCondition.targetPage || !newCondition.sourcePage) {
          throw new Error('Missing required fields for skip/hide page condition');
        }
        const derivedPages = [...new Set(fields.map((field) => field.Page_Number__c))]
          .sort((a, b) => a - b)
          .map((pageNum) => ({
            Id: `page_${pageNum}`,
            Name: `Page ${pageNum}`,
          }));
        if (newCondition.thenAction === 'hide' && newCondition.targetPage.some((page) => page === derivedPages[0]?.Id || page === derivedPages[derivedPages.length - 1]?.Id)) {
          throw new Error('Cannot hide the first or last page');
        }
        conditionData = {
          Form_Version__c: formVersionId,
          Condition_Data__c: JSON.stringify({
            Id: editingConditionId || `local_${Date.now()}`,
            type: 'skip_hide_page',
            conditions: newCondition.conditions?.map((c) => ({
              ifField: c.ifField,
              operator: c.operator,
              value: c.operator === 'is null' || c.operator === 'is not null' ? null : c.value,
            })),
            logic: newCondition.logic,
            logicExpression: newCondition.logic === 'Custom' ? newCondition.logicExpression : '',
            thenAction: newCondition.thenAction,
            sourcePage: newCondition.sourcePage,
            targetPage: newCondition.targetPage,
             ...(newCondition.thenAction === 'loop' ? {
              loopField: newCondition.loopField,
              loopValue: newCondition.loopValue,
              loopType: newCondition.loopType,
            } : {}),
          }),
        };
      } else {
        // enable_require_mask
        if (!newCondition.conditions?.every((c) => c.ifField && c.operator) || !newCondition.thenFields.length) {
          throw new Error('Missing required fields for enable/require/mask condition');
        }
        if (newCondition.thenAction === 'set mask' && !newCondition.maskPattern) {
          throw new Error('Mask pattern is required for set mask action');
        }
        conditionData = {
          Form_Version__c: formVersionId,
          Condition_Data__c: JSON.stringify({
            Id: editingConditionId || `local_${Date.now()}`,
            type: 'enable_require_mask',
            conditions: newCondition.conditions?.map((c) => ({
              ifField: c.ifField,
              operator: c.operator,
              value: c.operator === 'is null' || c.operator === 'is not null' ? null : c.value,
            })),
            logic: newCondition.logic,
            logicExpression: newCondition.logic === 'Custom' ? newCondition.logicExpression : '',
            thenAction: newCondition.thenAction,
            thenFields: newCondition.thenFields,
            ...(newCondition.thenAction === 'set mask' ? { maskPattern: newCondition.maskPattern } : {}),
            ...(newCondition.thenAction === 'unmask' ? { maskPattern: null } : {}),
          }),
        };
      }
      console.log('Saving condition data:', conditionData);

      const response = await fetch(process.env.REACT_APP_SAVE_CONDITION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: instanceUrl.replace(/https?:\/\//, ''),
          condition: conditionData,
          formVersionId,
          conditionId, // Pass conditionId for editing
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save condition');

      setConditions((prev) =>
        conditionId
          ? prev.map((c) => (c.Id === conditionId ? data.condition : c))
          : [...prev, data.condition]
      );
      
      if (newCondition.type === 'skip_hide_page') {
        // Normalize targetPage to an array
        const targetPages = Array.isArray(newCondition.targetPage) ? newCondition.targetPage : [newCondition.targetPage].filter(Boolean);
        console.log('Normalized targetPages:', targetPages);

        // Create or update edges for each target page
        setEdges((prevEdges) => {
          console.log('Previous Edges:', prevEdges);
          let newEdges = [...prevEdges];

          if (newCondition.thenAction === 'loop') {
            const edgeId = `${newCondition.sourcePage}-loop`;
            const existingEdge = newEdges.find((e) => e.id === edgeId);
            if (existingEdge) {
              const updatedConditions = conditionId
                ? existingEdge.data.conditions.map((c) => (c.Id === conditionId ? data.condition : c))
                : [...existingEdge.data.conditions, data.condition];
              newEdges = newEdges.map((e) =>
                e.id === edgeId
                  ? {
                      ...e,
                      data: { conditions: updatedConditions },
                      label: `Loop (${updatedConditions.length} condition${updatedConditions.length > 1 ? 's' : ''})`,
                      animated: true,
                      style: {
                        stroke: '#00cc00',
                        strokeWidth: 2,
                        zIndex: newEdges.findIndex((e) => e.id === edgeId) + 10,
                      },
                    }
                  : e
              );
            } else {
              const newEdge = {
                id: edgeId,
                source: newCondition.sourcePage,
                target: newCondition.sourcePage,
                label: `Loop (1 condition)`,
                type: 'smoothstep',
                animated: true,
                style: {
                  stroke: '#00cc00',
                  strokeWidth: 2,
                  zIndex: 10,
                },
                markerEnd: { type: 'arrowclosed' },
                data: { conditions: [data.condition] },
                sourceX: nodes.find((n) => n.id === newCondition.sourcePage)?.position.x,
                sourceY: nodes.find((n) => n.id === newCondition.sourcePage)?.position.y + 50,
                targetX: nodes.find((n) => n.id === newCondition.sourcePage)?.position.x,
                targetY: nodes.find((n) => n.id === newCondition.sourcePage)?.position.y - 50,
              };
              newEdges = [
                ...newEdges.filter((e) => !(e.source === newCondition.sourcePage && e.id.startsWith(`${newCondition.sourcePage}-loop`))),
                newEdge,
              ];
            }
          } else {
            // Create or update an edge for each target page
            targetPages.forEach((targetPage) => {
              const edgeId = `${newCondition.sourcePage}-${newCondition.thenAction}-${targetPage}`;
              console.log('Generated edgeId:', edgeId);
              const existingEdge = newEdges.find((e) => e.id === edgeId);
              if (existingEdge) {
                const updatedConditions = conditionId
                  ? existingEdge.data.conditions.map((c) => (c.Id === conditionId ? data.condition : c))
                  : [...existingEdge.data.conditions, data.condition];
                newEdges = newEdges.map((e) =>
                  e.id === edgeId
                    ? {
                        ...e,
                        data: { conditions: updatedConditions },
                        label: updatedConditions
                          .map((c) => `${c.thenAction} ${pages.find((p) => p.Id === c.targetPage[0])?.Name || 'Unknown'}`)
                          .join(', '),
                        animated: updatedConditions.some((c) => c.thenAction === 'skip to'),
                        style: {
                          stroke: updatedConditions.some((c) => c.thenAction === 'skip to') ? '#1a73e8' : '#ff4d4f',
                          strokeWidth: 2,
                          zIndex: newEdges.findIndex((e) => e.id === edgeId) + 10,
                        },
                      }
                    : e
                );
              } else {
                const newEdge = {
                  id: edgeId,
                  source: newCondition.sourcePage,
                  target: targetPage,
                  label: `${data.condition.thenAction} ${pages.find((p) => p.Id === targetPage)?.Name || 'Unknown'}`,
                  type: 'smoothstep',
                  animated: data.condition.thenAction === 'skip to',
                  style: {
                    stroke: data.condition.thenAction === 'skip to' ? '#1a73e8' : '#ff4d4f',
                    strokeWidth: 2,
                    zIndex: 10,
                  },
                  markerEnd: { type: 'arrowclosed' },
                  data: { conditions: [data.condition] },
                  sourceX: nodes.find((n) => n.id === newCondition.sourcePage)?.position.x,
                  sourceY: nodes.find((n) => n.id === newCondition.sourcePage)?.position.y + 50,
                  targetX: nodes.find((n) => n.id === targetPage)?.position.x,
                  targetY: nodes.find((n) => n.id === targetPage)?.position.y - 50,
                };
                newEdges = [
                  ...newEdges.filter((e) =>
                    !(e.source === newCondition.sourcePage &&
                      e.id.startsWith(`${newCondition.sourcePage}-${newCondition.thenAction}-`) &&
                      e.id !== `default_${newCondition.sourcePage}_to_` &&
                      e.target !== targetPage)
                  ),
                  newEdge,
                ];
              }
            });
          }
          console.log('Updated Edges:', newEdges);
          return newEdges;
        });
      }
      setNewCondition({
        type: newCondition.type,
        conditions: newCondition.type === 'dependent' ? [{ ifField: '', operator: '', value: '' }] : [{ ifField: '', operator: '', value: '' }],
        logic: 'AND',
        logicExpression: '',
        thenAction: newCondition.type === 'enable_require_mask' ? 'require' : newCondition.type === 'skip_hide_page' ? 'skip to' : 'show',
        thenFields: [],
        dependentField: '',
        dependentValues: [],
        maskPattern: '',
        sourcePage: newCondition.type === 'skip_hide_page' ? selectedNode : '',
        targetPage: [],
        ifField: newCondition.type === 'dependent' ? '' : '',
        value: newCondition.type === 'dependent' ? '' : '',
      });
      setEditingConditionId(null);
      if (newCondition.type === 'skip_hide_page') {
        setSelectedNode(null);
        setIsModalVisible(false);
      }
      setIsShowHideModalVisible(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteCondition = async (conditionId) => {
    if (!token) {
      setError('Access token not available');
      return;
    }
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) throw new Error('Missing userId or instanceUrl.');

      const response = await fetch(process.env.REACT_APP_DELETE_CONDITION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: instanceUrl.replace(/https?:\/\//, ''),
          conditionId,
          formVersionId,
        }),
      });

      if (!response.ok) throw new Error('Failed to delete condition');
      setConditions(conditions.filter((c) => c.Id !== conditionId));
      setEdges((prevEdges) => {
        const updatedEdges = prevEdges.map((edge) => {
          if (edge.data?.conditions.some((c) => c.Id === conditionId)) {
            const updatedConditions = edge.data.conditions.filter((c) => c.Id !== conditionId);
            return {
              ...edge,
              data: { conditions: updatedConditions },
              label: edge.data.conditions[0]?.thenAction === 'loop'
                ? `Loop (${updatedConditions.length} condition${updatedConditions.length > 1 ? 's' : ''})`
                : updatedConditions.map((c) => `${c.thenAction} ${pages.find((p) => p.Id === c.targetPage[0])?.Name || 'Unknown'}`)?.join(', '),
              animated: updatedConditions.some((c) => c.thenAction === 'skip to' || c.thenAction === 'loop'),
              style: {
                stroke: updatedConditions.some((c) => c.thenAction === 'skip to') ? '#1a73e8' : updatedConditions.some((c) =>
                  c.thenAction === 'hide') ? '#ff4d4f' : '#00cc00',
                strokeWidth: 2,
                zIndex: prevEdges.findIndex((e) => e.id === edge.id) + 10,
              },
            };
          }
          return edge;
        }).filter((edge) => {
          return edge.id.startsWith('default_') || (edge.data?.conditions && edge.data.conditions.length > 0);
        });
        return updatedEdges;
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const validIfFields = fields.filter(
    (f) =>
      !['signature', 'fileupload', 'imageuploader', 'terms', 'displaytext', 'divider', 'pagebreak', 'section', 'header'].includes(
        f.Field_Type__c
      )
  );

  const validControllingFields = fields.filter((f) => ['checkbox', 'radio', 'dropdown'].includes(f.Field_Type__c));
  const validDependentFields = fields.filter((f) => ['dropdown', 'multiselect'].includes(f.Field_Type__c));

  const getOperators = (fieldType) => {
    if (['shorttext', 'longtext', 'email', 'phone', 'address', 'link', 'fullname'].includes(fieldType)) {
      return ['equals', 'not equals', 'is null', 'is not null', 'contains', 'does not contain'];
    }
    if (['number', 'price', 'percent', 'date', 'datetime', 'date-time', 'time'].includes(fieldType)) {
      return ['equals', 'not equals', 'greater than', 'greater than or equal to', 'smaller than', 'smaller than or equal to'];
    }
    if (['checkbox', 'radio', 'dropdown'].includes(fieldType)) {
      return ['equals', 'not equals'];
    }
    return ['equals', 'not equals'];
  };

  const getFieldOptions = (fieldId) => {
    const field = fields.find((f) => f.Unique_Key__c === fieldId);
    if (!field) return [];
    try {
      const properties = JSON.parse(field.Properties__c || '{}');
      if (['checkbox', 'radio', 'dropdown'].includes(field.Field_Type__c)) {
        return properties.options || [];
      }
      return [];
    } catch (err) {
      console.error('Error parsing Properties__c for field options:', err);
      return [];
    }
  };

  const getDependentValues = (fieldId) => {
    const field = fields.find((f) => f.Unique_Key__c === fieldId);
    if (!field) return [];
    try {
      const properties = JSON.parse(field.Properties__c || '{}');
      return ['dropdown', 'multiselect'].includes(field.Field_Type__c) ? properties.options || [] : [];
    } catch (err) {
      console.error('Error parsing Properties__c for dependent values:', err);
      return [];
    }
  };

  useEffect(() => {
  if (newCondition.logicExpression !== undefined) {
    handleLogicExpressionBlur();
  }
}, [newCondition.logicExpression]);

  const handleFieldChange = (field, value, conditionIndex = null) => {
    setNewCondition((prev) => {
      if (prev.type === 'dependent') {
        return {
          ...prev,
          [field]: value,
          ...(field === 'ifField' ? { value: '', dependentField: '', dependentValues: [] } : {}),
          ...(field === 'thenFields' ? { thenFields: value } : {}),
        };
      }
      if (conditionIndex !== null) {
        const updatedConditions = [...prev.conditions];
        updatedConditions[conditionIndex] = {
          ...updatedConditions[conditionIndex],
          [field]: value,
          ...(field === 'ifField' ? { operator: '', value: '' } : {}), // Reset operator and value when ifField changes
          ...(field === 'operator' && ['is null', 'is not null'].includes(value) ? { value: '' } : {}),
        };
        return {
          ...prev,
          conditions: updatedConditions,
        };
      }
      return {
        ...prev,
        [field]: value,
        ...(field === 'thenFields' ? { thenFields: value } : {}),
        ...(field === 'thenAction' && !['set mask', 'unmask'].includes(value) ? { maskPattern: '' } : {}),
        ...(field === 'logic' ? { logic: value, logicExpression: '' } : {}),
        ...(field === 'logicExpression' ? { logicExpression: value } : {}),
      };
    });
  };

  const addDependentValue = () => {
    setNewCondition({ ...newCondition, dependentValues: [...newCondition.dependentValues, ''] });
  };

  const addCondition = () => {
    setNewCondition((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { ifField: '', operator: '', value: '' }],
    }));
  };

  const removeCondition = (index) => {
    setNewCondition((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateDependentValue = (index, value) => {
    const updatedValues = [...newCondition.dependentValues];
    updatedValues[index] = value;
    setNewCondition({ ...newCondition, dependentValues: updatedValues });
  };

  const removeDependentValue = (index) => {
    const updatedValues = newCondition.dependentValues.filter((_, i) => i !== index);
    setNewCondition({ ...newCondition, dependentValues: updatedValues });
  };
  const onNodeClick = (event, node) => {
    setSelectedNode(node.id);
    setIsModalVisible(true);
  };

  const onNodesChange = (changes) => setNodes((nds) => applyNodeChanges(changes, nds));
  const onEdgesChange = (changes) => setEdges((eds) => applyEdgeChanges(changes, eds));
  const nodeTypes = {
    customNode: ({ data, selected, id }) => (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        onClick={data.onClick} // Ensure onClick is bound
        style={{
          background: selected ? '#e6f7ff' : 'linear-gradient(135deg, #ffffff, #f0f4ff)',
          border: `2px solid ${selected ? '#1890ff' : '#1a73e8'}`,
          borderRadius: '12px',
          padding: '16px 24px',
          minWidth: '180px',
          textAlign: 'center',
          fontWeight: '600',
          color: '#1a73e8',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
          fontSize: '14px',
          pointerEvents: 'auto',
        }}
      >
        <Handle
          type="target"
          position="top" // Changed to top for top-to-bottom flow
          id="top"
          style={{ background: '#555', width: '8px', height: '8px' }}
        />
        {data.label}
        <Handle
          type="source"
          position="bottom" // Changed to bottom for top-to-bottom flow
          id="bottom"
          style={{ background: '#555', width: '8px', height: '8px' }}
        />
      </motion.div>
    ),
  };

  const edgeTypes = {
    customBezier: ({ id, source, target, sourceX, sourceY, targetX, targetY, data, ...rest }) => {
      // Handle self-loop case
      if (source === target) {
        // Define a circular or elliptical path for the self-loop
        const node = nodes.find((n) => n.id === source);
        const x = sourceX || node.position.x;
        const y = sourceY || node.position.y + 50; // Start at bottom handle
        const radiusX = 50; // Horizontal radius for the loop
        const radiusY = 30; // Vertical radius for the loop
        // Create an elliptical path for the self-loop
        const path = `
          M ${x} ${y}
          C ${x + radiusX} ${y}, ${x + radiusX} ${y - radiusY * 2}, ${x} ${y - radiusY * 2}
          C ${x - radiusX} ${y - radiusY * 2}, ${x - radiusX} ${y}, ${x} ${y}
        `;
        return (
          <g>
            <path
              id={id}
              className="react-flow__edge-path"
              d={path}
              style={{
                ...rest.style,
                strokeWidth: 3,
                transition: 'stroke 0.3s, stroke-width 0.3s',
              }}
              markerEnd={rest.markerEnd}
            />
          </g>
        );
      }
      // Existing logic for non-self-loops
      const offset = edges
        .filter((e) => e.source === source && e.target === target)
        .findIndex((e) => e.id === id) * 20 -
        ((edges.filter((e) => e.source === source && e.target === target).length - 1) * 20) / 2;
      const midX = (sourceX || nodes.find((n) => n.id === source).position.x) + offset;
      const midY = (sourceY || nodes.find((n) => n.id === source).position.y + 50) +
        ((targetY || nodes.find((n) => n.id === target).position.y - 50) -
          (sourceY || nodes.find((n) => n.id === source).position.y + 50)) / 2;
      const path = `M ${sourceX || nodes.find((n) => n.id === source).position.x} ${sourceY || nodes.find((n) => n.id === source).position.y + 50} 
                    C ${midX} ${(sourceY || nodes.find((n) => n.id === source).position.y + 100) + offset},
                      ${midX} ${(targetY || nodes.find((n) => n.id === target).position.y - 100) + offset},
                      ${targetX || nodes.find((n) => n.id === target).position.x} ${targetY || nodes.find((n) => n.id === target).position.y - 50}`;
      return (
        <g>
          <path
            id={id}
            className="react-flow__edge-path"
            d={path}
            style={{
              ...rest.style,
              strokeWidth: 3,
              transition: 'stroke 0.3s, stroke-width 0.3s',
            }}
            markerEnd={rest.markerEnd}
          />
        </g>
      );
    },
  };
  const handleFieldChangeCalc = (key, value, conditionIndex = null) => {
    setNewCondition(prev => {
      if (conditionIndex !== null) {
        // Update inside conditions array
        const conditions = [...(prev.conditions || [])];
        conditions[conditionIndex] = {
          ...conditions[conditionIndex],
          [key]: value,
        };
        return { ...prev, conditions };
      } else if (key === 'action') {
        // Reset related fields when action changes
        return { ...prev, action: value, sourceFields: [], calcItems: [], targetField: '' };
      } else if (key === 'sourceFields' || key === 'targetField') {
        return { ...prev, [key]: value };
      } else if (key === 'value') {
        // Also set value inside first condition if conditions is used
        if (prev.conditions && prev.conditions.length > 0) {
          const conditions = [...prev.conditions];
          conditions[0] = { ...conditions[0], value };
          return { ...prev, conditions };
        }
        return { ...prev, value };
      }
      return { ...prev, [key]: value };
    });
  };

  const convertFormulaLabelsToKeys = (formula) => {
    if (!formula) return formula;
    // Replace [FieldName] with [Unique_Key__c]
    return formula.replace(/\[([^\]]+)\]/g, (match, label) => {
      const field = fields.find(f => f.Name === label.trim());
      return field ? `[${field.Unique_Key__c}]` : match; // If not found, keep as is
    });
  };


  const usedFieldsInFormula = React.useMemo(() => {
    if (!newCondition.formula) return [];

    // Extract all text inside square brackets, e.g. [FieldName]
    const matches = newCondition.formula.match(/\[([^\]]+)\]/g) || []; // ["[Number]", "[Price]"]
    if (matches.length === 0) return [];

    // Remove brackets from matches: ["Number", "Price"]
    const fieldLabelsInFormula = matches.map(m => m.slice(1, -1).trim());

    // Map labels to Unique_Key__c
    return fieldLabelsInFormula
      .map(label => fields.find(f => f.Name === label)?.Unique_Key__c)
      .filter(Boolean); // Remove undefined
  }, [newCondition.formula, fields]);

  const convertFormulaKeysToLabels = (formula) => {
    if (!formula) return formula;
    return formula.replace(/\[([^\]]+)\]/g, (match, key) => {
      const field = fields.find(f => f.Unique_Key__c === key.trim());
      return field ? `[${field.Name}]` : match;
    });
  };

  const uniqueKeyToName = React.useMemo(() => {
    const map = {};
    fields.forEach(f => {
      map[f.Unique_Key__c] = f.Name;
    });
    return map;
  }, [fields]);

  // Add and remove field pills, and update expression accordingly:
  const addCalcFieldPill = (fieldKey) => {
    const label = uniqueKeyToName[fieldKey];
    if (!label) return;
    const pillToken = `[${label}]`;

    // Add pill text to expression only if not already present:
    setCalcExpression(prev => {
      // Insert pill token at cursor or append
      return prev ? prev + ' ' + pillToken + ' ' : pillToken + ' ';
    });
    setFieldPills(prev => {
      if (prev.find(p => p.key === fieldKey)) return prev; // avoid duplicates
      return [...prev, { key: fieldKey, label }];
    });
  };

  const removeCalcFieldPill = (fieldKey) => {
    const label = uniqueKeyToName[fieldKey];
    if (!label) return;
    const pillTokenRegex = new RegExp(`\\[${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
    setCalcExpression(prev => prev.replace(pillTokenRegex, '').replace(/\s+/g, ' ').trim());
    setFieldPills(prev => prev.filter(p => p.key !== fieldKey));
  };

  function getDefaultValueForField(field) {
    if (!field) return null;
    const ft = (field.Field_Type__c || '').toLowerCase();
    switch(ft) {
      case 'number':
      case 'price':
        return 1;
      case 'date':
      case 'datetime':
        return new Date();
      case 'time':
        return '12:00:00';
      case 'shorttext':
      case 'longtext':
      case 'fullname':
      case 'address':
        return 'Sample';
      case 'rating':
      case 'scalerating':
        return 3;
      case 'checkbox':
      case 'toggle':
        return true;
      case 'radio':
      case 'dropdown':
        // Optionally pick first option if you have options list, else generic string
        return 'Option';
      default:
        return null;
    }
  }
  var evaluateCalculation = function(expr, fieldValues) {
    try {
      if (!expr || !expr.trim()) return '';

      // Helper Functions Implementation

      // Date & Time utils
      var addDays = function(date, numDays) {
        if (!date) return null;
        var d = new Date(date);
        if (isNaN(d)) return null;
        d.setDate(d.getDate() + (Number(numDays) || 0));
        return d;
      };

      var addMonths = function(date, numMonths) {
        if (!date) return null;
        var d = new Date(date);
        if (isNaN(d)) return null;
        d.setMonth(d.getMonth() + (Number(numMonths) || 0));
        return d;
      };

      var addYears = function(date, numYears) {
        if (!date) return null;
        var d = new Date(date);
        if (isNaN(d)) return null;
        d.setFullYear(d.getFullYear() + (Number(numYears) || 0));
        return d;
      };

      var subtractDates = function(date1, date2, unit) {
        unit = unit || 'days'; // ES5 default parameter
        if (!date1 || !date2) return null;
        var d1 = new Date(date1);
        var d2 = new Date(date2);
        if (isNaN(d1) || isNaN(d2)) return null;
        var diffMs = d1 - d2;
        switch (unit) {
          case 'seconds': return diffMs / 1000;
          case 'minutes': return diffMs / (1000 * 60);
          case 'hours': return diffMs / (1000 * 60 * 60);
          case 'days': default: return diffMs / (1000 * 60 * 60 * 24);
        }
      };

      // Time manipulation assumes time in 'HH:mm:ss' or 'HH:mm' format strings
      var parseTime = function(val) {
        if (!val) return null;
        var parts = val.split(':').map(function(n) { return Number(n); });
        if (parts.length < 2) return null;
        var h = parts[0];
        var m = parts[1];
        var s = parts[2] || 0;
        if (
          h < 0 || h > 23 ||
          m < 0 || m > 59 ||
          s < 0 || s > 59 ||
          parts.some(function(n) { return isNaN(n); })
        )
          return null;
        return { h: h, m: m, s: s };
      };

      var addTimes = function(time1, time2) {
        var t1 = typeof time1 === 'string' ? parseTime(time1) : time1;
        var t2 = typeof time2 === 'string' ? parseTime(time2) : time2;
        if (!t1 || !t2) return null;
        var totalSeconds = t1.h * 3600 + t1.m * 60 + t1.s + t2.h * 3600 + t2.m * 60 + t2.s;
        totalSeconds %= 86400; // keep in day range
        var h = Math.floor(totalSeconds / 3600);
        var m = Math.floor((totalSeconds % 3600) / 60);
        var s = totalSeconds % 60;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      };

      var subtractTimes = function(time1, time2) {
        var t1 = typeof time1 === 'string' ? parseTime(time1) : time1;
        var t2 = typeof time2 === 'string' ? parseTime(time2) : time2;
        if (!t1 || !t2) return null;
        var totalSeconds = (t1.h * 3600 + t1.m * 60 + t1.s) - (t2.h * 3600 + t2.m * 60 + t2.s);
        if (totalSeconds < 0) totalSeconds += 86400;
        var h = Math.floor(totalSeconds / 3600);
        var m = Math.floor((totalSeconds % 3600) / 60);
        var s = totalSeconds % 60;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      };

      var setTime = function(date, time) {
        if (!date || !time) return null;
        var d = new Date(date);
        if (isNaN(d)) return null;
        var t = parseTime(time);
        if (!t) return null;
        d.setHours(t.h, t.m, t.s || 0, 0);
        return d;
      };

      var parseDate = function(val) {
        if (!val) return null;
        var d = new Date(val);
        return isNaN(d) ? null : d;
      };

      var toDate = parseDate;

      var toTime = function(val) {
        if (typeof val === 'string') {
          var t = parseTime(val);
          if (!t) return null;
          return (t.h < 10 ? '0' : '') + t.h + ':' + (t.m < 10 ? '0' : '') + t.m + ':' + (t.s < 10 ? '0' : '') + t.s;
        }
        return null;
      };

      // Number functions
      var parseNumber = function(val) {
        var n = Number(val);
        return isNaN(n) ? 0 : n;
      };

      var round = function(val, decimals) {
        decimals = decimals || 0; // ES5 default parameter
        var n = parseNumber(val);
        return Number(n.toFixed(decimals));
      };
      
      var floor = function(val) { return Math.floor(parseNumber(val)); };
      var ceil = function(val) { return Math.ceil(parseNumber(val)); };
      var clamp = function(val, min, max) {
        var n = parseNumber(val);
        return Math.min(Math.max(n, min), max);
      };

      // String / Text
      var concatStrings = function() {
        var args = Array.prototype.slice.call(arguments);
        return args.map(function(v) { return v == null ? '' : String(v); }).join('');
      };
      
      
      var toString = function(val) { return val == null ? '' : String(val); };
      var stringLength = function(str) { return (typeof str === 'string' ? str.length : 0); };
      var substring = function(str, start, end) {
        if (typeof str !== 'string') return '';
        return str.substring(start, end);
      };
      var toUpperCase = function(str) { return typeof str === 'string' ? str.toUpperCase() : ''; };
      var toLowerCase = function(str) { return typeof str === 'string' ? str.toLowerCase() : ''; };

      // List/Array functions
      var count = function(list) { return Array.isArray(list) ? list.length : 0; };
      
      var sum = function() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length === 1 && Array.isArray(args[0])) args = args[0];
        return args.reduce(function(acc, v) { return acc + (parseNumber(v) || 0); }, 0);
      };
      
      var mean = function() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length === 1 && Array.isArray(args[0])) args = args[0];
        if (args.length === 0) return 0;
        return sum.apply(null, args) / args.length;
      };
      
      var min = function() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length === 1 && Array.isArray(args[0])) args = args[0];
        return Math.min.apply(null, args.map(function(v) { return parseNumber(v); }));
      };
      
      var max = function() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length === 1 && Array.isArray(args[0])) args = args[0];
        return Math.max.apply(null, args.map(function(v) { return parseNumber(v); }));
      };
      
      // Boolean/Selection functions
      var toBoolean = function(val) {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          var v = val.toLowerCase().trim();
          if (['true', 'yes', '1'].indexOf(v) !== -1) return true;
          if (['false', 'no', '0'].indexOf(v) !== -1) return false;
        }
        if (typeof val === 'number') return val !== 0;
        return Boolean(val);
      };
      
      var coerceToType = function(val, type) {
        switch(type) {
          case 'string': return toString(val);
          case 'number': return parseNumber(val);
          case 'boolean': return toBoolean(val);
          case 'date': return toDate(val);
          case 'array': return Array.isArray(val) ? val : [val];
          default: return val;
        }
      };
      
      // Conversion
      var numberToDate = function(num) {
        var n = parseNumber(num);
        if (n <= 0) return null;
        return new Date(n);
      };
      
      var dateToNumber = function(date) {
        var d = toDate(date);
        return d ? d.valueOf() : NaN;
      };
      
      var toNumber = parseNumber;
      
      // Advanced Math
      var pow = function(base, exponent) {
        return Math.pow(parseNumber(base), parseNumber(exponent));
      };
      
      var mod = function(a, b) {
        return parseNumber(a) % parseNumber(b);
      };
      
      var log = function(value, base) {
        base = base || Math.E; // ES5 default parameter
        var v = parseNumber(value);
        var b = parseNumber(base);
        if (v <= 0 || b <= 0 || b === 1) return NaN;
        return Math.log(v) / Math.log(b);
      };
      
      var exp = function(value) {
        return Math.exp(parseNumber(value));
      };
      
      // Prepare function dictionary
      var funcs = {
        addDays: addDays,
        addMonths: addMonths,
        addYears: addYears,
        subtractDates: subtractDates,
        addTimes: addTimes,
        subtractTimes: subtractTimes,
        setTime: setTime,
        parseDate: parseDate,
        parseTime: parseTime,
        toDate: toDate,
        toTime: toTime,
        parseNumber: parseNumber,
        abs: function(val) { return Math.abs(val); },
        sqrt: function(val) { return Math.sqrt(val); },
        min: min,
        max: max,
        sum: sum,
        mean: mean,
        round: round,
        floor: floor,
        ceil: ceil,
        concatStrings: concatStrings,
        toString: toString,
        stringLength: stringLength,
        toUpperCase: toUpperCase,
        toLowerCase: toLowerCase,
        coerceToType: coerceToType,
        numberToDate: numberToDate,
        dateToNumber: dateToNumber,
        toNumber: toNumber,
        pow: pow,
        mod: mod,
        log: log,
        exp: exp
      };

      // Replace [FieldName] tokens with unique JS variable names and map their values
      var safeFieldValues = {};
      for (var key in fieldValues) {
        if (fieldValues.hasOwnProperty(key)) {
          safeFieldValues[key] = fieldValues[key];
        }
      }
      
      fields.forEach(function(f) {
        if (!(f.Unique_Key__c in safeFieldValues)) {
          safeFieldValues[f.Unique_Key__c] = getDefaultValueForField(f);
        }
      });
      
      var tokensMap = {};
      var tokenIndex = 0;
      var processedExpr = expr;
      
      var fieldRegex = /\[([^\]]+)\]/g;
      var match;
      while ((match = fieldRegex.exec(expr)) !== null) {
        var label = match[1].trim();
        var field = fields.find(function(f) { return f.Name === label; });
        if (!field) {
          return 'Error: Unknown field "' + label + '"';
        }
        var key = field.Unique_Key__c;
        var tokenName = '__field_' + tokenIndex++;
        tokensMap[tokenName] = safeFieldValues[key];
        
        var pillRegex = new RegExp('\\[' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]', 'g');
        processedExpr = processedExpr.replace(pillRegex, tokenName);
      }
      
      var funcDefs = Object.keys(funcs).map(function(fnName) {
        var fn = funcs[fnName];
        var fnStr = fn.toString();
        // Ensure we don't have any arrow functions
        if (fnStr.indexOf('=>') !== -1) {
          throw new Error('Function ' + fnName + ' contains arrow function syntax');
        }
        return 'var ' + fnName + ' = ' + fnStr + ';';
      }).join('\n');

      var varDefs = Object.keys(tokensMap).map(function(token) {
        var val = tokensMap[token];
        if (val == null) return 'var ' + token + ' = null;';
        if (typeof val === 'string') return 'var ' + token + " = '" + val.replace(/'/g, "\\'") + "';";
        if (typeof val === 'number' || typeof val === 'boolean') return 'var ' + token + ' = ' + val + ';';
        if (val instanceof Date) return 'var ' + token + ' = new Date(' + val.valueOf() + ');';
        return 'var ' + token + " = '" + String(val).replace(/'/g, "\\'") + "';";
      }).join('\n');
        
      var fullEvalCode = '(function() {\n' +
        '  "use strict";\n' +
        funcDefs + '\n' +
        varDefs + '\n' +
        '  return (' + processedExpr + ');\n' +
        '})();';
        
        
      var evaluator = new Function('return ' + fullEvalCode);
      var result = evaluator();
      
      if (typeof result === 'number' && isNaN(result)) return 'Error: Result is NaN';
      if (result === undefined) return '';

      return result;

    } catch (e) {
      return 'Error: ' + e.message;
    }
  };
  const calculatorFunctions = [
    'addDays', 'addMonths', 'addYears', 'subtractDates',
    'addTimes', 'subtractTimes', 'setTime', 'parseDate', 'parseTime', 'toDate', 'toTime',
    'parseNumber', 'abs', 'sqrt', 'min', 'max', 'sum', 'mean', 'round', 'floor', 'ceil',
    'concatStrings', 'toString', 'stringLength', 'toUpperCase', 'toLowerCase', 'coerceToType', 'isNullOrEmpty',
    'numberToDate', 'dateToNumber', 'toNumber',
    'pow', 'mod', 'log', 'exp'
  ];



  const calcResult = React.useMemo(() => {
    // Prepare default dummy values for all fields
    const defaultFieldValues = {};
    fields.forEach(field => {
      const key = field.Unique_Key__c;
      if (!key) return;

      switch ((field.Field_Type__c || '').toLowerCase()) {
        case 'number':
        case 'price':
          defaultFieldValues[key] = 1;
          break;
        case 'date':
        case 'datetime':
          defaultFieldValues[key] = new Date();
          break;
        case 'time':
          defaultFieldValues[key] = '12:00:00';
          break;
        case 'shorttext':
        case 'longtext':
        case 'fullname':
        case 'address':
        case 'link':
          defaultFieldValues[key] = 'Sample';
          break;
        case 'rating':
        case 'scalerating':
          defaultFieldValues[key] = 3;
          break;
        case 'checkbox':
        case 'toggle':
          defaultFieldValues[key] = true;
          break;
        case 'radio':
        case 'dropdown':
          defaultFieldValues[key] = 'Option';
          break;
        default:
          defaultFieldValues[key] = null;
      }
    });

    // Use defaultFieldValues for evaluation
    return evaluateCalculation(calcExpression, defaultFieldValues);
  }, [calcExpression, fields]); // no dependency on formRecords since no real input yet

  function parseLogicExpression(logicExpression) {
    if (!logicExpression) return null;
    const tokens = logicExpression.match(/\d+|AND|OR|\(|\)/g);
    if (!tokens) return null;
    let i = 0;

    function parseGroup() {
      const group = [];
      while (i < tokens.length) {
        const token = tokens[i];
        if (token === '(') {
          i++;
          group.push(parseGroup());
        } else if (token === ')') {
          i++;
          break;
        } else if (/^\d+$/.test(token)) {
          group.push({ type: 'condition', idx: Number(token) });
          i++;
        } else if (token === 'AND' || token === 'OR') {
          group.push(token);
          i++;
        } else {
          i++;
        }
      }
      return group;
    }
    i = 0;
    return parseGroup();
  }


  const ConditionChip = ({ label, value }) => (
    <span className="condition-chip">
      <span className="chip-label">{label}</span>
      {value !== undefined && value !== null && value !== '' && (
        <span className="chip-value">{value}</span>
      )}
    </span>
  );
  

  function renderLogicGroup({
    group,
    conditions,
    fields,
    bracketColorIndex = 0,
  }) {
    if (!Array.isArray(group)) return null;
    const bracketColor = BRACKET_COLORS[bracketColorIndex % 100];

    return (
      <>
        <span
          className="logic-bracket"
          style={{
            color: bracketColor,
            fontSize: '20px',
            fontWeight: 700,
          }}
        >
          {'{'}
        </span>
        {group.map((item, idx) => {
          if (item === 'AND' || item === 'OR') {
            return (
              <span key={idx} className="logic-connector">
                {item}
              </span>
            );
          }
          if (Array.isArray(item)) {
            // Recursively render with increased color index
            return renderLogicGroup({
              group: item,
              conditions,
              fields,
              bracketColorIndex: bracketColorIndex + 1,
            
            });
          }
          if (item.type === 'condition') {
            const cond = conditions[item.idx - 1]; // 1-based index
            const fieldObj = fields.find((f) => f.Unique_Key__c === cond.ifField);
            return (
              <span className="condition-item" key={idx} style={{ margin: '0 4px', whiteSpace: 'nowrap' }}>
                <span className="condition-field" style={{ fontWeight: '600' }}>
                  {fieldObj ? fieldObj.Name : 'Unknown'}
                </span>{' '}
                <span className="condition-operator" style={{ fontWeight: '500' }}>
                  {cond.operator}
                </span>{' '}
                <span className="condition-value" style={{ fontStyle: 'italic' }}>
                  {cond.value !== undefined && cond.value !== null && cond.value !== '' ? cond.value : 'N/A'}
                </span>
              </span>
            );
          }
          return null;
        })}
        <span
          className="logic-bracket"
          style={{
            color: bracketColor,
            fontSize: '20px',
            fontWeight: 700,
          }}
        >
          {'}'}
        </span>
      </>
    );
  }

  return (
    <div className="conditions-wrapper">
      {/* {showSidebar && (
        <motion.div
          className="w-64 bg-white shadow-lg"
        >
          <MainMenuBar formVersionId={formVersionId} />
        </motion.div>
      )} */}
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="conditions-main-container"
      >
        <div className='heading-container'>
          <div className='svg-container'>
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="50" height="50" rx="8" fill="#5F6165"/>
              <rect x="24.6011" y="18.8008" width="14.9501" height="14.9501" transform="rotate(45 24.6011 18.8008)" fill="white"/>
              <path d="M12.7408 29.375H6.76074V34.2587" stroke="white" stroke-width="0.797341"/>
              <path d="M37.259 29.375H43.239V34.2587" stroke="white" stroke-width="0.797341"/>
              <line x1="24.7009" y1="14.3262" x2="24.7009" y2="17.5155" stroke="white" stroke-width="0.797341"/>
              <circle cx="24.7008" cy="9.14249" r="3.18936" fill="white"/>
              <circle cx="6.76065" cy="39.4394" r="3.18936" fill="white"/>
              <path d="M5.5647 38.2441L7.95672 40.6362M5.5647 40.6362L7.95672 38.2441" stroke="#5F6165" stroke-width="0.717607" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="43.2389" cy="39.4394" r="3.18936" fill="white"/>
              <path d="M41.8435 39.7392L42.5412 40.6362L44.9332 38.2441" stroke="#5F6165" stroke-width="0.717607" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div className='heading-container-text'>
            <p className='heading-conditions-text'>CONDITIONS</p>
            <p className='heading-desc-text'>Make your form interactive with conditional display.</p>
          </div>
        </div>
        <div className="tabs-container">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
            >
              {error}
            </motion.div>
          )}
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <Tabs
              defaultActiveKey="show_hide"
              style={{ marginBottom: '16px' }}
              onChange={(key) => {
                setNewCondition((prev) => ({
                  ...prev,
                  conditions: [{ ifField: '', operator: '', value: '' }],
                  type: key,
                  ifField: '',
                  operator: '',
                  value: '',
                  thenAction: key === 'enable_require_mask' ? 'require' : key === 'skip_hide_page' ? 'skip to' : 'show',                  thenFields: [],
                  dependentField: '',
                  dependentValues: [],
                  maskPattern: '',
                  sourcePage: '',
                  targetPage: '',
                }));
              }}
            >
              <TabPane tab="Show/Hide Fields" key="show_hide">
                {/* <motion.div variants={containerVariants} className="bg-white p-4 rounded shadow">
                  <h2 className="text-xl font-semibold mb-3">Add Show/Hide Condition</h2>
                  <div className="mb-4">
                    {newCondition.conditions?.map((condition, index) => (
                      <motion.div key={index} variants={itemVariants} className="mb-4 p-3 border rounded">
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700">If Field</label>
                          <Select
                            value={condition.ifField}
                            onChange={(value) => handleFieldChange('ifField', value, index)}
                            placeholder="Select field"
                            style={{ width: '100%' }}
                          >
                            {validIfFields.map((field) => (
                              <Option key={field.Unique_Key__c} value={field.Unique_Key__c}>
                                {field.Name}
                              </Option>
                            ))}
                          </Select>
                        </div>
                        {condition.ifField && (
                          <>
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700">Operator</label>
                              <Select
                                value={condition.operator}
                                onChange={(value) => handleFieldChange('operator', value, index)}
                                placeholder="Select operator"
                                style={{ width: '100%' }}
                              >
                                {getOperators(fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c).map(
                                  (op) => (
                                    <Option key={op} value={op}>
                                      {op}
                                    </Option>
                                  )
                                )}
                              </Select>
                            </div>
                            {condition.operator && !['is null', 'is not null'].includes(condition.operator) && (
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">Value</label>
                                {['checkbox', 'radio', 'dropdown'].includes(
                                  fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c
                                ) ? (
                                  <Select
                                    value={condition.value}
                                    onChange={(value) => handleFieldChange('value', value, index)}
                                    placeholder="Select value"
                                    style={{ width: '100%' }}
                                  >
                                    {getFieldOptions(condition.ifField).map((option) => (
                                      <Option key={option} value={option}>
                                        {option}
                                      </Option>
                                    ))}
                                  </Select>
                                ) : ['date', 'datetime', 'date-time', 'time'].includes(
                                    fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c
                                  ) ? (
                                    <Input
                                      type={
                                        fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'date'
                                          ? 'date'
                                          : fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'time'
                                          ? 'time'
                                          : 'datetime-local'
                                      }
                                      value={condition.value}
                                      onChange={(e) => handleFieldChange('value', e.target.value, index)}
                                      placeholder={
                                        fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'date'
                                          ? 'YYYY-MM-DD'
                                          : fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'time'
                                          ? 'HH:MM'
                                          : 'YYYY-MM-DD HH:MM'
                                      }
                                      style={{ width: '100%' }}
                                    />
                                  ) : (
                                    <Input
                                      value={condition.value}
                                      onChange={(e) => handleFieldChange('value', e.target.value, index)}
                                      placeholder="Enter value"
                                    />
                                  )}
                              </div>
                            )}
                            {index > 0 && (
                              <Button
                                type="danger"
                                size="small"
                                onClick={() => removeCondition(index)}
                                style={{ marginTop: '8px' }}
                              >
                                <FaTrash />
                              </Button>
                            )}
                          </>
                        )}
                      </motion.div>
                    ))}
                    {newCondition.conditions?.length > 1 && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">Logic</label>
                        <Select
                          value={newCondition.logic}
                          onChange={(value) => handleFieldChange('logic', value)}
                          style={{ width: '100%' }}
                        >
                          <Option value="AND">AND</Option>
                          <Option value="OR">OR</Option>
                          <Option value="Custom">Custom</Option>
                        </Select>
                        {newCondition.logic === 'Custom' && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Custom Logic Expression{' '}
                              <span className="text-gray-500 text-xs">
                                (e.g., "1 OR (2 AND 3)" for {newCondition.conditions.length} conditions)
                              </span>
                            </label>
                            <Input
                              value={newCondition.logicExpression}
                              onChange={(e) => handleFieldChange('logicExpression', e.target.value)}
                              placeholder={`e.g., 1 OR (2 AND 3)`}
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mb-3 flex items-center">
                      <div style={{ width: '120px', marginRight: '8px' }}>
                        <label className="block text-sm font-medium text-gray-700">Then</label>
                        <Select
                          value={newCondition.thenAction}
                          onChange={(value) => handleFieldChange('thenAction', value)}
                          style={{ width: '100%' }}
                        >
                          <Option value="show">Show</Option>
                          <Option value="hide">Hide</Option>
                        </Select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="block text-sm font-medium text-gray-700">Field(s)</label>
                        <Select
                          mode="multiple"
                          value={newCondition.thenFields}
                          onChange={(value) => handleFieldChange('thenFields', value)}
                          placeholder="Select field(s) to show/hide"
                          style={{ width: '100%' }}
                          disabled={! (newCondition.conditions ? newCondition.conditions[0]?.ifField : false)}
                        >
                          {validIfFields
                            .filter((f) => !newCondition.conditions?.some((c) => c.ifField === f.Unique_Key__c))
                            .map((f) => (
                              <Option key={f.Unique_Key__c} value={f.Unique_Key__c}>
                                {f.Name}
                              </Option>
                            ))}
                        </Select>
                      </div>
                    </div>
                    <Button
                      type="primary"
                      onClick={addCondition}
                      style={{ marginTop: '8px' }}
                    >
                      <FaPlus style={{ marginRight: '4px' }} /> Add Condition
                    </Button>
                    <div className="flex space-x-2 mt-4">
                      <Button
                        type="primary"
                        onClick={() => saveCondition(editingConditionId)}
                        disabled={
                          !newCondition.conditions?.every((c) => c.ifField && c.operator) ||
                          !newCondition.thenFields.length
                        }
                      >
                        <FaSave style={{ marginRight: '4px' }} /> {editingConditionId ? 'Update Condition' : 'Save Condition'}
                      </Button>
                      {editingConditionId && (
                        <Button
                          type="default"
                          onClick={() => {
                            setNewCondition({
                              type: newCondition.type,
                              conditions: [{ ifField: '', operator: '', value: '' }],
                              logic: 'AND',
                              logicExpression: '',
                              thenAction: newCondition.type === 'enable_require_mask' ? 'require' : 'show',
                              thenFields: [],
                              dependentField: '',
                              dependentValues: [],
                              maskPattern: '',
                              sourcePage: '',
                              targetPage: '',
                              ifField: '',
                              value: '',
                            });
                            setEditingConditionId(null);
                          }}
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div> */}
                <motion.div variants={containerVariants} className="existing-conditions-container">
                  <div className='conditions-heading-container'>
                    <div><p className="existing-condition-text">Existing Conditions</p></div>
                    <div>
                      <button className='login-button'
                        onClick={() => {
                          setNewCondition({
                            type: 'show_hide',
                            conditions: [{ ifField: '', operator: '', value: '' }],
                            logic: 'AND',
                            logicExpression: '',
                            thenAction: 'show',
                            thenFields: [],
                            dependentField: '',
                            dependentValues: [],
                            maskPattern: '',
                            sourcePage: '',
                            targetPage: [],
                            ifField: '',
                            value: '',
                          });
                          setEditingConditionId(null);
                          setIsShowHideModalVisible(true);  // OPEN MODAL HERE
                        }}

                      >
                        <svg className='plus-icon-svg' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          <path d="M8.57153 12H15.4287" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          <path d="M12 8.57227V15.4294" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Add New Rule 
                      </button>
                    </div>
                  </div>
                  
                  {conditions.filter((c) => c.type === 'show_hide').length === 0 ? (
                    <div className="no-conditions-container">
                      <p className="no-conditions-text">No conditions added yet</p>
                    </div>
                  ) : (
                    <div className="conditions-list">
                      <AnimatePresence>
                        {conditions
                          .filter((c) => c.type === 'show_hide')
                          .map((condition, idx) => {
                            const conditionData = condition.Condition_Data__c ? JSON.parse(condition.Condition_Data__c || '{}') : condition;
                            const conds = conditionData.conditions || [];

                            const logicTree =
                              conditionData.logic === 'Custom' && conditionData.logicExpression
                                ? parseLogicExpression(conditionData.logicExpression)
                                : null;

                            return (
                              <motion.div
                                key={condition.Id}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="condition-card"
                              >
                                <div className="condition-content">
                                  <div className="condition-header">
                                    <div className="condition-numbering">{idx + 1}</div>
                                    <div className="condition-actions">
                                      <button
                                        className="icon-btn edit-btn"
                                        onClick={() => {
                                          editCondition(condition);
                                          setIsShowHideModalVisible(true);  // OPEN MODAL ON EDIT
                                        }}
                                        aria-label="Edit condition"
                                      >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11.2171 5.62695H5.6509C5.22911 5.62695 4.8246 5.79451 4.52635 6.09276C4.2281 6.39101 4.06055 6.79552 4.06055 7.21731V18.3498C4.06055 18.7716 4.2281 19.1761 4.52635 19.4743C4.8246 19.7726 5.22911 19.9401 5.6509 19.9401H16.7834C17.2052 19.9401 17.6097 19.7726 17.9079 19.4743C18.2062 19.1761 18.3737 18.7716 18.3737 18.3498V12.7835" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M17.1811 4.43351C17.4975 4.11717 17.9265 3.93945 18.3739 3.93945C18.8213 3.93945 19.2503 4.11717 19.5667 4.43351C19.883 4.74985 20.0607 5.1789 20.0607 5.62628C20.0607 6.07365 19.883 6.5027 19.5667 6.81904L12.0125 14.3732L8.83179 15.1684L9.62696 11.9877L17.1811 4.43351Z" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>

                                      </button>
                                      <button
                                        className="icon-btn delete-btn"
                                        onClick={() => deleteCondition(condition.Id)}
                                        aria-label="Delete condition"
                                      >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7.19826 8.7046C7.05895 8.7046 6.95304 8.82979 6.97613 8.96717L8.62132 18.7568H15.3786L17.0238 8.96717C17.0469 8.82979 16.941 8.7046 16.8017 8.7046H7.19826ZM17.4058 6.35909C17.5302 6.35909 17.631 6.45994 17.631 6.58434V7.25076C17.631 7.37515 17.5302 7.476 17.4058 7.476H6.59414C6.46974 7.476 6.3689 7.37515 6.3689 7.25076V6.58434C6.3689 6.45994 6.46974 6.35909 6.59414 6.35909H9.5848C10.0916 6.35909 10.5032 5.74535 10.5032 5.24219H13.4967C13.4967 5.74535 13.9078 6.35909 14.4151 6.35909H17.4058Z" fill="#5F6165"/>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="condition-body">
                                    <div className="condition-logic">
                                      <div className="logic-label">Condition: </div>

                                      {logicTree ? (
                                        <div className="logic-display">
                                          {renderLogicGroup({
                                            group: logicTree,
                                            conditions: conds,
                                            fields: fields,
                                          })}
                                        </div>
                                      ) : (
                                        <div className="logic-display">
                                          {conds.map((cond, index) => {
                                            const fieldObj = fields.find((f) => f.Unique_Key__c === cond.ifField);
                                            return (
                                              <React.Fragment key={index}>
                                                <div className="condition-item">
                                                  <span className="condition-field"><b>{fieldObj ? fieldObj.Name : 'Unknown'}</b></span>
                                                  <span className="condition-operator">{cond.operator}</span>
                                                  <span className="condition-value">{cond.value || 'N/A'}</span>
                                                </div>
                                                {index < conds.length - 1 && (
                                                  <span className="logic-connector">{conditionData.logic}</span>
                                                )}
                                              </React.Fragment>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                  </div>
                                  <div className='condition-body'>
                                    <div className="condition-logic">
                                      <div className="logic-label">Outcome</div>
                                      <div>
                                        <span className="action-label">
                                          Action:
                                        </span>
                                        <span className='action-text'>{conditionData.thenAction}</span>
                                      </div>
                                      <div className='field-container'>
                                        <span className="field-label">
                                          Fields:
                                        </span>
                                        {Array.isArray(conditionData.thenFields) && conditionData.thenFields.length > 0
                                          ? conditionData.thenFields.map((id) => {
                                              const field = fields.find((f) => f.Unique_Key__c === id);
                                              return field ? (
                                                <span key={id} className="field-pill">{field.Name}</span>
                                              ) : null;
                                            })
                                          : (
                                            fields.find((f) => f.Unique_Key__c === conditionData.thenFields)
                                              ? <span className="field-pill">{fields.find((f) => f.Unique_Key__c === conditionData.thenFields).Name}</span>
                                              : 'None'
                                          )
                                        }
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}


                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              </TabPane>
              <TabPane tab="Dependent Picklist" key="dependent">
                <motion.div variants={containerVariants} className="bg-white p-4 rounded shadow">
                  <h2 className="text-xl font-semibold mb-3">Add Dependent Picklist Condition</h2>
                  <div className="mb-4">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700">Controlling Field</label>
                      <Select
                        value={newCondition.ifField}
                        onChange={(value) => handleFieldChange('ifField', value)}
                        placeholder="Select controlling field"
                        style={{ width: '100%' }}
                      >
                        {validControllingFields.map((field) => (
                          <Option key={field.Unique_Key__c} value={field.Unique_Key__c}>
                            {field.Name}
                          </Option>
                        ))}
                      </Select>
                    </div>
                    {newCondition.ifField && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">Controlling Value</label>
                        <Select
                          value={newCondition.value}
                          onChange={(value) => handleFieldChange('value', value)}
                          placeholder="Select value"
                          style={{ width: '100%' }}
                        >
                          {getFieldOptions(newCondition.ifField).map((option) => (
                            <Option key={option} value={option}>
                              {option}
                            </Option>
                          ))}
                        </Select>
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700">Dependent Field</label>
                      <Select
                        value={newCondition.dependentField}
                        onChange={(value) => handleFieldChange('dependentField', value)}
                        placeholder="Select dependent field"
                        style={{ width: '100%' }}
                        disabled={!newCondition.ifField}
                      >
                        {validDependentFields
                          .filter((f) => f.Unique_Key__c !== newCondition.ifField)
                          .map((field) => (
                            <Option key={field.Unique_Key__c} value={field.Unique_Key__c}>
                              {field.Name}
                            </Option>
                          ))}
                      </Select>
                    </div>
                    {newCondition.ifField && newCondition.dependentField && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">Dependent Values</label>
                        {newCondition.dependentValues.map((value, index) => (
                          <motion.div key={index} variants={itemVariants} className="flex items-center mb-2">
                            <Select
                              value={value}
                              onChange={(val) => updateDependentValue(index, val)}
                              placeholder="Select dependent value"
                              style={{ width: 'calc(100% - 40px)', marginRight: '8px' }}
                            >
                              {getDependentValues(newCondition.dependentField).map((option) => (
                                <Option key={option} value={option}>
                                  {option}
                                </Option>
                              ))}
                            </Select>
                            <Button type="danger" size="small" onClick={() => removeDependentValue(index)}>
                              <FaTrash />
                            </Button>
                          </motion.div>
                        ))}
                        <Button type="primary" size="small" onClick={addDependentValue} style={{ marginTop: '8px' }}>
                          <FaPlus style={{ marginRight: '4px' }} /> Add Value
                        </Button>
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <Button
                        type="primary"
                        onClick={() => saveCondition(editingConditionId)}
                        disabled={
                          !newCondition.ifField ||
                          !newCondition.value ||
                          !newCondition.dependentField ||
                          newCondition.dependentValues.length === 0
                        }
                      >
                        <FaSave style={{ marginRight: '4px' }} /> {editingConditionId ? 'Update Condition' : 'Save Condition'}
                      </Button>
                      {editingConditionId && (
                        <Button
                          type="default"
                          onClick={() => {
                            setNewCondition({
                              type: newCondition.type,
                              conditions: [{ ifField: '', operator: '', value: '' }],
                              logic: 'AND',
                              logicExpression: '',
                              thenAction: newCondition.type === 'enable_require_mask' ? 'require' : 'show',
                              thenFields: [],
                              dependentField: '',
                              dependentValues: [],
                              maskPattern: '',
                              sourcePage: '',
                              targetPage: '',
                              ifField: '',
                              value: '',
                            });
                            setEditingConditionId(null);
                          }}
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
                <motion.div variants={containerVariants} className="mt-4">
                  <h2 className="text-xl font-semibold mb-3">Existing Dependent Conditions</h2>
                  <AnimatePresence>
                    {conditions
                      .filter((c) => c.type === 'dependent')
                      .map((condition) => (
                        <motion.div
                          key={condition.Id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="bg-white p-4 rounded shadow mb-4 flex justify-between items-center"
                        >
                          <div>
                            <p>
                              <strong>If:</strong> {fields.find((f) => f.Unique_Key__c === condition.ifField)?.Name || 'Unknown'}
                            </p>
                            <p>
                              <strong>Value:</strong> {condition.value || 'N/A'}
                            </p>
                            <p>
                              <strong>Then show:</strong> [{condition.dependentValues?.join(', ') || 'None'}] for{' '}
                              {fields.find((f) => f.Unique_Key__c === condition.dependentField)?.Name || 'Unknown'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="small" onClick={() => editCondition(condition)}>
                              <FaEdit />
                            </Button>
                            <Button size="small" onClick={() => deleteCondition(condition.Id)}>
                              <FaTrash />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </motion.div>
              </TabPane>
              <TabPane tab="Enable/Require/Mask a Field" key="enable_require_mask">
                <motion.div variants={containerVariants} className="bg-white p-4 rounded shadow">
                  <h2 className="text-xl font-semibold mb-3">Add Enable/Require/Mask Condition</h2>
                  <div className="mb-4">
                    {newCondition.conditions?.map((condition, index) => (
                      <motion.div key={index} variants={itemVariants} className="mb-4 p-3 border rounded">
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700">If Field</label>
                          <Select
                            value={condition.ifField}
                            onChange={(value) => handleFieldChange('ifField', value, index)}
                            placeholder="Select field"
                            style={{ width: '100%' }}
                          >
                            {validIfFields.map((field) => (
                              <Option key={field.Unique_Key__c} value={field.Unique_Key__c}>
                                {field.Name}
                              </Option>
                            ))}
                          </Select>
                        </div>
                        {condition.ifField && (
                          <>
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700">Operator</label>
                              <Select
                                value={condition.operator}
                                onChange={(value) => handleFieldChange('operator', value, index)}
                                placeholder="Select operator"
                                style={{ width: '100%' }}
                              >
                                {getOperators(fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c).map(
                                  (op) => (
                                    <Option key={op} value={op}>
                                      {op}
                                    </Option>
                                  )
                                )}
                              </Select>
                            </div>
                            {condition.operator && !['is null', 'is not null'].includes(condition.operator) && (
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">Value</label>
                                {['checkbox', 'radio', 'dropdown'].includes(
                                  fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c
                                ) ? (
                                  <Select
                                    value={condition.value}
                                    onChange={(value) => handleFieldChange('value', value, index)}
                                    placeholder="Select value"
                                    style={{ width: '100%' }}
                                  >
                                    {getFieldOptions(condition.ifField).map((option) => (
                                      <Option key={option} value={option}>
                                        {option}
                                      </Option>
                                    ))}
                                  </Select>
                                ) : ['date', 'datetime', 'date-time', 'time'].includes(
                                    fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c
                                  ) ? (
                                    <Input
                                      type={
                                        fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'date'
                                          ? 'date'
                                          : fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'time'
                                          ? 'time'
                                          : 'datetime-local'
                                      }
                                      value={condition.value}
                                      onChange={(e) => handleFieldChange('value', e.target.value, index)}
                                      placeholder={
                                        fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'date'
                                          ? 'YYYY-MM-DD'
                                          : fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'time'
                                          ? 'HH:MM'
                                          : 'YYYY-MM-DD HH:MM'
                                      }
                                      style={{ width: '100%' }}
                                    />
                                  ) : (
                                    <Input
                                      value={condition.value}
                                      onChange={(e) => handleFieldChange('value', e.target.value, index)}
                                      placeholder="Enter value"
                                    />
                                  )}
                              </div>
                            )}
                            {index > 0 && (
                              <Button
                                type="danger"
                                size="small"
                                onClick={() => removeCondition(index)}
                                style={{ marginTop: '8px' }}
                              >
                                <FaTrash />
                              </Button>
                            )}
                          </>
                        )}
                      </motion.div>
                    ))}
                    {newCondition.conditions?.length > 1 && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">Logic</label>
                        <Select
                          value={newCondition.logic}
                          onChange={(value) => handleFieldChange('logic', value)}
                          style={{ width: '100%' }}
                        >
                          <Option value="AND">AND</Option>
                          <Option value="OR">OR</Option>
                          <Option value="Custom">Custom</Option>
                        </Select>
                        {newCondition.logic === 'Custom' && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Custom Logic Expression{' '}
                              <span className="text-gray-500 text-xs">
                                (e.g., "1 OR (2 AND 3)" for {newCondition.conditions.length} conditions)
                              </span>
                            </label>
                            <Input
                              value={newCondition.logicExpression}
                              onChange={(e) => handleFieldChange('logicExpression', e.target.value)}
                              placeholder={`e.g., 1 OR (2 AND 3)`}
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mb-3 flex items-center">
                      <div style={{ width: '180px', marginRight: '8px' }}>
                        <label className="block text-sm font-medium text-gray-700">Then</label>
                        <Select
                          value={newCondition.thenAction}
                          onChange={(value) => handleFieldChange('thenAction', value)}
                          style={{ width: '100%' }}
                        >
                          <Option value="require">Require</Option>
                          <Option value="don't require">Don't Require</Option>
                          <Option value="disable">Disable</Option>
                          <Option value="enable">Enable</Option>
                          <Option value="set mask">Set Mask</Option>
                          <Option value="unmask">Unmask</Option>
                        </Select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="block text-sm font-medium text-gray-700">Fields</label>
                        <Select
                          mode={['set mask', 'unmask'].includes(newCondition.thenAction) ? 'default' : 'multiple'}
                          value={newCondition.thenFields}
                          onChange={(value) => handleFieldChange('thenFields', value)}
                          placeholder="Select field(s)"
                          style={{ width: '100%' }}
                          disabled={! (newCondition.conditions ? newCondition.conditions[0]?.ifField : false)}
                        >
                          {validIfFields
                            .filter((f) => !newCondition.conditions?.some((c) => c.ifField === f.Unique_Key__c))
                            .map((f) => (
                              <Option key={f.Unique_Key__c} value={f.Unique_Key__c}>
                                {f.Name}
                              </Option>
                            ))}
                        </Select>
                      </div>
                    </div>
                    {newCondition.thenAction === 'set mask' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Mask Pattern <span className="text-gray-500 text-xs">(use @ to mask letters, # to mask numbers, * to mask both)</span>
                        </label>
                        <Input
                          value={newCondition.maskPattern}
                          onChange={(e) => handleFieldChange('maskPattern', e.target.value)}
                          placeholder="e.g., @@##**"
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                    <Button
                      type="primary"
                      onClick={addCondition}
                      style={{ marginTop: '8px' }}
                    >
                      <FaPlus style={{ marginRight: '4px' }} /> Add Condition
                    </Button>
                    <div className="flex space-x-2 mt-4">
                      <Button
                        type="primary"
                        onClick={() => saveCondition(editingConditionId)}
                        disabled={
                          !newCondition.conditions?.every((c) => c.ifField && c.operator) ||
                          !newCondition.thenFields.length ||
                          (newCondition.thenAction === 'set mask' && !newCondition.maskPattern)
                        }
                      >
                        <FaSave style={{ marginRight: '4px' }} /> {editingConditionId ? 'Update Condition' : 'Save Condition'}
                      </Button>
                      {editingConditionId && (
                        <Button
                          type="default"
                          onClick={() => {
                            setNewCondition({
                              type: newCondition.type,
                              conditions: [{ ifField: '', operator: '', value: '' }],
                              logic: 'AND',
                              logicExpression: '',
                              thenAction: newCondition.type === 'enable_require_mask' ? 'require' : 'show',
                              thenFields: [],
                              dependentField: '',
                              dependentValues: [],
                              maskPattern: '',
                              sourcePage: '',
                              targetPage: '',
                              ifField: '',
                              value: '',
                            });
                            setEditingConditionId(null);
                          }}
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
                <motion.div variants={containerVariants} className="mt-4">
                  <h2 className="text-xl font-semibold mb-3">Existing Enable/Require/Mask Conditions</h2>
                  <AnimatePresence>
                    {conditions
                      .filter((c) => c.type === 'enable_require_mask')
                      .map((condition) => (
                        <motion.div
                          key={condition.Id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="bg-white p-4 rounded shadow mb-4 flex justify-between items-center"
                        >
                          <div>
                            {condition.logic === 'Custom' ? (
                              <>
                                <p><strong>If:</strong></p>
                                {condition.conditions?.map((cond, index) => (
                                  <p key={index}>
                                    <strong>Condition {index + 1}:</strong>{' '}
                                    {fields.find((f) => f.Unique_Key__c === cond.ifField)?.Name || 'Unknown'} {cond.operator}{' '}
                                    {cond.value || 'N/A'}
                                  </p>
                                ))}
                                <p><strong>Logic:</strong> {condition.logicExpression || 'N/A'}</p>
                              </>
                            ) : (
                              <p>
                                <strong>If:</strong>{' '}
                                {condition.conditions?.map((cond, index) => (
                                  <span key={index}>
                                    {fields.find((f) => f.Unique_Key__c === cond.ifField)?.Name || 'Unknown'} {cond.operator}{' '}
                                    {cond.value || 'N/A'}
                                    {index < condition.conditions.length - 1 && ` ${condition.logic} `}
                                  </span>
                                ))}
                              </p>
                            )}
                            <p>
                              <strong>Then:</strong> {condition.thenAction}
                              {condition.thenAction === 'set mask' ? ` with pattern "${condition.maskPattern || 'N/A'}"` : ''}{' '}
                              {(Array.isArray(condition.thenFields)
                                ? condition.thenFields.map((id) => fields.find((f) => f.Unique_Key__c === id)?.Name).filter(Boolean)?.join(', ')
                                : fields.find((f) => f.Unique_Key__c === condition.thenFields)?.Name) || 'None'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="small" onClick={() => editCondition(condition)}>
                              <FaEdit />
                            </Button>
                            <Button size="small" onClick={() => deleteCondition(condition.Id)}>
                              <FaTrash />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </motion.div>
              </TabPane>
              <TabPane tab="Skip To / Hide Page" key="skip_hide_page">
                <motion.div variants={containerVariants} className="bg-white p-4 rounded shadow">
                  <h2 className="text-xl font-semibold mb-3">Page Navigation Flow</h2>
                  <div style={{ position: 'relative', height: '500px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    {/* Legend in upper-right corner */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#fff', padding: '5px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <p style={{ margin: 0, fontSize: '12px' }}><span style={{ color: '#1a73e8', marginRight: '5px' }}>---</span> Skip To</p>
                      <p style={{ margin: 0, fontSize: '12px' }}><span style={{ color: '#ff4d4f', marginRight: '5px' }}>---</span> Hide</p>
                    </div>
                    <ReactFlowProvider>
                      <ReactFlow
                        nodes={nodes}
                        edges={edges.map((edge) => ({
                          ...edge,
                          type: 'customBezier',
                          sourceHandle: 'bottom',
                          targetHandle: 'top',
                        }))}
                        // nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        onEdgeClick={(event, edge) => {}} // Disable full edge click
                        fitView
                      >
                        <Background color="#aaa" gap={16} />
                      </ReactFlow>
                      <Controls />
                    </ReactFlowProvider>
                  </div>
                  <Modal
                    title={`Conditions for ${pages.find((p) => p.Id === selectedNode)?.Name || 'Page'}`}
                    visible={isModalVisible}
                    onCancel={() => {
                      setIsModalVisible(false);
                      setSelectedNode(null);
                    }}
                    footer={[
                      <Button key="create" type="primary" onClick={() => {
                        setNewCondition({
                          type: 'skip_hide_page',
                          conditions: [{ ifField: '', operator: '', value: '' }],
                          logic: 'AND',
                          logicExpression: '',
                          thenAction: 'skip to',
                          thenFields: [],
                          dependentField: '',
                          dependentValues: [],
                          maskPattern: '',
                          sourcePage: selectedNode,
                          targetPage: [],
                          ifField: '',
                          value: '',
                        });
                        setEditingConditionId(null);
                        setIsCreateModalVisible(true);
                      }}>
                        Create Condition
                      </Button>,
                      <Button key="close" onClick={() => {
                        setIsModalVisible(false);
                        setSelectedNode(null);
                      }}>
                        Close
                      </Button>,
                    ]}
                    width={800}
                  >
                    <motion.div variants={containerVariants} className="mb-4">
                      <h2 className="text-xl font-semibold mb-3">Existing Conditions</h2>
                      <AnimatePresence>
                        {edges
                          .filter((e) => e.source === selectedNode && !e.id.startsWith('default_'))
                          .flatMap((e) => e.data.conditions).length === 0 ? (
                            <p>No conditions added.</p>
                          ) : (
                            edges
                              .filter((e) => e.source === selectedNode && !e.id.startsWith('default_'))
                              .flatMap((e) => e.data.conditions)
                              .map((condition) => (
                                <motion.div
                                  key={condition.Id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  className="bg-white p-4 rounded shadow mb-4 flex justify-between items-center"
                                >
                                  <div>
                                    {condition.thenAction === 'loop' ? (
                                      <>
                                        <p><strong>Loop Type:</strong> {condition.loopType === 'static' ? 'Static Value' : 'Field from Previous Page'}</p>
                                        <p>
                                          <strong>Loop Times:</strong>{' '}
                                          {condition.loopType === 'static'
                                            ? condition.loopValue || 'N/A'
                                            : fields.find((f) => f.Unique_Key__c === condition.loopField)?.Name || 'Unknown'}
                                        </p>
                                        <p>
                                          <strong>Target Page:</strong> {pages.find((p) => p.Id === condition.targetPage[0])?.Name || 'Unknown'}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        {condition.logic === 'Custom' ? (
                                          <>
                                            <p><strong>If:</strong></p>
                                            {condition.conditions?.map((cond, index) => (
                                              <p key={index}>
                                                <strong>Condition {index + 1}:</strong>{' '}
                                                {fields.find((f) => f.Unique_Key__c === cond.ifField)?.Name || 'Unknown'} {cond.operator}{' '}
                                                {cond.value || 'N/A'}
                                              </p>
                                            ))}
                                            <p><strong>Logic:</strong> {condition.logicExpression || 'N/A'}</p>
                                          </>
                                        ) : (
                                          <p>
                                            <strong>If:</strong>{' '}
                                            {condition.conditions?.map((cond, index) => (
                                              <span key={index}>
                                                {fields.find((f) => f.Unique_Key__c === cond.ifField)?.Name || 'Unknown'} {cond.operator}{' '}
                                                {cond.value || 'N/A'}
                                                {index < condition.conditions.length - 1 && ` ${condition.logic} `}
                                              </span>
                                            ))}
                                          </p>
                                        )}
                                        <p>
                                          <strong>Then:</strong> {condition.thenAction}{' '}
                                          {Array.isArray(condition.targetPage)
                                            ? condition.targetPage.map((pageId) => pages.find((p) => p.Id === pageId)?.Name || 'Unknown')?.join(', ')
                                            : pages.find((p) => p.Id === condition.targetPage)?.Name || 'Unknown'}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      size="small"
                                      onClick={() => {
                                        editCondition(condition);
                                        setIsCreateModalVisible(true);
                                      }}
                                    >
                                      <FaEdit />
                                    </Button>
                                    <Button
                                      size="small"
                                      onClick={() => deleteCondition(condition.Id)}
                                    >
                                      <FaTrash />
                                    </Button>
                                  </div>
                                </motion.div>
                              ))
                          )}
                      </AnimatePresence>
                    </motion.div>
                  </Modal>
                  <Modal
                    title="Create New Condition"
                    visible={isCreateModalVisible}
                    onCancel={() => {
                      setNewCondition({
                        type: 'skip_hide_page',
                        conditions: [{ ifField: '', operator: '', value: '' }],
                        logic: 'AND',
                        logicExpression: '',
                        thenAction: 'skip to',
                        thenFields: [],
                        dependentField: '',
                        dependentValues: [],
                        maskPattern: '',
                        sourcePage: selectedNode,
                        targetPage: [],
                        ifField: '',
                        value: '',
                        loopField: '',
                        loopValue: '',
                        loopType: 'static',
                      });
                      setEditingConditionId(null);
                      setIsCreateModalVisible(false);
                    }}
                    footer={null}
                    width={800}
                  >
                    <motion.div variants={containerVariants} className="bg-white p-4 rounded shadow">
                      <h2 className="text-xl font-semibold mb-3">{editingConditionId ? 'Edit Condition' : 'Add New Condition'}</h2>
                      <Tabs
                        defaultActiveKey={newCondition.thenAction === 'loop' ? 'loop' : 'skip_hide'}
                        onChange={(key) => {
                          handleFieldChange('thenAction', key === 'loop' ? 'loop' : 'skip to');
                          handleFieldChange('targetPage', key === 'loop' ? [selectedNode] : []);
                          handleFieldChange('conditions', key === 'loop' ? [] : [{ ifField: '', operator: '', value: '' }]);
                          handleFieldChange('logic', 'AND');
                          handleFieldChange('logicExpression', '');
                        }}
                      >
                        <TabPane tab="Skip To / Hide Page" key="skip_hide">
                          {newCondition.conditions?.map((condition, index) => (
                            <motion.div key={index} variants={itemVariants} className="mb-4 p-3 border rounded">
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">If Field</label>
                                <Select
                                  value={condition.ifField}
                                  onChange={(value) => handleFieldChange('ifField', value, index)}
                                  placeholder="Select field"
                                  style={{ width: '100%' }}
                                >
                                  {validIfFields
                                    .filter((f) => {
                                      const page = pages.find((p) => p.Id === selectedNode);
                                      const pageNum = page ? parseInt(page.Id.replace('page_', '')) : null;
                                      return pageNum && fields.find((field) => field.Unique_Key__c === f.Unique_Key__c)?.Page_Number__c <= pageNum;
                                    })
                                    .map((field) => (
                                      <Option key={field.Unique_Key__c} value={field.Unique_Key__c}>
                                        {field.Name} (Page {fields.find((f) => f.Unique_Key__c === field.Unique_Key__c)?.Page_Number__c})
                                      </Option>
                                    ))}
                                </Select>
                              </div>
                              {condition.ifField && (
                                <>
                                  <div className="mb-3">
                                    <label className="block text-sm font-medium text-gray-700">Operator</label>
                                    <Select
                                      value={condition.operator}
                                      onChange={(value) => handleFieldChange('operator', value, index)}
                                      placeholder="Select operator"
                                      style={{ width: '100%' }}
                                    >
                                      {getOperators(fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c).map((op) => (
                                        <Option key={op} value={op}>
                                          {op}
                                        </Option>
                                      ))}
                                    </Select>
                                  </div>
                                  {condition.operator && !['is null', 'is not null'].includes(condition.operator) && (
                                    <div className="mb-3">
                                      <label className="block text-sm font-medium text-gray-700">Value</label>
                                      {['checkbox', 'radio', 'dropdown'].includes(
                                        fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c
                                      ) ? (
                                        <Select
                                          value={condition.value}
                                          onChange={(value) => handleFieldChange('value', value, index)}
                                          placeholder="Select value"
                                          style={{ width: '100%' }}
                                        >
                                          {getFieldOptions(condition.ifField).map((option) => (
                                            <Option key={option} value={option}>
                                              {option}
                                            </Option>
                                          ))}
                                        </Select>
                                      ) : ['date', 'datetime', 'date-time', 'time'].includes(
                                          fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c
                                        ) ? (
                                          <Input
                                            type={
                                              fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'date'
                                                ? 'date'
                                                : fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'time'
                                                ? 'time'
                                                : 'datetime-local'
                                            }
                                            value={condition.value}
                                            onChange={(e) => handleFieldChange('value', e.target.value, index)}
                                            placeholder={
                                              fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'date'
                                                ? 'YYYY-MM-DD'
                                                : fields.find((f) => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'time'
                                                ? 'HH:MM'
                                                : 'YYYY-MM-DD HH:MM'
                                            }
                                            style={{ width: '100%' }}
                                          />
                                        ) : (
                                          <Input
                                            value={condition.value}
                                            onChange={(e) => handleFieldChange('value', e.target.value, index)}
                                            placeholder="Enter value"
                                          />
                                        )}
                                    </div>
                                  )}
                                  {index > 0 && (
                                    <Button
                                      type="danger"
                                      size="small"
                                      onClick={() => removeCondition(index)}
                                      style={{ marginTop: '8px' }}
                                    >
                                      <FaTrash />
                                    </Button>
                                  )}
                                </>
                              )}
                            </motion.div>
                          ))}
                          {newCondition.conditions?.length > 1 && (
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700">Logic</label>
                              <Select
                                value={newCondition.logic}
                                onChange={(value) => handleFieldChange('logic', value)}
                                style={{ width: '100%' }}
                              >
                                <Option value="AND">AND</Option>
                                <Option value="OR">OR</Option>
                                <Option value="Custom">Custom</Option>
                              </Select>
                              {newCondition.logic === 'Custom' && (
                                <div className="mt-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Custom Logic Expression{' '}
                                    <span className="text-gray-500 text-xs">
                                      (e.g., "1 OR (2 AND 3)" for {newCondition.conditions.length} conditions)
                                    </span>
                                  </label>
                                  <Input
                                    value={newCondition.logicExpression}
                                    onChange={(e) => handleFieldChange('logicExpression', e.target.value)}
                                    placeholder={`e.g., 1 OR (2 AND 3)`}
                                    style={{ width: '100%' }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          <div className="mb-3 flex items-center">
                            <div style={{ width: '120px', marginRight: '8px' }}>
                              <label className="block text-sm font-medium text-gray-700">Then</label>
                              <Select
                                value={newCondition.thenAction}
                                onChange={(value) => handleFieldChange('thenAction', value)}
                                style={{ width: '100%' }}
                              >
                                <Option value="skip to">Skip To</Option>
                                <Option value="hide">Hide</Option>
                              </Select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <label className="block text-sm font-medium text-gray-700">Page(s)</label>
                              <Select
                                mode={newCondition.thenAction === 'hide' ? 'multiple' : 'default'}
                                value={newCondition.targetPage}
                                onChange={(value) => handleFieldChange('targetPage', value)}
                                placeholder="Select target page(s)"
                                style={{ width: '100%' }}
                              >
                                {pages
                                  .filter((p) => p.Id !== selectedNode)
                                  .filter((p) => !(newCondition.thenAction === 'hide' && (p.Id === pages[0]?.Id || p.Id === pages[pages.length - 1]?.Id)))
                                  .map((page) => (
                                    <Option key={page.Id} value={page.Id}>
                                      {page.Name}
                                    </Option>
                                  ))}
                              </Select>
                            </div>
                          </div>
                          <Button
                            type="primary"
                            onClick={addCondition}
                            style={{ marginTop: '8px' }}
                          >
                            <FaPlus style={{ marginRight: '4px' }} /> Add Condition
                          </Button>
                          <div className="flex space-x-2 mt-4">
                            <Button
                              type="primary"
                              onClick={() => {
                                saveCondition(editingConditionId).then(() => {
                                  setNewCondition({
                                    type: 'skip_hide_page',
                                    conditions: [{ ifField: '', operator: '', value: '' }],
                                    logic: 'AND',
                                    logicExpression: '',
                                    thenAction: 'skip to',
                                    thenFields: [],
                                    dependentField: '',
                                    dependentValues: [],
                                    maskPattern: '',
                                    sourcePage: selectedNode,
                                    targetPage: [],
                                    ifField: '',
                                    value: '',
                                    loopField: '',
                                    loopValue: '',
                                    loopType: 'static',
                                  });
                                  setEditingConditionId(null);
                                  setIsCreateModalVisible(false);
                                });
                              }}
                              disabled={
                                !newCondition.conditions?.every((c) => c.ifField && c.operator) ||
                                !newCondition.targetPage.length ||
                                !newCondition.sourcePage
                              }
                            >
                              <FaSave style={{ marginRight: '4px' }} /> {editingConditionId ? 'Update Condition' : 'Add Condition'}
                            </Button>
                            {editingConditionId && (
                              <Button
                                type="danger"
                                onClick={() => {
                                  deleteCondition(editingConditionId);
                                }}
                              >
                                <FaTrash style={{ marginRight: '4px' }} /> Delete
                              </Button>
                            )}
                            <Button
                              type="default"
                              onClick={() => {
                                setNewCondition({
                                  type: 'skip_hide_page',
                                  conditions: [{ ifField: '', operator: '', value: '' }],
                                  logic: 'AND',
                                  logicExpression: '',
                                  thenAction: 'skip to',
                                  thenFields: [],
                                  dependentField: '',
                                  dependentValues: [],
                                  maskPattern: '',
                                  sourcePage: selectedNode,
                                  targetPage: [],
                                  ifField: '',
                                  value: '',
                                  loopField: '',
                                  loopValue: '',
                                  loopType: 'static',
                                });
                                setEditingConditionId(null);
                                setIsCreateModalVisible(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TabPane>
                        <TabPane tab="Loop" key="loop">
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Loop Type</label>
                            <Select
                              value={newCondition.loopType}
                              onChange={(value) => handleFieldChange('loopType', value)}
                              style={{ width: '100%' }}
                            >
                              <Option value="static">Static Value</Option>
                              <Option value="field">Field from Previous Page</Option>
                            </Select>
                          </div>
                          {newCondition.loopType === 'static' ? (
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700">Loop Count (Static)</label>
                              <Input
                                type="number"
                                value={newCondition.loopValue}
                                onChange={(e) => handleFieldChange('loopValue', e.target.value)}
                                placeholder="Enter loop count"
                                style={{ width: '100%' }}
                              />
                            </div>
                          ) : (
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700">Loop Field (Number)</label>
                              <Select
                                value={newCondition.loopField}
                                onChange={(value) => handleFieldChange('loopField', value)}
                                placeholder="Select number field"
                                style={{ width: '100%' }}
                              >
                                {validIfFields
                                  .filter((f) => {
                                    const page = pages.find((p) => p.Id === selectedNode);
                                    const pageNum = page ? parseInt(page.Id.replace('page_', '')) : null;
                                    return (
                                      pageNum &&
                                      f.Field_Type__c === 'number' &&
                                      fields.find((field) => field.Unique_Key__c === f.Unique_Key__c)?.Page_Number__c < pageNum
                                    );
                                  })
                                  .map((field) => (
                                    <Option key={field.Unique_Key__c} value={field.Unique_Key__c}>
                                      {field.Name} (Page {fields.find((f) => f.Unique_Key__c === field.Unique_Key__c)?.Page_Number__c})
                                    </Option>
                                  ))}
                              </Select>
                            </div>
                          )}
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Target Page</label>
                            <Select
                              value={newCondition.targetPage}
                              disabled
                              style={{ width: '100%' }}
                            >
                              <Option value={selectedNode}>{pages.find((p) => p.Id === selectedNode)?.Name || 'Current Page'}</Option>
                            </Select>
                          </div>
                          <div className="flex space-x-2 mt-4">
                            <Button
                              type="primary"
                              onClick={() => {
                                saveCondition(editingConditionId).then(() => {
                                  setNewCondition({
                                    type: 'skip_hide_page',
                                    conditions: [],
                                    logic: 'AND',
                                    logicExpression: '',
                                    thenAction: 'skip to',
                                    thenFields: [],
                                    dependentField: '',
                                    dependentValues: [],
                                    maskPattern: '',
                                    sourcePage: selectedNode,
                                    targetPage: [],
                                    ifField: '',
                                    value: '',
                                    loopField: '',
                                    loopValue: '',
                                    loopType: 'static',
                                  });
                                  setEditingConditionId(null);
                                  setIsCreateModalVisible(false);
                                });
                              }}
                              disabled={
                                !newCondition.sourcePage ||
                                (newCondition.thenAction === 'loop' && (!newCondition.loopField && !newCondition.loopValue))
                              }
                            >
                              <FaSave style={{ marginRight: '4px' }} /> {editingConditionId ? 'Update Condition' : 'Add Condition'}
                            </Button>
                            {editingConditionId && (
                              <Button
                                type="danger"
                                onClick={() => {
                                  deleteCondition(editingConditionId);
                                }}
                              >
                                <FaTrash style={{ marginRight: '4px' }} /> Delete
                              </Button>
                            )}
                            <Button
                              type="default"
                              onClick={() => {
                                setNewCondition({
                                  type: 'skip_hide_page',
                                  conditions: [],
                                  logic: 'AND',
                                  logicExpression: '',
                                  thenAction: 'skip to',
                                  thenFields: [],
                                  dependentField: '',
                                  dependentValues: [],
                                  maskPattern: '',
                                  sourcePage: selectedNode,
                                  targetPage: [],
                                  ifField: '',
                                  value: '',
                                  loopField: '',
                                  loopValue: '',
                                  loopType: 'static',
                                });
                                setEditingConditionId(null);
                                setIsCreateModalVisible(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TabPane>
                      </Tabs>
                    </motion.div>
                  </Modal>
                </motion.div>
              </TabPane>
              <TabPane tab="Update/Calculate Field" key="update_calculate_field">
                <motion.div variants={containerVariants} className="bg-white p-4 rounded shadow">
                  <h2 className="text-xl font-semibold mb-3">Add Update/Calculate Condition</h2>

                  {/* Map over multiple conditions */}
                  {newCondition.conditions?.map((condition, index) => (
                    <motion.div key={index} className="mb-4 p-3 border rounded">
                      {/* If Field */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">If Field</label>
                        <Select
                          value={condition.ifField}
                          onChange={value => handleFieldChangeCalc('ifField', value, index)}
                          placeholder="Select field"
                          style={{ width: '100%' }}
                        >
                          {validIfFields
                          .filter(f => !newCondition.conditions.some((c, i) => c.ifField === f.Unique_Key__c && i !== index))
                          .map(field => (
                            <Option key={field.Unique_Key__c} value={field.Unique_Key__c}>{field.Name}</Option>
                          ))}
                        </Select>
                      </div>

                      {/* Operator */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">Operator</label>
                        <Select
                          value={condition.operator}
                          onChange={value => handleFieldChangeCalc('operator', value, index)}
                          placeholder="Select operator"
                          style={{ width: '100%' }}
                        >
                          {getOperators(fields.find(f => f.Unique_Key__c === condition.ifField)?.Field_Type__c).map(op => (
                            <Option key={op} value={op}>{op}</Option>
                          ))}
                        </Select>
                      </div>

                      {/* Value */}
                      {!['is null', 'is not null'].includes(condition.operator) && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700">Value</label>
                          <Input
                            value={condition.value}
                            onChange={e => handleFieldChangeCalc('value', e.target.value, index)}
                            placeholder="Enter target value"
                          />
                        </div>
                      )}
                      {index > 0 && (
                        <Button
                          type="danger"
                          size="small"
                          onClick={() => removeCondition(index)}
                          style={{ marginTop: '8px' }}
                        >
                          <FaTrash /> Remove Condition
                        </Button>
                      )}
                    </motion.div>
                  ))}

                  {/* Add Condition Button */}
                  <Button type="primary" onClick={addCondition} style={{ marginBottom: '16px' }}>
                    <FaPlus style={{ marginRight: '4px' }} /> Add Condition
                  </Button>

                  {/* Logic Selection for multiple conditions */}
                  {newCondition.conditions.length > 1 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Logic</label>
                      <Select
                        value={newCondition.logic}
                        onChange={value => handleFieldChange('logic', value)}
                        style={{ width: '100%' }}
                      >
                        <Option value="AND">AND</Option>
                        <Option value="OR">OR</Option>
                        <Option value="Custom">Custom</Option>
                      </Select>
                      {newCondition.logic === 'Custom' && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Custom Logic Expression{' '}
                            <span className="text-gray-500 text-xs">
                              (e.g., "1 OR (2 AND 3)" for {newCondition.conditions.length} conditions)
                            </span>
                          </label>
                          <Input
                            value={newCondition.logicExpression}
                            onChange={e => handleFieldChange('logicExpression', e.target.value)}
                            placeholder={`e.g., 1 OR (2 AND 3)`}
                            style={{ width: '100%' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <Select
                      value={newCondition.action || ''}
                      onChange={val => handleFieldChangeCalc('action', val)}
                      placeholder="Select action"
                      style={{ width: '100%' }}
                    >
                      <Option value="copy_field_values">Copy Field Value(s)</Option>
                      <Option value="calculate_field">Calculate Field</Option>
                    </Select>
                  </div>

                  {/* Copy Field Values UI */}
                  {newCondition.action === 'copy_field_values' && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700">Source Fields to Copy</label>
                      <Select
                        mode="multiple"
                        value={newCondition.sourceFields || []}
                        onChange={vals => handleFieldChangeCalc('sourceFields', vals)}
                        placeholder="Select fields to copy"
                        style={{ width: '100%' }}
                      >
                        {validIfFields
                          .filter(f =>
                            !newCondition.conditions.some(c => c.ifField === f.Unique_Key__c) &&
                            f.Unique_Key__c !== newCondition.targetField
                          )
                          .map(f => (
                            <Option key={f.Unique_Key__c} value={f.Unique_Key__c}>{f.Name}</Option>
                          ))}
                      </Select>
                    </div>
                  )}

                  {/* Calculate Field UI */}
                  {newCondition.action === 'calculate_field' && (
                    <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Expression</label>
                    <Input
                      readOnly
                      value={newCondition.formula || ''}
                      placeholder="Click 'Open Calculator' to build expression"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setIsCalcModalVisible(true)}
                    />
                    <Button onClick={() => setIsCalcModalVisible(true)} style={{ marginTop: 8 }}>
                      Open Calculator
                    </Button>
                  </div>
                  )}

                  {/* Target Field */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700">Target Field</label>
                    <Select
                      value={newCondition.targetField || ''}
                      onChange={val => handleFieldChangeCalc('targetField', val)}
                      placeholder="Select target field"
                      style={{ width: '100%' }}
                    >
                      {validIfFields
                        .filter(f =>
                          !newCondition.conditions.some(c => c.ifField === f.Unique_Key__c) &&
                          (newCondition.action !== 'copy_field_values' || !(newCondition.sourceFields || []).includes(f.Unique_Key__c)) &&
                          (newCondition.action !== 'calculate_field' || !usedFieldsInFormula.includes(f.Unique_Key__c))
                        )
                        .map(f => (
                          <Option key={f.Unique_Key__c} value={f.Unique_Key__c}>{f.Name}</Option>
                        ))}
                    </Select>
                  </div>

                  {/* Save Button */}
                  <div>
                    <Button
                      type="primary"
                      onClick={() => saveCondition(editingConditionId)}
                      disabled={
                        !newCondition.conditions.every(c => c.ifField && c.operator) ||
                        !newCondition.action ||
                        !newCondition.targetField ||
                        (newCondition.action === 'copy_field_values' && !(newCondition.sourceFields && newCondition.sourceFields.length))
                      }
                    >
                      <FaSave style={{ marginRight: 4 }} />
                      {editingConditionId ? 'Update Condition' : 'Save Condition'}
                    </Button>
                  </div>
                </motion.div>

                {/* Existing Conditions Display */}
                <motion.div variants={containerVariants} className="mt-4">
                  <h2 className="text-xl font-semibold mb-3">Existing Update/Calculate Conditions</h2>
                  <AnimatePresence>
                    {conditions
                      .filter(c => c.type === 'update_calculate_field')
                      .map(condition => (
                        <motion.div
                          key={condition.Id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="bg-white p-4 rounded shadow mb-4 flex justify-between items-center"
                        >
                          <div>
                            {condition.logic === 'Custom' ? (
                            <>
                              <p><strong>If:</strong></p>
                              {condition.conditions?.map((cond, index) => (
                                <p key={index}>
                                  <strong>Condition {index + 1}:</strong> {fields.find(f => f.Unique_Key__c === cond.ifField)?.Name || 'Unknown'} {cond.operator} {cond.value || 'N/A'}
                                </p>
                              ))}
                              <p><strong>Logic:</strong> {condition.logicExpression || 'N/A'}</p>
                            </>
                          ) : (
                            <p>
                              <strong>If:</strong>{' '}
                              {condition.conditions?.map((cond, index) => (
                                <span key={index}>
                                  {fields.find(f => f.Unique_Key__c === cond.ifField)?.Name || 'Unknown'} {cond.operator} {cond.value || 'N/A'}
                                  {index < condition.conditions.length - 1 && ` ${condition.logic} `}
                                </span>
                              ))}
                            </p>
                          )}

                            <p><strong>Action:</strong> {condition.action === 'copy_field_values' ? 'Copy Field Value(s)' : 'Calculate Field'}</p>
                            {condition.action === 'copy_field_values' && (
                              <p>
                                <strong>Source Fields:</strong>{' '}
                                {(condition.sourceFields || []).map(sf => fields.find(f => f.Unique_Key__c === sf)?.Name || 'Unknown').join(', ')}
                              </p>
                            )}
                            {condition.action === 'calculate_field' && (
                              <p>
                                <strong>Calculation:</strong>{' '}
                                {convertFormulaKeysToLabels(condition.formula || '')}
                              </p>
                            )}
                            <p><strong>Target Field:</strong> {fields.find(f => f.Unique_Key__c === condition.targetField)?.Name || 'Unknown'}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="small" onClick={() => editCondition(condition)}><FaEdit /></Button>
                            <Button size="small" onClick={() => deleteCondition(condition.Id)}><FaTrash /></Button>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </motion.div>
              </TabPane>
            </Tabs>
          )}
        </div>
        <Modal
          visible={isCalcModalVisible}
          title="Calculator"
          onCancel={() => setIsCalcModalVisible(false)}
          footer={null}
          width={450}
        >
          <div>
            {/* Editable textarea allowing free typing */}
            <textarea
              value={calcExpression}
              onChange={e => setCalcExpression(e.target.value)}
              style={{ width: '100%', height: '100px', fontSize: '1rem', padding: '8px', boxSizing: 'border-box' }}
              placeholder={`Type expression here.\nUse fields as [FieldName].\nExamples:\nsum([Price], 10) + max([Rating], 5)\nconcatenate('Hello ', [Fullname])\nmin([NumberField1], [NumberField2]) * 2`}
            />
            <Select
              showSearch
              placeholder="Insert function"
              style={{ width: '100%', marginBottom: 8 }}
              onSelect={funcName => {
                // Insert funcName + "(" into calcExpression at cursor or append
                setCalcExpression(prev => prev + funcName + '(');
              }}
              optionFilterProp="children"
            >
              {calculatorFunctions.map(fn => (
                <Option key={fn} value={fn}>
                  {fn}
                </Option>
              ))}
            </Select>

          </div>

          {/* Field Pills UI */}
          <div style={{ marginTop: 8, marginBottom: 20, minHeight: 30 }}>
            {fieldPills.map(pill => (
              <span
                key={pill.key}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#1890ff',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '4px 12px',
                  marginRight: '6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title="Click to remove"
                onClick={() => removeCalcFieldPill(pill.key)}
              >
                {pill.label} &times;
              </span>
            ))}
          </div>

          {/* Buttons for digits, operators, and parentheses */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {['7','8','9','(',')','4','5','6','*','/','1','2','3','+','-','0','.'].map(ch => (
              <Button
                key={ch}
                onClick={() => setCalcExpression(expr => expr + ch)}
                style={{ flex: '1 0 16%', fontSize: '1.1rem', userSelect: 'none' }}
              >
                {ch}
              </Button>
            ))}
            <Button
              danger
              onClick={() => {
                setCalcExpression('');
                setFieldPills([]);
              }}
              style={{ flex: '1 0 34%', fontSize: '1.1rem' }}
            >
              Clear All
            </Button>
            <Button
              onClick={() => setCalcExpression(expr => expr.slice(0, -1))}
              style={{ flex: '1 0 34%', fontSize: '1.1rem' }}
            >
              Backspace
            </Button>
          </div>

          {/* Insert Field Dropdown */}
          <div style={{ marginBottom: 12 }}>
            <Select
              showSearch
              placeholder="Select field to add"
              optionFilterProp="children"
              style={{ width: '100%' }}
              onSelect={key => {
                addCalcFieldPill(key);
              }}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {fields
                .filter(f => f.Field_Type__c && (
                  ['number', 'price', 'shorttext', 'longtext', 'fullname', 'date', 'datetime', 'time', 'rating', 'scalerating'].includes(f.Field_Type__c.toLowerCase())
                  )
                )
                .map(f => (
                  <Select.Option key={f.Unique_Key__c} value={f.Unique_Key__c}>
                    {f.Name} ({f.Field_Type__c})
                  </Select.Option>
                ))
              }
            </Select>
          </div>

          {/* Show calculated result */}
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: 12 }}>
            Result: <span>{String(calcResult)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsCalcModalVisible(false)}>Cancel</Button>
            <Button
              type="primary"
              onClick={() => {
                setNewCondition(prev => ({ ...prev, formula: calcExpression.trim() }));
                setIsCalcModalVisible(false);
              }}
              disabled={!calcExpression.trim()}
            >
              Save
            </Button>
          </div>
        </Modal>
          </motion.div>
          {isShowHideModalVisible && (
            <div className="showhide-modal-bg" role="dialog" aria-modal="true" aria-labelledby="modal-title">
              <motion.div
                className="showhide-modal-box"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <div className="showhide-modal-header">
                  <h2 className="showhide-modal-title">{editingConditionId ? 'Edit Show/Hide Condition' : 'Add Show/Hide Condition'}</h2>
                  <button
                    onClick={() => {
                      setIsShowHideModalVisible(false);
                      setEditingConditionId(null);
                      setNewCondition(prev => ({
                        ...prev,
                        conditions: [{ ifField: '', operator: '', value: '' }],
                        thenFields: [],
                        logic: 'AND',
                        logicExpression: '',
                        thenAction: 'show',
                      }));
                      setError(null);
                    }}
                    className="showhide-modal-close"
                    aria-label="Close"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 2.00714L9.99286 1L6 4.99286L2.00714 1L1 2.00714L4.99286 6L1 9.99286L2.00714 11L6 7.00714L9.99286 11L11 9.99286L7.00714 6L11 2.00714Z" fill="#5F6165"/>
                    </svg>
                  </button>
                </div>

                <div className="showhide-modal-content">
                  <div className="showhide-form-container">
                    {error && <div className="showhide-modal-error">{error}</div>}
                    
                    {/* Condition Section Header */}
                    <div className="condition-section-header">
                      <p>Condition these conditions are met:</p>
                    </div>
                    
                    {/* Conditions Container with Scroll */}
                    <div className="modal-conditions-container">
                      <label className="showhide-modal-label">When</label>
                      <div className='modal-overflow-container'>
                      {newCondition.conditions?.map((condition, index) => (
                        <div key={index} className="condition-block">
                            <div className="modal-condition-row">
                              <div className="modal-condition-field">
                                <Select
                                  value={condition.ifField || undefined}
                                  onChange={value => {
                                    handleFieldChange('ifField', value, index);
                                    setError(null);
                                  }}
                                  placeholder="Select field"
                                  className="showhide-modal-select"
                                  style={{ width: '100%' }}
                                >
                                  {validIfFields.map(field => (
                                    <Select.Option key={field.Unique_Key__c} value={field.Unique_Key__c}>
                                      {field.Name}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </div>

                              
                                <>
                                  <div className="modal-condition-operator">
                                    <Select
                                      value={condition.operator || undefined}
                                      onChange={value => {
                                        handleFieldChange('operator', value, index);
                                        setError(null);
                                      }}
                                      placeholder="Select operator"
                                      className="showhide-modal-select"
                                      style={{ width: '100%' }}
                                    >
                                      {getOperators(fields.find(f => f.Unique_Key__c === condition.ifField)?.Field_Type__c).map(op => (
                                        <Select.Option key={op} value={op}>{op}</Select.Option>
                                      ))}
                                    </Select>
                                  </div>
                                  <div className="modal-condition-value">
                                    {['checkbox', 'radio', 'dropdown'].includes(fields.find(f => f.Unique_Key__c === condition.ifField)?.Field_Type__c) ? (
                                      <Select
                                        value={condition.value || undefined}
                                        onChange={value => handleFieldChange('value', value, index)}
                                        placeholder="Select value"
                                        className="showhide-modal-select"
                                        style={{ width: '100%' }}
                                      >
                                        {getFieldOptions(condition.ifField).map(option => (
                                          <Select.Option key={option} value={option}>{option}</Select.Option>
                                        ))}
                                      </Select>
                                    ) : ['date', 'datetime', 'date-time', 'time'].includes(fields.find(f => f.Unique_Key__c === condition.ifField)?.Field_Type__c) ? (
                                      <Input
                                        type={
                                          fields.find(f => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'date'
                                            ? 'date'
                                            : fields.find(f => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'time'
                                            ? 'time'
                                            : 'datetime-local'
                                        }
                                        value={condition.value}
                                        onChange={e => handleFieldChange('value', e.target.value, index)}
                                        placeholder={
                                          fields.find(f => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'date'
                                            ? 'YYYY-MM-DD'
                                            : fields.find(f => f.Unique_Key__c === condition.ifField)?.Field_Type__c === 'time'
                                            ? 'HH:MM'
                                            : 'YYYY-MM-DD HH:MM'
                                        }
                                        className="showhide-modal-input"
                                        style={{ width: '100%' }}
                                      />
                                    ) : (
                                      <Input
                                        value={['is null','is not null'].includes(condition.operator) ? ' ' : condition.value}
                                        disabled={['is null','is not null'].includes(condition.operator)}
                                        onChange={e => handleFieldChange('value', e.target.value, index)}
                                        placeholder="Enter value"
                                        className="showhide-modal-input"
                                      />
                                    )}
                                  </div>
                                </>
                                {newCondition.conditions?.length > 1 && (
                                  <button
                                    className="condition-delete-btn"
                                    onClick={() => removeCondition(index)}
                                    aria-label="Delete condition"
                                  >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16.9722 8.70703L15.2241 19.1074H8.49268L6.74561 8.70703H16.9722ZM13.0259 4.60742C13.1079 4.82217 13.2196 5.02429 13.354 5.19922C13.5135 5.40685 13.7353 5.6114 14.0083 5.75195H9.7085C9.98149 5.61137 10.2033 5.40675 10.3628 5.19922C10.4973 5.02424 10.6098 4.82235 10.6919 4.60742H13.0259Z" stroke="#5F6165" stroke-width="1.5"/>
                                    </svg>
                                  </button>
                                )}
                            </div>
                          
                          {/* Delete button for each condition */}
                          
                        </div>
                      ))}
                      </div>
                      {/* Add Condition Button */}
                      <button
                        type="primary"
                        onClick={addCondition}
                        className="add-condition-btn"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" stroke="#028AB0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8.57129 12H15.4284" stroke="#028AB0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 8.57227V15.4294" stroke="#028AB0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>

                         <span className='add-condition-text'>Add Condition</span>
                      </button>
                    </div>

                    

                    {/* Logic Selection Area */}
                    {newCondition.conditions?.length > 1 && (
                      <div className="logic-selection-area">
                        <label className="showhide-modal-label">Apply this logic to all conditions:</label>
                        <Select
                          value={newCondition.logic}
                          onChange={value => {
                            handleFieldChange('logic', value);
                            setError(null);
                          }}
                          className="showhide-modal-select logic-select"
                          style={{ width: '100%' }}
                        >
                          <Select.Option value="AND">AND</Select.Option>
                          <Select.Option value="OR">OR</Select.Option>
                          <Select.Option value="Custom">Custom</Select.Option>
                        </Select>

                        {newCondition.logic === 'Custom' && (
                          <div className="modal-custom-logic-input">
                            <label className="showhide-modal-label">
                              Custom Logic Expression{' '}
                              
                            </label>
                            <Input
                              value={newCondition.logicExpression}
                              onChange={e => handleFieldChange('logicExpression', e.target.value)}
                              placeholder={`e.g., 1 OR (2 AND 3)`}
                              className="showhide-modal-input"
                              style={{ width: '100%' }}
                            />
                            {canShowPreview && (
                              <button
                                onClick={openPreview}
                                title="Preview Logic"
                                className='preview-button'
                                aria-label="Open logic preview"
                              >
                                {/* Eye icon SVG or similar */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="11.9999" cy="11.9989" r="2.80556" stroke="#028AB0" stroke-width="1.5"/>
                                <path d="M19.2782 11.052C19.6233 11.471 19.7958 11.6804 19.7958 11.9993C19.7958 12.3183 19.6233 12.5277 19.2782 12.9466C18.0159 14.4792 15.2318 17.3327 12 17.3327C8.76824 17.3327 5.98405 14.4792 4.72175 12.9466C4.37672 12.5277 4.2042 12.3183 4.2042 11.9993C4.2042 11.6804 4.37672 11.471 4.72175 11.052C5.98405 9.51947 8.76824 6.66602 12 6.66602C15.2318 6.66602 18.0159 9.51947 19.2782 11.052Z" stroke="#028AB0" stroke-width="1.5"/>
                                </svg> <span className='add-condition-text'>Preview</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Result Section Header */}
                    <div className="modal-result-section-header">
                      <p>Result perform these actions:</p>
                    </div>
                    
                    {/* Then Action Section */}
                    <div className="modal-then-action-section">
                      <label className="showhide-modal-label">Then</label>
                      <div className="modal-then-action-row">
                        <div className="modal-then-action-type">
                          <Select
                            value={newCondition.thenAction}
                            onChange={value => handleFieldChange('thenAction', value)}
                            className="showhide-modal-select"
                            style={{ width: '100%' }}
                          >
                            <Select.Option value="show">Show</Select.Option>
                            <Select.Option value="hide">Hide</Select.Option>
                          </Select>
                        </div>
                        
                        <div className="then-action-field">
                          <Select
                          mode='multiple'
                            value={newCondition.thenFields || undefined}
                            onChange={value => {
                              handleFieldChange('thenFields', value);
                              setError(null);
                            }}
                            placeholder="Select field(s) to show/hide"
                            disabled={!(newCondition.conditions?.[0]?.ifField)}
                            style={{ width: '100%' }}
                          >
                            {validIfFields
                              .filter(f => !newCondition.conditions?.some(c => c.ifField === f.Unique_Key__c))
                              .map(f => (
                                <Select.Option key={f.Unique_Key__c} value={f.Unique_Key__c}>
                                  {f.Name}
                                </Select.Option>
                              ))}
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="showhide-modal-footer">
                  <div className='cancel-button'>
                    <button
                      className="wizard-btn wizard-btn-secondary"
                      onClick={() => {
                        setIsShowHideModalVisible(false);
                        setEditingConditionId(null);
                      }}
                    >
                      Back
                    </button>
                  </div>
                  <div className={` ${!newCondition.conditions?.every(c => c.ifField && c.operator) ||
                        !newCondition.thenFields.length ? 'next-button' : 'next-button-enabled'}`}>
              
                    <button
                      type="primary"
                      onClick={() => saveCondition(editingConditionId)}
                      disabled={
                        !newCondition.conditions?.every(c => c.ifField && c.operator) ||
                        !newCondition.thenFields.length
                      }
                      className="wizard-btn wizard-btn-primary"
                    >
                      {editingConditionId ? 'Update Condition' : 'Save Condition'}
                    </button>
                  </div>
                </div>
              </motion.div>
            
            </div>
          )}
          {isPreviewVisible && (
          <div className="showhide-modal-bg" role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
            <motion.div
              className="showhide-modal-box"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ maxWidth: 900, width: '90%' }}
            >
              <div className="showhide-modal-header">
                <p id="preview-modal-title" className="showhide-modal-title">Logic Preview</p>
                <button
                  aria-label="Close Preview"
                  className="showhide-modal-close"
                  onClick={closePreview}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 2.00714L9.99286 1L6 4.99286L2.00714 1L1 2.00714L4.99286 6L1 9.99286L2.00714 11L6 7.00714L9.99286 11L11 9.99286L7.00714 6L11 2.00714Z" fill="#5F6165"/>
                  </svg>
                </button>
              </div>

              <div className="showhide-modal-content">
                <div className="showhide-form-container">
                  <p className="showhide-modal-label">Custom Logic Expression:</p>
                  <div className="preview-expression">
                    {newCondition.logicExpression}
                  </div>
                  
                  <p className="showhide-modal-label">Visual Representation:</p>
                  <div className="logic-preview-display">
                    {renderLogicGroup({
                      group: parseLogicExpression(newCondition.logicExpression),
                      conditions: newCondition.conditions,
                      fields: fields,
                    })}
                  </div> 
                </div>
              </div>

              <div className="showhide-modal-footer">
                <div className='cancel-button'>
                    <button
                      className="wizard-btn wizard-btn-secondary"
                      onClick={closePreview}
                    >
                      Back
                    </button>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
    </div>
  );
};

export default Conditions;