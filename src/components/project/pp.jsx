'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ref, get, remove, set } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';
import Image from 'next/image';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { notifyNewPost, notifyNewComment } from '@/lib/notifications/notificationService';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import HighlightedPost from './HighlightedPost';
import { toast } from 'sonner';
import { PostWithDetails } from '@/types/posts';
import PostView from './PostView';

interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}

interface PostView {
  id: string;
  post_id: string;
  user_id: string;
  viewed_at: string;
  user?: User;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  code_snippet: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  codeData?: {
    content: string;
    language: string;
    [key: string]: any;
  };
}

interface PostsSectionProps {
  projectId: string;
  currentUserId: string;
  currentUserName?: string;
  selectedPostId?: string;
}

// دالة لتنسيق التاريخ
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd MMM yyyy - HH:mm', { locale: arSA });
  } catch (error) {
    console.error('خطأ في تنسيق التاريخ:', error);
    return dateString;
  }
};

export default function PostsSection({
  projectId,
  currentUserId,
  currentUserName = 'مستخدم',
  selectedPostId
}: PostsSectionProps) {
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewersModalOpen, setViewersModalOpen] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState<string>('');
  const [commentCode, setCommentCode] = useState<string>('');
  const [commentCodeLanguage, setCommentCodeLanguage] = useState<string>('javascript');
  const [showCommentCodeInput, setShowCommentCodeInput] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithDetails | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchPosts();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedPostId && posts.length > 0) {
      const post = posts.find(p => p.id === selectedPostId);
      if (post) {
        setSelectedPost(post);
      }
    }
  }, [selectedPostId, posts]);

  // دالة لجلب المنشورات من Supabase
  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // جلب المنشورات مع معلومات المستخدم
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          user:user_id(id, full_name, avatar_url, email)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('خطأ في جلب المنشورات من Supabase:', postsError);
        setLoading(false);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // جلب التعليقات لكل المنشورات
      const postIds = postsData.map(post => post.id);
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          user:user_id(id, full_name, avatar_url, email)
        `)
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('خطأ في جلب التعليقات من Supabase:', commentsError);
      }

      // جلب مشاهدات المنشورات
      const { data: viewsData, error: viewsError } = await supabase
        .from('post_views')
        .select(`
          *,
          user:user_id(id, full_name, avatar_url, email)
        `)
        .in('post_id', postIds);

      if (viewsError) {
        console.error('خطأ في جلب مشاهدات المنشورات من Supabase:', viewsError);
      }

      // تسجيل مشاهدة المستخدم الحالي للمنشورات
      if (currentUserId) {
        const viewsToInsert = postIds.map(postId => ({
          post_id: postId,
          user_id: currentUserId
        }));

        await supabase
          .from('post_views')
          .upsert(viewsToInsert, { onConflict: 'post_id,user_id' });
      }

      // تنظيم التعليقات والمشاهدات حسب المنشور
      const commentsByPostId = (commentsData || []).reduce((acc, comment) => {
        if (!acc[comment.post_id]) {
          acc[comment.post_id] = [];
        }
        acc[comment.post_id].push(comment);
        return acc;
      }, {});

      const viewsByPostId = (viewsData || []).reduce((acc, view) => {
        if (!acc[view.post_id]) {
          acc[view.post_id] = [];
        }
        acc[view.post_id].push(view);
        return acc;
      }, {});

      // جلب بيانات الكود من Firebase لكل منشور وتعليق
      const postsWithDetails = await Promise.all(
        postsData.map(async (post) => {
          // جلب كود المنشور إذا وجد
          let postCodeData = null;
          if (post.code_snippet) {
            try {
              postCodeData = await getCodeSnippet(post.code_snippet);
            } catch (err) {
              console.warn('خطأ في جلب كود المنشور:', err);
            }
          }

          // جلب أكواد التعليقات إذا وجدت
          const comments = commentsByPostId[post.id] || [];
          const commentsWithCode = await Promise.all(
            comments.map(async (comment) => {
              let commentCodeData = null;
              if (comment.code_snippet) {
                try {
                  commentCodeData = await getCodeSnippet(comment.code_snippet);
                } catch (err) {
                  console.warn('خطأ في جلب كود التعليق:', err);
                }
              }
              return {
                ...comment,
                codeData: commentCodeData
              };
            })
          );

          return {
            ...post,
            comments: commentsWithCode,
            views: viewsByPostId[post.id] || [],
            viewers: (viewsByPostId[post.id] || []).map(view => view.user),
            codeData: postCodeData
          };
        })
      );

      setPosts(postsWithDetails);
      setLoading(false);
    } catch (err) {
      console.error('خطأ عام أثناء جلب المنشورات:', err);
      setLoading(false);
      toast.error('حدث خطأ أثناء جلب المنشورات');
    }
  };

  // دالة لجلب الكود من Firebase
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

  // دالة لحذف الكود من Firebase
  const deleteCodeSnippet = async (codeId: string) => {
    try {
      const snippetRef = ref(database, `codes/${codeId}`);
      await remove(snippetRef);
      console.log(`تم حذف الكود بالمعرف: ${codeId}`);
    } catch (error) {
      console.error('خطأ في حذف الكود من Firebase:', error);
      throw error;
    }
  };

  // دالة لتخزين كود التعليق في Firebase
  const storeCommentCodeSnippet = async (content: string, language: string) => {
    try {
      // إنشاء معرف فريد للكود
      const codeId = `code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const path = `codes/${codeId}`;
      
      // تخزين الكود في Firebase
      const dbRef = ref(database, path);
      await set(dbRef, {
        content,
        language,
        userId: currentUserId,
        projectId: projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        type: 'comment' // لتمييز الأكواد المرتبطة بالتعليقات
      });
      
      return codeId;
    } catch (error) {
      console.error('خطأ في تخزين كود التعليق:', error);
      throw error;
    }
  };

  // دالة حذف منشور مع حذف الكود من Firebase إن وجد
  const handleDeletePost = async (postId: string, codeSnippetId: string | null) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟ سيتم حذف جميع التعليقات المرتبطة به.')) {
      return;
    }

    try {
      // حذف المنشور من Supabase
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('خطأ في حذف المنشور من Supabase:', error);
        return;
      }

      // حذف الكود من Firebase إذا كان موجودًا
      if (codeSnippetId) {
        await deleteCodeSnippet(codeSnippetId);
      }

      // حذف أكواد التعليقات المرتبطة بالمنشور
      const post = posts.find(p => p.id === postId);
      if (post) {
        for (const comment of post.comments) {
          if (comment.code_snippet) {
            try {
              await deleteCodeSnippet(comment.code_snippet);
            } catch (err) {
              console.warn('خطأ في حذف كود التعليق:', err);
            }
          }
        }
      }

      // تحديث قائمة المنشورات المحلية بعد الحذف
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      
      console.log('تم حذف المنشور بنجاح');
    } catch (err) {
      console.error('خطأ أثناء عملية الحذف:', err);
    }
  };

  // دالة تعديل المنشور
  const handleUpdatePost = async (postId: string, updatedFields: Partial<PostWithDetails>) => {
    try {
      // تحديث المنشور في Supabase
      const { data, error } = await supabase
        .from('posts')
        .update({
          ...updatedFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .select();

      if (error) {
        console.error('خطأ في تحديث المنشور على Supabase:', error);
        return;
      }

      // تحديث المنشور في الواجهة
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, ...updatedFields, updated_at: new Date().toISOString() } 
            : post
        )
      );

      console.log('تم تعديل المنشور بنجاح:', data);
    } catch (err) {
      console.error('خطأ أثناء تعديل المنشور:', err);
    }
  };

  // دالة إضافة تعليق جديد
  const handleAddComment = async (postId: string) => {
    if (!commentContent.trim()) {
      return;
    }

    try {
      setIsSubmittingComment(true);

      // تخزين كود التعليق في Firebase إذا وجد
      let codeSnippetId = null;
      if (showCommentCodeInput === postId && commentCode.trim()) {
        codeSnippetId = await storeCommentCodeSnippet(
          commentCode,
          commentCodeLanguage
        );
      }

      // إضافة التعليق إلى Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: commentContent,
          code_snippet: codeSnippetId,
          image_url: null, // يمكن إضافة دعم الصور لاحقًا
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          user:user_id(id, full_name, avatar_url, email)
        `)
        .single();

      if (error) {
        console.error('خطأ في إضافة التعليق إلى Supabase:', error);
        return;
      }

      // إضافة التعليق إلى المنشور في الواجهة
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            const newComment = {
              ...data,
              codeData: codeSnippetId ? {
                content: commentCode,
                language: commentCodeLanguage
              } : null
            };
            return {
              ...post,
              comments: [...post.comments, newComment]
            };
          }
          return post;
        })
      );

      // إرسال إشعار بالتعليق الجديد
      await notifyNewComment(
        postId,
        data.id,
        currentUserId,
        currentUserName
      );

      // إعادة تعيين حقول التعليق
      setCommentContent('');
      setCommentCode('');
      setCommentCodeLanguage('javascript');
      setShowCommentCodeInput(null);

      console.log('تم إضافة التعليق بنجاح');
    } catch (err) {
      console.error('خطأ أثناء إضافة التعليق:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // دالة حذف تعليق
  const handleDeleteComment = async (commentId: string, codeSnippetId: string | null) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
      return;
    }

    try {
      // حذف التعليق من Supabase
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('خطأ في حذف التعليق من Supabase:', error);
        return;
      }

      // حذف الكود من Firebase إذا كان موجودًا
      if (codeSnippetId) {
        await deleteCodeSnippet(codeSnippetId);
      }

      // تحديث قائمة التعليقات في الواجهة
      setPosts(prevPosts => 
        prevPosts.map(post => ({
          ...post,
          comments: post.comments.filter(comment => comment.id !== commentId)
        }))
      );

      console.log('تم حذف التعليق بنجاح');
    } catch (err) {
      console.error('خطأ أثناء حذف التعليق:', err);
    }
  };

  // دالة تعديل تعليق
  const handleUpdateComment = async (commentId: string, newContent: string) => {
    try {
      // تحديث التعليق في Supabase
      const { data, error } = await supabase
        .from('comments')
        .update({
          content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select();

      if (error) {
        console.error('خطأ في تحديث التعليق على Supabase:', error);
        return;
      }

      // تحديث التعليق في الواجهة
      setPosts(prevPosts => 
        prevPosts.map(post => ({
          ...post,
          comments: post.comments.map(comment => 
            comment.id === commentId 
              ? { ...comment, content: newContent, updated_at: new Date().toISOString() } 
              : comment
          )
        }))
      );

      console.log('تم تعديل التعليق بنجاح:', data);
    } catch (err) {
      console.error('خطأ أثناء تعديل التعليق:', err);
    }
  };

  // تحويل URL الصورة إلى URL كلاوديناري إذا لم يكن بالفعل
  const getCloudinaryUrl = (url: string | null) => {
    if (!url) return null;
    
    // التحقق مما إذا كان URL بالفعل من Cloudinary
    if (url.includes('cloudinary.com')) {
      return url;
    }
    
    // إذا كان URL عاديًا، يمكننا إضافة معلمات Cloudinary للتحسين
    // في حالة استخدام بيئة Cloudinary
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'default';
      if (url.startsWith('http')) {
        // استخدام fetch remote المدعوم من كلاوديناري
        return `https://res.cloudinary.com/${cloudName}/image/fetch/f_auto,q_auto/${encodeURIComponent(url)}`;
      }
      return url; // إرجاع URL الأصلي إذا لم نتمكن من تحويله
    } catch (error) {
      console.error('خطأ في تحويل URL الصورة:', error);
      return url;
    }
  };

  // تحديث المنشور
  const handlePostUpdate = (updatedPost: PostWithDetails) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    );
    if (selectedPost?.id === updatedPost.id) {
      setSelectedPost(updatedPost);
    }
  };

  // حذف المنشور
  const handlePostDelete = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    if (selectedPost?.id === postId) {
      setSelectedPost(null);
    }
  };

  // واجهة العرض
  if (loading) return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      <p className="mr-3 text-lg">جارِ التحميل...</p>
    </div>
  );

  if (!posts.length) return (
    <div className="p-6 text-center bg-white rounded-lg shadow">
      <p className="text-lg text-gray-600">لا توجد منشورات بعد. كن أول من يشارك في هذا المشروع!</p>
    </div>
  );

  // إذا كان هناك منشور محدد، نعرض تفاصيله فقط
  if (selectedPost) {
    return (
      <PostView
        post={selectedPost}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onPostUpdate={handlePostUpdate}
        onPostDelete={() => handlePostDelete(selectedPost.id)}
      />
    );
  }

  // عرض قائمة المنشورات
  return (
    <div className="space-y-6">
      <HighlightedPost 
        posts={posts} 
        onHighlight={setHighlightedPostId}
      />
      {posts.map((post) => (
        <div
          key={post.id}
          id={`post-${post.id}`}
          className={`bg-white rounded-lg shadow-md p-6 transition-all duration-300 ${
            highlightedPostId === post.id ? 'ring-2 ring-indigo-500' : ''
          }`}
        >
          {/* رأس المنشور مع معلومات المستخدم */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center">
              {post.user?.avatar_url ? (
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img 
                    src={post.user.avatar_url} 
                    alt={post.user.full_name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-800 font-semibold">
                    {post.user?.full_name?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              <div className="mr-3">
                <h3 className="font-semibold text-gray-900">{post.user?.full_name}</h3>
                <p className="text-xs text-gray-500">
                  {new Date(post.created_at || '').toLocaleString('ar-SA')}
                  {post.updated_at && post.updated_at !== post.created_at && ' (تم التعديل)'}
                </p>
              </div>
            </div>
            
            {/* أزرار التعديل والحذف */}
            {post.user_id === currentUserId && (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const newContent = prompt('أدخل المحتوى الجديد:', post.content);
                    if (newContent && newContent !== post.content) {
                      handleUpdatePost(post.id, { content: newContent });
                    }
                  }}
                  className="p-1 text-gray-500 hover:text-indigo-600"
                  title="تعديل المنشور"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeletePost(post.id, post.code_snippet)}
                  className="p-1 text-gray-500 hover:text-red-600"
                  title="حذف المنشور"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* محتوى المنشور */}
          <div className="p-4">
            <p className="text-gray-800 whitespace-pre-line">{post.content}</p>
            
            {/* عرض الصورة إن وُجدت */}
            {post.image_url && (
              <div className="mt-3 rounded-md overflow-hidden">
                <img 
                  src={getCloudinaryUrl(post.image_url)} 
                  alt="صورة المنشور" 
                  className="w-full object-cover max-h-96"
                />
              </div>
            )}
            
            {/* عرض الكود إن وُجد */}
            {post.codeData && (
              <div className="mt-4 rounded-md overflow-hidden">
                <div className="bg-gray-800 text-white text-xs py-1 px-3 flex justify-between items-center">
                  <span>{post.codeData.language || 'code'}</span>
                </div>
                <SyntaxHighlighter
                  language={post.codeData.language || 'javascript'}
                  style={tomorrow}
                  customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem' }}
                >
                  {post.codeData.content}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
          
          {/* معلومات المشاهدات */}
          <div className="px-4 py-2 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
            <button
              onClick={() => setViewersModalOpen(post.id)}
              className="hover:text-indigo-600 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              {post.viewers.length} مشاهدة
            </button>
            <span>{post.comments.length} تعليق</span>
          </div>
          
          {/* نافذة عرض المشاهدين */}
          {viewersModalOpen === post.id && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[80vh] overflow-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">المشاهدون</h3>
                  <button
                    onClick={() => setViewersModalOpen(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {post.viewers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">لا يوجد مشاهدون بعد</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {post.viewers.map((viewer) => (
                      <li key={viewer.id} className="py-3 flex items-center">
                        {viewer.avatar_url ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img 
                              src={viewer.avatar_url} 
                              alt={viewer.full_name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-800 font-semibold">
                              {viewer.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <span className="mr-3">{viewer.full_name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          
          {/* قسم التعليقات */}
          <div className="border-t border-gray-100">
            {/* عرض التعليقات */}
            {post.comments.length > 0 && (
              <div className="divide-y divide-gray-100">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="p-4">
                    <div className="flex justify-between">
                      <div className="flex items-start">
                        {comment.user?.avatar_url ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img 
                              src={comment.user.avatar_url} 
                              alt={comment.user.full_name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-800 font-semibold">
                              {comment.user?.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <div className="mr-3 flex-1">
                          <div className="flex items-center">
                            <h4 className="font-semibold text-gray-900">{comment.user?.full_name}</h4>
                            <span className="text-xs text-gray-500 mr-2">
                              {new Date(comment.created_at).toLocaleString('ar-SA')}
                              {comment.updated_at && comment.updated_at !== comment.created_at && ' (تم التعديل)'}
                            </span>
                          </div>
                          <p className="text-gray-800 mt-1 whitespace-pre-line">{comment.content}</p>
                          
                          {/* عرض الصورة في التعليق إن وُجدت */}
                          {comment.image_url && (
                            <div className="mt-2 rounded-md overflow-hidden">
                              <img 
                                src={getCloudinaryUrl(comment.image_url)} 
                                alt="صورة التعليق" 
                                className="max-w-full max-h-60 object-cover"
                              />
                            </div>
                          )}
                          
                          {/* عرض الكود في التعليق إن وُجد */}
                          {comment.codeData && (
                            <div className="mt-2 rounded-md overflow-hidden">
                              <div className="bg-gray-800 text-white text-xs py-1 px-3 flex justify-between items-center">
                                <span>{comment.codeData.language || 'code'}</span>
                              </div>
                              <SyntaxHighlighter
                                language={comment.codeData.language || 'javascript'}
                                style={tomorrow}
                                customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem' }}
                              >
                                {comment.codeData.content}
                              </SyntaxHighlighter>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* أزرار تعديل وحذف التعليق */}
                      {comment.user_id === currentUserId && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const newContent = prompt('أدخل المحتوى الجديد:', comment.content);
                              if (newContent && newContent !== comment.content) {
                                handleUpdateComment(comment.id, newContent);
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-indigo-600"
                            title="تعديل التعليق"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id, comment.code_snippet)}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title="حذف التعليق"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* نموذج إضافة تعليق جديد */}
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-1">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="أضف تعليقًا..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows={2}
                    dir="rtl"
                  />
                  
                  {/* إدخال الكود للتعليق */}
                  {showCommentCodeInput === post.id && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <select
                          value={commentCodeLanguage}
                          onChange={(e) => setCommentCodeLanguage(e.target.value)}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="csharp">C#</option>
                          <option value="cpp">C++</option>
                          <option value="php">PHP</option>
                          <option value="ruby">Ruby</option>
                          <option value="swift">Swift</option>
                          <option value="go">Go</option>
                          <option value="typescript">TypeScript</option>
                          <option value="kotlin">Kotlin</option>
                          <option value="rust">Rust</option>
                          <option value="sql">SQL</option>
                          <option value="html">HTML</option>
                          <option value="css">CSS</option>
                          <option value="bash">Bash</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCommentCodeInput(null)}
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
                  
                  <div className="mt-2 flex justify-between">
                    <div>
                      {showCommentCodeInput !== post.id && (
                        <button
                          type="button"
                          onClick={() => setShowCommentCodeInput(post.id)}
                          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          إضافة كود
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentContent.trim() || isSubmittingComment}
                      className={`px-4 py-1 rounded-md text-white ${
                        !commentContent.trim() || isSubmittingComment
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {isSubmittingComment ? (
                        <span className="flex items-center">
                          <svg className="animate-spin h-4 w-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          جارٍ الإرسال
                        </span>
                      ) : (
                        'إرسال'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <span>{formatDate(post.created_at)}</span>
              <span>•</span>
              <button
                className="text-indigo-600 hover:text-indigo-800"
                onClick={() => {
                  // تحديث الرابط بدون إعادة تحميل الصفحة
                  window.history.replaceState(
                    {}, 
                    '', 
                    `${window.location.pathname}?postId=${post.id}`
                  );
                  setHighlightedPostId(post.id);
                }}
              >
                رابط المنشور
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
