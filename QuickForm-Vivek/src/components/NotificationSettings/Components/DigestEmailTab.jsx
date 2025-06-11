'use client'

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Pill } from './Pill';
import { MergeTagMenu } from './MergeTagMenu';
import {formFields,emailTemplates} from '../utils';

export const  DigestEmailTab = ({ setActiveTab }) => {
  const { register, handleSubmit, watch, control, setValue } = useForm({
    defaultValues: {
      digestEnabled: false,
      frequency: 'daily',
      time: '08:00',
      recipients: [],
      customEmails: [],
      emailSubject: 'Daily Submission Digest',
      emailBody: 'Hello,\n\nYou received {{submissionCount}} submissions today.\n\nBest regards,\nTeam'
    }
  });

  const { fields: customEmailFields, append: appendCustomEmail, remove: removeCustomEmail } = useFieldArray({
    control,
    name: 'customEmails'
  });

  const [mergeTagMenu, setMergeTagMenu] = React.useState(null);

  React.useEffect(() => {
    const fetchedEmails = ['admin@example.com', 'manager@example.com'];
    setValue('recipients', fetchedEmails);
    fetchedEmails.forEach(email => appendCustomEmail({ value: email }));
  }, [setValue, appendCustomEmail]);

  const onSubmit = (data) => {
    console.log('Digest Settings Saved:', {
      ...data,
      recipients: [...data.recipients, ...data.customEmails.map(e => e.value)]
    });
    setActiveTab(null);
  };

  const handleTemplateSelect = (template) => {
    setValue('emailSubject', template.subject);
    setValue('emailBody', template.body);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Digest Email Settings</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="border-b border-gray-300 pb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-5 w-5 text-blue-500 rounded focus:ring-blue-400"
              {...register('digestEnabled')}
            />
            <span className="text-gray-800">Enable Digest Emails</span>
          </label>
        </div>

        {watch('digestEnabled') && (
          <>
            <div className="border-b border-gray-300 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Recipients</h3>
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
                  }}
                >
                  <option value="">Select a template</option>
                  {emailTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
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
              <textarea
                placeholder="Email body"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800 min-h-[100px] resize-y"
                {...register('emailBody')}
              />
            </div>
          </>
        )}

        <div className="flex justify-between gap-3">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            onClick={() => setActiveTab(null)}
          >
            Back
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Save Digest Settings
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