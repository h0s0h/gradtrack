'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Comment, User, Post } from '@/lib/supabase/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/AuthProvider';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { CodeBlock } from '@/components/common/CodeBlock';
import { getDatabase, ref, get } from 'firebase/database';
import { firebaseApp } from '@/lib/firebase/client';

interface CommentWithDetails extends Comment {
  post: Post;
  user: User;
  code_language?: string;
}

interface CodeSnippet {
  content: string;
  language: string;
  createdAt: number;
  updatedAt: number;
  projectId: string;
  type: string;
  userId: string;
}

export default function CommentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState<CommentWithDetails | null>(null);
  const [codeSnippet, setCodeSnippet] = useState<CodeSnippet | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const fetchComment = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('comments')
          .select('*, post:post_id(*), user:user_id(*)')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching comment:', error);
          setError('لم يتم العثور على التعليق');
        } else {
          setComment(data);
          
          if (data && data.code_snippet && data.code_snippet.startsWith('code_')) {
            await fetchCodeFromFirebase(data.code_snippet);
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setError('حدث خطأ أثناء جلب التعليق');
      } finally {
        setLoading(false);
      }
    };

    fetchComment();
  }, [id, router, user]);

  const fetchCodeFromFirebase = async (codeId: string) => {
    try {
      const db = getDatabase(firebaseApp);
      const codeRef = ref(db, `codes/${codeId}`);
      const snapshot = await get(codeRef);
      
      if (snapshot.exists()) {
        setCodeSnippet(snapshot.val());
      } else {
        console.error('Code snippet not found in Firebase');
      }
    } catch (error) {
      console.error('Error fetching code from Firebase:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy - HH:mm', { locale: arSA });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-20">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-20 text-center">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">خطأ</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  if (comment) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-20">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="border-r-4 border-indigo-500 pr-4 mb-4">
            <h2 className="text-xl font-semibold mb-2">التعليق المطلوب</h2>
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center ml-3">
                {comment.user?.avatar_url ? (
                  <img src={comment.user.avatar_url} alt={comment.user.full_name} className="w-10 h-10 rounded-full" />
                ) : (
                  <span className="text-indigo-600 font-bold">{comment.user?.full_name?.[0] || '?'}</span>
                )}
              </div>
              <div>
                <p className="font-medium">{comment.user?.full_name || 'مستخدم'}</p>
                <p className="text-sm text-gray-500">{formatDate(comment.created_at)}</p>
              </div>
            </div>
          </div>
          
          <div className="text-gray-800 whitespace-pre-line mb-6 p-4 bg-gray-50 rounded-lg" dir="rtl">
            {comment.content}
          </div>
          
          {comment.image_url && (
            <div className="mb-6">
              <img 
                src={comment.image_url} 
                alt="صورة التعليق" 
                className="max-w-full rounded-lg mx-auto"
                style={{ maxHeight: "300px" }}
              />
            </div>
          )}
          
          {codeSnippet && (
            <div className="mb-6">
              <CodeBlock 
                code={codeSnippet.content} 
                language={codeSnippet.language || 'typescript'} 
                initiallyExpanded={true}
              />
            </div>
          )}
          
          {comment.code_snippet && !comment.code_snippet.startsWith('code_') && (
            <div className="mb-6">
              <CodeBlock 
                code={comment.code_snippet} 
                language={comment.code_language || 'typescript'} 
                initiallyExpanded={true}
              />
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                على منشور: <span className="font-medium">{comment.post?.content?.substring(0, 50)}...</span>
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/projects/post/${comment.post_id}?commentId=${id}`)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                الانتقال إلى المنشور
              </button>
              
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                العودة
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 mt-20 text-center">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-medium mb-4">جاري البحث عن التعليق...</h2>
        <div className="animate-pulse flex justify-center">
          <div className="h-4 w-4 mx-1 bg-indigo-600 rounded-full"></div>
          <div className="h-4 w-4 mx-1 bg-indigo-600 rounded-full animation-delay-200"></div>
          <div className="h-4 w-4 mx-1 bg-indigo-600 rounded-full animation-delay-400"></div>
        </div>
      </div>
    </div>
  );
}

