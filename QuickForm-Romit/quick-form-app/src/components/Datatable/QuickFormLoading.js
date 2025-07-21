import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

const QuickFormLoader = () => {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="bg-white rounded-full shadow-lg p-6 mb-6 border-2 border-blue-200"
        >
          <FileText className="text-blue-500" size={48} />
        </motion.div>
        <motion.div
          className="w-48 h-2 bg-blue-100 rounded-full overflow-hidden mb-4"
          initial={{ width: 0 }}
          animate={{ width: '12rem' }}
          transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          <motion.div
            className="h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
            initial={{ width: '20%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
        </motion.div>
        <motion.p
          className="text-lg font-semibold text-blue-700 mt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Loading QuickForm Form Builder...
        </motion.p>
        <motion.p
          className="text-sm text-blue-400 mt-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Please wait while we prepare your workspace.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default QuickFormLoader;