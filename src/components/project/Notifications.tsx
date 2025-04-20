'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface NotificationsProps {
  successMessage: string | null;
  errorMessage: string | null;
  notificationImage?: string | null; // إضافة خاصية لصورة الإشعار
}

export default function Notifications({ 
  successMessage, 
  errorMessage,
  notificationImage 
}: NotificationsProps) {
  
  // تحسين عرض صورة الإشعار باستخدام Cloudinary
  const getOptimizedNotificationImage = (imageUrl: string | null | undefined) => {
    if (!imageUrl) return null;
    
    // إذا كانت الصورة من Cloudinary، قم بإضافة معلمات التحسين
    if (imageUrl.includes('cloudinary.com')) {
      // تحقق من وجود معلمات التحويل
      if (imageUrl.includes('/upload/')) {
        // إضافة معلمات التحويل للحصول على صورة محسنة (حجم أصغر وجودة أفضل)
        return imageUrl.replace('/upload/', '/upload/c_fill,w_30,h_30,q_auto/');
      }
    }
    
    return imageUrl;
  };

  return (
    <>
      <AnimatePresence>
        {successMessage && (
          <motion.div
            className="fixed bottom-4 left-4 bg-green-500 text-white py-2 px-4 rounded-md shadow-lg flex items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {notificationImage && (
              <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                <img 
                  src={getOptimizedNotificationImage(notificationImage)} 
                  alt="إشعار"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // في حالة فشل تحميل الصورة، إخفاء العنصر
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            className="fixed bottom-4 left-4 bg-red-500 text-white py-2 px-4 rounded-md shadow-lg flex items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
