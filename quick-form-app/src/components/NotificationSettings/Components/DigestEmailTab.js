'use client'

import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Pill } from './Pill';
import { MergeTagMenu } from './MergeTagMenu';
import { formFields, emailTemplates, modules, formats } from '../utils';
import ReactQuill from 'react-quill';
import { ChevronLeft } from 'lucide-react';

export const DigestEmailTab = ({ setActiveTab, updateNotificationData, sendNotificationData, editingRuleId, rules ,setEditingRuleId,formFieldsData}) => {
  const { register, handleSubmit, watch, control, setValue, reset } = useForm({
    defaultValues: {
      digestEnabled: false,
      frequency: 'daily',
      time: '08:00',
      customEmails: editingRuleId
        ? (() => {
            try {
              const rule = rules.find(rule => rule.id === editingRuleId);
              const toArr = rule && rule.receipents
                ? JSON.parse(rule.receipents).to
                : [];
              // Ensure toArr is always an array of strings
              if (Array.isArray(toArr)) {
                return toArr.map(email => ({ value: email }));
              } else if (typeof toArr === 'string') {
                return [{ value: toArr }];
              }
              return [];
            } catch {
              return [];
            }
          })()
        : [],
      emailTitle: editingRuleId ? (rules.find(rule => rule.id === editingRuleId)?.title || 'Digest') : '',
      emailSubject: editingRuleId ? JSON.parse(rules.find(rule => rule.id === editingRuleId)?.body).subject  : '',
      emailBody: editingRuleId ? JSON.parse(rules.find(rule => rule.id === editingRuleId)?.body).body  : ''
    }
  });
  useEffect(()=>{
    console.log('edit id==>' , editingRuleId );
    console.log('rules==>',rules);
    console.log(customEmailFields);
    
    
    
  },[editingRuleId])
  const { fields: customEmailFields, append: appendCustomEmail, remove: removeCustomEmail } = useFieldArray({
    control,
    name: 'customEmails'
  });

  const [mergeTagMenu, setMergeTagMenu] = React.useState(null);


  const onSubmit = async (data) => {
    const toEmails = Array.from(
      new Set([
        ...(data.recipients || []),
        ...(data.customEmails ? data.customEmails.map(e => e.value) : [])
      ])
    ).filter(email => typeof email === 'string' && email.includes('@'));
    console.log('To emails==>' , toEmails);
    
    // Build the payload for digest email
    const payload = {
      Title__c: data.emailTitle || '',
      Body__c: JSON.stringify({subject: data.emailSubject || '', body: data.emailBody, attachment: 'https://dummyimage.com/600x400/000/fff' }),
      Type__c: 'Digest Email',
      Schedule__c: JSON.stringify({ frequency: data.frequency, time: data.time }),
      Receipe__c: JSON.stringify({ to:  toEmails }),
      Status__c : 'Active'
    };
    try {
      let res;
      if (editingRuleId) {
        // If editing, update the notification
        res = await updateNotificationData(payload);
        console.log('Digest email updated:', res);
      } else {
        // If not editing, create a new notification
        res = await sendNotificationData(payload);
        console.log('Digest email created:', res);
      }
    } catch (error) {
      // Log error for debugging
      console.log('Error in creating/updating digest email notification:', error);
    }
    // Reset form and close tab
    reset();
    setActiveTab(null);
  };

  const handleTemplateSelect = (template) => {
    setValue('emailSubject', template.subject);
    setValue('emailBody', template.body);
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <button
          type="button"
          className="px-2 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          onClick={() => {setActiveTab(null); setEditingRuleId(null)}}
        >
          <ChevronLeft/>
        </button>
        <div className="flex-1 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4 ">Digest Email Settings</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
          <>
            {/* Title Field */}
            <div className="border-b border-gray-300 pb-4">
              <label className="block text-lg font-semibold text-gray-800 mb-2" htmlFor="emailTitle">Title</label>
              <input
              required
                id="emailTitle"
                type="text"
                placeholder="Enter rule title"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800 mb-4"
                {...register('emailTitle', { required: true })}
              />
            </div>

            <div className="border-b border-gray-300 pb-4">
              <h3 className="text-lg font-semibold text-gray-800">Recipients</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {customEmailFields.map((field, index) => (
                  <Pill
                    key={field.id}
                    value={field.value}
                    onRemove={() => removeCustomEmail(index)}
                  />
                ))}
              </div>
              <div className="flex gap-3 mb-3">
                <input
                required
                  type="email"
                  placeholder="Add email address"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      e.preventDefault();
                      appendCustomEmail({ value: e.target.value });
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  onClick={() => {
                    const input = document.querySelector('input[type="email"]');
                    if (input.value) {
                      appendCustomEmail({ value: input.value });
                      input.value = '';
                    }
                  }}
                >
                  Add Email
                </button>
              </div>
            </div>

            <div className="border-b border-gray-300 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Schedule</h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-gray-800">Frequency</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                    {...register('frequency')}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-gray-800">Time</label>
                  <input
                  required
                    type="time"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                    {...register('time')}
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-gray-300 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Email Template</h3>
              <div className="flex gap-3 mb-3">
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                  onChange={(e) => {
                    const template = emailTemplates.find(t => t.id === e.target.value);
                    if (template) handleTemplateSelect(template);
                    else {
                      setValue('emailSubject', '');
                      setValue('emailBody', '');
                    }
                  }}
                >
                  <option value="" >Select a template</option>
                  {emailTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
              required
                type="text"
                placeholder="Subject"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800 mb-3"
                {...register('emailSubject')}
              />
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                  onClick={() => setMergeTagMenu('email')}
                >
                  Insert Merge Tag
                </button>
              </div>
              <Controller
                name="emailBody"
                control={control}
                rules={{ required: 'Email body is required' }}
                render={({ field }) => (
                  <ReactQuill
                    theme="snow"
                    placeholder="Email body"
                    modules={modules}
                    formats={formats}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    className='h-[200px] mb-12'
                  />
                )}
              />
            </div>
          </>
        

        <div className="flex justify-between gap-3">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            onClick={() => {setActiveTab(null); setEditingRuleId(null)}}
          >
            Back
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            {editingRuleId ? 'Update Digest Settings' : 'Save Digest Settings'}
          </button>
        </div>
      </form>

      {mergeTagMenu === 'email' && (
        <MergeTagMenu
          isOpen={mergeTagMenu === 'email'}
          onClose={() => setMergeTagMenu(null)}
          formFields={formFields}
        />
      )}
    </div>
  );
};