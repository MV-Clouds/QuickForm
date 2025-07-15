import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MdUndo, MdRedo } from 'react-icons/md';
import { FaEye } from 'react-icons/fa';
import useUndo from 'use-undo';
import FormBuilder from './FormBuilder';
import Sidebar from './Sidebar';
import MainMenuBar from './MainMenuBar';
import FieldEditor from './FieldEditor';
import 'rsuite/dist/rsuite.min.css';
import { encrypt } from './crypto';
import ThankYouPageBuilder from '@/components/Thankyou/TY'
import NotificationSettings from '@/components/NotificationSettings/NotificationSettingsModal';
// THEMES ARRAY
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

function MainFormBuilder({ showThankYou, showNotifications }) {
  const { formVersionId } = useParams();
  const [formId, setFormId] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(formVersionId);
  const [isEditable, setIsEditable] = useState(true);
  const [isFirstSave, setIsFirstSave] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [formVersions, setFormVersions] = useState([]);
  const [isNewVersion, setIsNewVersion] = useState(false);
  const [fetchFormError, setFetchFormError] = useState(null);
  const [currentFormVersion, setCurrentFormVersion] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [showFormNamePopup, setShowFormNamePopup] = useState(!formVersionId);
  const [formName, setFormName] = useState('');
  const [formNameError, setFormNameError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [selectedObjects, setSelectedObjects] = useState(location.state?.selectedObjects || []);
  const [selectedFields, setSelectedFields] = useState(location.state?.selectedFields || {});
  const [fieldsData, setFieldsData] = useState(location.state?.fieldsData || {});
  const [
    fieldsState,
    { set: setFields, undo, redo, canUndo, canRedo },
  ] = useUndo([
    {
      id: 'default-header',
      type: 'header',
      heading: 'Contact Form',
      alignment: 'center',
    },
  ]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedSectionSide, setSelectedSectionSide] = useState(null);
  const [selectedFooter, setSelectedFooter] = useState(null);
  const [clipboard, setClipboard] = useState({ field: null, operation: null });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const fields = fieldsState.present;

  const [selectedTheme, setSelectedTheme] = useState(themes[0]);

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
      const token = (await fetchAccessToken(userId, instanceUrl));
      const rawString = `${userId}$${formId}`;
      const encryptedLinkId = encrypt(rawString);
      const publishLink = `https://d2bri1qui9cr5s.cloudfront.net/public-form/${encryptedLinkId}`;

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

        } catch (e) {
          console.warn('Failed to parse FormRecords:', e);
        }
      }

      let formVersion = null;
      let targetFormId = null;
      for (const form of formRecords) {
        formVersion = form.FormVersions.find(
          (version) => version.Source === 'Form_Version__c' && version.Id === formVersionId
        );

        if (formVersion) {
          formVersion.Form__c = form.Id;
          targetFormId = form.Id;
          setFormVersions(form.FormVersions);
          setFormId(form.Id);
          break;
        }
      }

      if (!formVersion) {
        throw new Error(`Form version with Id ${formVersionId} not found`);
      }

      setIsEditable(formVersion.Stage__c === 'Draft');
      setCurrentFormVersion(formVersion);
      const formFields = formVersion.Fields || [];

      const headerField = {
        id: 'default-header',
        type: 'header',
        heading: formVersion.Name || 'Contact Form',
        alignment: 'center',
      };

      const pages = {};
      formFields.forEach((field) => {
        const pageNumber = field.Page_Number__c || 1;
        if (!pages[pageNumber]) {
          pages[pageNumber] = [];
        }
        pages[pageNumber].push(field);
      });

      Object.keys(pages).forEach((pageNum) => {
        pages[pageNum].sort((a, b) => (a.Order_Number__c || 0) - (b.Order_Number__c || 0));
      });

      const reconstructedFields = [];
      Object.keys(pages)
        .sort((a, b) => a - b)
        .forEach((pageNum, index) => {
          const fieldsInPage = pages[pageNum].map((field) => {
            const properties = JSON.parse(field.Properties__c || '{}');
            return {
              ...properties,
              id: field.Unique_Key__c,
            };
          });

          reconstructedFields.push(...fieldsInPage);
          if (index < Object.keys(pages).length - 1) {
            reconstructedFields.push({
              id: `pagebreak-${pageNum}`,
              type: 'pagebreak',
            });
          }
        });
      console.log('form versions', formVersions);
      console.log('form fields ===>', formFields);
      setFields([headerField, ...reconstructedFields]);
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
    console.log(fieldsState);

  }, [fieldsState]);
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
      setFields([
        { id: 'default-header', type: 'header', heading: 'Contact Form', alignment: 'center' },
      ]);
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
      const token = await fetchAccessToken(userId, instanceUrl);
      if (!token) throw new Error('Failed to obtain access token.');
      const { formVersion, formFields } = prepareFormData(true);
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

      if (!response.ok) throw new Error(data.error || 'Failed to create form.');
      const newFormVersionId = data.formVersionId;
      setCurrentFormVersion({ ...formVersion, Id: newFormVersionId, Fields: formFields });
      setIsFirstSave(true);
      setShowFormNamePopup(false);
      navigate(`/form-builder/${newFormVersionId}`);
    } catch (error) {
      console.error('Error creating form:', error);
      setFormNameError(error.message || 'Failed to create form.');
    } finally {
      setIsSaving(false);
    }
  };

  const prepareFormData = (isNewForm = false) => {
    const headerField = fields.find((f) => f.type === 'header');
    const nonHeaderFields = fields.filter((f) => f.type !== 'header');
    const pages = [];
    let currentPage = [];
    let pageNumber = 1;
    nonHeaderFields.forEach((field) => {
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
      Name: isNewForm ? formName : headerField?.heading || 'Contact Form',
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
    }
    else if (formVersionId && currentFormVersion && hasChanges && !formVersion.Stage__c === 'Draft') {
      const currentVersionNum = parseFloat(currentFormVersion.Version__c) || 1;
      formVersion.Version__c = (currentVersionNum + 1).toFixed(0);
    } else if (formVersionId) {
      formVersion.Id = formVersionId;
      formVersion.Version__c = currentFormVersion?.Version__c || '1';
    } else {
      formVersion.Version__c = '1';
    }

    const formFields = pages.flatMap((page) =>
      page.fields.map((field, index) => ({
        Name: field.label || field.type.charAt(0).toUpperCase() + field.type.slice(1),
        Field_Type__c: field.type,
        Page_Number__c: page.pageNumber,
        Order_Number__c: index + 1,
        Properties__c: JSON.stringify(field),
        Unique_Key__c: field.id,
      }))
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
      const newFieldObj = {
        id: newFieldId,
        type: fieldType,
        sectionId: sectionId || null,
        sectionSide: sectionSide || null,
        validation: getDefaultValidation(fieldType), // <-- Add this line to include validation key
      };

      targetPage.fields.splice(insertIndex, 0, newFieldObj);
    }

    const flattenedFields = [];
    pages.forEach((page, idx) => {
      flattenedFields.push(...page.fields);
      if (idx < pages.length - 1) {
        flattenedFields.push({ id: `pagebreak-${idx}`, type: 'pagebreak' });
      }
    });

    const headerField = fields.find(f => f.type === 'header');
    const finalFields = headerField ? [headerField, ...flattenedFields.filter(f => f.type !== 'header')] : flattenedFields;

    setFields(finalFields);
  };

  const handleReorder = (fromIndex, toIndex, pageIndex) => {
    setHasChanges(true);
    const pages = [];
    let currentPage = [];
    const nonHeaderFields = fields.filter((f) => f.type !== 'header');
    nonHeaderFields.forEach((field) => {
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

    const headerField = fields.find((f) => f.type === 'header');
    setFields(headerField ? [headerField, ...flattenedFields] : flattenedFields);
  };

  const handleUpdateField = (fieldId, updates) => {
    setHasChanges(true);
    const updatedFields = fields.map((field) => {
      if (field.id === fieldId) {
        return { ...field, ...updates };
      }
      if (field.type === 'section') {
        if (field.leftField?.id === fieldId) {
          return { ...field, leftField: { ...field.leftField, ...updates } };
        }
        if (field.rightField?.id === fieldId) {
          return { ...field, rightField: { ...field.rightField, ...updates } };
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
    const pages = [];
    let currentPage = [];
    const nonHeaderFields = fields.filter((f) => f.type !== 'header');
    nonHeaderFields.forEach((field) => {
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

    if (pages.length <= 1) return;

    pages.splice(pageIndex, 1);
    const flattenedFields = pages.flatMap((page, idx) => [
      ...page.fields,
      ...(idx < pages.length - 1 ? [{ id: `pagebreak-${idx}`, type: 'pagebreak' }] : []),
    ]);

    const headerField = fields.find((f) => f.type === 'header');
    setFields(headerField ? [headerField, ...flattenedFields] : flattenedFields);
  };

  const handleAddPage = () => {
    try {
      setHasChanges(true);
      // Always use the latest value from fieldsState.present
      const currentFields = fieldsState.present;
      const headerField = currentFields.find(f => f.type === 'header');
      const nonHeaderFields = currentFields.filter(f => f.type !== 'header');
      const updatedFields = [
        ...nonHeaderFields,
        { id: `pagebreak-${nonHeaderFields.length}`, type: 'pagebreak' },
      ];
      const newFields = headerField
        ? [headerField, ...updatedFields]
        : updatedFields;
  
      setFields(newFields);
    } catch (error) {
      console.log('Error in add page');
    }
  };


  const handleCut = (field) => {
    setHasChanges(true);
    setClipboard({ field, operation: 'cut' });
    handleUpdateField(field.id, { isCut: true });
  };

  const handleCopy = (field) => {
    setClipboard({ field, operation: 'copy' });
  };

  const handlePaste = (pageIndex, dropIndex, sectionId, sectionSide) => {
    setHasChanges(true);
    if (!clipboard.field) return;

    const newField = {
      ...clipboard.field,
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isCut: false,
      sectionId: sectionId || null,
      sectionSide: sectionSide || null,
    };

    if (clipboard.operation === 'cut') {
      handleDeleteField(clipboard.field.id, false);
    }

    handleDrop(null, pageIndex, dropIndex, null, sectionId, sectionSide, newField);
    setClipboard({ field: null, operation: null });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getSelectedField = () => {
    if (!selectedFieldId) return null;
    for (const field of fields) {
      if (field.id === selectedFieldId) {
        return field.type === 'section' ? null : field;
      }
      if (field.type === 'section') {
        if (field.leftField?.id === selectedFieldId) return field.leftField;
        if (field.rightField?.id === selectedFieldId) return field.rightField;
      }
    }
    return null;
  };

  const selectedField = getSelectedField();
  return (
    <div className="flex h-screen">
      <MainMenuBar isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        selectedObjects={selectedObjects}
        selectedFields={selectedFields}
        fieldsData={fieldsData}
        formVersionId={selectedVersionId} />
      <div
        className={`flex-1 flex flex-col relative h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'
          }`}
      >
        <div className="bg-[#6A9AB0] text-white h-1/3"></div>
        <div className="bg-white h-2/3"></div>
        <div className="absolute top-0 inset-x-1 flex flex-col px-4">
          <div className="text-white p-4 w-full flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-left">
                <h1 className="text-2xl font-semibold text-white">
                  {fields.find((f) => f.type === 'header')?.heading || 'Contact Form'}
                </h1>
                <p className="text-sm text-blue-100">Define the form structure</p>
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
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={undo}
                disabled={!canUndo}
                className={`p-2 rounded ${!canUndo ? 'text-gray-300 cursor-not-allowed' : 'text-white hover:bg-blue-700'}`}
                title="Undo"
              >
                <MdUndo size={18} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={`p-2 rounded ${!canRedo ? 'text-gray-300 cursor-not-allowed' : 'text-white hover:bg-blue-700'}`}
                title="Redo"
              >
                <MdRedo size={18} />
              </button>
              <button
                className="p-2 rounded text-white hover:bg-blue-700"
                title="Preview"
              >
                <FaEye size={18} />
              </button>
              <button
                onClick={handleAddPage}
                className="p-2 bg-blue-900 text-white rounded hover:bg-blue-100 font-medium"
                title="Add Page"
              >
                Add Page
              </button>
              {(currentFormVersion?.Stage__c === 'Draft' || currentFormVersion?.Stage__c === 'Locked') && (
                <button
                  onClick={handlePublish}
                  disabled={isLoadingForm || currentFormVersion?.Stage__c === 'Publish'}
                  className="p-2 bg-green-500 text-white rounded-md disabled:bg-gray-400"
                >
                  Publish
                </button>
              )}
              <button
                onClick={saveFormToSalesforce}
                disabled={isSaving || currentFormVersion?.Stage__c !== 'Draft'}
                className={`p-2 bg-blue-900 text-white rounded font-medium flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'
                  }`}
                title="Save Form"
              >
                {isSaving ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
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
                    Saving...
                  </>
                ) : (
                  'Save Form'
                )}
              </button>
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
          ) : showThankYou ? <ThankYouPageBuilder formVersionId={formVersionId} /> : showNotifications ? <NotificationSettings currentFields = {formVersions[0]?.Fields}/> : (
            <div className="flex w-full mt-4">
              <div className="w-3/4 pr-2">
                <div className="bg-transparent rounded-lg h-full overflow-y-auto pt-4">
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
                  />
                </div>
              </div>
              <div className="w-1/4 pl-2">
                {(showSidebar && !selectedFieldId && !selectedFooter) || (fields.find(f => f.id === selectedFieldId)?.type === 'section') ? (
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
      {showFormNamePopup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Enter Form Name</h2>
              <button onClick={() => navigate('/home')} className="text-gray-500 hover:text-gray-700">×</button>
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
              className={`w-full p-2 bg-blue-600 text-white rounded-md ${isSaving ? 'opacity-50' : 'hover:bg-blue-700'}`}
            >
              {isSaving ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainFormBuilder;