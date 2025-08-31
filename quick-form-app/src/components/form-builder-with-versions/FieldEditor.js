import React, { useState, useEffect } from "react";
import FormCalculationWidget from "./FormCalculationWidget";
import {
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaRegLightbulb,
  FaTrash,
  FaArrowsAltV,
  FaInfoCircle,
} from "react-icons/fa";
import { AiOutlineStar, AiOutlineHeart } from "react-icons/ai";
import { BiBoltCircle } from "react-icons/bi";
import EmojiPicker from "emoji-picker-react";
import { getCountryList } from "./getCountries";
import ToggleSwitch from "./ToggleSwitch";
import { DatePicker } from "rsuite";
import { ColorPicker } from "antd";
import PaymentFieldEditor from "./payment-fields/PaymentFieldEditor";

// FieldEditor component for editing form fields and footer buttons
function FieldEditor({
  selectedField,
  selectedFooter,
  onUpdateField,
  onDeleteField,
  onClose,
  fields,
  fieldsets,
  onAddFieldsFromFieldset,
  footerConfigs,
  setFooterConfigs,
  userId = null, // Add userId prop
  formId = null,
}) {
  // State for common properties
  const [label, setLabel] = useState(selectedField?.label || "");
  const [placeholder, setPlaceholder] = useState(
    selectedField?.placeholder || {}
  );
  const [isRequired, setIsRequired] = useState(
    selectedField?.isRequired || false
  );
  const [labelAlignment, setLabelAlignment] = useState(
    selectedField?.labelAlignment || "top"
  );

  // State for additional properties (field-specific)
  const [options, setOptions] = useState(selectedField?.options || []);
  const [rows, setRows] = useState(selectedField?.rows || ["Criteria 1", "Criteria 2", "Criteria 3"]);
  const [columns, setColumns] = useState(selectedField?.columns || ["1", "2", "3", "4", "5"]);

  // State for rating-specific properties
  const [ratingType, setRatingType] = useState(
    selectedField?.ratingType || "emoji"
  );
  const [ratingRange, setRatingRange] = useState(
    selectedField?.ratingRange || 5
  );
  const [ratingValues, setRatingValues] = useState(
    selectedField?.ratingValues ||
    Array(selectedField?.ratingRange || 5)
      .fill("")
      .map((_, i) => `Rating ${i + 1}`)
  );
  const [ratingEmojis, setRatingEmojis] = useState(
    selectedField?.ratingEmojis ||
    Array(selectedField?.ratingRange || 5)
      .fill("")
      .map((_, i) => ["😞", "🙁", "😐", "🙂", "😀"][i % 5])
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);

  // State for email-specific properties
  const [maxChars, setMaxChars] = useState(selectedField?.maxChars || "");
  const [allowedDomains, setAllowedDomains] = useState(
    selectedField?.allowedDomains || ""
  );
  const [enableConfirmation, setEnableConfirmation] = useState(
    selectedField?.enableConfirmation || false
  );
  const [enableVerification, setEnableVerification] = useState(
    selectedField?.enableVerification || false
  );

  // State for address-specific properties (integrated into subFields)
  const [subFields, setSubFields] = useState(
    selectedField?.subFields || {
      street: {
        visible: true,
        label: "Street Address",
        value: "",
        placeholder: "Enter street",
        isRequired: false,
      },
      street2: {
        visible: true,
        label: "Street Address 2",
        value: "",
        placeholder: "Enter street address 2",
        isRequired: false,
      },
      city: {
        visible: true,
        label: "City",
        value: "",
        placeholder: "Enter city",
        isRequired: false,
      },
      state: {
        visible: true,
        label: "State",
        value: "",
        placeholder: "Enter state",
        isRequired: false,
      },
      country: {
        visible: true,
        label: "Country",
        value: "",
        placeholder: "Enter country",
        isRequired: false,
      },
      postal: {
        visible: true,
        label: "Postal Code",
        value: "",
        placeholder: "Enter postal code",
        isRequired: false,
      },
    }
  );

  // State for fullname-specific properties (integrated into subFields)
  const defaultFullnameSubFields = {
    salutation: {
      enabled: false,
      options: ["Mr.", "Mrs.", "Ms.", "Dr."],
      value: "",
      placeholder: "Select Salutation",
    },
    firstName: { value: "", placeholder: "First Name" },
    lastName: { value: "", placeholder: "Last Name" },
  };

  const [fullnameSubFields, setFullnameSubFields] = useState(() => {
    if (!selectedField?.subFields) return defaultFullnameSubFields;

    return {
      ...defaultFullnameSubFields,
      ...selectedField.subFields,
      salutation: {
        ...defaultFullnameSubFields.salutation,
        ...selectedField.subFields?.salutation,
      },
      firstName: {
        ...defaultFullnameSubFields.firstName,
        ...selectedField.subFields?.firstName,
      },
      lastName: {
        ...defaultFullnameSubFields.lastName,
        ...selectedField.subFields?.lastName,
      },
    };
  });

  const [phoneSubFields, setPhoneSubFields] = useState(
    selectedField?.subFields || {
      countryCode: {
        enabled: true,
        value: "US",
        placeholder: "Select country code",
        options: [],
      },
      phoneNumber: {
        value: "",
        placeholder: "Enter phone number",
        phoneMask: "(999) 999-9999",
      },
    }
  );

  const VALIDATION_OPTIONS = [
    { value: "none", label: "No validation", regex: "" },
    { value: "alphabetic", label: "Alphabetic only", regex: "^[A-Za-z\\s]+$" },
    {
      value: "alphanumeric",
      label: "Alphanumeric",
      regex: "^[A-Za-z0-9\\s]+$",
    },
    { value: "numeric", label: "Numeric only", regex: "^[0-9]+$" },
    {
      value: "email",
      label: "Email",
      regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
    },
    {
      value: "no_special_chars",
      label: "No special characters",
      regex: "^[A-Za-z0-9\\s]+$",
    },
  ];

  // State for fileupload-specific properties
  const [maxFileSize, setMaxFileSize] = useState(
    selectedField?.maxFileSize || ""
  );
  const [allowedFileTypes, setAllowedFileTypes] = useState(
    selectedField?.allowedFileTypes || ""
  );
  const [multipleFiles, setMultipleFiles] = useState(
    selectedField?.multipleFiles || false
  );

  // State for advanced properties
  const [isDisabled, setIsDisabled] = useState(
    selectedField?.isDisabled || false
  );
  const [showHelpText, setShowHelpText] = useState(
    selectedField?.showHelpText || false
  );
  const [helpText, setHelpText] = useState(selectedField?.helpText || "");

  // State for terms-specific properties
  const [makeAsLink, setMakeAsLink] = useState(
    selectedField?.makeAsLink || false
  );
  const [termsLinkUrl, setTermsLinkUrl] = useState(
    selectedField?.termsLinkUrl || ""
  );

  // State for date and datetime-specific properties
  const [dateSeparator, setDateSeparator] = useState(
    selectedField?.dateSeparator || "-"
  );
  const [dateFormat, setDateFormat] = useState(
    selectedField?.dateFormat || "MM/dd/yyyy"
  );
  const [defaultDate, setDefaultDate] = useState(
    selectedField?.defaultDate || ""
  );
  const [weekStartDay, setWeekStartDay] = useState(
    selectedField?.weekStartDay || "Sunday"
  );
  const [customMonthLabels, setCustomMonthLabels] = useState(
    selectedField?.customMonthLabels || [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
  );
  const [customDayLabels, setCustomDayLabels] = useState(
    selectedField?.customDayLabels || [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]
  );
  const [customTodayLabel, setCustomTodayLabel] = useState(
    selectedField?.customTodayLabel || "Today"
  );
  const [enableAgeVerification, setEnableAgeVerification] = useState(
    selectedField?.enableAgeVerification || false
  );
  const [minAge, setMinAge] = useState(selectedField?.minAge || 18);
  const [dateRange, setDateRange] = useState(
    selectedField?.dateRange || { start: "", end: "" }
  );
  const [disabledDates, setDisabledDates] = useState(
    selectedField?.disabledDates || []
  );

  // State for datetime-specific properties
  const [datetimeRange, setDatetimeRange] = useState(
    selectedField?.datetimeRange || { start: "", end: "" }
  );

  // State for time-specific properties
  const [timeFormat, setTimeFormat] = useState(
    selectedField?.timeFormat || "HH:mm"
  );
  const [defaultTime, setDefaultTime] = useState(
    selectedField?.defaultTime || ""
  );
  const [restrictAmPm, setRestrictAmPm] = useState(
    selectedField?.restrictAmPm || ""
  );

  // State for tab navigation
  const [activeTab, setActiveTab] = useState("settings");

  // State for expandable sections (allow multiple sections to be open)
  const [expandedSections, setExpandedSections] = useState(["common"]);

  const [showMultiRowModal, setShowMultiRowModal] = useState(false);
  const [showMultiColumnModal, setShowMultiColumnModal] = useState(false);
  const [multiRowInput, setMultiRowInput] = useState("");
  const [multiColumnInput, setMultiColumnInput] = useState("");

  const [inputType, setInputType] = useState(
    selectedField?.inputType || "radio"
  );
  const [dropdownOptionsInput, setDropdownOptionsInput] = useState(
    (selectedField?.dropdownOptions || []).join("\n")
  );

  const [shortTextMaxChars, setShortTextMaxChars] = useState(
    selectedField?.shortTextMaxChars || ""
  );
  const [isRichText, setIsRichText] = useState(
    selectedField?.isRichText || false
  );
  const [longTextMaxChars, setLongTextMaxChars] = useState(
    selectedField?.longTextMaxChars || ""
  );
  const [numberValueLimits, setNumberValueLimits] = useState(
    selectedField?.numberValueLimits || { enabled: false, min: "", max: "" }
  );
  const [relatedValues, setRelatedValues] = useState(
    selectedField?.[`${selectedField?.type}RelatedValues`] || {}
  );
  const [predefinedOptionSet, setPredefinedOptionSet] = useState("");
  const [validationType, setValidationType] = useState(
    selectedField?.validationType || "none"
  );

  // State for price-specific properties
  const [priceLimits, setPriceLimits] = useState(
    selectedField?.priceLimits || { enabled: false, min: "", max: "" }
  );
  const [currencyType, setCurrencyType] = useState(
    selectedField?.currencyType || "USD"
  );

  // NEW: State for dropdown-specific properties
  const [allowMultipleSelections, setAllowMultipleSelections] = useState(
    selectedField?.allowMultipleSelections || false
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    selectedField?.shuffleOptions || false
  );
  const [dragIndex, setDragIndex] = useState(null);
  const [dropdownRelatedValues, setDropdownRelatedValues] = useState(
    selectedField?.dropdownRelatedValues || { "Option 1": "Option 1", "Option 2": "Option 2", 'Option 3': 'Option 3' }
  );

  // NEW : Default value / Hidden Feature / Unique Name
  const [defaultValue, setDefaultValue] = useState(
    selectedField?.defaultValue || ""
  );
  const [isHidden, setIsHidden] = useState(selectedField?.isHidden || false);
  const [uniqueName, setUniqueName] = useState(selectedField?.id || "");
  const [uniqueNameError, setUniqueNameError] = useState("");
  const [headingText, setHeadingText] = useState(
    selectedField?.heading || "Form Head"
  );
  const [headingAlignment, setHeadingAlignment] = useState(
    selectedField?.alignment || "center"
  );

  // NEW: Column count for checkbox and radio fields
  const [columnCount, setColumnCount] = useState(
    selectedField?.columnCount || 1
  );
  const [minSelection, setMinSelection] = useState(selectedField?.minSelection || 0);
  const [maxSelection, setMaxSelection] = useState(selectedField?.maxSelection || 0);


  useEffect(() => {
    if (
      selectedField &&
      selectedField.type === "scalerating" &&
      (
        !selectedField.rows ||
        !selectedField.columns ||
        !selectedField.inputType
      )
    ) {
      onUpdateField(selectedField.id, {
        rows: selectedField.rows || ["Criteria 1", "Criteria 2", "Criteria 3"],
        columns: selectedField.columns || ["1", "2", "3", "4", "5"],
        inputType: selectedField.inputType || "radio",
      });
    }
  }, [selectedField, onUpdateField]);

  useEffect(() => {
    if (selectedField) {
      setLabel(selectedField.label || "");
      setPlaceholder(selectedField.placeholder || {});
      setIsRequired(selectedField.isRequired || false);
      setIsDisabled(selectedField.isDisabled || false);
      setShowHelpText(selectedField.showHelpText || false);
      setHelpText(selectedField.helpText || "");
      setLabelAlignment(selectedField.labelAlignment || "top");
      setRows(selectedField.rows || ["Criteria 1", "Criteria 2", "Criteria 3"]);
      setColumns(selectedField.columns || ["1", "2", "3", "4", "5"]);
      setOptions(selectedField.options || ["Option 1", "Option 2", "Option 3"]);
      setMinSelection(selectedField.minSelection || 0);
      setMaxSelection(selectedField.maxSelection || 0);
      setRatingType(selectedField.ratingType || "emoji");
      setRatingRange(selectedField.ratingRange || 5);
      setRatingValues(
        selectedField.ratingValues ||
        Array(selectedField.ratingRange || 5)
          .fill("")
          .map((_, i) => `Rating ${i + 1}`)
      );
      setRatingEmojis(
        selectedField.ratingEmojis ||
        Array(selectedField.ratingRange || 5)
          .fill("")
          .map((_, i) => ["😞", "🙁", "😐", "🙂", "😀"][i % 5])
      );
      setMaxChars(selectedField.maxChars || "");
      setAllowedDomains(selectedField.allowedDomains || "");
      setEnableConfirmation(selectedField.enableConfirmation || false);
      setEnableVerification(selectedField.enableVerification || false);
      // Initialize address subFields
      setSubFields(
        selectedField.subFields || {
          street: {
            visible: true,
            label: "Street Address",
            value: "",
            placeholder: "Enter street",
            isRequired: false,
          },
          street2: {
            visible: true,
            label: "Street Address 2",
            value: "",
            placeholder: "Enter street address 2",
            isRequired: false,
          },
          city: {
            visible: true,
            label: "City",
            value: "",
            placeholder: "Enter city",
            isRequired: false,
          },
          state: {
            visible: true,
            label: "State",
            value: "",
            placeholder: "Enter state",
            isRequired: false,
          },
          country: {
            visible: true,
            label: "Country",
            value: "",
            placeholder: "Enter country",
            isRequired: false,
          },
          postal: {
            visible: true,
            label: "Postal Code",
            value: "",
            placeholder: "Enter postal code",
            isRequired: false,
          },
        }
      );
      // Initialize fullname subFields
      const defaultFullnameSubFields = {
        salutation: {
          enabled: false,
          options: ["Mr.", "Mrs.", "Ms.", "Dr."],
          value: "",
          placeholder: "Select Salutation",
        },
        firstName: { value: "", placeholder: "First Name" },
        lastName: { value: "", placeholder: "Last Name" },
      };

      setFullnameSubFields({
        ...defaultFullnameSubFields,
        ...selectedField.subFields,
        salutation: {
          ...defaultFullnameSubFields.salutation,
          ...selectedField.subFields?.salutation,
        },
        firstName: {
          ...defaultFullnameSubFields.firstName,
          ...selectedField.subFields?.firstName,
        },
        lastName: {
          ...defaultFullnameSubFields.lastName,
          ...selectedField.subFields?.lastName,
        },
      });

      setInputType(selectedField.inputType || "radio");
      setDropdownOptionsInput((selectedField.dropdownOptions || []).join("\n"));
      setShortTextMaxChars(selectedField.shortTextMaxChars || "");
      setIsRichText(selectedField.isRichText || false);
      setLongTextMaxChars(selectedField.longTextMaxChars || "");
      setNumberValueLimits(
        selectedField.numberValueLimits || { enabled: false, min: "", max: "" }
      );
      setRelatedValues(
        selectedField[`${selectedField.type}RelatedValues`] || {}
      );
      setPriceLimits(
        selectedField.priceLimits || { enabled: false, min: "", max: "" }
      );
      setCurrencyType(selectedField.currencyType || "USD");

      setAllowMultipleSelections(
        selectedField.allowMultipleSelections || false
      );
      setShuffleOptions(selectedField.shuffleOptions || false);
      setDropdownRelatedValues(selectedField.dropdownRelatedValues || { "Option 1": "Option 1", "Option 2": "Option 2", 'Option 3': 'Option 3' });
      // NEW: Set default value / Hidden Feature / Unique Name
      setDefaultValue(selectedField.defaultValue || "");
      setIsHidden(selectedField.isHidden || false);
      setUniqueName(selectedField?.id || "");
      setUniqueNameError("");
      setColumnCount(selectedField.columnCount || 1);

      // Set default predefined option set based on options
      if (
        selectedField.options?.join(",") ===
        "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"
      ) {
        setPredefinedOptionSet("days");
      } else if (
        selectedField.options?.join(",") === "Week 1,Week 2,Week 3,Week 4"
      ) {
        setPredefinedOptionSet("week");
      } else if (selectedField.options?.join(",") === "Male,Female,Other") {
        setPredefinedOptionSet("gender");
      } else {
        setPredefinedOptionSet("");
      }
    }
  }, [selectedField, selectedFooter, fields]);

  const handleValidationTypeChange = (e) => {
    const value = e.target.value;
    setValidationType(value);

    // Find the selected option and get its regex
    const selectedOption = VALIDATION_OPTIONS.find(
      (opt) => opt.value === value
    );
    const regex = selectedOption?.regex || "";

    onUpdateField(selectedField.id, {
      validationType: value,
      validationRegex: regex,
    });
  };

  // Add handlers for multiple rows/columns
  const handleMultiRowSave = () => {
    const newRows = multiRowInput
      .split("\n")
      .map((row) => row.trim())
      .filter((row) => row);
    if (newRows.length > 0) {
      const updatedRows = [...rows, ...newRows];
      setRows(updatedRows);
      onUpdateField(selectedField.id, { rows: updatedRows });
    }
    setMultiRowInput("");
    setShowMultiRowModal(false);
  };

  const handleMultiColumnSave = () => {
    const newColumns = multiColumnInput
      .split("\n")
      .map((col) => col.trim())
      .filter((col) => col);
    if (newColumns.length > 0) {
      const updatedColumns = [...columns, ...newColumns];
      setColumns(updatedColumns);
      onUpdateField(selectedField.id, { columns: updatedColumns });
    }
    setMultiColumnInput("");
    setShowMultiColumnModal(false);
  };

  const handleRatingRangeChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= 10) {
      const newRatingValues = Array(value)
        .fill("")
        .map((_, i) => ratingValues[i] || `Rating ${i + 1}`);
      const newRatingEmojis = Array(value)
        .fill("")
        .map(
          (_, i) => ratingEmojis[i] || ["😞", "🙁", "😐", "🙂", "😀"][i % 5]
        );
      setRatingRange(value);
      setRatingValues(newRatingValues);
      setRatingEmojis(newRatingEmojis);
      onUpdateField(selectedField.id, {
        ratingRange: value,
        ratingValues: newRatingValues,
        ratingEmojis: newRatingEmojis,
      });
    }
  };

  const handleRatingValueChange = (index, value) => {
    const newRatingValues = [...ratingValues];
    newRatingValues[index] = value;
    setRatingValues(newRatingValues);
    onUpdateField(selectedField.id, { ratingValues: newRatingValues });
  };

  const handleEmojiChange = (index, emoji) => {
    const newRatingEmojis = [...ratingEmojis];
    newRatingEmojis[index] = emoji;
    setRatingEmojis(newRatingEmojis);
    setShowEmojiPicker(null);
    onUpdateField(selectedField.id, { ratingEmojis: newRatingEmojis });
  };

  const handleLabelChange = (e) => {
    setLabel(e.target.value);
    onUpdateField(selectedField.id, { label: e.target.value });
  };

  const handlePlaceholderChange = (key, value) => {
    const newPlaceholder = { ...placeholder, [key]: value };
    setPlaceholder(newPlaceholder);
    onUpdateField(selectedField.id, { placeholder: newPlaceholder });
  };

  const handleRequiredChange = (e) => {
    setIsRequired(e.target.checked);
    onUpdateField(selectedField.id, { isRequired: e.target.checked });
  };

  const handleAlignmentChange = (e) => {
    setLabelAlignment(e.target.value);
    onUpdateField(selectedField.id, { labelAlignment: e.target.value });
  };

  const handleRowChange = (index, value) => {
    const newRows = [...rows];
    newRows[index] = value;
    setRows(newRows);
    onUpdateField(selectedField.id, { rows: newRows });
  };

  const handleAddRow = () => {
    const newRows = [...rows, `Criteria ${rows.length + 1}`];
    setRows(newRows);
    onUpdateField(selectedField.id, { rows: newRows });
  };

  const handleColumnChange = (index, value) => {
    const newColumns = [...columns];
    newColumns[index] = value;
    setColumns(newColumns);
    onUpdateField(selectedField.id, { columns: newColumns });
  };

  // Handler for hidden feature
  const handleHiddenChange = (e) => {
    setIsHidden(e.target.checked);
    onUpdateField(selectedField.id, { isHidden: e.target.checked });
  };
  const handleAddColumn = () => {
    const newColumns = [...columns, `${columns.length + 1}`];
    setColumns(newColumns);
    onUpdateField(selectedField.id, { columns: newColumns });
  };

  // Handlers for fullname-specific properties
  const handleSalutationEnabledChange = (e) => {
    const newSubFields = {
      ...fullnameSubFields,
      salutation: {
        ...fullnameSubFields.salutation,
        enabled: e.target.checked,
      },
    };
    setFullnameSubFields(newSubFields);
    onUpdateField(selectedField.id, { subFields: newSubFields });
  };

  const handleSalutationOptionChange = (index, value) => {
    const newOptions = [...fullnameSubFields.salutation.options];
    newOptions[index] = value;
    const newSubFields = {
      ...fullnameSubFields,
      salutation: { ...fullnameSubFields.salutation, options: newOptions },
    };
    setFullnameSubFields(newSubFields);
    onUpdateField(selectedField.id, { subFields: newSubFields });
  };

  const handleAddSalutationOption = () => {
    const newOptions = [
      ...fullnameSubFields.salutation.options,
      `Salutation ${fullnameSubFields.salutation.options.length + 1}`,
    ];
    const newSubFields = {
      ...fullnameSubFields,
      salutation: { ...fullnameSubFields.salutation, options: newOptions },
    };
    setFullnameSubFields(newSubFields);
    onUpdateField(selectedField.id, { subFields: newSubFields });
  };

  const handleRemoveSalutationOption = (index) => {
    const newOptions = fullnameSubFields.salutation.options.filter(
      (_, i) => i !== index
    );
    const newSubFields = {
      ...fullnameSubFields,
      salutation: { ...fullnameSubFields.salutation, options: newOptions },
    };
    setFullnameSubFields(newSubFields);
    onUpdateField(selectedField.id, { subFields: newSubFields });
  };

  const handleFullnamePlaceholderChange = (key, value) => {
    const newSubFields = {
      ...fullnameSubFields,
      [key]: { ...fullnameSubFields[key], placeholder: value },
    };
    setFullnameSubFields(newSubFields);
    onUpdateField(selectedField.id, { subFields: newSubFields });
  };

  // Handlers for address-specific properties
  const handleAddressSubLabelChange = (key, value) => {
    const newSubFields = {
      ...subFields,
      [key]: { ...subFields[key], label: value },
    };
    setSubFields(newSubFields);
    onUpdateField(selectedField.id, { subFields: newSubFields });
  };

  const handleAddressVisibilityChange = (key) => {
    // Ensure the field exists with default values
    const defaultField = {
      visible: false,
      label:
        key === "street2"
          ? "Street Address 2"
          : key.charAt(0).toUpperCase() + key.slice(1),
      value: "",
      placeholder:
        key === "street2" ? "Enter street address 2" : `Enter ${key}`,
      isRequired: false,
    };

    const currentField = subFields[key] || defaultField;
    const newSubFields = {
      ...subFields,
      [key]: { ...currentField, visible: !currentField.visible },
    };
    setSubFields(newSubFields);
    onUpdateField(selectedField.id, { subFields: newSubFields });
  };

  const handleAddressRequiredChange = (key) => {
    // Ensure the field exists with default values
    const defaultField = {
      visible: true,
      label:
        key === "street2"
          ? "Street Address 2"
          : key.charAt(0).toUpperCase() + key.slice(1),
      value: "",
      placeholder:
        key === "street2" ? "Enter street address 2" : `Enter ${key}`,
      isRequired: false,
    };

    const currentField = subFields[key] || defaultField;
    const newSubFields = {
      ...subFields,
      [key]: { ...currentField, isRequired: !currentField.isRequired },
    };
    setSubFields(newSubFields);
    onUpdateField(selectedField.id, { subFields: newSubFields });
  };

  const handleAddressPlaceholderChange = (key, value) => {
    // Ensure the field exists with default values
    const defaultField = {
      visible: true,
      label:
        key === "street2"
          ? "Street Address 2"
          : key.charAt(0).toUpperCase() + key.slice(1),
      value: "",
      placeholder: value,
      isRequired: false,
    };

    const currentField = subFields[key] || defaultField;
    const newSubFields = {
      ...subFields,
      [key]: { ...currentField, placeholder: value },
    };
    setSubFields(newSubFields);
    onUpdateField(selectedField.id, { subFields: newSubFields });
  };

  // Handlers for fileupload-specific properties
  const handleMaxFileSizeChange = (e) => {
    const value = e.target.value;
    setMaxFileSize(value);
    onUpdateField(selectedField.id, { maxFileSize: value });
  };

  const handleAllowedFileTypesChange = (e) => {
    const value = e.target.value;
    setAllowedFileTypes(value);
    onUpdateField(selectedField.id, { allowedFileTypes: value });
  };

  const handleMultipleFilesChange = (value) => {
    setMultipleFiles(value);
    onUpdateField(selectedField.id, { multipleFiles: value });
  };

  // Handlers for terms-specific properties
  const handleMakeAsLinkChange = (e) => {
    setMakeAsLink(e.target.checked);
    onUpdateField(selectedField.id, { makeAsLink: e.target.checked });
  };

  const handleTermsLinkUrlChange = (e) => {
    const value = e.target.value;
    setTermsLinkUrl(value);
    onUpdateField(selectedField.id, { termsLinkUrl: value });
  };

  // Handlers for date and datetime-specific properties
  const handleDateSeparatorChange = (e) => {
    const value = e.target.value;
    setDateSeparator(value);
    onUpdateField(selectedField.id, { dateSeparator: value });
  };

  const handleDateFormatChange = (e) => {
    const value = e.target.value;
    setDateFormat(value);
    onUpdateField(selectedField.id, { dateFormat: value });
  };

  const handleDefaultDateChange = (e) => {
    const value = e.target.value;
    setDefaultDate(value);
    onUpdateField(selectedField.id, { defaultDate: value });
  };

  const handleWeekStartDayChange = (e) => {
    const value = e.target.value;
    setWeekStartDay(value);
    onUpdateField(selectedField.id, { weekStartDay: value });
  };

  const handleCustomMonthLabelChange = (index, value) => {
    const newLabels = [...customMonthLabels];
    newLabels[index] = value;
    setCustomMonthLabels(newLabels);
    onUpdateField(selectedField.id, { customMonthLabels: newLabels });
  };

  const handleCustomDayLabelChange = (index, value) => {
    const newLabels = [...customDayLabels];
    newLabels[index] = value;
    setCustomDayLabels(newLabels);
    onUpdateField(selectedField.id, { customDayLabels: newLabels });
  };

  const handleCustomTodayLabelChange = (e) => {
    const value = e.target.value;
    setCustomTodayLabel(value);
    onUpdateField(selectedField.id, { customTodayLabel: value });
  };

  const handleAgeVerificationChange = (e) => {
    const value = e.target.checked;
    setEnableAgeVerification(value);
    onUpdateField(selectedField.id, { enableAgeVerification: value });
  };

  const handleMinAgeChange = (e) => {
    const value = e.target.value;
    setMinAge(value);
    onUpdateField(selectedField.id, { minAge: value });
  };

  const handleDateRangeChange = (key, value) => {
    const newRange = { ...dateRange, [key]: value };
    setDateRange(newRange);
    onUpdateField(selectedField.id, { dateRange: newRange });
  };

  const handleDatetimeRangeChange = (key, value) => {
    const newRange = { ...datetimeRange, [key]: value };
    setDatetimeRange(newRange);
    onUpdateField(selectedField.id, { datetimeRange: newRange });
  };

  const handleAddDisabledDate = () => {
    const newDates = [...disabledDates, ""];
    setDisabledDates(newDates);
    onUpdateField(selectedField.id, { disabledDates: newDates });
  };

  const handleDisabledDateChange = (index, value) => {
    const newDates = [...disabledDates];
    newDates[index] = value;
    setDisabledDates(newDates);
    onUpdateField(selectedField.id, { disabledDates: newDates });
  };

  const handleRemoveDisabledDate = (index) => {
    const newDates = disabledDates.filter((_, i) => i !== index);
    setDisabledDates(newDates);
    onUpdateField(selectedField.id, { disabledDates: newDates });
  };

  // Handlers for time-specific properties
  const handleTimeFormatChange = (e) => {
    const value = e.target.value;
    setTimeFormat(value);
    onUpdateField(selectedField.id, { timeFormat: value });
  };

  const handleDefaultTimeChange = (e) => {
    const value = e.target.value;
    setDefaultTime(value);
    onUpdateField(selectedField.id, { defaultTime: value });
  };

  const handleRestrictAmPmChange = (e) => {
    const value = e.target.value;
    setRestrictAmPm(value);
    onUpdateField(selectedField.id, { restrictAmPm: value });
  };

  // Handlers for email-specific properties
  const handleMaxCharsChange = (e) => {
    const value = e.target.value;
    setMaxChars(value);
    onUpdateField(selectedField.id, { maxChars: value });
  };

  const handleAllowedDomainsChange = (e) => {
    const value = e.target.value;
    setAllowedDomains(value);
    onUpdateField(selectedField.id, { allowedDomains: value });
  };

  const handleConfirmationChange = (e) => {
    setEnableConfirmation(e.target.checked);
    onUpdateField(selectedField.id, { enableConfirmation: e.target.checked });
  };

  const handleVerificationChange = (e) => {
    setEnableVerification(e.target.checked);
    onUpdateField(selectedField.id, { enableVerification: e.target.checked });
  };

  // Handlers for advanced properties
  const handleDisabledChange = (e) => {
    setIsDisabled(e.target.checked);
    onUpdateField(selectedField.id, { isDisabled: e.target.checked });
  };

  const handleShowHelpTextChange = (e) => {
    setShowHelpText(e.target.checked);
    onUpdateField(selectedField.id, { showHelpText: e.target.checked });
  };

  const handleHelpTextChange = (e) => {
    setHelpText(e.target.value);
    onUpdateField(selectedField.id, { helpText: e.target.value });
  };

  //handle for form heading
  const handleHeadingTextChange = (e) => {
    setHeadingText(e.target.value);
    onUpdateField(selectedField.id, { heading: e.target.value });
  };
  const handleHeadingAlignmentChange = (e) => {
    setHeadingAlignment(e.target.value);
    onUpdateField(selectedField.id, { alignment: e.target.value });
  };
  // Toggle expandable sections (allow multiple sections to be open)
  const toggleSection = (section) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  // Helper function to check if additional properties section has content
  const hasAdditionalProperties = () => {
    if (!selectedField) return false;

    const isScaleRating = selectedField.type === "scalerating";
    // const isImageUploader = selectedField.type === 'imageuploader';
    const hasOptions =
      isOptionsSupported && ["checkbox", "radio"].includes(selectedField.type);
    const hasDropdownOptions =
      isDropdownSupported && selectedField.type === "dropdown";
    const hasAddress = isAddress;
    const hasFullname = isFullname;
    const hasPhone = isPhone;
    const hasEmail = isEmail;
    const hasFileUpload =
      isFileUploadSupported && selectedField.type === "fileupload";
    const hasShortText =
      isShortTextSupported && selectedField.type === "shorttext";
    const hasLongText = isLongText;
    const hasNumber = isNumber;
    const hasPrice = isPrice;
    const hasDate = isDate;
    const hasDatetime = isDatetime;
    const hasTime = isTime;
    const hasRating = isRating;
    const hasTerms = isTerms;
    const hasMatrix = isMatrix;

    return (
      isScaleRating ||
      hasOptions ||
      hasDropdownOptions ||
      hasAddress ||
      hasFullname ||
      hasPhone ||
      hasEmail ||
      hasFileUpload ||
      hasShortText ||
      hasLongText ||
      hasNumber ||
      hasPrice ||
      hasDate ||
      hasDatetime ||
      hasTime ||
      hasRating ||
      hasTerms ||
      hasMatrix
    );
  };

  const handleInputTypeChange = (e) => {
    const value = e.target.value;
    setInputType(value);
    onUpdateField(selectedField.id, { inputType: value });
  };

  const handleDropdownOptionsSave = () => {
    const newOptions = dropdownOptionsInput
      .split("\n")
      .map((opt) => opt.trim())
      .filter((opt) => opt);
    onUpdateField(selectedField.id, { dropdownOptions: newOptions });
  };

  const handleShortTextMaxCharsChange = (e) => {
    const value = Math.min(parseInt(e.target.value) || 255, 255);
    setShortTextMaxChars(value);
    onUpdateField(selectedField.id, { shortTextMaxChars: value });
  };

  const handleIsRichTextChange = (e) => {
    const value = e.target.checked;
    setIsRichText(value);
    onUpdateField(selectedField.id, { isRichText: value });
  };

  const handleLongTextMaxCharsChange = (e) => {
    const value = Math.min(parseInt(e.target.value) || 131072, 131072);
    setLongTextMaxChars(value);
    onUpdateField(selectedField.id, { longTextMaxChars: value });
  };

  const handleNumberValueLimitsChange = (key, value) => {
    const newLimits = { ...numberValueLimits, [key]: value };
    setNumberValueLimits(newLimits);
    onUpdateField(selectedField.id, { numberValueLimits: newLimits });
  };

  // NEW: Handlers for dropdown-specific properties
  const handleAllowMultipleSelectionsChange = (e) => {
    const value = e.target.checked;
    setAllowMultipleSelections(value);
    onUpdateField(selectedField.id, { allowMultipleSelections: value });
  };

  const handleShuffleOptionsChange = (e) => {
    const value = e.target.checked;
    setShuffleOptions(value);
    onUpdateField(selectedField.id, { shuffleOptions: value });
  };

  const handleDropdownOptionChange = (index, value) => {
    const newOptions = [...options];
    const oldOption = newOptions[index];
    newOptions[index] = value;
    const newRelatedValues = { ...dropdownRelatedValues };
    if (oldOption !== value) {
      newRelatedValues[value] = newRelatedValues[oldOption] || "";
      delete newRelatedValues[oldOption];
    }
    setOptions(newOptions);
    setDropdownRelatedValues(newRelatedValues);
    onUpdateField(selectedField.id, {
      options: newOptions,
      dropdownRelatedValues: newRelatedValues,
    });
  };

  const handleDropdownRelatedValueChange = (option, value) => {
    const newRelatedValues = { ...dropdownRelatedValues, [option]: value };
    setDropdownRelatedValues(newRelatedValues);
    onUpdateField(selectedField.id, {
      dropdownRelatedValues: newRelatedValues,
    });
  };

  const handleDropdownRemoveOption = (index) => {
    const newOptions = options.filter((_, i) => i !== index);
    const newRelatedValues = { ...dropdownRelatedValues };
    delete newRelatedValues[options[index]];
    const updatedOptions = newOptions.length
      ? newOptions
      : ["Option 1", "Option 2", "Option 3"];
    setOptions(updatedOptions);
    setDropdownRelatedValues(newRelatedValues);
    onUpdateField(selectedField.id, {
      options: updatedOptions,
      dropdownRelatedValues: newRelatedValues,
    });
  };

  const handleDropdownAddOption = () => {
    const newOptions = [...options, `Option ${options.length + 1}`];
    const newRelatedValues = {
      ...dropdownRelatedValues,
      [`Option ${options.length + 1}`]: "",
    };
    setOptions(newOptions);
    setDropdownRelatedValues(newRelatedValues);
    onUpdateField(selectedField.id, {
      options: newOptions,
      dropdownRelatedValues: newRelatedValues,
    });
  };

  const handlePredefinedOptionSetChange = (e) => {
    const value = e.target.value;
    setPredefinedOptionSet(value);
    let newOptions = [];
    let newRelatedValues = {};
    switch (value) {
      case "days":
        newOptions = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        newRelatedValues = {
          Monday: "1",
          Tuesday: "2",
          Wednesday: "3",
          Thursday: "4",
          Friday: "5",
          Saturday: "6",
          Sunday: "7",
        };
        break;
      case "week":
        newOptions = ["Week 1", "Week 2", "Week 3", "Week 4"];
        newRelatedValues = {
          "Week 1": "1",
          "Week 2": "2",
          "Week 3": "3",
          "Week 4": "4",
        };
        break;
      case "gender":
        newOptions = ["Male", "Female", "Other"];
        newRelatedValues = { Male: "M", Female: "F", Other: "O" };
        break;
      default:
        newOptions = ["Option 1", "Option 2", "Option 3"];
        newRelatedValues = { "Option 1": "Option 1", "Option 2": "Option 2", "Option 3": "Option 3" };
    }
    setOptions(newOptions);
    if (selectedField.type === "dropdown") {
      setDropdownRelatedValues(newRelatedValues);
      onUpdateField(selectedField.id, {
        options: newOptions,
        dropdownRelatedValues: newRelatedValues,
      });
    } else {
      setRelatedValues(newRelatedValues);
      onUpdateField(selectedField.id, {
        options: newOptions,
        [`${selectedField.type}RelatedValues`]: newRelatedValues,
      });
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    const oldOption = newOptions[index];
    newOptions[index] = value;
    const newRelatedValues = { ...relatedValues };
    if (oldOption !== value) {
      newRelatedValues[value] = newRelatedValues[oldOption] || "";
      delete newRelatedValues[oldOption];
    }
    setOptions(newOptions);
    setRelatedValues(newRelatedValues);
    onUpdateField(selectedField.id, {
      options: newOptions,
      [`${selectedField.type}RelatedValues`]: newRelatedValues,
    });
  };

  const handleRelatedValueChange = (option, value) => {
    const newRelatedValues = { ...relatedValues, [option]: value };
    setRelatedValues(newRelatedValues);
    onUpdateField(selectedField.id, {
      [`${selectedField.type}RelatedValues`]: newRelatedValues,
    });
  };

  const handleRemoveOption = (index) => {
    const newOptions = options.filter((_, i) => i !== index);
    const newRelatedValues = { ...relatedValues };
    delete newRelatedValues[options[index]];
    setOptions(
      newOptions.length ? newOptions : ["Option 1", "Option 2", "Option 3"]
    );
    setRelatedValues(newRelatedValues);
    onUpdateField(selectedField.id, {
      options: newOptions.length
        ? newOptions
        : ["Option 1", "Option 2", "Option 3"],
      [`${selectedField.type}RelatedValues`]: newRelatedValues,
    });
  };

  const handleAddOption = () => {
    const newOptions = [...options, `Option ${options.length + 1}`];
    const newRelatedValues = {
      ...relatedValues,
      [`Option ${options.length + 1}`]: "",
    };
    setOptions(newOptions);
    setRelatedValues(newRelatedValues);
    onUpdateField(selectedField.id, {
      options: newOptions,
      [`${selectedField.type}RelatedValues`]: newRelatedValues,
    });
  };

  // Handlers for price-specific properties
  const handlePriceLimitsChange = (key, value) => {
    const newLimits = { ...priceLimits, [key]: value };
    setPriceLimits(newLimits);
    onUpdateField(selectedField.id, { priceLimits: newLimits });
  };

  const handleCurrencyTypeChange = (e) => {
    const value = e.target.value;
    setCurrencyType(value);
    onUpdateField(selectedField.id, { currencyType: value });
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    const newOptions = [...options];
    const [draggedOption] = newOptions.splice(dragIndex, 1);
    newOptions.splice(index, 0, draggedOption);
    const newRelatedValues = {};
    newOptions.forEach((opt) => {
      newRelatedValues[opt] = dropdownRelatedValues[opt] || "";
    });
    setOptions(newOptions);
    setDropdownRelatedValues(newRelatedValues);
    onUpdateField(selectedField.id, {
      options: newOptions,
      dropdownRelatedValues: newRelatedValues,
    });
    setDragIndex(null);
  };

  const handleDefaultValueChange = (e) => {
    setDefaultValue(e.target.value);
    onUpdateField(selectedField.id, { defaultValue: e.target.value });
  };

  const handleUniqueNameChange = (e) => {
    let value = e.target.value.trim();
    const innerRaw = value.replace(/^{|}$/g, "");
    const innerCleaned = innerRaw.replace(/\s/g, "");
    const finalValue = `${innerCleaned}`;
    if (/\s/.test(innerRaw)) {
      setUniqueNameError("Unique name cannot contain spaces.");
    } else {
      setUniqueNameError("");
      setUniqueName(finalValue);
      onUpdateField(selectedField.id, { uniqueName: finalValue });
    }
  };

  // Supported field types for placeholders
  const placeholderSupportedTypes = [
    "shorttext",
    "longtext",
    "number",
    "phone",
    "email",
    "price",
    "fullname",
    "address",
    "link",
    "date",
    "datetime",
    "time",
    "fileupload",
    "dropdown",
    "signature",
    "terms",
    "displaytext",
    "formcalculation",
  ];

  // Field type checks
  const isPlaceholderSupported =
    selectedField && placeholderSupportedTypes.includes(selectedField.type);
  const isAlignmentSupported = selectedField?.type !== "pagebreak";
  const isOptionsSupported =
    selectedField &&
    ["checkbox", "radio", "dropdown"].includes(selectedField.type);
  const isScaleRating = selectedField?.type === "scalerating";
  // const isImageUploader = selectedField?.type === 'imageuploader';
  const isFormCalculation = selectedField?.type === "formcalculation";
  const isRating = selectedField?.type === "rating";
  const isAddress = selectedField?.type === "address";
  const isFullname = selectedField?.type === "fullname";
  const isHeader = selectedField?.type === "header"; // for Main Form Header
  const isEmail = selectedField?.type === "email";
  const isFileUpload = selectedField?.type === "fileupload";
  const isTerms = selectedField?.type === "terms";
  const isDate = selectedField?.type === "date";
  const isDateTime = selectedField?.type === "datetime";
  const isTime = selectedField?.type === "time";
  const isShortText = selectedField?.type === "shorttext";
  const isLongText = selectedField?.type === "longtext";
  const isNumber = selectedField?.type === "number";
  const isPhone = selectedField?.type === "phone";
  const isPrice = selectedField?.type === "price";
  const isHeading = selectedField?.type === "heading"; // For Headings in form
  const isSignature = selectedField?.type === "signature";
  // Add missing field type definitions
  const isDropdownSupported = selectedField?.type === "dropdown";
  const isFileUploadSupported = selectedField?.type === "fileupload";
  const isShortTextSupported = selectedField?.type === "shorttext";
  const isDatetime = selectedField?.type === "datetime";
  const isMatrix = selectedField?.type === "matrix";
  const isPayPalPayment = selectedField?.type === "paypal_payment";

  // Get dynamic country list
  const countries = getCountryList();
   let footerEditor = null;
   
  if (
    selectedFooter &&
    typeof selectedFooter.pageIndex === "number"
  ) {
    const pageIndex = selectedFooter.pageIndex;
    const pageBreakCount = fields.filter(f => f.type === 'pagebreak').length;
    const buttons = [];
    if (pageIndex > 0) buttons.push("previous");
    if (pageIndex < pageBreakCount) buttons.push("next");
    if (pageIndex === pageBreakCount) buttons.push("submit");

    footerEditor = (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Footer Configuration (Page {pageIndex + 1})</h3>
        {buttons.map(buttonType => (
          <div key={buttonType} className="mb-4">
            <label className="block text-sm font-medium mb-1">{buttonType.charAt(0).toUpperCase() + buttonType.slice(1)} Button Text</label>
            <input
              type="text"
              value={footerConfigs[pageIndex]?.[buttonType]?.text || ""}
              onChange={e =>
                setFooterConfigs(prev => ({
                  ...prev,
                  [pageIndex]: {
                    ...prev[pageIndex],
                    [buttonType]: {
                      ...prev[pageIndex]?.[buttonType],
                      text: e.target.value
                    }
                  }
                }))
              }
              className="w-full p-2 border rounded mb-2"
              placeholder={`Enter ${buttonType} button text`}
            />
            <label className="block text-sm font-medium mb-1">Background Color</label>
            <input
              type="color"
              value={footerConfigs[pageIndex]?.[buttonType]?.bgColor || "#6B7280"}
              onChange={e =>
                setFooterConfigs(prev => ({
                  ...prev,
                  [pageIndex]: {
                    ...prev[pageIndex],
                    [buttonType]: {
                      ...prev[pageIndex]?.[buttonType],
                      bgColor: e.target.value
                    }
                  }
                }))
              }
              className="mb-2"
            />
            <label className="block text-sm font-medium mb-1">Text Color</label>
            <input
              type="color"
              value={footerConfigs[pageIndex]?.[buttonType]?.textColor || "#FFFFFF"}
              onChange={e =>
                setFooterConfigs(prev => ({
                  ...prev,
                  [pageIndex]: {
                    ...prev[pageIndex],
                    [buttonType]: {
                      ...prev[pageIndex]?.[buttonType],
                      textColor: e.target.value
                    }
                  }
                }))
              }
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="custom-builder-card">
      {/* Header and Close Button */}
      <div className="flex justify-between items-center m-3">
        <div className="flex gap-2 items-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11 18H14.75C16.1424 18 17.4777 17.4469 18.4623 16.4623C19.4469 15.4777 20 14.1424 20 12.75C20 11.3576 19.4469 10.0223 18.4623 9.03769C17.4777 8.05312 16.1424 7.5 14.75 7.5H5M7.5 4L4 7.5L7.5 11"
              stroke="#0B0A0A"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800">Property</h2>
        </div>

        <button
          type="button"
          className="text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="bg-white">
        {/* Tabs for Settings and Widget */}
        <div className="flex border-b mx-4 mt-4 mb-4">
          <div className="relative">
            <button
              className={`px-4 py-2 font-medium text-sm relative z-10 ${activeTab === "settings" ? "text-gray-900" : "text-gray-500"
                }`}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
            {activeTab === "settings" && (
              <div className="gradient-border"></div>
            )}
          </div>

          {isFormCalculation && (
            <div className="relative">
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === "widget" ? "text-gray-900" : "text-gray-500"
                  }`}
                onClick={() => setActiveTab("widget")}
              >
                Widget
              </button>
              {activeTab === "widget" && (
                <div className="gradient-border"></div>
              )}
            </div>
          )}
        </div>

        {activeTab === "settings" && selectedField && (
          <div
            className="settings-area px-4 h-screen bg-white"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            {/* Common Properties Section */}
            <div className="mb-4">
              <button
                className="flex justify-between w-full p-2 bg-gray-100 hover:bg-gray-100 rounded-lg items-center transition-colors duration-200 border border-gray-200"
                onClick={() => toggleSection("common")}
              >
                <h3 className="text-base font-semibold text-gray-800">
                  Common Properties
                </h3>
                {expandedSections.includes("common") ? (
                  <FaChevronUp className="text-gray-600" />
                ) : (
                  <FaChevronDown className="text-gray-600" />
                )}
              </button>
              {expandedSections.includes("common") && (
                <div className="p-2 mt-1 bg-gray-50 rounded-b-lg">
                  {isHeading ? (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Heading Text
                        </label>
                        <input
                          type="text"
                          value={headingText}
                          onChange={handleHeadingTextChange}
                          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                          placeholder="Enter header text"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Heading Alignment
                        </label>
                        <select
                          value={headingAlignment}
                          onChange={handleHeadingAlignmentChange}
                          className="w-full p-2 border rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </>
                  ) : selectedField?.type === "imageuploader" ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image Width (px)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={selectedField.imageWidth || ""}
                        onChange={(e) =>
                          onUpdateField(selectedField.id, {
                            imageWidth: e.target.value,
                          })
                        }
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                        placeholder="e.g. 200"
                      />
                      <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">
                        Image Height (px)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={selectedField.imageHeight || ""}
                        onChange={(e) =>
                          onUpdateField(selectedField.id, {
                            imageHeight: e.target.value,
                          })
                        }
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                        placeholder="e.g. 100"
                      />
                      <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">
                        Image Alignment
                      </label>
                      <select
                        value={selectedField.imageAlign || "center"}
                        onChange={(e) =>
                          onUpdateField(selectedField.id, {
                            imageAlign: e.target.value,
                          })
                        }
                        className="w-full p-2 border rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={label}
                          onChange={handleLabelChange}
                          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                          placeholder="Enter field label"
                        />
                      </div>
                      {isPlaceholderSupported && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Placeholder(s)
                          </label>
                          {isAddress ? (
                            <div className="flex flex-col gap-2">
                              {[
                                "street",
                                "street2",
                                "city",
                                "state",
                                "country",
                                "postal",
                              ].map((key) => (
                                <div key={key}>
                                  <label className="text-xs text-gray-500 capitalize">
                                    {key}
                                  </label>
                                  <input
                                    type="text"
                                    value={subFields[key]?.placeholder || ""}
                                    onChange={(e) =>
                                      handleAddressPlaceholderChange(
                                        key,
                                        e.target.value
                                      )
                                    }
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                    placeholder={`Enter ${key} placeholder`}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : isFullname ? (
                            <div className="flex flex-col gap-2">
                              {["firstName", "lastName"].map((key) => (
                                <div key={key}>
                                  <label className="text-xs text-gray-500 capitalize">
                                    {key}
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      fullnameSubFields[key]?.placeholder || ""
                                    }
                                    onChange={(e) =>
                                      handleFullnamePlaceholderChange(
                                        key,
                                        e.target.value
                                      )
                                    }
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                    placeholder={`Enter ${key} placeholder`}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : isPhone ? (
                            <div className="flex flex-col gap-2">
                              <div>
                                <label className="text-xs text-gray-500">
                                  Phone Number
                                </label>
                                <input
                                  type="text"
                                  value={
                                    phoneSubFields.phoneNumber?.placeholder ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const newSubFields = {
                                      ...phoneSubFields,
                                      phoneNumber: {
                                        ...phoneSubFields.phoneNumber,
                                        placeholder: e.target.value,
                                      },
                                    };
                                    setPhoneSubFields(newSubFields);
                                    onUpdateField(selectedField.id, {
                                      subFields: newSubFields,
                                    });
                                  }}
                                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                  placeholder="Enter phone number"
                                />
                              </div>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={placeholder.main || ""}
                              onChange={(e) =>
                                handlePlaceholderChange("main", e.target.value)
                              }
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder="Enter placeholder text"
                            />
                          )}
                        </div>
                      )}
                      {isAlignmentSupported && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Label Alignment
                          </label>
                          <div className="relative">
                            <select
                              value={labelAlignment}
                              onChange={handleAlignmentChange}
                              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer shadow-sm"
                              style={{ paddingRight: "2.5rem" }}
                            >
                              <option value="top">Top</option>
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                              <svg
                                className="fill-current h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Default Value Feature */}
                      {isPhone ? (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Value
                          </label>
                          <input
                            type="number"
                            value={defaultValue}
                            onChange={handleDefaultValueChange}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            placeholder="Enter default phone number"
                          />
                        </div>
                      ) : isLongText ? (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Value
                          </label>
                          <textarea
                            value={defaultValue}
                            onChange={handleDefaultValueChange}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            placeholder="Enter default text"
                          />
                        </div>
                      ) : isNumber ? (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Value
                          </label>
                          <input
                            type="number"
                            value={defaultValue}
                            onChange={handleDefaultValueChange}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            placeholder="Enter default number"
                          />
                        </div>
                      ) : isOptionsSupported &&
                        ["checkbox", "radio"].includes(selectedField.type) ? (
                        <div></div>
                      ) : isDate ? (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Value
                          </label>
                          <DatePicker
                            disabled={isDisabled}
                            placeholder={placeholder.main || "Default date"}
                            className={`w-full`}
                            isoWeek={weekStartDay === "Monday"}
                            locale={{
                              localizedMonthName: (month) =>
                                customMonthLabels[month.getMonth()] ||
                                month.toLocaleString("en", { month: "long" }),
                              weekdays: customDayLabels,
                              today: customTodayLabel,
                            }}
                            onChange={handleDefaultValueChange}
                            preventOverflow
                          />
                        </div>
                      ) : isTime ? (
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Value
                          </label>
                          <DatePicker
                            format={
                              timeFormat === "HH:mm" ? "HH:mm" : "hh:mm a"
                            }
                            disabled={isDisabled}
                            placeholder={"Select a default time"}
                            className={`w-full `}
                            showMeridian={timeFormat === "hh:mm a"}
                            disabledTime={(date) => {
                              if (!restrictAmPm) return {};
                              const hours = date.getHours();
                              if (restrictAmPm === "AM" && hours >= 12)
                                return { hour: true };
                              if (restrictAmPm === "PM" && hours < 12)
                                return { hour: true };
                              return {};
                            }}
                            onChange={handleDefaultValueChange}
                          />
                        </div>
                      ) : isDateTime ? (
                        <div className="mb-6">
                          <DatePicker
                            format={`dd/MM/yyyy HH:mm`}
                            disabled={isDisabled}
                            placeholder={"Select default date and time"}
                            className={`w-full`}
                            isoWeek={weekStartDay === "Monday"}
                            locale={{
                              localizedMonthName: (month) =>
                                customMonthLabels[month.getMonth()] ||
                                month.toLocaleString("en", { month: "long" }),
                              weekdays: customDayLabels,
                              today: customTodayLabel,
                            }}
                            showMeridian={timeFormat === "hh:mm a"}
                            onChange={handleDefaultValueChange}
                          />
                        </div>
                      ) : isTerms ? (
                        ""
                      ) : isSignature ? (
                        ""
                      ) : isFormCalculation ? (
                        ""
                      ) : isAddress ? (
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Value
                          </label>
                          {[
                            "street",
                            "street2",
                            "city",
                            "state",
                            "country",
                            "postal",
                          ].map((key) => (
                            <div key={key} className="mb-4">
                              <label className="block text-xs font-medium text-gray-500 capitalize mb-1">
                                {key}
                              </label>
                              <input
                                type="text"
                                value={subFields[key]?.value || ""}
                                onChange={(e) => {
                                  const newSubFields = {
                                    ...subFields,
                                    [key]: {
                                      ...subFields[key],
                                      value: e.target.value,
                                    },
                                  };
                                  setSubFields(newSubFields);
                                  onUpdateField(selectedField.id, {
                                    subFields: newSubFields,
                                  });
                                }}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder={`Enter default ${key}`}
                                readOnly={isDisabled}
                              />
                            </div>
                          ))}
                        </div>
                      ) : isPrice ? (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Value
                          </label>
                          <div className="flex items-center gap-2">
                            <span className={`text-gray-700`}>
                              {currencyType}
                            </span>
                            <input
                              type="number"
                              value={defaultValue}
                              onChange={handleDefaultValueChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder="Enter default price"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Value
                          </label>
                          <input
                            type="text"
                            value={defaultValue}
                            onChange={handleDefaultValueChange}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            placeholder="Enter default value"
                          />
                        </div>
                      )}
                      {!isAddress && (
                        <div className="mb-4 flex items-center">
                          <ToggleSwitch
                            checked={isRequired}
                            onChange={handleRequiredChange}
                            id="required-toggle"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Required
                          </span>
                        </div>
                      )}
                      <div className="mb-4 flex items-center">
                        <ToggleSwitch
                          checked={isDisabled}
                          onChange={handleDisabledChange}
                          id="disabled-toggle"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Disable Field (Read-Only)
                        </span>
                      </div>
                      <div className="mb-4 flex items-center">
                        <ToggleSwitch
                          checked={isHidden}
                          onChange={handleHiddenChange}
                          id="hidden-toggle"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Hidden Field
                        </span>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center">
                          <ToggleSwitch
                            checked={showHelpText}
                            onChange={handleShowHelpTextChange}
                            id="help-text-toggle"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Show Help Text
                          </span>
                        </div>
                        {showHelpText && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Help Text
                            </label>
                            <textarea
                              value={helpText}
                              onChange={handleHelpTextChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder="Enter help text"
                              rows="4"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {selectedField && hasAdditionalProperties() && (
              <div className="mb-4">
                <button
                  className="flex justify-between w-full p-3 bg-gray-100 hover:bg-gray-150 rounded-lg items-center transition-colors duration-200 border border-gray-200"
                  onClick={() => toggleSection("additional")}
                >
                  <h3 className="text-base font-semibold text-gray-800">
                    Additional Properties
                  </h3>
                  {expandedSections.includes("additional") ? (
                    <FaChevronUp className="text-gray-600" />
                  ) : (
                    <FaChevronDown className="text-gray-600" />
                  )}
                </button>
                {expandedSections.includes("additional") && (
                  <div className="p-2 mt-1 bg-gray-50 rounded-b-lg">
                    {isOptionsSupported &&
                      ["checkbox", "radio"].includes(selectedField.type) && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Predefined Options
                          </label>
                          <select
                            value={predefinedOptionSet}
                            onChange={handlePredefinedOptionSetChange}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                          >
                            <option value="">Custom</option>
                            <option value="days">Days of the Week</option>
                            <option value="week">Weeks</option>
                            <option value="gender">Gender</option>
                          </select>
                          <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
                            Options
                          </label>
                          {options.map((opt, idx) => (
                            <div
                              key={idx}
                              className="flex items-center mb-3 gap-3"
                            >
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) =>
                                  handleOptionChange(idx, e.target.value)
                                }
                                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder={`Option ${idx + 1}`}
                              />
                              <input
                                type="text"
                                value={relatedValues[opt]}
                                defaultValue={`Option ${idx + 1}`}
                                onChange={(e) =>
                                  handleRelatedValueChange(opt, e.target.value)
                                }
                                className="w-32 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="Value"
                              />
                              <button
                                onClick={() => handleRemoveOption(idx)}
                                className="text-red-500 hover:text-red-700 text-lg p-1 flex-shrink-0"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={handleAddOption}
                            className="text-blue-600 hover:underline"
                          >
                            + Add Item
                          </button>

                          {/* Column Layout Selector */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Number of Columns
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={columnCount}
                              onChange={(e) => {
                                const value = Math.min(
                                  Math.max(parseInt(e.target.value) || 1, 1),
                                  10
                                );
                                setColumnCount(value);
                                onUpdateField(selectedField.id, {
                                  columnCount: value,
                                });
                              }}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder="Enter number of columns (1-10)"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter a number between 1 and 10
                            </p>
                          </div>
                        </div>
                      )}

                    {isOptionsSupported &&
                      selectedField.type === "dropdown" && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Predefined Options
                          </label>
                          <select
                            value={predefinedOptionSet}
                            onChange={handlePredefinedOptionSetChange}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                          >
                            <option value="">Custom</option>
                            <option value="days">Days of the Week</option>
                            <option value="week">Weeks</option>
                            <option value="gender">Gender</option>
                          </select>
                          <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
                            Options
                          </label>
                          {options.map((opt, idx) => (
                            <div
                              key={idx}
                              className="flex items-center mb-3 gap-3"
                              draggable={shuffleOptions}
                              onDragStart={() => handleDragStart(idx)}
                              onDragOver={(e) => handleDragOver(e, idx)}
                              onDrop={() => handleDrop(idx)}
                            >
                              {shuffleOptions && (
                                <FaArrowsAltV className="cursor-move text-gray-500 flex-shrink-0" />
                              )}
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) =>
                                  handleDropdownOptionChange(
                                    idx,
                                    e.target.value
                                  )
                                }
                                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder={`Option ${idx + 1}`}
                              />
                              <input
                                type="text"
                                value={dropdownRelatedValues[opt]}
                                defaultValue={`Option ${idx + 1}`}
                                onChange={(e) =>
                                  handleDropdownRelatedValueChange(
                                    opt,
                                    e.target.value
                                  )
                                }
                                className="w-32 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="Value"
                              />
                              <button
                                onClick={() => handleDropdownRemoveOption(idx)}
                                className="text-red-500 hover:text-red-700 text-lg p-1 flex-shrink-0"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={handleDropdownAddOption}
                            className="text-blue-600 hover:underline"
                          >
                            + Add Item
                          </button>
                          <div className="flex items-center mt-4">
                            <ToggleSwitch
                              checked={allowMultipleSelections}
                              onChange={handleAllowMultipleSelectionsChange}
                              id="multiple-selections-toggle"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Allow Multiple Selections
                            </span>
                          </div>
                          <div className="flex items-center mt-2">
                            <ToggleSwitch
                              checked={shuffleOptions}
                              onChange={handleShuffleOptionsChange}
                              id="shuffle-toggle"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Enable Shuffle/Reorder Options
                            </span>
                          </div>
                        </div>
                      )}
                    {isOptionsSupported && ["checkbox", "dropdown"].includes(selectedField.type) && (
                      <div className="mb-4">
                        <div className="flex gap-4 mt-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Min Selection</label>
                            <input
                              type="number"
                              min="0"
                              max={options.length}
                              value={minSelection}
                              onChange={e => {
                                const value = Math.max(0, Math.min(options.length, Number(e.target.value)));
                                setMinSelection(value);
                                onUpdateField(selectedField.id, { minSelection: value });
                              }}
                              className="w-20 p-2 border rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Max Selection</label>
                            <input
                              type="number"
                              min={minSelection}
                              max={options.length}
                              value={maxSelection}
                              onChange={e => {
                                const value = Math.max(minSelection, Math.min(options.length, Number(e.target.value)));
                                setMaxSelection(value);
                                onUpdateField(selectedField.id, { maxSelection: value });
                              }}
                              className="w-20 p-2 border rounded"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {isScaleRating && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Input Type
                        </label>
                        <select
                          value={inputType}
                          onChange={handleInputTypeChange}
                          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                        >
                          <option value="radio">Radio</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="text">Text</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                        {inputType === "dropdown" && (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Dropdown Options
                            </label>
                            <textarea
                              value={dropdownOptionsInput}
                              onChange={(e) =>
                                setDropdownOptionsInput(e.target.value)
                              }
                              className="w-full p-2 border rounded-lg text-gray-800"
                              rows="5"
                              placeholder="Enter one option per line"
                            />
                            <div className="flex justify-end mt-2">
                              <button
                                onClick={handleDropdownOptionsSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                        <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
                          Rows
                        </label>
                        {rows.map((rowLabel, rowIdx) => (
                          <div key={rowIdx} className="flex items-center mb-2">
                            <input
                              type="text"
                              value={rowLabel}
                              onChange={(e) =>
                                handleRowChange(rowIdx, e.target.value)
                              }
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder={`Criteria ${rowIdx}idx + 1}`}
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddRow}
                            className="text-blue-600 hover:underline"
                          >
                            + Add Row
                          </button>
                          <button
                            onClick={() => setShowMultiRowModal(true)}
                            className="text-blue-600 hover:underline"
                          >
                            + Add Multiple Rows
                          </button>
                        </div>
                        {showMultiRowModal && (
                          <div className="bg-white p-4 rounded-lg w-96">
                            <h3 className="text-lg font-semibold mb-2">
                              Add Multiple Rows
                            </h3>
                            <textarea
                              value={multiRowInput}
                              onChange={(e) => setMultiRowInput(e.target.value)}
                              className="w-full p-2 border rounded-lg"
                              rows="5"
                              placeholder="Enter one row per line"
                            />
                            <div className="flex justify-end gap-2 mt-4">
                              <button
                                onClick={() => setShowMultiRowModal(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleMultiRowSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                        <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
                          Columns
                        </label>
                        {columns.map((colLabel, colIdx) => (
                          <div key={colIdx} className="flex items-center mb-2">
                            <input
                              type="text"
                              value={colLabel}
                              onChange={(e) =>
                                handleColumnChange(colIdx, e.target.value)
                              }
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder={`Column ${colIdx}idx + 1}`}
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddColumn}
                            className="text-blue-600 hover:underline"
                          >
                            + Add Column
                          </button>
                          <button
                            onClick={() => setShowMultiColumnModal(true)}
                            className="text-blue-600 hover:underline"
                          >
                            + Add Multiple Columns
                          </button>
                        </div>
                      </div>
                    )}
                    {showMultiColumnModal && (
                      <div className="bg-white p-4 rounded-lg w-96">
                        <h3 className="text-lg font-semibold mb-2">
                          Add Multiple Columns
                        </h3>
                        <textarea
                          value={multiColumnInput}
                          onChange={(e) => setMultiColumnInput(e.target.value)}
                          className="w-full p-2 border rounded-lg"
                          rows="5"
                          placeholder="Enter one column per line"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                          <button
                            onClick={() => setShowMultiColumnModal(false)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleMultiColumnSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                    {isRating && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rating Type
                        </label>
                        <div className="flex gap-4">
                          <button
                            onClick={() => {
                              setRatingType("emoji");
                              onUpdateField(selectedField.id, {
                                ratingType: "emoji",
                              });
                            }}
                            className={`text-2xl ${ratingType === "emoji"
                                ? "text-blue-600"
                                : "text-gray-400"
                              } hover:text-blue-500`}
                          >
                            😀
                          </button>
                          <button
                            onClick={() => {
                              setRatingType("star");
                              onUpdateField(selectedField.id, {
                                ratingType: "star",
                              });
                            }}
                            className={`text-2xl ${ratingType === "star"
                                ? "text-blue-600"
                                : "text-gray-400"
                              } hover:text-blue-500`}
                          >
                            <AiOutlineStar />
                          </button>
                          <button
                            onClick={() => {
                              setRatingType("heart");
                              onUpdateField(selectedField.id, {
                                ratingType: "heart",
                              });
                            }}
                            className={`text-2xl ${ratingType === "heart"
                                ? "text-blue-600"
                                : "text-gray-400"
                              } hover:text-blue-500`}
                          >
                            <AiOutlineHeart />
                          </button>
                          <button
                            onClick={() => {
                              setRatingType("bulb");
                              onUpdateField(selectedField.id, {
                                ratingType: "bulb",
                              });
                            }}
                            className={`text-2xl ${ratingType === "bulb"
                                ? "text-blue-600"
                                : "text-gray-400"
                              } hover:text-blue-500`}
                          >
                            <FaRegLightbulb />
                          </button>
                          <button
                            onClick={() => {
                              setRatingType("lightning");
                              onUpdateField(selectedField.id, {
                                ratingType: "lightning",
                              });
                            }}
                            className={`text-2xl ${ratingType === "lightning"
                                ? "text-blue-600"
                                : "text-gray-400"
                              } hover:text-blue-500`}
                          >
                            <BiBoltCircle />
                          </button>
                        </div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
                          Rating Range
                        </label>
                        <input
                          type="number"
                          value={ratingRange}
                          onChange={handleRatingRangeChange}
                          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                          placeholder="Enter number of rating options (e.g., 5)"
                          min="1"
                          max="10"
                        />
                        <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
                          Rating Values
                        </label>
                        {ratingValues.map((value, idx) => (
                          <div
                            key={idx}
                            className="flex items-center mb-2 gap-4 relative"
                          >
                            <button
                              onClick={() =>
                                setShowEmojiPicker(
                                  showEmojiPicker === idx ? null : idx
                                )
                              }
                              className="text-2xl w-12 text-center text-gray-700 hover:text-blue-500"
                            >
                              {ratingType === "emoji" ? (
                                ratingEmojis[idx]
                              ) : ratingType === "star" ? (
                                <AiOutlineStar />
                              ) : ratingType === "heart" ? (
                                <AiOutlineHeart />
                              ) : ratingType === "bulb" ? (
                                <FaRegLightbulb />
                              ) : ratingType === "lightning" ? (
                                <BiBoltCircle />
                              ) : (
                                <AiOutlineStar />
                              )}
                            </button>
                            {ratingType === "emoji" &&
                              showEmojiPicker === idx && (
                                <div className="absolute top-10 left-0 z-10">
                                  <EmojiPicker
                                    onEmojiClick={(emojiObject) =>
                                      handleEmojiChange(idx, emojiObject.emoji)
                                    }
                                    width={300}
                                    height={400}
                                  />
                                </div>
                              )}
                            <input
                              type="text"
                              value={value}
                              onChange={(e) =>
                                handleRatingValueChange(idx, e.target.value)
                              }
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder={`Value for Rating ${idx + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {isFullname && (
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <ToggleSwitch
                            checked={fullnameSubFields.salutation.enabled}
                            onChange={handleSalutationEnabledChange}
                            id="salutation-toggle"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Enable Salutation
                          </span>
                        </div>
                        {fullnameSubFields.salutation.enabled && (
                          <>
                            <div className="mb-3">
                              <label className="text-xs text-gray-500">
                                Salutation Placeholder
                              </label>
                              <input
                                type="text"
                                value={
                                  fullnameSubFields.salutation.placeholder || ""
                                }
                                onChange={(e) =>
                                  handleFullnamePlaceholderChange(
                                    "salutation",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="Enter salutation dropdown placeholder"
                              />
                            </div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Edit Salutations
                            </label>
                            {fullnameSubFields.salutation.options.map(
                              (sal, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center mb-2 gap-2"
                                >
                                  <input
                                    type="text"
                                    value={sal}
                                    onChange={(e) =>
                                      handleSalutationOptionChange(
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                    placeholder={`Salutation ${idx + 1}`}
                                  />
                                  <button
                                    onClick={() =>
                                      handleRemoveSalutationOption(idx)
                                    }
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <FaTimes />
                                  </button>
                                </div>
                              )
                            )}
                            <button
                              onClick={handleAddSalutationOption}
                              className="text-blue-600 hover:underline"
                            >
                              + Add Salutation
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {isAddress && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address Settings
                        </label>
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="text-xs text-gray-500">
                              Sub-labels
                            </label>
                            {[
                              "street",
                              "street2",
                              "city",
                              "state",
                              "country",
                              "postal",
                            ].map((key) => (
                              <div key={key} className="mb-2">
                                <label className="text-xs text-gray-500 capitalize">
                                  {key}
                                </label>
                                <input
                                  type="text"
                                  value={subFields[key]?.label || ""}
                                  onChange={(e) =>
                                    handleAddressSubLabelChange(
                                      key,
                                      e.target.value
                                    )
                                  }
                                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                  placeholder={`Enter ${key} sub-label`}
                                />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Visible Sub-fields
                            </label>
                            <div className="space-y-3">
                              {[
                                "street",
                                "street2",
                                "city",
                                "state",
                                "country",
                                "postal",
                              ].map((key) => (
                                <div
                                  key={key}
                                  className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700 capitalize">
                                      {key}
                                    </span>
                                    <ToggleSwitch
                                      checked={subFields[key]?.visible || false}
                                      onChange={() =>
                                        handleAddressVisibilityChange(key)
                                      }
                                      id={`address-${key}-toggle`}
                                    />
                                  </div>
                                  <div className="flex items-center">
                                    <label
                                      htmlFor={`address-${key}-required-toggle`}
                                      className="text-xs text-gray-600 mr-2"
                                    >
                                      Required
                                    </label>
                                    <input
                                      type="checkbox"
                                      id={`address-${key}-required-toggle`}
                                      checked={
                                        subFields[key]?.isRequired || false
                                      }
                                      onChange={() =>
                                        handleAddressRequiredChange(key)
                                      }
                                      className="w-3 h-3 accent-[#028ab0] border-gray-300 rounded focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {isEmail && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Settings
                        </label>
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="text-xs text-gray-500">
                              Maximum Characters
                            </label>
                            <input
                              type="number"
                              value={maxChars}
                              onChange={handleMaxCharsChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder="Enter max characters (e.g., 100)"
                              min="1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Allowed Domains
                            </label>
                            <input
                              type="text"
                              value={allowedDomains}
                              onChange={handleAllowedDomainsChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder="Enter domains (e.g., gmail.com, yahoo.com)"
                            />
                          </div>
                          <div className="flex items-center">
                            <ToggleSwitch
                              checked={enableConfirmation}
                              onChange={handleConfirmationChange}
                              id="confirmation-toggle"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Enable Confirmation Field
                            </span>
                          </div>
                          <div className="flex items-center">
                            <ToggleSwitch
                              checked={enableVerification}
                              onChange={handleVerificationChange}
                              id="verification-toggle"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Enable Verification Code
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {isFileUpload && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          File Upload Settings
                        </label>
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="text-xs text-gray-500">
                              Maximum File Size (MB)
                            </label>
                            <input
                              type="number"
                              value={maxFileSize}
                              onChange={handleMaxFileSizeChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder="Enter max file size (e.g., 5)"
                              min="1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Allowed File Types
                            </label>
                            <input
                              type="text"
                              value={allowedFileTypes}
                              onChange={handleAllowedFileTypesChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder="Enter file types (e.g., pdf, jpg, png)"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              File Selection
                            </label>
                            <div className="flex gap-4">
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  checked={!multipleFiles}
                                  onChange={() =>
                                    handleMultipleFilesChange(false)
                                  }
                                  className="mr-2"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                  Single File
                                </span>
                              </label>
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  checked={multipleFiles}
                                  onChange={() =>
                                    handleMultipleFilesChange(true)
                                  }
                                  className="mr-2"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                  Multiple Files
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {isTerms && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Terms Settings
                        </label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center">
                            <ToggleSwitch
                              checked={makeAsLink}
                              onChange={handleMakeAsLinkChange}
                              id="link-toggle"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Make Text as Link
                            </span>
                          </div>
                          {makeAsLink && (
                            <div>
                              <label className="text-xs text-gray-500">
                                Link URL
                              </label>
                              <input
                                type="url"
                                value={termsLinkUrl}
                                onChange={handleTermsLinkUrlChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="Enter URL (e.g., https://example.com/terms)"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {(isDate || isDateTime) && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date Settings
                        </label>
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="text-xs text-gray-500">
                              Date Separator
                            </label>
                            <select
                              value={dateSeparator}
                              onChange={handleDateSeparatorChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            >
                              <option value="-">-</option>
                              <option value="/">/</option>
                              <option value=".">.</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Date Format
                            </label>
                            <select
                              value={dateFormat}
                              onChange={handleDateFormatChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            >
                              <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                              <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                              <option value="yyyy/MM/dd">yyyy/MM/dd</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Default Date
                            </label>
                            <input
                              type="date"
                              value={defaultDate}
                              onChange={handleDefaultDateChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Week Start Day
                            </label>
                            <select
                              value={weekStartDay}
                              onChange={handleWeekStartDayChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            >
                              <option value="Sunday">Sunday</option>
                              <option value="Monday">Monday</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Custom Month Labels
                            </label>
                            {customMonthLabels.map((month, idx) => (
                              <div key={idx} className="mb-2">
                                <input
                                  type="text"
                                  value={month}
                                  onChange={(e) =>
                                    handleCustomMonthLabelChange(
                                      idx,
                                      e.target.value
                                    )
                                  }
                                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                  placeholder={`Month ${idx + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Custom Day Labels
                            </label>
                            {customDayLabels.map((day, idx) => (
                              <div key={idx} className="mb-2">
                                <input
                                  type="text"
                                  value={day}
                                  onChange={(e) =>
                                    handleCustomDayLabelChange(
                                      idx,
                                      e.target.value
                                    )
                                  }
                                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                  placeholder={`Day ${idx + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Custom Today Label
                            </label>
                            <input
                              type="text"
                              value={customTodayLabel}
                              onChange={handleCustomTodayLabelChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              placeholder="Enter replacement text for 'Today'"
                            />
                          </div>
                          <div className="flex items-center">
                            <ToggleSwitch
                              checked={enableAgeVerification}
                              onChange={handleAgeVerificationChange}
                              id="age-verification-toggle"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Enable Age Verification
                            </span>
                          </div>
                          {enableAgeVerification && (
                            <div>
                              <label className="text-xs text-gray-500">
                                Minimum Age
                              </label>
                              <input
                                type="number"
                                value={minAge}
                                onChange={handleMinAgeChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="Enter minimum age (e.g., 18)"
                                min="1"
                              />
                            </div>
                          )}
                          <div>
                            <label className="text-xs text-gray-500">
                              {isDateTime
                                ? "Start-End Date Range"
                                : "Date Range"}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type={isDateTime ? "datetime-local" : "date"}
                                value={
                                  isDateTime
                                    ? datetimeRange.start
                                    : dateRange.start
                                }
                                onChange={(e) =>
                                  isDateTime
                                    ? handleDatetimeRangeChange(
                                      "start",
                                      e.target.value
                                    )
                                    : handleDateRangeChange(
                                      "start",
                                      e.target.value
                                    )
                                }
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="Start date"
                              />
                              <input
                                type={isDateTime ? "datetime-local" : "date"}
                                value={
                                  isDateTime ? datetimeRange.end : dateRange.end
                                }
                                onChange={(e) =>
                                  isDateTime
                                    ? handleDatetimeRangeChange(
                                      "end",
                                      e.target.value
                                    )
                                    : handleDateRangeChange(
                                      "end",
                                      e.target.value
                                    )
                                }
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="End date"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Disabled Dates/Ranges
                            </label>
                            {disabledDates.map((date, idx) => (
                              <div
                                key={idx}
                                className="flex items-center mb-2 gap-2"
                              >
                                <input
                                  type={isDateTime ? "datetime-local" : "date"}
                                  value={date}
                                  onChange={(e) =>
                                    handleDisabledDateChange(
                                      idx,
                                      e.target.value
                                    )
                                  }
                                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                  placeholder="Select disabled date"
                                />
                                <button
                                  onClick={() => handleRemoveDisabledDate(idx)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <FaTimes />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={handleAddDisabledDate}
                              className="text-blue-600 hover:underline"
                            >
                              + Add Disabled Date
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {isTime && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time Settings
                        </label>
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="text-xs text-gray-500">
                              Time Format
                            </label>
                            <select
                              value={timeFormat}
                              onChange={handleTimeFormatChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            >
                              <option value="HH:mm">24-hour (HH:mm)</option>
                              <option value="hh:mm a">
                                12-hour (hh:mm AM/PM)
                              </option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Default Time
                            </label>
                            <input
                              type="time"
                              value={defaultTime}
                              onChange={handleDefaultTimeChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Restrict AM/PM
                            </label>
                            <select
                              value={restrictAmPm}
                              onChange={handleRestrictAmPmChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            >
                              <option value="">None</option>
                              <option value="AM">AM Only</option>
                              <option value="PM">PM Only</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                    {isShortText && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Character Limit
                        </label>
                        <input
                          type="number"
                          value={shortTextMaxChars}
                          onChange={handleShortTextMaxCharsChange}
                          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                          placeholder="Enter max characters (max 255)"
                          min="1"
                          max="255"
                        />

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Text Validation
                          </label>
                          <select
                            value={validationType}
                            onChange={handleValidationTypeChange}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                          >
                            {VALIDATION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    {isLongText && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Text Type
                        </label>
                        <div className="flex items-center">
                          <ToggleSwitch
                            checked={isRichText}
                            onChange={handleIsRichTextChange}
                            id="rich-text-toggle"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Use Rich Text
                          </span>
                        </div>
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Character Limit
                          </label>
                          <input
                            type="number"
                            value={longTextMaxChars}
                            onChange={handleLongTextMaxCharsChange}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            placeholder="Enter max characters (max 131072)"
                            min="1"
                            max="131072"
                          />
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Text Validation
                          </label>
                          <select
                            value={validationType}
                            onChange={handleValidationTypeChange}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                          >
                            {VALIDATION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    {isNumber && (
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <ToggleSwitch
                            checked={numberValueLimits.enabled}
                            onChange={(e) =>
                              handleNumberValueLimitsChange(
                                "enabled",
                                e.target.checked
                              )
                            }
                            id="value-limits-toggle"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Enable Value Limits
                          </span>
                        </div>
                        {numberValueLimits.enabled && (
                          <div className="flex gap-2">
                            <div>
                              <label className="text-xs text-gray-500">
                                Minimum Value
                              </label>
                              <input
                                type="number"
                                value={numberValueLimits.min}
                                onChange={(e) =>
                                  handleNumberValueLimitsChange(
                                    "min",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="Enter min value"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">
                                Maximum Value
                              </label>
                              <input
                                type="number"
                                value={numberValueLimits.max}
                                onChange={(e) =>
                                  handleNumberValueLimitsChange(
                                    "max",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="Enter max value"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* NEW: Phone-specific properties */}
                    {/* NEW: Phone-specific properties */}
                    {isPhone && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Settings
                        </label>
                        <div className="flex flex-col gap-2">
                          {/* Enable Country Code Checkbox */}
                          <div className="flex items-center">
                            <ToggleSwitch
                              checked={
                                phoneSubFields.countryCode?.enabled || false
                              }
                              onChange={(e) => {
                                const newSubFields = {
                                  ...phoneSubFields,
                                  countryCode: {
                                    ...phoneSubFields.countryCode,
                                    enabled: e.target.checked,
                                    value: e.target.checked
                                      ? phoneSubFields.countryCode?.value ||
                                      "US"
                                      : "",
                                  },
                                  phoneNumber: {
                                    value:
                                      phoneSubFields.phoneNumber?.value || "",
                                    placeholder:
                                      phoneSubFields.phoneNumber?.placeholder ||
                                      "Enter phone number",
                                    ...(e.target.checked
                                      ? {}
                                      : {
                                        phoneMask:
                                          phoneSubFields.phoneNumber
                                            ?.phoneMask || "(999) 999-9999",
                                      }),
                                  },
                                };
                                setPhoneSubFields(newSubFields);
                                onUpdateField(selectedField.id, {
                                  subFields: newSubFields,
                                  placeholder: undefined,
                                });
                              }}
                              id="country-code-toggle"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Enable Country Code
                            </span>
                          </div>

                          {/* Country Selector Dropdown */}
                          {phoneSubFields.countryCode?.enabled && (
                            <div>
                              <label className="text-xs text-gray-500">
                                Default Country Code
                              </label>
                              <select
                                value={
                                  phoneSubFields.countryCode?.value || "US"
                                }
                                onChange={(e) => {
                                  const newSubFields = {
                                    ...phoneSubFields,
                                    countryCode: {
                                      ...phoneSubFields.countryCode,
                                      value: e.target.value,
                                    },
                                    phoneNumber: {
                                      value:
                                        phoneSubFields.phoneNumber?.value || "",
                                      placeholder:
                                        phoneSubFields.phoneNumber
                                          ?.placeholder || "Enter phone number",
                                    },
                                  };
                                  setPhoneSubFields(newSubFields);
                                  onUpdateField(selectedField.id, {
                                    subFields: newSubFields,
                                  });
                                }}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                              >
                                <option value="">Select a country</option>
                                {countries.map(({ code, name, dialCode }) => (
                                  <option key={code} value={code}>
                                    {`${name} (${dialCode})`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Phone Mask Field — Only Show if Country Code Is Disabled */}
                          {!phoneSubFields.countryCode?.enabled && (
                            <div>
                              <label className="text-xs text-gray-500 flex items-center gap-1">
                                Phone Number Mask
                                <FaInfoCircle
                                  className="text-blue-500 cursor-pointer"
                                  title="Use ( ) and - symbols to define a phone input mask. Example: (999) 999-9999"
                                />
                              </label>
                              <input
                                type="text"
                                value={
                                  phoneSubFields.phoneNumber?.phoneMask ||
                                  "(999) 999-9999"
                                }
                                onChange={(e) => {
                                  const newSubFields = {
                                    ...phoneSubFields,
                                    phoneNumber: {
                                      value:
                                        phoneSubFields.phoneNumber?.value || "",
                                      placeholder:
                                        phoneSubFields.phoneNumber
                                          ?.placeholder || "Enter phone number",
                                      phoneMask: e.target.value,
                                    },
                                  };
                                  setPhoneSubFields(newSubFields);
                                  onUpdateField(selectedField.id, {
                                    subFields: newSubFields,
                                  });
                                }}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                placeholder="(999) 999-9999"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* NEW: Price-specific properties */}
                    {isPrice && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price Settings
                        </label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center">
                            <ToggleSwitch
                              checked={priceLimits.enabled}
                              onChange={(e) =>
                                handlePriceLimitsChange(
                                  "enabled",
                                  e.target.checked
                                )
                              }
                              id="price-limits-toggle"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Enable Price Limits
                            </span>
                          </div>
                          {priceLimits.enabled && (
                            <div className="flex gap-2">
                              <div>
                                <label className="text-xs text-gray-500">
                                  Minimum Price
                                </label>
                                <input
                                  type="number"
                                  value={priceLimits.min}
                                  onChange={(e) =>
                                    handlePriceLimitsChange(
                                      "min",
                                      e.target.value
                                    )
                                  }
                                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                  placeholder="Enter min price"
                                  step="0.01"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">
                                  Maximum Price
                                </label>
                                <input
                                  type="number"
                                  value={priceLimits.max}
                                  onChange={(e) =>
                                    handlePriceLimitsChange(
                                      "max",
                                      e.target.value
                                    )
                                  }
                                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                                  placeholder="Enter max price"
                                  step="0.01"
                                />
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="text-xs text-gray-500">
                              Currency Type
                            </label>
                            <select
                              value={currencyType}
                              onChange={handleCurrencyTypeChange}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                            >
                              <option value="USD">$ (USD)</option>
                              <option value="EUR">€ (EUR)</option>
                              <option value="GBP">£ (GBP)</option>
                              <option value="JPY">¥ (JPY)</option>
                              <option value="AUD">$ (AUD)</option>
                              <option value="CAD">$ (CAD)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Advanced Properties Section */}
            <div className="mb-4">
              <button
                className="flex justify-between w-full p-2 bg-gray-100 hover:bg-gray-150 rounded-lg items-center transition-colors duration-200 border border-gray-200"
                onClick={() => toggleSection("advanced")}
              >
                <h3 className="text-base font-semibold text-gray-800">
                  Advanced Properties
                </h3>
                {expandedSections.includes("advanced") ? (
                  <FaChevronUp className="text-gray-600" />
                ) : (
                  <FaChevronDown className="text-gray-600" />
                )}
              </button>
              {expandedSections.includes("advanced") && (
                <div className="p-2 mt-1 bg-gray-50 rounded-b-lg">
                  {/* Unique Name Feature */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unique Name
                    </label>
                    <input
                      type="text"
                      defaultValue={uniqueName}
                      onChange={handleUniqueNameChange}
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 ${uniqueNameError ? "border-red-500" : ""
                        }`}
                      placeholder="{uniqueName}"
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This can be used to pre-populate fields from a URL and
                      pass data to another form automatically. It can't include
                      spaces.
                    </p>
                    {uniqueNameError && (
                      <p className="text-xs text-red-500 mt-1">
                        {uniqueNameError}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {/* Payment Field Configuration */}
              {isPayPalPayment && (
                <PaymentFieldEditor
                  selectedField={selectedField}
                  onUpdateField={onUpdateField}
                  className="mb-4"
                  userId={userId}
                  formId={formId}
                />
              )}
            </div>
          </div>
        )}
{/* 
         {activeTab === "settings" && (selectedFooter.buttonType==null) && (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">Footer Configuration</h3>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Footer Text</label>
        <input
          type="text"
          value={footerConfigs.text}
          onChange={handleFooterButtonTextChange}
          className="w-full p-2 border rounded"
          placeholder="Enter footer text"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Footer Alignment</label>
        <select
          value={footerConfigs.alignment}
          onChange={handleFooterAlignmentChange}
          className="w-full p-2 border rounded"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="split">Split (for 2 buttons)</option>
        </select>
      </div>
      <div className="mb-2 flex gap-4 items-center">
        <label className="block text-sm font-medium mb-1">Button Background</label>
        <ColorPicker
          value={footerConfigs.buttonBg}
          onChange={handleFooterButtonBgChange}
        />
        <label className="block text-sm font-medium mb-1">Button Text Color</label>
        <ColorPicker
          value={footerConfigs.buttonTextColor}
          onChange={handleFooterButtonTextColorChange}
        />
      </div>
    </div>
  )} */}

  {footerEditor}

        {activeTab === "widget" && isFormCalculation && (
          <div className="px-4 py-2 bg-gray-50 rounded-b-lg">
            <FormCalculationWidget
              selectedField={selectedField}
              onUpdateField={onUpdateField}
              fields={fields}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default FieldEditor;