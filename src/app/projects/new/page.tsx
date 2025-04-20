'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/cloudinary/cloudinaryService';
// import { useTranslations } from 'next-intl';

export default function NewProjectPage() {
  // const t = useTranslations('project');
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const fileInputRef = useRef(null);

  // حالات الإدخال (تم تبسيط الحقول لتشمل الاسم والوصف والصورة فقط)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    thumbnail_url: '',
    cloudinary_image_id: ''
  });
  const [formErrors, setFormErrors] = useState({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // حالات تحميل الصورة
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // تحقق من صحة اسم المشروع
  const validateProjectName = (name) => {
    if (!name.trim()) return 'اسم المشروع مطلوب';
    if (name.length < 3) return 'اسم المشروع يجب أن يكون 3 أحرف على الأقل';
    return '';
  };

  // التعامل مع تغييرات الحقول
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'name') {
      setFormErrors(prev => ({ ...prev, name: validateProjectName(value) }));
    }
  };

  // فتح مربع حوار اختيار الملفات
  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // تحويل الملف إلى تنسيق base64
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  // معالجة تغيير الملف (رفع الصورة)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      setUploadProgress(10);

      // تحقق من نوع وحجم الملف
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        throw new Error('نوع الملف غير صالح. يرجى رفع صورة بتنسيق JPG أو PNG أو GIF.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('حجم الملف كبير جدًا. الحد الأقصى هو 5 ميجابايت.');
      }

      // تحويل إلى base64
      const base64 = await fileToBase64(file);
      setUploadProgress(30);

      // رفع إلى Cloudinary
      setUploadProgress(50);
      const result = await uploadImage(base64, 'gradtrack-projects');
      setUploadProgress(90);

      setFormData(prev => ({
        ...prev,
        thumbnail_url: result.url,
        cloudinary_image_id: result.publicId
      }));
      setUploadProgress(100);

      // إعادة تعيين حقل الملف
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('خطأ في رفع الصورة:', err);
      setError(err.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setTimeout(() => {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // إزالة الصورة
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      thumbnail_url: '',
      cloudinary_image_id: ''
    }));
  };

  // إنشاء المشروع وإضافة المستخدم كمالك تلقائيًا
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameErr = validateProjectName(formData.name);
    if (nameErr) {
      setFormErrors({ name: nameErr });
      return;
    }
    if (!user) {
      setError('يجب تسجيل الدخول لإنشاء مشروع');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // إنشاء المشروع مع بيانات الاسم، الوصف، صورة المشروع، والمستخدم المالك
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          description: formData.description || '',
          owner_id: user.id,
          cloudinary_image_id: formData.thumbnail_url || null
        })
        .select();
      if (projErr) throw projErr;
      if (!projData.length) {
        throw new Error('فشل إنشاء المشروع، لم يتم إرجاع بيانات المشروع');
      }
      const newProj = projData[0];

      // إضافة صاحب المشروع كعضو (دور المالك)
      const { error: ownerErr } = await supabase
        .from('project_members')
        .insert({ project_id: newProj.id, user_id: user.id, role: 'owner' });
      if (ownerErr) console.error('Error adding owner:', ownerErr);

      setSuccess('تم إنشاء المشروع');
      router.push(`/projects/${newProj.id}`);
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message || 'حدث خطأ أثناء إنشاء المشروع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // إعدادات حركات Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.1 } }
  };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
  const buttonVariants = { hover: { scale: 1.05, boxShadow: '0px 5px 10px rgba(0,0,0,0.1)' }, tap: { scale: 0.95 } };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">يجب تسجيل الدخول لإنشاء مشروع جديد</h2>
          <Link
            href="/auth/login"
            className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* الشريط العلوي */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white shadow-sm"
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.9 }}>
            <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-800">إنشاء مشروع جديد</h1>
          <motion.div whileHover={{ scale: 1.03 }} className="flex items-center space-x-4 rtl:space-x-reverse">
            <Link href="/profile" className="flex items-center">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full" />
                ) : (
                  <span className="text-indigo-600 font-semibold">
                    {(user.full_name || user.email).charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-gray-700">{user.full_name || user.email}</span>
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* المحتوى الرئيسي */}
      <main className="container mx-auto px-4 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-2xl mx-auto">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 text-red-700 p-4 rounded-md mb-6 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-green-50 text-green-700 p-4 rounded-md mb-6 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit}>
              {/* اسم المشروع */}
              <motion.div variants={itemVariants} className="mb-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المشروع *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                  placeholder="أدخل اسم المشروع"
                  dir="rtl"
                />
                <AnimatePresence>
                  {formErrors.name && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-1 text-sm text-red-600"
                    >
                      {formErrors.name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* وصف المشروع */}
              <motion.div variants={itemVariants} className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  وصف المشروع
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="أدخل وصفاً للمشروع"
                  rows={4}
                  dir="rtl"
                />
              </motion.div>

              {/* صورة المشروع */}
              <motion.div variants={itemVariants} className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة المشروع</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {formData.thumbnail_url ? (
                  <div className="relative mb-4">
                    <img
                      src={formData.thumbnail_url}
                      alt="صورة المشروع"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                      disabled={isUploadingImage}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={handleOpenFileDialog}
                    className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">اضغط لإضافة صورة للمشروع</p>
                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF حتى 5MB</p>
                  </div>
                )}
                {isUploadingImage && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1 text-center">{uploadProgress}%</p>
                  </div>
                )}
              </motion.div>

              {/* زر الإرسال */}
              <motion.div variants={itemVariants} className="flex justify-center">
                <motion.button
                  type="submit"
                  disabled={isSubmitting || !!formErrors.name}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className={`px-8 py-3 text-white font-medium rounded-md transition ${
                    isSubmitting || formErrors.name
                      ? 'bg-indigo-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري الإنشاء...
                    </span>
                  ) : (
                    'إنشاء المشروع'
                  )}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
