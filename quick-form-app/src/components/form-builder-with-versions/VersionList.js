import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "antd";
import "./formbuilder.css";

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 20 }
  },
  exit: { opacity: 0, y: -10, scale: 0.98,  transition: { duration: 0.5 } }
};

export default function VersionList({
  visible,
  versions,
  selectedVersionId,
  onChange,
  onClose
}) {
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, onClose]);
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={dropdownRef}
          className="version-dropdown-list"
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: "absolute",
            top: 44, // aligns just below the stack icon
            left: 0, // aligns left with the icon
            minWidth: 220,
            maxWidth: 260,
            zIndex: 100,
            background: "#fff",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            borderRadius: 6,
            padding: "5px"
          }}
        >
          {versions.map((version) => (
            <div
              key={version.Id}
              className="version-dropdown-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 16px",
                cursor: "pointer",
                borderRadius: 6,
                background: selectedVersionId === version.Id
                  ? "linear-gradient(90deg, rgba(0, 138, 176, 0.2) 30%, rgba(143, 220, 241, 0.2) 100%)"
                  : "transparent",
                color: "black"
              }}
              onClick={() => {
                onChange(version.Id);
                onClose();
              }}
            >
              <span style={{
                fontWeight: 500,
                color: "black"
              }}>
                Version {version.Version__c}
              </span>
              <Tag
                className={version.Stage__c.toLowerCase()}
                style={{
                  marginLeft: 4,
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none"
                }}
              >
                {version.Stage__c}
              </Tag>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}