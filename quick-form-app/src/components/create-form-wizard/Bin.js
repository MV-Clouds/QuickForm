import React, { useMemo, useState , useEffect } from 'react';
import { useSalesforceData } from '../Context/MetadataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrashRestore } from 'react-icons/fa';
import { ArchiveRestore, Search, MoreVertical, Grid2x2, List, LayoutGrid } from 'lucide-react';
import Loader from '../Loader'
/**
 * Gradient style for primary actions
 */
const gradientBtn = {
  background: 'linear-gradient(to right, #1D6D9E, #0B295E)',
};
// Style constants for reuse
const cardBaseClasses = "bg-white rounded-xl shadow-sm border border-gray-200 transition-shadow duration-200 hover:shadow-md";

/**
 * DeletedFormsPage - shows trashed forms and allows restoring them.
 * @param {{ token?: string }} props
 */
const Bin = ({ token }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const { deletedData = [], isLoading, refreshData } = useSalesforceData();
  const [search, setSearch] = useState('');
  const [restoringIds, setRestoringIds] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isGridView, setIsGridView] = useState(true);
  const [localDeletedData, setLocalDeletedData] = useState(deletedData);
  useEffect(() => {
    setLocalDeletedData(deletedData);
  }, [deletedData]);
  const toggleMenu = (id) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };
  const toggleSelect = (formId) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(formId)) copy.delete(formId);
      else copy.add(formId);
      return copy;
    });
  };
  
  const filteredDeletedForms = useMemo(
    () =>
      localDeletedData.filter(f =>
        (f.FormVersions?.[0]?.Name || '').toLowerCase().includes(search.toLowerCase())
      ),
    [localDeletedData, search]
  );

  const renderFieldPreview = (fields = []) => (
    <div
      className="overflow-y-auto rounded-lg"
      style={{
        minHeight: 150,
        maxHeight: 150,
        scrollbarWidth: 'none',
        background: 'white',
        filter: 'brightness(0.7)',
      }}
    >
      {fields.length === 0 ? (
        <div className="text-gray-400 text-xs text-center py-4">No fields</div>
      ) : (
        fields.slice(0, 4).map((f, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 bg-gray-50 rounded-md px-2 py-1 border border-gray-100"
          >
            <label className="text-xs font-semibold text-gray-700 truncate">
              {f.Name || f.label || 'Field'}
            </label>
            <input
              type="text"
              className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white"
              placeholder={f.placeholder?.main || f.Name || 'Field'}
              readOnly
            />
          </div>
        ))
      )}
    </div>
  );

  const handleRestore = async (form) => {
    const formId = form.Id || 'unknown';
    if (restoringIds.has(formId)) return;
    const prevState = [...localDeletedData];
    setLocalDeletedData((forms) => forms.filter(f => f.Id !== formId));

    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    const storedToken = token;

    if (!userId || !instanceUrl || !storedToken) {
      console.error('Restore failed: missing userId, instanceUrl, or token in sessionStorage');
      return;
    }

    setRestoringIds(prev => new Set(prev).add(formId));

    try {
      const payload = {
        userId,
        instanceUrl,
        token: storedToken,
        DeletedForm: form,
      };

      const response = await fetch(
        'https://e757lm9v21.execute-api.us-east-1.amazonaws.com/undelete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Restore API error', { status: response.status, body: data });
        setLocalDeletedData(prevState);
      } else {
        console.log('Restore successful', { formId, response: data });
      }
      if (data.newAccessToken) {
        token = data.newAccessToken;
      }
    } catch (err) {
      console.error('Exception during restore', { formId, error: err });
      setLocalDeletedData(prevState);
    } finally {
      setRestoringIds(prev => {
        const copy = new Set(prev);
        copy.delete(formId);
        return copy;
      });
    }
  };

  const handleRestoreAll = async (ids) => {
     const prevState = [...localDeletedData];
  setLocalDeletedData([]);
    try {
      const payload = {
        userId: sessionStorage.getItem('userId'),
        instanceUrl: sessionStorage.getItem('instanceUrl'),
        token,
      };
      const res = await fetch('https://e757lm9v21.execute-api.us-east-1.amazonaws.com/undelete/restoreAll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSelectedIds(new Set());
    } catch (err) {
      setLocalDeletedData(prevState); // rollback
      console.error('Restore all failed', err);
    }
  };
  
  const handleEmptyBin = async (ids) => {
    if (!window.confirm('Are you sure you want to empty the bin?')) return;
    const prevState = [...localDeletedData];
    setLocalDeletedData((forms) => forms.filter(f => !ids.includes(f.Id)));  
    try {
      const payload = {
        userId: sessionStorage.getItem('userId'),
        instanceUrl: sessionStorage.getItem('instanceUrl'),
        token,
        ids, // pass array of IDs to delete
      };
      const res = await fetch('https://e757lm9v21.execute-api.us-east-1.amazonaws.com/undelete/emptyAll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSelectedIds(new Set());
    } catch (err) {
      setLocalDeletedData(prevState); // rollback
      console.error('Empty bin failed', err);
    }
  };
  

  return (
    <div className="mx-auto relative">
      {/* Header with gradient background */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="shadow-lg overflow-hidden mb-8"
        style={{ background: 'linear-gradient(to right, #008AB0, #8FDCF1)' }}
      >
        <div className="px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-bold text-white">Bin</h1>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="login-button flex items-center gap-2 rounded-lg px-4 py-2 text-white font-semibold shadow-md"
                onClick={handleEmptyBin}
                style={gradientBtn}
              >
                <FaTrashRestore className="h-4 w-4" />
                <span>Empty Bin</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="login-button flex items-center gap-2 rounded-lg px-4 py-2 text-white font-semibold shadow-md"
                onClick={handleRestoreAll}
                style={gradientBtn}
              >
                <ArchiveRestore className="h-4 w-4" />
                <span>Restore All</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div className="px-4 py-6 ml-10 mr-10 shadow-lg bg-white rounded-lg">
        {/* Search and view controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            <input
              type="text"
              placeholder="Search deleted forms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-4 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">

            <div className="flex rounded-lg border border-gray-300 p-1 bg-gray-50 shadow-sm">
              <button
                className={`p-2 ${!isGridView ? 'text-white login-button' : 'text-gray-700'}   rounded-lg transition-colors`}
                onClick={() => setIsGridView(false)}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                className={`p-2 ${isGridView ? 'text-white login-button' : 'text-gray-700'}  rounded-lg transition-colors`}
                onClick={() => setIsGridView(true)}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Forms grid */}
        <div className={`relative ${isGridView ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'flex flex-col'} gap-6`}>
          <AnimatePresence mode="sync">
            {isLoading ? (
              <div>
                <Loader text ={'Loading Deleted Forms'} fullscreen = {false}/>
              </div>
            ) : (
              <>
                {filteredDeletedForms.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-4 text-gray-400 text-center py-12"
                  >
                    No deleted forms found.
                  </motion.div>
                )}
                {filteredDeletedForms.map((form, idx) => {
                  const formId = form.Id || idx;
                  const isRestoring = restoringIds.has(formId);
                  const menuOpen = openMenuId === formId;

                  // Calculate count of fields from the first version or zero default
                  const fieldsCount = (form.FormVersions?.[0]?.Fields?.length) || 0;
                  const versionName = form.FormVersions?.[0]?.Name || 'Untitled';

                  return (
                    <AnimatePresence mode="sync" key={formId}>
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className={`${cardBaseClasses} ${isGridView ? 'relative group' : 'flex items-center gap-4 px-4 py-3'}`}
                        >
                        <div className={`${isGridView ? 'flex flex-col p-4' : 'flex flex-col flex-1 min-w-0'}`}>
                          {isGridView ? (
                            <div className="w-full mb-4">
                              {renderFieldPreview(form.FormVersions?.[0]?.Fields || [])}
                            </div>
                          ) : null}

                          <div className={isGridView ? '' : ''}>
                            <h3 className={`${isGridView ? 'font-semibold text-lg' : 'font-semibold text-md'} truncate text-gray-900`}>
                              {versionName}
                            </h3>
                            <p className={`${isGridView ? 'text-gray-500 text-sm mt-1 line-clamp-2' : 'text-gray-500 text-xs mt-1 truncate'}`}>
                              {form.Description || 'No description'}
                            </p>
                            {!isGridView && (
                              <div className="text-gray-400 text-xs mt-1">
                                {fieldsCount} field{fieldsCount !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                         {/* Checkbox in top-left corner */}
                        {isGridView && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(formId)}
                            onChange={() => toggleSelect(formId)}
                            className="absolute top-3 left-3 w-4 h-4 text-blue-600 border-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        )}
                        {/* Show 3-dot menu button only for grid view on hover */}
                        {isGridView && (
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMenu(formId);
                              }}
                              className="p-1 rounded-full hover:bg-gray-200 cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical size={20} className="text-gray-500 hover:text-gray-700" />
                            </motion.div>

                            {/* Menu dropdown */}
                            <AnimatePresence>
                              {menuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                  className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-md z-10 overflow-hidden"
                                >
                                  <button
                                    onClick={() => {
                                      handleRestore(form);
                                      setOpenMenuId(null);
                                    }}
                                    disabled={isRestoring}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                      isRestoring ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                                    }`}
                                  >
                                    {isRestoring ? 'Restoring...' : 'Restore'}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                        {/* Actions */}
                        {!isGridView && (
                          <div className="flex items-center gap-3">
                            {/* 3-dot menu icon */}
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMenu(formId);
                              }}
                              className="p-1 rounded-full hover:bg-gray-200 cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical size={20} className="text-gray-500 hover:text-gray-700" />
                            </motion.div>

                            {/* Restore icon button */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRestore(form)}
                              disabled={isRestoring}
                              className={`flex items-center justify-center w-8 h-8 rounded-md text-sm font-semibold transition-colors ${isRestoring ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              aria-label="Restore form"
                            >
                              {isRestoring ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                              ) : (
                                '⭮'
                              )}
                            </motion.button>

                            {/* Dropdown menu */}
                            <AnimatePresence>
                              {menuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                  transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                                  className="absolute right-0 mt-10 w-32 bg-white border border-gray-200 rounded-md shadow-md z-20"
                                >
                                  <button
                                    onClick={() => {
                                      handleRestore(form);
                                      setOpenMenuId(null);
                                    }}
                                    disabled={isRestoring}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${isRestoring ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                                      }`}
                                  >
                                    {isRestoring ? 'Restoring...' : 'Restore'}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                        
                      </motion.div>
                    </AnimatePresence>
                  );
                })}
                <AnimatePresence>
  {selectedIds.size > 0 && (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-lg px-6 py-4 flex items-center gap-4 border border-gray-200 z-50"
    >
      <span className="text-sm text-gray-700">
        {selectedIds.size} selected
      </span>

      <button
        onClick={() => handleRestoreAll([...selectedIds])}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Restore Selected
      </button>

      <button
        onClick={() => handleEmptyBin([...selectedIds])}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
      >
        Empty Bin
      </button>
    </motion.div>
  )}
</AnimatePresence>

              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Bin;