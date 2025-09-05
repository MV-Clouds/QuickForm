import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PopupMenu from "./PopupMenu";

const FloatingAddButton = ({ onAddNode, reactFlowWrapper, nodes }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Calculate center position of the canvas
  useEffect(() => {
    const updatePosition = () => {
      if (reactFlowWrapper && reactFlowWrapper.current) {
        const rect = reactFlowWrapper.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        setPosition({
          x: centerX - 24,
          y: centerY - 24
        });
      }
    };

    // Initial position calculation
    updatePosition();

    // Update position on window resize
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [reactFlowWrapper]);

  const handleNodeSelect = (category, node) => {
    onAddNode(category, node);
    setIsMenuOpen(false);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  // Don't show the button if there are nodes in the canvas
  if (nodes && nodes.length > 0) {
    return null;
  }

  return (
    <>
      {/* Floating Add Button */}
      <motion.button
        className="absolute z-10 p-4 bg-white rounded-xl shadow border-3 border-gray-500 flex items-center justify-center"
        style={{ left: position.x, top: position.y }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <div className="w-8 h-8 rounded-full border border-gray-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>

        </div>
      </motion.button>

      {/* Popup Menu */}
      {isMenuOpen && (
        <PopupMenu
          triggerPosition={position}
          onClose={handleCloseMenu}
          onSelectNode={handleNodeSelect}
        />
      )}
    </>
  );
};

export default FloatingAddButton;