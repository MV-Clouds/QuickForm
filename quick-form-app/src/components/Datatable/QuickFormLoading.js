import React from 'react';
import { motion } from 'framer-motion';
import Loader from '../Loader'
const QuickFormLoader = () => {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center"
      >
        <Loader text="Loading QuickForm Form Builder..."/>
      </motion.div>
    </div>  
  );
};

export default QuickFormLoader;