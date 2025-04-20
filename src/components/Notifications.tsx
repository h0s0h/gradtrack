'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationsProps {
  successMessage: string | null;
  errorMessage: string | null;
}

const Notifications: React.FC<NotificationsProps> = ({ successMessage, errorMessage }) => {
  return (
    <AnimatePresence>
      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }}
          className="bg-red-50 text-red-700 p-4 rounded-md mb-6 flex justify-between items-center"
        >
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errorMessage}
          </div>
        </motion.div>
      )}

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }}
          className="bg-green-50 text-green-700 p-4 rounded-md mb-6 flex justify-between items-center"
        >
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notifications; 