import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Prefill.css';
import { useParams } from 'react-router-dom';
import { Select, Button, Radio, Spin, message } from 'antd';

const { Option } = Select;
const { Group: RadioGroup, Button: RadioButton } = Radio;

const OPERATORS = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' }
];

const LOGIC_TYPES = ['AND', 'OR', 'Custom'];

const MULTI_RECORD_ACTIONS = [
  { value: 'process_most_recent', label: 'Process the most recent record' },
  { value: 'skip_prefill', label: 'Skip Prefill' }
];

const generateId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      when: 'beforeChildren'
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10
    }
  }
};

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 150
    }
  },
  exit: { scale: 0.95, opacity: 0 }
};

const Prefill = () => {
  const { formVersionId } = useParams();
  const [metadata, setMetadata] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [objectFieldsCache, setObjectFieldsCache] = useState({});
  const [prefillList, setPrefillList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [activeStep, setActiveStep] = useState(1); // 1: Existing Prefills; 2: Select Object; 3: Configure Prefill
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /* Fetch the Access Token */
  const fetchAccessToken = async (userId, instanceUrl) => {
    try {
      const response = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, instanceUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch access token');
      setAccessToken(data.access_token);
      return data.access_token;
    } catch (err) {
      setError('Error fetching access token: ' + err.message);
      throw err;
    }
  };

  useEffect(() => {
    if (!formVersionId) return;
    fetchMetadataAndPrefills(formVersionId);
  }, [formVersionId]);

  /* Fetch Metadata and Existing Prefills */
  const fetchMetadataAndPrefills = async (formVersionId) => {
    setIsLoading(true);
    setError('');
    try {
      const userId = sessionStorage.getItem('userId');
      let instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) throw new Error('User not authenticated');
      instanceUrl = instanceUrl.replace(/https?:\/\//, '');

      const token = accessToken || (await fetchAccessToken(userId, instanceUrl));

      const response = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId,
          instanceUrl,
          formVersionId,
          requestType: 'prefill',
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch metadata');

      const data = await response.json();
      console.log(data);
      
      setMetadata(Array.isArray(data.metadata) ? data.metadata : []);
      setFormFields(
        Array.isArray(data.formFields)
          ? data.formFields.map(f => ({
              ...f,
              properties: JSON.parse(f.Properties__c || "{}")
            }))
          : []
      );

      if (data.prefillData && Array.isArray(data.prefillData) && data.prefillData.length > 0) {
        setPrefillList(
          data.prefillData
            .map((p) => {
              let parsedData = {};
              try {
                parsedData = p.Prefill_Data__c ? JSON.parse(p.Prefill_Data__c) : {};
              } catch (e) {
                console.warn(`Invalid Prefill_Data__c  JSON for ${p.Id}:`, e);
              }
              return {
                Id: p.Id || null,
                ...parsedData, // contains selectedObject, lookupFilters, etc.
                Order__c: p.Order__c || 0
              };
            })
            .sort((a, b) => (a.Order__c || 0) - (b.Order__c || 0))
        );
        setActiveStep(1);
        setEditingIndex(null);
      }
 else {
        setPrefillList([]);
        setActiveStep(1);
        setEditingIndex(null);
      }
    } catch (err) {
      setError('Error fetching metadata: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Expand special fields into subfields
  const getSelectableFields = () => {
    const expanded = [];

    formFields.forEach(ff => {
      const type = ff.Field_Type__c || ff.properties?.type;
      const props = ff.properties || {};
      
      // For special fields, push each visible subField
      if (['address', 'phone', 'fullname'].includes(type)) {
        Object.entries(props.subFields || {}).forEach(([subKey, subMeta]) => {
          if (subMeta.visible !== false && subMeta.enabled !== false) {
            expanded.push({
              ...ff,
              label: `${props.label} - ${subMeta.label}`,
              properties: {
                ...props,
                id: `${props.id}_${subKey}` // Special ID format
              }
            });
          }
        });
      } 
      else if (type === 'section') {
        Object.entries(props.subFields || {}).forEach(([sideKey, subMeta]) => {
          if (!subMeta) return;

          const subType = subMeta.type;
          const subProps = subMeta; // already contains its own id/type/etc.

          if (['address', 'phone', 'fullname'].includes(subType)) {
            const formatLabel = (key) => {
                return key
                    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
            };
            // Expand nested special type
            Object.entries(subProps.subFields || {}).forEach(([nestedKey, nestedMeta]) => {
              
              if (nestedMeta.visible !== false && nestedMeta.enabled !== false) {
                expanded.push({
                  ...ff,
                  Field_Type__c: subType,
                  label: `${subMeta.label} - ${formatLabel(nestedKey)}`,
                  properties: {
                    ...subProps,
                    id: `${subProps.id}_${nestedKey}`
                  }
                });
              }
            });
          } else {
            // Push the direct subfield (email, link, text, dropdown, etc.)
            expanded.push({
              ...ff,
              Field_Type__c: subType,
              label: `Section - ${subMeta.label}`,
              properties: {
                ...subProps,
                id: subProps.id // Use direct subfield's own id
              }
            });
          }
        });
      }

      else {
        // Normal field
        expanded.push(ff);
      }
    });

    return expanded;
  };


  /* Fetch Object Fields with Caching */
  const fetchObjectFields = async (objectName) => {
    setError('');
    try {
      if (!objectName) return [];

      if (objectFieldsCache[objectName]) return objectFieldsCache[objectName];

      setIsLoading(true);
      const userId = sessionStorage.getItem('userId');
      let instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) throw new Error('User not authenticated');
      instanceUrl = instanceUrl.replace(/https?:\/\//, '');

      const token = accessToken || (await fetchAccessToken(userId, instanceUrl));

      const response = await fetch(process.env.REACT_APP_FETCH_FIELDS_URL, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: instanceUrl,
          objectName: objectName,
          access_token: accessToken,
          requestType: "prefill",
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch object fields');

      const data = await response.json();
      if(data.newAccessToken){
        setAccessToken(data.newAccessToken);
      }
      
      setObjectFieldsCache((prev) => ({
        ...prev,
        [objectName]: Array.isArray(data.fields) ? data.fields : [],
      }));
      return Array.isArray(data.fields) ? data.fields : [];
    } catch (err) {
      setError('Error fetching object fields: ' + err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /* Handler to add a new prefill: move to Object Selection Step */
  const handleAddNewPrefill = () => {
    setEditingIndex(null);
    setActiveStep(2);
  };

  const getOperatorsForType = (fieldType) => {
    if (['string', 'textarea', 'email', 'phone', 'url'].includes(fieldType)) {
        return ['equals', 'not equals', 'is null', 'is not null', 'contains', 'does not contain'];
    }
    if (['number', 'currency', 'percent', 'date', 'datetime', 'time'].includes(fieldType)) {
        return ['equals', 'not equals', 'greater than', 'greater than or equal to', 'less than', 'less than or equal to'];
    }
    if (['boolean', 'checkbox'].includes(fieldType)) {
        return ['equals', 'not equals'];
    }
    if (['picklist', 'multipicklist'].includes(fieldType)) {
        return ['equals', 'not equals'];
    }
    if (['reference'].includes(fieldType)) {
        return ['equals', 'not equals'];
    }
    return ['equals', 'not equals'];
    };


  /* When user selects object (Step 2) */
  const handleObjectSelected = async (objectName) => {
    if (!objectName) return;

    setIsLoading(true);
    try {
      await fetchObjectFields(objectName);

      setPrefillList((prev) => {
        // Add new prefill at start, keep existing
        return [
          {
            selectedObject: objectName,
            lookupFilters: { logicType: 'AND', logicExpression: '', conditions: [] },
            fieldMappings: {},
            sortBy: { field: '', order: 'asc' },
            multipleRecordAction: 'process_most_recent',
            Order__c: prev.length + 1,
          },
          ...prev,
        ];
      });

      setEditingIndex(0);
      setActiveStep(3);
    } catch (err) {
      setError('Error initializing prefill: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* Handlers for editing prefill (Step 3) */

  const addFilterCondition = (prefillIndex) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      const conditions = newList[prefillIndex].lookupFilters.conditions || [];
      newList[prefillIndex].lookupFilters = {
        ...newList[prefillIndex].lookupFilters,
        conditions: [...conditions, { id: generateId(), objectField: '', operator: '=', formField: '' }],
      };
      return newList;
    });
  };

  const movePrefill = async (index, direction) => {
    // swap locally
    setPrefillList(prev => {
      const newList = [...prev];

      if (direction === 'up' && index > 0) {
        [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      }
      if (direction === 'down' && index < newList.length - 1) {
        [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
      }

      // reassign orders for all
      return newList.map((p, idx) => ({ ...p, Order__c: idx + 1 }));
    });

    // Determine the two affected indexes after swap
    let firstIdx = index;
    let secondIdx = direction === 'up' ? index - 1 : index + 1;

    // send API calls for both updated prefills
    const updatedOne = { ...prefillList[firstIdx], Order__c: direction === 'up' ? index : index + 2 };
    const updatedTwo = { ...prefillList[secondIdx], Order__c: direction === 'up' ? index + 1 : index + 1 };

    try {
      const resp1 = await fetch(process.env.REACT_APP_SAVE_PREFILL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          userId: sessionStorage.getItem('userId'),
          instanceUrl: sessionStorage.getItem('instanceUrl'),
          formVersionId,
          prefillData: updatedOne,
          prefillId: updatedOne.Id
        })
      });
      const res1 = await resp1.json();
      if(res1.newAccessToken){
        setAccessToken(res1.newAccessToken);
      }

      const resp2 = await fetch(process.env.REACT_APP_SAVE_PREFILL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          userId: sessionStorage.getItem('userId'),
          instanceUrl: sessionStorage.getItem('instanceUrl'),
          formVersionId,
          prefillData: updatedTwo,
          prefillId: updatedTwo.Id
        })
      });
      const res2 = await resp2.json();
      if(res2.newAccessToken){
        setAccessToken(res2.newAccessToken);
      }

      message.success('Order updated successfully');
    } catch (err) {
      message.error(`Failed to update order: ${err.message}`);
    }
  };


  const deletePrefill = async (index) => {
    const prefill = prefillList[index];
    if (!window.confirm('Are you sure you want to delete this prefill?')) return;

    try {
      const resp = await fetch(process.env.REACT_APP_DELETE_PREFILL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          userId: sessionStorage.getItem('userId'),
          instanceUrl: sessionStorage.getItem('instanceUrl'),
          formVersionId,
          prefillId: prefill.Id
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(await resp.text());
      if(data.newAccessToken){
        setAccessToken(data.newAccessToken);
      }
      message.success('Prefill deleted successfully');
      fetchMetadataAndPrefills(formVersionId);
    } catch (e) {
      message.error(`Failed to delete prefill: ${e.message}`);
    }
  };


  const isFieldTypeCompatible = (formFieldType, sfFieldType) => {
    // Type groups from your mapping code
    const typeMapping = {
      string: ["shorttext", "fullname", "section", "address", "longtext", "email", "dropdown", "checkbox", "picklist"],
      double: ["number", "price"],
      currency: ["price", "number"],
      boolean: ["checkbox"],
      date: ["date"],
      datetime: ["datetime"],
      email: ["email"],
      phone: ["phone"],
      picklist: ["dropdown", "checkbox", "radio", "picklist"],
      multipicklist: ["dropdown", "checkbox", "radio", "picklist"],
      textarea: ["shorttext", "longtext", "fullname", "section", "address"],
      url: ["shorttext"],
      percent: ["number"],
      time: ["time"],
    };

    if (!typeMapping[sfFieldType]) return false;
    return typeMapping[sfFieldType].includes(formFieldType);
  };


  const updateFilterCondition = (prefillIndex, condId, key, value) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      newList[prefillIndex].lookupFilters = {
        ...newList[prefillIndex].lookupFilters,
        conditions: newList[prefillIndex].lookupFilters.conditions.map((cond) =>
          cond.id === condId ? { ...cond, [key]: value } : cond
        ),
      };
      return newList;
    });
  };

  const removeFilterCondition = (prefillIndex, condId) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      newList[prefillIndex].lookupFilters = {
        ...newList[prefillIndex].lookupFilters,
        conditions: newList[prefillIndex].lookupFilters.conditions.filter((c) => c.id !== condId),
      };
      return newList;
    });
  };

  const handleLogicTypeChange = (prefillIndex, logicType) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      newList[prefillIndex].lookupFilters = {
        ...newList[prefillIndex].lookupFilters,
        logicType,
        logicExpression: '',
      };
      return newList;
    });
  };

  const handleLogicExpressionChange = (prefillIndex, expr) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      newList[prefillIndex].lookupFilters = {
        ...newList[prefillIndex].lookupFilters,
        logicExpression: expr,
      };
      return newList;
    });
  };

  const addFieldMapping = (prefillIndex) => {
    setPrefillList((prev) => {
        const newList = [...prev];

        // Filter formFields to find those whose properties.id are NOT already keys in fieldMappings
        const unmappedFields = formFields.filter(
        (ff) => !Object.keys(newList[prefillIndex].fieldMappings).includes(ff.properties?.id)
        );
        console.log(unmappedFields);
        
        if (unmappedFields.length === 0) return prev; // all fields are mapped, nothing to add

        const firstUnmapped = unmappedFields[0];

        newList[prefillIndex].fieldMappings = {
        ...newList[prefillIndex].fieldMappings,
        [firstUnmapped.properties?.id]: ''
        };
        console.log(newList);
        
        return newList;
    });
    };



  const updateFieldMapping = (prefillIndex, formFieldId, sfFieldName) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      newList[prefillIndex].fieldMappings = { ...newList[prefillIndex].fieldMappings, [formFieldId]: sfFieldName };
      return newList;
    });
  };

  const removeFieldMapping = (prefillIndex, formFieldId) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      const newMappings = { ...newList[prefillIndex].fieldMappings };
      delete newMappings[formFieldId];
      newList[prefillIndex].fieldMappings = newMappings;
      return newList;
    });
  };

  const handleSortFieldChange = (prefillIndex, field) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      newList[prefillIndex].sortBy = { ...newList[prefillIndex].sortBy, field };
      return newList;
    });
  };

  const toggleSortOrder = (prefillIndex) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      const currentOrder = newList[prefillIndex].sortBy.order || 'asc';
      newList[prefillIndex].sortBy = {
        ...newList[prefillIndex].sortBy,
        order: currentOrder === 'asc' ? 'desc' : 'asc',
      };
      return newList;
    });
  };

  const handleMultipleRecordActionChange = (prefillIndex, actionValue) => {
    setPrefillList((prev) => {
      const newList = [...prev];
      newList[prefillIndex].multipleRecordAction = actionValue;
      return newList;
    });
  };

  /* Validation */
  const validatePrefill = (prefill) => {
    if (!prefill.selectedObject) {
      message.error('Salesforce Object is required.');
      return false;
    }
    if (!prefill.fieldMappings || Object.keys(prefill.fieldMappings).length === 0) {
      message.error('Map at least one form field to a Salesforce field.');
      return false;
    }
    for (const [formFieldId, sfFieldName] of Object.entries(prefill.fieldMappings)) {
    const formField = formFields?.find(f => f.properties?.id === formFieldId);
    const sfField = objectFieldsCache[prefill.selectedObject]?.find(f => f.name === sfFieldName);
    if (!formField || !sfField) continue;
    if (!isFieldTypeCompatible(formField.Field_Type__c, sfField.type)) {
        message.error(`Form field "${formField.Name}" cannot be mapped to Salesforce field "${sfField.label}" due to type mismatch.`);
        return false;
    }
    }

    if (prefill.lookupFilters?.conditions) {
      for (const cond of prefill.lookupFilters.conditions) {
        if (!cond.objectField || !cond.operator || !cond.formField) {
          message.error('Complete all lookup filter conditions.');
          return false;
        }
      }
    }
    return true;
  };

  const handleSavePrefill = async () => {
    const userId = sessionStorage.getItem('userId');
    let instanceUrl = sessionStorage.getItem('instanceUrl');
    if (editingIndex === null) return;
    const prefill = prefillList[editingIndex];
    if (!validatePrefill(prefill)) return;
    prefill.objectFields = objectFieldsCache[prefill.selectedObject]; 
    setIsLoading(true);
    try {
      const resp = await fetch(process.env.REACT_APP_SAVE_PREFILL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 
          Authorization: `Bearer ${accessToken}`, },
        body: JSON.stringify({
          userId,
          instanceUrl,
          formVersionId,
          prefillData: prefill,
          prefillId: prefill.Id || null,
        }),
      });
      const res = await resp.json();
      if(res.newAccessToken){
        setAccessToken(res.newAccessToken);
      }
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || 'Failed to save prefill');
      }

      message.success('Prefill saved successfully.');

      await fetchMetadataAndPrefills(formVersionId);
      setActiveStep(1);
      setEditingIndex(null);
    } catch (err) {
      setError('Error saving Prefill data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div className="prefill-container" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.h2 variants={itemVariants}>Prefill Configuration</motion.h2>

      {error && (
        <motion.div className="error-message" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {error}
        </motion.div>
      )}

      {isLoading && (
        <motion.div className="loading-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Spin size="large" />
          <p>Loading...</p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {activeStep === 1 && (
          <motion.div key="step1" className="step-container" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <div className="step-header">
              <h3>Step 1: Existing Prefill Configurations</h3>
              <p>Choose an existing prefill to edit, or add a new one.</p>
            </div>

            {/* Existing Prefills List */}
            {prefillList.length > 0 ? (
              <div className="existing-prefills-list">
                {prefillList.map((p, i) => (
                  <div key={i} className="existing-prefill-item">
                    <span className="prefill-label">
                      <b>#{i + 1}</b> - Object: {p.selectedObject || 'No Object Selected'}
                    </span>
                    <div className="prefill-actions">
                      <Button onClick={() => movePrefill(i, 'up')} disabled={i === 0}>↑</Button>
                      <Button onClick={() => movePrefill(i, 'down')} disabled={i === prefillList.length - 1}>↓</Button>
                      <Button type="primary" onClick={async () => {
                        const selectedObj = prefillList[i]?.selectedObject;
                        if (selectedObj && !objectFieldsCache[selectedObj]) {
                          await fetchObjectFields(selectedObj);
                        }
                        setEditingIndex(i);
                        setActiveStep(3);
                      }}>
                        Edit
                      </Button>
                      <Button danger onClick={() => deletePrefill(i)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No existing prefill configurations found.</p>
            )}


            <div className="add-new-prefill-container">
              <Button type="primary" onClick={handleAddNewPrefill} disabled={isLoading}>
                + Add New Prefill
              </Button>
            </div>
          </motion.div>
        )}

        {activeStep === 2 && (
          <motion.div key="step2" className="step-container" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <div className="step-header">
              <h3>Step 2: Select Salesforce Object</h3>
              <p>Choose the Salesforce object for your new prefill.</p>
            </div>

            <Select
              showSearch
              placeholder="Select Salesforce Object"
              optionFilterProp="children"
              onChange={handleObjectSelected}
              disabled={isLoading}
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {metadata.map((obj) => (
                <Option key={obj.apiName || obj.name} value={obj.apiName || obj.name}>
                  {obj.label || obj.apiName || obj.name}
                </Option>
              ))}
            </Select>

            <div style={{ marginTop: 24 }}>
              <Button onClick={() => {
                setActiveStep(1)
                fetchMetadataAndPrefills(formVersionId)
              }} disabled={isLoading}>
                Back to Prefills
              </Button>
            </div>
          </motion.div>
        )}

        {activeStep === 3 && editingIndex !== null && prefillList[editingIndex] && (
          <motion.div key="step3" className="step-container" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <div className="step-header">
              <h3>Step 3: Configure Prefill for {prefillList[editingIndex].selectedObject}</h3>
              <p>Define lookup filters, field mappings, and sorting.</p>
            </div>

            <div className="prefill-card">
              <div className="card-header">
                <div className="header-content">
                  <h4>
                    <i className="icon-sf"></i>
                    {prefillList[editingIndex].selectedObject}
                  </h4>
                  <div className="header-actions">
                    <Button onClick={() => {
                      fetchMetadataAndPrefills(formVersionId)
                      setActiveStep(1)
                    }} disabled={isLoading}>
                      Back to Prefills
                    </Button>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {/* Lookup Filter Section */}
                <div className="section-container">
                  <div className="section-header">
                    <h5>Lookup Filter</h5>
                    <p>Define conditions to find the right record</p>
                  </div>

                  <label className="label-text" htmlFor="logicTypeSelect">
                    Filter Logic:
                  </label>
                  <Select
                    id="logicTypeSelect"
                    value={prefillList[editingIndex].lookupFilters.logicType}
                    onChange={(val) => handleLogicTypeChange(editingIndex, val)}
                    disabled={isLoading}
                    style={{ width: 200, marginBottom: 16 }}
                  >
                    {LOGIC_TYPES.map((lt) => (
                      <Option key={lt} value={lt}>
                        {lt}
                      </Option>
                    ))}
                  </Select>

                  {prefillList[editingIndex].lookupFilters.logicType === 'Custom' && (
                    <div className="custom-logic-input">
                      <label htmlFor="logicExpressionInput" className="label-text">
                        Custom Logic Expression:
                      </label>
                      <input
                        id="logicExpressionInput"
                        type="text"
                        placeholder="e.g. (1 AND 2) OR 3"
                        value={prefillList[editingIndex].lookupFilters.logicExpression}
                        onChange={(e) => handleLogicExpressionChange(editingIndex, e.target.value)}
                        className="logic-expression-input"
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  <div className="filter-conditions">
                    <div className="conditions-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h6>Conditions</h6>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => addFilterCondition(editingIndex)}
                        disabled={isLoading}
                      >
                        + Add Condition
                      </Button>
                    </div>

                    <AnimatePresence>
                      {prefillList[editingIndex].lookupFilters.conditions.map((cond) => (
                        <motion.div
                          key={cond.id}
                          className="condition-row"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}
                        >
                          <Select
                            showSearch
                            placeholder="Object Field"
                            value={cond.objectField}
                            onChange={(val) => updateFilterCondition(editingIndex, cond.id, 'objectField', val)}
                            disabled={isLoading}
                            style={{ flex: 1, width: '40%' }}
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                          >
                            {objectFieldsCache[prefillList[editingIndex].selectedObject]
                              // If formField is selected in this condition, filter for compatible SF objectFields only
                              ?.filter((sfField) => {
                                if (!cond.formField) return true; // show all if formField not selected yet
                                const formField = formFields.find(f => f.properties?.id === cond.formField);
                                if (!formField) return true;
                                return isFieldTypeCompatible(formField.Field_Type__c, sfField.type);
                              })
                              .map((f) => (
                                <Option key={f.name} value={f.name}>
                                  {f.label || f.name}
                                </Option>
                              ))}
                          </Select>

                          <Select
                            value={cond.operator}
                            onChange={(val) => updateFilterCondition(editingIndex, cond.id, 'operator', val)}
                            placeholder="Select operator"
                            style={ {width: '10%'} }
                            >
                            {getOperatorsForType(objectFieldsCache[prefillList[editingIndex].selectedObject]
                                ?.find(f => f.name === cond.objectField)?.type)
                                .map(op => (
                                <Option key={op} value={op}>{op}</Option>
                            ))}
                            </Select>


                          <Select
                            showSearch
                            placeholder="Form Field"
                            value={cond.formField}
                            onChange={(val) => updateFilterCondition(editingIndex, cond.id, 'formField', val)}
                            disabled={isLoading}
                            style={{ flex: 1, width: '40%' }}
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                          >
                            {getSelectableFields()
                              .filter(ff => {
                                if (!cond.objectField) return true;
                                const sfField = objectFieldsCache[prefillList[editingIndex].selectedObject]
                                  ?.find(f => f.name === cond.objectField);
                                if (!sfField) return true;
                                return isFieldTypeCompatible(ff.Field_Type__c, sfField.type);
                              })
                              .map(ff => (
                                <Option key={ff.properties?.id} value={ff.properties?.id}>
                                  {ff.label || ff.Name}
                                </Option>
                              ))}
                          </Select>

                          <Button
                            type="text"
                            danger
                            icon="close"
                            onClick={() => removeFilterCondition(editingIndex, cond.id)}
                            disabled={isLoading}
                            style={ {width: '10%',} }
                          >
                            &times;
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Sort Section */}
                <div className="section-container">
                  <div className="section-header">
                    <h5>Sorting</h5>
                    <p>Define the order of records if multiple match</p>
                  </div>

                  <div className="sort-controls" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <label className="label-text" htmlFor="sortFieldSelect">
                      Sort By Field:
                    </label>
                    <Select
                      id="sortFieldSelect"
                      style={{ flex: 1 }}
                      value={prefillList[editingIndex].sortBy.field}
                      onChange={(val) => handleSortFieldChange(editingIndex, val)}
                      disabled={isLoading}
                      allowClear
                    >
                      {objectFieldsCache[prefillList[editingIndex].selectedObject]?.map((of) => (
                        <Option key={of.name} value={of.name}>
                          {of.label || of.name}
                        </Option>
                      ))}
                    </Select>

                    <Button
                      type="default"
                      onClick={() => toggleSortOrder(editingIndex)}
                      disabled={isLoading}
                      aria-label="Toggle sort order"
                    >
                      {prefillList[editingIndex].sortBy.order === 'desc' ? '↓ Descending' : '↑ Ascending'}
                    </Button>
                  </div>
                </div>

                {/* Multiple Records Handling Section */}
                <div className="section-container">
                  <div className="section-header">
                    <h5>When multiple records match</h5>
                    <p>Choose how to handle multiple matching records</p>
                  </div>

                  <RadioGroup
                    value={prefillList[editingIndex].multipleRecordAction}
                    onChange={(e) => handleMultipleRecordActionChange(editingIndex, e.target.value)}
                    disabled={isLoading}
                  >
                    {MULTI_RECORD_ACTIONS.map(({ value, label }) => (
                      <RadioButton key={value} value={value} style={{ marginRight: 12 }}>
                        {label}
                      </RadioButton>
                    ))}
                  </RadioGroup>
                </div>

                {/* Field Mapping Section */}
                <div className="section-container">
                  <div className="section-header">
                    <h5>Field Mapping</h5>
                    <p>Map form fields to Salesforce fields</p>
                  </div>

                  <div className="field-mappings">
                    <AnimatePresence>
                      {Object.entries(prefillList[editingIndex].fieldMappings).map(([formFieldId, sfField]) => {
                    
                        const formField = formFields.find((f) => f.properties?.id === formFieldId);

                        return (
                          <motion.div
                            key={formFieldId}
                            className="mapping-row"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
                          >
                            <Select
                                placeholder="Form Field"
                                value={formFieldId.startsWith("id_") ? undefined : formFieldId}
                                onChange={(val) => {
                                    const newMappings = { ...prefillList[editingIndex].fieldMappings };
                                    const oldKey = formFieldId;
                                    delete newMappings[oldKey];
                                    newMappings[val] = sfField;
                                    setPrefillList(prev => {
                                    const arr = [...prev];
                                    arr[editingIndex].fieldMappings = newMappings;
                                    return arr;
                                    });
                                }}
                                style={{ flex: 1 }}
                                showSearch
                                >
                                {getSelectableFields()
                                  .filter(ff => {
                                    const mappedKeys = Object.keys(prefillList[editingIndex].fieldMappings);
                                    return !mappedKeys.includes(ff.properties?.id) || ff.properties?.id === formFieldId;
                                  })
                                  .map(ff => (
                                    <Option key={ff.properties?.id} value={ff.properties?.id}>
                                      {ff.label || ff.Name}
                                    </Option>
                                  ))}
                                </Select>


                            <Select
                              showSearch
                              placeholder="Salesforce Field"
                              value={sfField}
                              onChange={(val) => updateFieldMapping(editingIndex, formFieldId, val)}
                              disabled={isLoading}
                              style={{ flex: 2 }}
                              optionFilterProp="children"
                              filterOption={(input, option) =>
                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                              }
                            >
                                
                              {objectFieldsCache[prefillList[editingIndex].selectedObject]
                                ?.filter((of) => {
                                    let baseFormFieldId = formFieldId.includes('_') 
                                      ? formFieldId.split('_')[0] 
                                      : formFieldId;
                                  
                                  // First try to find the field directly
                                  const formField = formFields?.find(f => f.properties?.id === baseFormFieldId);
                                  
                                  // If not found directly, check if it's a subField within a section
                                  if (!formField) {
                                      // Look through all sections to find if this is a subField
                                      const section = formFields?.find(f => 
                                          f.Field_Type__c === 'section' && 
                                          (f.properties?.subFields?.leftField?.id === baseFormFieldId || 
                                          f.properties?.subFields?.rightField?.id === baseFormFieldId)
                                      );
                                      
                                      if (section) {
                                          // Determine if it's left or right field
                                          const subField = 
                                              section.properties.subFields.leftField?.id === baseFormFieldId 
                                                  ? section.properties.subFields.leftField
                                                  : section.properties.subFields.rightField;
                                          
                                          return isFieldTypeCompatible(subField.type, of.type);
                                      }
                                      return false;
                                  }
                                  
                                  return isFieldTypeCompatible(formField.Field_Type__c, of.type);
                                })
                                .map((of) => (
                                    <Option key={of.name} value={of.name}>
                                    {of.label || of.name}
                                    </Option>
                                ))}

                            </Select>

                            <Button
                              type="text"
                              danger
                              onClick={() => removeFieldMapping(editingIndex, formFieldId)}
                              disabled={isLoading}
                            >
                              &times;
                            </Button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {Object.keys(prefillList[editingIndex].fieldMappings).length < formFields.length && (
                      <Button type="primary" onClick={() => addFieldMapping(editingIndex)} disabled={isLoading}>
                        + Add Field Mapping
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="card-footer" style={{ textAlign: 'right' }}>
                <Button type="primary" onClick={handleSavePrefill} loading={isLoading}>
                  Save Prefill Configuration
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Prefill;
