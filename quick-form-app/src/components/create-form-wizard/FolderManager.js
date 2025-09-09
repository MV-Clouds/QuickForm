
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, PlusCircle, FolderOpen, PlusCircleIcon } from "lucide-react"; // or your icon library
import FolderCard from "./FolderCard";
import FormCard from "./FormCard";
import { Dropdown, Button, Space } from "antd";
import { AppstoreOutlined, BarsOutlined } from "@ant-design/icons";
import FolderList from "./FolderList";
import FolderDetail from "./FolderDetail";
import Loader from "../Loader";

const viewModes = {
  LARGE: "large",
  MEDIUM: "medium",
  SMALL: "small",
  LIST: "list",
  DETAIL: "detail", // new detail list view
  DETAILS: "details", // keep table style if you want
};
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
  isLoading,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [selectedFormIds, setSelectedFormIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [folderPath, setFolderPath] = useState([]); // Array of folder objects
  const [selectedFolderForms, setSelectedFolderForms] = useState([]); // Forms in the selected folder
  const [viewMode, setViewMode] = useState(viewModes.LARGE);
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
const viewOptions = [
  { key: viewModes.LARGE, label: "Large Icons" },
  { key: viewModes.MEDIUM, label: "Medium Icons" },
  // { key: viewModes.SMALL, label: "Small Icons" },
  { key: viewModes.LIST, label: "List View" },
  { key: viewModes.DETAIL, label: "Detail View" }, // new
  // { key: viewModes.DETAILS, label: "Table View" },
];

  // Filter folders by search
  const filteredFolders = SFfolders.filter((folder) =>
    folder.Name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleOpenFolder = (folder) => {
    setFolderPath((prev) => [...prev, folder]);
    // Get form objects from recentForms using folder.FormIds__c
    const formIds = folder.FormIds ? folder.FormIds.split(",") : [];
    console.log('forms' , recentForms , folder)
    console.log(formIds)
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
    setSelectedFormIds(folder.FormIds.split(",") || []);
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
  const handleCopy = async (folder , selectedFolderId) => {
   if(!selectedFolderId) return;
    try {
        const userId = sessionStorage.getItem('userId');
        const instanceUrl = sessionStorage.getItem('instanceUrl');
        const payload = {
             folderId: folder.Id,
          folderName: folder.Name,
          description: folder.Description__c || '',
          parentFolderId: folder.Parent_Folder__c ? folder.Parent_Folder__c + ',' + selectedFolderId : selectedFolderId,
          formIds: folder.FormIds__c ,
          instanceUrl,
          userId
        }
        console.log(folder ,'Moving...');
      const response = await fetch('https://8rq1el4sv2.execute-api.us-east-1.amazonaws.com/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Response=>' , data)
      if (!response.ok) {
        throw new Error(data.error || 'Failed to move folder');
      }
      fetchSalesforceData(userId,instanceUrl);
    } catch (error) {
      console.error('Error moving folder:', error);
    } finally {
     
    }
  };
  const handleSaveFolder = async () => {
    await handleCreateFolder(
      folderName,
      selectedFormIds,
      folderDescription,
      currentFolder?.Id
    );
    setIsEditModalOpen(false);
  };
  const handleBulkDelete = async () => {
  try {
    const userId = sessionStorage.getItem("userId");
    const instanceUrl = sessionStorage.getItem("instanceUrl");
    const payload = {
      selectedFolderIds,
      instanceUrl,
      userId,
    };

    const response = await fetch(
      "https://8rq1el4sv2.execute-api.us-east-1.amazonaws.com/bulkFolder",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete folders");
    }

    setSelectedFolderIds([]);
    fetchSalesforceData(userId, instanceUrl);
  } catch (error) {
    console.error("Error deleting folders:", error);
  }
};

const handleBulkFavorite = async () => {
  try {
    const userId = sessionStorage.getItem("userId");
    const instanceUrl = sessionStorage.getItem("instanceUrl");
    const payload = {
      selectedFolderIds,
      instanceUrl,
      userId,
    };

    const response = await fetch(
      "https://8rq1el4sv2.execute-api.us-east-1.amazonaws.com/toggleFavorite",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to favorite folders");
    }

    setSelectedFolderIds([]);
    fetchSalesforceData(userId, instanceUrl);
  } catch (error) {
    console.error("Error favoriting folders:", error);
  }
};
  const folderTree = buildFolderTree(filteredFolders);
  const foldersToShow =
    folderPath.length > 0
      ? folderPath[folderPath.length - 1].children
      : folderTree;

  return (
    <div>
      <div
        className="px-10 py-6 shadow-sm relative"
        style={{ background: "linear-gradient(to right, #008AB0, #8FDCF1)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className=" "
        >
          <h1 className="text-3xl font-bold text-white mb-1">Folders</h1>
        </motion.div>
      </div>

      <motion.div
        className="p-10 bg-white h-[90vh] rounded-xl shadow-lg"
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
          <div className="flex w-full gap-4 justify-end items-center">
            {/* View Mode Dropdown */}
            <Dropdown
              menu={{
                items: viewOptions.map((opt) => ({
                  key: opt.key,
                  label: opt.label,
                  onClick: () => setViewMode(opt.key),
                })),
              }}
              placement="bottomLeft"
              trigger={["click"]}
            >
              <Button icon={<AppstoreOutlined />}>View</Button>
            </Dropdown>
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
        <div className="">
          {/* Loading & Empty States */}
          {isLoading ? (
            <div className="flex flex-col relative items-center justify-center rounded-xl p-8 text-center"
            style={{ height: '65vh'}}>
            <Loader text={"Fetching folders"} fullScreen={false}/>
            </div>
          ) : foldersToShow.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-xl p-8 text-center"
            >
              {/* Animated folder icon with floating effect */}
              <motion.div
                animate={{
                  y: [-5, 5, -5],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mb-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </motion.div>

              {/* Main message */}
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                No Folders Found
              </h3>
              <p className="text-gray-500 max-w-md mb-8">
                It looks like you don't have any folders yet. Create your first
                folder to get started.
              </p>

              {/* CTA button with hover animation */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setCurrentFolder(null);
                  setFolderName("");
                  setFolderDescription("");
                  setSelectedFormIds([]);
                  setIsEditModalOpen(true);
                }}
                className="flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                Create New Folder
              </motion.button>

              {/* Optional decorative elements */}
              <div className="mt-12 grid grid-cols-3 gap-4 opacity-30">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.3, scale: 1 }}
                    transition={{ delay: item * 0.1 }}
                    className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : viewMode === viewModes.LIST ? (
            <FolderList folders={foldersToShow} onFolderClick={handleOpenFolder} onEdit={handleEditFolder} onCopy={handleCopy} />
          ) : viewMode === viewModes.DETAIL ? (
            <FolderDetail folders={foldersToShow} onFolderClick={handleOpenFolder} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                  selectedFolderIds={selectedFolderIds}
                  setSelectedFolderIds={setSelectedFolderIds}
                />
              ))}
            </div>
          )}
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
        {selectedFolderIds.length > 0 && (
  <motion.div
    className="login-button fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white  px-8 py-6 shadow-lg flex items-center gap-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    style={{
      border: "1px solid rgba(255, 255, 255, 0.9)",
      boxShadow:
        "0px 2px 25px rgba(0, 0, 0, 0.25), 0px 4px 8px -1px rgba(0, 0, 0, 0.08)",
      backdropFilter: "blur(5px)",
      width: "373px",
      height: "40px",
      boxSizing: "border-box",
    }}
  >
    <span>{selectedFolderIds.length} folder(s) selected</span>
    <button
      onClick={handleBulkDelete}
      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
    >
      Delete
    </button>
    <button
      onClick={handleBulkFavorite}
      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
    >
      Favorite
    </button>
  </motion.div>
)}
      </motion.div>
    </div>
  );
};

export default FolderManager;