import React, { useEffect, useState , useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Filter, Check, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Pill } from './Pill';
import { ConditionInput } from './ConditionInput';
import { MergeTagMenu } from './MergeTagMenu';
import { formFields, emailTemplates, modules, formats } from '../utils';
import FileUploader from '../../file-upload/multiple-file-upload';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import CreatableSelect from "react-select/creatable";
import { Select, Switch } from "antd";

// Utility: email validator
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const DigestEmailTab = ({
  setActiveTab,
  updateNotificationData,
  sendNotificationData,
  editingRuleId,
  rules,
  setEditingRuleId,
  formFieldsData,
  GoogleData
}) => {
  // Compute defaults for edit and create cases
  const getDefaultValues = () => {
    if (editingRuleId && rules && rules.length) {
      const rule = rules.find(rule => rule.id === editingRuleId) || {};
      let parsedReceipents = {};
      try { parsedReceipents = JSON.parse(rule.receipents || '{}'); } catch {}
      let schedule = {};
      try { schedule = JSON.parse(rule.schedule || '{}'); } catch {}
      // Handle systematic structure: {frequency: {type,...}, time:""}
      const freqObj = schedule.frequency || {};
      const freqType = freqObj.type || 'daily';
      return {
        emailTitle: rule?.title || 'Digest',
        digestEnabled: true,
        frequency: freqType,
        time: rule?.schedule ? (JSON.parse(rule.schedule)?.time || '08:00') : '08:00',
        customEmails: Array.isArray(parsedReceipents?.to) ? parsedReceipents.to.map(e => ({ value: e })) : [],
        ccEmails: Array.isArray(parsedReceipents?.cc) ? parsedReceipents.cc.map(e => ({ value: e, label: e })) : [],
        bccEmails: Array.isArray(parsedReceipents?.bcc) ? parsedReceipents.bcc.map(e => ({ value: e, label: e })) : [],
        emailSubject: rule?.body ? (JSON.parse(rule.body)?.subject || '') : '',
        emailBody: rule?.body ? (JSON.parse(rule.body)?.body || '') : '',
        attachment: rule?.body ? (JSON.parse(rule.body)?.attachment || []) : [],
        useThisGmail: rule?.body ? (JSON.parse(rule.body)?.useThisGmail || false) : false,
        gmailAccount: rule?.gmailAccount || '',
        conditions: rule?.condition ? typeof rule.condition === 'string' ? JSON.parse(rule.condition) : rule.condition : [],
        scheduleDay: freqType === 'weekly' ? freqObj.day?.toString() : '',
        scheduleMonth: freqType === 'monthly' ? freqObj.month?.toString() : '',
        scheduleTime: schedule.time || '08:00',
        dailyDays: freqType === 'daily' ? freqObj.daysGroup || 'mon-fri' : 'mon-fri',
        weeklyDay: freqType === 'weekly' ? freqObj.day?.toString() : '',
        monthlyMonths: freqType === 'monthly' ? (freqObj.months || []).map(String) : [],
        dateOfMonth: freqType === 'monthly' ? freqObj.dateOfMonth || '' : '',
        timeZone: schedule.timeZone || 'UTC',
      };
    }
    // Defaults for new rule
    return {
      emailTitle: '',
      digestEnabled: true,
      frequency: 'daily',
      time: '08:00',
      customEmails: [],
      ccEmails: [],
      bccEmails: [],
      emailSubject: '',
      emailBody: '',
      attachment: [],
      useThisGmail: false,
      gmailAccount: '',
      conditions: [],
      scheduleDay: '',     // for weekly
      scheduleMonth: '',   // for monthly
      scheduleTime: '08:00',   // now storing time in 'hh:mm:ss'
      dailyDays: 'mon-fri',
      weeklyDay: '',
      monthlyMonths: [],
      dateOfMonth: '',
      timeZone: 'UTC',
    };
  };

  const { register, handleSubmit, watch, control, reset, setValue } = useForm({
    defaultValues: getDefaultValues(),
  });
  const attachments = watch("attachment");
  // Memoize so FileUploader doesn't get a new array every render
  const memoizedAttachments = useMemo(() => attachments, [JSON.stringify(attachments)]);
  // Field Arrays for dynamic fields
  const { fields: customEmailFields, append: appendCustomEmail, remove: removeCustomEmail } = useFieldArray({
    control, name: 'customEmails'
  });
  const { fields: ccEmailFields, append: appendCcEmail, remove: removeCcEmail } = useFieldArray({
    control, name: 'ccEmails'
  });
  const { fields: bccEmailFields, append: appendBccEmail, remove: removeBccEmail } = useFieldArray({
    control, name: 'bccEmails'
  });
  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control, name: 'conditions'
  });

  // UI state
  const [mergeTagMenu, setMergeTagMenu] = useState(null);
  const [showCcInput, setShowCcInput] = useState(!!ccEmailFields.length);
  const [showBccInput, setShowBccInput] = useState(!!bccEmailFields.length);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [validation, setValidation] = useState({ valid: true, messages: [], cron: '', description: '' });
  // Watch schedule-related fields for realtime validation
  const scheduleFrequency = watch('frequency');
  const dailyDays = watch('dailyDays');
  const weeklyDay = watch('weeklyDay');
  const monthlyMonths = watch('monthlyMonths');
  const dateOfMonth = watch('dateOfMonth');
  const scheduleTime = watch('scheduleTime');
  const timeZone = watch('timeZone');
  const buildSchedule = (data) => {
    const timeZone = data.timeZone || "UTC";
    const freqType = data.frequency;
  
    const problems = [];
    const warnings = [];
    let cronExpr = "";
    let desc = "";
  
    const daysGroupMap = {
      "mon-fri": ["MON", "TUE", "WED", "THU", "FRI"],
      "sat-sun": ["SAT", "SUN"],
      "mon-sun": ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
    };
  
    const monthNames = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ];
  
    const parseTime = (timeStr) => {
      const [h, m] = (timeStr || "00:00:00")
        .split(":")
        .map((x) => parseInt(x, 10));
      return { h, m };
    };
  
    const { h: hour, m: minute } = parseTime(data.scheduleTime);
  
    if (freqType === "daily") {
      const daysGroup = data.dailyDays || "mon-fri";
      const days = daysGroupMap[daysGroup] || daysGroupMap["mon-fri"];
  
      desc = `This mail will be sent daily at ${data.scheduleTime} on ${daysGroup.replace("-", " to ")}`;
      const dayOfWeek = days.length === 7 ? "*" : days.join(",");
  
      cronExpr = `cron(${minute} ${hour} ? * ${dayOfWeek} *)`;
    } else if (freqType === "weekly") {
      const weeklyDay = data.weeklyDay;
      const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const dayOfWeek = dayNames[parseInt(weeklyDay, 10)] || null;
  
      if (weeklyDay === "" || weeklyDay === undefined || isNaN(parseInt(weeklyDay, 10)) || !dayOfWeek) {
        problems.push("Please select a valid day of the week for weekly frequency.");
      }
  
      desc = `This mail will be sent weekly at ${data.scheduleTime} on ${dayOfWeek || "unknown"}`;
      cronExpr = problems.length === 0
        ? `cron(${minute} ${hour} ? * ${dayOfWeek} *)`
        : "";
    } else if (freqType === "monthly") {
      const months = Array.isArray(data.monthlyMonths)
        ? data.monthlyMonths.map(Number)
        : [];
      const dateOfMonth = parseInt(data.dateOfMonth, 10);
  
      if (!dateOfMonth || dateOfMonth < 1 || dateOfMonth > 31) {
        problems.push("Date of month must be between 1 and 31.");
      }
      
      if (dateOfMonth === 31) {
        const validMonths = [1, 3, 5, 7, 8, 10, 12];
        if (months.length === 0) {
          problems.push("Date 31 is invalid for every month. Please select only months with 31 days.");
        } else {
          const invalidSelected = months.some((m) => !validMonths.includes(m));
          if (invalidSelected) {
            warnings.push("You selected day 31 for every month — emails will fail in shorter months (Feb, Apr, Jun, Sep, Nov).");
          }
        }
      }
      const monthField =
        months.length > 0 ? months.map((m) => monthNames[m - 1]).join(",") : "*";
        if (months.some(m => m < 1 || m > 12)) {
          problems.push("One or more selected months are invalid.");
        }
      desc =
        months.length > 0
          ? `This mail will be sent monthly on day ${dateOfMonth} of ${months
              .map((m) => monthNames[m - 1])
              .join(", ")} at ${data.scheduleTime}`
          : `This mail will be sent monthly on day ${dateOfMonth} of every month at ${data.scheduleTime}`;
  
      cronExpr =
        problems.length === 0
          ? `cron(${minute} ${hour} ${dateOfMonth} ${monthField} ? *)`
          : "";
    } else {
      problems.push("Invalid frequency type.");
    }
  
    const valid = problems.length === 0;
    if (timeZone !== "UTC") {
      warnings.push(`Schedules use ${timeZone}, make sure this matches your expected timezone.`);
    }
    return {
      valid,
      warnings,
      problems,
      cron: cronExpr,
      description: desc,
      frequency: (() => {
        if (freqType === "daily") {
          return { type: "daily", daysGroup: data.dailyDays };
        }
        if (freqType === "weekly") {
          return { type: "weekly", day: data.weeklyDay };
        }
        if (freqType === "monthly") {
          return { type: "monthly", months: data.monthlyMonths, dateOfMonth: data.dateOfMonth };
        }
        return {};
      })(),
      time: data.scheduleTime || "00:00",
      timeZone,
      cronExpression: cronExpr,
    };
  };
  
  // Realtime: compute validation + cron + human description
const scheduleState = useMemo(() => {
  return buildSchedule({
    frequency: scheduleFrequency,
    dailyDays,
    weeklyDay,
    monthlyMonths,
    dateOfMonth,
    scheduleTime,
    timeZone
    });
  }, [scheduleFrequency, dailyDays, weeklyDay, monthlyMonths, dateOfMonth, scheduleTime, timeZone]);
  // File Handling
  const handleFileChange = (newUrls) => {
    setValue('attachment', newUrls || []);
  };
  
  
  // Template Select
  const handleTemplateSelect = (template) => {
    setValue('emailSubject', template.subject);
    setValue('emailBody', template.body);
    setShowTemplateDropdown(false);
  };

  // Submit Handler
  const onSubmit = async (data) => {
    const scheduleObj = {
      frequency: scheduleState.frequency,
      time: scheduleState.time,
      timeZone: scheduleState.timeZone,
      cronExpression: scheduleState.cron,
    };
    if (!scheduleState.valid) {
      alert('Please fix scheduling errors before submitting.');
      return;
      }    
    const payload = {
      Title__c: data.emailTitle || '',
      Body__c: JSON.stringify({
        subject: data.emailSubject,
        body: data.emailBody,
        attachment: data.attachment || [],
        useThisGmail: data.useThisGmail || false,
      }),
      Type__c: 'Digest Email',
      Schedule__c: JSON.stringify(scheduleObj),
      Receipe__c: JSON.stringify({
        to: data.customEmails.map(e => e.value),
        cc: data.ccEmails.map(e => e.value),
        bcc: data.bccEmails.map(e => e.value),
      }),
      Gmail__c: data.useThisGmail ? data.gmailAccount : '',
      Condition__c: JSON.stringify(data.conditions),
      Status__c: editingRuleId && rules ? (rules.find(r => r.id === editingRuleId)?.status || 'Active') : 'Active'
    };
    try {
      let res;
      if (editingRuleId) {
        res = await updateNotificationData(payload);
      } else {
        res = await sendNotificationData(payload);
      }
      // Reset and close
      reset();
      setActiveTab(null);
      setEditingRuleId(null);
    } catch (error) {
      console.error('Error sending/updating digest email:', error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border rounded-2xl">
      <div className="mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => { reset(); setActiveTab(null); setEditingRuleId(null); }}
              className="flex items-center gap-2 hover:bg-gray-300 p-2 rounded-lg transition-colors"
            >
              <ChevronLeft />
            </button>
            <h2 className="text-4xl font-bold">
              {editingRuleId ? 'Edit Digest Email Rule' : 'Create Digest Email Rule'}
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
              <Controller
                name="gmailAccount"
                control={control}
                render={({ field }) => (
                  <Select
                    placeholder="Select Gmail Account"
                    className="flex-1"
                    disabled={!watch("useThisGmail")}
                    value={field.value}
                    onChange={val => field.onChange(val)}
                    options={GoogleData?.map(gmail => ({
                      label: gmail.email,
                      value: gmail.email,
                    })) || []}
                  />
                )}
              />
              <Controller
                name="useThisGmail"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onChange={v => field.onChange(v)} />
                )}
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
                onKeyDown={e => {
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
                <Pill key={field.id} value={field.value} onRemove={() => removeCustomEmail(index)} />
              ))}
            </div>
            {/* CC/BCC */}
            <div className="flex gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${showCcInput ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                onClick={() => setShowCcInput(!showCcInput)}
              >
                {showCcInput ? <Check size={16} /> : <Plus size={16} />}
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
              {showCcInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <CreatableSelect
                    isMulti
                    isClearable
                    placeholder="Add CC emails"
                    value={ccEmailFields.map(e => ({ value: e.value, label: e.value }))}
                    onChange={newValue => {
                      const validValues = newValue.filter(v => validateEmail(v.value));
                      if (validValues.length !== newValue.length) {
                        alert("Some CC emails are invalid");
                      }
                      removeCcEmail();
                      validValues.forEach(v => appendCcEmail({ value: v.value }));
                    }}
                    options={GoogleData?.map(gmail => ({
                      label: gmail.email,
                      value: gmail.email,
                    })) || []}
                    onCreateOption={inputValue => {
                      if (validateEmail(inputValue)) {
                        appendCcEmail({ value: inputValue });
                      } else {
                        alert("Invalid email format");
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {ccEmailFields.map((field, index) => (
                      <Pill key={field.id} value={field.value} onRemove={() => removeCcEmail(index)} prefix="CC: " />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* BCC Input */}
            <AnimatePresence>
              {showBccInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <CreatableSelect
                    isMulti
                    isClearable
                    placeholder="Add BCC emails"
                    value={bccEmailFields.map(e => ({ value: e.value, label: e.value }))}
                    onChange={newValue => {
                      const validValues = newValue.filter(v => validateEmail(v.value));
                      if (validValues.length !== newValue.length) {
                        alert("Some BCC emails are invalid");
                      }
                      removeBccEmail();
                      validValues.forEach(v => appendBccEmail({ value: v.value }));
                    }}
                    options={GoogleData?.map(gmail => ({
                      label: gmail.email,
                      value: gmail.email,
                    })) || []}
                    onCreateOption={inputValue => {
                      if (validateEmail(inputValue)) {
                        appendBccEmail({ value: inputValue });
                      } else {
                        alert("Invalid email format");
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {bccEmailFields.map((field, index) => (
                      <Pill key={field.id} value={field.value} onRemove={() => removeBccEmail(index)} prefix="BCC: " />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Schedule Section */}
          <div className=" flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
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

            {/* Daily grouped days */}
            <AnimatePresence>
              {scheduleFrequency === 'daily' && (
                <motion.div
                  key="dailyDays"
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="flex-1 min-w-[150px]"
                >
                  <label className="text-gray-800">Days</label>
                  <select {...register('dailyDays', { required: scheduleFrequency === 'daily' })} className="w-full p-3 border border-gray-300 rounded-lg">
                    <option value="mon-fri">Monday to Friday</option>
                    <option value="sat-sun">Saturday & Sunday</option>
                    <option value="mon-sun">Monday to Sunday</option>
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Weekly day selector */}
            <AnimatePresence>
              {scheduleFrequency === 'weekly' && (
                <motion.div
                  key="weeklyDay"
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="flex-1 min-w-[150px]"
                >
                  <label className="text-gray-800">Day of Week</label>
                  <select {...register('weeklyDay', { required: scheduleFrequency === 'weekly' })} className="w-full p-3 border border-gray-300 rounded-lg">
                    <option value="">Select day</option>
                    {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Monthly months multi-select and date */}
            <AnimatePresence>
              {scheduleFrequency === 'monthly' && (
                <>
                  <motion.div
                    key="monthlyMonths"
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="flex-1 min-w-[150px]"
                  >
                    <label className="text-gray-800">Months</label>
                    <select {...register('monthlyMonths')} multiple className="w-full p-3 border border-gray-300 rounded-lg" size={3} placeholder="Ctrl+Click to select multiple">
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en-US', { month: 'long' })}</option>
                      ))}
                    </select>
                    <small className="text-gray-500">Leave empty for every month</small>
                  </motion.div>

                  <motion.div
                    key="dateOfMonth"
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="flex-1 min-w-[150px]"
                  >
                    <label className="text-gray-800">Date of Month</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="Enter date (1-31)"
                      {...register('dateOfMonth', { required: scheduleFrequency === 'monthly' })}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Time */}
            <div className="flex-1 min-w-[150px]">
              <label className="text-gray-800">Time</label>
              <input
                type="time"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                {...register('scheduleTime', { required: true })}
              />
            </div>

            {/* Time Zone */}
            <div className="flex-1 min-w-[150px]">
              <label className="text-gray-800">Time Zone</label>
              <select {...register('timeZone', { required: true })} className="w-full p-3 border border-gray-300 rounded-lg">
                <option value="UTC">UTC</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Australia/Sydney">Australia/Sydney</option>
                {/* Add relevant timezones here */}
              </select>
            </div>
          </div>
          {/* Live validation output */}
          <div className="space-y-2 border-b border-gray-300 pb-4">
              {scheduleState.description && (
              <div className="text-green-700 font-semibold">{scheduleState.description}</div>
              )}
              {scheduleState.cron && (
                <div className="text-sm">
                <span className="font-semibold">Cron:</span>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">{scheduleState.cron}</code>
                </div>
              )}
            {scheduleState.warnings.length > 0 && (
            <ul className="text-amber-600 text-sm list-disc ml-6">
              {scheduleState.warnings.map((w, i) => (
              <li key={i}>⚠️ {w}</li>
              ))}
            </ul>
            )}
            {scheduleState.problems?.length > 0 && (
              <ul className="text-red-600 list-disc ml-6">
                {scheduleState.problems?.map((msg, idx) => (
                <li key={idx}>❌ {msg}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Email Template Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Email Template</h3>
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
              <button
                type="button"
                className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex items-center gap-2 whitespace-nowrap"
                onClick={() => setMergeTagMenu('email')}
              >
                Insert Merge Tag
              </button>
            </div>
            <div className="bg-white rounded-lg">
              <Controller
                name="emailBody"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <ReactQuill
                    theme="snow"
                    placeholder="Email body"
                    modules={modules}
                    formats={formats}
                    value={field.value}
                    onChange={field.onChange}
                    className="h-[200px] mb-14"
                  />
                )}
              />
            </div>

            {/* Attachment */}
            <div className="space-y-2">
              <label className="text-gray-800 font-medium">Attachment</label>
              <FileUploader
                onChange={handleFileChange}
                multiple
                initialUrls={memoizedAttachments}
                onRemove={indexToRemove => {
                  const currentAttachments = watch('attachment') || [];
                  const updatedAttachments = currentAttachments.filter((_, index) => index !== indexToRemove);
                  setValue('attachment', updatedAttachments);
                }}
              />
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

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-6">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex-1"
              onClick={() => { reset(); setActiveTab(null); setEditingRuleId(null); }}
            >
              Back
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg hover:from-blue-700 hover:to-blue-900 transition flex-1"
            >
              {editingRuleId ? 'Update Digest Email Rule' : 'Create Digest Email Rule'}
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
