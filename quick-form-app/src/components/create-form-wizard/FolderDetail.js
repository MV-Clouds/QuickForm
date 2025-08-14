// src/components/FolderDetail.jsx
import React , {useState}from "react";
import { motion, AnimatePresence } from "framer-motion";

const folderIconSmall = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-yellow-500 flex-shrink-0"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6.5a3.5 3.5 0 01-3.5 3.5h-11A2.5 2.5 0 012 13.5V6z" />
  </svg>
);

const FolderDetail = ({ folders = [], onFolderClick }) => {
    
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-100 font-semibold text-sm text-gray-600 border-b border-gray-200">
        <div className="col-span-4 flex items-center gap-2">Name</div>
        <div className="col-span-4">Description</div>
        <div className="col-span-2 text-right">Last Modified</div>
        <div className="col-span-2 text-center">Items</div>
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
              className="grid grid-cols-12 gap-4 px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100"
            >
              <div className="col-span-4 flex items-center gap-2">
                {folderIconSmall}
                <span className="truncate">{folder?.Name || "Unnamed"}</span>
              </div>
              <div className="col-span-4 text-gray-600 truncate">
                {folder?.Description__c || "No description"}
              </div>
              <div className="col-span-2 text-right text-gray-500 text-xs">
                {folder?.LastModifiedDate
                  ? new Date(folder.LastModifiedDate).toLocaleString()
                  : "N/A"}
              </div>
              <div className="col-span-2 text-center text-gray-500">
                {formCount}
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
    </div>
  );
};

export default FolderDetail;
