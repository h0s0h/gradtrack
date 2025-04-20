'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { Project } from '@/lib/supabase/schema';
import { uploadImage } from '@/lib/cloudinary/cloudinaryService';
import { AlertCircle, ArrowLeft, Save, Trash2, Upload, X } from 'lucide-react';

export default function EditProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    thumbnail_url: '',
    cloudinary_image_id: '',
    completion_percentage: 0
  });
  const [formErrors, setFormErrors] = useState({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch project data and check ownership
  useEffect(() => {
    if (!user || !id) return;

    const fetchProjectAndCheckOwnership = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch project data
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) throw projectError;
        if (!projectData) throw new Error('المشروع غير موجود');

        setProject(projectData);

        // Check if current user is the owner
        if (projectData.owner_id === user.id) {
          setIsOwner(true);
          // Initialize form with project data
          setFormData({
            name: projectData.name || '',
            description: projectData.description || '',
            thumbnail_url: projectData.thumbnail_url || '',
            cloudinary_image_id: projectData.cloudinary_image_id || '',
            completion_percentage: projectData.completion_percentage || 0
          });
        } else {
          setError('غير مسموح لك بتعديل هذا المشروع، فقط المالك يمكنه التعديل');
        }
      } catch (err: any) {
        console.error('Error fetching project:', err);
        setError(err.message || 'حدث خطأ أثناء جلب بيانات المشروع');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectAndCheckOwnership();
  }, [id, user]);

  // Validate project name
  const validateProjectName = (name: string) => {
    if (!name.trim()) return 'اسم المشروع مطلوب';
    if (name.length < 3) return 'اسم المشروع يجب أن يكون 3 أحرف على الأقل';
    return '';
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'completion_percentage') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (name === 'name') {
      setFormErrors(prev => ({ ...prev, name: validateProjectName(value) }));
    }
  };

  // Open file dialog
  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });

  // Handle file change for image upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      setUploadProgress(10);
      setError(null);

      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        throw new Error('نوع الملف غير صالح. يرجى رفع صورة بتنسيق JPG أو PNG أو GIF.');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('حجم الملف كبير جدًا. الحد الأقصى هو 5 ميجابايت.');
      }

      // Convert to base64
      const base64 = await fileToBase64(file);
      setUploadProgress(30);

      // حذف الصورة القديمة من Cloudinary إذا وجدت
      if (formData.cloudinary_image_id) {
        try {
          await fetch('/api/cloudinary/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ public_id: formData.cloudinary_image_id }),
          });
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }

      // Upload to Cloudinary
      setUploadProgress(50);
      const result = await uploadImage(base64, 'gradtrack-projects');
      setUploadProgress(90);

      setFormData(prev => ({
        ...prev,
        thumbnail_url: result.url,
        cloudinary_image_id: result.publicId
      }));
      setUploadProgress(100);

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setTimeout(() => {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // Remove image
  const handleRemoveImage = async () => {
    try {
      setIsUploadingImage(true);
      setUploadProgress(20);
      setError(null);

      // حذف الصورة من Cloudinary
      if (formData.cloudinary_image_id) {
        setUploadProgress(40);
        await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ public_id: formData.cloudinary_image_id }),
        });
        setUploadProgress(80);
      }

      // تحديث البيانات
      setFormData(prev => ({
        ...prev,
        thumbnail_url: '',
        cloudinary_image_id: ''
      }));
      setUploadProgress(100);
    } catch (err) {
      console.error('Error removing image:', err);
      setError('حدث خطأ أثناء إزالة الصورة');
    } finally {
      setTimeout(() => {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // Update project
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateProjectName(formData.name);
    if (nameErr) {
      setFormErrors({ name: nameErr });
      return;
    }

    if (!isOwner) {
      setError('غير مسموح لك بتعديل هذا المشروع، فقط المالك يمكنه التعديل');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Update project data
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: formData.name,
          description: formData.description || '',
          thumbnail_url: formData.thumbnail_url || null,
          cloudinary_image_id: formData.cloudinary_image_id || null,
          completion_percentage: formData.completion_percentage || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setSuccess('تم تحديث المشروع بنجاح');

      // Navigate back to project page after short delay
      setTimeout(() => {
        router.push(`/projects/${id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating project:', err);
      setError(err.message || 'حدث خطأ أثناء تحديث المشروع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete project
  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    if (!isOwner) {
      setError('غير مسموح لك بحذف هذا المشروع، فقط المالك يمكنه الحذف');
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      // حذف صورة المشروع من Cloudinary إذا كانت موجودة
      if (project?.cloudinary_image_id) {
        try {
          await fetch('/api/cloudinary/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ public_id: project.cloudinary_image_id }),
          });
          console.log('تم حذف صورة المشروع من Cloudinary');
        } catch (err) {
          console.error('Error deleting project image from Cloudinary:', err);
          // نستمر في حذف المشروع حتى لو فشل حذف الصورة
        }
      }

      // Delete project - this should cascade to all related data if set up in the database
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess('تم حذف المشروع بنجاح');

      // Navigate to projects list after short delay
      setTimeout(() => {
        router.push('/projects');
      }, 1500);
    } catch (err: any) {
      console.error('Error deleting project:', err);
      setError(err.message || 'حدث خطأ أثناء حذف المشروع');
    } finally {
      setIsDeleting(false);
    }
  };

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.1 } }
  };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
  const buttonVariants = { hover: { scale: 1.05, boxShadow: '0px 5px 10px rgba(0,0,0,0.1)' }, tap: { scale: 0.95 } };

  // Loading state
  if (authLoading || isLoading) {
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

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">يجب تسجيل الدخول لتعديل المشروع</h2>
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

  // Not owner
  if (!isOwner && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">غير مسموح بالوصول</h2>
          <p className="text-gray-600 mb-6">لا يمكنك تعديل هذا المشروع لأنك لست المالك.</p>
          <Link
            href={`/projects/${id}`}
            className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
          >
            العودة إلى صفحة المشروع
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white shadow-sm"
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.9 }}>
            <Link href={`/projects/${id}`} className="text-indigo-600 hover:text-indigo-800 mr-4 flex items-center">
              <ArrowLeft className="h-5 w-5 ml-1" />
              <span>العودة إلى المشروع</span>
            </Link>
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-800">تعديل المشروع</h1>
          <div className="w-24"></div> {/* Spacer to balance the layout */}
        </div>
      </motion.header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-2xl mx-auto">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-start"
              >
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6"
              >
                <p>{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
          >
            <form onSubmit={handleSubmit}>
              {/* Project name */}
              <div className="mb-6">
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                  اسم المشروع *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="أدخل اسم المشروع"
                  className={`w-full border ${formErrors.name ? 'border-red-300' : 'border-gray-300'
                    } rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-300 focus:border-transparent outline-none transition-all`}
                  disabled={isSubmitting}
                />
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
              </div>

              {/* Project description */}
              <div className="mb-6">
                <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
                  وصف المشروع
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="أدخل وصفًا للمشروع (اختياري)"
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-300 focus:border-transparent outline-none transition-all"
                  disabled={isSubmitting}
                ></textarea>
              </div>

              {/* Project image */}
              <div className="mb-8">
                <label className="block text-gray-700 font-medium mb-2">صورة المشروع</label>
                <div className="mt-2">
                  {formData.thumbnail_url ? (
                    <motion.div
                      className="relative rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="relative w-full h-64">
                        <motion.img
                          src={formData.thumbnail_url}
                          alt="صورة المشروع"
                          className="w-full h-full object-cover"
                          initial={{ filter: "blur(5px)" }}
                          animate={{ filter: "blur(0px)" }}
                          transition={{ duration: 0.5 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end">
                          <div className="p-4 text-white w-full">
                            <p className="text-sm line-clamp-1">
                              {formData.name || "صورة المشروع"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <motion.button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                        disabled={isUploadingImage}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      onClick={handleOpenFileDialog}
                      className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                      whileHover={{ scale: 1.02, borderColor: "#6366f1" }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">انقر لرفع صورة للمشروع</p>
                      <p className="text-gray-400 text-sm mt-2">JPG, PNG, GIF حتى 5MB</p>
                      <p className="text-gray-400 text-xs mt-1">الصورة ستساعد في تمييز مشروعك</p>
                    </motion.div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSubmitting || isUploadingImage}
                  />
                </div>

                {isUploadingImage && (
                  <motion.div
                    className="mt-4 bg-indigo-50 p-3 rounded-md border border-indigo-100"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center mb-1">
                      <svg className="animate-spin h-4 w-4 text-indigo-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-sm text-indigo-700 font-medium">
                        جارٍ {formData.thumbnail_url ? 'تحديث' : 'رفع'} الصورة... {uploadProgress}%
                      </p>
                    </div>
                    <div className="w-full bg-white rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        className="bg-indigo-500 h-2.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      ></motion.div>
                    </div>
                  </motion.div>
                )}

                {formData.thumbnail_url && (
                  <motion.div
                    className="mt-3 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.button
                      type="button"
                      onClick={handleOpenFileDialog}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isUploadingImage}
                    >
                      تغيير الصورة
                    </motion.button>
                  </motion.div>
                )}
              </div>

              {/* Project completion percentage */}
              <div className="mb-8">
                <label htmlFor="completion_percentage" className="block text-gray-700 font-medium mb-2">
                  نسبة إنجاز المشروع
                </label>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <input
                    type="range"
                    id="completion_percentage"
                    name="completion_percentage"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.completion_percentage}
                    onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    disabled={isSubmitting}
                  />
                  <div className="w-16 text-center">
                    <span className="text-gray-700 font-semibold">{formData.completion_percentage}%</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm mt-1">يمكنك تحديث نسبة إنجاز المشروع من هنا لتظهر في لوحة التحكم</p>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center space-x-4 rtl:space-x-reverse">
                <motion.button
                  type="button"
                  onClick={handleDelete}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="rounded-full h-5 w-5 border-2 border-r-transparent border-white inline-block mr-2"
                      />
                      جارٍ الحذف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5 ml-2" />
                      حذف المشروع
                    </>
                  )}
                </motion.button>

                <motion.button
                  type="submit"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || isUploadingImage}
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="rounded-full h-5 w-5 border-2 border-r-transparent border-white inline-block ml-2"
                      />
                      جارٍ الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 ml-2" />
                      حفظ التغييرات
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
} 