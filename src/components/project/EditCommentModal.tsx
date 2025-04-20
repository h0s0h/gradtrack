'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ref, get, set } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { uploadImage, deleteImage } from '@/lib/cloudinary/cloudinaryService';
import { Code, Image, Trash2 } from 'lucide-react';
import { CodeBlock } from '@/components/common/CodeBlock';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  code_snippet: string | null;
  image_url: string | null;
  image_public_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface EditCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  comment: Comment | null;
  userId: string;
  onCommentUpdated: (updatedComment: Comment) => void;
}

export default function EditCommentModal({
  isOpen,
  onClose,
  comment,
  userId,
  onCommentUpdated
}: EditCommentModalProps) {
  const [content, setContent] = useState('');
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeSnippetId, setCodeSnippetId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // تحميل بيانات التعليق عند فتح النافذة
  useEffect(() => {
    if (isOpen && comment) {
      setContent(comment.content || '');
      setOriginalImageUrl(comment.image_url);
      setImagePreview(comment.image_url);
      setCodeSnippetId(comment.code_snippet);
      
      // جلب الكود من Firebase إذا كان موجوداً
      if (comment.code_snippet) {
        fetchCodeSnippet(comment.code_snippet);
      } else {
        setShowCodeEditor(false);
        setCodeContent('');
        setCodeLanguage('javascript');
      }
    }
  }, [isOpen, comment]);

  const fetchCodeSnippet = async (codeId: string) => {
    try {
      const snippetRef = ref(database, `codes/${codeId}`);
      const snapshot = await get(snippetRef);

      if (snapshot.exists()) {
        const codeData = snapshot.val();
        setCodeContent(codeData.content || '');
        setCodeLanguage(codeData.language || 'javascript');
        setShowCodeEditor(true);
      } else {
        setShowCodeEditor(false);
        setCodeContent('');
        setCodeLanguage('javascript');
      }
    } catch (error) {
      console.error('خطأ في جلب الكود من Firebase:', error);
      toast.error('حدث خطأ أثناء جلب الكود');
    }
  };

  const saveCodeSnippet = async (content: string, language: string, existingCodeId?: string) => {
    try {
      if (!content.trim()) return null;
      
      const codeId = existingCodeId || `code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const path = `codes/${codeId}`;
      
      const codeData: any = {
        content,
        language,
        relatedId: comment?.id || '',
        relatedType: 'comment',
        createdBy: userId,
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
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!comment) return;
    
    if (!content.trim()) {
      toast.error('محتوى التعليق مطلوب');
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading('جاري حفظ التعديلات...');

      // رفع الصورة إذا تم تغييرها
      let imageUrl = originalImageUrl;
      let imagePublicId = comment.image_public_id;

      if (imageFile) {
        // حذف الصورة القديمة إذا كانت موجودة
        if (originalImageUrl && comment.image_public_id) {
          try {
            await deleteImage(comment.image_public_id);
          } catch (err) {
            console.error('خطأ في حذف الصورة القديمة:', err);
          }
        }

        // رفع الصورة الجديدة
        const uploadResult = await uploadImage(imageFile, 'comments');
        imageUrl = uploadResult.url;
        imagePublicId = uploadResult.publicId;
      } else if (originalImageUrl && imagePreview === null) {
        // إذا كانت هناك صورة أصلية وتم إزالتها
        if (comment.image_public_id) {
          try {
            await deleteImage(comment.image_public_id);
          } catch (err) {
            console.error('خطأ في حذف الصورة:', err);
          }
        }
        imageUrl = null;
        imagePublicId = null;
      }

      // تحديث الكود إذا لزم الأمر
      let newCodeSnippetId = codeSnippetId;
      if (showCodeEditor) {
        if (codeContent.trim()) {
          // تحديث أو إنشاء كود جديد
          newCodeSnippetId = await saveCodeSnippet(codeContent, codeLanguage, codeSnippetId || undefined);
        }
      } else if (codeSnippetId) {
        // إذا تم إخفاء محرر الكود وكان هناك كود سابق
        newCodeSnippetId = null;
      }

      // تحديث التعليق في قاعدة البيانات
      const { data, error } = await supabase
        .from('comments')
        .update({
          content,
          code_snippet: newCodeSnippetId,
          image_url: imageUrl,
          image_public_id: imagePublicId,
          updated_at: new Date().toISOString()
        })
        .eq('id', comment.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('تم تعديل التعليق بنجاح');
      onCommentUpdated(data);
      onClose();
    } catch (err: any) {
      console.error('خطأ في تعديل التعليق:', err);
      toast.error(err.message || 'حدث خطأ أثناء تعديل التعليق');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">تعديل التعليق</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={isSubmitting}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نص التعليق</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب تعليقك هنا..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">صورة (اختياري)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  اختر صورة
                </button>
                {imagePreview && (
                  <button
                    type="button"
                    className="px-2 py-1 text-sm border border-red-300 rounded-md bg-white text-red-600 hover:bg-red-50 flex items-center gap-1"
                    onClick={handleRemoveImage}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    إزالة
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
                  className="w-full h-auto max-h-[200px] object-contain"
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">كود برمجي (اختياري)</label>
              <button
                type="button"
                className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                onClick={() => setShowCodeEditor(!showCodeEditor)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
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
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
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
                    rows={6}
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
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            onClick={onClose}
            disabled={isSubmitting}
          >
            إلغاء
          </button>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            حفظ التعديلات
            {isSubmitting && (
              <span className="mr-2 inline-block">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 