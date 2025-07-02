import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Select, Button, Input } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import MainMenuBar from '../form-builder-with-versions/MainMenuBar'; // Replaced Sidebar with MainMenuBar
import { FaPlus, FaSave, FaTrash } from 'react-icons/fa';

const { TabPane } = Tabs;
const { Option } = Select;

const Conditions = () => {
  const { formVersionId } = useParams();
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
    ifField: '',
    operator: '',
    value: '',
    thenAction: 'show',
    thenFields: [],
    dependentField: '',
    dependentValues: [],
    maskPattern: '',
  });

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
        setConditions(Array.isArray(formVersion.Conditions) ? formVersion.Conditions : []);
        console.log('Conditions:', formVersion.Conditions);
        
        

      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [formVersionId]);

  const saveCondition = async () => {
    if (!token) {
      setError('Access token not available');
      return;
    }
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) throw new Error('Missing userId or instanceUrl.');

      let conditionData;
      if (newCondition.type === 'show_hide') {
        if (!newCondition.ifField || !newCondition.operator || !newCondition.thenFields.length) {
          throw new Error('Missing required fields for show/hide condition');
        }
        conditionData = {
          Form_Version__c: formVersionId,
          Condition_Data__c: JSON.stringify({
            type: 'show_hide',
            ifField: newCondition.ifField,
            operator: newCondition.operator,
            value: newCondition.value || null,
            thenAction: newCondition.thenAction,
            thenFields: newCondition.thenFields,
          }),
        };
      } else if (newCondition.type === 'dependent') {
        if (
          !newCondition.ifField ||
          !newCondition.value ||
          !newCondition.dependentField ||
          newCondition.dependentValues.length === 0
        ) {
          throw new Error('Missing required fields for dependent condition');
        }
        conditionData = {
          Form_Version__c: formVersionId,
          Condition_Data__c: JSON.stringify({
            type: 'dependent',
            ifField: newCondition.ifField,
            value: newCondition.value,
            dependentField: newCondition.dependentField,
            dependentValues: newCondition.dependentValues,
          }),
        };
      } else {
        // enable_require_mask
        if (!newCondition.ifField || !newCondition.operator || !newCondition.thenFields.length) {
          throw new Error('Missing required fields for enable/require/mask condition');
        }
        if (newCondition.thenAction === 'set mask' && !newCondition.maskPattern) {
          throw new Error('Mask pattern is required for set mask action');
        }
        conditionData = {
          Form_Version__c: formVersionId,
          Condition_Data__c: JSON.stringify({
            type: 'enable_require_mask',
            ifField: newCondition.ifField,
            operator: newCondition.operator,
            value: newCondition.operator === 'is null' || newCondition.operator === 'is not null' ? null : newCondition.value,
            thenAction: newCondition.thenAction,
            thenFields: newCondition.thenFields,
            ...(newCondition.thenAction === 'set mask' ? { maskPattern: newCondition.maskPattern } : {}),
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
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save condition');

      setConditions([...conditions, data.condition]);
      setNewCondition({
        type: newCondition.type,
        ifField: '',
        operator: '',
        value: '',
        thenAction: newCondition.type === 'enable_require_mask' ? 'require' : 'show',
        thenFields: [],
        dependentField: '',
        dependentValues: [],
        maskPattern: '',
      });
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

  const handleFieldChange = (field, value) => {
    setNewCondition((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'ifField'
        ? { operator: '', value: '', thenFields: [], dependentField: '', dependentValues: [], maskPattern: '' }
        : {}),
      ...(field === 'thenFields' ? { thenFields: value } : {}),
      ...(field === 'thenAction' && value !== 'set mask' ? { maskPattern: '' } : {}),
    }));
  };

  const addDependentValue = () => {
    setNewCondition({ ...newCondition, dependentValues: [...newCondition.dependentValues, ''] });
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

  return (
    <div className="flex h-screen bg-gray-100">
      {showSidebar && (
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-64 bg-white shadow-lg"
        >
          <MainMenuBar formVersionId={formVersionId} />
        </motion.div>
      )}
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
                  thenAction: key === 'enable_require_mask' ? 'require' : 'show',
                  thenFields: [],
                  dependentField: '',
                  dependentValues: [],
                  maskPattern: '',
                }));
              }}
            >
              <TabPane tab="Show/Hide Fields" key="show_hide">
                <motion.div variants={containerVariants} className="bg-white p-4 rounded shadow">
                  <h2 className="text-xl font-semibold mb-3">Add Show/Hide Condition</h2>
                  <div className="mb-4">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700">If Field</label>
                      <Select
                        value={newCondition.ifField}
                        onChange={(value) => handleFieldChange('ifField', value)}
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
                    {newCondition.ifField && (
                      <>
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700">Operator</label>
                          <Select
                            value={newCondition.operator}
                            onChange={(value) => handleFieldChange('operator', value)}
                            placeholder="Select operator"
                            style={{ width: '100%' }}
                          >
                            {getOperators(fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c).map(
                              (op) => (
                                <Option key={op} value={op}>
                                  {op}
                                </Option>
                              )
                            )}
                          </Select>
                        </div>
                        {newCondition.operator && !['is null', 'is not null'].includes(newCondition.operator) && (
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Value</label>
                            {['checkbox', 'radio', 'dropdown'].includes(
                              fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c
                            ) ? (
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
                            ) : ['date', 'datetime', 'date-time', 'time'].includes(
                                fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c
                              ) ? (
                              <Input
                                type={
                                  fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c === 'date'
                                    ? 'date'
                                    : fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c === 'time'
                                    ? 'time'
                                    : 'datetime-local'
                                }
                                value={newCondition.value}
                                onChange={(e) => handleFieldChange('value', e.target.value)}
                                placeholder={
                                  fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c === 'date'
                                    ? 'YYYY-MM-DD'
                                    : fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c === 'time'
                                    ? 'HH:MM'
                                    : 'YYYY-MM-DD HH:MM'
                                }
                                style={{ width: '100%' }}
                              />
                            ) : (
                              <Input
                                value={newCondition.value}
                                onChange={(e) => handleFieldChange('value', e.target.value)}
                                placeholder="Enter value"
                              />
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
                            <label className="block text-sm font-medium text-gray-700">Field</label>
                            <Select
                              value={newCondition.thenFields[0] || ''}
                              onChange={(value) => handleFieldChange('thenFields', [value])}
                              placeholder="Select field to show/hide"
                              style={{ width: '100%' }}
                              disabled={!newCondition.ifField}
                            >
                              {validIfFields
                                .filter((f) => f.Unique_Key__c !== newCondition.ifField)
                                .map((f) => (
                                  <Option key={f.Unique_Key__c} value={f.Unique_Key__c}>
                                    {f.Name}
                                  </Option>
                                ))}
                            </Select>
                          </div>
                        </div>
                      </>
                    )}
                    <Button
                      type="primary"
                      onClick={saveCondition}
                      disabled={!newCondition.ifField || !newCondition.operator || !newCondition.thenFields.length}
                    >
                      <FaSave style={{ marginRight: '4px' }} /> Save Condition
                    </Button>
                  </div>
                </motion.div>
                <motion.div variants={containerVariants} className="mt-4">
                  <h2 className="text-xl font-semibold mb-3">Existing Conditions</h2>
                  <AnimatePresence>
                    {conditions
                      .filter((c) => (c.Condition_Data__c ? JSON.parse(c.Condition_Data__c || '{}').type : c.type) === 'show_hide')
                      .map((condition) => {
                        const conditionData = condition.Condition_Data__c ? JSON.parse(condition.Condition_Data__c || '{}') : condition;
                        return (
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
                                <strong>If:</strong> {fields.find((f) => f.Unique_Key__c === conditionData.ifField)?.Name || 'Unknown'}
                              </p>
                              <p>
                                <strong>Operator:</strong> {conditionData.operator || 'N/A'}
                              </p>
                              <p>
                                <strong>Value:</strong> {conditionData.value || 'N/A'}
                              </p>
                              <p>
                                <strong>Then:</strong> {conditionData.thenAction}{' '}
                                {conditionData.thenFields?.map((id) => fields.find((f) => f.Unique_Key__c === id)?.Name).join(', ') || 'None'}
                              </p>
                            </div>
                            <Button type="danger" size="small" onClick={() => deleteCondition(condition.Id)}>
                              <FaTrash />
                            </Button>
                          </motion.div>
                        );
                      })}
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
                    <Button
                      type="primary"
                      onClick={saveCondition}
                      disabled={
                        !newCondition.ifField ||
                        !newCondition.dependentField ||
                        !newCondition.value ||
                        newCondition.dependentValues.length === 0
                      }
                    >
                      <FaSave style={{ marginRight: '4px' }} /> Save Condition
                    </Button>
                  </div>
                </motion.div>
                <motion.div variants={containerVariants} className="mt-4">
                  <h2 className="text-xl font-semibold mb-3">Existing Dependent Conditions</h2>
                  <AnimatePresence>
                    {conditions
                      .filter((c) => (c.Condition_Data__c ? JSON.parse(c.Condition_Data__c || '{}').type : c.type) === 'dependent')
                      .map((condition) => {
                        const conditionData = condition.Condition_Data__c ? JSON.parse(condition.Condition_Data__c || '{}') : condition;
                        return (
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
                                <strong>If:</strong> {fields.find((f) => f.Unique_Key__c === conditionData.ifField)?.Name || 'Unknown'}
                              </p>
                              <p>
                                <strong>Value:</strong> {conditionData.value || 'N/A'}
                              </p>
                              <p>
                                <strong>Then show:</strong> [{conditionData.dependentValues?.join(', ') || 'None'}] for{' '}
                                {fields.find((f) => f.Unique_Key__c === conditionData.dependentField)?.Name || 'Unknown'}
                              </p>
                            </div>
                            <Button type="danger" size="small" onClick={() => deleteCondition(condition.Id)}>
                              <FaTrash />
                            </Button>
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
                </motion.div>
              </TabPane>
              <TabPane tab="Enable/Require/Mask a Field" key="enable_require_mask">
                <motion.div variants={containerVariants} className="bg-white p-4 rounded shadow">
                  <h2 className="text-xl font-semibold mb-3">Add Enable/Require/Mask Condition</h2>
                  <div className="mb-4">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700">If Field</label>
                      <Select
                        value={newCondition.ifField}
                        onChange={(value) => handleFieldChange('ifField', value)}
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
                    {newCondition.ifField && (
                      <>
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700">Operator</label>
                          <Select
                            value={newCondition.operator}
                            onChange={(value) => handleFieldChange('operator', value)}
                            placeholder="Select operator"
                            style={{ width: '100%' }}
                          >
                            {getOperators(fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c).map(
                              (op) => (
                                <Option key={op} value={op}>
                                  {op}
                                </Option>
                              )
                            )}
                          </Select>
                        </div>
                        {newCondition.operator && !['is null', 'is not null'].includes(newCondition.operator) && (
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Value</label>
                            {['checkbox', 'radio', 'dropdown'].includes(
                              fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c
                            ) ? (
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
                            ) : ['date', 'datetime', 'date-time', 'time'].includes(
                                fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c
                              ) ? (
                              <Input
                                type={
                                  fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c === 'date'
                                    ? 'date'
                                    : fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c === 'time'
                                    ? 'time'
                                    : 'datetime-local'
                                }
                                value={newCondition.value}
                                onChange={(e) => handleFieldChange('value', e.target.value)}
                                placeholder={
                                  fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c === 'date'
                                    ? 'YYYY-MM-DD'
                                    : fields.find((f) => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c === 'time'
                                    ? 'HH:MM'
                                    : 'YYYY-MM-DD HH:MM'
                                }
                                style={{ width: '100%' }}
                              />
                            ) : (
                              <Input
                                value={newCondition.value}
                                onChange={(e) => handleFieldChange('value', e.target.value)}
                                placeholder="Enter value"
                              />
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
                              <Option value="require multiple">Require Multiple</Option>
                              <Option value="don't require multiple">Don't Require Multiple</Option>
                              <Option value="disable">Disable</Option>
                              <Option value="enable">Enable</Option>
                              <Option value="set mask">Set Mask</Option>
                            </Select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label className="block text-sm font-medium text-gray-700">
                              {newCondition.thenAction === 'require multiple' || newCondition.thenAction === "don't require multiple"
                                ? 'Fields'
                                : 'Field'}
                            </label>
                            <Select
                              mode={
                                newCondition.thenAction === 'require multiple' || newCondition.thenAction === "don't require multiple"
                                  ? 'multiple'
                                  : 'default'
                              }
                              value={newCondition.thenFields}
                              onChange={(value) => handleFieldChange('thenFields', value)}
                              placeholder={
                                newCondition.thenAction === 'require multiple' || newCondition.thenAction === "don't require multiple"
                                  ? 'Select fields'
                                  : 'Select field'
                              }
                              style={{ width: '100%' }}
                              disabled={!newCondition.ifField}
                            >
                              {validIfFields
                                .filter((f) => f.Unique_Key__c !== newCondition.ifField)
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
                      </>
                    )}
                    <Button
                      type="primary"
                      onClick={saveCondition}
                      disabled={
                        !newCondition.ifField ||
                        !newCondition.operator ||
                        !newCondition.thenFields.length ||
                        (newCondition.thenAction === 'set mask' && !newCondition.maskPattern)
                      }
                    >
                      <FaSave style={{ marginRight: '4px' }} /> Save Condition
                    </Button>
                  </div>
                </motion.div>
                <motion.div variants={containerVariants} className="mt-4">
                  <h2 className="text-xl font-semibold mb-3">Existing Enable/Require/Mask Conditions</h2>
                  <AnimatePresence>
                    {conditions
                      .filter((c) => (c.Condition_Data__c ? JSON.parse(c.Condition_Data__c || '{}').type : c.type) === 'enable_require_mask')
                      ?.map((condition) => {
                        const conditionData = condition.Condition_Data__c ? JSON.parse(condition.Condition_Data__c || '{}') : condition;
                        return (
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
                                <strong>If:</strong> {fields.find((f) => f.Unique_Key__c === conditionData.ifField)?.Name || 'Unknown'}
                              </p>
                              <p>
                                <strong>Operator:</strong> {conditionData.operator || 'N/A'}
                              </p>
                              <p>
                                <strong>Value:</strong> {conditionData.value || 'N/A'}
                              </p>
                              <p>
                                <strong>Then:</strong> {conditionData.thenAction}
                                {conditionData.thenAction === 'set mask' ? ` with pattern "${conditionData.maskPattern || 'N/A'}"` : ''}{' '}
                                {(Array.isArray(conditionData.thenFields)
                                  ? conditionData.thenFields.map((id) => fields.find((f) => f.Unique_Key__c === id)?.Name).filter(Boolean).join(', ')
                                  : fields.find((f) => f.Unique_Key__c === conditionData.thenFields)?.Name) || 'None'}
                              </p>
                            </div>
                            <Button type="danger" size="small" onClick={() => deleteCondition(condition.Id)}>
                              <FaTrash />
                            </Button>
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
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