import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  X,
  ChevronDown,
  Paperclip,
  Filter,
  Check,
  ChevronUp,
  ChevronLast,
  ChevronLeft
} from 'lucide-react';
import { Pill } from './Pill';
import { ConditionInput } from './ConditionInput';
import { MergeTagMenu } from './MergeTagMenu';
import { formFields, emailTemplates, modules, formats } from '../utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Select, Switch } from "antd";
import CreatableSelect from "react-select/creatable";
import FileUploader from '../../file-upload/multiple-file-upload';
// ✅ Utility: email validator
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const EmailTab = ({ rules, setRules, setActiveTab, editingRuleId, setEditingRuleId,sendNotificationData ,updateNotificationData ,formFieldsData ,GoogleData}) => {
  const { register, handleSubmit, watch, control, reset, setValue } = useForm({
    defaultValues: editingRuleId
      ?  {
        emailEnabled: true,
        recipients: [],
        customEmails:  rules && editingRuleId
        ? (
            (() => {
              try {
                const toArr = JSON.parse(rules.find(rule => rule.id === editingRuleId)?.receipents || '{}').to;
                return Array.isArray(toArr) ? toArr.map(phone => ({ value: phone })) : [];
              } catch {
                return [];
              }
            })()
          )
        : [],
        ccEmails: rules && editingRuleId
        ? (() => {
            try {
              const ccArr = JSON.parse(rules.find(rule => rule.id === editingRuleId)?.receipents || '{}').cc;
              return Array.isArray(ccArr) ? ccArr.map(e => ({ value: e, label: e })) : [];
            } catch {
              return [];
            }
          })()
        : [],
        bccEmails:  rules && editingRuleId
        ? (() => {
            try {
              const bccArr = JSON.parse(rules.find(rule => rule.id === editingRuleId)?.receipents || '{}').bcc;
              return Array.isArray(bccArr) ? bccArr.map(e => ({ value: e, label: e })) : [];
            } catch {
              return [];
            }
          })()
        : [],
        emailSubject: rules && editingRuleId ? (JSON.parse(rules.find(rule => rule.id === editingRuleId)?.body).subject) : '',
        emailBody: rules && editingRuleId ? (JSON.parse(rules.find(rule => rule.id === editingRuleId)?.body).body) : '',
        conditions: rules && editingRuleId ? JSON.parse(rules.find(rule => rule.id === editingRuleId)?.condition) : [],
        schedule: 'immediate',
        delayDateTime: '',
        attachment: rules && editingRuleId ? (JSON.parse(rules.find(rule => rule.id === editingRuleId)?.body).attachment) : [],
        emailTitle : editingRuleId ? rules.find(rule => rule.id === editingRuleId).title : '',
        useThisGmail: rules && editingRuleId ? (JSON.parse(rules.find(rule => rule.id === editingRuleId)?.body).useThisGmail) : false,
        gmailAccount: rules && editingRuleId ? rules.find(rule => rule.id === editingRuleId)?.gmailAccount : '',
      }
      : {
        emailTitle : '',
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
        attachment: []
      }
  });
  console.log('Attachment' , watch('attachment'))
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
  const [loading , setLoading] = useState(false);
  const [mergeTagMenu, setMergeTagMenu] = useState(null);
  const [showCcInput, setShowCcInput] = useState(false);
  const [showBccInput, setShowBccInput] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showConditions, setShowConditions] = useState(false);


  const onSubmit = async (data) => {
    setLoading(true);
    const payload = {
      Title__c: data.emailTitle || '',
  
      Receipe__c: JSON.stringify({
        to: [
          ...data.customEmails.map(e => e.value),   // always array of strings
        ],
        cc: data.ccEmails.map(e => e.value),
        bcc: data.bccEmails.map(e => e.value)
      }),
  
      Body__c: JSON.stringify({
        subject: data.emailSubject,
        body: data.emailBody,
        attachment: data.attachment || null,
        useThisGmail: data.useThisGmail || false,
      }),
  
      Type__c: 'Email',
      Status__c: editingRuleId
        ? (rules.find(r => r.id === editingRuleId)?.status || 'Active')
        : 'Active',
  
      Condition__c: JSON.stringify(data.conditions),
      Gmail__c: data.useThisGmail ? data.gmailAccount : ''
    };
    console.log(payload)
    try {
      let res;
      if (editingRuleId) {
        res = await updateNotificationData(payload);
      } else {
        res = await sendNotificationData(payload);
      }
      console.log('Response from email ===>', res);
    } catch (error) {
      console.log('Error in Notification sending/updating to Salesforce', error);
    } finally {
      setLoading(false);
      reset();
      setActiveTab(null);
      setEditingRuleId(null)
    }
  };

  const handleTemplateSelect = (template) => {
    setValue('emailSubject', template.subject);
    setValue('emailBody', template.body);
    setShowTemplateDropdown(false);
  };

  const handleFileChange = (newUrls) => {
    const file = newUrls;
    if (file) {
      setSelectedFile(file);
      setValue('attachment', file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="  border rounded-2xl"
    >
      <div className="mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                reset();
                setActiveTab(null);
                setEditingRuleId(null);
              }}
              className="flex items-center gap-2 hover:bg-gray-300 p-2 rounded-lg transition-colors"
            >
              <ChevronLeft/>
            </button>
            <h2 className="text-4xl font-bold">
              {editingRuleId ? 'Edit Email Rule' : 'Create Email Rule'}
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowConditions(!showConditions)}
              className={`px-4 py-2 rounded-lg border-2 border-black flex items-center gap-2 font-bold ${showConditions ? 'bg-gray-300' : 'bg-white-900'}`}
            >
              <Filter size={16} />
              Conditions
              {showConditions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </motion.button>
          </div>
        </div>

        {/* Conditions Panel */}
        <AnimatePresence>
          {showConditions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <ConditionInput
                  control={control}
                  appendCondition={appendCondition}
                  removeCondition={removeCondition}
                  conditionFields={conditionFields}
                  formFields={formFieldsData}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
           {/* Title Field */}
           <div className="border-b border-gray-300 pb-4">
              <label className="block text-lg font-semibold text-gray-800 mb-2" htmlFor="emailTitle">Title</label>
              <input
                id="emailTitle"
                type="text"
                placeholder="Enter rule title"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800 mb-4"
                {...register('emailTitle', { required: true })}
              />
            </div>
            {/* Gmail Section */}
            <div className="pb-4">
              <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Gmail_Icon.png"
                  alt="Gmail"
                  className="w-6 h-6"
                />
                From Email
              </label>

              <div className="flex items-center gap-4">
                {/* Gmail Dropdown */}
                <Select
                  placeholder="Select Gmail Account"
                  className="flex-1"
                  disabled={!watch("useThisGmail")}
                  value={watch("gmailAccount")}
                  onChange={(val) => setValue("gmailAccount", val)}
                  options={GoogleData?.map((gmail) => ({
                    label: gmail.email,
                    value: gmail.email,
                  })) || []}
                />

                {/* Toggle Switch */}
                <Switch
                  checked={watch("useThisGmail")}
                  onChange={(checked) => setValue("useThisGmail", checked)}
                />
                <span className="text-gray-700">{watch("useThisGmail") ? "Using Gmail" : "Not Using Gmail"}</span>
              </div>
            </div>

          {/* Recipients Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Recipients</h3>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Add email address"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    e.preventDefault();
                    appendCustomEmail({ value: e.target.value });
                    e.target.value = '';
                  }
                }}
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                onClick={() => {
                  const input = document.querySelector('input[type="email"]');
                  if (input.value) {
                    appendCustomEmail({ value: input.value });
                    input.value = '';
                  }
                }}
              >
                <Plus size={16} />
                Add
              </motion.button>
            </div>
            <div className="flex flex-wrap gap-2">
              {customEmailFields.map((field, index) => (
                <Pill
                  key={field.id}
                  value={field.value}
                  onRemove={() => removeCustomEmail(index)}
                />
              ))}
            </div>
            {/* CC/BCC Toggle Buttons */}
            <div className="flex gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${showCcInput? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                onClick={() => setShowCcInput( !showCcInput )}
              >
                {showCcInput  ? <Check size={16} /> : <Plus size={16} />}
                CC
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${showBccInput || bccEmailFields.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                onClick={() => setShowBccInput(!showBccInput)}
              >
                {showBccInput ? <Check size={16} /> : <Plus size={16} />}
                BCC
              </motion.button>
            </div>

            {/* CC Input */}
            <AnimatePresence>
              {showCcInput   && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex gap-3">
                  <CreatableSelect
                    isMulti
                    isClearable
                    placeholder="Add CC emails"
                    value={ccEmailFields.map(e => ({ value: e.value, label: e.value }))}
                    onChange={(newValue) => {
                      const validValues = newValue.filter(v => validateEmail(v.value));
                      if (validValues.length !== newValue.length) {
                        alert("Some CC emails are invalid");
                      }
                      // reset array with valid ones
                      removeCcEmail(); 
                      validValues.forEach(v => appendCcEmail({ value: v.value }));
                    }}
                    options={GoogleData?.map((gmail) => ({
                      label: gmail.email,
                      value: gmail.email,
                    })) || []}
                    onCreateOption={(inputValue) => {
                      if (validateEmail(inputValue)) {
                        appendCcEmail({ value: inputValue });
                      } else {
                        alert("Invalid email format");
                      }
                    }}
                  />
                    {/* <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Add CC email"]');
                        if (input.value) {
                          appendCcEmail({ value: input.value });
                          input.value = '';
                        }
                      }}
                    >
                      <Plus size={16} />
                      Add
                    </motion.button> */}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ccEmailFields.map((field, index) => (
                      <Pill
                        key={field.id}
                        value={field.value}
                        onRemove={() => removeCcEmail(index)}
                        prefix="CC: "
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BCC Input */}
            <AnimatePresence>
              {showBccInput  && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex gap-3">
                  <CreatableSelect
                    isMulti
                    isClearable
                    placeholder="Add BCC emails"
                    value={bccEmailFields.map(e => ({ value: e.value, label: e.value }))}
                    onChange={(newValue) => {
                      const validValues = newValue.filter(v => validateEmail(v.value));
                      if (validValues.length !== newValue.length) {
                        alert("Some BCC emails are invalid");
                      }
                      removeBccEmail(); 
                      validValues.forEach(v => appendBccEmail({ value: v.value }));
                    }}
                    options={GoogleData?.map((gmail) => ({
                      label: gmail.email,
                      value: gmail.email,
                    })) || []}
                    onCreateOption={(inputValue) => {
                      if (validateEmail(inputValue)) {
                        appendBccEmail({ value: inputValue });
                      } else {
                        alert("Invalid email format");
                      }
                    }}
                  />
                    {/* <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Add BCC email"]');
                        if (input.value) {
                          appendBccEmail({ value: input.value });
                          input.value = '';
                        }
                      }}
                    >
                      <Plus size={16} />
                      Add
                    </motion.button> */}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bccEmailFields.map((field, index) => (
                      <Pill
                        key={field.id}
                        value={field.value}
                        onRemove={() => removeBccEmail(index)}
                        prefix="BCC: "
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="">
              <label className="block text-lg font-semibold text-gray-800 mb-2" htmlFor="emailSubject">Subject</label>
              <input
                id="emailSubject"
                type="text"
                placeholder="Enter Subject"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800 mb-4"
                {...register('emailSubject', { required: true })}
              />
            </div>
          {/* Email Template Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Email Template</h3>

            {/* Template Dropdown */}
            <div className="flex gap-4 items-end">
              {/* Template Dropdown */}
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 flex justify-between items-center"
                >
                  <span>{watch('emailSubject') ? 'Selected Template' : 'Select a template'}</span>
                  <ChevronDown size={16} className={`transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showTemplateDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
                    >
                      <div className="max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-blue-50"
                          onClick={() => {
                            setValue('emailBody', '');
                            setValue('emailSubject', '');
                            setShowTemplateDropdown(false);
                          }}
                        >
                          No Template
                        </button>
                        {emailTemplates.map(template => (
                          <button
                            key={template.id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-blue-50"
                            onClick={() => handleTemplateSelect(template)}
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Insert Merge Tag Button */}
              <button
                type="button"
                className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex items-center gap-2 whitespace-nowrap"
                onClick={() => setMergeTagMenu('email')}
              >
                Insert Merge Tag
              </button>
            </div>


            <div className="bg-white rounded-lg">
              <ReactQuill
                theme="snow"
                placeholder="Email body"
                modules={modules}
                formats={formats}
                value={watch('emailBody')}
                onChange={(content) => setValue('emailBody', content)}
                className="h-[200px] mb-14"
              />
            </div>

            {/* Attachment */}
            <div className="space-y-2">
              <label className="text-gray-800 font-medium">Attachment</label>
                <FileUploader onChange={handleFileChange} multiple initialUrls = {watch('attachment')} onRemove={(indexToRemove) => {
                    const currentAttachments = watch('attachment') || [];
                    const updatedAttachments = currentAttachments.filter((_, index) => index !== indexToRemove);
                    setValue('attachment', updatedAttachments);
                  }}/>
                <AnimatePresence>
                  {(Array.isArray(watch('attachment')) && watch('attachment').length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex flex-wrap gap-2 mt-2"
                    >
                      {watch('attachment').map((fileKey, idx) => {
                        // Extract the file name after the last underscore
                        let fileName = '';
                        if (typeof fileKey === 'string') {
                          const parts = fileKey.split('_');
                          fileName = parts.length > 1 ? parts.slice(1).join('_') : fileKey;
                        }
                        // S3 bucket base URL (replace with your actual S3 bucket URL)
                        const s3BaseUrl = "https://quickform-images.s3.us-east-1.amazonaws.com/"; // <-- Replace with your actual S3 bucket URL
                        const fileUrl = `${s3BaseUrl}${fileKey}`;
                        return (
                          <motion.div
                            key={fileKey + idx}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="flex items-center bg-gray-100 rounded-lg px-3 py-2 shadow-sm mb-2 max-w-full"
                          >
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-gray-800 font-medium text-sm max-w-[120px] md:max-w-[200px] hover:underline"
                              title={fileName}
                            >
                              {fileName}
                            </a>
                            <button
                              type="button"
                              className="ml-2 text-gray-500 hover:text-red-600 transition-colors"
                              onClick={() => {
                                const currentAttachments = watch('attachment') || [];
                                const updatedAttachments = currentAttachments.filter((_, index) => index !== idx);
                                setValue('attachment', updatedAttachments);
                              }}
                              aria-label={`Remove ${fileName}`}
                            >
                              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12"/>
                              </svg>
                            </button>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                  {(!Array.isArray(watch('attachment')) || watch('attachment').length === 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-gray-400 text-sm mt-2"
                    >
                      No attachments uploaded.
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
          </div>

          {/* Schedule Section */}
          {/* <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Schedule</h3>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
              {...register('schedule')}
            >
              <option value="immediate">Send Immediately</option>
              <option value="delay">After Delay</option>
              <option value="manual">Manually</option>
            </select>

            {watch('schedule') === 'delay' && (
              <div className="space-y-2">
                <label className="text-gray-800">Delay Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                  {...register('delayDateTime')}
                />
              </div>
            )}
          </div> */}

          {/* Form Actions */}
          <div className="flex justify-space-between gap-3 pt-6">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex-1"
              onClick={() => {
                reset();
                setActiveTab(null);
                setEditingRuleId(null);
              }}
            >
              Back
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg hover:from-blue-700 hover:to-blue-900 transition flex-1"
            >
              {editingRuleId ? 'Update Email Rule' : 'Create Email Rule'}
            </motion.button>
          </div>
        </form>

        {/* Merge Tag Menu */}
        {mergeTagMenu === 'email' && (
          <MergeTagMenu
            isOpen={mergeTagMenu === 'email'}
            onClose={() => setMergeTagMenu(null)}
            formFields={formFields}
          />
        )}
      </div>
    </motion.div>
  );
};
