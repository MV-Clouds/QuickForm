import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormName from './FormName';
import Datatable from '../Datatable/ShowPage';
import Sidebar from './sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import Integrations from '../integrations/Integrations';
import InactivityTracker from '../time-out/InactivityTracker';
import { useSalesforceData } from '../Context/MetadataContext';
import './home.css';
import RecentFilesSlider from './RecentFilesSlider';
import FolderManager from './FolderManager';
import FieldsetPage from './FieldSetPageNew';
import Bin from './Bin'
const Home = () => {
  const {
    metadata,
    formRecords,
    isLoading: contextLoading,
    error: contextError,
    fetchSalesforceData,
    userProfile,
    Fieldset
  } = useSalesforceData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [selectedVersions, setSelectedVersions] = useState({});
  const [isFormNameOpen, setIsFormNameOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNav, setSelectedNav] = useState('home');
  const [token, settoken] = useState();
  const navigate = useNavigate();
  const userId = sessionStorage.getItem('userId');
  const instanceUrl = sessionStorage.getItem('instanceUrl');
  // Analytics data (dynamic)
  const totalForms = formRecords.length;
  const activeForms = formRecords.filter(f => f.Status__c === 'Active').length;
  const totalSubmissions = formRecords.reduce((acc, f) => acc + (f.Total_Submission_Count__c || 500), 0);
  const [isCreating ,setisCreating] = useState(false);
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

  // Initialize page by fetching formRecords and warming Lambdas
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
          fetchSalesforceData(userId, instanceUrl),
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
    console.log('deleting...', formId)
    try {
      
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
    } catch (error) {
      console.error('Error deleting form:', error);
    } finally {
      fetchSalesforceData(sessionStorage.getItem('userId'), sessionStorage.getItem('instanceUrl'));
    }
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
    }
  };

  // Handler for creating a folder (for now, just log)
  const handleCreateFolder = async (folderName, selectedFormIds) => {
    // TODO: Implement backend update logic here
    setisCreating(true);
    console.log('Create folder:', folderName, 'with forms:', selectedFormIds);
    // Make API call to backend to create/update folder
    
      try {
        // Get userId and instanceUrl from userProfile/context
        
        if (!userId || !instanceUrl) {
          console.error('Missing userId or instanceUrl for folder creation');
          return;
        }
        // Call the folder API
        const response = await fetch('https://8rq1el4sv2.execute-api.us-east-1.amazonaws.com/folder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            folderName,
            formIds: selectedFormIds,
            instanceUrl,
            token,
            userId,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create/update folder');
        }
        console.log('Folder created/updated successfully:', data);
        // Optionally, refresh data or show success message here
      } catch (error) {
        console.error('Error creating/updating folder:', error);
      }finally{
        setisCreating(false)
        fetchSalesforceData(userId , instanceUrl);
      }
    

    // You would update Folder__c for each selected form in your backend
  };

  // Handler for toggling form status
  const handleToggleStatus = async (formId) => {
    console.log('Toggling status for form:', formId);
    // Implement status toggle logic here
    // This would typically involve an API call to update the form status
  };

  return (
    <div className={`flex min-h-screen`} style={{ marginLeft: `${!sidebarOpen ? '60px' : ''}` }}>
      {
        selectedNav === 'home' ? (
          // {/* Analytics Cards - Top Right */}
          <div className="analytics-cards-container">
            <div className="analytics-card">
              <div className="analytics-card-content">
                <div>
                  <h3>Forms</h3>
                  <span>{totalForms}</span>
                </div>
                <img
                  src="/images/file.png"
                  alt="Forms"
                  className="analytics-card-image"
                />
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-content">
                <div>
                  <h3>Active Forms</h3>
                  <span>{activeForms}</span>
                </div>
                <img
                  src="/images/file2.png"
                  alt="Active Forms"
                  className="analytics-card-image"
                />
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-content">
                <div>
                  <h3>Submissions</h3>
                  <span>{totalSubmissions}</span>
                </div>
                <img
                  src="/images/file3.png"
                  alt="Submissions"
                  className="analytics-card-image"
                />
              </div>
            </div>
          </div>
        ) : ''
      }
      {/* <InactivityTracker /> */}
      <Sidebar
        username={userProfile.user_name}
        selected={selectedNav}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onSelect={setSelectedNav}
      />
      <div className={`flex-1 transition-all  duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {selectedNav === 'integration' ? (
          <Integrations token={token} />
        ) : selectedNav === 'folders' ? (
          <div className='w-[95%] h-[90%] mx-auto mt-4 rounded-xl shadow-xl flex flex-col py-5'>
            {/* <RecentFilesSlider
              recentForms={[...formRecords].sort((a, b) => new Date(b.LastModifiedDate) - new Date(a.LastModifiedDate))}
              onViewForm={handleEditForm}
            /> */}
            <FolderManager
              recentForms={[...formRecords].sort((a, b) => new Date(b.LastModifiedDate) - new Date(a.LastModifiedDate))}
              handleCreateFolder={handleCreateFolder} 
              isCreating={isCreating}
              onViewForm={handleEditForm}
              onEditForm={handleEditForm}
              onDeleteForm={handleDeleteForm}
              onToggleStatus={handleToggleStatus}
            />
          </div>
        ) : selectedNav === 'fieldset' ? (
          <FieldsetPage token={token} instanceUrl={instanceUrl} Fieldset = {Fieldset} userId = {userId} fetchMetadata = {fetchSalesforceData} isLoading ={contextLoading} />
        ) : selectedNav === 'bin' ? <Bin instanceUrl = {instanceUrl} userId = {userId} fetchMetadata = {fetchSalesforceData} isLoading = {contextLoading} /> : (
          <>
            <div className=" px-10 py-1  relative" style={{ background: 'linear-gradient(to right, #008AB0, #8FDCF1)' }}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                {userProfile.user_name ? (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 80 }}
                  >
                    <motion.h1
                      className="text-3xl font-bold text-white mt-2"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 60 }}
                    >
                      Hey, {userProfile.user_name}
                    </motion.h1>
                    <motion.p
                      className="text-md text-blue-100"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 60 }}
                    >
                      Define the Contact Form of the list view
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="h-8 w-48 bg-blue-200/40 rounded animate-pulse"></div>
                      <div className="h-4 w-64 bg-blue-100/40 rounded animate-pulse"></div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
            <div className="mt-5">
              {/* <AnimatePresence> */}
              <motion.div
                style={{ padding: '26px 26px 0 26px' }}
                key="datatable"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Datatable forms={formRecords} handleEditForm={handleEditForm} handleCreateForm={handleCreateForm} isLoading={contextLoading} handleDeleteForm={handleDeleteForm} />
              </motion.div>
              {/* </AnimatePresence> */}
            </div>
          </>
        )}
      </div>

      {/* Modal for selecting form creation option */}
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