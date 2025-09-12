
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
import ImageUploader from './ImageUploader';

const DynamicScaleRating = ({ rows = [], columns = [], inputType = 'radio', dropdownOptions = [], onChange, onUpdateRows, onUpdateColumns, isEditable }) => {
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
          disabled = {!isEditable}
          className={`text-[#028ab0] text-sm ${!isEditable ? 'cursor-not-allowed opacity-50' : ''}`}
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
                <span onClick={() => setEditingColumn(colIdx)} className="cursor-pointer">
                    {colLabel}
                  </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowValues.map((rowLabel, rowIdx) => (
            <tr key={rowIdx}>
              <td className="border border-gray-300 bg-blue-100/50 p-2 font-semibold">
                <span onClick={() => setEditingRow(rowIdx)} className="cursor-pointer">
                    {rowLabel}
                  </span>
              </td>
              {columnValues.map((colLabel, colIdx) => (
                <td key={colIdx} className="border border-gray-300 p-2 text-center">
                  {inputType === 'radio' && (
                    <input
                      type="radio"
                      name={`scale-row-${rowIdx}`}
                      value={colLabel}
                      disabled={!isEditable}
                      checked={selectedValues[rowIdx] === colLabel}
                      onChange={() => handleChange(rowIdx, colLabel)}
                    />
                  )}
                  {inputType === 'checkbox' && (
                    <input
                      type="checkbox"
                      name={`scale-row-${rowIdx}-${colIdx}`}
                      value={colLabel}
                      disabled={!isEditable}
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
                      disabled={!isEditable}
                    />
                  )}
                  {inputType === 'dropdown' && (
                    <select
                      value={selectedValues[rowIdx] || ''}
                      onChange={(e) => handleChange(rowIdx, e.target.value)}
                      className="w-full p-1 border rounded"
                      disabled={!isEditable}
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
          disabled = {!isEditable}
          className={`text-[#028ab0] text-sm ${!isEditable ? 'cursor-not-allowed opacity-50' : ''}`}
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

function FormField({ field, isSelected, onClick, onDrop, index, pageIndex, sectionSide = null, onUpdateField, onDeleteField, fields, setClipboard, clipboard, handlePaste, selectedTheme, selectedFieldId, selectedSectionSide, isEditable=true }) {
  const {
    type, subFields = {}, id, label, options: initialOptions, labelAlignment = 'top', heading, isRequired,
    rows, columns, formula = '', placeholder = {}, ratingType = 'emoji', isDisabled = false, showHelpText = false,
    helpText = '', alignment = 'center', isCut = false, sectionId, columnCount = 1,
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
  const [imageDesign, setImageDesign] = useState({});
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
    setHighlightedSide(side); // Highlight the selected side
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

  const SelectionWrapper = ({ children, isSection = false, sectionSide = null }) => (
    <div
      className={`relative cursor-pointer group  ${isSelected ? 'border-2 rounded-lg w-[95%]' : ''} ${isCut ? 'opacity-50 blur-sm' : ''}`}
      style={
        isSelected
          ? {
            padding: isSection ? '10px' : '15px',
            zIndex: 10,
            position: 'relative',
            borderImage: 'linear-gradient(to right, #008AB0, #8FDCF1) 1', // blue gradient border
          }
          : {}
      }
      onClick={(e) => {
        e.stopPropagation();
        setHighlightedSide(sectionSide);
        if (isSection) {
          onClick(id, sectionSide);
        } else {
          onClick(id);
        }
      }}
      onDoubleClick={isSection ? (e) => e.stopPropagation() : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating vertical button group */}
      {isSelected && type !== 'pagebreak' && (
        <div className="absolute top-1/2 -right-14 flex flex-col items-center gap-2 z-20 -translate-y-1/2 
                bg-white border border-gray-200 shadow-md p-2">
          <button
            onClick={isEditable ? handleCut : undefined}
            disabled={!isEditable}
            className={`p-1 ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Cut Field"
          >
            <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.6341 8.53603H13.3617M16.2723 8.53603H17M4.80156 4.89774C4.99463 4.68439 5.14362 4.43498 5.23996 4.16385C5.3363 3.89272 5.37808 3.60521 5.36291 3.31787C5.34774 3.03053 5.27591 2.74903 5.15156 2.48955C5.0272 2.23007 4.85278 1.99773 4.63831 1.8059C4.42385 1.61407 4.17357 1.46654 3.90189 1.37178C3.6302 1.27701 3.34246 1.2369 3.05521 1.25374C2.76796 1.27058 2.48688 1.34405 2.22813 1.4699C1.96937 1.59576 1.73805 1.77154 1.54748 1.98711C1.16547 2.41923 0.969989 2.98496 1.00375 3.56074C1.0375 4.13651 1.29775 4.67553 1.72764 5.06004C2.15752 5.44455 2.72211 5.64332 3.29807 5.61291C3.87403 5.5825 4.41455 5.32539 4.80156 4.89774ZM4.80156 4.89774L14.0894 12.902M4.80156 12.1743C4.99463 12.3877 5.14362 12.6371 5.23996 12.9082C5.3363 13.1793 5.37808 13.4668 5.36291 13.7542C5.34774 14.0415 5.27591 14.323 5.15156 14.5825C5.0272 14.842 4.85278 15.0743 4.63831 15.2662C4.42385 15.458 4.17357 15.6055 3.90189 15.7003C3.6302 15.795 3.34246 15.8352 3.05521 15.8183C2.76796 15.8015 2.48688 15.728 2.22813 15.6022C1.96937 15.4763 1.73805 15.3005 1.54748 15.0849C1.16547 14.6528 0.969989 14.0871 1.00375 13.5113C1.0375 12.9355 1.29775 12.3965 1.72764 12.012C2.15752 11.6275 2.72211 11.4287 3.29807 11.4591C3.87403 11.4896 4.41455 11.7467 4.80156 12.1743ZM4.80156 12.1743L14.0894 4.17008" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>

          </button>
          <button
            onClick={
              isEditable
                ? type === "paypal_payment"
                  ? (e) => {
                    e.stopPropagation();
                    alert(
                      "Payment fields cannot be copied. Only one payment field is allowed per form."
                    );
                  }
                  : handleCopy
                : undefined
            }
            disabled={!isEditable || type === "paypal_payment"}
            className={`p-1 ${!isEditable || type === "paypal_payment"
              ? "opacity-50 cursor-not-allowed"
              : ""
              }`}
            title={
              !isEditable
                ? "Form is not editable"
                : type === "paypal_payment"
                  ? "Payment fields cannot be copied"
                  : "Copy Field"
            }
          >

            <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.2316 1.16602H0.787109V12.4808" stroke="#5F6165" stroke-width="1.5" />
              <path d="M4.2688 4.64844H14.7132V15.0929C14.7132 15.5546 14.5298 15.9973 14.2034 16.3238C13.8769 16.6502 13.4342 16.8336 12.9725 16.8336H6.00954C5.54787 16.8336 5.1051 16.6502 4.77865 16.3238C4.4522 15.9973 4.2688 15.5546 4.2688 15.0929V4.64844Z" stroke="#5F6165" stroke-width="1.5" />
            </svg>

          </button>
          <button
            onClick={
              isEditable
                ? (e) => {
                  e.stopPropagation();
                  onDeleteField(id);
                }
                : undefined
            }
            disabled={!isEditable}
            className={`p-1 ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
            title={isEditable ? "Delete Field" : "Form is not editable"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="20" viewBox="0 0 48 48">
              <path d="M 24 4 C 20.491685 4 17.570396 6.6214322 17.080078 10 L 10.238281 10 A 1.50015 1.50015 0 0 0 9.9804688 9.9785156 A 1.50015 1.50015 0 0 0 9.7578125 10 L 6.5 10 A 1.50015 1.50015 0 1 0 6.5 13 L 8.6386719 13 L 11.15625 39.029297 C 11.427329 41.835926 13.811782 44 16.630859 44 L 31.367188 44 C 34.186411 44 36.570826 41.836168 36.841797 39.029297 L 39.361328 13 L 41.5 13 A 1.50015 1.50015 0 1 0 41.5 10 L 38.244141 10 A 1.50015 1.50015 0 0 0 37.763672 10 L 30.919922 10 C 30.429604 6.6214322 27.508315 4 24 4 z M 24 7 C 25.879156 7 27.420767 8.2681608 27.861328 10 L 20.138672 10 C 20.579233 8.2681608 22.120844 7 24 7 z M 11.650391 13 L 36.347656 13 L 33.855469 38.740234 C 33.730439 40.035363 32.667963 41 31.367188 41 L 16.630859 41 C 15.331937 41 14.267499 40.033606 14.142578 38.740234 L 11.650391 13 z M 20.476562 17.978516 A 1.50015 1.50015 0 0 0 19 19.5 L 19 34.5 A 1.50015 1.50015 0 1 0 22 34.5 L 22 19.5 A 1.50015 1.50015 0 0 0 20.476562 17.978516 z M 27.476562 17.978516 A 1.50015 1.50015 0 0 0 26 19.5 L 26 34.5 A 1.50015 1.50015 0 1 0 29 34.5 L 29 19.5 A 1.50015 1.50015 0 0 0 27.476562 17.978516 z"></path>
            </svg>

          </button>
        </div>
      )}

      {children}

      {/* Paste Here button with full-width lines */}
      {isHovered && isEditable &&
        clipboard.field &&
        type !== 'pagebreak' &&
        !sectionId &&
        !isCut && (
          <div className="flex items-center w-full my-2">
            <div className="flex-grow h-px bg-gradient-to-r from-[#008ab0] to-[#8fdcf1]"></div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePaste(index, null, null);
              }}
              className="px-4 py-1 text-center text-[#0b295ee6] hover:bg-blue-50 z-20 whitespace-nowrap"
            >
              Paste Here
            </button>
            <div className="flex-grow h-px  bg-gradient-to-l from-[#008ab0] to-[#8fdcf1]"></div>
          </div>
        )}
    </div>
  );

  const wrapperProps = {
    alignment: labelAlignment,
    showHelpText,
    helpText
  };

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
                disabled={!isEditable || isDisabled}
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
                disabled={!isEditable || isDisabled}
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
                disabled={!isEditable || isDisabled}
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
              disabled={!isEditable}
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
                disabled={!isEditable}
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
              disabled={!isEditable}
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
                      disabled={!isEditable || isDisabled}
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
                      disabled={!isEditable || isDisabled}
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
                  disabled={!isEditable || isDisabled}
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
                disabled={!isEditable}
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
                  disabled={!isEditable}
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
                  disabled={!isEditable}
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
            <div className="w-full">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: columnCount === 1 ? '1fr' : `repeat(${columnCount}, minmax(0, 1fr))`,
                  width: '100%'
                }}
              >
                {localOptions.map((opt, idx) => (
                  <div key={opt} className="flex items-center gap-1 min-w-0">
                    <input type="checkbox" className="flex-shrink-0" disabled={!isEditable || isDisabled} pattern={field?.validation?.pattern} title={field?.validation?.description} />
                    <div
                      className={`p-1 rounded flex-grow min-w-0 truncate ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                      title={opt}
                    >{opt}</div>
                    {isEditable && (
                      <button
                        onClick={() => handleRemoveOption(idx)}
                        className={`text-red-500 hover:text-red-700 flex-shrink-0 ${selectedTheme?.buttonText || ''}`}
                      >
                        <FaTrash size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {isEditable && (
              <button
                onClick={handleAddOption}
                className={`text-[#028ab0] text-xs hover:underline mt-2 ${selectedTheme?.buttonText || ''}`}
              >
                + Add Item
              </button>
            )}

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
            <div className="w-full">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: columnCount === 1 ? '1fr' : `repeat(${columnCount}, minmax(0, 1fr))`,
                  width: '100%'
                }}
              >
                {localOptions.map((opt, idx) => (
                  <div key={opt} className="flex items-center gap-1 min-w-0">
                    <input type="radio" name={`radio-${id}`} className="flex-shrink-0" disabled={!isEditable || isDisabled} />
                    <div
                      className={`p-1 flex-grow min-w-0 truncate ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                      title={opt}
                    >{opt}</div>
                    {isEditable && (
                      <button
                        onClick={() => handleRemoveOption(idx)}
                        className={`text-red-500 hover:text-red-700 flex-shrink-0 ${selectedTheme?.buttonText || ''}`}
                      >
                        <FaTrash size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {isEditable && (
              <button
                onClick={handleAddOption}
                className={`text-[#028ab0] text-xs hover:underline mt-2 ${selectedTheme?.buttonText || ''}`}
              >
                + Add Item
              </button>
            )}
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
                className={`w-full p-2 border rounded cursor-pointer flex justify-between items-center ${isDisabled || !isEditable ? 'bg-gray-50' : 'bg-white'} ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                onClick={() => !isDisabled &&  isEditable && setIsDropdownOpen(!isDropdownOpen)}
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
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  {allowedFileTypes ? `Supported: ${allowedFileTypes}` : 'Any file type'}
                  {maxFileSize && ` • Max size: ${maxFileSize}MB`}
                </p>
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  accept={allowedFileTypes ? allowedFileTypes.split(',').map(type => `.${type.trim()}`).join(',') : undefined}
                  multiple={multipleFiles}
                  disabled={!isEditable || isDisabled}
                  pattern={field?.validation?.pattern}
                  title={field?.validation?.description}
                />
              </div>
            </div>
          </FieldWrapper>
        </SelectionWrapper>
      );

   case 'imageuploader':
  return (
    <SelectionWrapper>
      <FieldWrapper {...wrapperProps}>
        <div
          style={{
            display: 'flex',
            justifyContent: field?.imageAlign || 'center',
          }}
        >
          <ImageUploader
            defaultImage={
              field?.backgroundImage ||
              imageDesign?.backgroundImage ||
              "https://quickform-images.s3.us-east-1.amazonaws.com/quickform-only-logo.png"
            }
            onImageUpload={(newDesign) => {
              if (!isEditable) return; // Prevent update if not editable
              setImageDesign(newDesign);
              if (onUpdateField) {
                onUpdateField(id, { backgroundImage: newDesign.backgroundImage });
              }
            }}
            style={{
              width: field?.imageWidth ? `${field.imageWidth}px` : "200px",
              height: field?.imageHeight ? `${field.imageHeight}px` : "150px",
              opacity: 1, // Greyed out look if not editable
              pointerEvents: !isEditable ? "none" : "auto", // Block interaction
              cursor: !isEditable ? "not-allowed" : "pointer",
            }}
          />
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
              <input type="checkbox" className="sr-only peer" disabled={!isEditable || isDisabled} checked={isChecked} onChange={handleToggleChange} pattern={field?.validation?.pattern}
                title={field?.validation?.description} />
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
                disabled={!isEditable}
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
                    disabled={isEditable || isDisabled}
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
                  disabled={!isEditable}
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
                  disabled={!isEditable}
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
            {(() => {
              // Create an intelligent layout based on visible fields
              const renderAddressField = (key, field) => (
                <div key={key} className="w-full">
                  <label className={`text-xs text-gray-500 ${selectedTheme?.textColor || ''}`}>
                    {field?.label || key.charAt(0).toUpperCase() + key.slice(1)}
                    {field?.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    className={`w-full p-2 border rounded ${selectedTheme?.inputText || ''} ${selectedTheme?.inputBg || ''}`}
                    placeholder={field?.placeholder || `Enter ${key}`}
                    value={field?.value || ''}
                    onChange={(e) => handleSubFieldChange(key, { value: e.target.value })}
                    readOnly={isDisabled}
                    disabled={!isEditable}
                    required={field?.isRequired}
                  />
                </div>
              );

              // Get visible fields in order
              const fieldOrder = ['street', 'street2', 'city', 'state', 'country', 'postal'];
              const visibleFields = fieldOrder.filter(key => subFields[key]?.visible);

              if (visibleFields.length === 0) return null;

              // Create layout groups
              const layout = [];
              let i = 0;

              // First, handle street and street2 (always full width)
              while (i < visibleFields.length && (visibleFields[i] === 'street' || visibleFields[i] === 'street2')) {
                layout.push({
                  type: 'fullWidth',
                  fields: [visibleFields[i]]
                });
                i++;
              }

              // Group remaining fields in pairs
              while (i < visibleFields.length) {
                if (i + 1 < visibleFields.length) {
                  layout.push({
                    type: 'twoColumns',
                    fields: [visibleFields[i], visibleFields[i + 1]]
                  });
                  i += 2;
                } else {
                  layout.push({
                    type: 'fullWidth',
                    fields: [visibleFields[i]]
                  });
                  i++;
                }
              }

              return (
                <div className="flex flex-col gap-3">
                  {layout.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className={row.type === 'twoColumns'
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                        : 'w-full'
                      }
                    >
                      {row.fields.map(fieldKey =>
                        renderAddressField(fieldKey, subFields[fieldKey])
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
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
              disabled={!isEditable}
              pattern={field?.validation?.pattern}
              title={field?.validation?.description}
            />
          </FieldWrapper>
        </SelectionWrapper>
      );

    case 'signature':
  return (
    <SelectionWrapper>
      <FieldWrapper
        {...wrapperProps}
        labelContent={
          <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
            {label || 'Signature'}
            {isHidden && <FaEyeSlash className="text-gray-400" title="Hidden Field" />}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        }
      >
        <div className="flex flex-col gap-2">
          <div
            className={`border rounded w-full h-32 bg-white relative ${
              !isEditable || isDisabled ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-full',
                style: { backgroundColor: '#fff' },
              }}
              onEnd={() => {
                if (isEditable && !isDisabled) {
                  saveSignature();
                }
              }}
            />
            {/* Overlay when not editable */}
            {(!isEditable || isDisabled) && (
              <div className="absolute inset-0 bg-transparent cursor-not-allowed"></div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={clearSignature}
              className={`px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 ${selectedTheme?.buttonText || ''}`}
              disabled={!isEditable || isDisabled}
            >
              Clear
            </button>

            {isSigned && signatureData && (
              <img
                src={signatureData}
                alt="Signature"
                className="w-32 h-16 object-contain border rounded"
              />
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
                disabled={!isEditable || isDisabled}
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
      <FieldWrapper
        {...wrapperProps}
        labelContent={
          <label className={`text-gray-700 ${selectedTheme?.textColor || ''}`}>
            {isHidden && (
              <FaEyeSlash className="text-gray-400" title="Hidden Field" />
            )}
          </label>
        }
      >
        <div
          className={`bg-white rounded-lg shadow-sm p-3 my-2 min-h-[60px] ${
            isEditable ? 'cursor-pointer' : 'cursor-default opacity-80'
          }`}
          ref={displayTextRef}
          onClick={() => {
            if (isEditable) {
              setIsEditingDisplayText(true);
            }
          }}
        >
          {isEditingDisplayText && isEditable ? (
            <ReactQuill
              value={field.value || ''}
              onChange={(value) => {
                if (onUpdateField) onUpdateField(id, { value });
              }}
              theme="snow"
              className="bg-white"
              modules={{
                toolbar: [
                  [{ header: '1' }, { header: '2' }, { font: [] }],
                  [{ size: [] }],
                  [
                    'bold',
                    'italic',
                    'underline',
                    'strike',
                    'blockquote',
                  ],
                  [
                    { list: 'ordered' },
                    { list: 'bullet' },
                    { indent: '-1' },
                    { indent: '+1' },
                  ],
                  ['link', 'image'],
                  ['clean'],
                ],
              }}
              placeholder="Enter display text"
            />
          ) : (
            <div
              dangerouslySetInnerHTML={{
                __html:
                  field.value || placeholder.main || 'This is display text',
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
                    disabled={!isEditable || isDisabled}
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
              isEditable={isEditable}
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
        <div className="flex gap-2">
          {/* Left Side */}
          <div
            className={`w-1/2 min-h-[100px] rounded ${highlightedSide === 'left' ? 'border-2 border-blue-500' : 'border-gray-300'
              }`}
            onDrop={(e) => handleSectionDrop(e, 'left')}
            onDragOver={handleDragOver}
            onDoubleClick={() => handleSectionDoubleClick('left')}
            onClick={(e) => onClick(field.id, "left")}
          >
            {subFields.leftField ? (
              <SelectionWrapper
                isSection
                sectionSide="left"
                isSelected={selectedFieldId === subFields.leftField?.id && selectedSectionSide === "left"}              >
                <FormField
                  field={subFields.leftField}
                  isSelected={selectedFieldId === subFields.leftField?.id && selectedSectionSide === "left"} onClick={(fid) => onClick(fid, 'left')}
                  onDrop={onDrop}
                  onUpdateField={(fieldId, updates) => {
                    const updatedSubFields = {
                      ...subFields,
                      leftField: { ...subFields.leftField, ...updates },
                    };
                    onUpdateField(id, { subFields: updatedSubFields });
                  }}
                  onDeleteField={(fieldId) => {
                    const updatedSubFields = {
                      ...subFields,
                      leftField: null,
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
                  selectedFieldId={selectedFieldId}
                  selectedSectionSide={selectedSectionSide}
                  isEditable={isEditable}
                />
              </SelectionWrapper>
            ) : (
              <p className="text-gray-500 text-center p-4">Drop field here</p>
            )}
          </div>

          {/* Right Side */}
          <div
            className={`w-1/2 min-h-[100px] rounded ${highlightedSide === 'right' ? 'border-2 border-blue-500' : 'border-gray-300'
              }`}
            onDrop={(e) => handleSectionDrop(e, 'right')}
            onDragOver={handleDragOver}
            onDoubleClick={() => handleSectionDoubleClick('right')}
            onClick={(e) => onClick(field.id, "right")}
          >
            {subFields.rightField ? (
              <SelectionWrapper
                isSection
                sectionSide="right"
                isSelected={selectedFieldId === subFields.rightField?.id && selectedSectionSide === "right"}
              >
                <FormField
                  field={subFields.rightField}
                  isSelected={selectedFieldId === subFields.rightField?.id && selectedSectionSide === "right"}
                  onClick={(fid) => onClick(fid, 'right')}
                  onDrop={onDrop}
                  onUpdateField={(fieldId, updates) => {
                    const updatedSubFields = {
                      ...subFields,
                      rightField: { ...subFields.rightField, ...updates },
                    };
                    onUpdateField(id, { subFields: updatedSubFields });
                  }}
                  onDeleteField={(fieldId) => {
                    const updatedSubFields = {
                      ...subFields,
                      rightField: null,
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
                  selectedFieldId={selectedFieldId}
                  selectedSectionSide={selectedSectionSide}
                  isEditable={isEditable}
                />
              </SelectionWrapper>
            ) : (
              <p className="text-gray-500 text-center p-4">Drop field here</p>
            )}
          </div>
        </div>
      );

    case "paypal_payment":
      return (
        <SelectionWrapper>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-blue-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.65 3.85-3.197 5.341-6.965 5.341h-2.312c-.228 0-.42.15-.472.374l-.718 4.54-.206 1.308-.144.911a.641.641 0 0 0 .633.74h3.94c.524 0 .968-.382 1.05-.9l.048-.302.718-4.54.048-.302c.082-.518.526-.9 1.05-.9h.662c3.606 0 6.426-1.462 7.25-5.69.343-1.77.133-3.253-.933-4.119z" />
              </svg>
              <span className="font-medium text-gray-700">
                {subFields?.fieldLabel || "Payment Information"}
              </span>
            </div>

            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="space-y-3">
                <div className="text-gray-600">
                  <svg
                    className="w-8 h-8 mx-auto mb-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <p className="text-sm font-medium">PayPal Payment Field</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {subFields?.paymentType === "subscription"
                      ? "Subscription Payment"
                      : subFields?.paymentType === "donation"
                        ? "Donation Payment"
                        : "One-time Payment"}
                  </p>
                </div>

                {subFields?.amount?.type === "fixed" &&
                  subFields?.amount?.value > 0 && (
                    <div className="text-lg font-semibold text-gray-700">
                      ${subFields.amount.value}{" "}
                      {subFields?.amount?.currency || "USD"}
                    </div>
                  )}

                {subFields?.amount?.type === "variable" && (
                  <div className="text-sm text-gray-600">
                    Variable amount
                    {subFields?.amount?.minAmount &&
                      subFields?.amount?.maxAmount &&
                      ` ($${subFields.amount.minAmount} - $${subFields.amount.maxAmount})`}
                  </div>
                )}

                <div className="flex justify-center gap-2 mt-3">
                  {subFields?.paymentMethods?.paypal && (
                    <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      PayPal
                    </div>
                  )}
                  {subFields?.paymentMethods?.cards && (
                    <div className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      Cards
                    </div>
                  )}
                  {subFields?.paymentMethods?.venmo && (
                    <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      Venmo
                    </div>
                  )}
                  {subFields?.paymentMethods?.googlePay && (
                    <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      Google Pay
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Configure payment settings in the field editor
                </p>
              </div>
            </div>
          </div>
        </SelectionWrapper>
      );

    default:
      return null;
  }
}

export default FormField;