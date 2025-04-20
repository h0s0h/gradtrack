'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { updateUserProfile, signOut } from '@/lib/supabase/auth';
import ImageUploader from '@/components/ui/ImageUploader';
import { createNotification } from '@/lib/notifications/notificationService';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth.signup');
  
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formValues, setFormValues] = useState({
    full_name: '',
    avatar_url: '',
    cloudinary_avatar_id: '',
  });
  const [formErrors, setFormErrors] = useState({
    full_name: '',
  });

  useEffect(() => {
    if (user) {
      setFormValues({
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
        cloudinary_avatar_id: user.cloudinary_avatar_id || '',
      });
    }
  }, [user]);

  const validateForm = () => {
    let isValid = true;
    const errors = { full_name: '' };

    if (formValues.full_name.length < 3) {
      errors.full_name = t('fullNameMinLength', { defaultValue: 'الاسم الكامل يجب أن يكون 3 أحرف على الأقل' });
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpdate = (imageData) => {
    setFormValues(prev => ({
      ...prev,
      avatar_url: imageData.url,
      cloudinary_avatar_id: imageData.public_id
    }));
  };

  const handleImageDelete = async () => {
    if (formValues.cloudinary_avatar_id) {
      try {
        // حذف الصورة القديمة من Cloudinary
        await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ public_id: formValues.cloudinary_avatar_id }),
        });
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }
    
    setFormValues(prev => ({
      ...prev,
      avatar_url: '',
      cloudinary_avatar_id: ''
    }));
  };

  const handleSubmit = async (e) => {
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
          avatar_url: formValues.avatar_url || null,
          cloudinary_avatar_id: formValues.cloudinary_avatar_id || null,
        }
      );
      
      if (updateError) throw updateError;
      
      if (success) {
        setSuccess(t('profileUpdated'));
        
        // إنشاء إشعار لتحديث الملف الشخصي
        try {
          await createNotification(
            user.id,
            t('profileUpdateNotificationTitle', { defaultValue: 'تم تحديث الملف الشخصي' }),
            t('profileUpdateNotificationContent', { defaultValue: 'تم تحديث بيانات ملفك الشخصي بنجاح' }),
            'inactivity_alert'
          );
        } catch (notificationError) {
          console.error('Error creating profile update notification:', notificationError);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(tCommon('error'));
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
      setError(tCommon('error'));
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
          <h2 className="text-2xl font-bold mb-4">{t('loginRequired', { defaultValue: 'يجب تسجيل الدخول للوصول إلى الملف الشخصي' })}</h2>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/auth/login" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition inline-block">
              {tAuth('loginInstead')}
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
              {t('title')}
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
              {t('updateProfile')}
            </motion.h2>
            
            <form onSubmit={handleSubmit}>
              <motion.div 
                className="mb-6 flex flex-col items-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div 
                  className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4 overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  {formValues.avatar_url ? (
                    <motion.img 
                      src={formValues.avatar_url} 
                      alt={t('avatarAlt', { defaultValue: 'صورة الملف الشخصي' })} 
                      className="w-full h-full object-cover"
                      initial={{ filter: "blur(5px)" }}
                      animate={{ filter: "blur(0px)" }}
                      transition={{ duration: 0.5 }}
                    />
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
                
                <div className="w-full max-w-xs">
                  <ImageUploader
                    initialImage={formValues.avatar_url}
                    onImageUpload={handleImageUpdate}
                    onImageDelete={handleImageDelete}
                    folder="avatars"
                  />
                </div>
              </motion.div>

              <motion.div 
                className="mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fullName')}
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('fullNamePlaceholder', { defaultValue: 'أدخل اسمك الكامل' })}
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
                  {t('email')}
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
                  {t('emailCannotBeChanged', { defaultValue: 'لا يمكن تغيير البريد الإلكتروني' })}
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
                  {isSubmitting ? tCommon('loading') : tCommon('save')}
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
              {t('accountSettings', { defaultValue: 'إعدادات الحساب' })}
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
                {t('logout', { defaultValue: 'تسجيل الخروج' })}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
