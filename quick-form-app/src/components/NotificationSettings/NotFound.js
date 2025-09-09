import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EmptyNotifications = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const iconVariants = {
    idle: {
      rotate: 0,
      scale: 1,
      transition: { duration: 0.3 }
    },
    hover: {
      rotate: [0, -10, 10, -5, 0],
      scale: 1.05,
      transition: {
        rotate: {
          duration: 0.8,
          ease: "easeInOut"
        },
        scale: {
          duration: 0.3
        }
      }
    },
    refresh: {
      rotate: 360,
      transition: {
        rotate: {
          duration: 1,
          ease: "linear",
          repeat: Infinity
        }
      }
    }
  };

  const buttonVariants = {
    idle: {
      scale: 1,
      backgroundColor: "#3b82f6",
      transition: { duration: 0.3 }
    },
    hover: {
      scale: 1.02,
      backgroundColor: "#2563eb",
      transition: { duration: 0.2 }
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  return (
    <div className=" bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <div className="text-center">
          {/* Animated Bell Icon */}
          <motion.div
            className="mb-6"
            variants={itemVariants}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            <motion.div
              className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto"
              animate={isRefreshing ? "refresh" : isHovered ? "hover" : "idle"}
              variants={iconVariants}
            >
              <svg
                className="w-10 h-10 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            className="text-2xl font-bold text-gray-800 mb-3"
            variants={itemVariants}
          >
            No Notifications
          </motion.h2>

          {/* Description */}
          <motion.p
            className="text-gray-600 mb-6 leading-relaxed"
            variants={itemVariants}
          >
            You're all caught up! There are no new notifications at the moment.
            We'll let you know when something important comes up.
          </motion.p>

          {/* Refresh Button */}
          <motion.div variants={itemVariants}>
            <motion.button
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={handleRefresh}
              disabled={isRefreshing}
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              animate={isRefreshing ? "refresh" : "idle"}
            >
              <AnimatePresence mode="wait">
                {isRefreshing ? (
                  <motion.svg
                    key="spinner"
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    initial={{ opacity: 0, rotate: -180 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 180 }}
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="refresh"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    initial={{ opacity: 0, rotate: 180 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -180 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
              {isRefreshing ? 'Checking...' : 'Check for Notifications'}
            </motion.button>
          </motion.div>

          {/* Additional Info */}
          <motion.p
            className="text-sm text-gray-500 mt-4"
            variants={itemVariants}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Last checked: Just now
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default EmptyNotifications;