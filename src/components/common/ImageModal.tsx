'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageModalProps {
  url: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ url, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="relative max-w-5xl max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <img
            src={url}
            alt="صورة كاملة الحجم"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-xl"
            loading="lazy"
          />
          <motion.button
            className="absolute top-4 right-4 px-3 py-1 bg-white text-black rounded-md hover:bg-gray-200 transition-colors duration-200 shadow-md"
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            إغلاق
          </motion.button>
          <motion.a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 left-4 px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-200 shadow-md"
            onClick={(e) => e.stopPropagation()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            فتح في صفحة جديدة
          </motion.a>
          
          {/* أزرار التكبير والتصغير */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 rtl:space-x-reverse">
            <motion.button
              className="p-2 bg-white bg-opacity-70 rounded-full hover:bg-opacity-100 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="تصغير"
              onClick={(e) => {
                e.stopPropagation();
                const img = e.currentTarget.parentElement?.previousElementSibling as HTMLImageElement;
                if (img) {
                  img.style.transform = 'scale(0.8)';
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </motion.button>
            <motion.button
              className="p-2 bg-white bg-opacity-70 rounded-full hover:bg-opacity-100 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="إعادة الحجم"
              onClick={(e) => {
                e.stopPropagation();
                const img = e.currentTarget.parentElement?.previousElementSibling as HTMLImageElement;
                if (img) {
                  img.style.transform = 'scale(1)';
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </motion.button>
            <motion.button
              className="p-2 bg-white bg-opacity-70 rounded-full hover:bg-opacity-100 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="تكبير"
              onClick={(e) => {
                e.stopPropagation();
                const img = e.currentTarget.parentElement?.previousElementSibling as HTMLImageElement;
                if (img) {
                  img.style.transform = 'scale(1.5)';
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageModal; 