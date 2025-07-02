import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalesforceData } from '../Context/MetadataContext';

const FormName = ({ onClose, fields = [], objectInfo = [] }) => {
  const { refreshData, setFormRecords } = useSalesforceData();
  const [formName, setFormName] = useState('');
  const [formNameError, setFormNameError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const typeMapping = {
    string: ['shorttext'],
    textarea: ['longtext'],
    phone: ['phone'],
    date: ['date'],
    datetime: ['datetime'],
    time: ['time'],
    picklist: ['dropdown'],
    multipicklist: ['dropdown'],
    percent: ['number'],
    double: ['number'],
    currency: ['price'],
    email: ['email'],
    url: ['link'],
    number: ['number'],
    boolean: ['checkbox'],
  };

  const getDefaultValidation = (fieldType) => {
    const field = fieldType.toLowerCase().replace(/\s+/g, '');
    const validations = {
      shorttext: {
        pattern: '^.{1,255}$',
        description: 'Maximum 255 characters allowed.',
      },
      longtext: {
        pattern: '^.{1,1000}$',
        description: 'Maximum 1000 characters allowed.',
      },
      phone: {
        pattern: '^\\+?[0-9]{7,15}$',
        description: "Must be a valid phone number (7-15 digits, optional '+').",
      },
      email: {
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        description: 'Must be a valid email (e.g., user@example.com).',
      },
      date: {
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Must be in YYYY-MM-DD format.',
      },
      datetime: {
        pattern: '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$',
        description: 'Must be in YYYY-MM-DD HH:MM format.',
      },
      time: {
        pattern: '^\\d{2}:\\d{2}$',
        description: 'Must be in HH:MM format.',
      },
      number: {
        pattern: '^[0-9]+$',
        description: 'Only numbers allowed.',
      },
      price: {
        pattern: '^\\d+(\\.\\d{1,2})?$',
        description: 'Must be a valid price (e.g., 10 or 10.99).',
      },
      checkbox: {
        pattern: '^true|false$',
        description: 'Must be checked (true) or unchecked (false).',
      },
      dropdown: {
        pattern: '.*',
        description: 'Must select one of the available options.',
      },
      link: {
        pattern: '^(https?:\\/\\/)?[\\w.-]+\\.[a-z]{2,}(\\/\\S*)?$',
        description: 'Must be a valid URL (e.g., https://example.com).',
      },
      default: {
        pattern: '.*',
        description: 'No specific validation rules.',
      },
    };
    return validations[field] || validations['default'];
  };

  const fetchAccessToken = async (userId, instanceUrl) => {
    try {
      const response = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          instanceUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch access token');
      }
      return data.access_token;
    } catch (error) {
      console.error('Error fetching access token:', error);
      return null;
    }
  };

  const prepareFormData = () => {
    // Default header field
    const headerField = fields.find((f) => f.type === 'header') || {
      id: `field-${Date.now()}-header`,
      type: 'header',
      heading: formName || 'Contact Form',
      alignment: 'center',
    };

    // Generate fields from all objects in objectInfo
    const generatedFields = objectInfo
      .filter((obj) => obj.fields && obj.fields.length > 0)
      .flatMap((obj) =>
        obj.fields.map((objField) => {
          const fieldTypeOptions = typeMapping[objField.type] || ['shorttext'];
          const selectedType = fieldTypeOptions[0];

          const newField = {
            id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: selectedType,
            label: objField.label,
            name: objField.name,
            isRequired: objField.required || false,
            Properties__c: {
              pattern: getDefaultValidation(selectedType).pattern,
              description: getDefaultValidation(selectedType).description,
              required: objField.required || false,
            },
          };

          // Handle checkbox for boolean fields
          if (objField.type === 'boolean') {
            newField.options = ['Checked'];
            newField.allowMultipleSelections = false;
            newField.dropdownRelatedValues = { 'Checked': 'Checked' };
          }

          // Handle picklist and multipicklist fields
          if (['picklist', 'multipicklist'].includes(objField.type)) {
            newField.options = objField.values && objField.values.length > 0
              ? objField.values
              : ['Option 1', 'Option 2', 'Option 3'];
            newField.allowMultipleSelections = objField.type === 'multipicklist';
            newField.dropdownRelatedValues = newField.options.reduce((acc, val) => {
              acc[val] = val;
              return acc;
            }, {});
          }

          // Add phone-specific properties
          if (objField.type === 'phone') {
            newField.phoneInputMask = '(999) 999-9999';
            newField.enableCountryCode = true;
            newField.selectedCountryCode = 'US';
          }

          // Add placeholder for text fields
          if (['shorttext', 'longtext', 'email', 'link'].includes(objField.type)) {
            newField.placeholder = { main: `Enter ${objField.label || objField.name}` };
          }

          // Add number-specific properties
          if (['number', 'percent'].includes(objField.type)) {
            newField.numberValueLimits = { enabled: false, min: '', max: '' };
          }

          return newField;
        })
      );

    // Combine header and generated fields
    const allFields = [headerField, ...generatedFields];

    // Create formFields for backend
    const formFields = allFields.map((field, index) => ({
      Name: field.label || field.type.charAt(0).toUpperCase() + field.type.slice(1),
      Field_Type__c: field.type,
      Page_Number__c: 1,
      Order_Number__c: index + 1,
      Properties__c: JSON.stringify(field),
      Unique_Key__c: field.id,
    }));

    const formVersion = {
      Name: formName || 'Contact Form',
      Description__c: '',
      Stage__c: 'Draft',
      Publish_Link__c: '',
      Version__c: '1',
      Object_Info__c: JSON.stringify(objectInfo),
    };

    return { formVersion, formFields, allFields };
  };

  const prepareMappingData = (formVersionId, objectInfo) => {
    // Create nodes for the flow
    const nodes = [];
    const mappings = [];
    const edges = [];
    
    // Start node
    const startNode = {
      nodeId: 'start',
      actionType: 'Start',
      salesforceObject: '',
      fieldMappings: [],
      conditions: [],
      order: 1,
      previousNodeId: '',
      nextNodeIds: [],
      formVersionId: formVersionId,
      label: 'Start'
    };
    
    nodes.push({
      id: 'start',
      type: 'custom',
      position: { x: 208, y: 50 },
      data: {
        label: 'Start',
        displayLabel: 'Start',
        type: 'trigger',
        action: 'Start',
        order: 1,
        conditions: [],
        fieldMappings: [],
        formVersionId: formVersionId
      },
      draggable: true,
    });
    
    mappings.push(startNode);
    
    // Create/Update nodes for each object
    let previousNodeId = 'start';
    let order = 2;
    
    objectInfo.forEach((obj, index) => {
      const nodeId = `create_update_${Math.floor(Math.random() * 10000)}`;
      const label = `Create/Update`;
      
      // Create field mappings for this object
      const fieldMappings = obj.fields.map(field => ({
        formFieldId: '', // This will be populated after form fields are created
        fieldType: typeMapping[field.type]?.[0] || 'shorttext',
        salesforceField: field.name,
        picklistValue: '',
      }));
      
      const createUpdateNode = {
        nodeId,
        actionType: 'CreateUpdate',
        salesforceObject: obj.objectName,
        fieldMappings,
        conditions: [],
        order,
        previousNodeId: previousNodeId,
        nextNodeIds: [],
      };
      
      nodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 190 + (index * 20), y: 145 + (index * 20) },
        data: {
          label,
          displayLabel: 'Create/Update',
          type: 'action',
          action: 'Create/Update',
          order,
          conditions: [],
          fieldMappings,
          salesforceObject: obj.objectName,
        },
        draggable: true,
      });
      
      mappings.push(createUpdateNode);
      
      // Create edge from previous node to this one
      edges.push({
        id: `e${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        sourceHandle: 'bottom',
        target: nodeId,
        targetHandle: 'top',
      });
      
      previousNodeId = nodeId;
      order++;
    });
    
    // End node
    const endNode = {
      nodeId: 'end',
      actionType: 'End',
      salesforceObject: '',
      fieldMappings: [],
      conditions: [],
      order,
      previousNodeId: previousNodeId,
      nextNodeIds: [],
    };
    
    nodes.push({
      id: 'end',
      type: 'custom',
      position: { x: 213, y: 520 },
      data: {
        label: 'End',
        displayLabel: 'End',
        type: 'end',
        action: 'End',
        order,
        conditions: [],
        fieldMappings: [],
      },
      draggable: true,
    });
    
    mappings.push(endNode);
    
    // Create edge from last create/update to end
    edges.push({
      id: `e${previousNodeId}-end`,
      source: previousNodeId,
      sourceHandle: 'bottom',
      target: 'end',
      targetHandle: 'top',
    });
    
    // Update nextNodeIds for all nodes
    mappings.forEach((node, index) => {
      if (index < mappings.length - 1) {
        node.nextNodeIds = [mappings[index + 1].nodeId];
      }
    });
    
    return {
      nodes,
      mappings,
      edges,
    };
  };

  const handleFormNameSubmit = async () => {
    if (!formName.trim()) {
      setFormNameError('Form name is required.');
      return;
    }
    setIsSaving(true);
    setFormNameError(null);
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) {
        throw new Error('Missing userId or instanceUrl. Please log in.');
      }

      const token = await fetchAccessToken(userId, instanceUrl);
      if (!token) throw new Error('Failed to obtain access token.');

      // Create the form version and fields
      const { formVersion, formFields, allFields } = prepareFormData();
      const formResponse = await fetch(process.env.REACT_APP_SAVE_FORM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: instanceUrl.replace(/https?:\/\//, ''),
          formData: { formVersion, formFields },
        }),
      });

      const formData = await formResponse.json();
      if (!formResponse.ok) throw new Error(formData.error || 'Failed to create form.');

      const newFormVersionId = formData.formVersionId;
      const formFieldIds = formData.formFieldIds || {};

      // Check if objectInfo has valid fields
      const hasValidObjectInfo = objectInfo.some((obj) => obj.fields && obj.fields.length > 0);

      if (hasValidObjectInfo) {
        // Create the mapping records
        const { nodes, mappings, edges } = prepareMappingData(newFormVersionId, objectInfo);
        console.log('allFields :: ',allFields);
        
        // Update field mappings with actual form field IDs
        mappings.forEach((node) => {
          if (node.actionType === 'CreateUpdate') {
            node.formVersionId = newFormVersionId;
            node.label = `Create/Update`;

            node.fieldMappings = node.fieldMappings.map((mapping) => {
              // Find the matching form field by salesforceField
              const formField = allFields.find((f) => {
                // Match by label or salesforceField name
                return (
                  f.name === mapping.salesforceField ||
                  (f.Properties__c?.description && f.Properties__c.description.includes(mapping.salesforceField))
                );
              });

              // Get the formFieldId from formFieldIds using the field's Unique_Key__c
              const formFieldId = formField && formField.id ? formFieldIds[formField.id] || '' : '';

              return {
                ...mapping,
                formFieldId, // Assign the correct formFieldId
              };
            });
          } else {
            // For start and end nodes
            node.formVersionId = newFormVersionId;
            node.label = node.nodeId === 'start' ? 'Start' : 'End';
          }

          // Ensure order is integer
          node.order = parseInt(node.order);
        });

        const mappingResponse = await fetch(process.env.REACT_APP_SAVE_MAPPINGS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            instanceUrl: instanceUrl.replace(/https?:\/\//, ''),
            flowId: newFormVersionId,
            nodes,
            edges,
            mappings,
          }),
        });

        const mappingData = await mappingResponse.json();
        if (!mappingResponse.ok) {
          console.error('Failed to create mappings:', mappingData.error);
          throw new Error(mappingData.error || 'Failed to create mappings.');
        }
      }

      await refreshData();

      navigate(`/form-builder/${newFormVersionId}`, {
        state: { fields: allFields },
      });
    } catch (error) {
      console.error('Error creating form:', error);
      setFormNameError(error.message || 'Failed to create form.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Enter Form Name</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            x
          </button>
        </div>
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Form Name"
          className="w-full p-2 border rounded-md mb-4"
        />
        {formNameError && <p className="text-red-500 text-sm mb-4">{formNameError}</p>}
        <button
          onClick={handleFormNameSubmit}
          disabled={isSaving}
          className={`w-full p-2 bg-blue-600 text-white rounded-md ${
            isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
        >
          {isSaving ? 'Creating...' : 'Create Form'}
        </button>
      </div>
    </div>
  );
};

export default FormName;