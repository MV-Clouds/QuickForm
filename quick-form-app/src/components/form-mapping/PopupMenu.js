import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSalesforceData } from '../Context/MetadataContext';

const PopupMenu = ({ triggerPosition, onClose, onSelectNode }) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const firstMenuRef = useRef(null);
  const secondMenuRef = useRef(null);
  const { googleData } = useSalesforceData();

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideFirstMenu = firstMenuRef.current && !firstMenuRef.current.contains(event.target);
      const clickedOutsideSecondMenu = secondMenuRef.current && !secondMenuRef.current.contains(event.target);

      if (clickedOutsideFirstMenu && clickedOutsideSecondMenu) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const categories = [
    {
      name: "salesforce",
      label: "Salesforce",
      color: "from-blue-500 to-blue-600",
      nodes: ["Create/Update", "Find"],
      icon: "/mappingicons/salesforce.png",
      classes: "w-5 h-5"
    },
    {
      name: "utility",
      label: "Utilities",
      color: "from-green-500 to-green-600",
      nodes: [
        { name: "Formatter", icon: "/mappingicons/formattericon.png" },
        { name: "Filter", icon: "/mappingicons/filter.png" },
        { name: "Path", icon: "/mappingicons/pathicon.png" },
        { name: "Loop", icon: "/mappingicons/loopicon.png" }
      ],
      icon: "/mappingicons/normaltools.png",
      classes: "w-4 h-4"
    },
    {
      name: "integration",
      label: "Google Sheets",
      color: "from-purple-500 to-purple-600",
      nodes: ["Google Sheet", "FindGoogleSheet"],
      icon: "/mappingicons/googlesheet.png",
      classes: "w-4 h-4"
    }
  ];

  const handleNodeSelect = (category, node) => {
    onSelectNode(category, node);
    onClose();
  };

  const handleCategorySelect = (category) => {
    setActiveCategory(category);
  };

  return (
    <>
      {/* Main Category Popup - Always visible */}
      <AnimatePresence>
        <motion.div
          ref={firstMenuRef}
          className="absolute z-20 bg-white rounded-lg shadow-xl p-4 w-48"
          style={{ left: triggerPosition.x + 80, top: triggerPosition.y }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="space-y-2">
            {categories.map((category) => {
              const isIntegrationDisabled = category.name === 'integration' && !googleData;
              const baseClasses = `p-1 text-black rounded-md text-sm flex items-center justify-between`;
              const enabledRing = activeCategory === category.name ? ' ring-2 ring-white ring-opacity-50' : '';
              const cursorClass = isIntegrationDisabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer';
              return (
                <motion.div
                  key={category.name}
                  onClick={() => { if (!isIntegrationDisabled) handleCategorySelect(category.name); }}
                  className={baseClasses + cursorClass + enabledRing}
                  whileHover={isIntegrationDisabled ? {} : { scale: 1.02 }}
                  whileTap={isIntegrationDisabled ? {} : { scale: 0.98 }}
                  title={isIntegrationDisabled ? 'Google Sheets is not integrated yet.' : undefined}
                  aria-disabled={isIntegrationDisabled}
                >
                  <span className="flex items-center gap-2">
                    <img src={category.icon} alt="" className={category.classes} />
                    {category.label}
                  </span>

                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Node Selection Popup - Only visible when a category is selected */}
      <AnimatePresence>
        {activeCategory && (
          <motion.div
            ref={secondMenuRef}
            className="absolute z-30 bg-white rounded-lg shadow-xl p-4 w-48"
            style={{ left: triggerPosition.x + 280, top: triggerPosition.y + 50 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-2">
              {categories
                .find(c => c.name === activeCategory)
                ?.nodes.map((node) => (
                  <motion.div
                    key={typeof node === "string" ? node : node.name}
                    onClick={() => handleNodeSelect(activeCategory, typeof node === "string" ? node : node.name)}
                    className="p-1 text-black rounded-md cursor-pointer text-sm flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <img
                      src={
                        typeof node === "string"
                          ? categories.find(c => c.name === activeCategory).icon
                          : node.icon
                      }
                      alt=""
                      className={typeof node === "string"
                        ? categories.find(c => c.name === activeCategory).classes
                        : node.classes || "w-4 h-4"}
                    />
                    {typeof node === "string" ? node : node.name}
                  </motion.div>
                ))}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PopupMenu;
