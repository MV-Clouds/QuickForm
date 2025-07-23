import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Folder, Star, Layers, Trash2, Settings, ChevronLeft, ChevronRight, User, Settings2 } from 'lucide-react';
const navOptions = [
  { label: 'Home', icon: <Home size={20} />, key: 'home' },
  { label: 'Folders', icon: <Folder size={20} />, key: 'folders' },
  { label: 'Favourite', icon: <Star size={20} />, key: 'favourite' },
  { label: 'Fieldset', icon: <Layers size={20} />, key: 'fieldset' },
  { label: 'Integrations', icon: <Settings2 size={20} />, key: 'integration' },
  { label: 'Bin', icon: <Trash2 size={20} />, key: 'bin' },
];

const Sidebar = ({ username = 'Jane Cooper', selected = 'home', open, setOpen, onSelect }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: -260, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -260, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-40 flex flex-col justify-between border-r border-gray-200"
        >
          <div>
            {/* Logo */}
            <div className="flex items-center px-6 py-6 border-b border-gray-100">
              <img src={'/quickform-logo.png'} alt="Quick Form" className="h-10 w-12" />
              <span className="">
              <img src={'images/quickformtext.png'} alt="Quick Form"  />
              </span>
            </div>
            {/* Nav */}
            <nav className="mt-6 flex flex-col gap-1">
              {navOptions.map(opt => (
                <button
                  key={opt.key}
                  className={`flex items-center gap-3 px-6 py-3 text-base font-medium rounded-lg transition-colors duration-200 ${selected === opt.key ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-100'}`}
                  onClick={() => onSelect && onSelect(opt.key)}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="flex flex-col gap-2 pb-4">
            <button className="flex items-center gap-3 px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-base font-medium">
              <Settings size={20} />
              <span>Settings</span>
            </button>
            <div className="flex items-center gap-3 px-6 py-2 text-gray-700 font-semibold">
              <User size={20} />
              <span>{username}</span>
            </div>
            <button
              className="absolute -right-4 bottom-8 bg-white border border-gray-200 shadow-lg rounded-full p-1 hover:bg-blue-50 transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
        </motion.aside>
      )}
      {!open && (
        <motion.button
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          className="fixed left-0 bottom-8 z-50 bg-white border border-gray-200 shadow-lg rounded-full p-1 hover:bg-blue-50"
          onClick={() => setOpen(true)}
          aria-label="Expand sidebar"
        >
          <ChevronRight size={24} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default Sidebar; 