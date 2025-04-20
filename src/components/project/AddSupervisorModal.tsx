'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useProjectSupervisorsAndInvitations } from '@/app/api/combined'; 
import { supabase } from '@/lib/supabase/client';

interface AddSupervisorModalProps {
  show: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  results: any[];
  isSearching: boolean;
  onSelect: (selectedUser: any) => void;
  isProcessing: boolean;
  projectId: string;
  currentUserId: string;
}

// Function to send notification to the user
const sendSupervisorNotification = async (userId: string, projectId: string, projectName: string, senderName: string) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title: 'تمت إضافتك كمشرف',
          content: `تمت إضافتك كمشرف على المشروع "${projectName}" من قبل ${senderName}`,
          type: 'project_invitation',
          related_id: projectId,
          is_read: false
        }
      ]);
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error };
  }
};

export default function AddSupervisorModal({
  show,
  onClose,
  query,
  onQueryChange,
  results,
  isSearching,
  onSelect,
  isProcessing,
  projectId,
  currentUserId
}: AddSupervisorModalProps) {
  const [projectName, setProjectName] = React.useState<string>('');
  const [senderName, setSenderName] = React.useState<string>('');
  
  // Fetch project name and sender info when component mounts
  React.useEffect(() => {
    const fetchProjectInfo = async () => {
      if (!projectId || !currentUserId) return;
      
      try {
        // Fetch project info
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();
        
        if (projectError) throw projectError;
        if (projectData) {
          setProjectName(projectData.name);
        }
        
        // Fetch user info - using users table instead of profiles
        const { data: userData, error: userError } = await supabase
          .from('users')  // Changed from 'profiles' to 'users'
          .select('full_name')
          .eq('id', currentUserId)
          .single();
        
        if (userError) {
          console.error('Error fetching user info:', userError);
          setSenderName('مستخدم النظام'); // Fallback name if error occurs
          return;
        }
        
        if (userData) {
          setSenderName(userData.full_name || 'مستخدم النظام');
        }
      } catch (error) {
        console.error('Error fetching project or user info:', error);
        // Set default values in case of error
        setProjectName('المشروع');
        setSenderName('مستخدم النظام');
      }
    };
    
    fetchProjectInfo();
  }, [projectId, currentUserId]);
  
  const {
    searchQuery,
    setSearchQuery,
    searchUsers,
    searchResults,
    isSearching: hookIsSearching,
    isProcessing: hookIsProcessing,
    error,
    successMessage,
    handleUserSelection,
    handleRemoveSupervisor
  } = useProjectSupervisorsAndInvitations(projectId, currentUserId);

  // Enhanced user selection handler with notification
  const handleUserSelectionWithNotification = async (user: any) => {
    try {
      // Handle the original selection logic
      await handleUserSelection(user);
      
      // If no error was thrown, send a notification
      await sendSupervisorNotification(user.id, projectId, projectName, senderName);
      
      // Call the parent onSelect function
      onSelect(user);
    } catch (error) {
      console.error('Failed to add supervisor:', error);
    }
  };

  // تحسين عرض صورة المستخدم باستخدام Cloudinary
  const getOptimizedAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return '';
    
    // إذا كانت الصورة من Cloudinary، قم بإضافة معلمات التحسين
    if (avatarUrl.includes('cloudinary.com')) {
      // تحقق من وجود معلمات التحويل
      if (avatarUrl.includes('/upload/')) {
        // إضافة معلمات التحويل للحصول على صورة محسنة (حجم أصغر وجودة أفضل)
        return avatarUrl.replace('/upload/', '/upload/c_fill,g_face,w_40,h_40,q_auto/');
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
            <h2 className="text-xl font-bold mb-6 rtl">إضافة مشرف</h2>
            <div className="mb-6">
              <input
                type="text"
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                placeholder="بحث بالاسم أو البريد الإلكتروني..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rtl"
              />
              {isSearching && (
                <div className="flex justify-center mt-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              )}
              {results.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                  {results.map(result => (
                    <button
                      key={result.id}
                      onClick={() => handleUserSelectionWithNotification(result)}
                      className="w-full px-4 py-2 text-right hover:bg-gray-100 flex items-center justify-between transition rtl"
                      disabled={isProcessing}
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 ml-3">
                          {result.avatar_url ? (
                            <img 
                              src={getOptimizedAvatarUrl(result.avatar_url)} 
                              alt={result.full_name || result.email} 
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                // في حالة فشل تحميل الصورة، عرض الحرف الأول من اسم المستخدم
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="h-full w-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                                      ${(result.full_name || result.email).charAt(0).toUpperCase()}
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                              {(result.full_name || result.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{result.full_name || result.email}</p>
                          {result.email !== result.full_name && <p className="text-sm text-gray-500">{result.email}</p>}
                        </div>
                      </div>
                      {result.isInvitation ? (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          إرسال دعوة
                        </span>
                      ) : isProcessing ? (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          جاري الإضافة...
                        </span>
                      ) : (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                          إضافة
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {query && !isSearching && results.length === 0 && (
                <div className="mt-2 text-center py-4 border border-gray-200 rounded-md">
                  <p className="text-gray-500">لا توجد نتائج مطابقة</p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 rtl:space-x-reverse">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
                disabled={isProcessing}
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}