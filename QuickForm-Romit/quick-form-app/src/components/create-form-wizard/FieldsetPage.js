import React, { useState, useMemo } from 'react';
import { Edit, PlusCircle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FieldSetBuilder from './FieldSetPageNew'
const gradientBtn = {
  background: 'linear-gradient(to right, #1D6D9E, #0B295E)',
};

const FieldsetPage = ({ token, instanceUrl, Fieldset, userId, fetchMetadata, isLoading }) => {
  const fieldsets = Fieldset;

  // All available field types with their configurations
  const allFields = useMemo(() => [
    { Field_Type__c: 'fullname', Name: 'Full Name', requiresLabel: true, requiresPlaceholder: true },
    { Field_Type__c: 'email', Name: 'Email', requiresLabel: true, requiresPlaceholder: true },
    { Field_Type__c: 'address', Name: 'Address', requiresLabel: true, subFields: true },
    { Field_Type__c: 'file', Name: 'File Upload', requiresLabel: true },
    { Field_Type__c: 'signature', Name: 'Signature', requiresLabel: true },
    { Field_Type__c: 'terms', Name: 'Terms of Service', requiresLabel: true },
    { Field_Type__c: 'link', Name: 'Link', requiresLabel: true, requiresPlaceholder: true },
    { Field_Type__c: 'date', Name: 'Date', requiresLabel: true },
    { Field_Type__c: 'datetime', Name: 'Date and Time', requiresLabel: true },
    { Field_Type__c: 'time', Name: 'Time', requiresLabel: true },
    { Field_Type__c: 'emoji', Name: 'Emoji and Star Rating', requiresLabel: true },
    { Field_Type__c: 'scale', Name: 'Scale Rating', requiresLabel: true },
    { Field_Type__c: 'shorttext', Name: 'Short Text', requiresLabel: true, requiresPlaceholder: true },
    { Field_Type__c: 'longtext', Name: 'Long Text', requiresLabel: true, requiresPlaceholder: true },
    { Field_Type__c: 'number', Name: 'Number', requiresLabel: true, requiresPlaceholder: true },
    { Field_Type__c: 'checkbox', Name: 'Checkbox', requiresLabel: true },
    { Field_Type__c: 'display', Name: 'Display Text', requiresLabel: true },
    { Field_Type__c: 'phone', Name: 'Phone', requiresLabel: true, requiresPlaceholder: true },
    { Field_Type__c: 'price', Name: 'Price', requiresLabel: true, requiresPlaceholder: true },
    { Field_Type__c: 'radio', Name: 'Radio Button', requiresLabel: true, requiresOptions: true },
    { Field_Type__c: 'toggle', Name: 'Toggle Button', requiresLabel: true },
    { Field_Type__c: 'dropdown', Name: 'Dropdown Elements', requiresLabel: true, requiresOptions: true, requiresPlaceholder: true },
    { Field_Type__c: 'image', Name: 'Image Uploader', requiresLabel: true },
    { Field_Type__c: 'section', Name: 'Section', requiresLabel: true }
  ], []);

  // UI state
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
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

  // Build fieldset data for API
  const buildFieldsetData = () => {
    return selectedFields.map(field => {
      const baseField = {
        Unique_Key__c: field.Unique_Key__c,
        Field_Type__c: field.Field_Type__c,
        Name: field.label || field.Name,
        Properties__c: JSON.stringify({
          pattern: ".*",
          description: "Field description"
        })
      };

      if (field.requiresPlaceholder) {
        baseField.placeholder = field.placeholder;
      }

      if (field.subFields) {
        baseField.subFields = field.subFields;
      }

      if (field.options) {
        baseField.options = field.options;
        if (field.Field_Type__c === 'dropdown') {
          baseField.dropdownRelatedValues = field.options.reduce((acc, opt) => {
            acc[opt] = opt.toLowerCase().replace(/\s+/g, '');
            return acc;
          }, {});
        } else if (field.Field_Type__c === 'radio') {
          baseField.radioRelatedValues = field.options.reduce((acc, opt) => {
            acc[opt] = opt;
            return acc;
          }, {});
        }
      }

      return baseField;
    });
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

      const fieldsData = buildFieldsetData();
      const body = {
        Id: editingFieldset.Id,
        Name: fieldsetName.trim(),
        Fields__c: JSON.stringify(fieldsData),
        Description__c: fieldsetDesc,
      };
      console.log('Body ==> ' , body)
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

  // Handle create fieldset
  const handleCreateFieldset = async () => {
    setIsCreating(true);
    setError('');
    setSuccess('');

    try {
      if (!fieldsetName.trim()) throw new Error('Fieldset name required');
      if (selectedFields.length === 0) throw new Error('Select at least one field');

      const fieldsData = buildFieldsetData();
      const body = {
        Name: fieldsetName.trim(),
        Fields__c: JSON.stringify(fieldsData),
        Description__c: fieldsetDesc,
      };

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
    <div className="w-[95%]  mt-4  mx-auto px-8 py-6 shadow-lg rounded-lg">
      {/* Top Row */}
      <div className=" items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Fieldset</h1>
          
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
          <div>
            <button
              className="flex items-center gap-2 rounded-lg px-5 py-2 text-white font-semibold shadow-md"
              style={gradientBtn}
              onClick={() => setModalOpen(true)}
            >
              <PlusCircle className="h-5 w-5" /> Create Fieldset
            </button>
          </div>
        </div>
      </div>
      <div className=''>
        {/* Grid of fieldsets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
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
                  fields = JSON.parse(fs.Fields__c || '[]');
                } catch {
                  fields = [];
                }
                return (
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
                );
              })}
            </>)}
        </div>

        {/* Modal for create fieldset */}
        <AnimatePresence>
          {modalOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
                <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onClick={() => setModalOpen(false)}>
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

                <div className="mb-4">
                  <div className="font-semibold mb-2 text-gray-700">Available Fields:</div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {allFields.map(field => (
                      <div key={field.Field_Type__c} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFields.some(f => f.Field_Type__c === field.Field_Type__c)}
                          onChange={() => handleFieldSelect(field)}
                          className="accent-blue-600"
                        />
                        <span className="truncate text-gray-800">{field.Name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Field configurations */}
                {selectedFields.length > 0 && (
                  <div className="mb-4">
                    <div className="font-semibold mb-2 text-gray-700">Configure Selected Fields:</div>
                    <div className="space-y-4">
                      {selectedFields.map((field) => (
                        <div key={field.Unique_Key__c} className="border border-gray-200 rounded-lg p-4">
                          <div className="font-medium mb-2">{field.Name} Configuration</div>

                          {/* Common configurations */}
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            {field.requiresLabel && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                                <input
                                  type="text"
                                  value={field.label || ''}
                                  onChange={e => handleFieldConfigChange(field.Field_Type__c, 'label', e.target.value)}
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                />
                              </div>
                            )}

                            {field.requiresPlaceholder && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                                <input
                                  type="text"
                                  value={field.placeholder?.main || ''}
                                  onChange={e => handleFieldConfigChange(field.Field_Type__c, 'placeholder', { main: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                />
                              </div>
                            )}
                          </div>

                          {/* Options for radio/dropdown */}
                          {field.requiresOptions && (
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Options (comma separated)</label>
                              <input
                                type="text"
                                value={field.options?.join(', ') || ''}
                                onChange={e => handleOptionsChange(field.Field_Type__c, e.target.value)}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                placeholder="Option 1, Option 2, Option 3"
                              />
                            </div>
                          )}

                          {/* Sub-fields for address */}
                          {field.subFields && (
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Address Sub-fields:</label>
                              <div className="grid grid-cols-2 gap-3">
                                {Object.entries(field.subFields).map(([key, subField]) => (
                                  <div key={key} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={subField.visible}
                                        onChange={e => handleSubFieldConfigChange(field.Field_Type__c, key, 'visible', e.target.checked)}
                                        className="accent-blue-600"
                                      />
                                      <span className="text-sm font-medium">{subField.label}</span>
                                    </div>
                                    {subField.visible && (
                                      <input
                                        type="text"
                                        value={subField.placeholder || ''}
                                        onChange={e => handleSubFieldConfigChange(field.Field_Type__c, key, 'placeholder', e.target.value)}
                                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                        placeholder={`${subField.label} placeholder`}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="w-full py-2 rounded-lg font-semibold text-white mt-2"
                  style={gradientBtn}
                  onClick={editingFieldset ? handleUpdateFieldset : handleCreateFieldset}
                  disabled={isCreating || isUpdating}
                >
                  {editingFieldset ? (isUpdating ? 'Updating...' : 'Update Fieldset') : (isCreating ? 'Creating...' : 'Create Fieldset')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FieldsetPage;