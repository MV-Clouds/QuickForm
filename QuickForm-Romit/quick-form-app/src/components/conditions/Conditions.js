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
  const [formRecords, setFormRecords] = useState([]); // New state for formRecords
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

        // Fetch access token once
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
          },
          body: JSON.stringify({
            userId,
            instanceUrl: instanceUrl.replace(/https?:\/\//, ''),
          }),
        });

        const data = await metadataResponse.json();
        if (!metadataResponse.ok) throw new Error(data.error || 'Failed to fetch metadata');

        const records = JSON.parse(data.FormRecords || '[]');
        setFormRecords(records); // Store formRecords in state
        let formVersion = null;
        for (const form of records) {
          formVersion = form.FormVersions.find(v => v.Id === formVersionId);
          if (formVersion) break;
        }

        if (!formVersion) throw new Error(`Form version ${formVersionId} not found`);
        setFields(formVersion.Fields || []);
        setConditions(formVersion.Conditions || []);
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

      const conditionData = {
        Form_Version__c: formVersionId,
        Condition_Type__c: newCondition.type,
        Condition_Data__c: JSON.stringify({
          ifField: newCondition.ifField,
          operator: newCondition.operator,
          value: newCondition.value,
          thenAction: newCondition.thenAction,
          thenFields: newCondition.thenFields,
          dependentField: newCondition.dependentField,
          dependentValues: newCondition.dependentValues,
        }),
      };

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
        type: 'show_hide',
        ifField: '',
        operator: '',
        value: '',
        thenAction: 'show',
        thenFields: [],
        dependentField: '',
        dependentValues: [],
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
      setConditions(conditions.filter(c => c.Id !== conditionId));
    } catch (err) {
      setError(err.message);
    }
  };

  // Filter valid fields for "If" and "Then" (exclude non-interactive fields)
  const validIfFields = fields.filter(
    f => !['signature', 'fileupload', 'imageuploader', 'terms', 'displaytext', 'divider', 'pagebreak', 'section', 'header'].includes(f.Field_Type__c)
  );

  // Filter controlling fields for dependent picklist (checkbox, radio, dropdown)
  const validControllingFields = fields.filter(f => ['checkbox', 'radio', 'dropdown'].includes(f.Field_Type__c));
  // Filter dependent fields (dropdown, multiselect)
  const validDependentFields = fields.filter(f => ['dropdown', 'multiselect'].includes(f.Field_Type__c));

  const textConditions = ['equals', 'not equals', 'is null', 'is not null', 'contains', 'does not contain'];
  const numberConditions = ['equals', 'not equals', 'greater than', 'greater than equals to', 'smaller than', 'smaller than equals to'];

  const getOperators = (fieldType) => {
    if (['shorttext', 'longtext', 'email', 'phone', 'address', 'link', 'fullname'].includes(fieldType)) {
      return textConditions;
    }
    if (['number', 'price', 'percent'].includes(fieldType)) {
      return numberConditions;
    }
    if (['checkbox', 'radio', 'dropdown'].includes(fieldType)) {
      return ['equals', 'not equals'];
    }
    return ['equals', 'not equals'];
  };

  // Get available options for the selected "If" field
  const getFieldOptions = (fieldId) => {
    const field = fields.find(f => f.Unique_Key__c === fieldId);
    if (!field) return [];
    const properties = JSON.parse(field.Properties__c || '{}');
    if (field.Field_Type__c === 'checkbox') {
      return properties.options || [];
    }
    if (field.Field_Type__c === 'radio' || field.Field_Type__c === 'dropdown') {
      return properties.options || [];
    }
    return [];
  };

  // Get dependent picklist values from Object_Info__c or field properties
  const getDependentValues = (fieldId) => {
    const field = fields.find(f => f.Unique_Key__c === fieldId);
    if (!field) return [];
    const formVersion = formRecords.find(form =>
      form.FormVersions.some(v => v.Id === formVersionId)
    )?.FormVersions.find(v => v.Id === formVersionId);
    if (!formVersion) return [];
    const objectInfo = JSON.parse(formVersion.Object_Info__c || '[]')[0];
    const sfField = objectInfo?.fields.find(f => f.label === field.Name);
    return sfField?.values || (JSON.parse(field.Properties__c || '{}').options || []);
  };

  const handleFieldChange = (field, value) => {
    setNewCondition(prev => ({
      ...prev,
      [field]: value,
      // Reset dependent fields when changing ifField
      ...(field === 'ifField' ? { operator: '', value: '', thenFields: [], dependentField: '', dependentValues: [] } : {}),
      ...(field === 'thenFields' ? { thenFields: value } : {}),
    }));
  };

  const addThenField = () => {
    setNewCondition({ ...newCondition, thenFields: [...newCondition.thenFields, ''] });
  };

  const updateThenField = (index, value) => {
    const updatedFields = [...newCondition.thenFields];
    updatedFields[index] = value;
    setNewCondition({ ...newCondition, thenFields: updatedFields });
  };

  const removeThenField = (index) => {
    const updatedFields = newCondition.thenFields.filter((_, i) => i !== index);
    setNewCondition({ ...newCondition, thenFields: updatedFields });
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
          <MainMenuBar formVersionId={formVersionId} /> {/* Replaced Sidebar with MainMenuBar */}
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
            <div className="flex justify-center items-center h-100">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <Tabs defaultActiveKey="show_hide" style={{ marginBottom: '16px' }}>
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
                        {validIfFields.map(field => (
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
                            {getOperators(fields.find(f => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c).map(op => (
                              <Option key={op} value={op}>{op}</Option>
                            ))}
                          </Select>
                        </div>
                        {newCondition.operator && !['is null', 'is not null'].includes(newCondition.operator) && (
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Value</label>
                            {['checkbox', 'radio', 'dropdown'].includes(fields.find(f => f.Unique_Key__c === newCondition.ifField)?.Field_Type__c) ? (
                              <Select
                                value={newCondition.value}
                                onChange={(value) => handleFieldChange('value', value)}
                                placeholder="Select value"
                                style={{ width: '100%' }}
                              >
                                {getFieldOptions(newCondition.ifField).map(option => (
                                  <Option key={option} value={option}>{option}</Option>
                                ))}
                              </Select>
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
                                .filter(f => f.Unique_Key__c !== newCondition.ifField)
                                .map(f => (
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
                      disabled={!newCondition.ifField || !newCondition.operator || !newCondition.thenFields[0]}
                    >
                      <FaSave style={{ marginRight: '4px' }} /> Save Condition
                    </Button>
                  </div>
                </motion.div>
                <motion.div variants={containerVariants} className="mt-4">
                  <h2 className="text-xl font-semibold mb-3">Existing Conditions</h2>
                  <AnimatePresence>
                    {conditions.filter(c => c.Condition_Type__c === 'show_hide').map(condition => (
                      <motion.div
                        key={condition.Id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-white p-4 rounded shadow mb-4 flex justify-between items-center"
                      >
                        <div>
                          <p><strong>If:</strong> {fields.find(f => f.Unique_Key__c === JSON.parse(condition.Condition_Data__c).ifField)?.Name}</p>
                          <p><strong>Operator:</strong> {JSON.parse(condition.Condition_Data__c).operator}</p>
                          <p><strong>Value:</strong> {JSON.parse(condition.Condition_Data__c).value || 'N/A'}</p>
                          <p><strong>Then:</strong> {JSON.parse(condition.Condition_Data__c).thenAction} {JSON.parse(condition.Condition_Data__c).thenFields.map(id => fields.find(f => f.Unique_Key__c === id)?.Name).join(', ')}</p>
                        </div>
                        <Button
                          type="danger"
                          size="small"
                          onClick={() => deleteCondition(condition.Id)}
                        >
                          <FaTrash />
                        </Button>
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
                        {validControllingFields.map(field => (
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
                          {getFieldOptions(newCondition.ifField).map(option => (
                            <Option key={option} value={option}>{option}</Option>
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
                          .filter(f => f.Unique_Key__c !== newCondition.ifField)
                          .map(field => (
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
                              {getDependentValues(newCondition.dependentField).map(option => (
                                <Option key={option} value={option}>{option}</Option>
                              ))}
                            </Select>
                            <Button
                              type="danger"
                              size="small"
                              onClick={() => removeDependentValue(index)}
                            >
                              <FaTrash />
                            </Button>
                          </motion.div>
                        ))}
                        <Button
                          type="primary"
                          size="small"
                          onClick={addDependentValue}
                          style={{ marginTop: '8px' }}
                        >
                          <FaPlus style={{ marginRight: '4px' }} /> Add Value
                        </Button>
                      </div>
                    )}
                    <Button
                      type="primary"
                      onClick={saveCondition}
                      disabled={!newCondition.ifField || !newCondition.dependentField || !newCondition.value}
                    >
                      <FaSave style={{ marginRight: '4px' }} /> Save Condition
                    </Button>
                  </div>
                </motion.div>
                <motion.div variants={containerVariants} className="mt-4">
                  <h2 className="text-xl font-semibold mb-3">Existing Dependent Conditions</h2>
                  <AnimatePresence>
                    {conditions.filter(c => c.Condition_Type__c === 'dependent').map(condition => (
                      <motion.div
                        key={condition.Id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-white p-4 rounded shadow mb-4 flex justify-between items-center"
                      >
                        <div>
                          <p><strong>Controlling:</strong> {fields.find(f => f.Unique_Key__c === JSON.parse(condition.Condition_Data__c).ifField)?.Name}</p>
                          <p><strong>Value:</strong> {JSON.parse(condition.Condition_Data__c).value}</p>
                          <p><strong>Dependent:</strong> {fields.find(f => f.Unique_Key__c === JSON.parse(condition.Condition_Data__c).dependentField)?.Name}</p>
                          <p><strong>Values:</strong> {JSON.parse(condition.Condition_Data__c).dependentValues.join(', ')}</p>
                        </div>
                        <Button
                          type="danger"
                          size="small"
                          onClick={() => deleteCondition(condition.Id)}
                        >
                          <FaTrash />
                        </Button>
                      </motion.div>
                    ))}
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