import React, { useState } from "react";
import { motion } from "framer-motion";
import {  BsThreeDotsVertical } from "react-icons/bs";
// Example SVG icons; you could replace these with an icon library like react-icons
const FolderIcon = () => (
  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M3 7V5a2 2 0 012-2h3l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

const DragDotsIcon = () => (
  // Six dots arranged in two columns, for drag handle
 <svg width="9" height="14" viewBox="0 0 9 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M3 1.55556C3 2.41465 2.32841 3.11111 1.5 3.11111C0.671587 3.11111 0 2.41465 0 1.55556C0 0.696446 0.671587 0 1.5 0C2.32841 0 3 0.696446 3 1.55556ZM1.5 8.55556C2.32841 8.55556 3 7.85909 3 7C3 6.14091 2.32841 5.44444 1.5 5.44444C0.671587 5.44444 0 6.14091 0 7C0 7.85909 0.671587 8.55556 1.5 8.55556ZM1.5 14C2.32841 14 3 13.3035 3 12.4444C3 11.5854 2.32841 10.8889 1.5 10.8889C0.671587 10.8889 0 11.5854 0 12.4444C0 13.3035 0.671587 14 1.5 14Z" fill="#5F6165"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M9 1.55556C9 2.41465 8.32841 3.11111 7.5 3.11111C6.67159 3.11111 6 2.41465 6 1.55556C6 0.696446 6.67159 0 7.5 0C8.32841 0 9 0.696446 9 1.55556ZM7.5 8.55556C8.32841 8.55556 9 7.85909 9 7C9 6.14091 8.32841 5.44444 7.5 5.44444C6.67159 5.44444 6 6.14091 6 7C6 7.85909 6.67159 8.55556 7.5 8.55556ZM7.5 14C8.32841 14 9 13.3035 9 12.4444C9 11.5854 8.32841 10.8889 7.5 10.8889C6.67159 10.8889 6 11.5854 6 12.4444C6 13.3035 6.67159 14 7.5 14Z" fill="#5F6165"/>
</svg>
);

function FieldsetTab({ fieldsets }) {
  const [draggedFieldset, setDraggedFieldset] = useState(null);

  const handleDragStart = (fieldset) => {
    setDraggedFieldset(fieldset);
    window.draggedFieldset = fieldset;
  };

  const handleDragEnd = () => {
    setDraggedFieldset(null);
    window.draggedFieldset = null;
  };

  return (
    <div className="fieldset-tab mx-auto">
      <div className="fieldset-list space-y-3">
        {fieldsets.map((fieldset) => (
          <motion.div
            key={fieldset.Id}
            className="fieldset-item flex items-center bg-white p-4 w-full rounded-lg shadow hover:shadow-lg transition cursor-grab border border-gray-100"
            draggable
            onDragStart={() => handleDragStart(fieldset)}
            onDragEnd={handleDragEnd}
            whileHover={{ scale: 1.02 }}
          >
            {/* Left Icon */}
            <div className="mr-4 flex-shrink-0">
              <FolderIcon />
            </div>
            {/* Fieldset Info */}
            <div className="flex-1">
              <h4 className="text-sm text-gray-800">{fieldset.Name}</h4>
              <p className="text-sm text-gray-500">{fieldset.Description__c}</p>
            </div>
            {/* Right Drag Handle */}
            <div className="ml-4 cursor-grab flex-shrink-0">
              <DragDotsIcon />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default FieldsetTab;