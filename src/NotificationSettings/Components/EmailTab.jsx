'use client'

import React , {useState , useEffect} from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Pill } from './Pill';
import { ConditionInput } from './ConditionInput';
import { MergeTagMenu } from './MergeTagMenu';
import {formFields , emailTemplates , modules , formats} from '../utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export  const EmailTab = ({ rules, setRules, setActiveTab, editingRuleId, setEditingRuleId }) => {
  const { register, handleSubmit, watch, control, reset, setValue } = useForm({
    defaultValues: editingRuleId
      ? rules.find(r => r.id === editingRuleId) || {
          emailEnabled: true,
          recipients: [],
          customEmails: [],
          ccEmails: [],
          bccEmails: [],
          emailSubject: '',
          emailBody: '',
          conditions: [],
          schedule: 'immediate',
          delayDateTime: '',
          attachment: null
        }
      : {
          emailEnabled: true,
          recipients: [],
          customEmails: [],
          ccEmails: [],
          bccEmails: [],
          emailSubject: '',
          emailBody: '',
          conditions: [],
          schedule: 'immediate',
          delayDateTime: '',
          attachment: null
        }
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control,
    name: 'conditions'
  });

  const { fields: customEmailFields, append: appendCustomEmail, remove: removeCustomEmail } = useFieldArray({
    control,
    name: 'customEmails'
  });
  
  const { fields: ccEmailFields, append: appendCcEmail, remove: removeCcEmail } = useFieldArray({
    control,
    name: 'ccEmails'
  });

  const { fields: bccEmailFields, append: appendBccEmail, remove: removeBccEmail } = useFieldArray({
    control,
    name: 'bccEmails'
  });

  const [mergeTagMenu, setMergeTagMenu] = useState(null);
  const [showCcInput, setShowCcInput] = useState(false);
  const [showBccInput, setShowBccInput] = useState(false);

  useEffect(() => {
    const fetchedEmails = ['user1@example.com', 'user2@example.com', 'admin@example.com'];
    setValue('recipients', fetchedEmails);
    fetchedEmails.forEach(email => appendCustomEmail({ value: email }));
  }, [setValue, appendCustomEmail]);

  const onSubmit = (data) => {
    const payload = {
      id: editingRuleId || Date.now(),
      type: ['Email'],
      condition: data.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND '),
      recipients: [...data.recipients, ...data.customEmails.map(e => e.value)],
      status: editingRuleId ? rules.find(r => r.id === editingRuleId).status : 'Active',
      template: {
        subject: data.emailSubject,
        body: data.emailBody,
        cc: data.ccEmails.map(e => e.value),
        bcc: data.bccEmails.map(e => e.value),
        attachment: data.attachment
      },
      schedule: data.schedule,
      delayDateTime: data.delayDateTime
    };

    setRules(editingRuleId
      ? rules.map(r => r.id === editingRuleId ? payload : r)
      : [...rules, payload]);

    reset();
    setActiveTab(null);
  };

  const handleTemplateSelect = (template) => {
    setValue('emailSubject', template.subject);
    setValue('emailBody', template.body);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        {editingRuleId ? 'Edit Email Rule' : 'New Email Rule'}
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              onClick={() => setShowCcInput(!showCcInput)}
            >
              {showCcInput ? 'Hide CC' : 'Add CC'}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              onClick={() => setShowBccInput(!showBccInput)}
            >
              {showBccInput ? 'Hide BCC' : 'Add BCC'}
            </button>
          </div>
          {showCcInput && (
            <div className="flex gap-3 mt-3">
              <input
                type="email"
                placeholder="Add CC email"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    e.preventDefault();
                    appendCcEmail({ value: e.target.value });
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Add CC email"]');
                  if (input.value) {
                    appendCcEmail({ value: input.value });
                    input.value = '';
                  }
                }}
              >
                Add CC
              </button>
            </div>
          )}
          {showBccInput && (
            <div className="flex gap-3 mt-3">
              <input
                type="email"
                placeholder="Add BCC email"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    e.preventDefault();
                    appendBccEmail({ value: e.target.value });
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Add BCC email"]');
                  if (input.value) {
                    appendBccEmail({ value: input.value });
                    input.value = '';
                  }
                }}
              >
                Add BCC
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {ccEmailFields.map((field, index) => (
              <Pill
                key={field.id}
                value={field.value}
                onRemove={() => removeCcEmail(index)}
                prefix="CC: "
              />
            ))}
            {bccEmailFields.map((field, index) => (
              <Pill
                key={field.id}
                value={field.value}
                onRemove={() => removeBccEmail(index)}
                prefix="BCC: "
              />
            ))}
          </div>
        </div>

        <div className="border-b border-gray-300 ">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Email Template</h3>
          <div className="flex gap-3 mb-3">
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
              onChange={(e) => {
                const template = emailTemplates.find(t => t.id === e.target.value);
                if (template) {handleTemplateSelect(template)}
                else{ setValue('emailBody' , ""); setValue('emailSubject' ,'')};
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
          <div className='flex mb-12'>
          <ReactQuill
            theme="snow"
            placeholder="Email body"
            modules={modules}
            formats={formats}
            value={watch('emailBody')}
            onChange={(content) => setValue('emailBody', content)}
            className="w-full mt-3 h-[200px] bg-white"
          />
          </div>
          <div className="mt-3">
            <label className="text-lg font-semibold text-gray-800 mb-3 ">Attach File</label>
            <input
              type="file"
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800"
              {...register('attachment')}
            />
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
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800 mb-3"
            {...register('schedule')}
          >
            <option value="immediate">Send Immediately</option>
            <option value="delay">After Delay</option>
            <option value="manual">Manually</option>
          </select>
          {watch('schedule') === 'delay' && (
            <div>
              <label className="text-gray-800">Delay Date & Time</label>
              <input
                type="datetime-local"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                {...register('delayDateTime')}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            onClick={() => {
              reset();
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
                setActiveTab(null);
              }}
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Save Email Rule
            </button>
          </div>
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
