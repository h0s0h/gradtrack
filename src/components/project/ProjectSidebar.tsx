'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Project, ProjectMember, User } from '@/lib/supabase/schema';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';
import Image from 'next/image';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface ProjectSidebarProps {
  project: Project & {
    image_url?: string;
  };
  members: (ProjectMember & { user: User })[];
  formatDate?: (dateString: string) => string;
}

interface FirebaseProjectData {
  statistics?: {
    total_tasks?: number;
    completed_tasks?: number;
    pending_files?: number;
  };
  custom_fields?: Record<string, any>;
  last_activity?: string;
}

export default function ProjectSidebar({ project, members, formatDate }: ProjectSidebarProps) {
  const [firebaseData, setFirebaseData] = useState<FirebaseProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // تعريف دالة formatDate داخلية في حالة عدم تمريرها كخاصية
  const formatDateInternal = (dateString: string) => {
    if (formatDate) {
      return formatDate(dateString);
    }
    // دالة افتراضية لتنسيق التاريخ
    try {
      return format(new Date(dateString), 'dd MMM yyyy - HH:mm', { locale: arSA });
    } catch (error) {
      console.error('خطأ في تنسيق التاريخ:', error);
      return dateString;
    }
  };

  // جلب البيانات الإضافية من Firebase
  useEffect(() => {
    const fetchFirebaseData = async () => {
      try {
        setLoading(true);
        const projectRef = ref(database, `projects/${project.id}`);
        const snapshot = await get(projectRef);
        
        if (snapshot.exists()) {
          setFirebaseData(snapshot.val());
        } else {
          console.log('لا توجد بيانات إضافية لهذا المشروع في Firebase');
          setFirebaseData(null);
        }
      } catch (error) {
        console.error('خطأ في جلب بيانات المشروع من Firebase:', error);
        setFirebaseData(null);
      } finally {
        setLoading(false);
      }
    };

    if (project.id) {
      fetchFirebaseData();
    }
  }, [project.id]);

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

  // تحسين عرض صورة المشروع باستخدام Cloudinary
  const getOptimizedProjectImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    
    // إذا كانت الصورة من Cloudinary، قم بإضافة معلمات التحسين
    if (imageUrl.includes('cloudinary.com')) {
      // تحقق من وجود معلمات التحويل
      if (imageUrl.includes('/upload/')) {
        // إضافة معلمات التحويل للحصول على صورة محسنة
        return imageUrl.replace('/upload/', '/upload/c_fill,w_800,h_400,q_auto/');
      }
    }
    
    // إذا كان URL عاديًا، يمكننا إضافة معلمات Cloudinary للتحسين
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'default';
      if (imageUrl.startsWith('http') && !imageUrl.includes('cloudinary.com')) {
        // استخدام fetch remote المدعوم من كلاوديناري
        return `https://res.cloudinary.com/${cloudName}/image/fetch/f_auto,q_auto,w_800,h_400,c_fill/${encodeURIComponent(imageUrl)}`;
      }
      return imageUrl;
    } catch (error) {
      console.error('خطأ في تحويل URL الصورة:', error);
      return imageUrl;
    }
  };

  return (
    <>
      <motion.div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black">معلومات المشروع</h2>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            {isCollapsed ? 'عرض' : 'إخفاء'}
          </button>
        </div>

        <div style={{ maxHeight: isCollapsed ? '0' : '400px' }} 
             className={`overflow-y-auto transition-all duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          <div className="space-y-4 pl-2">
            {project.image_url && (
              <div className="mb-4 relative h-48 w-full">
                <img 
                  src={project.image_url || ''} 
                  alt={project.name}
                  className="object-cover rounded-md w-full h-full"
                />
              </div>
            )}
            
            <div className="rtl">
              <h3 className="text-sm text-gray-500">الوصف</h3>
              <p className="text-gray-700">{project.description || 'لا يوجد وصف'}</p>
            </div>

            <div className="rtl">
              <h3 className="text-sm text-gray-500">تاريخ الإنشاء</h3>
              <p className="text-gray-700">{formatDateInternal(project.created_at)}</p>
            </div>

            {loading ? (
              <div className="rtl py-2">
                <p className="text-gray-500 text-sm">جارِ تحميل المزيد من المعلومات...</p>
              </div>
            ) : firebaseData ? (
              <>
                {/* عرض إحصائيات المشروع إذا توفرت */}
                {firebaseData.statistics && (
                  <div className="rtl border-t pt-4 mt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">إحصائيات المشروع</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {firebaseData.statistics.total_tasks !== undefined && (
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <p className="text-lg font-bold text-blue-600">{firebaseData.statistics.total_tasks}</p>
                          <p className="text-xs text-blue-700">إجمالي المهام</p>
                        </div>
                      )}
                      {firebaseData.statistics.completed_tasks !== undefined && (
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <p className="text-lg font-bold text-green-600">{firebaseData.statistics.completed_tasks}</p>
                          <p className="text-xs text-green-700">المهام المكتملة</p>
                        </div>
                      )}
                      {firebaseData.statistics.pending_files !== undefined && (
                        <div className="bg-amber-50 p-3 rounded-lg text-center">
                          <p className="text-lg font-bold text-amber-600">{firebaseData.statistics.pending_files}</p>
                          <p className="text-xs text-amber-700">الملفات المعلقة</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* عرض آخر نشاط إذا توفر */}
                {firebaseData.last_activity && (
                  <div className="rtl border-t pt-3 mt-3">
                    <h3 className="text-sm text-gray-500">آخر نشاط</h3>
                    <p className="text-gray-700">{formatDateInternal(firebaseData.last_activity)}</p>
                  </div>
                )}

                {/* عرض الحقول المخصصة إذا توفرت */}
                {firebaseData.custom_fields && Object.keys(firebaseData.custom_fields).length > 0 && (
                  <div className="rtl border-t pt-3 mt-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">معلومات إضافية</h3>
                    <div className="space-y-2">
                      {Object.entries(firebaseData.custom_fields).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm text-gray-600">{key}:</span>
                          <span className="text-sm font-medium">{
                            typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : String(value)
                          }</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="bg-white rounded-lg shadow-md p-6 mt-6"
        whileHover={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-xl font-bold mb-4 text-black">أعضاء المشروع</h2>
        <div className="space-y-4">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200">
                  {member.user.avatar_url ? (
                    <img 
                      src={getOptimizedAvatarUrl(member.user.avatar_url) || ''} 
                      alt={member.user.full_name || ''} 
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          target.parentElement.innerHTML = `
                            <div class="h-full w-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                              ${member.user.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                      {member.user.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="rtl">
                  <h3 className="font-medium text-gray-900">{member.user.full_name}</h3>
                  <p className="text-sm text-gray-500">{
                    member.role === 'owner' ? 'مالك' :
                    member.role === 'supervisor' ? 'مشرف' :
                    'عضو'
                  }</p>
                </div>
              </div>
              
              {/* يمكن إضافة زر للمزيد من التفاصيل أو الإجراءات هنا */}
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
