import { useRef, useState, useEffect } from 'react';
import { DatePicker } from 'rsuite';
import SignatureCanvas from 'react-signature-canvas';
import { FaInfoCircle, FaTrash, FaCut, FaCopy, FaChevronDown, FaChevronUp, FaEyeSlash } from 'react-icons/fa';
import 'rsuite/dist/rsuite.min.css';
import { AiOutlineStar, AiFillStar, AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { FaRegLightbulb, FaLightbulb, FaBolt } from 'react-icons/fa';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import InputMask from 'react-input-mask';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const DynamicScaleRating = ({ rows = [], columns = [], inputType = 'radio', dropdownOptions = [], onChange, onUpdateRows, onUpdateColumns }) => {
  const [selectedValues, setSelectedValues] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [editingColumn, setEditingColumn] = useState(null);
  const [rowValues, setRowValues] = useState(rows);
  const [columnValues, setColumnValues] = useState(columns);

  const handleChange = (rowIndex, value, isCheckbox = false) => {
    let newSelected;
    if (inputType === 'checkbox') {
      const currentValues = selectedValues[rowIndex] || [];
      if (isCheckbox) {
        newSelected = {
          ...selectedValues,
          [rowIndex]: currentValues.includes(value)
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value],
        };
      } else {
        newSelected = { ...selectedValues, [rowIndex]: value };
      }
    } else {
      newSelected = { ...selectedValues, [rowIndex]: value };
    }
    setSelectedValues(newSelected);
    if (onChange) onChange(newSelected);
  };

  const handleRowEdit = (index, value) => {
    const newRows = [...rowValues];
    newRows[index] = value;
    setRowValues(newRows);
    if (onUpdateRows) onUpdateRows(newRows);
  };

  const handleColumnEdit = (index, value) => {
    const newColumns = [...columnValues];
    newColumns[index] = value;
    setColumnValues(newColumns);
    if (onUpdateColumns) onUpdateColumns(newColumns);
  };

  const addRow = () => {
    const newRows = [...rowValues, `Criteria ${rowValues.length + 1}`];
    setRowValues(newRows);
    if (onUpdateRows) onUpdateRows(newRows);
  };

  const addColumn = () => {
    const newColumns = [...columnValues, `${columnValues.length + 1}`];
    setColumnValues(newColumns);
    if (onUpdateColumns) onUpdateColumns(newColumns);
  };

  return (
    <div className="relative">
      <div className="absolute top-0 right-0">
        <button
          onClick={addColumn}
          className="text-blue-600 hover:underline text-sm"
        >
          + Add Column
        </button>
      </div>
      <table className="w-full text-center border-collapse border border-gray-300 mt-6">
        <thead>
          <tr>
            <th className="p-2 border-t border-l border-r-0 border-transparent invisible">.</th>
            {columnValues.map((colLabel, colIdx) => (
              <th key={colIdx} className="border border-gray-300 bg-blue-100/50 p-2 text-center">
                {editingColumn === colIdx ? (
                  <input
                    type="text"
                    value={colLabel}
                    onChange={(e) => handleColumnEdit(colIdx, e.target.value)}
                    onBlur={() => setEditingColumn(null)}
                    className="w-full p-1 border rounded"
                    autoFocus
                  />
                ) : (
                  <span onClick={() => setEditingColumn(colIdx)} className="cursor-pointer">
                    {colLabel}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowValues.map((rowLabel, rowIdx) => (
            <tr key={rowIdx}>
              <td className="border border-gray-300 bg-blue-100/50 p-2 font-semibold">
                {editingRow === rowIdx ? (
                  <input
                    type="text"
                    value={rowLabel}
                    onChange={(e) => handleRowEdit(rowIdx, e.target.value)}
                    onBlur={() => setEditingRow(null)}
                    className="w-full p-1 border rounded"
                    autoFocus
                  />
                ) : (
                  <span onClick={() => setEditingRow(rowIdx)} className="cursor-pointer">
                    {rowLabel}
                  </span>
                )}
              </td>
              {columnValues.map((colLabel, colIdx) => (
                <td key={colIdx} className="border border-gray-300 p-2 text-center">
                  {inputType === 'radio' && (
                    <input
                      type="radio"
                      name={`scale-row-${rowIdx}`}
                      value={colLabel}
                      checked={selectedValues[rowIdx] === colLabel}
                      onChange={() => handleChange(rowIdx, colLabel)}
                    />
                  )}
                  {inputType === 'checkbox' && (
                    <input
                      type="checkbox"
                      name={`scale-row-${rowIdx}-${colIdx}`}
                      value={colLabel}
                      checked={(selectedValues[rowIdx] || []).includes(colLabel)}
                      onChange={() => handleChange(rowIdx, colLabel, true)}
                    />
                  )}
                  {inputType === 'text' && (
                    <input
                      type="text"
                      value={selectedValues[rowIdx] || ''}
                      onChange={(e) => handleChange(rowIdx, e.target.value)}
                      className="w-full p-1 border rounded"
                      placeholder="Enter text"
                    />
                  )}
                  {inputType === 'dropdown' && (
                    <select
                      value={selectedValues[rowIdx] || ''}
                      onChange={(e) => handleChange(rowIdx, e.target.value)}
                      className="w-full p-1 border rounded"
                    >
                      <option value="" disabled>Select an option</option>
                      {dropdownOptions.map((option, optIdx) => (
                        <option key={optIdx} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end mt-2">
        <button
          onClick={addRow}
          className="text-blue-600 hover:underline text-sm"
        >
          + Add Row
        </button>
      </div>
    </div>
  );
};

function FieldWrapper({ children, alignment, showHelpText, helpText, labelContent, isHidden }) {
  const alignmentStyles = {
    top: 'flex flex-col gap-1 w-full',
    left: 'flex items-center gap-2 w-full',
    right: 'flex flex-row-reverse items-center gap-2 w-full',
    center: 'flex flex-col items-center gap-1 w-full',
  };
  // If hidden, render nothing (or you can render a placeholder for admin)
  if (isHidden) {
    return (
      <div className="relative opacity-60 pointer-events-none select-none">
        <div className="absolute left-2 top-2 text-gray-400 z-10">
          <FaEyeSlash title="Hidden Field" />
        </div>
        {labelContent}
        {children}
      </div>
    );
    // Or: return null; // To completely hide
  }

  return (
    <div className={`p-2 ${alignmentStyles[alignment || 'top']}`}>
      {labelContent && (
        <div className="flex items-center gap-2">
          {labelContent}
          {showHelpText && helpText && (
            <span className="relative inline-block">
              <FaInfoCircle className="text-gray-500 hover:text-gray-700 cursor-pointer" />
              <span className="absolute left-1/2 z-20 -translate-x-1/2 mt-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 pointer-events-none transition-opacity duration-200
                group-hover:opacity-100 group-hover:pointer-events-auto
                hover:opacity-100 hover:pointer-events-auto"
                style={{ top: '100%' }}
              >
                {helpText}
              </span>
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// Helper function to strip HTML tags and get plain text
const stripHtml = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Helper function to convert plain text to minimal HTML for Quill
const textToHtml = (text) => {
  return text ? `<p>${text.replace(/\n/g, '<br>')}</p>` : '';
};

function FormField({ field, isSelected, onClick, onDrop, pageIndex, sectionSide = null, onUpdateField, onDeleteField, fields, setClipboard, clipboard, handlePaste, selectedTheme }) {
  const {
    type, subFields = {}, id, label, options: initialOptions, labelAlignment = 'top', heading, isRequired,
    rows, columns, formula = '', placeholder = {}, ratingType = 'emoji', isDisabled = false, showHelpText = false,
    helpText = '', alignment = 'center', isCut = false, sectionId,
    maxChars, allowedDomains, enableConfirmation = false, enableVerification = false,
    maxFileSize, allowedFileTypes, multipleFiles = false,
    makeAsLink = false, termsLinkUrl = '',
    dateSeparator = '-', dateFormat = 'MM/dd/yyyy', defaultDate = '', weekStartDay = 'Sunday',
    customMonthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    customDayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    customTodayLabel = 'Today', enableAgeVerification = false, minAge = 18,
    dateRange = { start: '', end: '' }, disabledDates = [],
    datetimeRange = { start: '', end: '' },
    timeFormat = 'HH:mm', defaultTime = '', restrictAmPm = '', ratingRange = 5, shortTextMaxChars,
    isRichText = false, longTextMaxChars, numberValueLimits = { enabled: false, min: '', max: '' },
    checkboxRelatedValues = {}, radioRelatedValues = {},
    priceLimits = { enabled: false, min: '', max: '' }, currencyType = 'USD', allowMultipleSelections = false,
    dropdownRelatedValues = {}, isHidden = false,
  } = field;

  const ratingOptions = {
    emoji: Array.from({ length: ratingRange }, (_, i) => ({
      value: `emoji${i + 1}`,
      symbol: field.ratingEmojis?.[i] || ['😞', '🙁', '😐', '🙂', '😀'][i % 5] || '😀',
      label: field.ratingValues?.[i] || `Rating ${i + 1}`,
    })),
    star: Array.from({ length: ratingRange }, (_, i) => ({
      value: i + 1,
      label: field.ratingValues?.[i] || `Rating ${i + 1}`,
    })),
    heart: Array.from({ length: ratingRange }, (_, i) => ({
      value: `heart${i + 1}`,
      symbol: '❤️',
      label: field.ratingValues?.[i] || `Rating ${i + 1}`,
    })),
    bulb: Array.from({ length: ratingRange }, (_, i) => ({
      value: `bulb${i + 1}`,
      symbol: '💡',
      label: field.ratingValues?.[i] || `Rating ${i + 1}`,
    })),
    lightning: Array.from({ length: ratingRange }, (_, i) => ({
      value: `lightning${i + 1}`,
      symbol: '⚡',
      label: field.ratingValues?.[i] || `Rating ${i + 1}`,
    })),
  };

  const sigCanvas = useRef(null);
  const [isSigned, setIsSigned] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [localOptions, setLocalOptions] = useState(initialOptions?.length ? initialOptions : ['Option 1', 'Option 2', 'Option 3']);
  const [isHovered, setIsHovered] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [richTextValue, setRichTextValue] = useState(field.value ? field.value : '');
  const [plainTextValue, setPlainTextValue] = useState(field.value ? stripHtml(field.value) : '');
  const [numberValue, setNumberValue] = useState('');
  const datePickerRef = useRef(null);
  const quillRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(field.value || (allowMultipleSelections ? [] : ''));
  const dropdownRef = useRef(null);
  const [isChecked, setIsChecked] = useState(field.value || false);
  const [highlightedSide, setHighlightedSide] = useState(null); //Section Left and Right Field highlight toggle 
  // Add this state for displaytext editing
  const [isEditingDisplayText, setIsEditingDisplayText] = useState(false);
  const displayTextRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Click outside handler for displaytext
  useEffect(() => {
    if (!isEditingDisplayText) return;
    const handleClickOutside = (event) => {
      if (
        displayTextRef.current &&
        !displayTextRef.current.contains(event.target)
      ) {
        setIsEditingDisplayText(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditingDisplayText]);

  useEffect(() => {
    if (field.value) {
      setRichTextValue(field.value);
      setPlainTextValue(stripHtml(field.value));
    } else {
      setRichTextValue('');
      setPlainTextValue('');
    }
  }, [field.value]);

  // useEffect(() => {
  //   if (type === 'checkbox' || type === 'radio') {
  //     setLocalOptions(initialOptions?.length ? initialOptions : ['Option 1', 'Option 2', 'Option 3']);
  //   }
  // }, [type, initialOptions]);

  useEffect(() => {
    if (type === 'checkbox' || type === 'radio' || type === 'dropdown') {
      setLocalOptions(initialOptions?.length ? initialOptions : ['Option 1', 'Option 2', 'Option 3']);
      setSelectedOptions(field.value || (allowMultipleSelections ? [] : ''));
    }
  }, [type, initialOptions, field.value, allowMultipleSelections]);

  const handleRatingClick = (index) => {
    setSelectedRating(index);
    if (onUpdateField) {
      onUpdateField(id, { value: index });
    }
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsSigned(false);
      setSignatureData(null);
    }
  };

  const saveSignature = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      setSignatureData(dataUrl);
      setIsSigned(true);
    }
  };

  const handleSubFieldChange = (subFieldKey, updates) => {
    const updatedSubFields = {
      ...subFields,
      [subFieldKey]: { ...subFields[subFieldKey], ...updates },
    };
    onUpdateField(id, { subFields: updatedSubFields });
  };

  const handleImageChange = (e) => {
    const files = e.target.files;
    if (files) {
      for (const file of files) {
        if (maxFileSize && file.size > maxFileSize * 1024 * 1024) {
          alert(`File ${file.name} exceeds ${maxFileSize}MB limit`);
          return;
        }
        if (allowedFileTypes) {
          const extension = file.name.split('.').pop().toLowerCase();
          const allowed = allowedFileTypes.split(',').map(type => type.trim().toLowerCase());
          if (!allowed.includes(extension)) {
            alert(`File type ${extension} is not allowed. Allowed types: ${allowedFileTypes}`);
            return;
          }
        }
      }
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleOptionChange = (index, newValue) => {
    const newOptions = [...localOptions];
    const oldOption = newOptions[index];
    newOptions[index] = newValue;

    // Update related values for checkbox or radio
    const relatedValuesKey = type === 'checkbox' ? 'checkboxRelatedValues' : 'radioRelatedValues';
    const relatedValues = type === 'checkbox' ? checkboxRelatedValues : radioRelatedValues;
    const newRelatedValues = { ...relatedValues };
    if (oldOption !== newValue && newRelatedValues[oldOption]) {
      newRelatedValues[newValue] = newRelatedValues[oldOption];
      delete newRelatedValues[oldOption];
    }

    setLocalOptions(newOptions);
    if (onUpdateField) {
      onUpdateField(id, { options: newOptions, [relatedValuesKey]: newRelatedValues });
    }
  };

  const handleAddOption = () => {
    const newOptions = [...localOptions, `Option ${localOptions.length + 1}`];
    const relatedValuesKey = type === 'checkbox' ? 'checkboxRelatedValues' : 'radioRelatedValues';
    const relatedValues = type === 'checkbox' ? checkboxRelatedValues : radioRelatedValues;
    const newRelatedValues = { ...relatedValues, [`Option ${localOptions.length + 1}`]: '' };

    setLocalOptions(newOptions);
    if (onUpdateField) {
      onUpdateField(id, { options: newOptions, [relatedValuesKey]: newRelatedValues });
    }
  };

  const handleRemoveOption = (index) => {
    const newOptions = localOptions.filter((_, i) => i !== index);
    const relatedValuesKey = type === 'checkbox' ? 'checkboxRelatedValues' : 'radioRelatedValues';
    const relatedValues = type === 'checkbox' ? checkboxRelatedValues : radioRelatedValues;
    const newRelatedValues = { ...relatedValues };
    delete newRelatedValues[localOptions[index]];

    setLocalOptions(newOptions.length ? newOptions : ['Option 1', 'Option 2', 'Option 3']);
    if (onUpdateField) {
      onUpdateField(id, { options: newOptions.length ? newOptions : ['Option 1', 'Option 2', 'Option 3'], [relatedValuesKey]: newRelatedValues });
    }
  };

  const handleNumberChange = (e) => {
    let value = e.target.value;
    if (numberValueLimits.enabled) {
      const min = parseFloat(numberValueLimits.min);
      const max = parseFloat(numberValueLimits.max);
      if (value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(min) && numValue < min) {
          value = min.toString();
        } else if (!isNaN(max) && numValue > max) {
          value = max.toString();
        }
      }
    }
    setNumberValue(value);
    if (onUpdateField) {
      onUpdateField(id, { value });
    }
  };

  const handlePriceChange = (e) => {
    let value = e.target.value;
    if (priceLimits.enabled) {
      const min = parseFloat(priceLimits.min);
      const max = parseFloat(priceLimits.max);
      if (value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(min) && numValue < min) {
          value = min.toString();
        } else if (!isNaN(max) && numValue > max) {
          value = max.toString();
        }
      }
    }
    if (onUpdateField) {
      onUpdateField(id, { value });
    }
  };

  const handleSectionDrop = (e, side) => {
  e.preventDefault();
  e.stopPropagation();
  const fieldType = e.dataTransfer.getData('fieldType');
  const fieldId = e.dataTransfer.getData('fieldId');
  
  if (fieldType === "section") {
    console.warn('Cannot nest section fields');
    return;
  }
  if (fieldType === 'divider' || fieldType === 'pagebreak') {
    console.warn('Cannot add divider or pagebreak to section');
    return;
  }

  const newFieldId = fieldId || `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let newField;
  
  if (fieldId) {
    // Find the original field in the form fields array
    const original = fields.find(f => f.id === fieldId);
    if (!original) return;
    
    // Create a deep clone of the field
    newField = JSON.parse(JSON.stringify(original));
    newField.sectionId = id;
    newField.sectionSide = side;
  } else {
    newField = {
      id: newFieldId,
      type: fieldType,
      sectionId: id,
      sectionSide: side,
    };
  }

  // Update the section's subFields with the new field
  const updatedSubFields = {
    ...subFields,
    [side === 'left' ? 'leftField' : 'rightField']: newField
  };

  onUpdateField(id, { subFields: updatedSubFields });
  
  // If we're moving an existing field, delete the original
  if (fieldId) {
    onDeleteField(fieldId, false);
  }
};

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSectionDoubleClick = (side) => {
    if (side === 'left' && subFields.leftField) {
      onClick(subFields.leftField.id, side);
    } else if (side === 'right' && subFields.rightField) {
      onClick(subFields.rightField.id, side);
    }
  };

  const handleCut = (e) => {
    e.stopPropagation();
    if (clipboard.operation === 'cut') return; // Prevent cutting another field
    setClipboard({ field, operation: 'cut' });
    onUpdateField(id, { isCut: true });
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    setClipboard({ field, operation: 'copy' });
  };

  const SelectionWrapper = ({ children, isSection = false }) => (
    <div
      className={`relative cursor-pointer group ${isSelected ? 'border-2 border-blue-500 rounded-lg' : ''} ${isCut ? 'opacity-50 blur-sm' : ''}`}
      style={isSelected ? { padding: isSection ? '10px' : '15px', zIndex: 10, position: 'relative' } : {}}
      onClick={() => {
        setHighlightedSide(null); // Always clear highlight on any click
        if (isSection) {
          onClick(id);
        } else {
          onClick(id, sectionSide);
        }
      }}
      onDoubleClick={isSection ? (e) => e.stopPropagation() : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isSelected && type !== 'pagebreak' && type !== 'header' && (
        <div className="absolute top-0 right-0 flex gap-1 z-20" style={{ transform: 'translate(0, -50%)' }}>
          <button
            onClick={handleCut}
            className="p-1 bg-gray-500 text-white rounded-full hover:bg-gray-600"
            title="Cut Field"
          >
            <FaCut size={12} />
          </button>
          <button
            onClick={handleCopy}
            className="p-1 bg-gray-500 text-white rounded-full hover:bg-gray-600"
            title="Copy Field"
          >
            <FaCopy size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteField(id);
            }}
            className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            title="Delete Field"
          >
            <FaTrash size={12} />
          </button>
        </div>
      )}
      {children}
      {/* Paste Above/Below buttons, only if not cut/blurred */}
      {isHovered && clipboard.field && type !== 'pagebreak' && type !== 'header' && !sectionId && !isCut && (
        <div className="flex flex-col gap-1 w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePaste('above');
            }}
            className="w-full text-center text-blue-600 border border-dashed border-blue-500 rounded py-1 hover:bg-blue-50 z-20"
          >
            ------Paste above-------
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePaste('below');
            }}
            className="w-full text-center text-blue-600 border border-dashed border-blue-500 rounded py-1 hover:bg-blue-50 z-20"
          >
            ------Paste below-------
          </button>
        </div>
      )}
    </div>
  );

  const wrapperProps = { alignment: type === 'header' ? alignment : labelAlignment, showHelpText, helpText };

  const formatDateForRsuite = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString);
  };

  const restrictByAge = (date) => {
    if (!enableAgeVerification) return true;
    const today = new Date();
    const birthDate = new Date(date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= minAge;
  };

  const isDateDisabled = (date) => {
    if (!disabledDates.length) return false;
    const dateString = date.toISOString().split('T')[0];
    return disabledDates.includes(dateString);
  };

  const rsuiteToHtmlFormat = (rsuiteFormat) => {
    const map = {
      'MM/dd/yyyy': 'MM-dd-yyyy',
      'dd/MM/yyyy': 'dd-MM-yyyy',
      'yyyy/MM/dd': 'yyyy-MM-dd',
    };
    return map[rsuiteFormat] || 'MM-dd-yyyy';
  };

  const shouldDisableDate = (date) => {
    if (isDateDisabled(date)) return true;
    if (type === 'date' && dateRange.start && date < new Date(dateRange.start)) return true;
    if (type === 'date' && dateRange.end && date > new Date(dateRange.end)) return true;
    if (type === 'datetime' && datetimeRange.start && date < new Date(datetimeRange.start)) return true;
    if (type === 'datetime' && datetimeRange.end && date > new Date(datetimeRange.end)) return true;
    return !restrictByAge(date);
  };

  const renderCell = (date) => {
    const isDisabled = shouldDisableDate(date);
    const isExplicitlyDisabled = isDateDisabled(date);
    if (isDisabled && !isExplicitlyDisabled && !dateRange.start && !dateRange.end && !datetimeRange.start && !datetimeRange.end) {
      return (
        <div style={{ opacity: 0.3, pointerEvents: 'none' }}>
          {date.getDate()}
        </div>
      );
    }
    return (
      <div style={isExplicitlyDisabled ? { textDecoration: 'line-through' } : {}}>
        {date.getDate()}
      </div>
    );
  };

  const handleQuillChange = (value) => {
  const plainText = stripHtml(value);
  const maxChars = longTextMaxChars || 131072;

  if (plainText.length <= maxChars) {
    setRichTextValue(value);
    setPlainTextValue(plainText);
    if (onUpdateField && value !== field.value) {
      onUpdateField(id, { value });
    }
  } else if (quillRef.current) {
    const quill = quillRef.current.getEditor();
    const currentText = quill.getText();
    quill.deleteText(maxChars, currentText.length - maxChars);
    const newValue = quill.root.innerHTML;
    const newPlainText = stripHtml(newValue);
    setRichTextValue(newValue);
    setPlainTextValue(newPlainText);
    if (onUpdateField && newValue !== field.value) {
      onUpdateField(id, { value: newValue });
    }
  }
};

  const toggleOption = (option) => {
    let newSelectedOptions;
    if (allowMultipleSelections) {
      if (selectedOptions.includes(option)) {
        newSelectedOptions = selectedOptions.filter((opt) => opt !== option);
      } else {
        newSelectedOptions = [...selectedOptions, option];
      }
    } else {
      newSelectedOptions = option;
      setIsDropdownOpen(false);
    }
    setSelectedOptions(newSelectedOptions);
    if (onUpdateField) {
      onUpdateField(id, { value: newSelectedOptions });
    }
  };

  const handleToggleChange = (e) => {
    const checked = e.target.checked;
    setIsChecked(checked);
    if (onUpdateField) {
      onUpdateField(id, { value: checked });
    }
  };

  switch (type) {
    case 'date':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Date'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div
              ref={datePickerRef}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DatePicker
                format={rsuiteToHtmlFormat(dateFormat).replace(/-/g, dateSeparator)}
                defaultValue={defaultDate ? formatDateForRsuite(defaultDate) : null}
                disabled={isDisabled}
                disabledDate={shouldDisableDate}
                renderCell={renderCell}
                placeholder={placeholder.main || 'Select a date'}
                className={`w-full ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                isoWeek={weekStartDay === 'Monday'}
                locale={{
                  localizedMonthName: (month) => customMonthLabels[month.getMonth()] || month.toLocaleString('en', { month: 'long' }),
                  weekdays: customDayLabels,
                  today: customTodayLabel,
                }}
                onChange={(value) => {
                  if (value) {
                    onUpdateField(id, { defaultDate: value.toISOString().split('T')[0] });
                  }
                }}
                onOpen={() => {
                  if (datePickerRef.current) {
                    datePickerRef.current.focus();
                  }
                }}
                preventOverflow
              />
            </div>
            {enableAgeVerification && (
              <p className="text-sm text-gray-500 mt-1">Minimum age: {minAge}</p>
            )}
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'datetime':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`${selectedTheme?.textColor || 'text-gray-700'}`}>
              {label || 'Date and Time'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div
              ref={datePickerRef}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DatePicker
                format={`${rsuiteToHtmlFormat(dateFormat).replace(/-/g, dateSeparator)} ${timeFormat === 'HH:mm' ? 'HH:mm' : 'hh:mm a'}`}
                defaultValue={defaultDate ? formatDateForRsuite(defaultDate) : null}
                disabled={isDisabled}
                disabledDate={shouldDisableDate}
                renderCell={renderCell}
                placeholder={placeholder.main || 'Select date and time'}
                className={`w-full ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                isoWeek={weekStartDay === 'Monday'}
                locale={{
                  localizedMonthName: (month) => customMonthLabels[month.getMonth()] || month.toLocaleString('en', { month: 'long' }),
                  weekdays: customDayLabels,
                  today: customTodayLabel,
                }}
                showMeridian={timeFormat === 'hh:mm a'}
                onChange={(value) => {
                  if (value) {
                    onUpdateField(id, { defaultDate: value.toISOString() });
                  }
                }}
                onOpen={() => {
                  if (datePickerRef.current) {
                    datePickerRef.current.focus();
                  }
                }}
                preventOverflow
              />
            </div>
            {enableAgeVerification && (
              <p className="text-sm text-gray-500 mt-1">Minimum age: {minAge}</p>
            )}
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'time':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Time'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div
              ref={datePickerRef}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DatePicker
                format={timeFormat === 'HH:mm' ? 'HH:mm' : 'hh:mm a'}
                defaultValue={defaultTime ? formatDateForRsuite(`1970-01-01T${defaultTime}`) : null}
                disabled={isDisabled}
                placeholder={placeholder.main || 'Select a time'}
                className={`w-full ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                showMeridian={timeFormat === 'hh:mm a'}
                disabledTime={(date) => {
                  if (!restrictAmPm) return {};
                  const hours = date.getHours();
                  if (restrictAmPm === 'AM' && hours >= 12) return { hour: true };
                  if (restrictAmPm === 'PM' && hours < 12) return { hour: true };
                  return {};
                }}
                onChange={(value) => {
                  if (value) {
                    const time = value.toTimeString().split(' ')[0].slice(0, 5);
                    onUpdateField(id, { defaultTime: time });
                  }
                }}
                onOpen={() => {
                  if (datePickerRef.current) {
                    datePickerRef.current.focus();
                  }
                }}
                preventOverflow
              />
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'header':
      return (
        <div className="relative group">
          <SelectionWrapper>
            <FieldWrapper {...wrapperProps} labelContent={
              <div className={`text-2xl font-bold ${alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center'} w-full ${selectedTheme?.textColor || 'text-gray-700'}`}>
                {heading || 'Form'}
                {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </div>
            }>
              <div className="flex flex-col items-center" />
            </FieldWrapper>
          </SelectionWrapper>
        </div>
      );
    case 'heading':
      return (
        <div className="relative group">
          <SelectionWrapper>
            <FieldWrapper {...wrapperProps} labelContent={
              <div className={`text-2xl font-bold ${alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center'} w-full ${selectedTheme?.textColor || 'text-gray-700'}`}>
                {heading || 'Form'}
                {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </div>
            }>
              <div className="flex flex-col items-center" />
            </FieldWrapper>
          </SelectionWrapper>
        </div>
      );
    case 'shorttext':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={` ${selectedTheme?.textColor || 'text-gray-700'}`}>
              {label || 'Short Text'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <input
              type="text"
              className={`p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
              placeholder={placeholder.main || 'Enter short text'}
              maxLength={shortTextMaxChars || 255}
              readOnly={isDisabled}
              pattern={field?.validation?.pattern}
              title={field?.validation?.description}
            />
            {shortTextMaxChars && (
              <p className="text-sm text-gray-500 mt-1">Max characters: {shortTextMaxChars}</p>
            )}
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'longtext':
      return (
        <SelectionWrapper>
          <FieldWrapper labelContent={
            <label className={` ${selectedTheme?.textColor || 'text-gray-700color'}`}>
              {label || 'Long Text'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            {isRichText ? (
              <ReactQuill
                ref={quillRef}
                value={richTextValue}
                onChange={handleQuillChange}
                className="min-h-[100px] bg-white"
                readOnly={isDisabled}
                placeholder={placeholder.main || 'Enter long text'}
              />
            ) : (
              <div>
                <textarea
                  className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                  rows="4"
                  placeholder={placeholder.main || 'Enter long text'}
                  maxLength={longTextMaxChars || 131072}
                  value={plainTextValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!longTextMaxChars || value.length <= longTextMaxChars) {
                      setPlainTextValue(value);
                      setRichTextValue(textToHtml(value));
                      if (onUpdateField) {
                        onUpdateField(id, { value: textToHtml(value) });
                      }
                    }
                  }}
                  readOnly={isDisabled}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Words: {plainTextValue.trim() ? plainTextValue.trim().split(/\s+/).length : 0}</span>
                  <span>Characters: {plainTextValue.length}{longTextMaxChars ? ` / ${longTextMaxChars}` : ''}</span>
                </div>
              </div>
            )}
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'number':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Number'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <input
              type="number"
              className={`p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
              placeholder={placeholder.main || 'Enter number'}
              value={numberValue}
              min={numberValueLimits.enabled ? numberValueLimits.min : undefined}
              max={numberValueLimits.enabled ? numberValueLimits.max : undefined}
              onChange={handleNumberChange}
              readOnly={isDisabled}
              pattern={field?.validation?.pattern}
              title={field?.validation?.description}
            />
            {numberValueLimits.enabled && (
              <p className="text-sm text-gray-500 mt-1">
                Range: {numberValueLimits.min || 'No min'} - {numberValueLimits.max || 'No max'}
              </p>
            )}
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'phone':
      return (
        <SelectionWrapper>
          <FieldWrapper
            {...wrapperProps}
            labelContent={
              <label className={`text-gray-700 ${selectedTheme?.textColor || ''} flex items-center gap-1`}>
                {label || 'Phone'}
                {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
            }
          >
            <div className="flex flex-col gap-3">
              {subFields.countryCode?.enabled ? (
                <div className="flex items-center gap-3">
                  {/* Country Code Selector */}
                  <div className="w-1/3">
                    <PhoneInput
                      country={subFields.countryCode?.value ? subFields.countryCode.value.toLowerCase() : 'us'}
                      value=""
                      onChange={(phone, countryData) => {
                        const newCountryCode = countryData.countryCode.toUpperCase();
                        handleSubFieldChange('countryCode', { value: newCountryCode });
                      }}
                      inputClass="p-2 border rounded text-sm w-full"
                      buttonClass="border rounded p-1 bg-white"
                      dropdownClass="border rounded max-h-64 overflow-y-auto"
                      containerClass="flex items-center w-full"
                      inputProps={{ 'aria-label': 'Country code selector', readOnly: true }}
                      disabled={isDisabled}
                      placeholder={subFields.countryCode?.placeholder || 'Select country code'}
                      enableSearch
                      searchPlaceholder="Search country"
                      searchNotFound="No country found"
                      preferredCountries={['us', 'ca', 'gb']}
                    />
                  </div>

                  {/* Plain Input without Mask, Max 12 Digits */}
                  <div className="w-2/3">
                    <input
                      type="tel"
                      maxLength={12}
                      value={subFields.phoneNumber?.value || ''}
                      onChange={(e) =>
                        handleSubFieldChange('phoneNumber', {
                          value: e.target.value.replace(/\D/g, '').slice(0, 12), // Only numbers, max 12 digits
                        })
                      }
                      className={`p-2 border rounded w-full text-sm ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                      placeholder={subFields.phoneNumber?.placeholder || 'Enter phone number'}
                      disabled={isDisabled}
                      aria-label="Phone number input"
                    />
                  </div>
                </div>
              ) : (
                <InputMask
                  mask={subFields.phoneNumber?.phoneMask || '(999) 999-9999'}
                  value={subFields.phoneNumber?.value || ''}
                  onChange={(e) =>
                    handleSubFieldChange('phoneNumber', {
                      value: e.target.value,
                      phoneMask: subFields.phoneNumber?.phoneMask || '(999) 999-9999',
                    })
                  }
                  className={`p-2 border rounded w-full text-sm ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                  placeholder={subFields.phoneNumber?.placeholder || 'Enter phone number'}
                  disabled={isDisabled}
                  inputProps={{ 'aria-label': 'Phone number input' }}
                />
              )}
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'email':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Email'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div className="flex flex-col gap-3">
              <input
                type="email"
                className={`p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                placeholder={placeholder.main || 'example@domain.com'}
                maxLength={maxChars || undefined}
                pattern={allowedDomains ? `.*@(${allowedDomains.split(',').map(d => d.trim()).join('|')})$` : undefined}
                readOnly={isDisabled}
                title={allowedDomains ? `Email must be from: ${allowedDomains}` : undefined}
              />
              {enableConfirmation && (
                <input
                  type="email"
                  className={`p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                  placeholder="Confirm email"
                  value={confirmationEmail}
                  onChange={(e) => setConfirmationEmail(e.target.value)}
                  readOnly={isDisabled}
                />
              )}
              {enableVerification && (
                <input
                  type="text"
                  className={`p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  readOnly={isDisabled}
                />
              )}
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'checkbox':
      return (
        <SelectionWrapper>
          <FieldWrapper
            {...wrapperProps}
            labelContent={
              <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
                {label || 'Checkbox'}
                {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
            }
          >
            <div className="flex flex-col gap-2">
              {localOptions.map((opt, idx) => (
                <div key={opt} className="flex items-center gap-2">
                  <input type="checkbox" className="mr-2" disabled={isDisabled} pattern={field?.validation?.pattern} title={field?.validation?.description}/>
                  <div
                    // type="text"
                    // value={opt}
                    // onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className={`p-1 rounded flex-grow ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                  // placeholder={`Option ${idx + 1}`}
                  >{opt}</div>
                  <button
                    onClick={() => handleRemoveOption(idx)}
                    className={`text-red-500 hover:text-red-700 ${selectedTheme?.buttonText || ''}`}
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddOption}
                className={`text-blue-600 text-xs hover:underline mt-1 ${selectedTheme?.buttonText || ''}`}
              >
                + Add Item
              </button>
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'radio':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Radio'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div className="flex flex-col gap-2">
              {localOptions.map((opt, idx) => (
                <div key={opt} className="flex items-center gap-2">
                  <input type="radio" name={`radio-${id}`} className="mr-2" disabled={isDisabled} />
                  <div
                    // type="text"
                    // value={opt}
                    // onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className={`p-1 flex-grow ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                  // placeholder={`Option ${idx + 1}`}
                  >{opt}</div>
                  <button
                    onClick={() => handleRemoveOption(idx)}
                    className={`text-red-500 hover:text-red-700 ${selectedTheme?.buttonText || ''}`}
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddOption}
                className={`text-blue-600 text-xs hover:underline mt-1 ${selectedTheme?.buttonText || ''}`}
              >
                + Add Item
              </button>
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'dropdown':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Dropdown'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div className="relative w-full" ref={dropdownRef}>
              <div
                className={`w-full p-2 border rounded cursor-pointer flex justify-between items-center ${isDisabled ? 'bg-gray-200' : 'bg-white'} ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                onClick={() => !isDisabled && setIsDropdownOpen(!isDropdownOpen)}
              >
                <span>
                  {allowMultipleSelections
                    ? selectedOptions.length > 0
                      ? selectedOptions.map(opt => localOptions.find(o => (dropdownRelatedValues[o] || o) === opt) || opt).join(', ')
                      : placeholder.main || 'Select options'
                    : selectedOptions
                      ? localOptions.find(opt => (dropdownRelatedValues[opt] || opt) === selectedOptions) || selectedOptions
                      : placeholder.main || 'Select an option'}
                </span>
                {isDropdownOpen ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
              </div>
              {isDropdownOpen && (
                <div className="absolute w-full mt-1 bg-white border rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                  {localOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`p-2 hover:bg-blue-100 cursor-pointer ${allowMultipleSelections
                          ? selectedOptions.includes(dropdownRelatedValues[opt] || opt) ? 'bg-blue-50' : ''
                          : selectedOptions === (dropdownRelatedValues[opt] || opt) ? 'bg-blue-50' : ''
                        }`}
                      onClick={() => toggleOption(dropdownRelatedValues[opt] || opt)}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
              {allowMultipleSelections && (
                <p className="text-sm text-gray-500 mt-1">Multiple selections enabled</p>
              )}
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'fileupload':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'File Upload'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <input
              type="file"
              className={`p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
              ref={fileInputRef}
              onChange={handleImageChange}
              accept={allowedFileTypes ? allowedFileTypes.split(',').map(type => `.${type.trim()}`).join(',') : undefined}
              multiple={multipleFiles}
              disabled={isDisabled}
              pattern={field?.validation?.pattern}
              title={field?.validation?.description}
            />
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'imageuploader':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={` ${selectedTheme?.textColor || 'text-gray-700'}`}>
              {/* {label || 'Image Uploader'} */}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>

            <div className="relative" style={{
              width: field.imageWidth ? `${field.imageWidth}px` : undefined,
              textAlign: field.imageAlign || 'center'
            }}>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageChange}
                disabled={isDisabled}
                pattern={field?.validation?.pattern}
                title={field?.validation?.description}
              />
              {imagePreview ? (
                <div
                  className="relative"
                  style={{
                    width: '100%',
                    textAlign:
                      field.imageAlign === 'left'
                        ? 'left'
                        : field.imageAlign === 'right'
                          ? 'right'
                          : 'center',
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Uploaded"
                    style={{
                      height: field.imageHeight ? `${field.imageHeight}px` : 'auto',
                      width: field.imageWidth ? `${field.imageWidth}px` : 'auto',
                      display: 'block',
                      marginLeft:
                        field.imageAlign === 'center'
                          ? 'auto'
                          : field.imageAlign === 'right'
                            ? 'auto'
                            : 0,
                      marginRight:
                        field.imageAlign === 'center'
                          ? 'auto'
                          : field.imageAlign === 'left'
                            ? 'auto'
                            : 0,
                    }}
                    className="object-contain border rounded"
                  />
                </div>
              ) : (
                <div
                  className={`h-32 text-sm p-2 border rounded bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-50' : ''} ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                  onClick={() => !isDisabled && fileInputRef.current?.click()}
                >
                  Click to Upload Image
                </div>
              )}
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'toggle':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <span className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Toggle Button'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </span>
          }>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" disabled={isDisabled} checked={isChecked} onChange={handleToggleChange}               pattern={field?.validation?.pattern}
              title={field?.validation?.description}/>
              <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${isChecked ? 'peer-checked:bg-blue-600' : ''} ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </label>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'price':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Price'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div className="flex items-center gap-2">
              {/* NEW: Display currency symbol */}
              <span className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>{currencyType}</span>
              <input
                type="number"
                min={priceLimits.enabled ? priceLimits.min : "0"}
                max={priceLimits.enabled ? priceLimits.max : undefined}
                step="0.01"
                className={`p-2 border rounded w-full ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                placeholder={placeholder.main || 'Enter price'}
                onChange={handlePriceChange}
                readOnly={isDisabled}
              pattern={field?.validation?.pattern}
              title={field?.validation?.description}
              />
            </div>
            {/* NEW: Display price limits if enabled */}
            {priceLimits.enabled && (
              <p className="text-sm text-gray-500 mt-1">
                Range: {priceLimits.min || 'No min'} - {priceLimits.max || 'No max'}
              </p>
            )}
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'fullname':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Full Name'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div className="flex gap-3">
              {subFields.salutation?.enabled && (
                <div className="w-1/5">
                  <select
                    value={subFields.salutation?.value || ''}
                    onChange={(e) => handleSubFieldChange('salutation', { value: e.target.value })}
                    className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                    disabled={isDisabled}
                  >
                    <option value="" disabled>{subFields.salutation?.placeholder || 'Select Salutation'}</option>
                    {(subFields.salutation?.options || ['Mr.', 'Mrs.', 'Ms.', 'Dr.']).map((sal, idx) => (
                      <option key={idx} value={sal}>{sal}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={subFields.salutation?.enabled ? 'w-2/5' : 'w-1/2'}>
                <input
                  type="text"
                  className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                  placeholder={subFields.firstName?.placeholder || 'First Name'}
                  value={subFields.firstName?.value || ''}
                  onChange={(e) => handleSubFieldChange('firstName', { value: e.target.value })}
                  readOnly={isDisabled}
              pattern={field?.validation?.pattern}
              title={field?.validation?.description}
                />
              </div>
              <div className={subFields.salutation?.enabled ? 'w-2/5' : 'w-1/2'}>
                <input
                  type="text"
                  className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                  placeholder={subFields.lastName?.placeholder || 'Last Name'}
                  value={subFields.lastName?.value || ''}
                  onChange={(e) => handleSubFieldChange('lastName', { value: e.target.value })}
                  readOnly={isDisabled}
                />
              </div>
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'address':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Address'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1"></span>}
            </label>
          }>
            <div className="flex flex-col gap-3">
              {subFields.street?.visible && (
                <div className="w-full">
                  <label className={`text-xs text-gray-500 ${selectedTheme?.textColor || ''}`}>
                    {subFields.street?.label || 'Street Address'}
                  </label>
                  <input
                    type="text"
                    className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                    placeholder={subFields.street?.placeholder || 'Street Address'}
                    value={subFields.street?.value || ''}
                    onChange={(e) => handleSubFieldChange('street', { value: e.target.value })}
                    readOnly={isDisabled}
                  />
                </div>
              )}
              {(subFields.city?.visible || subFields.state?.visible) && (
                <div className="flex gap-3">
                  {subFields.city?.visible && (
                    <div className="w-1/2">
                      <label className={`text-xs text-gray-500 ${selectedTheme?.textColor || ''}`}>
                        {subFields.city?.label || 'City'}
                      </label>
                      <input
                        type="text"
                        className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                        placeholder={subFields.city?.placeholder || 'City'}
                        value={subFields.city?.value || ''}
                        onChange={(e) => handleSubFieldChange('city', { value: e.target.value })}
                        readOnly={isDisabled}
                      />
                    </div>
                  )}
                  {subFields.state?.visible && (
                    <div className="w-1/2">
                      <label className={`text-xs text-gray-500 ${selectedTheme?.textColor || ''}`}>
                        {subFields.state?.label || 'State'}
                      </label>
                      <input
                        type="text"
                        className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                        placeholder={subFields.state?.placeholder || 'State'}
                        value={subFields.state?.value || ''}
                        onChange={(e) => handleSubFieldChange('state', { value: e.target.value })}
                        readOnly={isDisabled}
                      />
                    </div>
                  )}
                </div>
              )}
              {(subFields.country?.visible || subFields.postal?.visible) && (
                <div className="flex gap-3">
                  {subFields.country?.visible && (
                    <div className="w-1/2">
                      <label className={`text-xs text-gray-500 ${selectedTheme?.textColor || ''}`}>
                        {subFields.country?.label || 'Country'}
                      </label>
                      <input
                        type="text"
                        className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                        placeholder={subFields.country?.placeholder || 'Country'}
                        value={subFields.country?.value || ''}
                        onChange={(e) => handleSubFieldChange('country', { value: e.target.value })}
                        readOnly={isDisabled}
                      />
                    </div>
                  )}
                  {subFields.postal?.visible && (
                    <div className="w-1/2">
                      <label className={`text-xs text-gray-500 ${selectedTheme?.textColor || ''}`}>
                        {subFields.postal?.label || 'Postal Code'}
                      </label>
                      <input
                        type="text"
                        className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                        placeholder={subFields.postal?.placeholder || 'Postal Code'}
                        value={subFields.postal?.value || ''}
                        onChange={(e) => handleSubFieldChange('postal', { value: e.target.value })}
                        readOnly={isDisabled}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'link':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Link'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <input
              type="url"
              className={`p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
              placeholder={placeholder.main || 'Enter link'}
              readOnly={isDisabled}
              pattern={field?.validation?.pattern}
              title={field?.validation?.description}
            />
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'signature':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Signature'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div className="flex flex-col gap-2">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{ className: 'border rounded w-full h-32', style: { backgroundColor: '#fff' } }}
                onEnd={saveSignature}
              />
              <div className="flex gap-2">
                <button
                  onClick={clearSignature}
                  className={`px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 ${selectedTheme?.buttonText || ''}`}
                  disabled={isDisabled}
                >
                  Clear
                </button>
                {isSigned && signatureData && (
                  <img src={signatureData} alt="Signature" className="w-32 h-16 object-contain" />
                )}
              </div>
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'terms':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Terms and Conditions'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="mr-2"
                disabled={isDisabled}
              pattern={field?.validation?.pattern}
              title={field?.validation?.description}
              />
              {makeAsLink && termsLinkUrl ? (
                <a
                  href={termsLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-blue-600 hover:underline ${selectedTheme?.buttonText || ''}`}
                >
                  {placeholder.main || 'I agree to the terms and conditions'}
                </a>
              ) : (
                <span>{placeholder.main || 'I agree to the terms and conditions'}</span>
              )}
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'displaytext':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {/* {label || 'Display Text'} */}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
            </label>
          }>
            <div
              className="bg-white rounded-lg shadow-sm  p-3 my-2 min-h-[60px] cursor-pointer"
              ref={displayTextRef}
              onClick={() => setIsEditingDisplayText(true)}
            >
              {isEditingDisplayText ? (
                <ReactQuill
                  value={field.value || ''}
                  onChange={value => {
                    if (onUpdateField) onUpdateField(id, { value });
                  }}
                  theme="snow"
                  className="bg-white"
                  modules={{
                    toolbar: [
                      [{ 'header': '1' }, { 'header': '2' }, { 'font': [] }],
                      [{ size: [] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                      ['link', 'image'],
                      ['clean'] // remove formatting button
                    ]
                  }}
                  placeholder="Enter display text"
                />
              ) : (
                <div
                  className=""
                  dangerouslySetInnerHTML={{
                    __html: field.value || placeholder.main || 'This is display text',
                  }}
                />
              )}
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'formcalculation':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Calculation'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <input
              type="text"
              className={`p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
              placeholder={placeholder.main || 'Calculation result will appear here'}
              value={formula}
              readOnly
              pattern={field?.validation?.pattern}
              title={field?.validation?.description}
            />
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'rating':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Rating'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                {ratingOptions[ratingType].map((option, idx) => (
                  <button
                    key={option.value}
                    onClick={() => handleRatingClick(option.value)}
                    disabled={isDisabled}
                    className={`text-2xl ${selectedRating === option.value ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-500 focus:outline-none ${selectedTheme?.buttonText || ''}`}
                  >
                    {ratingType === 'star' ? (
                      selectedRating === option.value ? <AiFillStar /> : <AiOutlineStar />
                    ) : ratingType === 'heart' ? (
                      selectedRating === option.value ? <AiFillHeart /> : <AiOutlineHeart />
                    ) : ratingType === 'bulb' ? (
                      selectedRating === option.value ? <FaLightbulb /> : <FaRegLightbulb />
                    ) : ratingType === 'lightning' ? (
                      selectedRating === option.value ? <FaBolt /> : <FaBolt />
                    ) : (
                      option.symbol
                    )}
                  </button>
                ))}
              </div>
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'scalerating':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps} labelContent={
            <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
              {label || 'Scale Rating'}
              {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          }>
            <DynamicScaleRating
              rows={rows || ['Criteria 1', 'Criteria 2', 'Criteria 3']}
              columns={columns || ['1', '2', '3', '4', '5']}
              inputType={field.inputType}
              dropdownOptions={field.dropdownOptions}
              onUpdateRows={(newRows) => onUpdateField(id, { rows: newRows })}
              onUpdateColumns={(newColumns) => onUpdateField(id, { columns: newColumns })}
            />
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'divider':
      return (
        <SelectionWrapper>
          <FieldWrapper {...wrapperProps}>
            <hr className="border-gray-300" />
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'pagebreak':
      return (
        <div className="border-t-2 border-dashed border-gray-400 my-4" />
      );

    case 'section':
      return (
        <SelectionWrapper isSection>
          <div className="flex gap-2">
            <div
              className={`w-1/2 min-h-[100px] rounded ${subFields.leftField ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
              onDrop={(e) => handleSectionDrop(e, 'left')}
              onDragOver={handleDragOver}
              onDoubleClick={() => handleSectionDoubleClick('left')}
            >
              {subFields.leftField ? (
                <FormField
                  field={subFields.leftField}
                  isSelected={isSelected && sectionSide === 'left'}
                  onClick={onClick}
                  onDrop={onDrop}
                  onUpdateField={(fieldId, updates) => {
                    // Update the left field within subFields
                    const updatedSubFields = {
                      ...subFields,
                      leftField: { ...subFields.leftField, ...updates }
                    };
                    onUpdateField(id, { subFields: updatedSubFields });
                  }}
                  onDeleteField={(fieldId) => {
                    // Remove the left field
                    const updatedSubFields = {
                      ...subFields,
                      leftField: null
                    };
                    onUpdateField(id, { subFields: updatedSubFields });
                  }}
                  pageIndex={pageIndex}
                  sectionSide="left"
                  fields={fields}
                  setClipboard={setClipboard}
                  clipboard={clipboard}
                  handlePaste={() => handlePaste(pageIndex, null, id, 'left')}
                  selectedTheme={selectedTheme}
                />
              ) : (
                <p className="text-gray-500 text-center p-4">Drop field here</p>
              )}
            </div>
            <div
              className={`w-1/2 ${highlightedSide === 'right' ? 'rounded border-2 border-gray-500' : ''}`}
              onDrop={(e) => handleSectionDrop(e, 'right')}
              onDragOver={handleDragOver}
              onDoubleClick={() => handleSectionDoubleClick('right')}
            >
              {subFields.rightField ? (
                <FormField
                  field={subFields.rightField}
                  isSelected={isSelected && sectionSide === 'right'}
                  onClick={onClick}
                  onDrop={onDrop}
                  onUpdateField={(fieldId, updates) => {
                    // Update the right field within subFields
                    const updatedSubFields = {
                      ...subFields,
                      rightField: { ...subFields.rightField, ...updates }
                    };
                    onUpdateField(id, { subFields: updatedSubFields });
                  }}
                  onDeleteField={(fieldId) => {
                    // Remove the right field
                    const updatedSubFields = {
                      ...subFields,
                      rightField: null
                    };
                    onUpdateField(id, { subFields: updatedSubFields });
                  }}
                  pageIndex={pageIndex}
                  sectionSide="right"
                  fields={fields}
                  setClipboard={setClipboard}
                  clipboard={clipboard}
                  handlePaste={() => handlePaste(pageIndex, null, id, 'right')}
                  selectedTheme={selectedTheme}
                />
              ) : (
                <p className="text-gray-500 text-center p-4">Drop field here</p>
              )}
            </div>
          </div>
        </SelectionWrapper>
      );

    default:
      return null;
  }
}

export default FormField;