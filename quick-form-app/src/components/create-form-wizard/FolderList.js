
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Small folder icon
const smallFolderIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-yellow-500 flex-shrink-0"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6.5a3.5 3.5 0 01-3.5 3.5h-11A2.5 2.5 0 012 13.5V6z" />
  </svg>
);

const FolderList = ({
  folders = [],
  onFolderClick,
  onEdit,
  onCopy,
  handleDelete,
  handleMove,
  allFolders
}) => {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [folderToMove, setFolderToMove] = useState(null);
  const [isMoving, setIsMoving] = useState(false);

  const openMenu = (folderId, e) => {
    e.stopPropagation();
    setMenuOpenId((prev) => (prev === folderId ? null : folderId));
  };

  const openMoveModal = (folder, e) => {
    e.stopPropagation();
    setFolderToMove(folder);
    setIsMoveModalOpen(true);
    setMenuOpenId(null);
  };

  const executeMove = () => {
    if (!folderToMove || !selectedFolderId) return;
    handleMove(folderToMove, selectedFolderId, setIsMoveModalOpen, setIsMoving);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-2 bg-gray-100 font-semibold text-sm text-gray-600">
        <div className="w-8"></div>
        <div className="flex-1">Name</div>
        <div className="text-center w-28">Type</div>
        <div className="w-48 text-right">Last Modified</div>
        <div className="w-8"></div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {folders.map((folder) => {
          const formCount = Array.isArray(folder.FormIds__c)
            ? folder.FormIds__c.length
            : typeof folder.FormIds__c === "string" && folder.FormIds__c
            ? folder.FormIds__c.split(",").filter(Boolean).length
            : 0;

          return (
            <motion.div
              key={folder.Id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onClick={() => onFolderClick && onFolderClick(folder)}
              className="flex items-center px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b last:border-b-0 relative group"
            >
              <div className="w-8">{smallFolderIcon}</div>
              <div className="flex-1 truncate">{folder?.Name || "Unnamed"}</div>
              <div className="">{folder?.Type || "File Folder"}</div>
              <div className="w-48 text-right text-gray-500 text-xs">
                {folder?.LastModifiedDate
                  ? new Date(folder.LastModifiedDate).toLocaleString()
                  : "N/A"}
              </div>

              {/* three dots menu */}
              <div className="flex-shrink-0">
                <button
                  onClick={(e) => openMenu(folder.Id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-full hover:bg-gray-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <circle cx="4" cy="10" r="2" />
                    <circle cx="10" cy="10" r="2" />
                    <circle cx="16" cy="10" r="2" />
                  </svg>
                </button>

                <AnimatePresence>
                  {menuOpenId === folder.Id && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-4 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-1">
                        <button
                          onClick={() => {
                            onEdit(folder);
                            setMenuOpenId(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => openMoveModal(folder, e)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Make a Copy
                        </button>
                        <button
                          onClick={() => {
                            if (onCopy) onCopy(folder, selectedFolderId);
                            setMenuOpenId(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Move a Folder
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(folder);
                            setMenuOpenId(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}

        {folders.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-6 text-center text-gray-500 text-sm"
          >
            No folders found
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Folder Modal */}
      <AnimatePresence>
        {isMoveModalOpen && folderToMove && (
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
              className="bg-white rounded-lg p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium mb-4">Move Folder</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select a destination folder:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allFolders
                  .filter((f) => f.Id !== folderToMove.Id)
                  .map((f) => (
                    <div
                      key={f.Id}
                      onClick={() => setSelectedFolderId(f.Id)}
                      className={`p-3 border rounded cursor-pointer ${
                        selectedFolderId === f.Id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="font-medium">{f.Name}</div>
                      {f.Description__c && (
                        <div className="text-sm text-gray-500">
                          {f.Description__c}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setIsMoveModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={executeMove}
                  disabled={!selectedFolderId || isMoving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isMoving ? "Moving..." : "Move Folder"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FolderList;