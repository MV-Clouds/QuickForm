import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const folderSvg = (
  <svg
    width="57"
    height="56"
    viewBox="0 0 57 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21.3423 6.85536C20.6079 5.87611 19.4552 5.2998 18.2312 5.2998H4.38889C2.24112 5.2998 0.5 7.04091 0.5 9.18869V46.8163C0.5 48.964 2.24112 50.7052 4.38889 50.7052H52.6111C54.7589 50.7052 56.5 48.964 56.5 46.8163V18.2698C56.5 16.1221 54.7589 14.3809 52.6111 14.3809H28.9309C27.7068 14.3809 26.5543 13.8046 25.8198 12.8253L21.3423 6.85536Z"
      fill="url(#paint0_linear_2250_2975)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_2250_2975"
        x1="28.5"
        y1="5.2998"
        x2="28.5"
        y2="50.7052"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFDC78" />
        <stop offset="1" stopColor="#FBBC1A" />
      </linearGradient>
    </defs>
  </svg>
);

const FolderCard = ({
  folder,
  onEdit,
  onDelete,
  onMove,
  allFolders,
  token,
  userId,
  instanceUrl,
  refreshData,
  onCopy,
  onClick,
  selectedFolderIds,
  setSelectedFolderIds,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const formCount = Array.isArray(folder.FormIds__c)
    ? folder.FormIds__c.length
    : typeof folder.FormIds__c === "string" && folder.FormIds__c
    ? folder.FormIds__c.split(",").filter(Boolean).length
    : 0;

  const getIconSize = (mode) => {
    switch (mode) {
      case "large":
        return "w-16 h-16";
      case "medium":
        return "w-12 h-12";
      case "small":
        return "w-8 h-8";
      default:
        return "w-12 h-12";
    }
  };
  const handleDelete = async () => {
    setIsDeleting(true);
    const userId = sessionStorage.getItem("userId");
    const instanceUrl = sessionStorage.getItem("instanceUrl");
    try {
      const response = await fetch(
        "https://8rq1el4sv2.execute-api.us-east-1.amazonaws.com/folder?folderId=" +
          folder.Id +
          "&userId=" +
          userId +
          "&instanceUrl=" +
          instanceUrl,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete folder");
      }
      refreshData(userId, instanceUrl);
    } catch (error) {
      console.error("Error deleting folder:", error);
    } finally {
      setIsDeleting(false);
      setIsMenuOpen(false);
    }
  };

  const handleMove = async () => {
    if (!selectedFolderId) return;

    setIsMoving(true);
    try {
      const userId = sessionStorage.getItem("userId");
      const instanceUrl = sessionStorage.getItem("instanceUrl");
      const payload = {
        folderId: folder.Id,
        folderName: folder.Name,
        description: folder.Description__c || "",
        parentFolderId: folder.Parent_Folder__c
          ? folder.Parent_Folder__c + "," + selectedFolderId
          : selectedFolderId,
        formIds: folder.FormIds__c,
        instanceUrl,
        userId,
      };
      console.log(folder, "Moving...");
      const response = await fetch(
        "https://8rq1el4sv2.execute-api.us-east-1.amazonaws.com/folder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      console.log("Response=>", data);
      if (!response.ok) {
        throw new Error(data.error || "Failed to move folder");
      }
      refreshData(userId, instanceUrl);
    } catch (error) {
      console.error("Error moving folder:", error);
    } finally {
      setIsMoving(false);
      setIsMoveModalOpen(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <motion.div
      className="relative bg-white rounded-lg shadow-lg p-4 flex items-center group hover:shadow-xl transition-shadow duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="flex relative group">
        <input
          type="checkbox"
          className={`absolute top-2 left-2 w-5 h-5  ${selectedFolderId === folder.Id ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'} transition-opacity duration-200 cursor-pointer`}
          checked={selectedFolderIds.includes(folder.Id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedFolderIds((prev) => [...prev, folder.Id]);
            } else {
              setSelectedFolderIds((prev) =>
                prev.filter((id) => id !== folder.Id)
              );
            }
          }}
        />
        <div className="mr-4 flex-shrink-0">{folderSvg}</div>
        <div className="flex-1 cursor-pointer" onClick={onClick}>
          <div className="font-semibold text-lg">{folder.Name}</div>
          <div className="text-sm text-gray-500">
            {formCount > 0 ? `+${formCount} items` : "+0 items"}
          </div>
          {folder.Description__c && (
            <div className="text-xs text-gray-400 mt-1">
              {folder.Description__c}
            </div>
          )}
        </div>
      </div>
      <div className="ml-2 relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
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
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    onEdit(folder);
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    console.log("folder moving", folder);
                    setIsMoveModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Make a Copy
                </button>
                <button
                  onClick={() => {
                    if (onCopy) onCopy(folder);
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Move a Folder
                </button>
                <button
                  onClick={() => handleDelete(folder)}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Move to Folder Modal */}
        <AnimatePresence>
          {isMoveModalOpen && (
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
              >
                <h3 className="text-lg font-medium mb-4">Move Folder</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select a destination folder:
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {allFolders
                    .filter((f) => f.Id !== folder.Id)
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
                    onClick={handleMove}
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
    </motion.div>
  );
};

export default FolderCard;
