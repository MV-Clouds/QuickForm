import React, { useMemo, useState } from 'react';
import { useSalesforceData } from '../Context/MetadataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrashRestore } from 'react-icons/fa';
import { ArchiveRestore, Search, MoreVertical, Grid2x2, List, LayoutGrid } from 'lucide-react';

/**
 * Gradient style for primary actions
 */
const gradientBtn = {
  background: 'linear-gradient(to right, #1D6D9E, #0B295E)',
};

/**
 * DeletedFormsPage - shows trashed forms and allows restoring them.
 * @param {{ token?: string }} props
 */
const DeletedFormsPage = ({ token }) => {
  const { deletedData = [], isLoading, refreshData } = useSalesforceData();
  const [search, setSearch] = useState('');
  const [restoringIds, setRestoringIds] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isGridView, setIsGridView] = useState(true);

  const toggleMenu = (id) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const filteredDeletedForms = useMemo(
    () =>
      deletedData.filter(f =>
        (f.FormVersions?.[0]?.Name || '').toLowerCase().includes(search.toLowerCase())
      ),
    [deletedData, search]
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
              disabled
            />
          </div>
        ))
      )}
    </div>
  );

  const handleRestore = async (form) => {
    const formId = form.Id || 'unknown';
    if (restoringIds.has(formId)) return;

    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    const storedToken = token;

    if (!userId || !instanceUrl || !storedToken) {
      console.error('Restore failed: missing userId, instanceUrl, or token in sessionStorage');
      alert('Cannot restore: missing authentication/session info.');
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

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        console.error('Restore API error', { status: response.status, body: data });
        alert(`Restore failed: ${data.error || response.statusText}`);
      } else {
        console.log('Restore successful', { formId, response: data });
      }
      const res = await response.json();
      if(res.newAccessToken){
        token = res.newAccessToken;
      }
    } catch (err) {
      console.error('Exception during restore', { formId, error: err });
    } finally {
      await refreshData();
      setRestoringIds(prev => {
        const copy = new Set(prev);
        copy.delete(formId);
        return copy;
      });
    }
  };

  const handleEmptyBin = async () => {
    if (!window.confirm('Are you sure you want to empty the bin? This action cannot be undone.')) {
      return;
    }
    try {
      // Implement empty bin functionality
    } catch (error) {
      console.error('Error emptying bin:', error);
    }
  };

  const handleRestoreAll = async () => {
    console.log('restoring all...');
    // Implement restore all functionality
  };

  return (
    <div className="mx-auto ">
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
        <div className={`${isGridView ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'flex flex-col'} gap-6`}>
          <AnimatePresence mode="sync">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl shadow p-4 border border-gray-200 animate-pulse h-[260px]"
                >
                  <div className="h-24 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </motion.div>
              ))
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
                  let fields = [];
                  try {
                    fields = form.FormVersions?.[0]?.Fields || [];
                  } catch {
                    fields = [];
                  }
                  const formId = form.Id || idx;
                  const isRestoring = restoringIds.has(formId);
                  const menuOpen = openMenuId === formId;

                  return (
                    <AnimatePresence mode= 'sync'>
                      <motion.div
                      key={formId}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className={`${isGridView ? '' : 'flex'} bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-red-100 overflow-hidden`}
                    >
                      <motion.div
                        layout
                        className={`${isGridView ? 'flex flex-col' : 'flex flex-row flex-1'} relative group`}
                      >
                        {/* Field preview */}
                        <div className={`${isGridView ? 'w-full' : 'w-48'} flex-shrink-0 p-2`}>
                          {renderFieldPreview(fields)}
                        </div>

                        {/* Content */}
                        <div className={`${isGridView ? 'p-4' : 'p-4 flex-1'} flex flex-col`}>
                          {/* 3-dot menu - shows on hover */}
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
                                    onClick={() => { handleRestore(form); setOpenMenuId(null); }}
                                    disabled={isRestoring}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${isRestoring ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}
                                  >
                                    {isRestoring ? 'Restoring...' : 'Restore'}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Form info */}
                          <div className={`${isGridView ? 'mt-2' : 'ml-4'} flex-1`}>
                            <h3 className="font-bold text-lg truncate">
                              {form.FormVersions?.[0]?.Name || 'Untitled'}
                            </h3>
                            <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                              {form.Description || 'No description'}
                            </p>
                          </div>

                          {/* Restore button */}
                          {!isGridView && (
                            <div className="mt-4 flex justify-end">
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleRestore(form)}
                                disabled={isRestoring}
                                className={`login-button px-4 py-2 rounded-md text-sm font-semibold ${isRestoring ? 'bg-gray-300 cursor-not-allowed' : ''
                                  }`}
                                style={gradientBtn}
                              >
                                {isRestoring ? 'Restoring...' : 'Restore'}
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                   </AnimatePresence> 
                  );
                })}
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default DeletedFormsPage;