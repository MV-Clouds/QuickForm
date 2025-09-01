import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PopupMenu = ({ triggerPosition, onClose, onSelectNode }) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const firstMenuRef = useRef(null);
  const secondMenuRef = useRef(null);
  
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
      nodes: ["Create/Update", "Find"]
    },
    {
      name: "utility",
      label: "Utilities",
      color: "from-green-500 to-green-600",
      nodes: ["Formatter", "Filter", "Path", "Loop"]
    },
    {
      name: "integration",
      label: "Google Sheets",
      color: "from-purple-500 to-purple-600",
      nodes: ["Google Sheet", "FindGoogleSheet"]
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
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Node</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <motion.div
                key={category.name}
                onClick={() => handleCategorySelect(category.name)}
                className={`p-2 bg-gradient-to-r ${category.color} text-white rounded-md cursor-pointer text-sm flex items-center justify-between ${activeCategory === category.name ? 'ring-2 ring-white ring-opacity-50' : ''}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{category.label}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            ))}
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
            <div className="flex items-center mb-3">
              <button 
                onClick={() => setActiveCategory(null)}
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <h3 className="text-sm font-semibold text-gray-700">
                {categories.find(c => c.name === activeCategory)?.label}
              </h3>
            </div>
            <div className="space-y-2">
              {categories
                .find(c => c.name === activeCategory)
                ?.nodes.map((node) => (
                  <motion.div
                    key={node}
                    onClick={() => handleNodeSelect(activeCategory, node)}
                    className={`p-2 bg-gradient-to-r ${categories.find(c => c.name === activeCategory)?.color} text-white rounded-md cursor-pointer text-sm`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {node}
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