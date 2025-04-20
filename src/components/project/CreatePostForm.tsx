'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LanguageSelector from '@/components/common/LanguageSelector';
import { uploadImage } from '@/lib/cloudinary/cloudinaryService'; // استيراد الدالة جاهزة
import { ref, set, get, remove } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig'; // استيراد قاعدة البيانات المُهيئة

/**
 * واجهة بيانات الصورة
 */
interface ImageData {
  url: string;
  publicId: string;
}

/**
 * واجهة خصائص نموذج إنشاء المنشور
 */
interface CreatePostFormProps {
  // محتوى المنشور الأساسي
  newPostContent: string;
  onContentChange: (value: string) => void;
  
  // خصائص متعلقة بالكود
  showCodeInput: boolean;
  onToggleCodeInput: () => void;
  newPostCode: string;
  onCodeChange: (value: string) => void;
  newPostCodeLanguage: string;
  onLanguageChange: (lang: string) => void;
  
  // خصائص متعلقة بالصور
  fileInputRef?: React.RefObject<HTMLInputElement>;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenFileDialog?: () => void;
  isUploadingImage?: boolean;
  uploadedImage?: string | null;
  uploadProgress?: number;
  onRemoveImage?: () => void;
  
  // حالة تقديم النموذج
  isSubmittingPost: boolean;
  onSubmitPost: (e: React.FormEvent) => void;
  
  // خصائص اختيارية إضافية
  className?: string;
  userId: string;
  projectId: string;
  children?: React.ReactNode;
}

// خدمات Firebase للتعامل مع الكود
const storeCodeSnippet = async ({ 
  content, 
  language, 
  userId, 
  projectId 
}: { 
  content: string, 
  language: string, 
  userId: string,
  projectId: string 
}) => {
  try {
    // إنشاء معرف فريد للكود
    const codeId = `code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const path = `codes/${codeId}`;
    
    // تخزين الكود في Firebase مع معلومات إضافية
    await addData(path, {
      content,
      language,
      userId,
      projectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: 'post' // لتمييز الأكواد المرتبطة بالمنشورات عن التعليقات
    });
    
    return { id: codeId };
  } catch (error) {
    console.error('خطأ في تخزين الكود:', error);
    throw error;
  }
};

// دالة لجلب الكود من Firebase
const getCodeSnippet = async (codeId: string) => {
  try {
    const path = `codes/${codeId}`;
    return await fetchData(path);
  } catch (error) {
    console.error('خطأ في جلب الكود:', error);
    throw error;
  }
};

// دالة لحذف الكود من Firebase
const deleteCodeSnippet = async (codeId: string) => {
  try {
    const path = `codes/${codeId}`;
    const dbRef = ref(database, path);
    await remove(dbRef);
    return true;
  } catch (error) {
    console.error('خطأ في حذف الكود:', error);
    throw error;
  }
};

// خدمات Firebase الأساسية
const fetchData = async (path: string) => {
  try {
    const dbRef = ref(database, path);
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    console.log("لا توجد بيانات في هذا المسار.");
    return null;
  } catch (error) {
    console.error("خطأ أثناء جلب البيانات:", error);
    throw error;
  }
};

const addData = async (path: string, data: any) => {
  try {
    const dbRef = ref(database, path);
    await set(dbRef, data);
    return true;
  } catch (error) {
    console.error("خطأ أثناء إضافة البيانات:", error);
    throw error;
  }
};

const MAX_POST_LENGTH = 500;
const MAX_CODE_LENGTH = 1000;

const formatCharacterCount = (current: number, max: number) => {
  return `${current}/${max}`;
};

export default function CreatePostForm({
  newPostContent,
  onContentChange,
  showCodeInput,
  onToggleCodeInput,
  newPostCode,
  onCodeChange,
  newPostCodeLanguage,
  onLanguageChange,
  fileInputRef: externalFileInputRef,
  onFileChange: externalOnFileChange,
  onOpenFileDialog: externalOnOpenFileDialog,
  isUploadingImage: externalIsUploadingImage,
  uploadedImage: externalUploadedImage,
  uploadProgress: externalUploadProgress,
  onRemoveImage: externalOnRemoveImage,
  isSubmittingPost,
  onSubmitPost,
  className = '',
  userId,
  projectId,
  children
}: CreatePostFormProps) {
  // مراجع داخلية إذا لم يتم توفير مراجع خارجية
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef || internalFileInputRef;
  
  // حالة إدارة الصور الداخلية إذا لم يتم توفير حالة خارجية
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    externalUploadedImage !== undefined ? externalUploadedImage : null
  );
  const [imagePublicId, setImagePublicId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(externalIsUploadingImage || false);
  const [uploadProgress, setUploadProgress] = useState(externalUploadProgress || 0);
  
  // حالة تخزين الكود
  const [codeId, setCodeId] = useState<string | null>(null);
  const [isStoringCode, setIsStoringCode] = useState(false);
  
  // فتح مربع حوار اختيار الملفات
  const handleOpenFileDialog = () => {
    if (externalOnOpenFileDialog) {
      externalOnOpenFileDialog();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // تحويل الملف إلى تنسيق base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // معالجة تغيير الملف مع استخدام دالة uploadImage الجاهزة
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (externalOnFileChange) {
      externalOnFileChange(e);
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    // التحقق من نوع وحجم الملف
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('نوع الملف غير صالح. يرجى رفع صورة بتنسيق JPG أو PNG أو GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الملف كبير جدًا. الحد الأقصى هو 5 ميجابايت.');
      return;
    }
    
    try {
      setIsUploadingImage(true);
      setUploadProgress(10);
      
      const base64 = await fileToBase64(file);
      setUploadProgress(50);
      const result = await uploadImage(base64, 'gradtrack');
      
      setUploadedImage(result.url);
      setImagePublicId(result.publicId);
      setUploadProgress(100);
      
      // إعادة تعيين حقل إدخال الملف
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('خطأ في رفع الصورة:', error);
      alert(error.message || 'حدث خطأ أثناء رفع الصورة. يرجى المحاولة مرة أخرى.');
    } finally {
      setTimeout(() => {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }, 500);
    }
  };
  
  // حذف الصورة
  const handleRemoveImage = async () => {
    if (externalOnRemoveImage) {
      externalOnRemoveImage();
      return;
    }
    
    if (!imagePublicId) {
      setUploadedImage(null);
      return;
    }
    
    try {
      setIsUploadingImage(true);
      setUploadProgress(30);
      
      // هنا يمكن إضافة رمز لحذف الصورة من Cloudinary إذا لزم الأمر،
      // لكننا نقوم حاليًا بإزالتها فقط من واجهة المستخدم
      
      setUploadProgress(70);
      setUploadedImage(null);
      setImagePublicId(null);
      setUploadProgress(100);
    } catch (error) {
      console.error('خطأ في حذف الصورة:', error);
      setUploadedImage(null);
      setImagePublicId(null);
    } finally {
      setTimeout(() => {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // تقديم النموذج مع تخزين الكود في Firebase إذا كان موجودًا
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showCodeInput && newPostCode.trim()) {
      try {
        setIsStoringCode(true);
        
        const result = await storeCodeSnippet({
          content: newPostCode,
          language: newPostCodeLanguage,
          userId: userId,
          projectId: projectId
        });
        
        setCodeId(result.id);
        onSubmitPost(e);
      } catch (error) {
        console.error('خطأ في تخزين الكود:', error);
        alert('حدث خطأ أثناء تخزين الكود. يرجى المحاولة مرة أخرى.');
        onSubmitPost(e);
      } finally {
        setIsStoringCode(false);
      }
    } else {
      onSubmitPost(e);
    }
  };

  const displayedImage = externalUploadedImage !== undefined ? externalUploadedImage : uploadedImage;
  const currentUploadProgress = externalUploadProgress !== undefined ? externalUploadProgress : uploadProgress;
  const currentIsUploadingImage = externalIsUploadingImage !== undefined ? externalIsUploadingImage : isUploadingImage;

  return (
    <motion.div 
      className={`bg-white rounded-lg shadow-md p-6 ${className}`}
      whileHover={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-bold mb-4 text-gray-900">إنشاء منشور جديد</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4 relative">
          {displayedImage && (
            <div className="absolute top-0 left-0 right-0 h-32 bg-gray-100 rounded-t-md">
              <div className="relative w-full h-full">
                <img
                  src={displayedImage}
                  alt="صورة المنشور"
                  className="w-full h-full object-contain rounded-t-md"
                />
                <button
                  onClick={externalOnRemoveImage || handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-sm"
                  aria-label="حذف الصورة"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          <div className="relative">
            <textarea
              value={newPostContent}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="اكتب تحديثاً عن تقدم المشروع..."
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base leading-relaxed text-gray-900 placeholder-gray-500"
              rows={displayedImage ? 6 : 4}
              dir="rtl"
              required
              aria-label="محتوى المنشور"
            />
          </div>

          {currentUploadProgress > 0 && currentUploadProgress < 100 && (
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${currentUploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">جارٍ رفع الصورة... {currentUploadProgress}%</p>
            </div>
          )}
        </div>

        {showCodeInput && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <LanguageSelector
                selectedLanguage={newPostCodeLanguage}
                onLanguageChange={onLanguageChange}
              />
              <button
                type="button"
                onClick={onToggleCodeInput}
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                aria-label="إزالة الكود"
              >
                إزالة الكود
              </button>
            </div>
            <div className="relative">
              <textarea
                value={newPostCode}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="// أدخل الكود هنا..."
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm leading-relaxed bg-gray-50"
                rows={8}
                dir="ltr"
                aria-label="محتوى الكود"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-end items-center">
          {!showCodeInput && (
            <motion.button
              type="button"
              onClick={onToggleCodeInput}
              className="px-4 py-2 text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors flex items-center font-medium text-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-label="إضافة كود للمنشور"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              إضافة كود
            </motion.button>
          )}

          <motion.button
            type="button"
            onClick={externalOnOpenFileDialog || handleOpenFileDialog}
            className="px-4 py-2 text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors flex items-center font-medium text-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={currentIsUploadingImage}
            aria-label="إضافة صورة للمنشور"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            إضافة صورة
          </motion.button>

          <motion.button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center font-medium text-base shadow-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={
              isSubmittingPost || 
              !newPostContent.trim() || 
              currentIsUploadingImage || 
              isStoringCode
            }
            aria-label={isSubmittingPost || isStoringCode ? 'جارٍ نشر المنشور' : 'نشر المنشور'}
          >
            {isSubmittingPost || isStoringCode ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جارٍ النشر...
              </span>
            ) : (
              'نشر'
            )}
          </motion.button>
        </div>
      </form>
      {children}
    </motion.div>
  );
}
