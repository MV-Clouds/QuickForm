import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, Edit, Trash } from 'lucide-react';

const FolderView = ({ 
  folderName, 
  forms, 
  onViewForm, 
  onEditForm, 
  onDeleteForm, 
  onBack,
  onToggleStatus 
}) => {
  // Helper function to get form display data
  const getFormDisplayData = (form) => {
    // Fallbacks for fields
    const fields = Array.isArray(form.fields) && form.fields.length > 0
      ? form.fields
      : (Array.isArray(form.FormVersions) && form.FormVersions[0]?.Fields ? form.FormVersions[0].Fields : []);
    
    // Fallbacks for form name
    const formName = form.FormVersions?.filter((version) => version.Stage__c === 'Publish')[0]?.Name || 
                    form.FormVersions?.[0]?.Name || 
                    form.Name || 
                    'Form Title';
    
    // Fallbacks for status
    const status = form.status || form.Status__c || 'Draft';
    
    // Fallbacks for last modified
    const lastModified = form.lastmodDate || form.LastModifiedDate;
    
    // Fallbacks for submission count
    const submissionCount = form.submissionCount ?? form.Total_Submission_Count__c ?? 0;
    
    // Fallbacks for version
    let version = form.activeVersion || form.Active_Version__c;
    if (!version && Array.isArray(form.FormVersions) && form.FormVersions.length > 0) {
      version = form.FormVersions.reduce((max, v) => {
        const ver = parseInt(v.Version__c, 10);
        return (!isNaN(ver) && ver > max) ? ver : max;
      }, 1);
      version = 'V' + version;
    }

    return {
      fields,
      formName,
      status,
      lastModified,
      submissionCount,
      version: version || 'V1'
    };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <div className="w-[100%] h-[100%] px-8 py-6">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-[30rem]">
          <div>
          <motion.button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={20} />
            Back to Folders
          </motion.button>
          </div>
          <div className='text-center'>
            <h1 className="text-2xl font-bold text-gray-900">{folderName}</h1>
            <p className="text-gray-600 mt-1">{forms.length} form{forms.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </motion.div>

      {/* Forms Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {forms.map((form, index) => {
            const { fields, formName, status, lastModified, submissionCount, version } = getFormDisplayData(form);
            
            return (
              <motion.div
                key={form.id || form.Id || index}
                className="relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-100 border border-gray-100 h-[100%]"
                variants={cardVariants}
                whileHover="hover"
                layout
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <motion.div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                    whileHover={{ scale: 1.05 }}
                  >
                    {status === 'Active' ? 'Active' : 'Draft'}
                  </motion.div>
                </div>

                <div className="flex  h-[100%] min-h-[320px]  ">
                  {/* Form Preview Section */}
                  <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center" style={{filter : 'brightness(0.7)'}}>
                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm w-full h-full overflow-hidden">
                      <div className="text-center font-bold text-lg mb-3 text-gray-800 truncate">
                        {formName}
                      </div>
                      
                      {/* Dynamic form preview */}
                      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '200px', scrollbarWidth: 'none' }}>
                        <AnimatePresence>
                          {Array.isArray(fields) && fields.length > 0 ? (
                            fields
                              .sort((a, b) => (a.Order_Number__c || 0) - (b.Order_Number__c || 0))
                              .slice(0, 4) // Show only first 4 fields for preview
                              .map((field, idx) => (
                                <motion.div
                                  key={field.Id || idx}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                                  className="flex flex-col gap-1 bg-gray-50 rounded-md px-2 py-1 border border-gray-100"
                                >
                                  <label className="text-xs font-semibold text-gray-700 truncate">
                                    {field.Name}
                                  </label>
                                  {(() => {
                                    switch ((field.Field_Type__c || '').toLowerCase()) {
                                      case 'text':
                                      case 'shorttext':
                                        return <input type="text" className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white" placeholder="Enter text" disabled />;
                                      case 'number':
                                        return <input type="number" className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white" placeholder="0" disabled />;
                                      case 'textarea':
                                      case 'longtext':
                                        return <textarea className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white resize-none" rows={1} placeholder="Enter text" disabled />;
                                      case 'date':
                                        return <input type="date" className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white" disabled />;
                                      case 'dropdown':
                                        return (
                                          <select className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white" disabled>
                                            <option>Select option</option>
                                          </select>
                                        );
                                      default:
                                        return <input type="text" className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white" placeholder="Field" disabled />;
                                    }
                                  })()}
                                </motion.div>
                              ))
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              className="text-gray-400 text-xs text-center py-4 h-[100%]"
                            >
                              No fields to preview
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="p-4 flex flex-col justify-evenly  bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg truncate mb-1">
                          {formName}
                        </h3>
                        <p className="text-sm text-gray-600">Version: {version}</p>
                      </div>
                      
                      {/* Status Toggle */}
                      <motion.label 
                        className="flex items-center cursor-pointer"
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={status === 'Active'} 
                            onChange={() => onToggleStatus(form.id || form.Id)} 
                          />
                          <div className={`block text-white w-16 h-6 rounded-full text-xs font-medium ${
                            status === 'Active' ? 'bg-green-500 px-2' : 'px-4 bg-gray-300'
                          }`}>
                            {status === 'Active' ? 'ON' : 'OFF'}
                          </div>
                          <motion.div 
                            className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-md"
                            animate={{ x: status === 'Active' ? 40 : 0 }}
                            transition={{ type: "spring", stiffness: 700, damping: 30 }}
                          />
                        </div>
                      </motion.label>
                    </div>

                    {/* Form Stats */}
                    <div className="text-sm text-gray-600 mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Last Modified :</span>
                        <span>{lastModified ? new Date(lastModified).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Submissions :</span>
                        <span>{submissionCount}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium text-white"
                        style={{ background: 'linear-gradient(to right, #0B295E, #1D6D9E)' }}
                        onClick={() => onViewForm(form)}
                      >
                        <Eye size={16} />
                        View
                      </motion.button>
                      
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
                        onClick={() => onEditForm(form)}
                      >
                        <Edit size={16} />
                      </motion.button>
                      
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50"
                        onClick={() => onDeleteForm(form.id || form.Id)}
                      >
                        <Trash size={16} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {forms.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No forms in this folder</h3>
          <p className="text-gray-500">This folder is empty. Add some forms to get started.</p>
        </motion.div>
      )}
    </div>
  );
};

export default FolderView; 