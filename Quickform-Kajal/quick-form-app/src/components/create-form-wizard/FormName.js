import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FormName = ({ onClose, fields = [],selectedObjects, selectedFields, fieldsData }) => {
  const [formName, setFormName] = useState('');
  const [formNameError, setFormNameError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  
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
    const headerField = fields.find((f) => f.type === 'header') || {
      id: 'default-header',
      type: 'header',
      heading: formName,
      alignment: 'center',
    };
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
      Name: formName,
      Description__c: '',
      Stage__c: 'Draft',
      Publish_Link__c: '',
      Version__c: '1',
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
      if (!userId || !instanceUrl) {
        throw new Error('Missing userId or instanceUrl. Please log in.');
      }
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
      if (!response.ok) throw new Error(data.error || 'Failed to create form.');
      const newFormVersionId = data.formVersionId;
      navigate(`/form-builder/${newFormVersionId}`, {
        state: {
          selectedObjects,
          selectedFields,
          fieldsData,
        },
      });
    } catch (error) {
      console.error('Error creating form:', error);
      setFormNameError(error.message || 'Failed to create form.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Enter Form Name</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ×
          </button>
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
          className={`w-full p-2 bg-blue-600 text-white rounded-md ${
            isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
        >
          {isSaving ? 'Creating...' : 'Create Form'}
        </button>
      </div>
    </div>
  );
};

export default FormName;