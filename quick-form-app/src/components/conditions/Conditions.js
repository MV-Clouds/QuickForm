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
        ...(field === 'logic' ? { logic: value } : {}),
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
  return (
    <div className="flex h-screen bg-gray-100">
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
        className="flex-1 p-6 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Form Conditions</h1>
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
                <motion.div variants={containerVariants} className="bg-white p-4 rounded shadow">
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
                </motion.div>
                <motion.div variants={containerVariants} className="mt-4">
                  <h2 className="text-xl font-semibold mb-3">Existing Conditions</h2>
                  <AnimatePresence>
                    {conditions
                      .filter((c) => c.type === 'show_hide')
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
                              <strong>Then:</strong> {condition.thenAction}{' '}
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
            </Tabs>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Conditions;