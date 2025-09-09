'use client'

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Search,
  Filter,
  Plus,
  X,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Smartphone,
  FileText,
  Check,
  Download,
  ChevronLeftIcon as ArrowLeft,
  AlignCenter,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  TimerIcon,
  EyeIcon,
  MessageSquareText,
  Phone,
  User,
  Settings,
  Send,
  Signal,
  Wifi,
  Battery,
  Info,
  CheckCheck,
  BatteryFull,
  BatteryMedium
} from 'lucide-react';
import { formFields, smsTemplates } from '../utils';
import { ConditionInput } from './ConditionInput';
import { Pill } from './Pill'
import NotFoundNotifications from '../NotFound';
const NotificationTab = ({
  rules,
  setRules,
  setActiveTab,
  editingRuleId,
  setEditingRuleId,
  showNotificationForm,
  setShowNotificationForm,
  showAddOptions,
  setShowAddOptions,
  sendNotificationData,
  updateNotificationData,
  handleStatusChange,
  deleteNotificationData,
  formFieldsData
}) => {

  useEffect(()=>{
    console.log('Current fields dat from setting  : ', formFieldsData);
    
  },[formFieldsData])

  const { register, handleSubmit, control, reset, setValue } = useForm({
    defaultValues: {
      recipients: [],
      customPhones: rules && editingRuleId
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
      conditions: [],
      smsBody: editingRuleId ? rules.find(rule => rule.id === editingRuleId).body : '',
      schedule: 'immediate',
      smsTitle: editingRuleId ? rules.find(rule => rule.id === editingRuleId).title : ''

    }
  });
  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control,
    name: 'conditions'
  });
  const [smsCharCount, setSmsCharCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConditionInput, setShowConditionInput] = useState(false);
  const [previewRule, setPreviewRule] = useState(null);

  const [open, setOpen] = useState(false); // For Rows per page dropdown
  const rowsPerPageOptions = [10, 25, 50, 100];

  // Filter dropdown state
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterTitle, setFilterTitle] = useState('');

  // Error state for filter
  const [filterError, setFilterError] = useState('');

  // Filter rules based on search term and filters
  const filteredRules = rules?.filter(rule => {
    try {
      // Title filter (search)
      const titleMatch = (rule.title || rule.Title__c || '').toLowerCase().includes(searchTerm.toLowerCase());
      // Status filter
      const statusMatch = filterStatus ? (rule.status || rule.Status__c) === filterStatus : true;
      // Type filter
      const typeMatch = filterType ? (rule.type || rule.Type__c) === filterType : true;
      // Date filter
      let dateMatch = true;
      if (filterDateFrom || filterDateTo) {
        const ruleDate = new Date(rule.createdDate);
        if (filterDateFrom && ruleDate < new Date(filterDateFrom)) dateMatch = false;
        if (filterDateTo && ruleDate > new Date(filterDateTo)) dateMatch = false;
      }
      // Title filter (optional, for more granularity)
      const titleFilterMatch = filterTitle ? (rule.title || rule.Title__c || '').toLowerCase().includes(filterTitle.toLowerCase()) : true;
      return titleMatch && statusMatch && typeMatch && dateMatch && titleFilterMatch;
    } catch (err) {
      setFilterError('Error filtering rules.');
      return false;
    }
  }) || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredRules?.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredRules?.slice(indexOfFirstRow, indexOfLastRow) || [];

  // Handle checkbox selection
  const handleCheckboxChange = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentPageIds = currentRows?.map(rule => rule.id);
      setSelectedRows(currentPageIds);
    } else {
      setSelectedRows([]);
    }
  };
  const editfields = useRef();

  //Handle Edit Rule
  const handleEditRule = (id) => {
    const rule = rules.find(rule => rule.id === id);
    console.log('Editing rule 1 ==> ', rule);
    setEditingRuleId(id);
    editfields.current = rule;
    setActiveTab(rule.type);
    console.log('Editing fields ==> ', editfields.current);
    console.log('Editing rule 2 ==> ', rule);     
    if (rule.type === 'SMS') {
      console.log(customPhoneFields, 'custonphonefield');
      setShowNotificationForm(true);
    }
    if(rule.type.includes('Digest')) setActiveTab('digest')    
  };



  //For Sms Templates
  const handleTemplateSelect = (template) => {
    setValue('smsBody', template.body);
    if (template) setSmsCharCount(template.body.length);
    else setSmsCharCount(0)
  };

  // Handle delete selected
  const handleDeleteSelected = () => {

  };

  // Handle delete single row
  const handleDeleteRow = async (id) => {
    // Confirm deletion with the user (optional, can be enhanced with a modal)
    if (!window.confirm('Are you sure you want to delete this notification rule?')) {
      return;
    }
    try {
      // Log the id being deleted
      console.log('Attempting to delete notification rule with id:', id);
      // Call the delete API (assume deleteNotificationData is passed as a prop)
      const res = await deleteNotificationData(id);
      // Log the response
      console.log('Delete response:', res);
      // Optionally, show a success message (can be replaced with a toast)
      alert('Notification rule deleted successfully.');
    } catch (error) {
      // Log the error
      console.error('Error deleting notification rule:', error);

    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 3;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const { fields: customPhoneFields, append: appendCustomPhone, remove: removeCustomPhone } = useFieldArray({
    control,
    name: 'customPhones'
  });

  const onSubmit = async (data) => {
    setLoading(true);
      const payload = {
        Title__c: data.smsTitle || '',
        Receipe__c: JSON.stringify({
          to: [...data.recipients, ...data.customPhones.map(e => e.value)],
        }),
        Body__c: data.smsBody,
        Type__c: 'SMS',
      Status__c: editingRuleId ? (rules.find(r => r.id === editingRuleId)?.status || 'Active') : 'Active',
      Condition__c :JSON.stringify(data.conditions)
    };

    try {
      let res;
      if (editingRuleId) {
        console.log('Updating...');
        res = await updateNotificationData(payload);
        console.log('Updated...', res);
      } else {
        console.log('Creating...');
        res = await sendNotificationData(payload);
        console.log('Created...', res);
      }
      console.log('Response from SMS notification ===>', res);
    } catch (error) {
      console.log('Error in SMS notification sending/updating to Salesforce', error);
    } finally {
      setLoading(false);
      reset();
      setShowNotificationForm(false);
      setActiveTab(null);
      setEditingRuleId(null);
    }
  };

  // Toggle add options with animation
  const toggleAddOptions = () => {
    setShowAddOptions(!showAddOptions);
  };

  // Update parent rules when internal rules change
  useEffect(() => {
    setRules(rules);
  }, [rules, setRules]);

  const handlePreview = (id) => {
    const rule = rules.find(r => r.id === id);
    console.log('Preview rule : ', rule);
    setPreviewRule(rule);
  };

  return (
    <div className="bg-gray-50">
      {previewRule && (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      {/* Overlay click to close */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={() => setPreviewRule(null)} 
      />
      
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative bg-white dark:bg-gray-800 max-w-2xl w-full mx-4 overflow-hidden border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center space-x-3">
            {(previewRule.type === 'Email' || previewRule.type === "Digest Email") ? (
              <Mail className="w-5 h-5 text-blue-500" />
            ) : (
              <MessageSquareText className="w-5 h-5 text-green-500" />
            )}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {previewRule.type} Preview
            </h3>
          </div>
          <button
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setPreviewRule(null)}
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[80vh]">
          {previewRule.type === 'Email' || previewRule.type === "Digest Email" ? (
            <div className="p-6">
              {/* Email Header */}
              <div className="mb-6">
                <div className="mb-4">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="w-12">From:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      QuickForm <span className="text-gray-400">(no-reply@quickform.com)</span>
                    </span>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="w-12">To:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {(() => {
                        try {
                          if (previewRule.receipents) {
                            const parsed = JSON.parse(previewRule.receipents);
                            if (Array.isArray(parsed.to)) return parsed.to.join(', ');
                            if (typeof parsed.to === 'string') return parsed.to;
                          }
                          return previewRule.receipents || '';
                        } catch {
                          return previewRule.receipents || '';
                        }
                      })()}
                    </span>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="w-12">Subject:</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {JSON.parse(previewRule.body).subject}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div 
                  className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-line" 
                  dangerouslySetInnerHTML={{ __html: JSON.parse(previewRule.body).body }}
                />
              </div>
            </div>
          ) : (
            /* SMS Preview */
            <div className="p-6 flex flex-col items-center">
              <div className="w-64 h-[500px] bg-gray-100 dark:bg-gray-700 rounded-3xl shadow-2xl flex flex-col items-center justify-between p-4 relative border-8 border-gray-900 dark:border-gray-600">
                {/* Phone notch */}
                <div className="w-32 h-5 bg-gray-900 dark:bg-gray-600 rounded-b-lg absolute top-0" />
                
                {/* Status bar */}
                <div className="w-full flex justify-between items-center px-4 pt-1 text-xs text-gray-600 dark:text-gray-300">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                  <div className="flex space-x-1">
                    <Signal className="w-3 h-3" />
                    <Wifi className="w-3 h-3" />
                    <BatteryMedium className="w-3 h-3" />
                  </div>
                </div>
                
                {/* SMS Content */}
                <div className="w-full px-3 mt-4 space-y-4 overflow-y-auto flex-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">QuickForm</div>
                  <div className="bg-blue-500 text-white rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                    {previewRule.body || previewRule.Body__c}
                  </div>
                </div>
                
                {/* Input area */}
                <div className="w-full px-3 mb-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Reply..." 
                      className="w-full bg-white dark:bg-gray-600 rounded-full py-2 px-4 pr-10 text-sm border-0 focus:ring-2 focus:ring-blue-500"
                      disabled
                    />
                    <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Navigation bar */}
                <div className="w-full flex justify-around items-center py-2 bg-white dark:bg-gray-600 rounded-full mx-2 mb-1">
                  <MessageSquareText className="w-5 h-5 text-blue-500" />
                  <Phone className="w-5 h-5 text-gray-400" />
                  <User className="w-5 h-5 text-gray-400" />
                  <Settings className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <Info className="w-4 h-4 mr-1" />
                SMS preview - character count: {(previewRule.body || previewRule.Body__c)?.length || 0}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
          <button
            onClick={() => setPreviewRule(null)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
)}
      {!showNotificationForm ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-4 md:p-6 w-full bg-white"
        >
          {/* Add Options Dropdown */}
          <AnimatePresence>
            {showAddOptions && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute right-6 mt-14 w-72 bg-white rounded-xl shadow-xl z-50 border border-gray-200"
              >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-base font-semibold text-gray-800">Create New Rule</h3>
                  <button
                    onClick={toggleAddOptions}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>
                <div className="py-2">
                  <button
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-3"
                    onClick={() => {
                      setActiveTab('Email');
                      toggleAddOptions();
                    }}
                  >
                    <Mail size={18} />
                    Email
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-3"
                    onClick={() => {
                      setShowNotificationForm(true);
                      setActiveTab('SMS');
                      toggleAddOptions();
                    }}
                  >
                    <Smartphone size={18} />
                    SMS Notification
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-3"
                    onClick={() => {
                      setActiveTab('digest');
                      toggleAddOptions();
                    }}
                  >
                    <FileText size={18} />
                    Digest Email (Optional)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-x-auto">
            <div className="container mx-auto p-4">
              {/* Search and Filter */}
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for an entry"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  {/* Filter Button and Dropdown */}
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => setShowFilter(f => !f)}
                    >
                    <Filter size={16} className="mr-2" />
                    Filter
                  </motion.button>
                    <AnimatePresence>
                      {showFilter && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                          className="fixed right-20 mt-2 w-80 bg-white rounded-xl shadow-xl z-50 border border-gray-200 p-4"
                        >
                          <div className="mb-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                            <select
                              className="w-full border border-gray-300 rounded-md p-2 text-sm"
                              value={filterStatus}
                              onChange={e => setFilterStatus(e.target.value)}
                            >
                              <option value="">All</option>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </div>
                          <div className="mb-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                            <select
                              className="w-full border border-gray-300 rounded-md p-2 text-sm"
                              value={filterType}
                              onChange={e => setFilterType(e.target.value)}
                            >
                              <option value="">All</option>
                              <option value="Email">Email</option>
                              <option value="SMS">SMS</option>
                              <option value="DIGESTIVE EMAIL">Digest Email</option>
                            </select>
                          </div>
                          <div className="mb-3 flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Date From</label>
                              <input
                                type="date"
                                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                value={filterDateFrom}
                                onChange={e => setFilterDateFrom(e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Date To</label>
                              <input
                                type="date"
                                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                value={filterDateTo}
                                onChange={e => setFilterDateTo(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Title Contains</label>
                            <input
                              type="text"
                              className="w-full border border-gray-300 rounded-md p-2 text-sm"
                              value={filterTitle}
                              onChange={e => setFilterTitle(e.target.value)}
                              placeholder="Search by title..."
                            />
                          </div>
                          {filterError && <div className="text-red-500 text-xs mb-2">{filterError}</div>}
                          <div className="flex justify-between gap-2 mt-4">
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold shadow hover:bg-blue-700 transition"
                              onClick={() => setShowFilter(false)}
                              type="button"
                            >
                              Apply
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-semibold shadow hover:bg-gray-300 transition"
                              onClick={() => {
                                setFilterStatus('');
                                setFilterType('');
                                setFilterDateFrom('');
                                setFilterDateTo('');
                                setFilterTitle('');
                                setFilterError('');
                              }}
                              type="button"
                            >
                              Clear
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {/* End Filter Button and Dropdown */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 login-button rounded-lg shadow-md flex items-center gap-2"
                    onClick={toggleAddOptions}
                  >
                    <Plus size={18} />
                    Add Rule
                  </motion.button>
                </div>
              </div>

              {/* Selection Popup */}
              <AnimatePresence>
                {selectedRows.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-blue-800 text-white px-4 py-2 rounded-md shadow-lg flex items-center z-10"
                  >
                    <button
                      className="mr-4 text-white hover:text-gray-200"
                      onClick={() => setSelectedRows([])}
                    >
                      <X size={20} />
                    </button>
                    <span className="mr-6">{selectedRows.length} Selected</span>
                    <button className="mr-4 px-3 py-1 bg-blue-700 rounded hover:bg-blue-600 flex items-center gap-1">
                      <Download size={16} />
                      Export
                    </button>
                    <button
                      className="px-3 py-1 bg-red-500 rounded hover:bg-red-600 flex items-center gap-1"
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {currentRows?.length > 0 ? (
                <div className="bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-800">
                        <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">
                          <input
                            type="checkbox"
                            checked={selectedRows.length === currentRows.length && currentRows.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </th>
                        <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">TITLE</th>
                        <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">Type</th>
                        <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">Status</th>
                        <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">CREATED DATE</th>
                        <th className="p-4 text-left font-semibold text-sm uppercase tracking-wide">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRows.map(rule => (
                        <motion.tr
                          key={rule.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(rule.id)}
                              onChange={() => handleCheckboxChange(rule.id)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-4 text-gray-700 font-medium">{rule.title}</td>
                          <td className="p-4 text-gray-700">
                            <div className="flex items-center gap-2">
                              {rule.type === 'Email' && <Mail size={16} className="text-blue-500" />}
                              {rule.type === 'SMS' && <Smartphone size={16} className="text-green-500" />}
                                {rule.type === 'Digest Email' && <TimerIcon size={16} className="text-purple-500" />}
                              {rule.type}
                            </div>
                          </td>
                          <td className="p-4 text-gray-700">
                            {/* <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rule.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {rule.status === 'Active' ? (
                                <>
                                  <Check size={12} className="mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <X size={12} className="mr-1" />
                                  Inactive
                                </>
                              )}
                            </span> */}
                            <div className="flex flex-col">
                              {/* <span className="font-medium text-gray-700">{rule.status}</span> */}
                              <label
                                htmlFor={rule.id}
                                className="relative inline-flex items-center cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  id={rule.id}
                                  checked={rule.status === 'Active'}
                                  onChange={() => handleStatusChange(rule.id)}
                                  className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-gray-300 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-green-700 transition-colors duration-300 group-hover:brightness-110" />
                                <span
                                  className="absolute left-1.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 peer-checked:translate-x-6"
                                />
                                <span className="absolute left-2 top-2 text-xs text-white font-semibold pointer-events-none select-none peer-checked:visible">
                                </span>
                                <span className="absolute right-2 top-2 text-xs text-white font-semibold pointer-events-none select-none peer-checked:invisible">
                                </span>
                              </label>
                            </div>
                          </td>
                          <td className="p-4 text-gray-700">{rule.createdDate || new Date().toLocaleString()}</td>
                          <td className="p-4 flex gap-2">
                          <motion.button whileHover={{ scale: 1.02, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }} onClick={() => { handlePreview(rule.id) }}
                              whileTap={{ scale: 0.98 }} className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200 ease-in-out">
                              <EyeIcon size={18} />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.02, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }} onClick={() => { handleEditRule(rule.id) }}
                              whileTap={{ scale: 0.98 }} className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200 ease-in-out">
                              <Edit size={18} />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.02, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
                              whileTap={{ scale: 0.98 }} className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
                              onClick={() => handleDeleteRow(rule.id)}
                            >
                              <Trash2 size={18} />
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between items-center">
                      <div className="relative flex items-center text-sm text-gray-700">
                        <span className="mr-2">Rows per page:</span>
                        <div className="relative">
                          <button
                            type="button"
                            className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            onClick={() => setOpen((prev) => !prev)}
                            aria-haspopup="listbox"
                            aria-expanded={open}
                          >
                            {rowsPerPage}
                            {open ? (
                              <ChevronUp size={18} className="ml-2 text-gray-500" />
                            ) : (
                              <ChevronDown size={18} className="ml-2 text-gray-500" />
                            )}
                          </button>
                          <AnimatePresence>
                            {open && (
                              <motion.ul
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.18 }}
                                className="fixed z-[9999] mt-2 w-[180px] bg-white border border-gray-200 rounded-md shadow-lg"
                                role="listbox"
                              >
                                {rowsPerPageOptions.map((option) => (
                                  <li
                                    key={option}
                                    role="option"
                                    aria-selected={rowsPerPage === option}
                                    className={`px-4 py-2 cursor-pointer hover:bg-blue-50 transition ${rowsPerPage === option ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                                      }`}
                                    onClick={() => {
                                      setRowsPerPage(option);
                          setCurrentPage(1);
                                      setOpen(false);
                                    }}
                                  >
                                    {option}
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`p-1 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        <ChevronLeft size={20} />
                      </button>

                      {getPageNumbers().map((page, index) => (
                        <button
                          key={index}
                          onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
                          className={`px-3 py-1 rounded-md ${page === currentPage
                            ? 'bg-blue-600 text-white'
                            : typeof page === 'number'
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'text-gray-500 cursor-default'
                            }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`p-1 rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>
                </div>) : (
                <>
                  <NotFoundNotifications />
                </>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='w-full bg-white p-6 rounded-xl shadow-lg'
        >
          <div className="flex items-center justify-between mb-4">
            {/* Back Button */}
            <button
              type="button"
              className="px-2 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              onClick={() => {
                reset();
                setEditingRuleId(null);
                setShowNotificationForm(false);
                setActiveTab(null);
              }}
            ><ChevronLeft />

            </button>

            {/* Centered Title */}
            <h3 className="text-4xl font-bold text-gray-800 flex-1 text-center">
              {editingRuleId ? 'Edit SMS Rule' : 'New SMS Rule'}
            </h3>

            {/* Condition Button */}
            {/* <button
              type="button"
              className="px-4 py-2 font-bold border-2 border-black rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
              onClick={() => }
            >
              <Filter/>
              <span>Condition</span>
            </button> */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowConditionInput((prev) => !prev)}
              className={`px-4 py-2 rounded-lg border-2 border-black flex items-center gap-2 font-bold ${showConditionInput ? 'bg-gray-300' : 'bg-white-900'}`}
            >
              <Filter size={16} />
              Conditions
              {showConditionInput ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </motion.button>
          </div>

          <AnimatePresence>
            {showConditionInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <ConditionInput
                  control={control}
                  appendCondition={appendCondition}
                  removeCondition={removeCondition}
                  conditionFields={conditionFields}
                  formFields={formFieldsData}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title Field */}
            <div className="border-b border-gray-300 pb-4">
              <label className="block text-lg font-semibold text-gray-800 mb-2" htmlFor="smsTitle">Title</label>
              <input
                id="smsTitle"
                type="text"
                placeholder="Enter rule title"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800 mb-4"
                {...register('smsTitle', { required: true })}
              />
            </div>
            {/* Recipients Section */}
            <div className="border-b border-gray-300 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Recipients</h3>

              <div className="flex gap-3 mb-3">
                <input
                  type="tel"
                  placeholder="Add phone number"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      e.preventDefault();
                      appendCustomPhone({ value: e.target.value });
                      console.log(customPhoneFields);
                      
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
              <div className="flex flex-wrap gap-2 mb-3">
                {customPhoneFields.map((field, index) => (
                  <Pill
                    key={field.id}
                    value={field.value}
                    onRemove={() => removeCustomPhone(index)}
                  />
                ))}
              </div>
            </div>

            <div className="border-b border-gray-300 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">SMS Template</h3>
              <div className="flex gap-3 mb-3">
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-800"
                  onChange={(e) => {
                    const template = smsTemplates.find(t => t.id === e.target.value) || '';
                    handleTemplateSelect(template);
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
                  // onClick={(}
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
                  rows={10}
                />
                <div className="absolute bottom-2 right-3 text-sm text-gray-500">
                  {smsCharCount}/160
                </div>
              </div>
            </div>


            <div className="flex justify-between gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                onClick={() => {
                  reset();
                  setEditingRuleId(null);
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
                  {loading ? 'Saving...' : editingRuleId ? 'Update SMS Rule' : 'Save SMS Rule'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default NotificationTab;