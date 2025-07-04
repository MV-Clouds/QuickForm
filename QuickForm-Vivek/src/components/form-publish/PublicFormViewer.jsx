// PublicFormViewer.js
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
import { FaRegLightbulb, FaLightbulb, FaBolt, FaInfoCircle } from 'react-icons/fa';

function PublicFormViewer() {
  const { linkId } = useParams();
  const [formData, setFormData] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,

          }),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || tokenData.error) {
          throw new Error(tokenData.error || 'Failed to fetch access token');
        }
        const token = tokenData.access_token;
        setAccessToken(token);

        const response = await fetch(process.env.REACT_APP_FETCH_FORM_BY_LINK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            formId,
            accessToken: token,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch form');
        }
        const formVersion = data.formVersion;
        setFormData(formVersion);
        const initialValues = {};
        const initialSignatures = {};
        const initialFilePreviews = {};
        const initialRatings = {};
        const initialSelectedOptions = {};
        const initialToggles = {};

        formVersion.Fields.forEach((field) => {
          const properties = JSON.parse(field.Properties__c || '{}');
          const fieldType = field.Field_Type__c;

          if (fieldType === 'checkbox' || (fieldType === 'dropdown' && properties.allowMultipleSelections)) {
            initialValues[field.Unique_Key__c] = properties.defaultValue || [];
          } else if (fieldType === 'datetime' || fieldType === 'date') {
            initialValues[field.Unique_Key__c] = properties.defaultValue || null;
          } else if (fieldType === 'time') {
            initialValues[field.Unique_Key__c] = properties.defaultValue || '';
          } else if (fieldType === 'scalerating') {
            initialValues[field.Unique_Key__c] = {};
          } else {
            initialValues[field.Unique_Key__c] = properties.defaultValue || '';
          }

          initialSignatures[field.Unique_Key__c] = null;
          initialFilePreviews[field.Unique_Key__c] = null;
          initialRatings[field.Unique_Key__c] = null;
          initialSelectedOptions[field.Unique_Key__c] = fieldType === 'dropdown' && properties.allowMultipleSelections ? [] : '';
          initialToggles[field.Unique_Key__c] = false;
        });

        setFormValues(initialValues);
        setSignatures(initialSignatures);
        setFilePreviews(initialFilePreviews);
        setSelectedRatings(initialRatings);
        setSelectedOptions(initialSelectedOptions);
        setToggles(initialToggles);

        // Split fields into pages based on Page_Number__c and sort by Order_Number__c
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
          .map((pageNum) => {
            return pageMap[pageNum].sort((a, b) => (a.Order_Number__c || 0) - (b.Order_Number__c || 0));
          });
        setPages(sortedPages.length > 0 ? sortedPages : [formVersion.Fields]);
      } catch (error) {
        console.error('Error fetching form:', error);
        setFetchError(error.message || 'Failed to load form');
      }
    };

    if (linkId) {
      fetchFormData();
    }
  }, [linkId]);

  const handleChange = (fieldId, value, isFile = false) => {
    
    setFormValues((prev) => ({ ...prev, [fieldId]: isFile ? value : value }));
    setErrors((prev) => ({ ...prev, [fieldId]: null }));
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

  const handleSignatureEnd = (fieldId, sigCanvasRef) => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      const dataUrl = sigCanvasRef.current.toDataURL('image/png');
      setSignatures((prev) => ({ ...prev, [fieldId]: dataUrl }));
      handleChange(fieldId, dataUrl);
    }
  };

  const clearSignature = (fieldId, sigCanvasRef) => {
    if (sigCanvasRef && sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setSignatures((prev) => ({ ...prev, [fieldId]: null }));
      handleChange(fieldId, null);
    }
  };

  const validateForm = () => {
    if (!formData) return false;
    const newErrors = {};

    formData.Fields.forEach((field) => {
      const properties = JSON.parse(field.Properties__c || '{}');
      const value = formValues[field.Unique_Key__c];
      const fieldType = field.Field_Type__c;
      const fieldLabel = properties.label || field.Name;

      const isRequired = properties.isRequired;
      if (isRequired) {
        if (value === '' || value == null ||
          (Array.isArray(value) && value.length === 0) ||
          (fieldType === 'fileupload' && !value) ||
          (fieldType === 'imageuploader' && !value) ||
          (fieldType === 'signature' && !signatures[field.Unique_Key__c]) ||
          (fieldType === 'terms' && !value) ||
          (fieldType === 'scalerating' && (!value || Object.keys(value).length === 0))) {
          newErrors[field.Unique_Key__c] = `${fieldLabel} is required`;
        }
      }

      switch (fieldType) {
        case 'number':
          if (value !== '' && isNaN(parseFloat(value))) {
            newErrors[field.Unique_Key__c] = `${fieldLabel} must be a valid number`;
          } else if (properties.numberValueLimits?.enabled) {
            const numValue = parseFloat(value);
            const { min, max } = properties.numberValueLimits;
            if (min != null && numValue < parseFloat(min)) {
              newErrors[field.Unique_Key__c] = `${fieldLabel} must be at least ${min}`;
            }
            if (max != null && numValue > parseFloat(max)) {
              newErrors[field.Unique_Key__c] = `${fieldLabel} must be at most ${max}`;
            }
          }
          break;

        case 'price':
          if (value !== '' && isNaN(parseFloat(value))) {
            newErrors[field.Unique_Key__c] = `${fieldLabel} must be a valid number`;
          } else if (properties.priceLimits?.enabled) {
            const numValue = parseFloat(value);
            const { min, max } = properties.priceLimits;
            if (min != null && numValue < parseFloat(min)) {
              newErrors[field.Unique_Key__c] = `${fieldLabel} must be at least ${min}`;
            }
            if (max != null && numValue > parseFloat(max)) {
              newErrors[field.Unique_Key__c] = `${fieldLabel} must be at most ${max}`;
            }
          }
          break;

        case 'shorttext':
          if (properties.shortTextMaxChars && value && value.length > properties.shortTextMaxChars) {
            newErrors[field.Unique_Key__c] = `${fieldLabel} must be at most ${properties.shortTextMaxChars} characters`;
          }
          break;

        case 'longtext':
          if (properties.longTextMaxChars && value && value.length > properties.longTextMaxChars) {
            newErrors[field.Unique_Key__c] = `${fieldLabel} must be at most ${properties.longTextMaxChars} characters`;
          }
          break;

        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            newErrors[field.Unique_Key__c] = `${fieldLabel} must be a valid email address`;
          }
          if (properties.allowedDomains && value) {
            const domains = properties.allowedDomains.split(',').map(d => d.trim());
            const domain = value.split('@')[1];
            if (!domains.includes(domain)) {
              newErrors[field.Unique_Key__c] = `${fieldLabel} must be from one of these domains: ${domains.join(', ')}`;
            }
          }
          if (properties.enableConfirmation && value !== formValues[`${field.Unique_Key__c}_confirmation`]) {
            newErrors[`${field.Unique_Key__c}_confirmation`] = 'Email confirmation does not match';
          }
          break;

        case 'fileupload':
        case 'imageuploader':
          if (value && properties.maxFileSize && value.size > properties.maxFileSize * 1024 * 1024) {
            newErrors[field.Unique_Key__c] = `File size exceeds ${properties.maxFileSize}MB limit`;
          }
          if (value && properties.allowedFileTypes) {
            const extension = value.name.split('.').pop().toLowerCase();
            const allowed = properties.allowedFileTypes.split(',').map(type => type.trim().toLowerCase());
            if (!allowed.includes(extension)) {
              newErrors[field.Unique_Key__c] = `File type ${extension} is not allowed. Allowed types: ${properties.allowedFileTypes}`;
            }
          }
          break;

        case 'date':
          if (properties.enableAgeVerification && value) {
            const today = new Date();
            const birthDate = new Date(value);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            if (age < properties.minAge) {
              newErrors[field.Unique_Key__c] = `You must be at least ${properties.minAge} years old`;
            }
          }
          break;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFileToSalesforce = async (file, submissionId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('submissionId', submissionId);
    formData.append('userId', linkData.userId);

    const response = await fetch(process.env.REACT_APP_UPLOAD_DOCUMENT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload file');
    }
    return data.documentId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !linkData || !accessToken) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData = {};
      const filesToUpload = {};

      for (const key of Object.keys(formValues)) {
        const field = formData.Fields.find((f) => f.Unique_Key__c === key);
        const fieldType = field?.Field_Type__c;

        if (['fileupload', 'imageuploader'].includes(fieldType) && formValues[key] instanceof File) {
          filesToUpload[key] = formValues[key];
          submissionData[key] = formValues[key].name;
        } else if (fieldType === 'signature' && signatures[key]) {
          const signatureBlob = await (await fetch(signatures[key])).blob();
          const signatureFile = new File([signatureBlob], `${key}.png`, { type: 'image/png' });
          filesToUpload[key] = signatureFile;
          submissionData[key] = `${key}.png`;
        } else {
          submissionData[key] = formValues[key];
        }
      }
      console.log('Access token ', accessToken);


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
      for (const [key, file] of Object.entries(filesToUpload)) {
        const documentId = await uploadFileToSalesforce(file, submissionId);
        updatedSubmissionData[key] = documentId;
      }

      alert('Form submitted successfully!');
      const initialValues = {};
      formData.Fields.forEach((field) => {
        const properties = JSON.parse(field.Properties__c || '{}');
        const fieldType = field.Field_Type__c;
        if (fieldType === 'checkbox' || (fieldType === 'dropdown' && properties.allowMultipleSelections)) {
          initialValues[field.Unique_Key__c] = [];
        } else if (fieldType === 'datetime' || fieldType === 'date') {
          initialValues[field.Unique_Key__c] = null;
        } else if (fieldType === 'scalerating') {
          initialValues[field.Unique_Key__c] = {};
        } else {
          initialValues[field.Unique_Key__c] = '';
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
      if (error.message.includes('INVALID_JWT_FORMAT')) {
        let decrypted;
        try {
          decrypted = decrypt(linkId);
        } catch (e) {
          throw new Error(e.message || 'Invalid link format');
        }

        const [userId, formVersionId] = decrypted.split('$');
        const tokenResponse = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,

          }),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || tokenData.error) {
          throw new Error(tokenData.error || 'Failed to fetch access token');
        }
        const token = tokenData.access_token;
        console.log('New access token fetched:', token);

        setAccessToken(token);
        console.log('Retrying submission with new token...', accessToken);

        handleSubmit(e); // Retry submission with new token
      }
      console.error('Error submitting form:', error);
      setErrors({ submit: error.message || 'Failed to submit form' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (fetchError) {
    return <div className="text-red-500 text-center p-4" role="alert">{fetchError}</div>;
  }

  if (!formData) {
    return <div className="text-center p-4">Loading form...</div>;
  }

  const renderField = (field) => {
    const properties = JSON.parse(field.Properties__c || '{}');
    const fieldId = field.Unique_Key__c;
    const fieldType = field.Field_Type__c;
    const fieldLabel = properties.label || field.Name;
    const isDisabled = properties.isDisabled || false;
    const isRequired = properties.isRequired;
    const hasError = !!errors[fieldId];
    const helpText = properties.showHelpText ? properties.helpText : null;
    const labelAlignment = properties.labelAlignment || 'top';

    const commonProps = {
      id: fieldId,
      disabled: isDisabled,
      'aria-required': isRequired,
      'aria-describedby': hasError ? `${fieldId}-error` : undefined,
      className: `w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-gray-300'}`,
    };

    const labelClass = `block text-sm font-medium mb-1 ${hasError ? 'text-red-600' : 'text-gray-700'}`;

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
        return (
          <div className="mb-4">
            {renderLabel()}
            <input
              type="text"
              {...commonProps}
              value={formValues[fieldId] || ''}
              onChange={(e) => handleChange(fieldId, e.target.value)}
              placeholder={properties.placeholder?.main || ''}
              maxLength={properties.shortTextMaxChars}
            />
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'longtext':
        return (
          <div className="mb-4">
            {renderLabel()}
            {properties.isRichText ? (
              <ReactQuill
                theme="snow"
                value={formValues[fieldId] || ''}
                onChange={(value) => handleChange(fieldId, value)}
                readOnly={isDisabled}
                placeholder={properties.placeholder?.main || ''}
                modules={{
                  toolbar: isDisabled ? false : [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'header': 1 }, { 'header': 2 }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'script': 'sub' }, { 'script': 'super' }],
                    [{ 'indent': '-1' }, { 'indent': '+1' }],
                    [{ 'direction': 'rtl' }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'font': [] }],
                    [{ 'align': [] }],
                    ['clean']
                  ]
                }}
              />
            ) : (
              <textarea
                {...commonProps}
                rows="4"
                value={formValues[fieldId] || ''}
                onChange={(e) => handleChange(fieldId, e.target.value)}
                placeholder={properties.placeholder?.main || ''}
                maxLength={properties.longTextMaxChars}
              />
            )}
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'number':
        return (
          <div className="mb-4">
            {renderLabel()}
            <input
              type="number"
              {...commonProps}
              value={formValues[fieldId] || ''}
              onChange={(e) => handleChange(fieldId, e.target.value)}
              placeholder={properties.placeholder?.main || ''}
              min={properties.numberValueLimits?.min}
              max={properties.numberValueLimits?.max}
            />
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'price':
        return (
          <div className="mb-4">
            {renderLabel()}
            <div className="flex items-center gap-2">
              <span className="text-gray-700">{properties.currencyType || 'USD'}</span>
              <input
                type="number"
                {...commonProps}
                step="0.01"
                value={formValues[fieldId] || ''}
                onChange={(e) => handleChange(fieldId, e.target.value)}
                placeholder={properties.placeholder?.main || ''}
                min={properties.priceLimits?.min}
                max={properties.priceLimits?.max}
              />
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'email':
        return (
          <div className="mb-4">
            {renderLabel()}
            <input
              type="email"
              {...commonProps}
              value={formValues[fieldId] || ''}
              onChange={(e) => handleChange(fieldId, e.target.value)}
              placeholder={properties.placeholder?.main || 'example@domain.com'}
              maxLength={properties.maxChars}
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
                  placeholder="Confirm email"
                />
                {errors[`${fieldId}_confirmation`] && (
                  <p id={`${fieldId}_confirmation-error`} className="text-red-500 text-sm mt-1" role="alert">
                    {errors[`${fieldId}_confirmation`]}
                  </p>
                )}
              </div>
            )}
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'phone':
        return (
          <div className="mb-4">
            {renderLabel()}
            {properties.enableCountryCode ? (
              <div className="flex items-center gap-3">
                <div className="w-1/3">
                  <PhoneInput
                    country={properties.selectedCountryCode?.toLowerCase() || 'us'}
                    value={formValues[`${fieldId}_countryCode`] || ''}
                    onChange={(phone, countryData) => {
                      const newCountryCode = countryData.countryCode.toUpperCase();
                      handleChange(`${fieldId}_countryCode`, newCountryCode);
                    }}
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
                  <InputMask
                    mask={properties.phoneInputMask || '(999) 999-9999'}
                    value={formValues[fieldId] || ''}
                    onChange={(e) => handleChange(fieldId, e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder={properties.placeholder?.main || 'Enter phone number'}
                    disabled={isDisabled}
                  />
                </div>
              </div>
            ) : (
              <InputMask
                mask={properties.phoneInputMask || '(999) 999-9999'}
                value={formValues[fieldId] || ''}
                onChange={(e) => handleChange(fieldId, e.target.value)}
                className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={properties.placeholder?.main || 'Enter phone number'}
                disabled={isDisabled}
              />
            )}
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'date':
        return (
          <div className="mb-4">
            {renderLabel()}
            <DatePicker
              format={properties.dateFormat?.replace(/\//g, properties.dateSeparator || '-') || 'YYYY-MM-DD'}
              value={formValues[fieldId] ? new Date(formValues[fieldId]) : null}
              onChange={(date) => {
                const formattedDate = date ? date.toISOString().split('T')[0] : null;
                handleChange(fieldId, formattedDate);
              }}
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
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'datetime':
        return (
          <div className="mb-4">
            {renderLabel()}
            <DatePicker
              format={properties.dateFormat
                ? `${properties.dateFormat.replace(/\//g, properties.dateSeparator || '-')} ${properties.timeFormat || 'HH:mm'}`
                : 'YYYY-MM-DD HH:mm'}
              value={formValues[fieldId] ? new Date(formValues[fieldId]) : null}
              onChange={(date) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;
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
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'time':
        return (
          <div className="mb-4">
            {renderLabel()}
            <DatePicker
              format={properties.timeFormat || 'HH:mm'}
              value={formValues[fieldId] ? new Date(`1970-01-01T${formValues[fieldId]}`) : null}
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
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'checkbox':
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
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isDisabled}
                  />
                  <label htmlFor={`${fieldId}-${idx}`} className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'radio':
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
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    disabled={isDisabled}
                  />
                  <label htmlFor={`${fieldId}-${idx}`} className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'dropdown':
        return (
          <div className="mb-4">
            {renderLabel()}
            <div className="relative">
              <select
                {...commonProps}
                value={formValues[fieldId] || (properties.allowMultipleSelections ? [] : '')}
                onChange={(e) => {
                  const value = properties.allowMultipleSelections
                    ? Array.from(e.target.selectedOptions, option => option.value)
                    : e.target.value;
                  handleChange(fieldId, value);
                }}
                multiple={properties.allowMultipleSelections}
              >
                <option value="" disabled={!properties.allowMultipleSelections}>
                  {properties.placeholder?.main || 'Select an option'}
                </option>
                {(properties.options || ['Option 1', 'Option 2', 'Option 3']).map((option, idx) => (
                  <option key={idx} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'fileupload':
        return (
          <div className="mb-4">
            {renderLabel()}
            <input
              type="file"
              {...commonProps}
              onChange={(e) => handleFileChange(fieldId, e, 'fileupload')}
              accept={properties.allowedFileTypes || 'image/*,application/pdf,.doc,.docx'}
              multiple={properties.multipleFiles}
            />
            {filePreviews[fieldId] && (
              <div className="mt-2">
                <img src={filePreviews[fieldId]} alt="Preview" className="max-h-32" onError={(e) => e.target.style.display = 'none'} />
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
        return (
          <div className="mb-4">
            {renderLabel()}
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
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'toggle':
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
                  className="sr-only peer"
                  disabled={isDisabled}
                />
                <div className={`w-11 h-6 bg-gray-200 rounded-full peer ${toggles[fieldId] ? 'peer-checked:bg-blue-600' : ''}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${toggles[fieldId] ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'fullname':
        return (
          <div className="mb-4">
            {renderLabel()}
            <div className="flex gap-3">
              {properties.enableSalutation && (
                <div className="w-1/5">
                  <label className="text-xs text-gray-500">Salutation</label>
                  <select
                    className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                    value={formValues[`${fieldId}_salutation`] || ''}
                    onChange={(e) => handleChange(`${fieldId}_salutation`, e.target.value)}
                    disabled={isDisabled}
                  >
                    <option value="">{properties.placeholder?.salutation || 'Select'}</option>
                    {properties.salutations?.map((sal, idx) => (
                      <option key={idx} value={sal}>{sal}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={properties.enableSalutation ? 'w-2/5' : 'w-1/2'}>
                <label className="text-xs text-gray-500">First Name</label>
                <input
                  type="text"
                  className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                  value={formValues[`${fieldId}_first`] || ''}
                  onChange={(e) => handleChange(`${fieldId}_first`, e.target.value)}
                  placeholder={properties.placeholder?.first || 'First Name'}
                  disabled={isDisabled}
                />
              </div>
              <div className={properties.enableSalutation ? 'w-2/5' : 'w-1/2'}>
                <label className="text-xs text-gray-500">Last Name</label>
                <input
                  type="text"
                  className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                  value={formValues[`${fieldId}_last`] || ''}
                  onChange={(e) => handleChange(`${fieldId}_last`, e.target.value)}
                  placeholder={properties.placeholder?.last || 'Last Name'}
                  disabled={isDisabled}
                />
              </div>
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'address':
        return (
          <div className="mb-4">
            {renderLabel()}
            <div className="space-y-3">
              {properties.visibleSubFields?.street && (
                <div>
                  <label className="text-xs text-gray-500">{properties.subLabels?.street || 'Street Address'}</label>
                  <input
                    type="text"
                    className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                    value={formValues[`${fieldId}_street`] || ''}
                    onChange={(e) => handleChange(`${fieldId}_street`, e.target.value)}
                    placeholder={properties.placeholder?.street || 'Street Address'}
                    disabled={isDisabled}
                  />
                </div>
              )}
              <div className="flex gap-3">
                {properties.visibleSubFields?.city && (
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500">{properties.subLabels?.city || 'City'}</label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                      value={formValues[`${fieldId}_city`] || ''}
                      onChange={(e) => handleChange(`${fieldId}_city`, e.target.value)}
                      placeholder={properties.placeholder?.city || 'City'}
                      disabled={isDisabled}
                    />
                  </div>
                )}
                {properties.visibleSubFields?.state && (
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500">{properties.subLabels?.state || 'State'}</label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                      value={formValues[`${fieldId}_state`] || ''}
                      onChange={(e) => handleChange(`${fieldId}_state`, e.target.value)}
                      placeholder={properties.placeholder?.state || 'State'}
                      disabled={isDisabled}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {properties.visibleSubFields?.country && (
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500">{properties.subLabels?.country || 'Country'}</label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                      value={formValues[`${fieldId}_country`] || ''}
                      onChange={(e) => handleChange(`${fieldId}_country`, e.target.value)}
                      placeholder={properties.placeholder?.country || 'Country'}
                      disabled={isDisabled}
                    />
                  </div>
                )}
                {properties.visibleSubFields?.postal && (
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500">{properties.subLabels?.postal || 'Postal Code'}</label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                      value={formValues[`${fieldId}_postal`] || ''}
                      onChange={(e) => handleChange(`${fieldId}_postal`, e.target.value)}
                      placeholder={properties.placeholder?.postal || 'Postal Code'}
                      disabled={isDisabled}
                    />
                  </div>
                )}
              </div>
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'signature':

        return (
          <div className="mb-4">
            {renderLabel()}
            <div className="flex flex-col gap-2">
              <SignatureCanvas
                ref={(ref) => (signatureRefs.current[fieldId] = ref)}
                canvasProps={{
                  className: `border rounded w-full h-32 ${hasError ? 'border-red-500' : 'border-gray-300'}`,
                  style: { backgroundColor: '#fff' }
                }}
                onEnd={() => handleSignatureEnd(fieldId, signatureRefs.current[fieldId])}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => clearSignature(fieldId, signatureRefs.current[fieldId])}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  disabled={isDisabled}
                >
                  Clear
                </button>
              </div>
              {signatures[fieldId] && (
                <img src={signatures[fieldId]} alt="Signature Preview" className="w-32 h-16 object-contain" />
              )}
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'terms':
        return (
          <div className="mb-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id={fieldId}
                  checked={formValues[fieldId] || false}
                  onChange={(e) => handleChange(fieldId, e.target.checked)}
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
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'displaytext':
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
        return (
          <div className="mb-6">
            <h2 className={`text-2xl font-bold text-gray-800 ${properties.alignment === 'left' ? 'text-left' :
              properties.alignment === 'right' ? 'text-right' :
                'text-center'
              }`}>
              {properties.heading || 'Form Header'}
            </h2>
          </div>
        );

      case 'rating':
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
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                {ratingOptions[properties.ratingType || 'star'].map((option, idx) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleRatingChange(fieldId, option.value)}
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
                  Selected: {ratingOptions[properties.ratingType || 'star'].find(o => o.value === selectedRatings[fieldId])?.label}
                </p>
              )}
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'scalerating':
        const rows = properties.rows || ['Row 1', 'Row 2'];
        const columns = properties.columns || ['1', '2', '3', '4', '5'];

        return (
          <div className="mb-4">
            {renderLabel()}
            <div className="space-y-2">
              {rows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-center space-x-4">
                  <span className="w-1/4 text-gray-700 font-semibold">{row}</span>
                  <div className="flex space-x-2">
                    {columns.map((col, colIdx) => (
                      <label key={colIdx} className="flex items-center space-x-1">
                        <input
                          type="radio"
                          name={`scale-row-${fieldId}-${rowIdx}`}
                          value={col}
                          checked={formValues[fieldId]?.[row] === col}
                          onChange={() => {
                            const newValue = { ...formValues[fieldId], [row]: col };
                            handleChange(fieldId, newValue);
                          }}
                          disabled={isDisabled}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span>{col}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'divider':
        return <hr className="border-gray-300 my-4" />;

      case 'formcalculation':
        return (
          <div className="mb-4">
            {renderLabel()}
            <input
              type="text"
              {...commonProps}
              value={formValues[fieldId] || ''}
              readOnly
              className={`w-full p-2 border rounded-md ${hasError ? 'border-red-500' : 'border-gray-300'}`}
            />
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'link':
        return (
          <div className="mb-4">
            {renderLabel()}
            <input
              type="url"
              {...commonProps}
              value={formValues[fieldId] || ''}
              onChange={(e) => handleChange(fieldId, e.target.value)}
              placeholder={properties.placeholder?.main || 'https://example.com'}
            />
            {renderHelpText()}
            {renderError()}
          </div>
        );

      case 'section':
        return (
          <div className="mb-4 border p-4 rounded">
            <h3 className="text-lg font-semibold mb-2">{fieldLabel}</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Left Field */}
              <div>
                {properties.leftField ? (
                  <div className="p-2 border rounded bg-gray-50">
                    <div className="text-xs text-gray-500 mb-1">Type: {properties.leftField.type}</div>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      value={formValues[properties.leftField.id] || ''}
                      onChange={e =>
                        handleChange(properties.leftField.id, e.target.value)
                      }
                      placeholder={properties.leftField.label || 'Left Field'}
                      disabled={properties.leftField.isDisabled}
                    />
                  </div>
                ) : (
                <div></div>
                )}
              </div>
              {/* Right Field */}
              <div>
                {properties.rightField ? (
                  <div className="p-2 border rounded bg-gray-50">
                    <div className="text-xs text-gray-500 mb-1">Type: </div>
                    <input
                      type={properties.rightField.type}
                      className="w-full p-2 border rounded"
                      value={formValues[properties.rightField.id] || ''}
                      onChange={e =>
                        handleChange(properties.rightField.id, e.target.value)
                      }
                      placeholder={properties.rightField.label || 'Right Field'}
                      disabled={properties.rightField.isDisabled}
                    />
                  </div>
                ) : (
                <div></div>
                )}
              </div>

            </div>
            {renderHelpText()}
            {renderError()}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">{formData.Name}</h1>
      <form onSubmit={handleSubmit} className="space-y-6" aria-label="Public Form">
        <div className="page">
          {pages[currentPage]?.map((field) => (
            <div key={field.Unique_Key__c}>
              {renderField(field)}
            </div>
          ))}
        </div>

        {pages.length > 1 && (
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={currentPage === 0}
              className={`py-2 px-4 rounded-md font-medium transition ${currentPage === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              aria-label="Previous Page"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {currentPage + 1} of {pages.length}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage === pages.length - 1}
              className={`py-2 px-4 rounded-md font-medium transition ${currentPage === pages.length - 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              aria-label="Next Page"
            >
              Next
            </button>
          </div>
        )}

        {currentPage === pages.length - 1 && (
          <>
            {errors.submit && (
              <p className="text-red-500 text-sm mt-2 text-center" role="alert">
                {errors.submit}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !accessToken}
              className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md font-medium transition ${isSubmitting || !accessToken ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              aria-label="Submit Form"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
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
                  Submitting...
                </span>
              ) : (
                'Submit'
              )}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default PublicFormViewer;