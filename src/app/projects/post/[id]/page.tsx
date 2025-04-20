'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Post, User } from '@/lib/supabase/schema';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Toaster, toast } from 'sonner';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface PostWithDetails extends Post {
  user: User;
  codeData?: {
    content: string;
    language: string;
  };
}

export default function PostPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<PostWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select(`
            *,
            user:user_id (
              id,
              full_name,
              avatar_url,
              email
            ),
            project:project_id (*)
          `)
          .eq('id', id)
          .single();

        if (postError) throw postError;
        if (!postData) throw new Error('المنشور غير موجود');
        
        setPost(postData as PostWithDetails);

        // جلب كود المنشور إذا وجد
        if (postData.code_snippet) {
          try {
            console.log('Fetching code snippet with ID:', postData.code_snippet);
            const codeRef = ref(database, `codes/${postData.code_snippet}`);
            const snapshot = await get(codeRef);
            
            if (snapshot.exists()) {
              const codeData = snapshot.val();
              console.log('Code data retrieved successfully:', codeData.language);
              setPost(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  codeData: {
                    content: codeData.content || '',
                    language: codeData.language || 'typescript'
                  }
                };
              });
            } else {
              console.warn('No code data found for ID:', postData.code_snippet);
            }
          } catch (codeError) {
            console.error('Error fetching post code:', codeError);
            toast.error('حدث خطأ أثناء تحميل الكود');
          }
        }

      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب المنشور');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id]);

  const handleDeletePost = async () => {
    if (!post || !user) return;
    
    if (window.confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast.success('تم حذف المنشور بنجاح');
        router.push(`/projects/${post.project_id}`);
      } catch (err) {
        console.error('Error deleting post:', err);
        toast.error('حدث خطأ أثناء حذف المنشور');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">خطأ</h1>
        <p className="text-gray-600 mb-4">{error || 'المنشور غير موجود'}</p>
        <Button
          onClick={() => router.back()}
          variant="outline"
        >
          العودة
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pt-20">
      <Toaster position="top-center" expand={true} richColors />
      
      <div className="mb-6 flex justify-between items-center">
        <Link
          href={`/projects/${post.project_id}`}
          className={cn(
            "inline-flex items-center px-4 py-2 rounded-md transition-colors rtl",
            "bg-indigo-600 text-white hover:bg-indigo-700"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          عرض المشروع
        </Link>

        {user && post.user_id === user.id && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'إلغاء التعديل' : 'تعديل'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePost}
            >
              حذف
            </Button>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          {/* معلومات المنشور */}
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
                {format(new Date(post.created_at), 'dd MMM yyyy - HH:mm', { locale: arSA })}
              </p>
            </div>
          </div>

          {/* محتوى المنشور */}
          <div className="prose prose-indigo max-w-none">
            <p className="text-gray-800 whitespace-pre-wrap text-lg leading-relaxed">{post.content}</p>
          </div>

          {/* صورة المنشور */}
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

          {/* كود المنشور */}
          {post.codeData && post.codeData.content && (
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
                    <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                    <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
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
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}
              >
                {post.codeData.content}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}