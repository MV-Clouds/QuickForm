import React, { useState } from 'react';
import { MdUndo, MdRedo } from 'react-icons/md';
import { FaEye } from 'react-icons/fa';
import useUndo from 'use-undo';
import FormBuilder from './FormBuilder';
import Sidebar from './Sidebar';
import MainMenuBar from './MainMenuBar';
import FieldEditor from './FieldEditor';
import 'rsuite/dist/rsuite.min.css';

function MainFormBuilder() {
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
      Name: headerField?.heading || 'Contact Form',
      Description__c: '',
      Version__c: '1',
      Publish_Link__c: '',
      Stage__c: 'Draft',
    };

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
    setIsSaving(true);
    setSaveError(null);

    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');

      if (!userId || !instanceUrl) {
        throw new Error('Missing userId or instanceUrl. Please ensure you are logged in.');
      }

      const token = await fetchAccessToken(userId, instanceUrl);
      if (!token) {
        throw new Error('Failed to obtain access token.');
      }

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
          formData: {
            formVersion,
            formFields,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save form to Salesforce.');
      }

      alert('Form saved successfully!');
    } catch (error) {
      console.error('Error saving form:', error);
      setSaveError(error.message || 'An error occurred while saving the form.');
    } finally {
      setIsSaving(false);
    }
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
      // Cut-paste: Remove original field and insert newField
      pages.forEach(page => {
        page.fields = page.fields.filter(f => f.id !== fieldId);
      });
      targetPage.fields.splice(insertIndex, 0, { ...newField, isCut: false });
      // Select the pasted field
      setSelectedFieldId(newField.id);
      setSelectedSectionSide(newField.sectionSide || null);
      setShowSidebar(false);
    } else if (newField && !fieldId) {
      // Copy-paste
      targetPage.fields.splice(insertIndex, 0, newField);
      // Select the pasted field
      setSelectedFieldId(newField.id);
      setSelectedSectionSide(newField.sectionSide || null);
      setShowSidebar(false);
    } else if (fieldType) {
      // New field
      const newFieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFieldObj = {
        id: newFieldId,
        type: fieldType,
        sectionId: sectionId || null,
        sectionSide: sectionSide || null,
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
    const nonHeaderFields = fields.filter((f) => f.type !== 'header');
    const headerField = fields.find((f) => f.type === 'header');
    const updatedFields = [
      ...fields,
      { id: `pagebreak-${nonHeaderFields.length}`, type: 'pagebreak' },
    ];
    setFields(headerField ? [headerField, ...updatedFields.filter((f) => f.type !== 'header')] : updatedFields);
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
      <MainMenuBar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div
        className={`flex-1 flex flex-col relative h-screen transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <div className="bg-[#6A9AB0] text-white h-1/3"></div>
        <div className="bg-white h-2/3"></div>
        <div className="absolute top-0 inset-x-1 flex flex-col px-4">
          <div className="text-white p-4 w-full flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-left">
                <h1 className="text-2xl font-semibold text-white">Contact Form</h1>
                <p className="text-sm text-blue-100">Define the Contact Form of the list view</p>
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
              <button
                onClick={saveFormToSalesforce}
                disabled={isSaving}
                className={`p-2 bg-blue-900 text-white rounded font-medium flex items-center gap-2 ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'
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
                />
              </div>
            </div>
            <div className="w-1/4 pl-2">
              {showSidebar && !selectedFieldId && !selectedFooter ? (
                <Sidebar />
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
        </div>
      </div>
    </div>
  );
}

export default MainFormBuilder;