import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalesforceData } from '../Context/MetadataContext';
import FormName from './FormName';
import InactivityTracker from '../time-out/InactivityTracker';
import './home.css';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);
const Home = () => {
  const { 
    metadata, 
    formRecords, 
    isLoading: contextLoading, 
    error: contextError,
    fetchSalesforceData 
  } = useSalesforceData();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFormActionLoading, setIsFormActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState(null);
  const [forms, setForms] = useState([]);
  const [selectedVersions, setSelectedVersions] = useState({});
  const [fetchError, setFetchError] = useState(null);
  const [isFormNameOpen, setIsFormNameOpen] = useState(false);
  const navigate = useNavigate();

  const getStatusBadge = (form) => {
    const publishedVersion = form.FormVersions.find(v => v.Stage__c === 'Publish');
    const draftVersion = form.FormVersions.find(v => v.Stage__c === 'Draft');
    
    if (draftVersion) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Draft Available
        </span>
      );
    }
    
    if (publishedVersion) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Published
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        No Version
      </span>
    );
  };

  // Fetch access token from Lambda
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

  // Warm up fetchFieldsForObject Lambda function
  const warmFetchFieldsForObject = async (userId, instanceUrl, token) => {
    try {
      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
      const sampleObject = 'Account';
      await fetch(process.env.REACT_APP_FETCH_FIELDS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: cleanedInstanceUrl,
          objectName: sampleObject,
          access_token: token,
        }),
      });
    } catch (error) {
      console.error('Error warming fetchFieldsForObject Lambda:', error);
    }
  };

  // Initialize page by fetching forms and warming Lambdas
  const initializePage = async () => {
    const params = new URLSearchParams(window.location.search);
    let userId = params.get('userId');
    let instanceUrl = params.get('instanceUrl');

    if (!userId || !instanceUrl) {
      userId = sessionStorage.getItem('userId');
      instanceUrl = sessionStorage.getItem('instanceUrl');
    }

    if (userId && instanceUrl) {
      sessionStorage.setItem('userId', userId);
      sessionStorage.setItem('instanceUrl', instanceUrl);

      const token = await fetchAccessToken(userId, instanceUrl);
      if (token) {
        try {
          await  fetchSalesforceData(userId, instanceUrl);
          warmFetchFieldsForObject(userId, instanceUrl, token);
        } finally {
          setIsInitializing(false);
        }
      }
      else{
        setIsInitializing(false);
      }
    } else {
      console.error('Missing userId or instanceUrl. Please log in.');
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initializePage();
  }, []);

  const handleCreateForm = () => {
    setIsModalOpen(true);
  };

  const handleOptionSelect = (option) => {
    setIsModalOpen(false);

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    const instanceUrl = params.get('instanceUrl');

    if (userId && instanceUrl) {
      sessionStorage.setItem('userId', userId);
      sessionStorage.setItem('instanceUrl', instanceUrl);
    }

    if (option === 'salesforce') {
      navigate('/wizard');
    } else if (option === 'scratch') {
      setIsFormNameOpen(true);
    } else if (option === 'templates') {
      navigate('/template');
    }
  };

  const handleEditForm = async (form) => {
    setIsFormActionLoading(true);
    const draftVersion = form.FormVersions.find(
      (version) => version.Stage__c === 'Draft'
    );

    if (draftVersion) {
      navigate(`/form-builder/${draftVersion.Id}`);
      return;
    }

    // No Draft, copy Publish version
    const publishedVersion = form.FormVersions.find(
      (version) => version.Stage__c === 'Publish'
    );

    if (!publishedVersion) {
      navigate('/form-builder'); // No Publish, create new form
      return;
    }

    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      const token = await fetchAccessToken(userId, instanceUrl);

      // Create new version by copying Publish
      const response = await fetch(process.env.REACT_APP_SAVE_FORM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl,
          formData: {
            formVersion: {
              Name: publishedVersion.Name,
              Form__c: form.Id,
              Version__c: (
                Math.max(
                  ...form.FormVersions.map((v) => parseInt(v.Version__c) || 1)
                ) + 1
              ).toString(),
              Stage__c: 'Draft',
              Object_Info__c: form.Object_Info__c,
            },
            formFields: (publishedVersion.Fields || []).map((field, index) => ({
              Name: field.Name,
              Field_Type__c: field.Field_Type__c,
              Page_Number__c: field.Page_Number__c,
              Order_Number__c: index + 1,
              Properties__c: field.Properties__c,
              Unique_Key__c: field.Unique_Key__c,
            })),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create new version');
      }

      navigate(`/form-builder/${data.formVersionId}`);
    } catch (error) {
      console.error('Error creating new version:', error);
      setFetchError('Failed to create new version');
    } finally {
      setIsFormActionLoading(false);
    }
  };

  const handleVersionChange = (formName, versionId) => {
    setSelectedVersions((prev) => ({
      ...prev,
      [formName]: versionId,
    }));
  };

  const getFormDisplayName = (form) => {
    const publishedVersion = form.FormVersions.find(
      (version) => version.Stage__c === 'Publish'
    );
    if (!publishedVersion) {
      return form.FormVersions.find(
        (version) => version.Stage__c === 'Draft'
      )?.Name || 'Unnamed Form';
    }
    return publishedVersion?.Name || 'Unnamed Form';
  };

  // Combine loading states
  const isDataLoading = isInitializing || contextLoading;
  const error = contextError;

  return (
    <div className="min-h-screen bg-gray-50">
      <InactivityTracker />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
          <div className="px-6 py-8 sm:p-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <svg
                  className="h-10 w-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">QuickForm</h1>
              <p className="text-lg text-gray-500 mb-6">Create beautiful forms in seconds</p>
              <button
                onClick={handleCreateForm}
                disabled={isDataLoading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
              <>
                <svg
                  className="-ml-1 mr-3 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Create New Form
              </>
              </button>
            </div>
          </div>
        </div>

        {/* Forms List Section */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Your Forms</h3>
            <p className="mt-1 text-sm text-gray-500">
              {formRecords.length} {formRecords.length === 1 ? 'form' : 'forms'} found
            </p>
          </div>
          {isInitializing  ? (
            <div className="px-4 py-12 text-center">
              <LoadingSpinner />
              <p className="mt-2 text-sm text-gray-500">Loading your forms...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-12 text-center text-red-500">
              Error loading forms: {error}
            </div>
          ) : formRecords.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No forms</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new form.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Published Version
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formRecords.map((form) => (
                    <tr key={form.Id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <svg
                              className="h-6 w-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{getFormDisplayName(form)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(form)}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {form.FormVersions.find((v) => v.Stage__c === 'Publish')?.Version__c 
                          ? `V${form.FormVersions.find((v) => v.Stage__c === 'Publish').Version__c}`
                          : 'None'}
                      </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isFormActionLoading  ? (
                          <div className="inline-flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                            Loading...
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditForm(form)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                            disabled={isFormActionLoading }
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal for selecting form creation option */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2 className="form-title">Create New Form</h2>
                <button className="close-button-container" onClick={() => setIsModalOpen(false)}> 
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 1.00714L8.99286 0L5 3.99286L1.00714 0L0 1.00714L3.99286 5L0 8.99286L1.00714 10L5 6.00714L8.99286 10L10 8.99286L6.00714 5L10 1.00714Z" fill="#5F6165"/>
                      </svg>

                </button>
              </div>
              <div className="divider"></div>
              <div className="form-content">
                <div className="form-content-inner">
                  <div className="instruction-text">Select how you’d like to create your form:</div>
                  <div className="options-container">
                    <div className="option-card scratch-option" onClick={() => handleOptionSelect('scratch')}>
                      <div className="preview-image">
                        <img src="/images/form_scratch.svg" alt="Scratch Option" />
                      </div>
                      <div className="option-text">
                        <div className="option-title">Build from Scratch</div>
                        <div className="option-description">Start with a blank canvas and full cutomization</div>
                      </div>
                    </div>
                    <div className="option-card salesforce-option" onClick={() => handleOptionSelect('salesforce')}>
                      <div className="preview-image">
                        <img src="/images/form_build.svg" alt="Salesforce Option" />
                      </div>
                      <div className="option-text">
                        <div className="option-title">Build using Salesforce</div>
                        <div className="option-description">Connect to your Salesforce data and object</div>
                      </div>
                    </div>
                    <div className="option-card templates-option" onClick={() => handleOptionSelect('templates')}>
                      <div className="preview-image">
                        <img src="/images/form_template.svg" alt="Templates Option" />
                      </div>
                      <div className="option-text">
                        <div className="option-title">Use a Template</div>
                        <div className="option-description">Start with professionally design template</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {isFormNameOpen && (
        <FormName
          onClose={() => setIsFormNameOpen(false)}
          fields={[
            {
              id: 'default-header',
              type: 'header',
              heading: 'Contact Form',
              alignment: 'center',
            },
          ]}
        />
      )}
    </div>
  );

};

export default Home;