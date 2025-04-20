'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Edit2, Trash2 } from 'lucide-react';

interface ProjectHeaderProps {
  projectName: string;
  projectId: string;
  userRole: string | null;
  showSupervisorMenu: boolean;
  onToggleSupervisorMenu: () => void;
  onAddSupervisor: () => void;
  onManageSupervisors: () => void;
  supervisorMenuRef: React.RefObject<HTMLDivElement>;
  projectImage?: string | null; // إضافة خاصية لصورة المشروع
}

export default function ProjectHeader({
  projectName,
  projectId,
  userRole,
  showSupervisorMenu,
  onToggleSupervisorMenu,
  onAddSupervisor,
  onManageSupervisors,
  supervisorMenuRef,
  projectImage
}: ProjectHeaderProps) {
  // تحسين عرض صورة المشروع باستخدام Cloudinary
  const getOptimizedProjectImage = (imageUrl: string | null | undefined) => {
    if (!imageUrl) return null;
    
    if (imageUrl.includes('cloudinary.com')) {
      if (imageUrl.includes('/upload/')) {
        return imageUrl.replace('/upload/', '/upload/c_fill,w_1920,h_400,q_auto/');
      }
    }
    return imageUrl;
  };

  return (
    <motion.header 
      className="bg-white shadow-sm"
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      {/* Project Cover Image or Placeholder */}
      <div className="relative w-full h-[300px] overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600">
        {projectImage ? (
          <>
            <img 
              src={getOptimizedProjectImage(projectImage) || ''}
              alt={projectName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mx-auto h-24 w-24 mb-4 opacity-80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <div className="text-xl font-medium opacity-90">
                {projectName}
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
          </div>
        )}
      </div>

      {/* Header Content */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center relative">
          <div className="flex items-center">
            <motion.div whileHover={{ x: -5 }} whileTap={{ scale: 0.9 }}>
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 ml-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
            </motion.div>
            
            <motion.div 
              className="flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-2xl font-bold text-gray-800">{projectName}</h1>
            </motion.div>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* أزرار التعديل والحذف - تظهر فقط للمالك */}
            {userRole === 'owner' && (
              <div className="flex items-center ml-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }}
                  className="ml-2"
                >
                  <Link 
                    href={`/projects/edit/${projectId}`}
                    className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                    title="تعديل المشروع"
                  >
                    <Edit2 size={18} />
                  </Link>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }}
                >
                  <Link 
                    href={`/projects/delete/${projectId}`}
                    className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                    title="حذف المشروع"
                  >
                    <Trash2 size={18} />
                  </Link>
                </motion.div>
              </div>
            )}

            {(userRole === 'owner' || userRole === 'supervisor') && (
              <div className="relative">
                <motion.button
                  onClick={onToggleSupervisorMenu}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  خيارات المشرف
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </motion.button>

                <AnimatePresence>
                  {showSupervisorMenu && (
                    <motion.div
                      ref={supervisorMenuRef}
                      className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="py-1">
                        <button
                          onClick={onAddSupervisor}
                          className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          إضافة مشرف
                        </button>
                        <button
                          onClick={onManageSupervisors}
                          className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          إدارة المشرفين
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
