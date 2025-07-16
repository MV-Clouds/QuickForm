import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormName from './FormName';
import Datatable from '@/components/Datatable/ShowPage';
import Sidebar from '../sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle, FileInput } from 'lucide-react';

const dummyUsername = 'Jane Cooper';

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState(null);
  const [forms, setForms] = useState([]);
  const [selectedVersions, setSelectedVersions] = useState({});
  const [fetchError, setFetchError] = useState(null);
  const [isFormNameOpen, setIsFormNameOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNav, setSelectedNav] = useState('home');
  const navigate = useNavigate();

  // Analytics data (dynamic)
  const totalForms = forms.length;
  const activeForms = forms.filter(f => f.status === 'active').length;
  const totalSubmissions = forms.reduce((acc, f) => acc + (f.submissionCount || 0), 0);

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

  // Fetch forms from DynamoDB via Lambda
  const fetchForms = async (userId, instanceUrl) => {
    setIsLoading(true);
    try {
      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
      const response = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          instanceUrl: cleanedInstanceUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch metadata');
      }

      // Parse FormRecords
      let formRecords = [];
      if (data.FormRecords) {
        try {
          formRecords = JSON.parse(data.FormRecords);
        } catch (e) {
          console.warn('Failed to parse FormRecords:', e);
        }
      }

      setForms(formRecords);
    } catch (error) {
      console.error('Error fetching forms:', error);
      setFetchError(error.message || 'Failed to load forms');
    } finally {
      setIsLoading(false)
    }
  };

  // Warm up fetchMetadata Lambda function
  const warmFetchMetadata = async (userId, instanceUrl, token) => {
    try {
      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
      await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: cleanedInstanceUrl,
        }),
      });
    } catch (error) {
      console.error('Error warming fetchMetadata Lambda:', error);
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
        await Promise.all([
          fetchForms(userId, instanceUrl),
          warmFetchMetadata(userId, instanceUrl, token),
          warmFetchFieldsForObject(userId, instanceUrl, token),
        ]);
      }
    } else {
      setFetchError('Missing userId or instanceUrl. Please log in.');
    }
  };

  useEffect(() => {
    initializePage();
  }, []);

  const handleCreateForm = () => {
    console.log('Form click')
    setIsModalOpen(true);
  };

  const handleOptionSelect = (option) => {
    setIsLoading(true);
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
      setIsLoading(false);
      setIsFormNameOpen(true);
    } else if (option === 'templates') {
      setIsLoading(false);
      navigate('/template');
    }
  };

  const handleEditForm = async (form) => {
    console.log('form data edit ', form);

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
    return publishedVersion?.Name || 'Unnamed Form';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        username={dummyUsername}
        selected={selectedNav}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onSelect={setSelectedNav}
      />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className=" px-10 py-8 rounded-b-xl shadow-lg relative" style={{ background: 'linear-gradient(to right, #008AB0, #8FDCF1)' }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <h1 className="text-3xl font-bold text-white mb-1">Hey, {dummyUsername}</h1>
            <p className="text-lg text-blue-100">Define the Contact Form of the list view</p>
          </motion.div>
          {/* Analytics Cards */}
          <motion.div
            className="flex gap-6 absolute -bottom-16 left-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{ left: '500px' }}
          >
            <motion.div className="bg-white rounded-2xl shadow-lg px-8 py-6 flex flex-col items-center min-w-[160px] border border-blue-100" whileHover={{ scale: 1.04 }}>
              <FileText className="text-blue-500 mb-2" size={32} />
              <span className="text-3xl font-bold text-blue-700">{totalForms}</span>
              <span className="text-gray-500 mt-1">Forms</span>
            </motion.div>
            <motion.div className="bg-white rounded-2xl shadow-lg px-8 py-6 flex flex-col items-center min-w-[160px] border border-blue-100" whileHover={{ scale: 1.04 }}>
              <CheckCircle className="text-blue-500 mb-2" size={32} />
              <span className="text-3xl font-bold text-blue-700">{activeForms}</span>
              <span className="text-gray-500 mt-1">Active Forms</span>
            </motion.div>
            <motion.div className="bg-white rounded-2xl shadow-lg px-8 py-6 flex flex-col items-center min-w-[160px] border border-blue-100" whileHover={{ scale: 1.04 }}>
              <FileInput className="text-blue-500 mb-2" size={32} />
              <span className="text-3xl font-bold text-blue-700">{totalSubmissions}</span>
              <span className="text-gray-500 mt-1">Submission</span>
            </motion.div>
          </motion.div>
        </div>
        <div className="pt-12 px-10 pb-10">
          <AnimatePresence>
            <motion.div
              key="datatable"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
            >
              <Datatable forms={forms} handleEditForm={handleEditForm} handleCreateForm={handleCreateForm} isLoading={isLoading} />
            </motion.div>
          </AnimatePresence>
        </div>
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
      {/* Modal for selecting form creation option */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 border border-gray-100 transform transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Create New Form</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl transition-colors duration-200"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p className="text-gray-500 mb-6">Select how you'd like to create your form:</p>

            <div className="space-y-4">
              {/* Build from Scratch */}
              <button
                onClick={() => handleOptionSelect('scratch')}
                onMouseEnter={() => setHoveredOption('scratch')}
                onMouseLeave={() => setHoveredOption(null)}
                className={`flex items-start p-4 border rounded-xl w-full transition-all duration-200 ${hoveredOption === 'scratch'
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-blue-200'
                  }`}
              >
                <div
                  className={`p-3 rounded-lg mr-4 ${hoveredOption === 'scratch'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-800">Build from Scratch</h3>
                  <p className="text-sm text-gray-500">Start with a blank canvas and full customization</p>
                </div>
              </button>

              {/* Build using Salesforce */}
              <button
                onClick={() => handleOptionSelect('salesforce')}
                onMouseEnter={() => setHoveredOption('salesforce')}
                onMouseLeave={() => setHoveredOption(null)}
                className={`flex items-start p-4 border rounded-xl w-full transition-all duration-200 ${hoveredOption === 'salesforce'
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-blue-200'
                  }`}
              >
                <div
                  className={`p-3 rounded-lg mr-4 ${hoveredOption === 'salesforce'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-800">Build using Salesforce</h3>
                  <p className="text-sm text-gray-500">Connect to your Salesforce data and objects</p>
                </div>
              </button>

              {/* Build from Predefined Templates */}
              <button
                onClick={() => handleOptionSelect('templates')}
                onMouseEnter={() => setHoveredOption('templates')}
                onMouseLeave={() => setHoveredOption(null)}
                className={`flex items-start p-4 border rounded-xl w-full transition-all duration-200 ${hoveredOption === 'templates'
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-blue-200'
                  }`}
              >
                <div
                  className={`p-3 rounded-lg mr-4 ${hoveredOption === 'templates'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-800">Use a Template</h3>
                  <p className="text-sm text-gray-500">Start with professionally designed templates</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
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