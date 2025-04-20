'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
// import { useTranslations } from 'next-intl';
import { ProjectMember, User } from '@/lib/supabase/schema';

interface ManageSupervisorsModalProps {
  show: boolean;
  onClose: () => void;
  supervisors: (ProjectMember & { user: User })[];
  userRole: string | null;
  onRemove: (memberId: string) => void;
  isProcessing: boolean;
}

export default function ManageSupervisorsModal({
  show,
  onClose,
  supervisors,
  userRole,
  onRemove,
  isProcessing
}: ManageSupervisorsModalProps) {
  // const t = useTranslations('project');

  // تحسين عرض صورة المستخدم باستخدام Cloudinary
  const getOptimizedAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return null;
    
    // إذا كانت الصورة من Cloudinary، قم بإضافة معلمات التحسين
    if (avatarUrl.includes('cloudinary.com')) {
      // تحقق من وجود معلمات التحويل
      if (avatarUrl.includes('/upload/')) {
        // إضافة معلمات التحويل للحصول على صورة محسنة (حجم أصغر وجودة أفضل)
        return avatarUrl.replace('/upload/', '/upload/c_fill,g_face,w_100,h_100,q_auto/');
      }
    }
    
    return avatarUrl;
  };

  const modalAnimation = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div 
            className="bg-white rounded-lg max-w-md w-full p-6"
            variants={modalAnimation}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <h2 className="text-xl font-bold mb-6 rtl">إدارة المشرفين</h2>
            <div className="max-h-96 overflow-y-auto space-y-4">
              {supervisors.map(sup => (
                <div key={sup.id} className="flex items-center justify-between p-2 border-b border-gray-100">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200">
                      {sup.user.avatar_url ? (
                        <img 
                          src={getOptimizedAvatarUrl(sup.user.avatar_url)} 
                          alt={sup.user.full_name} 
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // في حالة فشل تحميل الصورة، عرض الحرف الأول من اسم المستخدم
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement.innerHTML = `
                              <div class="h-full w-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                                ${sup.user.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                          {sup.user.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="rtl">
                      <h3 className="font-medium text-gray-900">{sup.user.full_name}</h3>
                      <p className="text-sm text-gray-500">{sup.user.email}</p>
                    </div>
                  </div>
                  {userRole === 'owner' && (
                    <button
                      onClick={() => onRemove(sup.id)}
                      className="text-red-600 hover:text-red-800"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          جاري المعالجة...
                        </span>
                      ) : (
                        "إلغاء الدور"
                      )}
                    </button>
                  )}
                </div>
              ))}
              {supervisors.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-500">لا يوجد مشرفين حالياً</p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
