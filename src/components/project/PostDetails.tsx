'use client';

import { useState, useEffect } from 'react';
import { Post, User, Comment } from '@/lib/supabase/schema';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { ref, set, get, remove } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/cloudinary/cloudinaryService';
import { detectLanguage } from '@/utils/codeUtils';

interface ExtendedComment extends Comment {
  user: User;
  code_language?: string;
  codeData?: {
    content: string;
    language: string;
  };
}

interface PostWithDetails extends Post {
  user: User;
  comments: ExtendedComment[];
  codeData?: {
    content: string;
    language: string;
  };
}

interface PostDetailsProps {
  post: PostWithDetails;
  currentUserId?: string;
  currentUserName?: string;
  onPostDelete?: () => void;
  onPostUpdate?: (updatedPost: PostWithDetails) => void;
}

// دوال مساعدة للتعامل مع Firebase
const addData = async (path: string, data: any) => {
  try {
    if (!path || typeof path !== 'string') {
      throw new Error("Invalid path: Path must be a non-empty string");
    }
    
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid data: Data must be a non-empty object");
    }
    
    const dbRef = ref(database, path);
    await set(dbRef, data);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error);
    console.error("Error adding data to Firebase:", errorMessage);
    throw new Error(errorMessage);
  }
};

const getData = async (path: string) => {
  try {
    if (!path || typeof path !== 'string') {
      throw new Error("Invalid path: Path must be a non-empty string");
    }
    
    const dbRef = ref(database, path);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting data from Firebase:", error);
    throw error;
  }
};

const deleteData = async (path: string) => {
  try {
    if (!path || typeof path !== 'string') {
      throw new Error("Invalid path: Path must be a non-empty string");
    }
    
    const dbRef = ref(database, path);
    await remove(dbRef);
    return true;
  } catch (error) {
    console.error("Error deleting data from Firebase:", error);
    throw error;
  }
};

// حفظ كود في Firebase
const saveCodeSnippet = async ({
  content,
  language,
  relatedId,
  relatedType,
  createdBy,
  id,
}: {
  content: string;
  language: string;
  relatedId: string;
  relatedType: string;
  createdBy: string;
  id?: string;
}) => {
  try {
    const codeId = id ? id : `code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const path = `codes/${codeId}`;
    
    const codeData = {
      content,
      language,
      relatedId,
      relatedType,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        await addData(path, codeData);
        return codeId;
      } catch (error: unknown) {
        attempts++;
        if (attempts >= maxAttempts) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : String(error);
          throw new Error(`Failed to save code snippet after ${maxAttempts} attempts: ${errorMessage}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error("Failed to save code snippet after maximum attempts");
  } catch (error) {
    console.error("Error saving code snippet:", error);
    throw error;
  }
};

export default function PostDetails({
  post,
  currentUserId,
  currentUserName = 'مستخدم',
  onPostDelete,
  onPostUpdate
}: PostDetailsProps) {
  const [showCommentCodeInput, setShowCommentCodeInput] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentCode, setCommentCode] = useState('');
  const [commentCodeLanguage, setCommentCodeLanguage] = useState('typescript');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    // جلب أكواد التعليقات من Firebase
    const fetchCommentCodes = async () => {
      const updatedComments = await Promise.all(
        post.comments.map(async (comment) => {
          if (comment.code_snippet) {
            try {
              const codeData = await getData(`codes/${comment.code_snippet}`);
              if (codeData) {
                return {
                  ...comment,
                  codeData: {
                    content: codeData.content,
                    language: codeData.language
                  }
                };
              }
            } catch (err) {
              console.error('Error fetching comment code:', err);
            }
          }
          return comment;
        })
      );

      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          comments: updatedComments
        });
      }
    };

    fetchCommentCodes();
  }, [post.comments]);

  const handleDeletePost = async () => {
    if (!post || !currentUserId) return;
    
    if (window.confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
      try {
        // حذف الكود من Firebase إذا كان موجوداً
        if (post.code_snippet) {
          try {
            await deleteData(`codes/${post.code_snippet}`);
          } catch (err) {
            console.error('Error deleting code snippet:', err);
          }
        }

        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', post.id)
          .eq('user_id', currentUserId);

        if (error) throw error;

        toast.success('تم حذف المنشور بنجاح');
        onPostDelete?.();
      } catch (err) {
        console.error('Error deleting post:', err);
        toast.error('حدث خطأ أثناء حذف المنشور');
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('نوع الملف غير صالح. يرجى رفع صورة بتنسيق JPG أو PNG أو GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف كبير جدًا. الحد الأقصى هو 5 ميجابايت.');
      return;
    }

    try {
      setIsUploadingImage(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await uploadImage(base64, 'gradtrack');
        setCommentImage(result.url);
      };
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !post || !commentContent.trim()) return;

    try {
      setIsSubmittingComment(true);

      let codeSnippetId = null;
      if (showCommentCodeInput && commentCode.trim()) {
        codeSnippetId = await saveCodeSnippet({
          content: commentCode,
          language: commentCodeLanguage || detectLanguage(commentCode),
          relatedId: post.id,
          relatedType: 'comment',
          createdBy: currentUserId,
        });
      }

      const { data: newCommentData, error } = await supabase
        .from('comments')
        .insert({
          content: commentContent.trim(),
          post_id: post.id,
          user_id: currentUserId,
          project_id: post.project_id,
          code_snippet: codeSnippetId,
          code_language: commentCodeLanguage,
          image_url: commentImage
        })
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      if (post.user_id !== currentUserId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: post.user_id,
            type: 'comment',
            content: `علق ${currentUserName} على منشورك`,
            link: `/projects/post/${post.id}?comment=${newCommentData.id}`,
            post_id: post.id,
            comment_id: newCommentData.id,
            from_user_id: currentUserId
          });
      }

      const newComment: ExtendedComment = {
        ...newCommentData,
        user: newCommentData.user,
        code_language: commentCodeLanguage,
        codeData: codeSnippetId ? {
          content: commentCode,
          language: commentCodeLanguage
        } : undefined
      };

      const updatedPost = {
        ...post,
        comments: [...post.comments, newComment]
      };
      onPostUpdate?.(updatedPost);

      setCommentContent('');
      setCommentCode('');
      setCommentCodeLanguage('typescript');
      setShowCommentCodeInput(false);
      setCommentImage(null);
      toast.success('تم إضافة التعليق بنجاح');
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('حدث خطأ أثناء إضافة التعليق');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string, codeSnippetId: string | null) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;

    try {
      if (codeSnippetId) {
        try {
          await deleteData(`codes/${codeSnippetId}`);
        } catch (err) {
          console.error('Error deleting comment code:', err);
        }
      }

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      const updatedPost = {
        ...post,
        comments: post.comments.filter(comment => comment.id !== commentId)
      };
      onPostUpdate?.(updatedPost);
      toast.success('تم حذف التعليق بنجاح');
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error('حدث خطأ أثناء حذف التعليق');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start space-x-4 rtl:space-x-reverse mb-4">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            {post.user.avatar_url ? (
              <img
                src={post.user.avatar_url}
                alt={post.user.full_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-indigo-600 font-semibold text-lg">
                {post.user.full_name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex-grow">
          <h2 className="text-lg font-semibold text-gray-900">{post.user.full_name}</h2>
          <p className="text-sm text-gray-500">
            {format(new Date(post.created_at || ''), 'dd MMM yyyy - HH:mm', { locale: arSA })}
          </p>
        </div>
        
        {currentUserId === post.user_id && (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleDeletePost}
            >
              حذف
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="prose prose-indigo max-w-none">
          <p className="text-gray-800 whitespace-pre-wrap text-lg leading-relaxed">{post.content}</p>
        </div>

        {post.image_url && (
          <div className="mt-4">
            <img
              src={post.image_url}
              alt="صورة المنشور"
              className="rounded-lg max-h-[600px] w-full object-contain bg-gray-100 cursor-zoom-in hover:opacity-90 transition-opacity"
              onClick={() => window.open(post.image_url, '_blank')}
            />
          </div>
        )}

        {post.codeData && (
          <div className="mt-4 rounded-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
              <span className="text-white text-sm">{post.codeData.language}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(post.codeData?.content || '');
                  toast.success('تم نسخ الكود بنجاح');
                }}
                className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                نسخ
              </button>
            </div>
            <SyntaxHighlighter
              language={post.codeData.language}
              style={vscDarkPlus}
              showLineNumbers
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {post.codeData.content}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">التعليقات ({post.comments.length})</h3>
        
        {currentUserId && (
          <form onSubmit={handleAddComment} className="mb-6">
            <div className="flex gap-4">
              <div className="flex-grow">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="أضف تعليقاً..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                />

                {showCommentCodeInput && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <select
                        value={commentCodeLanguage}
                        onChange={(e) => setCommentCodeLanguage(e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="typescript">TypeScript</option>
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="csharp">C#</option>
                        <option value="cpp">C++</option>
                        <option value="php">PHP</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCommentCodeInput(false)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        إزالة الكود
                      </button>
                    </div>
                    <textarea
                      value={commentCode}
                      onChange={(e) => setCommentCode(e.target.value)}
                      placeholder="أدخل الكود هنا..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                      rows={5}
                      dir="ltr"
                    />
                  </div>
                )}

                <div className="mt-2 flex justify-between items-center">
                  <div className="flex gap-2">
                    {!showCommentCodeInput && (
                      <button
                        type="button"
                        onClick={() => setShowCommentCodeInput(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        إضافة كود
                      </button>
                    )}
                    <label className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4a.5.5 0 01-.5-.5v-6.5L8 8l3-3 4 4v6a.5.5 0 01-.5.5z" clipRule="evenodd" />
                      </svg>
                      إضافة صورة
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                      />
                    </label>
                  </div>
                  <Button
                    type="submit"
                    disabled={!commentContent.trim() || isSubmittingComment}
                  >
                    {isSubmittingComment ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-4 w-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        جارٍ الإرسال
                      </span>
                    ) : 'إرسال'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {post.comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-gray-50 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    {comment.user.avatar_url ? (
                      <img
                        src={comment.user.avatar_url}
                        alt={comment.user.full_name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-indigo-600 font-semibold">
                        {comment.user.full_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">{comment.user.full_name}</h4>
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.created_at), 'dd MMM yyyy - HH:mm', { locale: arSA })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>

                  {comment.image_url && (
                    <div className="mt-2">
                      <img
                        src={comment.image_url}
                        alt="صورة التعليق"
                        className="rounded-md max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(comment.image_url, '_blank')}
                      />
                    </div>
                  )}

                  {comment.codeData && (
                    <div className="mt-2 rounded-md overflow-hidden border border-gray-200">
                      <SyntaxHighlighter
                        language={comment.codeData.language}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          borderRadius: '0.375rem',
                        }}
                      >
                        {comment.codeData.content}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>

                {currentUserId === comment.user_id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id, comment.code_snippet || null)}
                    className="text-gray-500 hover:text-red-600"
                    title="حذف التعليق"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
