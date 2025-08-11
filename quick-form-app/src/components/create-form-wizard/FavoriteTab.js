import React, { useMemo, useState } from "react";
import { useSalesforceData } from "../Context/MetadataContext";
import { AnimatePresence, motion } from "framer-motion";

const FavoriteTab = ({ handleEditForm }) => {

    const { favoriteData } = useSalesforceData();
    console.log('Favorite Data =>', favoriteData);
    const [search, setSearch] = useState('');
    const filteredFavorites = useMemo(() =>
        favoriteData.filter(f =>
            f.Name.toLowerCase().includes(search.toLowerCase())
        ), [favoriteData, search]);

    // View form handler
    const handleViewForm = (formId) => {
        // Implement your view form logic here
        console.log(`Viewing form ${formId}`);
        handleEditForm(favoriteData.filter(val => val.Id === formId)[0]);

    };
    // Status toggle handler
    const toggleStatus = (formId) => {
        // Implement your status toggle logic here
        console.log(`Toggling status for form ${formId}`);
    };
    // Date formatting helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };
    return (
        <div>{/* Top Row */}
            <div className=" items-center justify-between mb-8">
                <div className="px-10 py-8 shadow-lg relative" style={{ background: 'linear-gradient(to right, #008AB0, #8FDCF1)' }}>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-6 flex justify-between"
                    >
                        <h1 className="text-3xl font-bold text-white mb-1">Starred</h1>
                        {/* <div>
                <button
                  className="save-btn flex items-center gap-2 rounded-lg px-5 py- text-white font-semibold shadow-md"
                  style={gradientBtn}
                  onClick={() => setshowModal(true)}
                >
                  <PlusCircle className="h-5 w-5" /> Create Fieldset
                </button>
              </div> */}
                    </motion.div>
                </div>

                <div className="flex items-center gap-4 flex-1 justify-between mt-2">
                    <div className="flex gap-4 ">
                        <input
                            type="text"
                            placeholder="Search fieldsets..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-black-400 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm w-64"
                        />
                        {/* <select className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-black-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm">
              <option>All</option>
            </select> */}
                    </div>

                </div>
            </div>
            <AnimatePresence mode="wait">
                <motion.div
                    key="card-view"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {filteredFavorites.map((item, index) => (
                        <motion.div
                            key={item.id || index}
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
                                <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {item.status === 'Active' ? 'Active' : 'Draft'}
                                </div>

                                {/* Form Preview Section - Left Side */}
                                <div className="w-full sm:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 flex items-center justify-center" style={{ filter: 'brightness(0.75)' }}
                                >
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm w-full transform group-hover:scale-[1.02] transition-transform duration-300">
                                        <div className="text-center font-bold text-lg mb-3 text-gray-800 truncate">
                                            {item.formName || 'Form Title'}
                                        </div>
                                        {/* Dynamic, scrollable, interactive form preview */}
                                        <div
                                            className="space-y-3 overflow-y-auto"
                                            style={{ maxHeight: '220px', minHeight: '120px', scrollbarWidth: 'none', paddingRight: 4 }}
                                        >
                                            <AnimatePresence>
                                                {Array.isArray(item.fields) && item.fields.length > 0 ? (
                                                    item.fields
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
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-400 text-sm text-center py-6">
                                                        No fields to preview.
                                                    </motion.div>
                                                )}
                                                <div className='text-center'>
                                                    <motion.button whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        style={{ background: 'linear-gradient(to right, #0B295E, #1D6D9E)' }}
                                                        className="mt-2 px-4 py-1 bg-blue-500 text-white font-bold rounded hover:bg-blue-700 transition duration-300"
                                                    >
                                                        Submit
                                                    </motion.button>
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
                                                <h3 className="font-bold text-gray-900 text-lg truncate">{item.formName || 'Form Name'}</h3>
                                                <p className="text-md text-black-500 mt-6 font-bold">Version : {item.activeVersion || 'V1'}</p>
                                            </div>

                                            {/* Toggle Switch */}
                                            <motion.label
                                                className="flex items-center cursor-pointer mt-12"
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={item.status === 'Active'}
                                                        onChange={() => toggleStatus(item.id)}
                                                    />
                                                    <div className={`block text-white w-20 h-6 rounded-full ${item.status === 'Active' ? 'bg-green-500 px-3 py-0.5' : 'px-6 py-0.5 bg-gray-300'}`}>{item.status === 'Active' ? 'Active' : 'Inactive'}</div>
                                                    <motion.div
                                                        className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-md`}
                                                        animate={{
                                                            x: item.status === 'Active' ? 55 : 0
                                                        }}
                                                        transition={{ type: "spring", stiffness: 700, damping: 30 }}
                                                    ></motion.div>
                                                </div>
                                            </motion.label>
                                        </div>

                                        <div className="text-md text-gray-600 mt-10">
                                            <div className='flex gap-5'>
                                                <p className=" text-gray-500">Last Modified</p>
                                                <p>{formatDate(item.LastModifiedDate) || 'N/A'}</p>
                                            </div>
                                            <div className="mt-2 flex">
                                                <p className=" text-gray-500">Submissions</p>
                                                <p>{item.Submission_Count__c || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-2 rounded-lg font-medium shadow-md  mt-4"
                                        style={{ border: '1px solid #0B295E' }}
                                        onClick={() => handleViewForm(item.Id)}
                                    >
                                        View Form
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

            </AnimatePresence>
        </div>
    )
}
export default FavoriteTab;