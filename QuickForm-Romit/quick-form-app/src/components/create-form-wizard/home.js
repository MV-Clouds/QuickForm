import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormName from './FormName';
import Datatable from '../Datatable/ShowPage';
import Sidebar from './sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import Integrations from '../integrations/Integrations';
import InactivityTracker from '../time-out/InactivityTracker';
import './home.css';
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
  const [token, settoken] = useState();
  const navigate = useNavigate();

  // Analytics data (dynamic)
  const totalForms = forms.length;
  const activeForms = forms.filter(f => f.Status__c === 'Active').length;
  const totalSubmissions = forms.reduce((acc, f) => acc + (f.Total_Submission_Count__c || 500), 0);

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
      settoken(token);
      if (token) {
        await Promise.all([
          fetchForms(userId, instanceUrl),
          warmFetchMetadata(userId, instanceUrl, token),
          warmFetchFieldsForObject(userId, instanceUrl, token),
        ]);
      }
    } else {
      console.error('Missing userId or instanceUrl. Please log in.');
    }
  };

  useEffect(() => {
    initializePage();
  }, []);

  const handleCreateForm = () => {
    setIsModalOpen(true);
  };

  const handleDeleteForm = async (formId) => {
    // setIsLoading(true);
    console.log('deleting...', formId)
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      const response = await fetch('https://kd1xkj8zo2.execute-api.us-east-1.amazonaws.com/delete-user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          formId,
          instanceUrl,
          userId,
        }),
      });
      const data = await response.json();
      console.log('Response ==>', data)
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete form');
      }
      setForms((prev) => prev.filter((form) => form.Id !== formId));
    } catch (error) {
      console.error('Error deleting form:', error);
      setFetchError(error.message || 'Failed to delete form');
    } finally {
      setIsLoading(false);
    }
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
      <InactivityTracker />
      <Sidebar
        username={dummyUsername}
        selected={selectedNav}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onSelect={setSelectedNav}
      />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {selectedNav === 'integration' ? (
          <Integrations />
        ) : (
          <>
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
                className="flex gap-6 absolute -bottom-16 "
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{ left: '707px' }}
              >
                <motion.div className="bg-white rounded-2xl shadow-lg px-8 py-6 flex flex-col items-center min-w-[160px] border border-blue-100" whileHover={{ scale: 1.04 }}>
                  <div className='flex flex-col'>
                    <span className="text-3xl font-bold text-blue-700">{totalForms}</span>
                    <span className="text-gray-500 mt-1">Forms</span>
                    <img
                      src='/images/file.png'
                      alt="Analytics Visual"
                      className="w-12 h-12 object-contain ml-24 -rotate-12 hidden md:block"
                      style={{ alignSelf: 'center', opacity: 0.5 }}
                    />
                  </div>
                </motion.div>
                <motion.div className="bg-white rounded-2xl shadow-lg px-8 py-6 flex flex-col items-center min-w-[160px] border border-blue-100" whileHover={{ scale: 1.04 }}>
                  <div className='flex flex-col '>
                    <span className="text-3xl font-bold text-blue-700">{activeForms}</span>
                    <span className="text-gray-500 mt-1">Active Forms</span>
                    <img
                      src={'/images/file2.png'}
                      alt="Analytics Visual"
                      className="w-14 h-14 object-contain ml-24 -rotate-12 hidden md:block"
                      style={{ alignSelf: 'center', opacity: 0.5 }}
                    />
                  </div>
                </motion.div>
                <motion.div className="bg-white rounded-2xl shadow-lg px-8 py-6 flex flex-col items-center min-w-[160px] border border-blue-100" whileHover={{ scale: 1.04 }}>
                  <div className='flex flex-col '>
                    <span className="text-3xl font-bold text-blue-700">{totalSubmissions}</span>
                    <span className="text-gray-500 mt-1">Submission</span>
                    <img
                      src={'/images/file3.png'}
                      alt="Analytics Visual"
                      className="w-12 h-12 object-contain ml-24 -rotate-12 hidden md:block"
                      style={{ alignSelf: 'center', opacity: 0.5 }}
                    />
                  </div>
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
                  <Datatable forms={forms} handleEditForm={handleEditForm} handleCreateForm={handleCreateForm} isLoading={isLoading} handleDeleteForm={handleDeleteForm} />
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
   
+      {/* Modal for selecting form creation option */}
      {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2 className="form-title">Create New Form</h2>
                <button className="close-button-container" onClick={() => setIsModalOpen(false)}> 
                      <img src="/images/close_icon.svg" alt="Close" />
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