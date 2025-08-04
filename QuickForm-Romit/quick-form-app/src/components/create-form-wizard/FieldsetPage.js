import React, { useState, useMemo } from 'react';
import { Edit, PlusCircle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FieldSetBuilder from './FieldSetPageNew'
import useUndo from 'use-undo';

const gradientBtn = {
  background: 'linear-gradient(to right, #1D6D9E, #0B295E)',
};

const FieldsetPage = ({ token, instanceUrl, Fieldset, userId, fetchMetadata, isLoading }) => {
  const fieldsets = Fieldset;


  // UI state
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [showModal, setshowModal] = useState(false);
  const [fieldsetName, setFieldsetName] = useState('');
  const [fieldsetDesc, setFieldsetDesc] = useState('');
  const [selectedFields, setSelectedFields] = useState([]); // array of field objects with config
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingFieldset, setEditingFieldset] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Filtered fieldsets for search
  const filteredFieldsets = useMemo(() =>
    fieldsets.filter(f =>
      f.Name.toLowerCase().includes(search.toLowerCase())
    ), [fieldsets, search]);

  // Generate a unique key for a field
  const generateUniqueKey = () => {
    const timestamp = Date.now();
    const randomChars = Math.random().toString(36).substring(2, 11);
    return `field-${timestamp}-${randomChars}`;
  };

  // Handle field selection
  const handleFieldSelect = (field) => {
    const isSelected = selectedFields.some(f => f.Field_Type__c === field.Field_Type__c);

    if (isSelected) {
      setSelectedFields(prev => prev.filter(f => f.Field_Type__c !== field.Field_Type__c));
    } else {
      const newField = {
        ...field,
        Unique_Key__c: generateUniqueKey(),
        label: field.Name,
        placeholder: { main: '' },
        options: field.requiresOptions ? ['Option 1', 'Option 2'] : undefined,
        subFields: field.subFields ? {
          street: { visible: true, label: 'Street', placeholder: 'Enter street' },
          city: { visible: true, label: 'City', placeholder: 'Enter city' },
          state: { visible: true, label: 'State', placeholder: 'Enter state' },
          country: { visible: true, label: 'Country', placeholder: 'Enter country' },
          postal: { visible: false, label: 'Postal Code', placeholder: 'Enter postal code' }
        } : undefined
      };
      setSelectedFields(prev => [...prev, newField]);
    }
  };


  const [
    fieldsState,
    { set: setFields, undo, redo, canUndo, canRedo },
  ] = useUndo([]);
  const fields = fieldsState.present;

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

    return { formFields };
  };
  // Handle field configuration change
  const handleFieldConfigChange = (fieldType, key, value) => {
    setSelectedFields(prev =>
      prev.map(field =>
        field.Field_Type__c === fieldType
          ? { ...field, [key]: value }
          : field
      )
    );
  };

  // Handle subfield configuration change
  const handleSubFieldConfigChange = (fieldType, subField, key, value) => {
    setSelectedFields(prev =>
      prev.map(field =>
        field.Field_Type__c === fieldType
          ? {
            ...field,
            subFields: {
              ...field.subFields,
              [subField]: {
                ...field.subFields[subField],
                [key]: value
              }
            }
          }
          : field
      )
    );
  };

  // Handle options change for radio/dropdown
  const handleOptionsChange = (fieldType, newOptions) => {
    setSelectedFields(prev =>
      prev.map(field =>
        field.Field_Type__c === fieldType
          ? { ...field, options: newOptions.split(',').map(opt => opt.trim()) }
          : field
      )
    );
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
  // 2. Modify handleEdit
  const handleEdit = (fieldsetId) => {
    const fieldset = fieldsets.find(f => f.Id === fieldsetId);
    if (!fieldset) return;
    let fields = [];
    try {
      fields = JSON.parse(fieldset.Fields__c || '[]');
    } catch {
      fields = [];
    }
    console.log('fieldset ==>', fields)

    const headerField = {
      id: 'default-header',
      type: 'header',
      heading: fieldset.Name || 'Fieldset',
      alignment: 'center',
    };
    console.log('header ==> ', headerField)
    const pages = {};
    fields.forEach((field) => {
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

    setFields([headerField, ...reconstructedFields]);
    console.log('Reconstructed fields ==>', fields)
    setFieldsetName(fieldset.Name);
    setFieldsetDesc(fieldset.Description__c || '');
    setSelectedFields(fields);
    setEditingFieldset(fieldset);
    setModalOpen(true);
  };

  // 3. Add handleUpdateFieldset
  const handleUpdateFieldset = async () => {
    setIsUpdating(true);
    setError('');
    setSuccess('');

    try {
      if (!fieldsetName.trim()) throw new Error('Fieldset name required');
      if (selectedFields.length === 0) throw new Error('Select at least one field');
      const body = {
        Id: editingFieldset.Id,
        Name: fieldsetName.trim(),
        Fields__c: JSON.stringify([]),
        Description__c: fieldsetDesc,
      };
      console.log('Body ==> ', body)
      const resp = await fetch('https://yhylbmq7uc.execute-api.us-east-1.amazonaws.com/set', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Fieldsetobject: body,
          instanceUrl,
          token,
          userId
        }),
      });

      const data = await resp.json();
      console.log('PATCH response =>', data);
      if (!resp.ok) throw new Error(data.error || 'Failed to update fieldset');

      setSuccess('Fieldset updated successfully!');
      setModalOpen(false);
      setEditingFieldset(null);
      setFieldsetName('');
      setFieldsetDesc('');
      setSelectedFields([]);
      fetchMetadata(userId, instanceUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (fieldset) => {
    console.log("Deleting...", fieldset);
    const objectData = { Id: fieldset }
    try {
      // API call
      const resp = await fetch('https://yhylbmq7uc.execute-api.us-east-1.amazonaws.com/set', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Fieldsetobject: JSON.stringify(objectData),
          instanceUrl,
          token,
          userId
        }),
      });
      const data = await resp.json();
      console.log('Deletion => ', data);
      fetchMetadata(userId, instanceUrl);
    } catch (error) {
      console.warn('Error in deletion : ', error);
    }
  };
  const saveFieldSet = async () => {
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) throw new Error('Missing userId or instanceUrl.');
      const { formFields } = prepareFormData();

      console.log('formfields ==>', formFields);
      setIsCreating(true);
      console.log(fieldsetName)

      if (!fieldsetName.trim()) throw new Error('Fieldset name required');

      const body = {
        Name: fieldsetName.trim(),
        Fields__c: JSON.stringify(formFields),
        Description__c: fieldsetDesc,
      };
      console.log('body ==>', body);
      // API call
      const resp = await fetch('https://yhylbmq7uc.execute-api.us-east-1.amazonaws.com/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Fieldsetobject: body,
          instanceUrl,
          token,
          userId
        }),
      });

      const data = await resp.json();
      console.log('Response from Lambda==> ', data)
      if (!resp.ok) throw new Error(data.error || 'Failed to create fieldset');

      setSuccess('Fieldset created successfully!');
      setModalOpen(false);
      setFieldsetName('');
      setFieldsetDesc('');
      setSelectedFields([]);
      fetchMetadata(userId, instanceUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsCreating(false);
    }
  };


  // Card preview for fields
  const renderFieldPreview = (fields) => (
    <div className="overflow-y-auto rounded-lg" style={{ minHeight: 150, maxHeight: 150, scrollbarWidth: 'none', background: 'white', filter: 'brightness(0.7)' }} >
      {fields.length === 0 ? (
        <div className="text-gray-400 text-xs text-center py-4">No fields</div>
      ) : (
        fields.slice(0, 4).map((f, i) => (
          <div key={i} className="flex flex-col gap-1 bg-gray-50 rounded-md px-2 py-1 border border-gray-100">
            <label className="text-xs font-semibold text-gray-700 truncate">{f.Name || f.label || 'Field'}</label>
            {f.Field_Type__c === 'checkbox' ? (
              <input type="checkbox" className="w-4 h-4" readOnly />
            ) : f.Field_Type__c === 'radio' ? (
              <div className="flex gap-2">
                {(f.options || ['Yes', 'No']).map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-xs">
                    <input type="radio" name={`preview-${f.Unique_Key__c}`} readOnly />
                    {opt}
                  </label>
                ))}
              </div>
            ) : f.Field_Type__c === 'dropdown' ? (
              <select className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white" >
                {(f.options || ['Option 1', 'Option 2']).map(opt => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white"
                placeholder={f.placeholder?.main || f.Name || 'Field'}
                disabled
              />
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
      {!modalOpen && (
        <div className="">
          {/* Top Row */}
          <div className=" items-center justify-between mb-8">
            <div className="px-10 py-8 shadow-lg relative" style={{ background: 'linear-gradient(to right, #008AB0, #8FDCF1)' }}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-6 flex justify-between"
              >
                <h1 className="text-3xl font-bold text-white mb-1">Fieldset</h1>
                <div>
                  <button
                    className="save-btn flex items-center gap-2 rounded-lg px-5 py- text-white font-semibold shadow-md"
                    style={gradientBtn}
                    onClick={() => setshowModal(true)}
                  >
                    <PlusCircle className="h-5 w-5" /> Create Fieldset
                  </button>
                </div>
              </motion.div>
            </div>

            <div className="flex items-center gap-4 flex-1 justify-between mt-2">
              <div className="flex gap-4 ">
                <input
                  type="text"
                  placeholder="Search fieldsets..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-black-400 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm w-64"
                />
                {/* <select className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-black-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm">
                <option>All</option>
              </select> */}
              </div>

            </div>
          </div>
          {/* Grid of fieldsets */}
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            <AnimatePresence mode='sync'>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow p-4 border border-gray-200 animate-pulse h-[260px]">
                    <div className="h-24 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))
              ) : (
                <>
                  {filteredFieldsets.length === 0 && (
                    <div className="col-span-4 text-gray-400 text-center py-12">No fieldsets found.</div>
                  )}
                  {filteredFieldsets.map((fs, idx) => {
                    let fields = [];
                    try {
                      fields = fs.Fieldset_Fields__c || [];
                    } catch {
                      fields = [];
                    }
                    return (
                      <motion.div
                        key={fs.Id || idx}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}>
                        <div key={fs.Id || idx} className="group relative flex flex-col items-center bg-white rounded-xl shadow p-4 hover:shadow-lg transition-all border border-blue-100 h-[260px]">
                          <div className="w-full flex-1 flex flex-col justify-center">
                            {renderFieldPreview(fields)}
                          </div>
                          <div className="mt-2 text-center font-bold text-lg truncate max-w-[180px]">{fs.Name}</div>
                          <div className="text-gray-500 text-center ">{fs.Description__c}</div>
                          {/* Hover Icons */}
                          <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <motion.button
                              onClick={() => handleEdit(fs.Id)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="text-blue-500 bg-white-50 rounded-lg hover:text-blue-700"
                              title="Edit"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Edit className='w-5 h-5' />
                            </motion.button>

                            <motion.button
                              onClick={() => handleDelete(fs.Id)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="text-red-500 bg-white-50 rounded-lg hover:text-red-700"
                              title="Delete"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Trash2 className='w-5 h-5' />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </>)}
            </AnimatePresence>
          </motion.div>



        </div>
      )}
      {/* Modal for create fieldset */}
      <AnimatePresence>
        {modalOpen &&
          (<div>
            <FieldSetBuilder prepareFormData={prepareFormData} fields={fields} setFields={setFields}
              canUndo={canUndo} canRedo={canRedo} undo={undo} redo={redo} saveFieldSet={saveFieldSet} setModalOpen={setModalOpen} />
          </div>)
        }
      </AnimatePresence>
      {showModal &&
        <><motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onClick={() => setshowModal(false)}>
              <X size={24} />
            </button>

            <h3 className="text-xl font-bold mb-4">{editingFieldset ? 'Update Fieldset' : 'Create Fieldset'}</h3>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            {success && <div className="text-green-600 mb-2">{success}</div>}

            <input
              type="text"
              placeholder="Fieldset name"
              value={fieldsetName}
              onChange={e => setFieldsetName(e.target.value)}
              className="w-full mb-4 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />

            <textarea
              placeholder="Description"
              value={fieldsetDesc}
              onChange={e => setFieldsetDesc(e.target.value)}
              className="w-full mb-4 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              className="w-full py-2 rounded-lg font-semibold text-white mt-2"
              style={gradientBtn}
              onClick={() => { setModalOpen(true); setshowModal(false); }}
              disabled={isCreating || isUpdating}
            >
              {editingFieldset ? (isUpdating ? 'Updating...' : 'Update Fieldset') : (isCreating ? 'Creating...' : 'Create Fieldset')}
            </button>
          </div>
        </motion.div>
        </>}
    </div>
  );
};

export default FieldsetPage;