import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CARD_WIDTH = 500;
const CARD_GAP = 24;
const VISIBLE_CARDS = 3;

const RecentFilesSlider = ({ recentForms = [], onViewForm }) => {
  const [index, setIndex] = useState(0);
  const maxIndex = Math.max(0, recentForms.length - VISIBLE_CARDS);

  const handlePrev = () => setIndex((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setIndex((prev) => Math.min(prev + 1, maxIndex));
    const toggleStatus =(id)=>{
        console.log('status changing form',id);
        
    }
  return (
    <div className="w-full px-8 py-8 " >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recent Files</h2>
      </div>
      <div
        className="relative mx-auto"
        style={{
          width: CARD_WIDTH * VISIBLE_CARDS + CARD_GAP * (VISIBLE_CARDS - 1),
          overflow: 'hidden',
          position: 'relative',
          height: 340,
        }}
      >
        {/* Prev Button */}
        <button
          className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full p-2  bg-transparent shadow hover:bg-blue-50 transition-colors ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handlePrev}
          disabled={index === 0}
          aria-label="Previous"
        //   style={{ marginLeft: -32 }}
        >
          <ChevronLeft size={32} />
        </button>
        {/* Next Button */}
        <button
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full p-2  bg-transparent shadow hover:bg-blue-50 transition-colors ${index === maxIndex ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleNext}
          disabled={index === maxIndex}
          aria-label="Next"
        //   style={{ marginRight: -32 }}
        >
          <ChevronRight size={32} />
        </button>
        <motion.div
          className="flex gap-6"
          style={{
            width: recentForms.length * (CARD_WIDTH + CARD_GAP),
            x: -(index * (CARD_WIDTH + CARD_GAP)),
            transition: 'x 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'visible',
          }}
          animate={{ x: -(index * (CARD_WIDTH + CARD_GAP)) }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        >
          {recentForms.map((item, index) => {
            // Fallbacks for fields
            const fields = Array.isArray(item.fields) && item.fields.length > 0
              ? item.fields
              : (Array.isArray(item.FormVersions) && item.FormVersions[0]?.Fields ? item.FormVersions[0].Fields : []);
            // Fallbacks for form name
            const formName = item.FormVersions[0]?.Name || item.Name || 'Form Title';
            // Fallbacks for status
            const status = item.status || item.Status__c || 'Draft';
            // Fallbacks for last modified
            const lastModified = item.lastmodDate || item.LastModifiedDate;
            // Fallbacks for submission count
            const submissionCount = item.submissionCount ?? item.Total_Submission_Count__c ?? 0;
            // Fallbacks for version
            let version = item.activeVersion || item.Active_Version__c;
            if (!version && Array.isArray(item.FormVersions) && item.FormVersions.length > 0) {
              // Use the highest Version__c from FormVersions
              version = item.FormVersions.reduce((max, v) => {
                const ver = parseInt(v.Version__c, 10);
                return (!isNaN(ver) && ver > max) ? ver : max;
              }, 1);
              version = 'V' + version;
            }
            return (
              <motion.div
                key={item.id || item.Id || index}
                className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white border border-gray-100 h-full"
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                <div className="flex flex-col sm:flex-row h-full">
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold ${status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{status === 'Active' ? 'Active' : 'Draft'}</div>
                  {/* Form Preview Section - Left Side */}
                  <div className="w-full sm:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 flex items-center justify-center" style={{ filter: 'brightness(0.7)' }}>
                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm w-full transform group-hover:scale-[1.02] transition-transform duration-300">
                      <div className="text-center font-bold text-lg mb-3 text-gray-800 truncate">{formName}</div>
                      {/* Dynamic, scrollable, interactive form preview */}
                      <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '220px', minHeight: '120px', scrollbarWidth: 'none', paddingRight: 4 }}>
                        <AnimatePresence>
                          {Array.isArray(fields) && fields.length > 0 ? (
                            fields
                              .sort((a, b) => (a.Order_Number__c || 0) - (b.Order_Number__c || 0))
                              .map((field, idx) => (
                                <motion.div
                                  key={field.Id || idx}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                                  whileHover={{ scale: 1.03, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                                  className="flex flex-col gap-1 bg-gray-50 rounded-md px-3 py-2 border border-gray-100 hover:border-indigo-300 transition-all"
                                >
                                  <label className="text-xs font-semibold text-gray-700 truncate" title={field.Name}>{field.Name}</label>
                                  {(() => {
                                    switch ((field.Field_Type__c || '').toLowerCase()) {
                                      case 'text':
                                      case 'shorttext':
                                        return <input type="text" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" placeholder={'Enter ' + field.Name} disabled />;
                                      case 'number':
                                        return <input type="number" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" placeholder={'Enter ' + field.Name} disabled />;
                                      case 'textarea':
                                      case 'longtext':
                                        return <textarea className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none resize-none" rows={2} placeholder={'Enter ' + field.Name} disabled />;
                                      case 'date':
                                        return <input type="date" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" disabled />;
                                      case 'datetime':
                                        return <input type="datetime-local" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" disabled />;
                                      case 'checkbox':
                                        return <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" disabled />;
                                      case 'dropdown':
                                        return (
                                          <select className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" disabled>
                                            <option>{field.Name}</option>
                                          </select>
                                        );
                                      default:
                                        return <input type="text" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" placeholder={field.Name} disabled />;
                                    }
                                  })()}
                                </motion.div>
                              ))
                          ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-400 text-sm text-center py-6">No fields to preview.</motion.div>
                          )}
                          <div className='text-center'>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: 'linear-gradient(to right, #0B295E, #1D6D9E)' }} className="mt-2 px-4 py-1 bg-blue-500 text-white font-bold rounded hover:bg-blue-700 transition duration-300">Submit</motion.button>
                          </div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  {/* Details Section - Right Side */}
                  <div className="w-full sm:w-1/2 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg truncate">{formName}</h3>
                          <p className="text-md text-black-500 mt-6 font-bold">Version : {version || 'V1'}</p>
                        </div>
                        {/* Toggle Switch */}
                        <motion.label className="flex items-center cursor-pointer mt-12" whileTap={{ scale: 0.95 }}>
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={status === 'Active'} onChange={() => toggleStatus(item.id || item.Id)} />
                            <div className={`block text-white w-20 h-6 rounded-full ${status === 'Active' ? 'bg-green-500 px-3 py-0.5' : 'px-6 py-0.5 bg-gray-300'}`}>{status === 'Active' ? 'Active' : 'Inactive'}</div>
                            <motion.div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-md`} animate={{ x: status === 'Active' ? 55 : 0 }} transition={{ type: "spring", stiffness: 700, damping: 30 }}></motion.div>
                          </div>
                        </motion.label>
                      </div>
                      <div className="text-md text-gray-600 mt-10">
                        <div className='flex gap-5'>
                          <p className=" text-gray-500">Last Modified</p>
                          <p>{lastModified ? new Date(lastModified).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="mt-2 flex">
                          <p className=" text-gray-500">Submissions</p>
                          <p>{submissionCount}</p>
                        </div>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-2 rounded-lg font-medium shadow-md  mt-4" style={{ border: '1px solid #0B295E' }} onClick={() => onViewForm(item.id || item.Id)}>
                      View Form
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default RecentFilesSlider; 