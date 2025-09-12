import React, { useState, useEffect } from 'react';
import FormBuilder from '../form-builder-with-versions/FormBuilder';
import Sidebar from '../form-builder-with-versions/Sidebar';
import FieldEditor from '../form-builder-with-versions/FieldEditor';
import 'rsuite/dist/rsuite.min.css';
import '../form-builder-with-versions/formbuilder.css';
import { motion } from 'framer-motion';
import { IoIosUndo } from "react-icons/io";

const themes = [
  {
    name: 'Remove Theme'
  }
];
const gradientBtn = {
  background: 'linear-gradient(to right, #1D6D9E, #0B295E)',
};
function FieldsetBuilder({ prepareFormData , fields  ,setFields , canUndo , canRedo , undo , redo ,saveFieldSet ,setModalOpen , setshowTopbar
  , setSelectedFields , setFieldsetName,setFieldsetDesc,setshowModal,setEditingFieldset,handleUpdateFieldset , editingFieldset ,protectedIds
}) {
  const [selectedTheme, setSelectedTheme] = useState(themes[0]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  console.log('fields in fieldset ==>' , fields)
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedSectionSide, setSelectedSectionSide] = useState(null);
  const [selectedFooter, setSelectedFooter] = useState(null);
  const [clipboard, setClipboard] = useState({ field: null, operation: null });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);


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
  const resetFormState = () => {
    setFields([]);
    setSelectedFields([]);
    setFieldsetName('');
    setFieldsetDesc('');
    setEditingFieldset(null);
    setModalOpen(false);
    setshowModal(false);
    setshowTopbar(true);
  };
  
  const selectedField = getSelectedField();
  const saveHandler = editingFieldset ? handleUpdateFieldset : saveFieldSet;

  return (
    <div className="flex ">
      <div
        className={`flex-1 flex flex-col relative transition-all duration-300`}
      >
        <div className="flex flex-col">
        <div className="text-white p-5 w-full flex justify-between items-center header-main sticky top-0 z-50 bg-[#0B295E]">
          
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-4 flex gap-4"
              >
                <span className="w-10 h-10 flex items-center justify-center cursor-pointer" onClick={() => {resetFormState()}}>
                <IoIosUndo className="text-[#f2f6f7] text-3xl" />
              </span>
                <h1 className="text-3xl font-bold text-white mb-1">Fieldsets</h1>
              </motion.div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {saveHandler()}}
                disabled={isSaving}
                className={`save-btn flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                title={editingFieldset ? `Update` : `Save`}
              >
                <span className="flex items-center">
                  <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.82031 7.2C4.82031 5.43269 6.253 4 8.02031 4H12.8203H15.0262C15.6627 4 16.2732 4.25286 16.7233 4.70294L20.1174 8.09706C20.5675 8.54714 20.8203 9.15759 20.8203 9.79411V12V16.8C20.8203 18.5673 19.3876 20 17.6203 20H8.02031C6.253 20 4.82031 18.5673 4.82031 16.8V7.2Z" stroke="white" strokeWidth="1.5" />
                    <path d="M8.02026 14.4008C8.02026 13.5171 8.73661 12.8008 9.62026 12.8008H16.0203C16.9039 12.8008 17.6203 13.5171 17.6203 14.4008V20.0008H8.02026V14.4008Z" stroke="white" strokeWidth="1.5" />
                    <path d="M9.62036 4V7.2C9.62036 7.64183 9.97853 8 10.4204 8H15.2204C15.6622 8 16.0204 7.64183 16.0204 7.2V4" stroke="white" strokeWidth="1.5" />
                  </svg>
                </span>
                {editingFieldset ? `Update` : `Save`}
              </button>
            </div>
          </div>
            <div className="flex w-full h-screen builder-start " style={{ height: 'calc(100vh - 80px)' }}>
              <div className="w-3/4 overflow-y-auto inner-builder-container" style={{scrollbarWidth : 'none'}}>
              <h3 className='font-bold font-2xl text-center text-gray-500'>{fields.find(val => val.id === 'default-header')?.heading || 'Fieldset'}</h3>
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
                    isEditable = {!protectedIds.includes(editingFieldset?.id)}
                  />
                </div>
              </div>
              <div className="w-1/4 pl-2 overflow-y-auto" style={{scrollbarWidth : 'none'}}>
                {showSidebar && !selectedFieldId && !selectedFooter ? (
                  <Sidebar
                    selectedTheme={selectedTheme}
                    onThemeSelect={setSelectedTheme}
                    themes={themes}
                    showThemeTab={false}
                    showFieldSetTab={false}
                    showPaymentTab={false}
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
          
        </div>
      </div>
    </div>
  );
}

export default FieldsetBuilder;