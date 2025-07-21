import React, { useState, useEffect, useRef } from 'react';
import NotificationTab from './Components/NotificationTab.js';
import { EmailTab } from './Components/EmailTab.js';
import { DigestEmailTab } from './Components/DigestEmailTab.js';
import { useParams } from 'react-router-dom';
const NotificationSettings = ({ currentFields }) => {

  const [activeTab, setActiveTab] = useState(null);
  const [rules, setRules] = useState();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { formVersionId } = useParams();
  const [token, setToken] = useState();
  const [formId, setFormId] = useState();
  const [loading, setLoading] = useState(false);
  const userId = sessionStorage.getItem('userId');
  const instanceUrl = sessionStorage.getItem('instanceUrl');

  const [editingRuleId, setEditingRuleId] = useState(null);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const [formFieldsData, setFormfieldData] = useState([]);

  useEffect(()=>{
    console.log('Current fields ==> ', currentFields);
    
  },[currentFields])
  const fetchFormId = async () => {
    setLoading(true);
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

      let formRecords = [];
      if (data.FormRecords) {
        try {
          formRecords = JSON.parse(data.FormRecords);

        } catch (e) {
          console.warn('Failed to parse FormRecords:', e);
        }
      }
      // console.log('FormversionId ==> ', formVersionId);
      // console.log('Formdata', formRecords);
      const formRecord = formRecords.find(form => form.FormVersions.some(version => version.Id === formVersionId));
      // console.log('formrecord', formRecord, formRecord.Id)

      // if (formRecord && formRecord.FormVersions && formRecord.FormVersions.length > 0) {
      //   const version = formRecord.FormVersions.find(v => v.Id === formVersionId) || formRecord.FormVersions[0];
      //   // console.log('Version ==>', version);

      //   setFormfieldData(version.Fields || []);
      //   console.log(formFieldsData, 'Data');

      // } else {
      //   setFormfieldData([]);
      // }

      if (!formRecord) {
        throw new Error(`Form record with version Id ${formVersionId} not found`);
      }
      setFormId(formRecord.Id);
    } catch (error) {
      console.log("Error on form id fetching ==> ", error)
    }
  }
  const fetchAllData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const response = await fetch(`https://kf17mvi36k.execute-api.us-east-1.amazonaws.com/notify?instanceUrl=${encodeURIComponent(instanceUrl)}&formId=${encodeURIComponent(formId)}&forceRefresh=${forceRefresh}&userId=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rules');
      }

      const data = await response.json();
      console.log('Fetched Rules:', data);

      const cleanData = typeof data.records === 'string' ? JSON.parse(data?.records).map((field) => {
        return {
          id: field.Id,
          title: field.Title__c,
          type: field.Type__c,
          status: field.Status__c,
          createdDate: new Date(field.CreatedDate).toLocaleDateString('en-GB'),
          body: field.Body__c,
          receipents: field.Receipe__c
        }
      }) : data?.records.map((field) => {
        return {
          id: field.Id,
          title: field.Title__c,
          type: field.Type__c,
          status: field.Status__c,
          createdDate: new Date(field.CreatedDate).toLocaleDateString('en-GB'),
          body: field.Body__c,
          receipents: field.Receipe__c
        }
      })
      setRules(cleanData); // Assuming setRules is a function to update the state with the fetched rules
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };
  async function fetchData() {
    try {
      const response = await fetch('https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/getAccessToken/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          instanceUrl,
        }),
      });
      const tokenData = await response.json();
      setToken(tokenData.access_token);
      if (!response.ok || tokenData.error) {
        throw new Error(tokenData.error || 'Failed to fetch access token');
      }
      console.log('tokenData', tokenData);
    } catch {
      console.error('Error fetching access token');
    }
  }

  useEffect(() => {
    // Define an async function to handle data fetching
    const fetchDataAsync = async () => {
      try {
        if (!token) {
          // Fetch access token
          await fetchData();

        }

        // If token is available, proceed to fetch form ID and all data
        if (token) {
          fetchFormId();
        }
        if (formId) {
          fetchAllData();
        }
      } catch (error) {
        // Log any errors encountered during data fetching
        console.log('Error in Fetching data : ', error)
      }
    };
    // Call the async function to start the data fetching process
    fetchDataAsync();
  }, [userId, instanceUrl, token, formId]);
  const sendNotificationData = async (payload) => {
    try {
      const response = await fetch('https://kf17mvi36k.execute-api.us-east-1.amazonaws.com/notify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationData: { Form__c: formId, ...payload }, instanceUrl }),
      });
      console.log('response', response);

      const res = await response.json()
      console.log('Response from lambda ==> ', res);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Response Data ====> ', data);
      return res.message || 'Saved successfully';
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
    } finally {
      fetchAllData(true);
    }
  };

  const updateNotificationData = async (payload) => {
    try {
      const response = await fetch('https://kf17mvi36k.execute-api.us-east-1.amazonaws.com/notify', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: payload.Id ? payload.Id : editingRuleId, updatedData: { Form__c: formId, ...(payload.Id ? { ...payload, Id: undefined } : payload) }, instanceUrl }),
      });
      console.log('response', response);

      const res = await response.json()
      console.log('Response from lambda ==> ', res);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Response Data ====> ', data);
      return res.message || 'Saved successfully';
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
    } finally {
      fetchAllData(true);
    }
  };

  //Handle Status Change
  const handleStatusChange = async (id) => {
    try {
      console.log('Status changed for rule ==> ', id);

      const data = rules.find(r => r.id === id);
      console.log('Data ==>', data);

      const payload = {
        Title__c: data.title || '',
        Receipe__c: data.receipents,
        Body__c: data.body,
        Type__c: data.type,
        Status__c: data.status === 'Active' ? 'Inactive' : 'Active',
        Id: id
      };
      console.log('Updating status ==>', payload);

      if (id) {
        console.log('updating');

        const res = await updateNotificationData(payload)
        console.log('Updated ', res);

      }
    } catch (error) {
      console.log('Error in changing status');
    }
  };
  // services/notificationService.js
  const deleteNotificationData = async (id) => {
    try {
      const response = await fetch(`https://kf17mvi36k.execute-api.us-east-1.amazonaws.com/notify?notificationId=${id}&instanceUrl=${instanceUrl}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
      return await response.json();
    } catch (error) {
      // Log error for debugging
      console.error('API error in deleteNotificationData:', error);
      throw error;
    } finally {
      fetchAllData(true);
    }
  };
  return (
    <div className="min-h-screen">
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid transition-all duration-300 ease-in-out hover:border-blue-700 hover:scale-110"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-300 animate-pulse opacity-50"></div>
          </div>
          <span className="ml-4 text-lg font-semibold text-blue-500 transition-colors duration-300 group-hover:text-blue-700">
            Loading rules...
          </span>
        </div>
      )}
      {!loading && (
        <div className="flex-col w-full ">
          <div className=" bg-gray-50 rounded-2xl shadow-2xl">
            <div className="bg-gradient-to-br from-black-50 to-black-100">
              {activeTab === 'SMS' && (
                <NotificationTab
                  rules={rules}
                  setRules={setRules}
                  setActiveTab={setActiveTab}
                  editingRuleId={editingRuleId}
                  setEditingRuleId={setEditingRuleId}
                  showNotificationForm={showNotificationForm}
                  setShowNotificationForm={setShowNotificationForm}
                  showAddOptions={showAddOptions}
                  setShowAddOptions={setShowAddOptions}
                  sendNotificationData={sendNotificationData}
                  formFieldsData={currentFields}
                />
              )}
              {activeTab === 'Email' && (
                <EmailTab
                  rules={rules}
                  setRules={setRules}
                  setActiveTab={setActiveTab}
                  editingRuleId={editingRuleId}
                  setEditingRuleId={setEditingRuleId}
                  sendNotificationData={sendNotificationData}
                  updateNotificationData={updateNotificationData}
                  formFieldsData={currentFields}

                />
              )}
              {activeTab === 'digest' && (
                <DigestEmailTab
                  setActiveTab={setActiveTab}
                  updateNotificationData={updateNotificationData}
                  sendNotificationData={sendNotificationData}
                  editingRuleId={editingRuleId}
                  rules={rules}
                  setEditingRuleId={setEditingRuleId}
                  formFieldsData={currentFields}
                />
              )}
              {activeTab === null && (
                <NotificationTab
                  rules={rules}
                  setRules={setRules}
                  setActiveTab={setActiveTab}
                  editingRuleId={editingRuleId}
                  setEditingRuleId={setEditingRuleId}
                  showNotificationForm={showNotificationForm}
                  setShowNotificationForm={setShowNotificationForm}
                  showAddOptions={showAddOptions}
                  setShowAddOptions={setShowAddOptions}
                  updateNotificationData={updateNotificationData}
                  handleStatusChange={handleStatusChange}
                  deleteNotificationData={deleteNotificationData}
                  formFieldsData={currentFields}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>

  );
};


export default NotificationSettings;