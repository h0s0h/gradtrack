'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { updateUserProfile, signOut } from '@/lib/supabase/auth';
import { uploadImage } from '@/lib/cloudinary/cloudinaryService';

// تعريف الأنواع للحالة
interface FormValues {
  full_name: string;
  avatar_url: string;
  cloudinary_avatar_id?: string;
}

interface FormErrors {
  full_name: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formValues, setFormValues] = useState<FormValues>({
    full_name: '',
    avatar_url: '',
    cloudinary_avatar_id: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({
    full_name: '',
  });

  useEffect(() => {
    if (user) {
      setFormValues({
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
        cloudinary_avatar_id: user.cloudinary_avatar_id || '',
      });
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  const validateForm = () => {
    let isValid = true;
    const errors = { full_name: '' };

    if (formValues.full_name.length < 3) {
      errors.full_name = 'الاسم الكامل يجب أن يكون 3 أحرف على الأقل';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(10);
      
      // التحقق من نوع وحجم الملف
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        throw new Error('نوع الملف غير صالح. يرجى رفع صورة بتنسيق JPG أو PNG أو GIF.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('حجم الملف كبير جدًا. الحد الأقصى هو 5 ميجابايت.');
      }
      
      // تحويل الملف إلى base64
      const base64 = await fileToBase64(file);
      setUploadProgress(30);
      
      // حذف الصورة القديمة إذا وجدت
      if (formValues.cloudinary_avatar_id) {
        try {
          await fetch('/api/cloudinary/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ public_id: formValues.cloudinary_avatar_id }),
          });
        } catch (err) {
          console.error('Error deleting old avatar:', err);
        }
      }
      
      // رفع الصورة الجديدة إلى Cloudinary
      setUploadProgress(50);
      const result = await uploadImage(base64, 'gradtrack-avatars');
      setUploadProgress(90);
      
      // تحديث النموذج والمعاينة
      setFormValues(prev => ({
        ...prev,
        avatar_url: result.url,
        cloudinary_avatar_id: result.publicId
      }));
      setAvatarPreview(result.url);
      setUploadProgress(100);
      
      // إعادة تعيين حقل إدخال الملف
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setError(error.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // دالة لإزالة الصورة الحالية
  const handleRemoveAvatar = async () => {
    if (!user || !formValues.avatar_url) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      // حذف الصورة من Cloudinary
      if (formValues.cloudinary_avatar_id) {
        await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ public_id: formValues.cloudinary_avatar_id }),
        });
      }
      
      // تحديث النموذج والمعاينة
      setFormValues(prev => ({
        ...prev, 
        avatar_url: '',
        cloudinary_avatar_id: ''
      }));
      setAvatarPreview(null);
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      setError('حدث خطأ أثناء إزالة الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      
      // تحديث بيانات المستخدم
      const { success, error: updateError } = await updateUserProfile(
        user.id,
        {
          full_name: formValues.full_name,
          avatar_url: formValues.avatar_url || '',
          cloudinary_avatar_id: formValues.cloudinary_avatar_id || '',
        }
      );
      
      if (updateError) throw updateError;
      
      if (success) {
        setSuccess('تم تحديث الملف الشخصي بنجاح');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError('حدث خطأ أثناء تحديث الملف الشخصي');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          className="h-12 w-12 border-t-2 border-b-2 border-indigo-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold mb-4">يجب تسجيل الدخول للوصول إلى الملف الشخصي</h2>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/auth/login" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition inline-block">
              تسجيل الدخول
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* الشريط العلوي */}
      <motion.header 
        className="bg-white shadow-sm"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <motion.div whileHover={{ x: -5 }} whileTap={{ scale: 0.9 }}>
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
            </motion.div>
            <motion.h1 
              className="text-2xl font-bold text-gray-800"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              الملف الشخصي
            </motion.h1>
          </div>
        </div>
      </motion.header>

      {/* المحتوى الرئيسي */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AnimatePresence>
            {error && (
              <motion.div
                className="bg-red-50 text-red-700 p-4 rounded-md mb-6"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                className="bg-green-50 text-green-700 p-4 rounded-md mb-6"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            className="bg-white rounded-lg shadow-md p-6 mb-6"
            whileHover={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
            transition={{ duration: 0.3 }}
          >
            <motion.h2 
              className="text-xl font-bold mb-6"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              تعديل الملف الشخصي
            </motion.h2>
            
            <form onSubmit={handleSubmit}>
              <motion.div 
                className="mb-6 flex flex-col items-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div 
                  className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4 overflow-hidden relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  {avatarPreview ? (
                    <>
                      <motion.img 
                        src={avatarPreview} 
                        alt="صورة الملف الشخصي" 
                        className="w-full h-full object-cover"
                        initial={{ filter: "blur(5px)" }}
                        animate={{ filter: "blur(0px)" }}
                        transition={{ duration: 0.5 }}
                      />
                      <motion.button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition opacity-0 hover:opacity-100"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={isUploading}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </motion.button>
                    </>
                  ) : (
                    <motion.span 
                      className="text-indigo-600 font-bold text-2xl"
                      animate={{ 
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      {user.full_name?.charAt(0) || user.email.charAt(0)}
                    </motion.span>
                  )}
                </motion.div>
                
                <div className="relative flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="avatar"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={isUploading}
                  />
                  <motion.label
                    htmlFor="avatar"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition cursor-pointer disabled:opacity-70 inline-block"
                    whileHover={{ scale: 1.05, backgroundColor: "#4338ca" }}
                    whileTap={{ scale: 0.95 }}
                    animate={isUploading ? { scale: [1, 0.97, 1] } : {}}
                    transition={isUploading ? { 
                      repeat: Infinity, 
                      duration: 0.8 
                    } : {}}
                  >
                    {isUploading ? 'جاري الرفع...' : 'تغيير الصورة'}
                  </motion.label>
                  
                  {avatarPreview && (
                    <motion.button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="bg-red-100 text-red-600 px-4 py-2 rounded-md hover:bg-red-200 transition cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isUploading}
                    >
                      إزالة الصورة
                    </motion.button>
                  )}
                </div>
                
                {isUploading && (
                  <div className="w-full mt-4">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-1">
                      {uploadProgress}%
                    </p>
                  </div>
                )}
              </motion.div>

              <motion.div 
                className="mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="أدخل اسمك الكامل"
                  value={formValues.full_name}
                  onChange={handleInputChange}
                  dir="rtl"
                />
                <AnimatePresence>
                  {formErrors.full_name && (
                    <motion.p 
                      className="mt-1 text-sm text-red-600"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {formErrors.full_name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div 
                className="mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
                  value={user.email}
                  readOnly
                  disabled
                  dir="rtl"
                />
                <motion.p 
                  className="mt-1 text-xs text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 1 }}
                >
                  لا يمكن تغيير البريد الإلكتروني
                </motion.p>
              </motion.div>

              <motion.div 
                className="flex justify-end"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition disabled:opacity-70"
                  whileHover={{ scale: 1.03, backgroundColor: "#4338ca" }}
                  whileTap={{ scale: 0.97 }}
                  animate={isSubmitting ? { scale: [1, 0.97, 1] } : {}}
                  transition={isSubmitting ? { 
                    repeat: Infinity, 
                    duration: 0.8 
                  } : {}}
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>

          <motion.div 
            className="bg-white rounded-lg shadow-md p-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            whileHover={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
          >
            <motion.h2 
              className="text-xl font-bold mb-6"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1 }}
            >
              إعدادات الحساب
            </motion.h2>
            
            <motion.div 
              className="border-t border-gray-200 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <motion.button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800 font-medium"
                whileHover={{ scale: 1.03, color: "#b91c1c" }}
                whileTap={{ scale: 0.97 }}
              >
                تسجيل الخروج
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}