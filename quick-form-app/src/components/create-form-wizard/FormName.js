import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FormName.css'
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../Loader';

const FormName = ({ onClose, onSubmit, fields = [], objectInfo = [] }) => {
  const initialName = fields.find(f => f.id === 'name')?.defaultValue || '';
  const initialDescription = fields.find(f => f.id === 'description')?.defaultValue || '';
  const [formName, setFormName] = useState(initialName);
  const [formDescription, setFormDescription] = useState(initialDescription); // New state for description
  const [formNameError, setFormNameError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    setFormName(initialName);
    setFormDescription(initialDescription);
  }, [initialName, initialDescription]);

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
    // Group fields by objectName
    const objectGroups = objectInfo.filter(obj => obj.fields && obj.fields.length > 0);

    const pages = [];
    let pageNumber = 1;

    // For each Salesforce object group, generate its fields as one page
    objectGroups.forEach((obj) => {
      const headingFieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const headingField = {
        id: headingFieldId,
        label: 'Heading',
        type: 'heading',
        sectionId: null,
        sectionSide: null,
        subFields: {},
        heading: `${obj.objectName} Form`,
        alignment: 'center',
      };

      const generatedFields = obj.fields.map((objField) => {
        // Generate a unique ID for each field
        const fieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const fieldTypeOptions = typeMapping[objField.type] || ['shorttext'];
        const selectedType = fieldTypeOptions[0];

        const newField = {
          id: fieldId, // Use the unique fieldId here
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

        if (objField.type === 'boolean') {
          newField.options = ['Checked'];
          newField.allowMultipleSelections = false;
          newField.dropdownRelatedValues = { 'Checked': 'Checked' };
        }

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

        if (objField.type === 'phone') {
          newField.phoneInputMask = '(999) 999-9999';
          newField.enableCountryCode = true;
          newField.selectedCountryCode = 'US';
        }

        if (['shorttext', 'longtext', 'email', 'link'].includes(objField.type)) {
          newField.placeholder = { main: `Enter ${objField.label || objField.name}` };
        }

        if (['number', 'percent'].includes(objField.type)) {
          newField.numberValueLimits = { enabled: false, min: '', max: '' };
        }

        // You may add a custom property to associate object on field if needed:
        newField.sfObjectName = obj.objectName;

        return newField;
      });

      const pageFields = [headingField, ...generatedFields];

      pages.push({
        fields: pageFields,
        pageNumber,
        objectName: obj.objectName,
      });
      pageNumber++;
    });

    // Create formFields for backend with page number assigned per object group
    const formFields = pages.flatMap((page) =>
      page.fields.map((field, index) => ({
        Name: field.label || field.type.charAt(0).toUpperCase() + field.type.slice(1),
        Field_Type__c: field.type,
        Page_Number__c: page.pageNumber,  // Assign page number per object
        Order_Number__c: index + 1,
        Properties__c: JSON.stringify(field),
        Unique_Key__c: field.id,
      }))
    );

    // Combine all fields from all pages in order
    const allFields = pages.flatMap(page => page.fields);

    const formVersion = {
      Name: formName,
      Description__c: formDescription,
      Stage__c: 'Draft',
      Publish_Link__c: '',
      Version__c: '1',
      Object_Info__c: JSON.stringify(objectInfo),
    };

    return { formVersion, formFields, allFields };
  };

  const prepareMappingData = (formVersionId, objectInfo, salesforceFieldToFormFieldId) => {
    const nodes = [];
    const edges = [];
    const mappings = [];

    objectInfo.forEach((obj, objIndex) => {
      const nodeId = `create_update_${Math.floor(Math.random() * 10000)}`;

      // Create field mappings only for fields of this object
      const fieldMappings = obj.fields.map(field => {
        return {
          formFieldId: salesforceFieldToFormFieldId[field.name] || '',
          fieldType: typeMapping[field.type]?.[0] || 'shorttext',
          salesforceField: field.name,
          picklistValue: '',
        };
      });

      // Add the content document configuration
      const contentDocumentConfig = {
        storeAsContentDocument: false,
        selectedFileUploadFields: []
      };

      // Use the combined mappings
      const finalMappings = [...fieldMappings, contentDocumentConfig];

      const createUpdateNode = {
        id: nodeId,
        type: 'custom',
        position: { x: 250, y: 150 + objIndex * 300 },
        data: {
          label: 'Create/Update',
          displayLabel: 'Create/Update',
          action: 'Create/Update',
          type: 'action',
          order: objIndex + 1,
          salesforceObject: obj.objectName,
          fieldMappings: finalMappings,
          conditions: [],
          logicType: 'AND',
          customLogic: '',
          enableConditions: false,
          returnLimit: '',
          sortField: '',
          sortOrder: 'ASC',
          nextNodeIds: [],
          previousNodeId: '',
        },
        draggable: true,
      };

      nodes.push(createUpdateNode);

      const mapping = {
        nodeId: nodeId,
        actionType: 'CreateUpdate',
        salesforceObject: obj.objectName,
        fieldMappings: fieldMappings,
        conditions: [],
        logicType: 'AND',
        customLogic: '',
        enableConditions: false,
        returnLimit: '',
        sortField: '',
        sortOrder: 'ASC',
        label: 'Create/Update',
        order: objIndex + 1,
        formVersionId: formVersionId,
        previousNodeId: '',
        nextNodeIds: [],
      };

      mappings.push(mapping);
    });

    // Connect nodes and mappings with edges, set prev/next metadata
    for (let i = 0; i < nodes.length; i++) {
      if (i < nodes.length - 1) {
        edges.push({
          id: `edge_${nodes[i].id}_to_${nodes[i + 1].id}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
        });

        nodes[i].data.nextNodeIds.push(nodes[i + 1].id);
        mappings[i].nextNodeIds.push(nodes[i + 1].id);

        nodes[i + 1].data.previousNodeId = nodes[i].id;
        mappings[i + 1].previousNodeId = nodes[i].id;
      }
    }

    return {
      nodes,
      edges,
      mappings,
    };
  };

  const handleFormNameSubmit = async () => {
    if (!formName.trim()) {
      setFormNameError('Form name is required.');
      return;
    }
    setIsSaving(true);
    setFormNameError(null)

    if (onSubmit) {
      onSubmit({ name: formName, description: formDescription });
      return;
    }
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
      const formFieldIds = formData.fieldRecordIds || {};

      console.log('Field ID mapping from backend:', formFieldIds);

      // Check if objectInfo has valid fields
      const hasValidObjectInfo = objectInfo.some((obj) => obj.fields && obj.fields.length > 0);

      if (hasValidObjectInfo) {
        // Create the mapping records
        const salesforceFieldToFormFieldId = {};
        allFields.forEach(field => {
          console.log('allfields name:: ', field);

          if (field.name && formFieldIds[field.id]) {
            salesforceFieldToFormFieldId[field.name] = formFieldIds[field.id];
          }
        });

        const { nodes, mappings, edges } = prepareMappingData(newFormVersionId, objectInfo, salesforceFieldToFormFieldId);

        console.log('Salesforce field to form field ID mapping:', salesforceFieldToFormFieldId);

        // Debug: Check if we have the right field IDs
        allFields.forEach(field => {
          console.log(`Field: ${field.name}, Unique Key: ${field.id}, Salesforce ID: ${formFieldIds[field.id]}`);
        });

        // Update field mappings with actual form field IDs
        mappings.forEach((mapping) => {
          if (mapping.actionType === 'CreateUpdate') {
            mapping.formVersionId = newFormVersionId;
            mapping.label = `Create/Update`;

            mapping.fieldMappings = mapping.fieldMappings.map((fieldMapping) => {
              // Find the form field ID using the Salesforce field name mapping
              const formFieldId = salesforceFieldToFormFieldId[fieldMapping.salesforceField] || '';

              return {
                ...fieldMapping,
                formFieldId, // Assign the correct formFieldId
              };
            });
          }
        });

        console.log('Mappings with formFieldIds:', mappings);

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
    <AnimatePresence>
      <motion.div
        className="formdetails-modal-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isSaving && <Loader text="Creating form" />}
        <motion.div
          className="formdetails-modal-box"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="formdetails-modal-header">
            <div className="formdetails-modal-title">Enter Form Details</div>
            <button
              onClick={onClose}
              className="formdetails-modal-close"
              aria-label="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 1.00714L8.99286 0L5 3.99286L1.00714 0L0 1.00714L3.99286 5L0 8.99286L1.00714 10L5 6.00714L8.99286 10L10 8.99286L6.00714 5L10 1.00714Z" fill="#5F6165" />
              </svg>

            </button>
          </div>
          <div className="form-container">
            <div className="formdetails-modal-content">
              <div>
                <label htmlFor="formName" className="formdetails-modal-label">
                  Form Name <span className="required-star">*</span>
                </label>
                <motion.input
                  id="formName"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter form name"
                  className="formdetails-modal-input"
                  autoFocus
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div>
                <label htmlFor="formDescription" className="formdetails-modal-label">
                  Form Description
                </label>
                <motion.textarea
                  id="formDescription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Enter form description"
                  className="formdetails-modal-textarea"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <AnimatePresence>
                {formNameError && (
                  <motion.div
                    className="formdetails-modal-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {formNameError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="formdetails-modal-actions">
            <div className="cancel-button">
              <button
                onClick={onClose}
                className="wizard-btn wizard-btn-secondary"
                type="button"
              >
                Cancel
              </button>
            </div>
            <div className={` ${!formName.trim() ? 'next-button' : 'next-button-enabled'}`}>
              <button
                onClick={handleFormNameSubmit}
                disabled={isSaving}
                className="wizard-btn wizard-btn-primary"
              >
                {isSaving ? "Creating..." : "Create Form"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

};

export default FormName;