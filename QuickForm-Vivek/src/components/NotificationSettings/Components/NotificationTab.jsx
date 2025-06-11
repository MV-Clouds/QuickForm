'use client'

import React, { useRef, useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Pill } from './Pill';
import { ConditionInput } from './ConditionInput';
import { MergeTagMenu } from './MergeTagMenu';
import { formFields, smsTemplates } from '../utils';

export const NotificationTab = ({
  rules,
  setRules,
  setActiveTab,
  editingRuleId,
  setEditingRuleId,
  showNotificationForm,
  setShowNotificationForm,
  showAddOptions,
  setShowAddOptions
}) => {
  const { register, handleSubmit, control, reset, setValue } = useForm({
    defaultValues: editingRuleId
      ? rules.find(r => r.id === editingRuleId) || {
        recipients: [],
        customPhones: [],
        conditions: [],
        smsBody: '',
        schedule: 'immediate'
      }
      : {
        recipients: [],
        customPhones: [],
        conditions: [],
        smsBody: '',
        schedule: 'immediate'
      }
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control,
    name: 'conditions'
  });

  const { fields: customPhoneFields, append: appendCustomPhone, remove: removeCustomPhone } = useFieldArray({
    control,
    name: 'customPhones'
  });

  const [mergeTagMenu, setMergeTagMenu] = useState(null);
  const [smsCharCount, setSmsCharCount] = useState(0);
  const [isAddOptionsVisible, setIsAddOptionsVisible] = useState(false);

  // Simulate fetching phone numbers
  useEffect(() => {
    const fetchedPhones = ['+1234567890', '+0987654321'];
    setValue('recipients', fetchedPhones);
    fetchedPhones.forEach(phone => appendCustomPhone({ value: phone }));
  }, [setValue, appendCustomPhone]);

  const onSubmit = (data) => {
    const payload = {
      id: editingRuleId || Date.now(),
      type: ['SMS'],
      condition: data.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND '),
      recipients: [...data.recipients, ...data.customPhones.map(p => p.value)],
      status: editingRuleId ? rules.find(r => r.id === editingRuleId).status : 'Active',
      template: {
        sms: data.smsBody
      },
      schedule: data.schedule
    };

    setRules(editingRuleId
      ? rules.map(r => r.id === editingRuleId ? payload : r)
      : [...rules, payload]);

    reset();
    setShowNotificationForm(false);
    setActiveTab(null);
  };

  const handleTemplateSelect = (template) => {
    setValue('smsBody', template.body);
    setSmsCharCount(template.body.length);
  };

  // Toggle add options with animation state
  const toggleAddOptions = () => {
    setShowAddOptions(!showAddOptions);
    setIsAddOptionsVisible(!isAddOptionsVisible);
  };

  return (
    <div className="p-4 md:p-8 w-full min-h-[calc(100vh-2rem)] rounded-r-2xl">
      {/* <h2 className="text-3xl font-bold text-gray-800 tracking-tight mb-6">Notification Rules</h2> */}
      {!showNotificationForm ? (
        <div className="rounded-xl shadow-lg p-4 md:p-6 w-full">
          <div className="flex justify-end mb-6">
            <button
              className="px-5 py-2.5 bg-blue-900 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center gap-2"
              onClick={toggleAddOptions}
            >
              Add Rule
            </button>
          </div>

          {/* Add Options Dropdown */}
          <div className={` border border-dark-900 rounded-xl shadow-xl w-72 z-50  right-0
            transition-all duration-300 ease-in-out 
            ${showAddOptions ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
            {showAddOptions && (
              <>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-base font-semibold text-gray-800">Create New Rule</h3>
                  <button
                    onClick={toggleAddOptions}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="py-2">
                  <button
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-3"
                    onClick={() => {
                      setActiveTab('email');
                      toggleAddOptions();
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-3"
                    onClick={() => {
                      setShowNotificationForm(true);
                      setActiveTab('notification');
                      toggleAddOptions();
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    SMS Notification
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-3"
                    onClick={() => {
                      setActiveTab('digest');
                      toggleAddOptions();
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Digest Email
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800">
                  <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">Type</th>
                  <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">Condition</th>
                  <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">Recipients</th>
                  <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">Status</th>
                  <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-700">{rule.type.join(', ')}</td>
                    <td className="p-4 text-gray-700">{rule.condition || 'None'}</td>
                    <td className="p-4 text-gray-700">{rule.recipients.join(', ')}</td>
                    <td className="p-4 text-gray-700">
                      <span className={`w-[90px] inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${rule.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {rule.status === 'Active' ? (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Active
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 flex gap-3">
                      <button
                        className="px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all duration-200 shadow-sm"
                        onClick={() => {
                          setEditingRuleId(rule.id);
                          setShowNotificationForm(rule.type.includes('SMS'));
                          setActiveTab(rule.type.includes('Email') && !rule.type.includes('SMS') ? 'email' : 'notification');
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="px-4 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-sm"
                        onClick={() => setRules(rules.filter(r => r.id !== rule.id))}
                      >
                        Delete
                      </button>
                      <button
                        className="w-[100px] px-4 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 shadow-sm"
                        onClick={() => {
                          setRules(rules.map(r =>
                            r.id === rule.id ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active' } : r
                          ));
                        }}
                      >
                        {rule.status === 'Active' ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className='w-full'>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            {editingRuleId ? 'Edit SMS Rule' : 'New SMS Rule'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="border-b border-gray-300 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Recipients</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {customPhoneFields.map((field, index) => (
                  <Pill 
                    key={field.id}
                    value={field.value}
                    onRemove={() => removeCustomPhone(index)}
                  />
                ))}
              </div>
              <div className="flex gap-3 mb-3">
                <input
                  type="tel"
                  placeholder="Add phone number"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      e.preventDefault();
                      appendCustomPhone({ value: e.target.value });
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  onClick={() => {
                    const input = document.querySelector('input[type="tel"]');
                    if (input.value) {
                      appendCustomPhone({ value: input.value });
                      input.value = '';
                    }
                  }}
                >
                  Add Phone
                </button>
              </div>
            </div>

            <div className="border-b border-gray-300 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">SMS Template</h3>
              <div className="flex gap-3 mb-3">
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                  onChange={(e) => {
                    const template = smsTemplates.find(t => t.id === e.target.value);
                    if (template) handleTemplateSelect(template);
                  }}
                >
                  <option value="">Select a template</option>
                  {smsTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                  onClick={() => setMergeTagMenu('sms')}
                >
                  Insert Merge Tag
                </button>
              </div>
              <div className="relative">
                <textarea
                  placeholder="SMS message (160 character limit)"
                  maxLength={160}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800 min-h-[80px] resize-y"
                  {...register('smsBody', {
                    onChange: (e) => setSmsCharCount(e.target.value.length)
                  })}
                />
                <div className="absolute bottom-2 right-3 text-sm text-gray-500">
                  {smsCharCount}/160
                </div>
              </div>
            </div>

            <ConditionInput
              control={control}
              appendCondition={appendCondition}
              removeCondition={removeCondition}
              conditionFields={conditionFields}
              formFields={formFields}
            />

            <div className="border-b border-gray-300 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Schedule</h3>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                {...register('schedule')}
              >
                <option value="immediate">Send Immediately</option>
                <option value="delay">After Delay</option>
                <option value="manual">Manually</option>
              </select>
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                onClick={() => {
                  reset();
                  setShowNotificationForm(false);
                  setActiveTab(null);
                }}
              >
                Back
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                  onClick={() => {
                    reset();
                    setShowNotificationForm(false);
                  }}
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  Save SMS Rule
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};