import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, PlusCircle } from "lucide-react"; // or your icon library
import FolderCard from "./FolderCard";
import FormCard from "./FormCard";
const FolderManager = ({
  recentForms,
  handleCreateFolder,
  isCreating,
  onViewForm,
  onEditForm,
  onDeleteForm,
  onToggleStatus,
  SFfolders,
  token,
  userId,
  instanceUrl,
  fetchSalesforceData,
  isLoading
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [selectedFormIds, setSelectedFormIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [folderPath, setFolderPath] = useState([]); // Array of folder objects
  const [selectedFolderForms, setSelectedFolderForms] = useState([]); // Forms in the selected folder
  // Filter folders by search
  const filteredFolders = SFfolders.filter((folder) =>
    folder.Name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleOpenFolder = (folder) => {
    setFolderPath((prev) => [...prev, folder]);
    // Get form objects from recentForms using folder.FormIds__c
    const formIds = folder.FormIds__c ? folder.FormIds__c.split(",") : [];
    const forms = recentForms.filter((form) => formIds.includes(form.Id));
    console.log("Forms", forms);
    setSelectedFolderForms(forms);
  };
  const handleBreadcrumbClick = (idx) => {
    setSelectedFolderForms([]); // Clear forms when navigating up
    setFolderPath(folderPath.slice(0, idx + 1));
  };
  const handleEditFolder = (folder) => {
    console.log("Editing/...", folder);
    setCurrentFolder(folder);
    setFolderName(folder.Name);
    setFolderDescription(folder.Description__c || "");
    setSelectedFormIds(folder.FormIds__c.split(",") || []);
    setIsEditModalOpen(true);
  };
  function buildFolderTree(folders) {
    const map = {};

    // Create a map of folders
    folders.forEach((folder) => {
      map[folder.Id] = { ...folder, children: [] };
    });

    // Build the tree
    folders.forEach((folder) => {
      const parents = folder.Parent_Folder__c?.split(",").filter(Boolean);
      if (Array.isArray(parents) && parents.length > 0) {
        parents.forEach((parentId) => {
          if (map[parentId]) {
            map[parentId].children.push(map[folder.Id]);
          }
        });
      }
    });

    // Return only top-level folders (no parents)
    return Object.values(map).filter(
      (folder) =>
        !folder.Parent_Folder__c || folder.Parent_Folder__c.trim() === ""
    );
  }

  const handleSaveFolder = async () => {
    await handleCreateFolder(
      folderName,
      selectedFormIds,
      folderDescription,
      currentFolder?.Id
    );
    setIsEditModalOpen(false);
  };
  const folderTree = buildFolderTree(filteredFolders);
  const foldersToShow =
    folderPath.length > 0
      ? folderPath[folderPath.length - 1].children
      : folderTree;

  return (
    <div>
      <div
        className="px-10 py-8 shadow-lg relative"
        style={{ background: "linear-gradient(to right, #008AB0, #8FDCF1)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex justify-between"
        >
          <h1 className="text-3xl font-bold text-white mb-1">Folders</h1>
        </motion.div>
      </div>

      <motion.div
        className="p-10 bg-white rounded-xl shadow-2xl"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="mb-6 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search folders..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:outline-none"
            />
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>{" "}
          <div className="flex w-[20%] gap-6 justify-end items-center">
            <button
              onClick={() => {
                setCurrentFolder(null);
                setFolderName("");
                setFolderDescription("");
                setSelectedFormIds([]);
              }}
              className="px-4 py-2 border bg-white-600 text-white rounded hover:bg-blue-50"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.44596 10.5123C6.15159 11.6108 6.18958 12.7719 6.55512 13.8488C6.92066 14.9257 7.59732 15.8701 8.49955 16.5624C9.40178 17.2547 10.4891 17.664 11.6239 17.7383C12.7587 17.8127 13.8901 17.5489 14.875 16.9803M17.554 13.4883C17.8483 12.3898 17.8103 11.2287 17.4448 10.1518C17.0793 9.07492 16.4026 8.1306 15.5004 7.43827C14.5981 6.74595 13.5109 6.33671 12.3761 6.26232C11.2412 6.18793 10.1099 6.45172 9.12496 7.02033"
                  stroke="#5F6165"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M3.75 12.5L6.25 10L8.75 12.5M15.25 11.5L17.75 14L20.25 11.5"
                  stroke="#5F6165"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <div className="">
              <button
                onClick={() => {
                  setCurrentFolder(null);
                  setFolderName("");
                  setFolderDescription("");
                  setSelectedFormIds([]);
                  setIsEditModalOpen(true);
                }}
                className="login-button flex items-center gap-2 rounded-lg px-5 py-4 text-white font-semibold shadow-md"
              >
                <PlusCircle className="h-5 w-5" /> Create Folder
              </button>
            </div>
          </div>
        </div>
        {/* Breadcrumbs */}
        {folderPath.length > 0 && (
          <motion.div
            className="flex items-center mb-4 space-x-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={() => {
                setFolderPath([]);
                setSelectedFolderForms([]);
              }}
              className="text-blue-600 hover:underline"
            >
              Root
            </button>
            {folderPath.map((folder, idx) => (
              <React.Fragment key={folder.Id}>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => handleBreadcrumbClick(idx)}
                  className="text-blue-600 hover:underline"
                >
                  {folder.Name}
                </button>
              </React.Fragment>
            ))}
          </motion.div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {foldersToShow.map((folder) => (
            <FolderCard
              key={folder.Id}
              folder={folder}
              onEdit={handleEditFolder}
              onDelete={() => {}}
              onMove={() => {}}
              allFolders={SFfolders}
              token={token}
              userId={userId}
              instanceUrl={instanceUrl}
              refreshData={fetchSalesforceData}
              onClick={() => handleOpenFolder(folder)}
            />
          ))}
        </div>
        {/* Show forms inside selected folder */}
        {selectedFolderForms.length > 0 && (
          <motion.div
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-xl font-bold mb-4">Forms in Folder</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedFolderForms.map((form) => (
                <FormCard key={form.Id} form={form} />
              ))}
            </div>
          </motion.div>
        )}
        {/* Edit/Create Folder Modal */}
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-medium mb-4">
                {currentFolder ? "Edit Folder" : "Create New Folder"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="Enter folder name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={folderDescription}
                    onChange={(e) => setFolderDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="Enter description (optional)"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Forms
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-2">
                    {recentForms.map((form) => (
                      <div key={form.Id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`form-${form.Id}`}
                          checked={selectedFormIds.includes(form.Id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFormIds([...selectedFormIds, form.Id]);
                            } else {
                              setSelectedFormIds(
                                selectedFormIds.filter((id) => id !== form.Id)
                              );
                            }
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`form-${form.Id}`}>{form.Name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFolder}
                  disabled={!folderName || isCreating}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreating ? "Saving..." : "Save Folder"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default FolderManager;
