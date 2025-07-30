import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MdUndo, MdRedo } from 'react-icons/md';
import { FaRegStar } from 'react-icons/fa';
import { BsStack } from "react-icons/bs";
import { IoIosUndo } from "react-icons/io";
import { Tooltip, Whisper } from 'rsuite';
import useUndo from 'use-undo';
import FormBuilder from './FormBuilder';
import Sidebar from './Sidebar';
import MainMenuBar from './MainMenuBar';
import FieldEditor from './FieldEditor';
import 'rsuite/dist/rsuite.min.css';
import { encrypt } from './crypto';
import MappingFields from '../form-mapping/MappingFields';
import formbuilder from './formbuilder.css';
import { useSalesforceData } from '../Context/MetadataContext';
import ThankYouPageBuilder from '../Thankyou/TY';
import NotificationPage from '../NotificationSettings/NotificationSettingsModal.js';

const themes = [
  {
    name: 'Remove Theme'
  },
  {
    name: 'Classic Blue',
    color: 'bg-blue-600',
    preview: 'bg-gradient-to-r from-blue-500 to-blue-700',
    textColor: 'text-white',
    inputBg: 'bg-white',
    inputText: 'text-blue-900',
    buttonBg: 'bg-gradient-to-r from-blue-500 to-blue-900',
    buttonText: 'text-white',
  },
  {
    name: 'Sunset Pink',
    color: 'bg-pink-500',
    preview: 'bg-gradient-to-r from-pink-400 to-pink-600',
    textColor: 'text-white',
    inputBg: 'bg-pink-100',
    inputText: 'text-white',
    buttonBg: 'bg-gradient-to-r from-pink-400 to-pink-600',
    buttonText: 'text-white',
  },
  {
    name: 'Midnight Black',
    color: 'bg-gray-900',
    preview: 'bg-gradient-to-r from-gray-800 to-black',
    textColor: 'text-white',
    inputBg: 'bg-gray-800',
    inputText: 'text-white',
    buttonBg: 'bg-gradient-to-r from-gray-700 to-gray-800',
    buttonText: 'text-white',
  },
  {
    name: 'Royal Purple',
    color: 'bg-purple-600',
    preview: 'bg-gradient-to-r from-purple-500 to-purple-700',
    textColor: 'text-white',
    inputBg: 'bg-white',
    inputText: 'text-purple-900',
    buttonBg: 'bg-gradient-to-r from-purple-500 to-purple-700',
    buttonText: 'text-white',
  },
  {
    name: 'Crimson Red',
    color: 'bg-red-600',
    preview: 'bg-gradient-to-r from-red-500 to-red-700',
    textColor: 'text-white',
    inputBg: 'bg-white',
    inputText: 'text-red-900',
    buttonBg: 'bg-gradient-to-r from-red-500 to-red-700',
    buttonText: 'text-white',
  },
  {
    name: 'Sky Indigo',
    color: 'bg-indigo-600',
    preview: 'bg-gradient-to-r from-indigo-500 to-indigo-700',
    textColor: 'text-white',
    inputBg: 'bg-white',
    inputText: 'text-indigo-900',
    buttonBg: 'bg-gradient-to-r from-indigo-500 to-indigo-700',
    buttonText: 'text-white',
  },
];

function MainFormBuilder({ showMapping, showThankYou, showNotification }) {
  const location = useLocation();
  const { formVersionId: urlFormVersionId } = useParams();
  const formVersionId = urlFormVersionId || (location.state?.formVersionId || null);
  const { refreshData } = useSalesforceData();
  const [formId, setFormId] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(formVersionId);
  const [isEditable, setIsEditable] = useState(true);
  const [isFirstSave, setIsFirstSave] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [formVersions, setFormVersions] = useState([]);
  const [isNewVersion, setIsNewVersion] = useState(false);
  const [fetchFormError, setFetchFormError] = useState(null);
  const [currentFormVersion, setCurrentFormVersion] = useState(null);
  const navigate = useNavigate();
  const [showFormNamePopup, setShowFormNamePopup] = useState(!formVersionId);
  // const [formName, setFormName] = useState('');
  const [formName, setFormName] = useState(currentFormVersion?.Name || '');
  const [formNameError, setFormNameError] = useState(null);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(themes[0]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  const [formRecords, setFormRecords] = useState([]);

  const [
    fieldsState,
    { set: setFields, undo, redo, canUndo, canRedo },
  ] = useUndo([]);

  const [showSidebar, setShowSidebar] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedSectionSide, setSelectedSectionSide] = useState(null);
  const [selectedFooter, setSelectedFooter] = useState(null);
  const [clipboard, setClipboard] = useState({ field: null, operation: null });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const fields = fieldsState.present;

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

  const handlePublish = async () => {
    try {
      setIsLoadingForm(true);
      setHasChanges(false);
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      const token = await fetchAccessToken(userId, instanceUrl);
      const rawString = `${userId}$${formId}`;
      const encryptedLinkId = encrypt(rawString);
      const publishLink = `https://d2gg09yhu3xa1a.cloudfront.net/public-form/${encryptedLinkId}`;

      const { formVersion, formFields } = prepareFormData(false);
      formVersion.Stage__c = 'Publish';
      formVersion.Id = selectedVersionId;
      formVersion.Form__c = formId;
      const formUpdate = {
        Id: formId,
        Publish_Link__c: publishLink,
      };
      const response = await fetch(process.env.REACT_APP_SAVE_FORM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl,
          formData: { formVersion, formFields },
          formUpdate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish form');
      }

      await fetchFormData(userId, instanceUrl);
    } catch (error) {
      console.error('Error publishing form:', error);
      setFetchFormError(error.message || 'Failed to publish form');
    } finally {
      setIsLoadingForm(false);
    }
  };

  const fetchFormData = async (userId, instanceUrl) => {
    try {
      setIsLoadingForm(true);
      setFetchFormError(null);

      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
      const response = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          instanceUrl: cleanedInstanceUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch metadata');
      }

      let formRecords = [];
      if (data.FormRecords) {
        try {
          formRecords = JSON.parse(data.FormRecords);
          setFormRecords(formRecords);
        } catch (e) {
          console.warn('Failed to parse FormRecords:', e);
        }
      }

      let formVersion = null;
      for (const form of formRecords) {
        formVersion = form.FormVersions.find(
          (version) => version.Source === 'Form_Version__c' && version.Id === formVersionId
        );
        if (formVersion) {
          formVersion.Form__c = form.Id;
          setFormVersions(form.FormVersions);
          setFormId(form.Id);
          setFormName(formVersion.Name);
          break;
        }
      }

      if (!formVersion) {
        throw new Error(`Form version with Id ${formVersionId} not found`);
      }

      setIsEditable(formVersion.Stage__c === 'Draft');
      setCurrentFormVersion(formVersion);
      const formFields = formVersion.Fields || [];

      const pages = {};
      formFields.forEach((field) => {
        const pageNumber = field.Page_Number__c || 1;
        if (!pages[pageNumber]) {
          pages[pageNumber] = [];
        }
        let properties;
        try {
          properties = JSON.parse(field.Properties__c || '{}');
        } catch (e) {
          console.warn(`Failed to parse Properties__c for field ${field.Unique_Key__c}:`, e);
          properties = {};
        }
        pages[pageNumber].push({
          ...properties,
          id: field.Unique_Key__c,
          validation: properties.validation || getDefaultValidation(field.Field_Type__c),
          subFields: properties.subFields || getDefaultSubFields(field.Field_Type__c),
        });
      });

      Object.keys(pages).forEach((pageNum) => {
        pages[pageNum].sort((a, b) => (a.Order_Number__c || 0) - (b.Order_Number__c || 0));
      });

      const reconstructedFields = [];
      Object.keys(pages)
        .sort((a, b) => a - b)
        .forEach((pageNum, index) => {
          const fieldsInPage = pages[pageNum];
          reconstructedFields.push(...fieldsInPage);
          if (index < Object.keys(pages).length - 1) {
            reconstructedFields.push({
              id: `pagebreak-${pageNum}`,
              type: 'pagebreak',
            });
          }
        });

      setFields(reconstructedFields);
    } catch (error) {
      console.error('Error fetching form data:', error);
      setFetchFormError(error.message || 'Failed to load form data');
      navigate('/home');
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleVersionChange = (e) => {
    const newVersionId = e.target.value;
    setSelectedVersionId(newVersionId);
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    if (userId && instanceUrl) {
      fetchFormData(userId, instanceUrl, newVersionId);
      navigate(`/form-builder/${newVersionId}`);
    }
  };
  
  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    if (!userId || !instanceUrl) {
      setFetchFormError('Missing userId or instanceUrl. Please log in.');
      return;
    }
    if (formVersionId) {
      setSelectedVersionId(formVersionId);
      fetchFormData(userId, instanceUrl, formVersionId);
    } else {
      setFields([]);
    }
  }, [formVersionId]);

  useEffect(() => {
    if (currentFormVersion) {
      const originalFields = currentFormVersion.Fields || [];
      const currentFields = prepareFormData().formFields;
      const hasFieldChanges = JSON.stringify(originalFields) !== JSON.stringify(currentFields);
      setHasChanges(hasFieldChanges);
    }
  }, [fields]);

  const prepareFormData = (isNewForm = false) => {
    const pages = [];
    let currentPage = [];
    let pageNumber = 1;
    fields.forEach((field) => {
      if (field.type === 'pagebreak') {
        pages.push({ fields: currentPage, pageNumber });
        pageNumber++;
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    if (currentPage.length > 0 || pages.length === 0) {
      pages.push({ fields: currentPage, pageNumber });
    }

    const formVersion = {
      Name: currentFormVersion?.Name || formName || 'Contact Form',
      Description__c: '',
      Stage__c: 'Draft',
      Publish_Link__c: '',
    };

    if (!isNewForm && currentFormVersion?.Form__c) {
      formVersion.Form__c = currentFormVersion.Form__c;
    }
    if (isNewForm) {
      formVersion.Version__c = '1';
    } else if (isFirstSave && formVersionId) {
      formVersion.Id = formVersionId;
      formVersion.Version__c = '1';
    } else if (formVersionId && currentFormVersion && hasChanges && !formVersion.Stage__c === 'Draft') {
      const currentVersionNum = parseFloat(currentFormVersion.Version__c) || 1;
      formVersion.Version__c = (currentVersionNum + 1).toFixed(0);
    } else if (formVersionId) {
      formVersion.Id = formVersionId;
      formVersion.Version__c = currentFormVersion?.Version__c || '1';
    } else {
      formVersion.Version__c = '1';
    }
    const formFields = pages.flatMap((page) =>
      page.fields.map((field, index) => {
        if (field.type === 'section') {
          const sectionProperties = {
            ...field,
            subFields: {
              leftField: field.subFields?.leftField ? {
                ...field.subFields.leftField,
                label: field.subFields.leftField.label ||
                  field.subFields.leftField.type?.charAt(0).toUpperCase() +
                  field.subFields.leftField.type?.slice(1) || 'Left Field'
              } : null,
              rightField: field.subFields?.rightField ? {
                ...field.subFields.rightField,
                label: field.subFields.rightField.label ||
                  field.subFields.rightField.type?.charAt(0).toUpperCase() +
                  field.subFields.rightField.type?.slice(1) || 'Right Field'
              } : null
            }
          };

          return {
            Name: field.label || 'Section',
            Field_Type__c: 'section',
            Page_Number__c: page.pageNumber,
            Order_Number__c: index + 1,
            Properties__c: JSON.stringify(sectionProperties),
            Unique_Key__c: field.id,
          };
        }

        const properties = {
          ...field,
          label: field.label || field.type?.charAt(0).toUpperCase() + field.type?.slice(1) || 'Field',
          subFields: field.subFields || getDefaultSubFields(field.type) || {}
        };

        return {
          Name: properties.label,
          Field_Type__c: field.type,
          Page_Number__c: page.pageNumber,
          Order_Number__c: index + 1,
          Properties__c: JSON.stringify(properties),
          Unique_Key__c: field.id,
        };
      })
    );

    return { formVersion, formFields };
  };

  const saveFormToSalesforce = async () => {
    if (!isEditable) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) throw new Error('Missing userId or instanceUrl.');
      const token = await fetchAccessToken(userId, instanceUrl);
      if (!token) throw new Error('Failed to obtain access token.');
      const { formVersion, formFields } = prepareFormData();

      const response = await fetch(process.env.REACT_APP_SAVE_FORM_URL, {
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(data) || 'Failed to save form.');
      }
      alert('Form saved successfully!');
      await refreshData();
      if (hasChanges || !formVersion.Id) {
        const newFormVersionId = data.formVersionId;
        setCurrentFormVersion({ ...formVersion, Id: newFormVersionId, Fields: formFields });
        setSelectedVersionId(newFormVersionId);
        navigate(`/form-builder/${newFormVersionId}`);
        setHasChanges(false);
      } else {
        setCurrentFormVersion({ ...formVersion, Id: formVersionId, Fields: formFields });
      }
      setIsFirstSave(false);
    } catch (error) {
      console.error('Error saving form:', error);
      setSaveError(error.message || 'Failed to save form.');
    } finally {
      setIsSaving(false);
    }
  };

  const getDefaultValidation = (fieldType) => {
    const field = fieldType.toLowerCase().replace(/\s+/g, '');
    const validations = {
      fullname: {
        pattern: "^[a-zA-Z\\s'-]+$",
        description: "Only letters, spaces, hyphens, and apostrophes allowed."
      },
      phonenumber: {
        pattern: "^\\+?[0-9]{7,15}$",
        description: "Must be a valid phone number (7-15 digits, optional '+')."
      },
      email: {
        pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
        description: "Must be a valid email (e.g., user@example.com)."
      },
      address: {
        pattern: "^[\\w\\s\\-\\.,#]+$",
        description: "Alphanumeric, spaces, hyphens, commas, and periods allowed."
      },
      fileupload: {
        pattern: ".*\\.(jpg|jpeg|png|gif|pdf|doc|docx)$",
        description: "Only JPG, PNG, GIF, PDF, DOC, or DOCX files allowed."
      },
      signature: {
        pattern: "^[\\w\\s\\-\\.,#]+$",
        description: "Must be a valid signature input."
      },
      termsofservice: {
        pattern: "^true$",
        description: "Must be accepted (checked)."
      },
      link: {
        pattern: "^(https?:\\/\\/)?[\\w.-]+\\.[a-z]{2,}(\\/\\S*)?$",
        description: "Must be a valid URL (e.g., https://example.com)."
      },
      date: {
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "Must be in YYYY-MM-DD format."
      },
      datetime: {
        pattern: "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$",
        description: "Must be in YYYY-MM-DD HH:MM format."
      },
      time: {
        pattern: "^\\d{2}:\\d{2}$",
        description: "Must be in HH:MM format."
      },
      emojirating: {
        pattern: "^[1-5]$",
        description: "Rating must be between 1 and 5."
      },
      starrating: {
        pattern: "^[1-5]$",
        description: "Rating must be between 1 and 5."
      },
      scalerating: {
        pattern: "^[0-5]$",
        description: "Must be a rating between 0 and 5."
      },
      shorttext: {
        pattern: "^.{1,255}$",
        description: "Maximum 255 characters allowed."
      },
      longtext: {
        pattern: "^.{1,1000}$",
        description: "Maximum 1000 characters allowed."
      },
      number: {
        pattern: "^[0-9]+$",
        description: "Only numbers allowed."
      },
      checkbox: {
        pattern: "^true|false$",
        description: "Must be checked (true) or unchecked (false)."
      },
      displaytext: {
        pattern: ".*",
        description: "Display-only text (no validation needed)."
      },
      price: {
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Must be a valid price (e.g., 10 or 10.99)."
      },
      radiobutton: {
        pattern: ".*",
        description: "Must select one of the available options."
      },
      togglebutton: {
        pattern: "^true|false$",
        description: "Must be toggled (true) or untoggled (false)."
      },
      dropdownelements: {
        pattern: ".*",
        description: "Must select one of the available options."
      },
      imageuploader: {
        pattern: ".*\\.(jpg|jpeg|png|gif|pdf|doc|docx)$",
        description: "Only images (JPG, PNG, GIF), PDF, or Word documents allowed."
      },
      section: {
        pattern: ".*",
        description: "Display-only section (no validation needed)."
      },
      default: {
        pattern: ".*",
        description: "No specific validation rules."
      }
    };
    return validations[field] || validations['default'];
  };

  const getDefaultSubFields = (fieldType) => {
    const field = fieldType.toLowerCase().replace(/\s+/g, '');
    const subFields = {
      fullname: {
        salutation: {
          enabled: false,
          options: ['Mr.', 'Mrs.', 'Ms.', 'Dr.'],
          value: '',
          placeholder: 'Select Salutation',
          label: 'Salutation',
        },
        firstName: {
          value: '',
          placeholder: 'First Name',
          label: 'First Name',
        },
        lastName: {
          value: '',
          placeholder: 'Last Name',
          label: 'Last Name',
        },
      },
      address: {
        street: {
          visiblesubFields: true,
          label: 'Street Address',
          value: '',
          placeholder: 'Enter street',
        },
        city: {
          visible: true,
          label: 'City',
          value: '',
          placeholder: 'Enter city',
        },
        state: {
          visible: true,
          label: 'State',
          value: '',
          placeholder: 'Enter state',
        },
        country: {
          visible: true,
          label: 'Country',
          value: '',
          placeholder: 'Enter country',
        },
        postal: {
          visible: true,
          label: 'Postal Code',
          value: '',
          placeholder: 'Enter postal code',
        },
      },
      section: {
        leftField: null,
        rightField: null,
      },
      phone: {
        countryCode: {
          enabled: true,
          value: 'US',
          options: [],
          label: 'Country Code',
        },
        phoneNumber: {
          value: '',
          placeholder: 'Enter phone number',
          phoneMask: '(999) 999-9999',
          label: 'Phone Number',
        }
      },
      default: {},
    };
    return subFields[field] || subFields['default'];
  };

  const handleDrop = (
    fieldType,
    pageIndex,
    dropIndex,
    fieldId = null,
    sectionId = null,
    sectionSide = null,
    newField = null
  ) => {
    setHasChanges(true);
    let updatedFields = [...fields];

    const pages = [];
    let currentPageFields = [];
    updatedFields.forEach((field) => {
      if (field.type === 'pagebreak') {
        pages.push({ fields: currentPageFields });
        currentPageFields = [];
      } else {
        currentPageFields.push(field);
      }
    });
    pages.push({ fields: currentPageFields });

    if (pageIndex >= pages.length) {
      pages.push({ fields: [] });
    }

    const targetPage = pages[pageIndex];

    const insertIndex = (dropIndex !== null && dropIndex !== undefined) ? dropIndex + 1 : targetPage.fields.length;

    if (newField && fieldId) {
      pages.forEach(page => {
        page.fields = page.fields.filter(f => f.id !== fieldId);
      });
      targetPage.fields.splice(insertIndex, 0, { ...newField, isCut: false });
      setSelectedFieldId(newField.id);
      setSelectedSectionSide(newField.sectionSide || null);
      setShowSidebar(false);
    } else if (newField && !fieldId) {
      targetPage.fields.splice(insertIndex, 0, newField);
      setSelectedFieldId(newField.id);
      setSelectedSectionSide(newField.sectionSide || null);
      setShowSidebar(false);
    } else if (fieldType) {
      const newFieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const defaultValidation = getDefaultValidation(fieldType);
      const defaultSubFields = getDefaultSubFields(fieldType);
      const newFieldObj = {
        id: newFieldId,
        type: fieldType,
        sectionId: sectionId || null,
        sectionSide: sectionSide || null,
        validation: defaultValidation,
        subFields: defaultSubFields,
      };

      targetPage.fields.splice(insertIndex, 0, newFieldObj);
      setSelectedFieldId(newFieldId);
      setSelectedSectionSide(sectionSide || null);
      setShowSidebar(false);
    }

    const flattenedFields = [];
    pages.forEach((page, idx) => {
      flattenedFields.push(...page.fields);
      if (idx < pages.length - 1) {
        flattenedFields.push({ id: `pagebreak-${idx}`, type: 'pagebreak' });
      }
    });

    setFields(flattenedFields);
  };

  const handleReorder = (fromIndex, toIndex, pageIndex) => {
    setHasChanges(true);
    const pages = [];
    let currentPage = [];
    fields.forEach((field) => {
      if (field.type === 'pagebreak') {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    if (currentPage.length > 0 || pages.length === 0) {
      pages.push({ fields: currentPage });
    }

    const targetPageFields = [...pages[pageIndex].fields];
    const [movedField] = targetPageFields.splice(fromIndex, 1);
    targetPageFields.splice(toIndex, 0, movedField);
    pages[pageIndex].fields = targetPageFields;

    const flattenedFields = pages.flatMap((page, idx) => [
      ...page.fields,
      ...(idx < pages.length - 1 ? [{ id: `pagebreak-${idx}`, type: 'pagebreak' }] : []),
    ]);

    setFields(flattenedFields);
  };

  const handleUpdateField = (fieldId, updates) => {
    setHasChanges(true);
    const updatedFields = fields.map((field) => {
      if (field.id === fieldId) {
        return { ...field, ...updates };
      }
      if (field.type === 'section') {
        const updatedSubFields = { ...field.subFields };
        let hasUpdate = false;

        if (field.subFields?.leftField?.id === fieldId) {
          updatedSubFields.leftField = {
            ...field.subFields.leftField,
            ...updates
          };
          hasUpdate = true;
        }
        if (field.subFields?.rightField?.id === fieldId) {
          updatedSubFields.rightField = {
            ...field.subFields.rightField,
            ...updates
          };
          hasUpdate = true;
        }

        if (hasUpdate) {
          return { ...field, subFields: updatedSubFields };
        }
      }
      return field;
    });
    setFields(updatedFields);
  };

  const handleDeleteField = (fieldId, showSidebarAfter = true) => {
    setHasChanges(true);
    const updatedFields = fields
      .map((field) => {
        if (field.type === 'section') {
          if (field.leftField?.id === fieldId) {
            return { ...field, leftField: null };
          }
          if (field.rightField?.id === fieldId) {
            return { ...field, rightField: null };
          }
        }
        return field;
      })
      .filter((field) => field.id !== fieldId);
    setFields(updatedFields);
    if (showSidebarAfter) {
      setSelectedFieldId(null);
      setSelectedSectionSide(null);
      setSelectedFooter(null);
      setShowSidebar(true);
    }
  };

  const handleDeletePage = (pageIndex) => {
    setHasChanges(true);

    // Step 1: Split fields into pages, preserving empty pages
    const pages = [];
    let currentPage = [];

    fields.forEach((field) => {
      if (field.type === 'pagebreak') {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    // Push last page (even if empty)
    pages.push({ fields: currentPage });

    // Step 2: Do not delete if only one page exists
    if (pages.length <= 1) return;

    // Step 3: Remove the selected page
    pages.splice(pageIndex, 1);

    // Step 4: Flatten pages back to fields with pagebreaks between them
    const flattenedFields = pages.flatMap((page, idx) => [
      ...page.fields,
      ...(idx < pages.length - 1 ? [{ id: `pagebreak-${idx}`, type: 'pagebreak' }] : []),
    ]);

    // Step 5: Set updated fields
    setFields(flattenedFields);
  };

  const handleAddPage = () => {
    setHasChanges(true);

    // Break existing fields into pages
    const pages = [];
    let currentPage = [];
    fields.forEach((field) => {
      if (field?.type === 'pagebreak') {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    if (currentPage.length > 0 || pages.length === 0) {
      pages.push({ fields: currentPage });
    }

    // Create the new field array with an added pagebreak
    const newField = { id: `pagebreak-${Date.now()}`, type: 'pagebreak' };
    const updatedFields = [...fields, newField];

    // Assign the updated fields
    setFields(updatedFields);

    // Set current page index to the new page
    setCurrentPageIndex(pages.length);
  };

  const handleMovePageUp = (pageIndex) => {
    if (pageIndex <= 0) return;
    setHasChanges(true);

    // Split fields into pages, preserving empty pages
    const pages = [];
    let currentPage = [];
    fields.forEach((field) => {
      if (field?.type === 'pagebreak') {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    // Always push the last page (even if empty)
    pages.push({ fields: currentPage });

    // Swap pages
    [pages[pageIndex - 1], pages[pageIndex]] = [pages[pageIndex], pages[pageIndex - 1]];

    // Flatten back to fields with pagebreaks
    const flattenedFields = pages.flatMap((page, idx) => [
      ...page.fields,
      ...(idx < pages.length - 1 ? [{ id: `pagebreak-${idx}`, type: 'pagebreak' }] : []),
    ]);

    setFields(flattenedFields);
  };

  const handleMovePageDown = (pageIndex) => {
    setHasChanges(true);

    // Split fields into pages, preserving empty pages
    const pages = [];
    let currentPage = [];
    fields.forEach((field) => {
      if (field?.type === 'pagebreak') {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    // Always push the last page (even if empty)
    pages.push({ fields: currentPage });

    if (pageIndex >= pages.length - 1) return;

    // Swap pages
    [pages[pageIndex], pages[pageIndex + 1]] = [pages[pageIndex + 1], pages[pageIndex]];

    // Flatten back to fields with pagebreaks
    const flattenedFields = pages.flatMap((page, idx) => [
      ...page.fields,
      ...(idx < pages.length - 1 ? [{ id: `pagebreak-${idx}`, type: 'pagebreak' }] : []),
    ]);

    setFields(flattenedFields);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getSelectedField = () => {
    if (!selectedFieldId) return null;
    for (const field of fields) {
      if (field.id === selectedFieldId && field.type !== 'section') {
        return field;
      }
      if (field.type === 'section') {
        const leftField = field.subFields?.leftField;
        const rightField = field.subFields?.rightField;

        if (leftField?.id === selectedFieldId && leftField?.sectionSide === selectedSectionSide) {
          return leftField;
        }
        if (rightField?.id === selectedFieldId && rightField?.sectionSide === selectedSectionSide) {
          return rightField;
        }
      }
    }

    console.warn(`No field found for selectedFieldId: ${selectedFieldId}, selectedSectionSide: ${selectedSectionSide}`);
    return null;
  };

  const selectedField = getSelectedField();

  return (
    <div className="flex h-screen">
      <MainMenuBar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        formRecords={formRecords}
        selectedVersionId={selectedVersionId}
      />
      <div
        className={`flex-1 flex flex-col relative h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'
          }`}
      >
        <div className="inset-x-1 h-screen flex flex-col">
          <div className="text-white p-5 w-full flex justify-between items-center header-main">
            <div className="flex items-center">
              <span className="w-10 h-10 flex items-center justify-center cursor-pointer" onClick={() => navigate('/home')}>
                <IoIosUndo className="text-[#f2f6f7] text-3xl" />
              </span>
              <Whisper
                placement="bottom"
                trigger="hover"
                speaker={<Tooltip>{currentFormVersion?.Description__c || 'Define the form structure'}</Tooltip>}
              >
                <span className="flex items-center gap-2 cursor-pointer">
                  <span className="text-2xl font-semibold text-white">
                    {currentFormVersion?.Name || 'Contact Form'}
                  </span>
                  <FaRegStar className="text-white text-base" />
                </span>
              </Whisper>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="flex items-center justify-center my-version-btn"
                onClick={() => setShowVersionDropdown((v) => !v)}
                title="Change Version"
              >
                <BsStack className="text-white text-xl" />
              </button>
              {showVersionDropdown && (
                <div className="stack-modal">
                  <select
                    value={selectedVersionId || ''}
                    onChange={handleVersionChange}
                    className="p-2 bg-white text-black rounded-md"
                  >
                    <option value="" disabled>Select Version</option>
                    {formVersions.map((version) => (
                      <option key={version.Id} value={version.Id}>
                        Version {version.Version__c} ({version.Stage__c})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                className="preview-btn flex items-center gap-2"
                title="Preview"
                disabled
              >
                <span className="flex items-center">
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8.8202" cy="6.99891" r="2.80556" stroke="white" strokeWidth="1.5" />
                    <path d="M16.0986 6.05205C16.4436 6.47096 16.6161 6.68041 16.6161 6.99935C16.6161 7.31829 16.4436 7.52774 16.0986 7.94665C14.8363 9.47923 12.0521 12.3327 8.82031 12.3327C5.58855 12.3327 2.80437 9.47923 1.54206 7.94665C1.19703 7.52774 1.02451 7.31829 1.02451 6.99935C1.02451 6.68041 1.19703 6.47096 1.54206 6.05205C2.80437 4.51947 5.58855 1.66602 8.82031 1.66602C12.0521 1.66602 14.8363 4.51947 16.0986 6.05205Z" stroke="white" strokeWidth="1.5" />
                  </svg>
                </span>
                Preview
              </button>
              <button
                onClick={saveFormToSalesforce}
                disabled={isSaving || currentFormVersion?.Stage__c !== 'Draft'}
                className={`save-btn flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                title="Save Form"
              >
                <span className="flex items-center">
                  <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.82031 7.2C4.82031 5.43269 6.253 4 8.02031 4H12.8203H15.0262C15.6627 4 16.2732 4.25286 16.7233 4.70294L20.1174 8.09706C20.5675 8.54714 20.8203 9.15759 20.8203 9.79411V12V16.8C20.8203 18.5673 19.3876 20 17.6203 20H8.02031C6.253 20 4.82031 18.5673 4.82031 16.8V7.2Z" stroke="white" strokeWidth="1.5" />
                    <path d="M8.02026 14.4008C8.02026 13.5171 8.73661 12.8008 9.62026 12.8008H16.0203C16.9039 12.8008 17.6203 13.5171 17.6203 14.4008V20.0008H8.02026V14.4008Z" stroke="white" strokeWidth="1.5" />
                    <path d="M9.62036 4V7.2C9.62036 7.64183 9.97853 8 10.4204 8H15.2204C15.6622 8 16.0204 7.64183 16.0204 7.2V4" stroke="white" strokeWidth="1.5" />
                  </svg>
                </span>
                Save
              </button>
              {(currentFormVersion?.Stage__c === 'Draft' || currentFormVersion?.Stage__c === 'Locked') && (
                <button
                  onClick={handlePublish}
                  disabled={isLoadingForm || currentFormVersion?.Stage__c === 'Publish'}
                  className="publish-btn flex items-center gap-2"
                >
                  <span className="flex items-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.35031 7.64885L5.76031 8.11885C6.69231 8.42885 7.15731 8.58485 7.49131 8.91885C7.82531 9.25285 7.98131 9.71885 8.29131 10.6489L8.76131 12.0589C9.54531 14.4129 9.93731 15.5889 10.6583 15.5889C11.3783 15.5889 11.7713 14.4129 12.5553 12.0589L15.3933 3.54685C15.9453 1.89085 16.2213 1.06285 15.7843 0.625853C15.3473 0.188853 14.5193 0.464853 12.8643 1.01585L4.34931 3.85585C1.99831 4.63885 0.820312 5.03085 0.820312 5.75185C0.820312 6.47285 1.99731 6.86485 4.35031 7.64885Z" fill="white" />
                      <path d="M6.1841 9.59379L4.1221 8.90679C3.97781 8.85869 3.82445 8.84414 3.67369 8.86424C3.52293 8.88434 3.37874 8.93857 3.2521 9.02279L2.1621 9.74879C2.03307 9.83476 1.9318 9.95636 1.87061 10.0988C1.80941 10.2413 1.79094 10.3985 1.81742 10.5512C1.84391 10.704 1.91421 10.8458 2.01979 10.9593C2.12537 11.0729 2.26166 11.1533 2.4121 11.1908L4.3671 11.6788C4.45508 11.7008 4.53542 11.7462 4.59954 11.8103C4.66366 11.8745 4.70914 11.9548 4.7311 12.0428L5.2191 13.9978C5.25661 14.1482 5.33703 14.2845 5.45058 14.3901C5.56413 14.4957 5.7059 14.566 5.85867 14.5925C6.01144 14.619 6.16861 14.6005 6.31107 14.5393C6.45353 14.4781 6.57513 14.3768 6.6611 14.2478L7.3871 13.1578C7.47132 13.0311 7.52555 12.887 7.54565 12.7362C7.56575 12.5854 7.5512 12.4321 7.5031 12.2878L6.8161 10.2258C6.76699 10.0786 6.68433 9.94494 6.57464 9.83525C6.46495 9.72556 6.33124 9.6429 6.1841 9.59379Z" fill="white" />
                    </svg>
                  </span>
                  Publish
                </button>
              )}
            </div>
          </div>
          {saveError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mt-2">
              {saveError}
            </div>
          )}
          {fetchFormError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mt-2">
              {fetchFormError}
            </div>
          )}
          {isLoadingForm ? (
            <div className="flex justify-center items-center h-64">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : showThankYou ? (
            <ThankYouPageBuilder formVersionId={formVersionId} />
          ) : showNotification ? (
            <NotificationPage currentFields={formVersions[0]?.Fields} />
          ) : showMapping ? (
            <MappingFields />
          ) : (
            <div className="flex w-full h-screen builder-start">
              <div className="w-3/4 inner-builder-container">
                <div className="bg-transparent rounded-lg h-full form-builder-container">
                  <FormBuilder
                    fields={fields}
                    onDrop={handleDrop}
                    onReorder={handleReorder}
                    onUpdateField={handleUpdateField}
                    onDeleteField={handleDeleteField}
                    onDeletePage={handleDeletePage}
                    showSidebar={showSidebar}
                    setShowSidebar={setShowSidebar}
                    setSelectedFieldId={setSelectedFieldId}
                    setSelectedSectionSide={setSelectedSectionSide}
                    setSelectedFooter={setSelectedFooter}
                    selectedFieldId={selectedFieldId}
                    selectedSectionSide={selectedSectionSide}
                    setClipboard={setClipboard}
                    clipboard={clipboard}
                    selectedTheme={selectedTheme}
                    currentPageIndex={currentPageIndex}
                    setCurrentPageIndex={setCurrentPageIndex}
                    onAddPage={handleAddPage}
                    onMovePageUp={handleMovePageUp}
                    onMovePageDown={handleMovePageDown}
                     canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={undo}
                    onRedo={redo}
                  />
                </div>
              </div>
              <div className="w-1/4 pl-2">
                {showSidebar && !selectedFieldId && !selectedFooter ? (
                  <Sidebar
                    selectedTheme={selectedTheme}
                    onThemeSelect={setSelectedTheme}
                    themes={themes}
                  />
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg">
                    {(selectedFieldId || selectedFooter) && (
                      <FieldEditor
                        selectedField={selectedField}
                        selectedFooter={selectedFooter}
                        onUpdateField={handleUpdateField}
                        onDeleteField={handleDeleteField}
                        onClose={() => {
                          setSelectedFieldId(null);
                          setSelectedSectionSide(null);
                          setSelectedFooter(null);
                          setShowSidebar(true);
                        }}
                        fields={fields}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MainFormBuilder;