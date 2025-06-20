 
import React, { useState } from 'react';
import { NotificationTab } from './Components/NotificationTab';
import { EmailTab } from './Components/EmailTab';
import { DigestEmailTab } from './Components/DigestEmailTab';
const NotificationSettings = () => { 
  const [activeTab, setActiveTab] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [rules, setRules] = useState([
    { id: 1, type: ['Email'], condition: 'country = India', recipients: ['admin@example.com', 'submitter@example.com'], status: 'Active' },
    { id: 2, type: ['SMS'], condition: 'phone is not empty', recipients: ['+1234567890'], status: 'Inactive' }
  ]);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="flex-col w-full ">
        <div className=" bg-gray-50 rounded-r-2xl shadow-2xl">
          <div className="bg-gradient-to-br from-black-50 to-black-100">
            {activeTab === 'notification' && (
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
              />
            )}
            {activeTab === 'email' && (
              <EmailTab
                rules={rules}
                setRules={setRules}
                setActiveTab={setActiveTab}
                editingRuleId={editingRuleId}
                setEditingRuleId={setEditingRuleId}
              />
            )}
            {activeTab === 'digest' && (
              <DigestEmailTab setActiveTab={setActiveTab} />
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
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );};


export default NotificationSettings;