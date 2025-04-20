'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ref, get, set } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';
import { uploadImage, deleteImage } from '@/lib/cloudinary/cloudinaryService';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArrowLeft, Code, Image, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { CodeBlock } from '@/components/common/CodeBlock';

export default function EditPostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // لغات البرمجة المدعومة
  const programmingLanguages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'cpp', label: 'C++' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'rust', label: 'Rust' },
    { value: 'sql', label: 'SQL' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'bash', label: 'Bash' },
  ];

  useEffect(() => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لتعديل المنشور');
      router.push('/login');
      return;
    }

    fetchPost();
  }, [user, postId]);

  const fetchPost = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('لم يتم العثور على المنشور');
      }

      // التحقق من أن المستخدم هو مالك المنشور
      if (data.user_id !== user?.id) {
        toast.error('لا يمكنك تعديل منشور لا تملكه');
        router.push(`/projects/${data.project_id}`);
        return;
      }

      setPost(data);
      setContent(data.content || '');
      setProjectId(data.project_id);
      setOriginalImageUrl(data.image_url);
      setImagePreview(data.image_url);

      // جلب الكود من Firebase إذا كان موجوداً
      if (data.code_snippet) {
        try {
          const codeSnippet = await getCodeSnippet(data.code_snippet);
          if (codeSnippet) {
            setCodeContent(codeSnippet.content || '');
            setCodeLanguage(codeSnippet.language || 'javascript');
            setShowCodeEditor(true);
          }
        } catch (err) {
          console.error('خطأ في جلب الكود:', err);
        }
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('خطأ في جلب بيانات المنشور:', err);
      setError(err.message || 'حدث خطأ أثناء جلب بيانات المنشور');
      setIsLoading(false);
    }
  };

  const getCodeSnippet = async (codeId: string) => {
    try {
      const snippetRef = ref(database, `codes/${codeId}`);
      const snapshot = await get(snippetRef);

      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        console.warn(`لم يتم العثور على الكود بالمعرف: ${codeId}`);
        return null;
      }
    } catch (error) {
      console.error('خطأ في استرجاع الكود من Firebase:', error);
      throw error;
    }
  };

  const saveCodeSnippet = async (content: string, language: string, existingCodeId?: string) => {
    try {
      const codeId = existingCodeId || `code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const path = `codes/${codeId}`;
      
      const codeData: any = {
        content,
        language,
        relatedId: postId,
        relatedType: 'post',
        createdBy: user?.id || 'unknown',
        updatedAt: Date.now(),
      };
      
      if (!existingCodeId) {
        codeData.createdAt = Date.now();
      }
      
      const dbRef = ref(database, path);
      await set(dbRef, codeData);
      
      return codeId;
    } catch (error) {
      console.error('خطأ في حفظ الكود:', error);
      throw error;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف وحجمه
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {  // 5 ميجابايت كحد أقصى
      toast.error('حجم الصورة كبير جداً. الحد الأقصى هو 5 ميجابايت');
      return;
    }

    setImageFile(file);

    // عرض معاينة الصورة
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('يجب تسجيل الدخول لتعديل المنشور');
      return;
    }

    if (!content.trim()) {
      toast.error('محتوى المنشور مطلوب');
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading('جاري حفظ التعديلات...');

      // رفع الصورة إذا تم تغييرها
      let imageUrl = originalImageUrl;
      let imagePublicId = post.image_public_id;

      if (imageFile) {
        // حذف الصورة القديمة إذا كانت موجودة
        if (originalImageUrl && post.image_public_id) {
          try {
            await deleteImage(post.image_public_id);
          } catch (err) {
            console.error('خطأ في حذف الصورة القديمة:', err);
          }
        }

        // رفع الصورة الجديدة
        const uploadResult = await uploadImage(imageFile, 'posts');
        imageUrl = uploadResult.url;
        imagePublicId = uploadResult.publicId;
      } else if (originalImageUrl && imagePreview === null) {
        // إذا كانت هناك صورة أصلية وتم إزالتها
        if (post.image_public_id) {
          try {
            await deleteImage(post.image_public_id);
          } catch (err) {
            console.error('خطأ في حذف الصورة:', err);
          }
        }
        imageUrl = null;
        imagePublicId = null;
      }

      // تحديث الكود إذا لزم الأمر
      let codeSnippetId = post.code_snippet;
      if (showCodeEditor) {
        if (codeContent.trim()) {
          // تحديث أو إنشاء كود جديد
          codeSnippetId = await saveCodeSnippet(codeContent, codeLanguage, post.code_snippet);
        }
      } else if (post.code_snippet) {
        // إذا تم إخفاء محرر الكود وكان هناك كود سابق
        codeSnippetId = null;
      }

      // تحديث المنشور في قاعدة البيانات
      const { data, error } = await supabase
        .from('posts')
        .update({
          content,
          code_snippet: codeSnippetId,
          image_url: imageUrl,
          image_public_id: imagePublicId,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .eq('user_id', user.id)
        .select();

      if (error) {
        throw error;
      }

      toast.success('تم تعديل المنشور بنجاح');
      
      // العودة إلى صفحة المشروع
      if (projectId) {
        router.push(`/projects/${projectId}`);
      }
    } catch (err: any) {
      console.error('خطأ في تعديل المنشور:', err);
      toast.error(err.message || 'حدث خطأ أثناء تعديل المنشور');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="border-b p-4">
            <h2 className="text-xl font-bold text-red-600">حدث خطأ</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-700 mb-4">{error}</p>
            <Link href={projectId ? `/projects/${projectId}` : '/projects'}>
              <button className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50">العودة</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="bg-white shadow-lg rounded-lg">
        <div className="border-b p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">تعديل المنشور</h2>
            <Link href={projectId ? `/projects/${projectId}` : '/projects'}>
              <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100">
                <ArrowLeft size={16} /> العودة
              </button>
            </Link>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">محتوى المنشور</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب محتوى المنشور هنا..."
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">صورة المنشور (اختياري)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image size={16} /> اختر صورة
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      className="px-3 py-1 border border-red-300 text-red-600 rounded-md hover:bg-red-50 flex items-center gap-1"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 size={16} /> إزالة
                    </button>
                  )}
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
              />
              {imagePreview && (
                <div className="mt-2 rounded-md overflow-hidden border border-gray-200">
                  <img
                    src={imagePreview}
                    alt="معاينة الصورة"
                    className="w-full h-auto max-h-[300px] object-contain"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">كود برمجي (اختياري)</label>
                <button
                  type="button"
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
                  onClick={() => setShowCodeEditor(!showCodeEditor)}
                >
                  <Code size={16} />
                  {showCodeEditor ? 'إخفاء محرر الكود' : 'إضافة كود'}
                </button>
              </div>
              
              {showCodeEditor && (
                <div className="space-y-3 border border-gray-200 rounded-md p-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">لغة البرمجة</label>
                    <select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      {programmingLanguages.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الكود</label>
                    <textarea
                      value={codeContent}
                      onChange={(e) => setCodeContent(e.target.value)}
                      placeholder="اكتب الكود هنا..."
                      rows={8}
                      className="w-full p-3 font-mono border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  {codeContent && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">معاينة الكود</label>
                      <div className="border border-gray-300 rounded-md overflow-hidden">
                        <CodeBlock
                          code={codeContent}
                          language={codeLanguage}
                          showLineNumbers={true}
                          maxHeight="250px"
                          initiallyExpanded={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href={projectId ? `/projects/${projectId}` : '/projects'}>
                <button type="button" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">إلغاء</button>
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
              >
                <Save size={16} />
                حفظ التعديلات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 