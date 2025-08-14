import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { decrypt } from '../form-builder-with-versions/crypto';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import SignatureCanvas from 'react-signature-canvas';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import InputMask from 'react-input-mask';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { AiOutlineStar, AiFillStar, AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { FaRegLightbulb, FaLightbulb, FaBolt } from 'react-icons/fa';
import { parsePhoneNumberFromString, getExampleNumber } from 'libphonenumber-js';
import { Select, Tooltip  } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Option } = Select;

function PublicFormViewer() {
  const { linkId } = useParams();
  const [formData, setFormData] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [userId , setUserId ] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [instanceUrl, setInstanceUrl] = useState(null);
  const [linkData, setLinkData] = useState(null);
  const [signatures, setSignatures] = useState({});
  const [filePreviews, setFilePreviews] = useState({});
  const [selectedRatings, setSelectedRatings] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState({});
  const [toggles, setToggles] = useState({});
  const signatureRefs = useRef({});
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState([]);
  const [formConditions, setFormConditions] = useState([]);
  const [loopCounters, setLoopCounters] = useState({});
  const [loopInput, setLoopInput] = useState('');
  const [localIdToSFId, setLocalIdToSFId] = useState({});
  const [prefills, setPrefills] = useState([]);
  const [dependentFields, setDependentFields] = useState(new Set());
  const searchParams = new URLSearchParams(window.location.search);
  const manualPrefills = {};
  const [manualPrefillsState, setManualPrefillsState] = useState({});

  useEffect(() => {
  const fetchFormData = async () => {
    try {
      let decrypted;
      try {
        decrypted = decrypt(linkId);
      } catch (e) {
        throw new Error(e.message || 'Invalid link format');
      }

      const [userId, formId] = decrypted.split('$');
      if (!userId || !formId) {
        throw new Error('Invalid link data');
      }
      setLinkData({ userId, formId });

      const tokenResponse = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || tokenData.error) {
        throw new Error(tokenData.error || 'Failed to fetch access token');
      }
      const token = tokenData.access_token;
      const instanceUrl = tokenData.instanceUrl;
      setUserId(userId);
      setAccessToken(token);
      setInstanceUrl(instanceUrl);

      const response = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, formId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch form');
      }
      const formVersion = data.formVersion;
      setFormData(formVersion);
      const localIdToSFId = {};

      formVersion.Fields.forEach(field => {
        const props = JSON.parse(field.Properties__c || '{}');

        if (props.id && field.Id) {
          // Base mapping
          localIdToSFId[props.id] = field.Id;
          // Add subfield mappings if present in metadata
          if (props.subFields && typeof props.subFields === 'object' && !Array.isArray(props.subFields)) {
            Object.keys(props.subFields).forEach(subName => {
              if(props.type === 'section'){
                localIdToSFId[props.subFields[subName].id] = `${field.Id}_${subName}`;
              }
              else
              localIdToSFId[`${props.id}_${subName}`] = `${field.Id}_${subName}`;
            });
          }
        }
      });
      console.log('Local id ',localIdToSFId);
      
       // Parse Prefill array from formVersion.Prefills if available
      if (formVersion.Prefills && Array.isArray(formVersion.Prefills)) {
        const parsedPrefills = formVersion.Prefills.map(p => {
          let parsedData = {};
          try {
            parsedData = typeof p.Prefill_Data__c === 'string'
              ? JSON.parse(p.Prefill_Data__c)
              : p.Prefill_Data__c || {};
          } catch (e) {
            console.warn('Invalid Prefill_Data__c JSON', e);
          }
          return {
            Id: p.Id,
            Order__c: p.Order__c || 0,
            ...parsedData
          };
        });
        setPrefills(parsedPrefills);

        // Build set of Salesforce field names that should trigger prefill
        const deps = new Set();
        parsedPrefills.forEach(prefill => {
          (prefill.lookupFilters?.conditions || []).forEach(cond => {
            if (cond.formField && localIdToSFId[cond.formField]) {
              deps.add(localIdToSFId[cond.formField]); // store as SF id for runtime
            }
          });
        });
        setDependentFields(deps);
      }

      setLocalIdToSFId(localIdToSFId);
      const parsedConditions = (formVersion.Conditions || []).map(c =>
        c.Condition_Data__c ? (
          typeof c.Condition_Data__c === 'string'
            ? JSON.parse(c.Condition_Data__c)
            : c.Condition_Data__c
        ) : c
      );
      setFormConditions(parsedConditions);

      const mappingsResponse = await fetch(process.env.REACT_APP_FETCH_MAPPINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          formVersionId: formVersion.Id,
          instanceUrl,
          accessToken: token,
        }),
      });

      const mappingsData = await mappingsResponse.json();
      if (!mappingsResponse.ok) {
        throw new Error(mappingsData.error || 'Failed to fetch mappings');
      }
      setFormData((prev) => ({ ...prev, mappings: mappingsData.mappings }));

      const initialValues = {};
      const initialSignatures = {};
      const initialFilePreviews = {};
      const initialRatings = {};
      const initialSelectedOptions = {};
      const initialToggles = {};

      formVersion.Fields.forEach((field) => {
        const properties = JSON.parse(field.Properties__c || '{}');
        const fieldType = field.Field_Type__c;

        if (fieldType === 'phone' && properties.subFields?.countryCode?.enabled) {
          // Safely access subFields properties with defaults
          initialValues[`${field.Id || properties.id}_countryCode`] =
            properties.subFields?.countryCode?.value ?? 'US';
          initialValues[field.Id || properties.id] =
            properties.subFields?.phoneNumber?.value ?? '';
        } else if (fieldType === 'checkbox' || (fieldType === 'dropdown' && properties.allowMultipleSelections)) {
          initialValues[field.Id || properties.id] = properties.defaultValue || [];
        } else if (fieldType === 'datetime' || fieldType === 'date') {
          initialValues[field.Id || properties.id] = properties.defaultValue || null;
        } else if (fieldType === 'time') {
          initialValues[field.Id || properties.id] = properties.defaultValue || '';
        } else if (fieldType === 'scalerating') {
          initialValues[field.Id || properties.id] = {};
        } else {
          initialValues[field.Id || properties.id] = properties.defaultValue || '';
        }

        initialSignatures[field.Id || properties.id] = null;
        initialFilePreviews[field.Id || properties.id] = null;
        initialRatings[field.Id || properties.id] = null;
        initialSelectedOptions[field.Id || properties.id] = fieldType === 'dropdown' && properties.allowMultipleSelections ? [] : '';
        initialToggles[field.Id || properties.id] = false;
      });

      setFormValues(initialValues);
      for (const [key, value] of searchParams.entries()) {
        
        if (key.startsWith('field-')) {
          const fieldIdParam = key;
          const sfId = localIdToSFId[fieldIdParam];
          let fieldMeta;
          let subFieldKey;
          if (sfId?.includes('_')) {
            // Split into parent Id and subfield key
            const [parentId, key] = sfId.split('_');
            subFieldKey = key;

            // Find parent field
            const parentField = formVersion.Fields.find(f => f.Id === parentId);

            if (parentField) {
              const props = JSON.parse(parentField.Properties__c || '{}');

              const subFieldMeta = props.subFields ? props.subFields[subFieldKey] : null;

              if (subFieldMeta) {
                fieldMeta = subFieldMeta;
              } else {
                fieldMeta = parentField;
              }
            }

          } else {
            // Simple case: direct match
            fieldMeta = formVersion.Fields.find(f => f.Id === sfId);
          }
          
          
          if (fieldMeta) {
            const props = JSON.parse(fieldMeta.Properties__c || '{}');
            const fType = fieldMeta.Field_Type__c;

            try {
              let parsedValue = value;

              switch (fType) {
                case 'date':
                  // if (!isNaN(Date.parse(value))) {
                  //   // store in YYYY-MM-DD
                  //   const d = new Date(value);
                  //   parsedValue = d.toISOString().split('T')[0];
                  // } else { throw new Error('Invalid date'); }
                  const parts = value.split(/[-/]/);
                    if (parts.length === 3) {
                      let day, month, year;
                      if (parts[0].length === 4) {
                        [year, month, day] = parts.map(p => parseInt(p, 10));
                      } else if (parts[2].length === 4) {
                        [day, month, year] = parts.map(p => parseInt(p, 10));
                      }
                      if (year && month && day) {
                        const d = `${year.toString().padStart(4, '0')}-${month
                          .toString()
                          .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        const transformDate = new Date(d);
                        parsedValue = transformDate.toISOString().split('T')[0];
                      }
                    }
                  break;
                case 'datetime':
                  if (!isNaN(Date.parse(value))) {
                    const d = new Date(value);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mi = String(d.getMinutes()).padStart(2, '0');
                    parsedValue = `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
                  } else { throw new Error('Invalid datetime'); }
                  break;
                case 'number':
                case 'price':
                  if (!isNaN(parseFloat(value))) {
                    parsedValue = parseFloat(value);
                  } else { throw new Error('Invalid number'); }
                  break;
                case 'checkbox':
                  parsedValue = value.split(',').map(v => v.trim());
                  break;
                default:
                  // leave as string for all other types
                  parsedValue = value;
              }

              manualPrefills[sfId] = parsedValue;
              
            } catch (err) {
              console.warn(`Invalid manual prefill for ${fieldIdParam}:`, err.message);
            }
          }
        }
      }

      if (Object.keys(manualPrefills).length) {
        
        // Step 1: Set manual prefills
        setFormValues(prev => ({ ...prev, ...manualPrefills }));
        
        // Step 2: Run dependent prefill AFTER state is updated
        Object.keys(manualPrefills).forEach(sfId => {
          setManualPrefillsState(manualPrefills);
        });
      }


      setSignatures(initialSignatures);
      setFilePreviews(initialFilePreviews);
      setSelectedRatings(initialRatings);
      setSelectedOptions(initialSelectedOptions);
      setToggles(initialToggles);

      const pageMap = {};
      formVersion.Fields.forEach((field) => {
        const pageNum = field.Page_Number__c || 1;
        if (!pageMap[pageNum]) {
          pageMap[pageNum] = [];
        }
        pageMap[pageNum].push(field);
      });

      const sortedPages = Object.keys(pageMap)
        .sort((a, b) => Number(a) - Number(b))
        .map((pageNum) => pageMap[pageNum].sort((a, b) => (a.Order_Number__c || 0) - (b.Order_Number__c || 0)));
      setPages(sortedPages.length > 0 ? sortedPages : [formVersion.Fields]);
      setLoopCounters({});
    } catch (error) {
      console.error('Error fetching form:', error);
      setFetchError(error.message || 'Failed to load form');
    }
  };

  if (linkId) {
    fetchFormData();
  }
}, [linkId]);

        useEffect(() => {
        if (
          prefills.length > 0 &&                      // prefills are loaded
          Object.keys(manualPrefillsState).length > 0 // we have manual prefill keys
        ) {
          Object.keys(manualPrefillsState).forEach(sfId => {
            runPrefillForField(sfId);
          });
        }
      }, [prefills, manualPrefillsState]);


      const runPrefillForField = async (sfFieldId) => {
        // Step 1: Find prefills directly triggered by this blurred field (condition field)
        const directlyTriggered = prefills.filter(p =>
          (p.lookupFilters?.conditions || []).some(c => localIdToSFId[c.formField] === sfFieldId)
        );

        // If none triggered, stop early
        if (directlyTriggered.length === 0) return;

        // Find the set of target runtime fields from the directly triggered prefills
        const triggeredTargetFields = new Set();
        directlyTriggered.forEach(p => {
          Object.keys(p.fieldMappings || {}).forEach(localId => {
            const runtimeId = localIdToSFId[localId];
            if (runtimeId) triggeredTargetFields.add(runtimeId);
          });
        });

        // Step 1b: Now include any prefill whose target field overlaps with the triggered target fields
        const triggeredPrefills = prefills.filter(p =>
          Object.keys(p.fieldMappings || {}).some(localId => {
            const runtimeId = localIdToSFId[localId];
            return runtimeId && triggeredTargetFields.has(runtimeId);
          })
        ).sort((a, b) => (a.Order__c || 0) - (b.Order__c || 0));


        // Step 3: Filter prefills into groups based on target overlap
        // Here we just reuse triggeredPrefills sorted by priority Order__c
        const updatedFields = new Set();
        for (const prefill of triggeredPrefills) {
          // Skip if ALL its target fields are already updated in this run
          const prefillTargets = Object.keys(prefill.fieldMappings || {})
            .map(localId => localIdToSFId[localId])
            .filter(Boolean);
          const allUpdated = prefillTargets.every(fId => updatedFields.has(fId));
          if (allUpdated) continue;

          const where = buildWhereFromPrefill(prefill.lookupFilters, prefill.objectFields || []);
          const soql = `SELECT ${Object.values(prefill.fieldMappings).join(', ')}
                        FROM ${prefill.selectedObject}
                        ${where ? 'WHERE ' + where : ''}
                        ${prefill.sortBy?.field ? `ORDER BY ${prefill.sortBy.field} ${prefill.sortBy.order || 'ASC'}` : ''}
                        LIMIT 1`;

          try {
            const resp = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                accessToken,
                soql,
                requestType: 'salesforceQuery',
                multipleRecordAction: prefill.multipleRecordAction
              })
            });
            const data = await resp.json();

            if (data.record) {
              const updates = {};
              Object.entries(prefill.fieldMappings).forEach(([localId, sfName]) => {
                const runtimeFieldId = localIdToSFId[localId];
                if (runtimeFieldId && !updatedFields.has(runtimeFieldId) && data.record[sfName] !== undefined) {
                  updates[runtimeFieldId] = data.record[sfName];
                  updatedFields.add(runtimeFieldId); // mark as final for this trigger round
                }
              });

              if (Object.keys(updates).length > 0) {
                setFormValues(prev => ({ ...prev, ...updates }));
              }
            }
          } catch (err) {
            console.error('Prefill failed:', err);
          }
        }
      };



      const formatValForSOQL = (val, sfType) => {
        if (val === null || val === undefined || val === '') {
          return 'null';
        }

        const numericTypes = ['int', 'double', 'currency', 'percent', 'integer', 'long'];
        const dateTypes = ['date', 'datetime', 'time'];

        // If type is numeric or similar, return as-is without quotes
        if (numericTypes.includes(sfType)) {
          return val;
        }
        // If date/datetime, return as-is without quotes (Salesforce accepts date strings unquoted)
        if (dateTypes.includes(sfType)) {
          return val;
        }
        // Otherwise treat as string - escape single quotes and quote value
        const escaped = String(val).replace(/'/g, "\\'");
        return `'${escaped}'`;
      };

      const buildWhereFromPrefill = (lookupFilters, objectFields) => {
        if (!lookupFilters?.conditions?.length) return '';
        const condMap = {};

        lookupFilters.conditions.forEach((cond, idx) => {
          const sfId = localIdToSFId[cond.formField];
          let val = formValues[sfId];
          const sfFieldType = objectFields.find(f => f.name === cond.objectField)?.type;

          let clause = '';

          switch (cond.operator) {
            case 'equals':
              clause = `${cond.objectField} = ${formatValForSOQL(val, sfFieldType)}`;
              break;
            case '!=':
              clause = `${cond.objectField} != ${formatValForSOQL(val, sfFieldType)}`;
              break;
            case 'greater than':
              clause = `${cond.objectField} > ${formatValForSOQL(val, sfFieldType)}`;
              break;
            case 'greater than or equal to':
              clause = `${cond.objectField} >= ${formatValForSOQL(val, sfFieldType)}`;
              break;
            case 'less than':
              clause = `${cond.objectField} < ${formatValForSOQL(val, sfFieldType)}`;
              break;
            case 'less than or equal to':
              clause = `${cond.objectField} <= ${formatValForSOQL(val, sfFieldType)}`;
              break;
            case 'contains':
              clause = `${cond.objectField} LIKE '%${val ?? ''}%'`;
              break;
            case 'startsWith':
              clause = `${cond.objectField} LIKE '${val ?? ''}%'`;
              break;
            case 'endsWith':
              clause = `${cond.objectField} LIKE '%${val ?? ''}'`;
              break;
            case 'is null':
              clause = `${cond.objectField} = null`;
              break;
            case 'is not null':
              clause = `${cond.objectField} != null`;
              break;
            default:
              clause = 'TRUE';
              break;
          }

          condMap[(idx + 1).toString()] = clause;
        });

        if (lookupFilters.logicType === 'Custom' && lookupFilters.logicExpression) {
          return lookupFilters.logicExpression.replace(/\d+/g, n => condMap[n] || 'TRUE');
        }
        const glue = lookupFilters.logicType || 'AND';
        return Object.values(condMap).filter(Boolean).join(` ${glue} `);
      };


  const handleChange = (fieldId, value, isFile = false) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: isFile ? value : value }));

    setErrors((prev) => {
      const newErrors = { ...prev };
      // Clear error for changed field
      if (newErrors[fieldId]) {
        delete newErrors[fieldId];
      }

      // Also clear error for parent field if this is a subfield, e.g. "fieldId_subfield"
      const underscoreIndex = fieldId.indexOf('_');
      if (underscoreIndex > 0) {
        const parentFieldId = fieldId.substring(0, underscoreIndex);
        if (newErrors[parentFieldId]) {
          delete newErrors[parentFieldId];
        }
      }

      return newErrors;
    });
  };


  const handleRatingChange = (fieldId, value) => {
    setSelectedRatings((prev) => ({ ...prev, [fieldId]: value }));
    handleChange(fieldId, value);
  };

  const handleToggleChange = (fieldId, checked) => {
    setToggles((prev) => ({ ...prev, [fieldId]: checked }));
    handleChange(fieldId, checked);
  };

  const handleOptionToggle = (fieldId, option, allowMultiple) => {
    setSelectedOptions((prev) => {
      let newOptions;
      if (allowMultiple) {
        newOptions = prev[fieldId].includes(option)
          ? prev[fieldId].filter((opt) => opt !== option)
          : [...prev[fieldId], option];
      } else {
        newOptions = option;
        setIsDropdownOpen((prev) => ({ ...prev, [fieldId]: false }));
      }
      handleChange(fieldId, newOptions);
      return { ...prev, [fieldId]: newOptions };
    });
  };

  const handleFileChange = (fieldId, e, fieldType) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreviews((prev) => ({ ...prev, [fieldId]: reader.result }));
        handleChange(fieldId, file, true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureEnd = (fieldId, sigCanvasInstance) => {
    if (sigCanvasInstance && !sigCanvasInstance.isEmpty()) {
      // Use getTrimmedCanvas() for a cleaner result, fallback to getCanvas()
      const dataUrl = sigCanvasInstance.toDataURL('image/png');
      setSignatures((prev) => ({ ...prev, [fieldId]: dataUrl }));
      handleChange(fieldId, dataUrl);
    }
  };

  const validateForm = () => {
    if (!formData) return false;
    const newErrors = {};

    formData.Fields.forEach((field) => {
      // For section fields, recursively validate their subfields
      const fieldId = (typeof field.Properties__c === 'string' ? JSON.parse(field.Properties__c || '{}').id : field.Properties__c?.id) || field.Id;
      const currentState = getFieldUiState(fieldId, formValues);
      const properties = typeof field.Properties__c === "string" ? JSON.parse(field.Properties__c || "{}") : (field.Properties__c || {});
      if (field.Field_Type__c === "section" && properties.subFields) {
        if (properties.subFields.leftField) {
          const leftError = validateSingleField(
            properties.subFields.leftField,
            formValues[properties.subFields.leftField.id],
            formValues, {signaturesObj: signatures, uiState: { [fieldId]: currentState }}
          );
          if (leftError) newErrors[properties.subFields.leftField.id] = leftError;
        }
        if (properties.subFields.rightField) {
          const rightError = validateSingleField(
            properties.subFields.rightField,
            formValues[properties.subFields.rightField.id],
            formValues, {signaturesObj: signatures, uiState: { [fieldId]: currentState }}
          );
          if (rightError) newErrors[properties.subFields.rightField.id] = rightError;
        }
      } else {
        const error = validateSingleField(field, formValues[field.Id || properties.id], formValues, {signaturesObj: signatures, uiState: { [fieldId]: currentState }});
        if (error) newErrors[field.Id || properties.id] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!validateForm() || !linkData || !accessToken || !formData.mappings) {
  //     return;
  //   }

  //   setIsSubmitting(true);
  //   try {
  //     const submissionData = {};
  //     const filesToUpload = {};

  //     for (const key of Object.keys(formValues)) {
  //       const field = formData.Fields.find((f) => f.Id === key);
  //       const fieldType = field?.Field_Type__c;

  //       if (['fileupload', 'imageuploader'].includes(fieldType) && formValues[key] instanceof File) {
  //         filesToUpload[key] = formValues[key];
  //         submissionData[key] = formValues[key].name;
  //       } else if (fieldType === 'signature' && signatures[key]) {
  //         const signatureBlob = await (await fetch(signatures[key])).blob();
  //         const signatureFile = new File([signatureBlob], `${key}.png`, { type: 'image/png' });
  //         filesToUpload[key] = signatureFile;
  //         submissionData[key] = `${key}.png`;
  //       } else {
  //         // For phone fields, clean the input to digits only for submission
  //         if (fieldType === 'phone') {
  //           submissionData[key] = formValues[key] ? formValues[key].replace(/\D/g, '') : '';
  //         } else {
  //           submissionData[key] = formValues[key];
  //         }
  //       }
  //     }

  //     const response = await fetch(process.env.REACT_APP_SUBMIT_FORM_URL, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //       body: JSON.stringify({
  //         userId: linkData.userId,
  //         submissionData: {
  //           formId: formData.Form__c,
  //           formVersionId: formData.Id,
  //           data: submissionData,
  //           signatures: signatures,
  //         },
  //       }),
  //     });

  //     const data = await response.json();
  //     if (!response.ok) {
  //       throw new Error(data.error || 'Failed to submit form');
  //     }

  //     const submissionId = data.submissionId;

  //     const updatedSubmissionData = { ...submissionData };
  //     for (const [key, file] of Object.entries(filesToUpload)) {
  //       const documentId = await uploadFileToSalesforce(file, submissionId);
  //       updatedSubmissionData[key] = documentId;
  //     }

  //     const flowResponse = await fetch(process.env.REACT_APP_RUN_MAPPINGS_URL, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //       body: JSON.stringify({
  //         userId: linkData.userId,
  //         instanceUrl,
  //         formVersionId: formData.Id,
  //         formData: updatedSubmissionData,
  //         nodes: formData.mappings,
  //       }),
  //     });

  //     const flowData = await flowResponse.json();
  //     if (!flowResponse.ok) {
  //       const newErrors = {};
  //       if (flowData.results) {
  //         Object.entries(flowData.results).forEach(([nodeId, result]) => {
  //           if (result.error) {
  //             const mapping = formData.mappings.find((m) => m.Node_Id__c === nodeId);
  //             if (mapping?.Formatter_Config__c) {
  //               const formatterConfig = JSON.parse(mapping.Formatter_Config__c || '{}');
  //               let fieldId = formatterConfig.inputField;
  //               if (fieldId.includes('_phoneNumber')) {
  //                 fieldId = fieldId.replace('_phoneNumber', '');
  //               }
  //               newErrors[fieldId] = result.error;
  //             }
  //           }
  //         });
  //         if (Object.keys(newErrors).length > 0) {
  //           setErrors(newErrors);
  //           throw new Error('Form submission completed but flow execution had errors');
  //         }
  //       }
  //       throw new Error(flowData.error || 'Failed to execute flow');
  //     }

  //     alert('Form submitted and flow executed successfully!');

  //     const initialValues = {};
  //     formData.Fields.forEach((field) => {
  //       const properties = JSON.parse(field.Properties__c || '{}');
  //       const fieldType = field.Field_Type__c;
  //       if (fieldType === 'phone' && properties.subFields?.countryCode?.enabled) {
  //         initialValues[`${field.Id}_countryCode`] = properties.subFields.countryCode.value || 'US';
  //         initialValues[field.Id] = '';
  //       } else if (fieldType === 'checkbox' || (fieldType === 'dropdown' && properties.allowMultipleSelections)) {
  //         initialValues[field.Id] = [];
  //       } else if (fieldType === 'datetime' || fieldType === 'date') {
  //         initialValues[field.Id] = null;
  //       } else if (fieldType === 'scalerating') {
  //         initialValues[field.Id] = {};
  //       } else {
  //         initialValues[field.Id] = '';
  //       }
  //     });
  //     setFormValues(initialValues);
  //     setErrors({});
  //     setSignatures({});
  //     setFilePreviews({});
  //     setSelectedRatings({});
  //     setSelectedOptions({});
  //     setToggles({});
  //     setCurrentPage(0);
  //   } catch (error) {
  //     if (error.message.includes('INVALID_JWT_FORMAT')) {
  //       let decrypted;
  //       try {
  //         decrypted = decrypt(linkId);
  //       } catch (e) {
  //         throw new Error(e.message || 'Invalid link format');
  //       }

  //       const [userId, formId] = decrypted.split('$');
  //       const tokenResponse = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ userId }),
  //       });

  //       const tokenData = await tokenResponse.json();
  //       if (!tokenResponse.ok || tokenData.error) {
  //         throw new Error(tokenData.error || 'Failed to fetch access token');
  //       }
  //       const token = tokenData.access_token;
  //       setAccessToken(token);
  //       handleSubmit(e);
  //     } else {
  //       console.error('Error submitting form:', error);
  //       setErrors((prev) => ({ ...prev, submit: error.message || 'Failed to submit form' }));
  //     }
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  // Utility: Validation for a single field (returns an error message string if invalid, or null if valid)
  const validateSingleField = (field, value, allValues, {signaturesObj, uiState} = {}) => {
    let properties = {};
    if (field.Properties__c) {
      properties = typeof field.Properties__c === "string"
        ? JSON.parse(field.Properties__c || "{}")
        : (field.Properties__c || {});
    }
    // For SECTION FIELDS, copy key props from top level into properties if not present
    // (e.g. label, maxChars, allowedDomains, min, max, etc.)
    [
      "label", "isRequired", "maxChars", "shortTextMaxChars", "longTextMaxChars", "allowedDomains",
      "enableConfirmation", "allowedFileTypes", "maxFileSize", "min", "max", "priceLimits", "numberValueLimits",
      "enableAgeVerification", "minAge", "restrictAmPm", "subFields"
    ].forEach((key) => {
      if (
        (typeof properties[key] === "undefined" || properties[key] === null)
        && typeof field[key] !== "undefined"
      ) {
        properties[key] = field[key];
      }
    });
    const fieldType = field.Field_Type__c || field.type;
    const fieldLabel = properties.label || field.Name || field.id || properties.id;
    const isRequired = properties.isRequired || uiState?.[properties.id || field.Id || field.id]?.required || false;
    // Required logic (handles most types including special cases)
    if (
      isRequired && 
      fieldType !== "address" &&
      fieldType !== "fullname" &&
      fieldType !== "phone" && (
        value === "" ||
        value == null ||
        (Array.isArray(value) && value.length === 0) ||
        (fieldType === "fileupload" && !value) ||
        (fieldType === "imageuploader" && !value) ||
        (fieldType === "signature" && signaturesObj && !signaturesObj[field.Id]) ||
        (fieldType === "terms" && !value) ||
        (fieldType === "scalerating" && (!value || Object.keys(value).length === 0))
      )
    ) {
      return `${fieldLabel} is required`;
    }

    // Specialized validation cases
    switch (fieldType) {
      case "number":
        // if (value !== "" && isNaN(parseFloat(value))) return `${fieldLabel} must be a valid number`;
        if (properties.numberValueLimits?.enabled) {
          const numValue = parseFloat(value);
          const { min, max } = properties.numberValueLimits;
          if (min != null && numValue < parseFloat(min)) return `${fieldLabel} must be at least ${min}`;
          if (max != null && numValue > parseFloat(max)) return `${fieldLabel} must be at most ${max}`;
        }
        break;
      case "price":
        // if (value !== "" && isNaN(parseFloat(value))) return `${fieldLabel} must be a valid number`;
        if (properties.priceLimits?.enabled) {
          const numValue = parseFloat(value);
          const { min, max } = properties.priceLimits;
          if (min != null && numValue < parseFloat(min)) return `${fieldLabel} must be at least ${min}`;
          if (max != null && numValue > parseFloat(max)) return `${fieldLabel} must be at most ${max}`;
        }
        break;
      case "shorttext":
        if (properties.shortTextMaxChars && value && value.length > properties.shortTextMaxChars)
          return `${fieldLabel} must be at most ${properties.shortTextMaxChars} characters`;
        break;
      case "longtext":
        if (properties.longTextMaxChars && value && value.length > properties.longTextMaxChars)
          return `${fieldLabel} must be at most ${properties.longTextMaxChars} characters`;
        break;
      case "email":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return `${fieldLabel} must be a valid email address`;
        if (properties.allowedDomains && value) {
          const domains = properties.allowedDomains.split(",").map((d) => d.trim());
          const domain = value.split("@")[1];
          if (!domains.includes(domain)) return `${fieldLabel} must be from one of these domains: ${domains.join(", ")}`;
        }
        if (properties.enableConfirmation && value !== allValues[`${field.Id || properties.id}_confirmation`]) {
          return `Email confirmation does not match`;
        }
        break;
      case "fileupload":
      case "imageuploader":
        if (value && properties.maxFileSize && value.size > properties.maxFileSize * 1024 * 1024)
          return `File size exceeds ${properties.maxFileSize}MB limit`;
        if (value && properties.allowedFileTypes) {
          const extension = value.name.split(".").pop().toLowerCase();
          const allowed = properties.allowedFileTypes.split(",").map((type) => type.trim().toLowerCase());
          if (!allowed.includes(extension))
            return `File type ${extension} is not allowed. Allowed types: ${properties.allowedFileTypes}`;
        }
        break;
      case "date":
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value))
          return `${fieldLabel} must be in YYYY-MM-DD format`;
        if (properties.enableAgeVerification && value) {
          const today = new Date();
          const birthDate = new Date(value);
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
          if (age < properties.minAge) return `You must be at least ${properties.minAge} years old`;
        }
        break;
      case "datetime":
        if (value && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
          return `${fieldLabel} must be in YYYY-MM-DD HH:MM format`;
        break;
      case "time":
        if (value && properties.restrictAmPm) {
          const [hourStr] = value.split(":");
          const hour = parseInt(hourStr, 10);
          const isAm = hour >= 0 && hour < 12;
          if ((properties.restrictAmPm === "AM" && !isAm) || (properties.restrictAmPm === "PM" && isAm)) {
            return `Time must be ${properties.restrictAmPm}`;
          }
        }
        break;
      case "phone":
        if (value) {
          const isCountryCodeEnabled = properties.subFields?.countryCode?.enabled;
          if (isCountryCodeEnabled) {
            const countryCode = allValues[`${field.Id || properties.id}_countryCode`] || properties.subFields?.countryCode?.value || "US";
            try {
              const adjustedValue = value.replace(/\D/g, "");
              const phoneNumber = parsePhoneNumberFromString(adjustedValue, countryCode);
              if (!phoneNumber || !phoneNumber.isValid()) return `${fieldLabel} is not a valid phone number for ${countryCode}`;
              const maxDigits = phoneNumber.countryCallingCode === "+1" ? 10 : phoneNumber.nationalNumber.length <= 15 ? phoneNumber.nationalNumber.length : 15;
              if (adjustedValue.length > maxDigits) return `${fieldLabel} exceeds maximum digits (${maxDigits}) for ${countryCode}`;
              if (countryCode === "US" && !/^[2-9]\d{2}$/.test(phoneNumber.nationalNumber.slice(0, 3))) {
                return `${fieldLabel} must include a valid US area code`;
              }
            } catch (error) {
              return `${fieldLabel} is not a valid phone number for ${countryCode}`;
            }
          }
        }
        break;
      case "address":
        if (isRequired && properties.subFields) {
          const subfieldsToCheck = ["street", "city", "state", "country", "postal"];
          const missingFields = [];

          for (const subfield of subfieldsToCheck) {
            const subConfig = properties.subFields[subfield];
            if (
              (subfield === "street"
                ? subConfig?.visiblesubFields !== false
                : subConfig?.visible !== false)
            ) {
              
              const subValue = allValues[`${field.id || field.Id || properties.id}_${subfield}`] || '';
              if (!subValue || (typeof subValue === "string" && subValue.trim() === "")) {
                missingFields.push(subConfig?.label || subfield);
              }
            }
          }
          
          if (missingFields.length > 0) {
            // Return generic message or list missing fields
            return `Please fill out all the fields in Address`; // Or: `Please fill out: ${missingFields.join(", ")}`
          }
        }
        break;
      case "fullname":
        if (isRequired && properties.subFields) {
          const subfieldsToCheck = ["salutation", "first", "last"];
          const missingFields = [];

          for (const subfield of subfieldsToCheck) {
            const subConfig = properties.subFields[subfield];
            if (subConfig?.enabled !== false) {
              const subValue = allValues[`${field.id || field.Id || properties.id}_${subfield}`] || '';
              if (!subValue || (typeof subValue === "string" && subValue.trim() === "")) {
                missingFields.push(subConfig?.label || subfield);
              }
            }
          }

          if (missingFields.length > 0) {
            return `Please fill out all the fields in full name.`;
          }
        }
        break;
      
      default:
        break;
    }

    return null; // No error
  };

  // In handleSubmit function

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm() || !linkData || !accessToken || !formData.mappings) {
    return;
  }

  setIsSubmitting(true);
  try {
    const visiblePageIds = new Set(getVisiblePages(formValues).map(arr => `page_${arr[0].Page_Number__c}`));

    // Filter out fields that belong to hidden pages
    const filteredFormValues = {};
    Object.keys(formValues).forEach(key => {
      // Find field's page number from formData.Fields
      const field = formData.Fields.find(f => (f.Id === key || (JSON.parse(f.Properties__c || '{}').id === key)));
      if (!field) {
        filteredFormValues[key] = formValues[key]; // Keep if field metadata not found (safer fallback)
      } else {
        const fieldPageId = `page_${field.Page_Number__c || 1}`;
        if (visiblePageIds.has(fieldPageId)) {
          filteredFormValues[key] = formValues[key];
        }
      }
    });
    const submissionData = {};
    const filesToUpload = {};

    const loopPageKeys = pages
    .map(arr => {
      const pageArr = arr;
      const pageId = `page_${pageArr[0]?.Page_Number__c}`;
      const loopCond = getLoopConditionForPage(pageArr, filteredFormValues);
      return loopCond ? pageId : null;
    })
    .filter(Boolean);

    const loopFieldsByPage = {};
    loopPageKeys.forEach(pageId => {
      // Get all fields on this page (including section subfields etc)
      loopFieldsByPage[pageId] = pages.find(arr => `page_${arr[0]?.Page_Number__c}` === pageId)
        .map(f => {
          const properties = typeof f.Properties__c === "string" ? JSON.parse(f.Properties__c || "{}") : (f.Properties__c || {});
          // Collect main field and subfields (e.g. for fullname, address)
          let fieldIds = [f.Id || properties.id];
          if (f.Field_Type__c === "phone" && properties.subFields?.countryCode?.enabled) {
            fieldIds.push(`${f.Id || properties.id}_countryCode`);
          }
          if (f.Field_Type__c === "fullname" && properties.subFields) {
            fieldIds = fieldIds.concat(
              ["salutation", "first", "last"].map(sub => `${f.Id || properties.id}_${sub}`)
            );
          }
          if (f.Field_Type__c === "address" && properties.subFields) {
            fieldIds = fieldIds.concat(
              ["street", "city", "state", "country", "postal"].map(sub => `${f.Id || properties.id}_${sub}`)
            );
          }
          return fieldIds;
        })
        .flat();
    });

    // Move answers of loop pages from root to loop array
    loopPageKeys.forEach(loopKey => {
      const loopArray = filteredFormValues[`${loopKey}_loop`];
      if (!Array.isArray(loopArray)) return;
      // Each element of the loop is a set of values for this page's fields
      submissionData[`${loopKey}_loop`] = loopArray.map(ansSet => {
        // Each ansSet is a map of (fieldId: value) only for that loop round.
        // For consistency, also copy any subfields for e.g. phone, fullname, address.
        const obj = {};
        loopFieldsByPage[loopKey].forEach(fid => {
          if (ansSet[fid] !== undefined) obj[fid] = ansSet[fid];
        });
        return obj;
      });
      // Remove these fields from root: do not store latest loop round separately
      loopFieldsByPage[loopKey].forEach(fid => {
        if (submissionData[fid] !== undefined) delete submissionData[fid];
        if (submissionData[`${fid}_countryCode`] !== undefined) delete submissionData[`${fid}_countryCode`];
      });
    });

    for (const key of Object.keys(filteredFormValues)) {
      const field = formData.Fields.find((f) => f.Id === key);
      const fieldType = field?.Field_Type__c;
      const properties = field ? JSON.parse(field.Properties__c || '{}') : {};

      if (['fileupload', 'imageuploader'].includes(fieldType) && filteredFormValues[key] instanceof File) {
        filesToUpload[key] = filteredFormValues[key];
        submissionData[key] = filteredFormValues[key].name;
      } else if (fieldType === 'signature' && signatures[key]) {
        const signatureBlob = await (await fetch(signatures[key])).blob();
        const signatureFile = new File([signatureBlob], `${key}.png`, { type: 'image/png' });
        filesToUpload[key] = signatureFile;
        submissionData[key] = `${key}.png`;
      } else if (fieldType === 'phone' && !key.endsWith('_countryCode')) {
        // Handle phone fields
        if (properties.subFields?.countryCode?.enabled) {
          const countryCode = filteredFormValues[`${key}_countryCode`] || properties.subFields.countryCode.value || 'US';
          const phoneNumber = filteredFormValues[key] ? filteredFormValues[key].replace(/\D/g, '') : '';
          try {
            const phoneObj = parsePhoneNumberFromString(phoneNumber, countryCode);
            if (phoneObj && phoneObj.isValid()) {
              // Combine country code and phone number in E.164 format
              submissionData[key] = phoneObj.format('E.164');
            } else {
              // If invalid, store the raw phone number
              submissionData[key] = phoneNumber;
              console.warn(`Invalid phone number for ${key}: ${phoneNumber} (${countryCode})`);
            }
            // Include country code separately for formatter reference
            submissionData[`${key}_countryCode`] = countryCode;
          } catch (error) {
            submissionData[key] = phoneNumber;
            submissionData[`${key}_countryCode`] = countryCode;
            console.warn(`Error parsing phone number for ${key}: ${error.message}`);
          }
        } else {
          // For phone fields without country code subfield, clean to digits
          submissionData[key] = filteredFormValues[key] ? filteredFormValues[key].replace(/\D/g, '') : '';
        }
      } else if (key.endsWith('_countryCode')) {
        // Country code is already handled above
        continue;
      } else {
        submissionData[key] = filteredFormValues[key];
      }
    }

    const uploadToS3 = async (file) => {
    const reader = new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

    const base64String = await reader;

    const apiUrl = `https://gqmyfq34x5.execute-api.us-east-1.amazonaws.com/image?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: base64String,
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Upload to S3 failed');
    }

    const data = await response.json();
    return data.fileUrl;  // S3 URL
  };

  // Upload all files and assign URLs into submissionData
  for (const [key, file] of Object.entries(filesToUpload)) {
    try {
      const s3Url = await uploadToS3(file);
      submissionData[key] = s3Url;
    } catch (uploadErr) {
      console.error(`Failed to upload ${key}`, uploadErr);
      setIsSubmitting(false);
      return;  // stop submission on error or handle as needed
    }
  }

    const response = await fetch(process.env.REACT_APP_SUBMIT_FORM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId: linkData.userId,
        submissionData: {
          formId: formData.Form__c,
          formVersionId: formData.Id,
          data: submissionData,
          signatures: signatures,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit form');
    }

    const submissionId = data.submissionId;

    const updatedSubmissionData = { ...submissionData };

    const flowResponse = await fetch(process.env.REACT_APP_RUN_MAPPINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId: linkData.userId,
        instanceUrl,
        formVersionId: formData.Id,
        formData: updatedSubmissionData,
        nodes: formData.mappings,
      }),
    });

    const flowData = await flowResponse.json();
    if (!flowResponse.ok) {
      const newErrors = {};
      if (flowData.results) {
        Object.entries(flowData.results).forEach(([nodeId, result]) => {
          if (result.error) {
            const mapping = formData.mappings.find((m) => m.Node_Id__c === nodeId);
            if (mapping?.Formatter_Config__c) {
              const formatterConfig = JSON.parse(mapping.Formatter_Config__c || '{}');
              let fieldId = formatterConfig.inputField;
              if (fieldId.includes('_phoneNumber')) {
                fieldId = fieldId.replace('_phoneNumber', '');
              }
              newErrors[fieldId] = result.error;
            }
          }
        });
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          throw new Error('Form submission completed but flow execution had errors');
        }
      }
      throw new Error(flowData.error || 'Failed to execute flow');
    }

    alert('Form submitted and flow executed successfully!');

    const initialValues = {};
    formData.Fields.forEach((field) => {
      const properties = JSON.parse(field.Properties__c || '{}');
      const fieldType = field.Field_Type__c;
      if (fieldType === 'phone' && properties.subFields?.countryCode?.enabled) {
        initialValues[`${field.Id || properties.id}_countryCode`] = properties.subFields.countryCode.value || 'US';
        initialValues[field.Id || properties.id] = '';
      } else if (fieldType === 'checkbox' || (fieldType === 'dropdown' && properties.allowMultipleSelections)) {
        initialValues[field.Id || properties.id] = [];
      } else if (fieldType === 'datetime' || fieldType === 'date') {
        initialValues[field.Id || properties.id] = null;
      } else if (fieldType === 'scalerating') {
        initialValues[field.Id || properties.id] = {};
      } else {
        initialValues[field.Id || properties.id] = '';
      }
    });
    setFormValues(initialValues);
    setErrors({});
    setSignatures({});
    setFilePreviews({});
    setSelectedRatings({});
    setSelectedOptions({});
    setToggles({});
    setCurrentPage(0);
  } catch (error) {
    // if (error.message.includes('INVALID_JWT_FORMAT')) {
    //   let decrypted;
    //   try {
    //     decrypted = decrypt(linkId);
    //   } catch (e) {
    //     throw new Error(e.message || 'Invalid link format');
    //   }

    //   const [userId, formId] = decrypted.split('$');
    //   const tokenResponse = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ userId }),
    //   });

    //   const tokenData = await tokenResponse.json();
    //   if (!tokenResponse.ok || tokenData.error) {
    //     throw new Error(tokenData.error || 'Failed to fetch access token');
    //   }
    //   const token = tokenData.access_token;
    //   setAccessToken(token);
    //   handleSubmit(e);
    // } else {
    //   console.error('Error submitting form:', error);
    //   setErrors((prev) => ({ ...prev, submit: error.message || 'Failed to submit form' }));
    // }
  } finally {
    setIsSubmitting(false);
  }
};

  const evaluateCondition = (condition, values, loopArrayKey = null) => {
    if (!condition) return false;
    
    // Helper for getting a field value, including from loop arrays
    function getValueForField(fieldId) {
      // Try direct value
      const plainValue = values[localIdToSFId[fieldId] || fieldId];
      if (plainValue !== undefined) return plainValue;

      // Search all page_x_loop keys for this field in any iteration if not found
      const loopVals = Object.keys(values)
        .filter(key => key.endsWith('_loop') && Array.isArray(values[key]))
        .flatMap(loopKey =>
          values[loopKey]
            .map(iteration => iteration[localIdToSFId[fieldId] || fieldId])
            .filter(v => v !== undefined)
        );
      // If found in any loop, return the array (for some/any logic)
      if (loopVals.length) return loopVals;
      return undefined;
    }

    // Evaluate each subcondition
    const condBools = (condition.conditions || []).map((cond) => {
      let val = getValueForField(cond.ifField);
      // If val is an array (loop), match any iteration meeting the condition
      if (Array.isArray(val)) {
        return val.some(itVal => {
          switch (cond.operator) {
            case 'equals': return itVal === cond.value;
            case 'not equals': return itVal !== cond.value;
            case 'contains': return (itVal || '').toLowerCase().includes((cond.value || '').toLowerCase());
            case 'does not contain': return !(itVal || '').toLowerCase().includes((cond.value || '').toLowerCase());
            case 'greater than': return Number(itVal) > Number(cond.value);
            case 'greater than or equal to': return Number(itVal) >= Number(cond.value);
            case 'smaller than': return Number(itVal) < Number(cond.value);
            case 'smaller than or equal to': return Number(itVal) <= Number(cond.value);
            case 'is null': return itVal == null || itVal === '';
            case 'is not null': return itVal != null && itVal !== '';
            default: return false;
          }
        });
      } else {
        // Not a loop field
        switch (cond.operator) {
          case 'equals': return val === cond.value;
          case 'not equals': return val !== cond.value;
          case 'contains': return (val || '').toLowerCase().includes((cond.value || '').toLowerCase());
          case 'does not contain': return !(val || '').toLowerCase().includes((cond.value || '').toLowerCase());
          case 'greater than': return Number(val) > Number(cond.value);
          case 'greater than or equal to': return Number(val) >= Number(cond.value);
          case 'smaller than': return Number(val) < Number(cond.value);
          case 'smaller than or equal to': return Number(val) <= Number(cond.value);
          case 'is null': return val == null || val === '';
          case 'is not null': return val != null && val !== '';
          default: return false;
        }
      }
    });

    // Logic handling (unchanged)
    if (condition.logic === 'Custom' && condition.logicExpression) {
      let expr = condition.logicExpression;
      condBools.forEach((v, idx) => {
        expr = expr.replace(new RegExp(`\\b${idx + 1}\\b`, 'g'), v ? 'true' : 'false');
      });
      try {
        expr = expr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||').replace(/[^truefals()&|! ]/gi, '');
        // eslint-disable-next-line no-eval
        return eval(expr);
      } catch { return false; }
    }
    if (condition.logic === 'OR') return condBools.some(Boolean);
    return condBools.every(Boolean);
  };



  const getVisiblePages = (formValues) => {
    let visiblePages = [...pages];
    // Hide logic
    formConditions.filter(c => c.type === 'skip_hide_page' && c.thenAction === 'hide').forEach(condition => {
      if (evaluateCondition(condition, formValues)) {
        (condition.targetPage || []).forEach(pid => {
          visiblePages = visiblePages.filter(pageArr =>
            pageArr[0]?.Page_Number__c
              ? `page_${pageArr[0].Page_Number__c}` !== pid
              : true
          );
        });
      }
    });
    // "Loop" handled in navigation logic below
    return visiblePages;
  };
  
  const getFieldAllowedOptions = (fieldId, formValues) => {
    let allowed = null;
    formConditions.filter(c => c.type === 'dependent' && (localIdToSFId[c.dependentField] || c.dependentField) === fieldId).forEach(cond => {
      const sourceFieldId = localIdToSFId[cond.ifField] || cond.ifField;
      const sourceValue = formValues[sourceFieldId];
      if (sourceValue === cond.value || (Array.isArray(cond.value) && cond.value.includes(sourceValue))) {
        allowed = Array.isArray(cond.dependentValues) ? cond.dependentValues : [];
      }
    });
    return allowed;
  };


  const getFieldUiState = (fieldId, formValues) => {
    let state = { hidden: false, required: false, mask: null, disabled: false };
    formConditions.forEach(c => {
      if (c.type === 'show_hide' && c.thenFields?.includes(fieldId)) {
        if (evaluateCondition(c, formValues)) {
          if (c.thenAction === 'show') state.hidden = false;
          if (c.thenAction === 'hide') state.hidden = true;
        }
      }
      if (c.type === 'enable_require_mask' && c.thenFields?.includes(fieldId)) {
        if (evaluateCondition(c, formValues)) {
          if (c.thenAction === 'require') state.required = true;
          if (c.thenAction === "don't require") state.required = false;
          if (c.thenAction === 'set mask') state.mask = c.maskPattern;
          if (c.thenAction === 'unmask') state.mask = null;
          if (c.thenAction === 'enable') state.disabled = false;
          if (c.thenAction === 'disable') state.disabled = true;
        }
      }
    });
    return state;
  };
  const getNextPageIndex = (currentIdx, formValues) => {
  // Evaluate for "skip to"
  let idx = currentIdx;
  // NOTE: skip conditions ONLY apply on current page
  const skipConditions = formConditions
    .filter(c => c.type === 'skip_hide_page' && c.sourcePage === `page_${pages[currentIdx][0].Page_Number__c}` && c.thenAction === 'skip to');
  for (const cond of skipConditions) {
    if (evaluateCondition(cond, formValues)) {
      // Find index of the targetPage
      const targetIdx = pages.findIndex(
        arr => `page_${arr[0].Page_Number__c}` === cond.targetPage[0]
      );
      if (targetIdx !== -1) return targetIdx;
    }
  }
  // Normal next, just +1 for visible pages
  const visible = getVisiblePages(formValues);
    const myId = `page_${pages[currentIdx][0].Page_Number__c}`;
    const idxInVisible = visible.findIndex(arr => `page_${arr[0].Page_Number__c}` === myId);
    if (idxInVisible !== -1 && idxInVisible < visible.length - 1) {
      const nextPageId = `page_${visible[idxInVisible + 1][0].Page_Number__c}`;
      return pages.findIndex(arr => `page_${arr[0].Page_Number__c}` === nextPageId);
    }
    return currentIdx; // stay if at end
  };
  const getPrevPageIndex = (currentIdx, formValues) => {
    // Always allow "back" unless already on first page
    const visible = getVisiblePages(formValues);
    const myId = `page_${pages[currentIdx][0].Page_Number__c}`;
    const idxInVisible = visible.findIndex(arr => `page_${arr[0].Page_Number__c}` === myId);
    if (idxInVisible > 0) {
      const prevPageId = `page_${visible[idxInVisible - 1][0].Page_Number__c}`;
      return pages.findIndex(arr => `page_${arr[0].Page_Number__c}` === prevPageId);
    }
    return currentIdx;
  };

  useEffect(() => {
    const currentPageArr = pages[currentPage];
    const currentPageId = `page_${currentPageArr?.[0]?.Page_Number__c}`;
    const loopCond = getLoopConditionForPage(currentPageArr, formValues);
    const isLoopPage = !!loopCond;

    if (isLoopPage) {
      let n = 1;
      if (loopCond.loopType === 'field' && loopCond.loopField && formValues[localIdToSFId[loopCond.loopField]]) {
        n = Number(formValues[localIdToSFId[loopCond.loopField]]) || 1;
        n = Math.max(1, n);
      } else if (loopCond.loopType === 'static' && loopCond.loopValue) {
        n = Number(loopCond.loopValue) || 1;
        n = Math.max(1, n);
      }
      // Only update if count changed or never set (so unintentionally navigating doesn't reset progress)
      if (
        !loopCounters[currentPageId] ||
        loopCounters[currentPageId].count !== n ||
        !loopCounters[currentPageId].set
      ) {
        setLoopCounters(lc => ({
          ...lc,
          [currentPageId]: { count: n, index: 0, answers: [], set: true }
        }));
      }
    }
  // eslint-disable-next-line
  }, [currentPage, pages, formValues]);


  // Remove formValues for hidden pages/fields
  useEffect(() => {
    // When currentPage/formValues changes
    const visible = getVisiblePages(formValues);
    const visiblePageIds = new Set(visible.map(arr => `page_${arr[0].Page_Number__c}`));
    // Remove answers to hidden pages
    const toRemove = [];
    pages.forEach(pageArr => {
      const pid = `page_${pageArr[0].Page_Number__c}`;
      if (!visiblePageIds.has(pid)) {
        pageArr.forEach(field => toRemove.push(field.Id || field.id));
      }
    });
    
  }, [currentPage, formConditions]);

  const getLoopConditionForPage = (pageArr, values) => {
    if(!pageArr) return null;
    const pageId = `page_${pageArr[0]?.Page_Number__c}`;
    const cond = formConditions.find(
      c => c.type === 'skip_hide_page' && c.thenAction === 'loop'
        && (Array.isArray(c.targetPage) ? c.targetPage.includes(pageId) : c.targetPage === pageId)
    );
    if (cond && evaluateCondition(cond, values)) return cond;
    return null;
  };

  const handleNextPage = (e) => {
    e.preventDefault();
    if (!formData) return;

    const currentFields = pages[currentPage] || [];
    const newErrors = {};

    // Validate current iteration or page fields
    currentFields.forEach((field) => {
      const fieldId = (typeof field.Properties__c === 'string' ? JSON.parse(field.Properties__c || '{}').id : field.Properties__c?.id) || field.Id;
      const currentState = getFieldUiState(fieldId, formValues);
      const properties = typeof field.Properties__c === "string" ? JSON.parse(field.Properties__c || "{}") : (field.Properties__c || {});
      if (field.Field_Type__c === "section" && properties.subFields) {
        if (properties.subFields.leftField) {
          const leftError = validateSingleField(
            properties.subFields.leftField,
            formValues[properties.subFields.leftField.id],
            formValues, {signaturesObj: signatures, uiState: { [fieldId]: currentState }}
          );
          if (leftError) newErrors[properties.subFields.leftField.id] = leftError;
        }
        if (properties.subFields.rightField) {
          const rightError = validateSingleField(
            properties.subFields.rightField,
            formValues[properties.subFields.rightField.id],
            formValues, {signaturesObj: signatures, uiState: { [fieldId]: currentState }}
          );
          if (rightError) newErrors[properties.subFields.rightField.id] = rightError;
        }
      } else {
        const error = validateSingleField(field, formValues[field.Id || properties.id], formValues, {signaturesObj: signatures, uiState: { [fieldId]: currentState }});
        if (error) newErrors[field.Id || properties.id] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return newErrors;
    } else {
      // Clear errors for current fields
      setErrors((prev) => {
        const updatedErrors = { ...prev };
        currentFields.forEach((field) => {
          const properties = typeof field.Properties__c === "string" ? JSON.parse(field.Properties__c || "{}") : (field.Properties__c || {});
          if (updatedErrors[field.Id || properties.id]) delete updatedErrors[field.Id || properties.id];
        });
        return updatedErrors;
      });

      if (isLoopPage) {
        // Save answers for this loop instance
        const pageFields = (pages[currentPage] || []).map(f => f.Id || (f.Properties__c && JSON.parse(f.Properties__c||'{}').id));
        // Save current iteration answers including subfields
        const loopValues = {};
        pageFields.forEach(f => {
          loopValues[f] = formValues[f];
          Object.keys(formValues).forEach(key => {
            if (key.startsWith(`${f}_`)) {
              loopValues[key] = formValues[key];
            }
          });
        });

        // Update answers array with current iteration
        const newAnswers = [...currentLoopState.answers];
        newAnswers[currentLoopState.index] = { ...loopValues };

        // If not last iteration, move to next iteration
        if (currentLoopState.index < currentLoopState.count - 1) {
          // Move to next round of this page
          setLoopCounters(lc => ({
            ...lc,
            [currentPageId]: {
              ...currentLoopState,
              index: currentLoopState.index + 1,
              answers: newAnswers
            }
          }));
          // Load next iteration answers into formValues or clear if none saved
          setFormValues(prevFormValues => {
            
            const nextIterationVals = newAnswers[currentLoopState.index + 1] || {};
            const pageFields = (pages[currentPage] || []).map(f => f.Id || (f.Properties__c && JSON.parse(f.Properties__c||'{}').id));
            const updatedFormValues = { ...prevFormValues };
            
            // Clear the loop page fields and their subfields in formValues
            pageFields.forEach(f => {
              delete updatedFormValues[f];
              Object.keys(updatedFormValues).forEach(key => {
                if (key.startsWith(`${f}_`)) delete updatedFormValues[key];
              });
            });
            
            // Overwrite with next iteration values
            Object.assign(updatedFormValues, nextIterationVals);
            
            return updatedFormValues;
          });

          return;
        } else {
          // On last iteration, update answers
          setLoopCounters(lc => ({
            ...lc,
            [currentPageId]: { ...currentLoopState, answers: newAnswers }
          }));

          // Save loop answers array in formValues with cleanup of individual loop fields
          setFormValues(vals => {
            const cleanedVals = { ...vals };
            pageFields.forEach(f => {
              delete cleanedVals[f];
              Object.keys(cleanedVals).forEach(key => {
                if (key.startsWith(`${f}_`)) delete cleanedVals[key];
              });
            });
            cleanedVals[`${currentPageId}_loop`] = newAnswers;
            return cleanedVals;
          });

          // Proceed to next page below
        }
      }

      const nextIdx = getNextPageIndex(currentPage, formValues);
      if (nextIdx !== currentPage) {
        setCurrentPage(nextIdx);
      } else if (currentPage < pages.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    }
  };

  const handlePreviousPage = () => {
    if (isLoopPage && currentLoopState.index > 0) {
      // Save current iteration answers before going back
      const pageFields = (pages[currentPage] || []).map(f => f.Id || (f.Properties__c && JSON.parse(f.Properties__c||'{}').id));
      const loopValues = {};
      pageFields.forEach(f => {
        loopValues[f] = formValues[f];
        Object.keys(formValues).forEach(key => {
          if (key.startsWith(`${f}_`)) {
            loopValues[key] = formValues[key];
          }
        });
      });
      const newAnswers = [...currentLoopState.answers];
      newAnswers[currentLoopState.index] = { ...loopValues };

      // Move to previous iteration and load
      setLoopCounters(lc => ({
        ...lc,
        [currentPageId]: {
          ...currentLoopState,
          index: currentLoopState.index - 1,
          answers: newAnswers
        }
      }));

      // Load previous iteration answers (or empty)
      setFormValues(prevFormValues => {
        const prevIterationVals = newAnswers[currentLoopState.index - 1] || {};
        const pageFields = (pages[currentPage] || []).map(f => f.Id || (f.Properties__c && JSON.parse(f.Properties__c||'{}').id));
        const updatedFormValues = { ...prevFormValues };
        
        // Clear the loop page fields and their subfields in formValues
        pageFields.forEach(f => {
          delete updatedFormValues[f];
          Object.keys(updatedFormValues).forEach(key => {
            if (key.startsWith(`${f}_`)) delete updatedFormValues[key];
          });
        });
        
        // Overwrite with previous iteration values
        Object.assign(updatedFormValues, prevIterationVals);
        
        return updatedFormValues;
      });

    } else {
      // Normal page back, save current iteration first if loop page
      if (isLoopPage) {
        const pageFields = (pages[currentPage] || []).map(f => f.Id || (f.Properties__c && JSON.parse(f.Properties__c||'{}').id));
        const loopValues = {};
        pageFields.forEach(f => {
          loopValues[f] = formValues[f];
          Object.keys(formValues).forEach(key => {
            if (key.startsWith(`${f}_`)) {
              loopValues[key] = formValues[key];
            }
          });
        });
        const newAnswers = [...currentLoopState.answers];
        newAnswers[currentLoopState.index] = { ...loopValues };
        setLoopCounters(lc => ({
          ...lc,
          [currentPageId]: { ...currentLoopState, answers: newAnswers }
        }));
      }

      const prevIdx = getPrevPageIndex(currentPage, formValues);
      if (prevIdx !== currentPage) {
        setCurrentPage(prevIdx);
        // Load first iteration answers of that new page if loop page
        const newPageId = `page_${pages[prevIdx]?.[0]?.Page_Number__c}`;
        const newLoopState = loopCounters[newPageId];
        if (newLoopState && newLoopState.count > 0) {
          setFormValues(prevFormValues => {
            const iterationVals = newLoopState.answers[newLoopState.index] || {};
            const pageFields = (pages[prevIdx] || []).map(f => f.Id || (f.Properties__c && JSON.parse(f.Properties__c||'{}').id));
            const updatedFormValues = { ...prevFormValues };

            // Clear the loop page fields and their subfields in formValues
            pageFields.forEach(f => {
              delete updatedFormValues[f];
              Object.keys(updatedFormValues).forEach(key => {
                if (key.startsWith(`${f}_`)) delete updatedFormValues[key];
              });
            });

            // Merge in the iteration's answers
            Object.assign(updatedFormValues, iterationVals);

            return updatedFormValues;
          });

        }
      }
    }
  };

  if (fetchError) {
    return <div className="text-red-500 text-center p-4" role="alert">{fetchError}</div>;
  }

  if (!formData) {
    return <div className="text-center p-4">Loading form...</div>;
  }

  const currentPageId = `page_${pages[currentPage]?.[0]?.Page_Number__c}`;
  const loopCond = getLoopConditionForPage(pages[currentPage], formValues);
  const isLoopPage = !!loopCond;

  let currentLoopState = loopCounters[currentPageId] || { count: 1, index: 0, answers: [] };
  const inLoop = isLoopPage && currentLoopState.count > 0;
  function convertUserMaskToInputMask(mask) {
    if (!mask) return '';
    return mask
      .replace(/@/g, 'a')
      .replace(/#/g, '9')
      // '*' stays the same
      ;
  }
  const renderField = (field) => {
    const properties = JSON.parse(field.Properties__c || '{}');
    const state = getFieldUiState(properties.id || field.Id || field.id, formValues);
    const isHidden = state.hidden || properties.isHidden;
    if (isHidden) return null;
    const fieldId = field.Id || properties.id;
    const fieldType = field.Field_Type__c;
    const fieldLabel = properties.label || field.Name;
    const isDisabled = properties.isDisabled || state.disabled || false;
    const isRequired = properties.isRequired || state.required;
    const hasError = !!errors[fieldId];
    const helpText = properties.showHelpText ? properties.helpText : null;
    const labelAlignment = properties.labelAlignment || 'top';
    const inputMask = state.mask || properties.maskPattern || null;
    const mask = convertUserMaskToInputMask(inputMask);

    const commonProps = {
      id: fieldId,
      disabled: isDisabled,
      'aria-required': isRequired,
      'aria-describedby': hasError ? `${fieldId}-error` : undefined,
      className: `w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-gray-300'}`,
    };

    const labelAlignmentClass =
    labelAlignment === 'center'
      ? 'text-center'
      : labelAlignment === 'right'
      ? 'text-right'
      : 'text-left';
    const labelClass = `block text-sm font-medium mb-1 ${labelAlignmentClass} ${hasError ? 'text-red-600' : 'text-gray-700'}`;

    const renderLabel = () => (
      <label htmlFor={fieldId} className={labelClass}>
        {fieldLabel}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
    );

    const renderError = () => (
      hasError && (
        <p id={`${fieldId}-error`} className="text-red-500 text-sm mt-1" role="alert">
          {errors[fieldId]}
        </p>
      )
    );

    const renderHelpText = () => (
      helpText && (
        <p className="text-gray-500 text-sm mt-1">{helpText}</p>
      )
    );

    switch (fieldType) {
      case 'shorttext':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            {mask ? (
              <>
                <InputMask
                  mask={mask}
                  value={formValues[fieldId] || ''}
                  onChange={(e) => handleChange(fieldId, e.target.value)}
                  onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                  placeholder={properties.placeholder?.main || ''}
                  disabled={isDisabled}
                  maskPlaceholder=" "
                >
                  {(inputProps) => (
                    <input
                      type="text"
                      {...commonProps}
                      {...inputProps}
                      maxLength={properties.shortTextMaxChars}
                      disabled={isDisabled}
                    />
                  )}
                </InputMask>
                <small className="text-gray-500 mt-1 block">Enter in the format: {mask}</small>
              </>
            ) : (
              <input
                type="text"
                {...commonProps}
                value={formValues[fieldId] || ''}
                onChange={(e) => handleChange(fieldId, e.target.value)}
                onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                placeholder={properties.placeholder?.main || ''}
                maxLength={properties.shortTextMaxChars}
                disabled={isDisabled}
              />
            )}
            {renderError()}
          </div>
        );


      case 'longtext':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            {mask ? (
              <>
                <InputMask
                  mask={mask}
                  value={formValues[fieldId] || ''}
                  onChange={(e) => handleChange(fieldId, e.target.value)}
                  onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                  placeholder={properties.placeholder?.main || ''}
                  disabled={isDisabled}
                  maskPlaceholder=" "
                >
                  {(inputProps) => (
                    <input
                      type="text"  // use text input for masked longtext
                      {...commonProps}
                      {...inputProps}
                      disabled={isDisabled}
                      maxLength={properties.longTextMaxChars}
                      style={{ minHeight: '4rem' }} // optional, keeps textarea height similar
                    />
                  )}
                </InputMask>
                <small className="text-gray-500 mt-1 block">Enter in the format: {mask}</small>
              </>
            ) : properties.isRichText ? (
              <ReactQuill
                theme="snow"
                value={formValues[fieldId] || ''}
                onChange={(value) => handleChange(fieldId, value)}
                onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                readOnly={isDisabled}
                placeholder={properties.placeholder?.main || ''}
                modules={{
                  toolbar: isDisabled
                    ? false
                    : [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ header: 1 }, { header: 2 }],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        [{ script: 'sub' }, { script: 'super' }],
                        [{ indent: '-1' }, { indent: '+1' }],
                        [{ direction: 'rtl' }],
                        [{ size: ['small', false, 'large', 'huge'] }],
                        [{ header: [1, 2, 3, 4, 5, 6, false] }],
                        [{ color: [] }, { background: [] }],
                        [{ font: [] }],
                        [{ align: [] }],
                        ['clean'],
                      ],
                }}
              />
            ) : (
              <textarea
                {...commonProps}
                rows="4"
                value={formValues[fieldId] || ''}
                onChange={(e) => handleChange(fieldId, e.target.value)}
                onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                placeholder={properties.placeholder?.main || ''}
                maxLength={properties.longTextMaxChars}
                disabled={isDisabled}
              />
            )}

            {renderError()}
          </div>
        );

      case 'number':
        if (isHidden) return null;
        const containerClass =
        labelAlignment === 'center'
          ? 'text-center'
          : labelAlignment === 'right'
          ? 'text-right'
          : 'text-left';
        return (
          <div className={`mb-4 ${containerClass}`}>
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            {mask ? (
              <>
                <InputMask
                  mask={mask}
                  value={formValues[fieldId] || ''}
                  onChange={(e) => handleChange(fieldId, e.target.value)}
                  onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                  placeholder={properties.placeholder?.main || ''}
                  disabled={isDisabled}
                  maskPlaceholder=" "
                >
                  {(inputProps) => (
                    <input
                      type="text" // force text input for masked number field
                      {...commonProps}
                      {...inputProps}
                      min={properties.numberValueLimits?.min}
                      max={properties.numberValueLimits?.max}
                      disabled={isDisabled}
                    />
                  )}
                </InputMask>
                <small className="text-gray-500 mt-1 block">Enter in the format: {mask}</small>
              </>
            ) : (
              <input
                type="number"
                {...commonProps}
                value={formValues[fieldId] || ''}
                onChange={(e) => handleChange(fieldId, e.target.value)}
                onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                placeholder={properties.placeholder?.main || ''}
                min={properties.numberValueLimits?.min}
                max={properties.numberValueLimits?.max}
                disabled={isDisabled}
              />
            )}

            {renderError()}
          </div>
        );

      case 'price':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-700">{properties.currencyType || 'USD'}</span>
              {mask ? (
                <>
                  <InputMask
                    mask={mask}
                    value={formValues[fieldId] || ''}
                    onChange={(e) => handleChange(fieldId, e.target.value)}
                    onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                    placeholder={properties.placeholder?.main || ''}
                    disabled={isDisabled}
                    maskPlaceholder=" "
                  >
                    {(inputProps) => (
                      <input
                        type="text" // force text input for masked field
                        {...commonProps}
                        {...inputProps}
                        step="0.01"
                        min={properties.priceLimits?.min}
                        max={properties.priceLimits?.max}
                        disabled={isDisabled}
                      />
                    )}
                  </InputMask>
                  <small className="text-gray-500 mt-1 block">Enter in the format: {mask}</small>
                </>
              ) : (
                <input
                  type="number"
                  {...commonProps}
                  step="0.01"
                  value={formValues[fieldId] || ''}
                  onChange={(e) => handleChange(fieldId, e.target.value)}
                  onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                  placeholder={properties.placeholder?.main || ''}
                  min={properties.priceLimits?.min}
                  max={properties.priceLimits?.max}
                  disabled={isDisabled}
                />
              )}

            </div>
            {renderError()}
          </div>
        );

      case 'email':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <input
              type="email"
              {...commonProps}
              value={formValues[fieldId] || ''}
              onChange={(e) => handleChange(fieldId, e.target.value)}
              onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
              placeholder={properties.placeholder?.main || 'example@domain.com'}
              maxLength={properties.maxChars}
              disabled={isDisabled}
            />
            {properties.enableConfirmation && (
              <div className="mt-2">
                <label htmlFor={`${fieldId}_confirmation`} className={labelClass}>
                  Confirm Email
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type="email"
                  {...commonProps}
                  id={`${fieldId}_confirmation`}
                  value={formValues[`${fieldId}_confirmation`] || ''}
                  onChange={(e) => handleChange(`${fieldId}_confirmation`, e.target.value)}
                  onBlur={() => dependentFields.has(`${fieldId}_confirmation`) && runPrefillForField(`${fieldId}_confirmation`)}
                  placeholder="Confirm email"
                />
                {errors[`${fieldId}_confirmation`] && (
                  <p id={`${fieldId}_confirmation-error`} className="text-red-500 text-sm mt-1" role="alert">
                    {errors[`${fieldId}_confirmation`]}
                  </p>
                )}
              </div>
            )}
            {renderError()}
          </div>
        );

      case 'phone':
        if (isHidden) return null;
        const countryCode = formValues[`${fieldId}_countryCode`] || properties.subFields?.countryCode?.value || 'US';
        let phoneMask = '(999) 999-9999'; // Default mask for non-country code case
        try {
          const exampleNumber = getExampleNumber(countryCode);
          if (exampleNumber) {
            phoneMask = exampleNumber.format('NATIONAL').replace(/[0-9]/g, '9');
          }
        } catch (error) {
          console.warn(`No example number for country ${countryCode}, using default mask`);
        }

        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            {properties.subFields?.countryCode?.enabled ? (
              <div className="flex items-center gap-3">
                <div className="w-1/3">
                  <PhoneInput
                    country={countryCode.toLowerCase()}
                    value={formValues[`${fieldId}_countryCode`] || 'US'}
                    onChange={(phone, countryData) => {
                      const newCountryCode = countryData.countryCode.toUpperCase();
                      handleChange(`${fieldId}_countryCode`, newCountryCode);
                      handleChange(fieldId, ''); // Reset phone number
                    }}
                    onBlur={() => dependentFields.has(`${fieldId}_countryCode`) && runPrefillForField(`${fieldId}_countryCode`)}
                    inputClass={`p-2 border rounded text-sm w-full ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                    buttonClass="border rounded p-1 bg-white"
                    dropdownClass="border rounded max-h-64 overflow-y-auto"
                    containerClass="flex items-center w-full"
                    inputProps={{ 'aria-label': 'Country code selector', readOnly: true }}
                    disabled={isDisabled}
                    placeholder=""
                    enableSearch
                    searchPlaceholder="Search country"
                    searchNotFound="No country found"
                    preferredCountries={['us', 'ca', 'gb']}
                  />
                </div>
                <div className="w-2/3">
                  <input
                    type="text"
                    {...commonProps}
                    value={formValues[fieldId] || ''}
                    onChange={(e) => handleChange(fieldId, e.target.value)}
                    onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                    placeholder={properties.subFields?.phoneNumber?.placeholder || 'Enter phone number'}
                    disabled={isDisabled}
                    aria-label="Phone number"
                  />
                </div>
              </div>
            ) : mask ? (
              <InputMask
                mask={properties.subFields?.phoneNumber?.phoneMask || phoneMask}
                value={formValues[fieldId] || ''}
                onChange={(e) => handleChange(fieldId, e.target.value)}
                onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={properties.subFields?.phoneNumber?.placeholder || 'Enter phone number'}
                disabled={isDisabled}
              />
            ): (
                <input
                  type="text"
                  {...commonProps}
                  value={formValues[fieldId] || ''}
                  onChange={(e) => handleChange(fieldId, e.target.value)}
                  onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                  placeholder={properties.subFields?.phoneNumber?.placeholder || 'Enter phone number'}
                  disabled={isDisabled}
                />
              )
            }
            {renderError()}
          </div>
        );

      case 'date':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <DatePicker
              format={properties.dateFormat?.replace(/\//g, properties.dateSeparator || '-') || 'yyyy-MM-dd'}
              value={formValues[fieldId] ? new Date(formValues[fieldId] + 'T00:00:00') : null}
              onChange={(date) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;
                  handleChange(fieldId, formattedDate);
                } else {
                  handleChange(fieldId, null);
                }
              }}
              onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
              placeholder={properties.placeholder?.main || 'Select date'}
              className="w-full"
              disabled={isDisabled}
              isoWeek={properties.weekStartDay === 'Monday'}
              locale={{
                months: properties.customMonthLabels || [
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ],
                today: properties.customTodayLabel || 'Today',
              }}
              disabledDate={(date) => {
                if (properties.disabledDates?.includes(date.toISOString().split('T')[0])) return true;
                if (properties.dateRange?.start && date < new Date(properties.dateRange.start)) return true;
                if (properties.dateRange?.end && date > new Date(properties.dateRange.end)) return true;
                if (properties.enableAgeVerification) {
                  const today = new Date();
                  const birthDate = new Date(date);
                  let age = today.getFullYear() - birthDate.getFullYear();
                  const m = today.getMonth() - birthDate.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                  }
                  return age < properties.minAge;
                }
                return false;
              }}
            />
            {renderError()}
          </div>
        );

      case 'datetime':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <DatePicker
              format={
                properties.dateFormat && properties.timeFormat
                  ? `${properties.dateFormat.replace(/\//g, properties.dateSeparator || '-') } ${properties.timeFormat === 'hh:mm a' ? 'hh:mm a' : 'HH:mm'}`
                  : 'yyyy-MM-dd HH:mm'
              }
              value={formValues[fieldId] ? new Date(formValues[fieldId]) : null}
              onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
              onChange={(date) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  let hours = date.getHours();
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  if (properties.timeFormat === 'hh:mm a') {
                    const hours12 = date.getHours() % 12 || 12;
                    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
                    hours = ampm === 'PM' ? (hours12 === 12 ? 12 : hours12 + 12) : (hours12 === 12 ? 0 : hours12);
                  }
                  const formattedHours = String(hours).padStart(2, '0');
                  const formattedDateTime = `${year}-${month}-${day} ${formattedHours}:${minutes}`;
                  handleChange(fieldId, formattedDateTime);
                } else {
                  handleChange(fieldId, null);
                }
              }}
              placeholder={properties.placeholder?.main || 'Select date and time'}
              className="w-full"
              disabled={isDisabled}
              showMeridian={properties.timeFormat === 'hh:mm a'}
            />
            {renderError()}
          </div>
        );

      case 'time':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <DatePicker
              format={properties.timeFormat || 'HH:mm'}
              value={formValues[fieldId] ? new Date(`1970-01-01T${formValues[fieldId]}`) : null}
              onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
              onChange={(date) => {
                if (date) {
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  const time = `${hours}:${minutes}`;
                  handleChange(fieldId, time);
                } else {
                  handleChange(fieldId, '');
                }
              }}
              placeholder={properties.placeholder?.main || 'Select time'}
              className="w-full"
              disabled={isDisabled}
              showMeridian={properties.timeFormat === 'hh:mm a'}
              disabledTime={(date) => {
                if (!properties.restrictAmPm) return {};
                const hours = date.getHours();
                if (properties.restrictAmPm === 'AM' && hours >= 12) return { hour: true };
                if (properties.restrictAmPm === 'PM' && hours < 12) return { hour: true };
                return {};
              }}
            />
            {renderError()}
          </div>
        );

      case 'checkbox':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            <label className={labelClass}>
              {fieldLabel}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {(properties.options || ['Option 1', 'Option 2']).map((option, idx) => (
                <div key={idx} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`${fieldId}-${idx}`}
                    checked={Array.isArray(formValues[fieldId]) && formValues[fieldId].includes(option)}
                    onChange={(e) => {
                      const newValue = e.target.checked
                        ? [...(formValues[fieldId] || []), option]
                        : (formValues[fieldId] || []).filter((opt) => opt !== option);
                      handleChange(fieldId, newValue);
                    }}
                    onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isDisabled}
                  />
                  <label htmlFor={`${fieldId}-${idx}`} className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {renderError()}
          </div>
        );

      case 'radio':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            <label className={labelClass}>
              {fieldLabel}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {(properties.options || ['Option 1', 'Option 2', 'Option 3']).map((option, idx) => (
                <div key={idx} className="flex items-center">
                  <input
                    type="radio"
                    id={`${fieldId}-${idx}`}
                    name={fieldId}
                    value={option}
                    checked={formValues[fieldId] === option}
                    onChange={(e) => handleChange(fieldId, e.target.value)}
                    onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    disabled={isDisabled}
                  />
                  <label htmlFor={`${fieldId}-${idx}`} className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {renderError()}
          </div>
        );

      case 'dropdown':
        const allowedOptions = getFieldAllowedOptions(fieldId, formValues);
        const fieldOptions = allowedOptions || (properties.options || []);
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <Select
              style={{ width: '100%' }}
              value={formValues[fieldId] || undefined}
              onChange={val => handleChange(fieldId, val)}
              onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
              mode={properties.allowMultipleSelections ? 'multiple' : undefined}
              placeholder={properties.placeholder?.main || 'Select an option'}
              disabled={isDisabled}
              className={`w-full ${hasError ? 'border-red-500' : 'border-gray-300'}`}
            >
              {fieldOptions.map((option, idx) => (
                <Option key={option} value={option}>{option}</Option>
              ))}
            </Select>
            {renderError()}
          </div>
        );

      case 'fileupload':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <input
              type="file"
              {...commonProps}
              onChange={(e) => handleFileChange(fieldId, e, 'fileupload')}
              accept={properties.allowedFileTypes || 'image/*,application/pdf,.doc,.docx'}
              multiple={properties.multipleFiles}
            />
            {filePreviews[fieldId] && (
              <div className="mt-2">
                <img src={filePreviews[fieldId]} alt="Preview" className="max-h-32" onError={(e) => (e.target.style.display = 'none')} />
              </div>
            )}
            {properties.maxFileSize && (
              <p className="text-gray-500 text-sm mt-1">Max file size: {properties.maxFileSize}MB</p>
            )}
            {properties.allowedFileTypes && (
              <p className="text-gray-500 text-sm mt-1">Allowed types: {properties.allowedFileTypes}</p>
            )}
            {renderError()}
          </div>
        );

      case 'imageuploader':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <div className="relative w-1/2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id={`file-upload-${fieldId}`}
                onChange={(e) => handleFileChange(fieldId, e, 'imageuploader')}
                disabled={isDisabled}
              />
              <label
                htmlFor={`file-upload-${fieldId}`}
                className={`block h-32 text-sm p-2 border rounded bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-50' : ''} ${hasError ? 'border-red-500' : 'border-gray-300'}`}
              >
                {filePreviews[fieldId] ? (
                  <img src={filePreviews[fieldId]} alt="Preview" className="max-h-full max-w-full" />
                ) : (
                  'Click to Upload Image'
                )}
              </label>
            </div>
            {renderError()}
          </div>
        );

      case 'toggle':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            <div className="flex items-center">
              <label className={labelClass} style={{ marginBottom: 0 }}>
                {fieldLabel}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              <label className="inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={toggles[fieldId] || false}
                  onChange={(e) => handleToggleChange(fieldId, e.target.checked)}
                  onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                  className="sr-only peer"
                  disabled={isDisabled}
                />
                <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${toggles[fieldId] ? 'peer-checked:bg-blue-600' : ''}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${toggles[fieldId] ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>
            {renderError()}
          </div>
        );

      case 'fullname':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <div className="flex gap-3">
              {properties.subFields?.salutation?.enabled && (
                <Select
                  style={{ width: '33%' }}
                  value={formValues[`${fieldId}_salutation`] || properties.subFields.salutation.placeholder}
                  onChange={(value) => handleChange(`${fieldId}_salutation`, value)}
                  onBlur={() => dependentFields.has(`${fieldId}_salutation`) && runPrefillForField(`${fieldId}_salutation`)}
                  disabled={isDisabled}
                  className="w-1/5"
                  placeholder={properties.subFields.salutation.placeholder || 'Select'}
                  options={(properties.subFields.salutation.options || []).map((option) => ({
                    label: option,
                    value: option,
                  }))}
                />
              )}
              <input
                type="text"
                className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                value={formValues[`${fieldId}_firstName`] || ''}
                onChange={(e) => handleChange(`${fieldId}_firstName`, e.target.value)}
                onBlur={() => dependentFields.has(`${fieldId}_firstName`) && runPrefillForField(`${fieldId}_firstName`)}
                placeholder={properties.subFields.firstName?.placeholder || 'First Name'}
                disabled={isDisabled}
              />
              <input
                type="text"
                className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                value={formValues[`${fieldId}_lastName`] || ''}
                onChange={(e) => handleChange(`${fieldId}_lastName`, e.target.value)}
                onBlur={() => dependentFields.has(`${fieldId}_lastName`) && runPrefillForField(`${fieldId}_lastName`)}
                placeholder={properties.subFields.lastName?.placeholder || 'Last Name'}
                disabled={isDisabled}
              />
            </div>
            {renderError()}
          </div>
        );

      case 'address':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <div className="space-y-3">
              {properties.subFields?.street?.visiblesubFields !== false && (
                <div>
                  <label className="text-xs text-gray-500">{properties.subLabels?.street || 'Street Address'}</label>
                  <input
                    type="text"
                    className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                    value={formValues[`${fieldId}_street`] || ''}
                    onChange={(e) => handleChange(`${fieldId}_street`, e.target.value)}
                    onBlur={() => dependentFields.has(`${fieldId}_street`) && runPrefillForField(`${fieldId}_street`)}
                    placeholder={properties.placeholder?.street || 'Street Address'}
                    disabled={isDisabled}
                  />
                </div>
              )}
              <div className="flex gap-3">
                {properties.subFields?.city?.visible !== false && (
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500">{properties.subLabels?.city || 'City'}</label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                      value={formValues[`${fieldId}_city`] || ''}
                      onChange={(e) => handleChange(`${fieldId}_city`, e.target.value)}
                      onBlur={() => dependentFields.has(`${fieldId}_city`) && runPrefillForField(`${fieldId}_city`)}
                      placeholder={properties.placeholder?.city || 'City'}
                      disabled={isDisabled}
                    />
                  </div>
                )}
                {properties.subFields?.city?.visible !== false && (
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500">{properties.subLabels?.state || 'State'}</label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                      value={formValues[`${fieldId}_state`] || ''}
                      onChange={(e) => handleChange(`${fieldId}_state`, e.target.value)}
                      onBlur={() => dependentFields.has(`${fieldId}_state`) && runPrefillForField(`${fieldId}_state`)}
                      placeholder={properties.placeholder?.state || 'State'}
                      disabled={isDisabled}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {properties.subFields?.city?.visible !== false && (
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500">{properties.subLabels?.country || 'Country'}</label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                      value={formValues[`${fieldId}_country`] || ''}
                      onChange={(e) => handleChange(`${fieldId}_country`, e.target.value)}
                      onBlur={() => dependentFields.has(`${fieldId}_country`) && runPrefillForField(`${fieldId}_country`)}
                      placeholder={properties.placeholder?.country || 'Country'}
                      disabled={isDisabled}
                    />
                  </div>
                )}
                {properties.subFields?.city?.visible !== false && (
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500">{properties.subLabels?.postal || 'Postal Code'}</label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                      value={formValues[`${fieldId}_postal`] || ''}
                      onChange={(e) => handleChange(`${fieldId}_postal`, e.target.value)}
                      onBlur={() => dependentFields.has(`${fieldId}_postal`) && runPrefillForField(`${fieldId}_postal`)}
                      placeholder={properties.placeholder?.postal || 'Postal Code'}
                      disabled={isDisabled}
                    />
                  </div>
                )}
              </div>
            </div>
            {renderError()}
          </div>
        );

      case 'signature':
        if (isHidden) return null;
        return (
          <div className="mb-4 flex flex-col items-start">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <SignatureCanvas
              penColor="black"
              canvasProps={{ width: 280, height: 100, className: "border rounded bg-white mb-2" }}
              ref={ref => (signatureRefs.current[fieldId] = ref)}
              onEnd={() => handleSignatureEnd(fieldId, signatureRefs.current[fieldId])}
              backgroundColor="#fff"
            />
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                className="px-2 py-1 text-xs bg-gray-100 rounded"
                onClick={() => {
                  const sig = signatureRefs.current[fieldId];
                  if (sig) {
                    sig.clear();
                    setSignatures((prev) => ({ ...prev, [fieldId]: null }));
                    handleChange(fieldId, null);
                  }
                }}
              >
                Clear
              </button>
            </div>
            {signatures[fieldId] && (
              <img
                src={signatures[fieldId]}
                alt="Signature Preview"
                className="border rounded shadow-sm w-44 h-auto"
              />
            )}
            {renderError()}
          </div>
        );

      case 'terms':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id={fieldId}
                  checked={formValues[fieldId] || false}
                  onChange={(e) => handleChange(fieldId, e.target.checked)}
                  onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isDisabled}
                  aria-required={isRequired}
                />
              </div>
              <div className="ml-3">
                <label htmlFor={fieldId} className={labelClass}>
                  {properties.makeAsLink && properties.termsLinkUrl ? (
                    <a
                      href={properties.termsLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {properties.placeholder?.main || 'I agree to the terms and conditions'}
                    </a>
                  ) : (
                    properties.placeholder?.main || 'I agree to the terms and conditions'
                  )}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
            </div>
            {renderError()}
          </div>
        );

      case 'displaytext':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            <div
              className="text-gray-700"
              dangerouslySetInnerHTML={{
                __html: properties?.value || 'Display Text'
              }}
            />
          </div>
        );

      case 'header':
        if (isHidden) return null;
        return (
          <div className="mb-6">
            <h2 className={`text-2xl font-bold text-gray-800 ${
              properties.alignment === 'left' ? 'text-left' : 
              properties.alignment === 'right' ? 'text-right' : 
              'text-center'
            }`}>
              {properties.heading || 'Form Header'}
            </h2>
          </div>
        );

      case 'rating':
        if (isHidden) return null;
        const ratingRange = properties.ratingRange || 5;
        const ratingOptions = {
          emoji: Array.from({ length: ratingRange }, (_, i) => ({
            value: `emoji${i + 1}`,
            symbol: properties.ratingEmojis?.[i] || ['😞', '🙁', '😐', '🙂', '😀'][i % 5] || '😀',
            label: properties.ratingValues?.[i] || `Rating ${i + 1}`,
          })),
          star: Array.from({ length: ratingRange }, (_, i) => ({
            value: i + 1,
            label: properties.ratingValues?.[i] || `Rating ${i + 1}`,
          })),
          heart: Array.from({ length: ratingRange }, (_, i) => ({
            value: `heart${i + 1}`,
            symbol: '❤️',
            label: properties.ratingValues?.[i] || `Rating ${i + 1}`,
          })),
          bulb: Array.from({ length: ratingRange }, (_, i) => ({
            value: `bulb${i + 1}`,
            symbol: '💡',
            label: properties.ratingValues?.[i] || `Rating ${i + 1}`,
          })),
          lightning: Array.from({ length: ratingRange }, (_, i) => ({
            value: `lightning${i + 1}`,
            symbol: '⚡',
            label: properties.ratingValues?.[i] || `Rating ${i + 1}`,
          })),
        };

        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                {ratingOptions[properties.ratingType || 'emoji'].map((option, idx) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleRatingChange(fieldId, option.value)}
                    onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                    disabled={isDisabled}
                    className={`text-2xl ${selectedRatings[fieldId] === option.value ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-500 focus:outline-none`}
                  >
                    {properties.ratingType === 'star' ? (
                      selectedRatings[fieldId] === option.value ? <AiFillStar /> : <AiOutlineStar />
                    ) : properties.ratingType === 'heart' ? (
                      selectedRatings[fieldId] === option.value ? <AiFillHeart /> : <AiOutlineHeart />
                    ) : properties.ratingType === 'bulb' ? (
                      selectedRatings[fieldId] === option.value ? <FaLightbulb /> : <FaRegLightbulb />
                    ) : properties.ratingType === 'lightning' ? (
                      selectedRatings[fieldId] === option.value ? <FaBolt /> : <FaBolt />
                    ) : (
                      option.symbol
                    )}
                  </button>
                ))}
              </div>
              {selectedRatings[fieldId] && (
                <p className="text-sm text-gray-600">
                  Selected: {ratingOptions[properties.ratingType || 'emoji'].find(o => o.value === selectedRatings[fieldId])?.label}
                </p>
              )}
            </div>
            {renderError()}
          </div>
        );

      case 'scalerating':
      if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 p-2"></th>
                  {properties.columns?.map((col, idx) => (
                    <th key={idx} className="border border-gray-300 p-2 text-center">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {properties.rows?.map((row, rowIdx) => (
                  <tr key={rowIdx} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-300 p-2 font-semibold">{row}</td>
                    {properties.columns.map((col, colIdx) => (
                      <td key={colIdx} className="border border-gray-300 p-2 text-center">
                        <input
                          type="radio"
                          name={`${fieldId}_row_${rowIdx}`}
                          value={col}
                          checked={formValues[fieldId]?.[row] === col}
                          onChange={() => {
                            const newValue = { ...formValues[fieldId], [row]: col };
                            handleChange(fieldId, newValue);
                          }}
                          onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
                          disabled={isDisabled}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {renderError()}
          </div>
        );

      case 'divider':
        if (isHidden) return null;
        return <hr className="border-gray-300 my-4" />;

      case 'formcalculation':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <input
              type="text"
              {...commonProps}
              value={formValues[fieldId] || ''}
              readOnly
              className={`w-full p-2 border rounded-md ${hasError ? 'border-red-500' : 'border-gray-300'}`}
            />
            {renderError()}
          </div>
        );

      case 'link':
        if (isHidden) return null;
        return (
          <div className="mb-4">
            {renderLabel()}
            {helpText && (
              <Tooltip title={helpText}>
                <InfoCircleOutlined className="text-gray-400 cursor-pointer" />
              </Tooltip>
            )}
            <input
              type="url"
              {...commonProps}
              value={formValues[fieldId] || ''}
              onChange={(e) => handleChange(fieldId, e.target.value)}
              onBlur={() => dependentFields.has(fieldId) && runPrefillForField(fieldId)}
              placeholder={properties.placeholder?.main || 'https://example.com'}
            />
            {renderError()}
          </div>
        );

      case 'section':
        if (isHidden) return null;
        
        // Parse the subFields from properties
          const leftFieldProps = properties.subFields?.leftField;
          const rightFieldProps = properties.subFields?.rightField;

          // Find the actual field objects from formData.Fields
          const leftField = formData.Fields.find(f => f.Id === leftFieldProps?.id);
          const rightField = formData.Fields.find(f => f.Id === rightFieldProps?.id);

          const normalizedLeftField = leftField ? { 
            ...leftField, 
            Id: leftField.Id || leftField.id 
          } : null;

          const normalizedRightField = rightField ? { 
            ...rightField, 
            Id: rightField.Id || rightField.id 
          } : null;

        // If fields aren't found in formData.Fields, create mock field objects
        const createFieldFromProps = (fieldProps) => {
          if (!fieldProps) return null;
          return {
            Id: fieldProps.id,
            Field_Type__c: fieldProps.type,
            Properties__c: JSON.stringify(fieldProps),
            // Add other required properties with defaults
            Name: fieldProps.label || '',
            Page_Number__c: field.Page_Number__c, // Use section's page number
            Order_Number__c: field.Order_Number__c, // Use section's order number
            Unique_Key__c: fieldProps.id
          };
        };

        // Force composite IDs for section children so mapping/prefill stays consistent
        const leftFieldToRender = normalizedLeftField
          ? { ...normalizedLeftField, Id: `${field.Id}_leftField` }
          : leftFieldProps
            ? { ...createFieldFromProps(leftFieldProps), Id: `${field.Id}_leftField` }
            : null;

        const rightFieldToRender = normalizedRightField
          ? { ...normalizedRightField, Id: `${field.Id}_rightField` }
          : rightFieldProps
            ? { ...createFieldFromProps(rightFieldProps), Id: `${field.Id}_rightField` }
            : null;


        return (
          <div className="mb-4 border p-4 rounded">
            <h3 className="text-lg font-semibold mb-4">{fieldLabel}</h3>
            <div className="grid grid-cols-2 gap-4">
              {leftFieldToRender && renderField(leftFieldToRender)}
              {rightFieldToRender && renderField(rightFieldToRender)}
            </div>
            {renderError()}
          </div>
        );

      default:
        return null;
    }
  };
  const visiblePages = getVisiblePages(formValues);
  return (
  <div className="max-w-4xl mx-auto mt-8 p-4 bg-white rounded-lg inset-shadow-2xs">
    <h1 className="text-2xl font-bold mb-6 text-gray-800">{formData.Name}</h1>
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Public Form">
      <div className="page">
        {pages[currentPage]?.map((field) => (
          <div key={field.Unique_Key__c}>{renderField(field)}</div>
        ))}
      </div>

      <div className="flex justify-between mt-6">
        {/* Show Previous button only if more than one page */}
        {pages.length > 1 ? (
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={currentPage === 0}
            className={`py-2 px-4 rounded-md font-medium transition ${
              currentPage === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            aria-label="Previous Page"
          >
            Previous
          </button>
        ) : ''}

        <span className="text-gray-600">
          Page {visiblePages.findIndex(arr => arr === pages[currentPage]) + 1} of {visiblePages.length}
        </span>

        {/* Show Next or Submit button */}
        {currentPage < pages.length - 1 ? (
          <button
            type="button"
            onClick={handleNextPage}
            className="py-2 px-4 rounded-md font-medium transition bg-blue-600 text-white hover:bg-blue-700"
            aria-label="Next Page"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting || !accessToken}
            className={`py-2 px-4 rounded-md font-medium transition ${
              isSubmitting || !accessToken
                ? 'opacity-50 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            aria-label="Submit Form"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>
    </form>
  </div>
);

}

export default PublicFormViewer;