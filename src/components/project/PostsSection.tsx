'use client'

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ref, get, remove, set } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';
import Image from 'next/image';
import NotificationService from '@/lib/notifications/notificationService';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import HighlightedPost from './HighlightedPost';
import { toast } from 'sonner';
import { PostWithDetails } from '@/types/posts';
import { ImageThumbnail, ImageModal } from './ImageComponents';
import { uploadImage, optimizeImageUrl } from '@/lib/cloudinary/cloudinaryService';
import EditCommentModal from './EditCommentModal';
import { useRouter } from 'next/navigation';
import { CodeBlock } from '@/components/common/CodeBlock';

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

// استخراج معرف الصورة العام من رابط Cloudinary
const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }
    
    // نمط URL الصورة: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/public_id.ext
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error('خطأ في استخراج معرف الصورة:', error);
    return null;
  }
};

// حذف صورة من Cloudinary
const deleteImage = async (publicId: string): Promise<boolean> => {
  try {
    // استدعاء واجهة برمجة التطبيقات لحذف الصورة من Cloudinary
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'فشل في حذف الصورة');
    }
    
    return true;
  } catch (error) {
    console.error('خطأ في حذف الصورة من Cloudinary:', error);
    return false;
  }
};

export default function PostsSection({
  projectId,
  currentUserId,
  currentUserName = 'مستخدم',
  selectedPostId
}: PostsSectionProps) {
  const router = useRouter();
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
  const [selectedCommentImage, setSelectedCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // حالة لمكون تعديل التعليق
  const [isEditCommentModalOpen, setIsEditCommentModalOpen] = useState(false);
  const [commentToEdit, setCommentToEdit] = useState<any>(null);

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
          user:users!user_id(id, full_name, avatar_url, email)
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
          user:users!user_id(id, full_name, avatar_url, email)
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
          user:users!user_id(id, full_name, avatar_url, email)
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
            comments.map(async (comment: any) => {
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
            viewers: (viewsByPostId[post.id] || []).map((view: any) => view.user),
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
      toast.loading('جاري حذف المنشور...');
      
      // حذف المنشور من Supabase
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUserId); // التأكد من أن المستخدم هو مالك المنشور

      if (error) {
        console.error('خطأ في حذف المنشور من Supabase:', error);
        toast.error('حدث خطأ أثناء حذف المنشور');
        throw error;
      }

      // حذف الكود من Firebase إذا كان موجودًا
      if (codeSnippetId) {
        try {
          await deleteCodeSnippet(codeSnippetId);
        } catch (err) {
          console.warn('خطأ في حذف كود المنشور:', err);
        }
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

      toast.success('تم حذف المنشور بنجاح');
      console.log('تم حذف المنشور بنجاح');
    } catch (err) {
      console.error('خطأ أثناء عملية الحذف:', err);
      toast.error('حدث خطأ أثناء حذف المنشور');
      throw err;
    }
  };

  // دالة تعديل المنشور
  const handleUpdatePost = async (postId: string, updatedFields: Partial<PostWithDetails>) => {
    try {
      toast.loading('جاري تحديث المنشور...');
      
      // تحديث المنشور في Supabase
      const { data, error } = await supabase
        .from('posts')
        .update({
          ...updatedFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('user_id', currentUserId) // التأكد من أن المستخدم هو نفسه مالك المنشور
        .select();

      if (error) {
        console.error('خطأ في تحديث المنشور على Supabase:', error);
        toast.error('حدث خطأ أثناء تحديث المنشور');
        return;
      }

      if (!data || data.length === 0) {
        toast.error('لم نتمكن من تحديث المنشور، تأكد من أنك مالك المنشور');
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

      toast.success('تم تعديل المنشور بنجاح');
      console.log('تم تعديل المنشور بنجاح:', data);
    } catch (err) {
      console.error('خطأ أثناء تعديل المنشور:', err);
      toast.error('حدث خطأ أثناء تعديل المنشور');
    }
  };

  // Handle image upload for comments
  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const { url } = await uploadImage(file, 'comments');
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('حدث خطأ أثناء رفع الصورة');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // دالة إضافة تعليق جديد
  const handleAddComment = async (postId: string, content: string, codeSnippet: string | null, imageUrl: string | null) => {
    if (!currentUserId) {
      toast.error('يجب تسجيل الدخول لإضافة تعليق');
      return;
    }

    try {
      // إنشاء معرّف للكود في Firebase إذا كان موجودًا
      let codeSnippetId = null;
      if (codeSnippet) {
        codeSnippetId = await storeCommentCodeSnippet(codeSnippet);
      }

      // إضافة التعليق إلى Supabase
      const { data: commentData, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content,
          code_snippet: codeSnippetId,
          image_url: imageUrl,
        })
        .select('*, user:users!user_id(*)');

      if (error) {
        console.error('خطأ في إضافة التعليق:', error);
        toast.error('حدث خطأ أثناء إضافة التعليق');
        throw error;
      }

      // الحصول على البيانات الكاملة للتعليق
      if (!commentData || commentData.length === 0) {
        toast.error('لم يتم استرجاع بيانات التعليق');
        throw new Error('لم يتم استرجاع بيانات التعليق');
      }

      const newComment = commentData[0] as CommentWithUser;

      // تحديث حالة المنشورات لعرض التعليق الجديد
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...post.comments, newComment],
          };
        }
        return post;
      }));

      // إرسال إشعار للمنشور صاحب المنشور وأعضاء المشروع
      try {
        await NotificationService.notifyNewComment(
          postId,
          newComment.id,
          currentUserId,
          currentUserName
        );
      } catch (err) {
        console.error('خطأ في إرسال الإشعار:', err);
        // لا نتوقف عن إضافة التعليق إذا فشل الإشعار
      }

      toast.success('تم إضافة التعليق بنجاح');
      return newComment;
    } catch (err) {
      console.error('خطأ في إضافة التعليق:', err);
      toast.error('حدث خطأ أثناء إضافة التعليق');
      throw err;
    }
  };

  // دالة حذف تعليق
  const handleDeleteComment = async (postId: string, commentId: string, codeSnippetId: string | null, imageUrl: string | null) => {
    try {
      // حذف التعليق من Supabase
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('خطأ في حذف التعليق:', error);
        throw error;
      }

      // حذف كود التعليق من Firebase إذا كان موجودًا
      if (codeSnippetId) {
        try {
          await deleteCodeSnippet(codeSnippetId);
        } catch (error) {
          console.error('خطأ في حذف كود التعليق من Firebase:', error);
          // نواصل عملية حذف التعليق حتى لو فشل حذف الكود
        }
      }

      // حذف صورة التعليق من Cloudinary إذا كانت موجودة
      if (imageUrl) {
        try {
          const imagePublicId = extractPublicIdFromUrl(imageUrl);
          if (imagePublicId) {
            // Use deleteImage helper function to remove from Cloudinary
            await deleteImage(imagePublicId);
          }
        } catch (error) {
          console.error('خطأ في حذف صورة التعليق:', error);
          // نواصل عملية حذف التعليق حتى لو فشل حذف الصورة
        }
      }

      // تحديث حالة المنشورات لإزالة التعليق
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.filter(comment => comment.id !== commentId)
          };
        }
        return post;
      }));

      toast.success('تم حذف التعليق بنجاح');
      return true;
    } catch (err) {
      console.error('خطأ في حذف التعليق:', err);
      toast.error('حدث خطأ أثناء حذف التعليق');
      throw err;
    }
  };

  // دالة تعديل تعليق
  const handleUpdateComment = async (commentId: string, newContent: string) => {
    // Buscar el comentario en la lista de posts
    let foundComment = null;
    let foundPostId = null;
    
    for (const post of posts) {
      const comment = post.comments.find(c => c.id === commentId);
      if (comment) {
        foundComment = comment;
        foundPostId = post.id;
        break;
      }
    }
    
    // Si encontramos el comentario, abrir el modal de edición
    if (foundComment) {
      openEditCommentModal(foundComment);
      return;
    } else {
      toast.error('لم يتم العثور على التعليق');
    }
  };

  // دالة لفتح نافذة تعديل التعليق
  const openEditCommentModal = (comment: any) => {
    setCommentToEdit(comment);
    setIsEditCommentModalOpen(true);
  };

  // دالة لتحديث التعليق بعد التعديل
  const handleCommentUpdated = (updatedComment: any) => {
    // تحديث التعليق في الواجهة
    setPosts(prevPosts =>
      prevPosts.map(post => ({
        ...post,
        comments: post.comments.map(comment =>
          comment.id === updatedComment.id
            ? { 
                ...comment, 
                ...updatedComment,
                // Asegurarse de que se conservan los datos del código y del usuario
                user: comment.user,
                codeData: updatedComment.code_snippet 
                  ? (comment.codeData?.id === updatedComment.code_snippet 
                    ? comment.codeData 
                    : { id: updatedComment.code_snippet }) 
                  : null
              }
            : comment
        )
      }))
    );
    
    // Cerrar el modal
    setIsEditCommentModalOpen(false);
    setCommentToEdit(null);
    
    toast.success('تم تعديل التعليق بنجاح');
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

  // Render image preview in comments
  const renderCommentImage = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    const optimizedUrl = optimizeImageUrl(imageUrl, { width: 180, height: 180 });

    return (
      <ImageThumbnail
        url={optimizedUrl}
        onClick={() => setSelectedImage(imageUrl)}
      />
    );
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
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">منشورات المشروع</h2>
        <p className="text-base text-gray-600">آخر التحديثات والمناقشات حول المشروع</p>
      </div>

      {/* مكون تعديل التعليق */}
      <EditCommentModal
        isOpen={isEditCommentModalOpen}
        onClose={() => setIsEditCommentModalOpen(false)}
        comment={commentToEdit}
        userId={currentUserId}
        onCommentUpdated={handleCommentUpdated}
      />
      
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-600 mb-4">لا توجد منشورات حتى الآن</p>
          <p className="text-base text-gray-500">كن أول من يشارك في هذا المشروع!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 relative">
                      {post.user?.avatar_url ? (
                        <img
                          src={post.user.avatar_url}
                          alt={post.user.full_name}
                          className="w-full h-full rounded-full object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center shadow-sm">
                          <span className="text-xl font-semibold text-indigo-600">
                            {post.user?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mr-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {post.user?.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleString('ar-SA')}
                        {post.updated_at && post.updated_at !== post.created_at && ' (تم التعديل)'}
                      </p>
                    </div>
                  </div>
                  
                  {/* أزرار التعديل والحذف - تظهر فقط لصاحب المنشور */}
                  {post.user_id === currentUserId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/projects/edit-post/${post.id}`)}
                        className="p-1 text-gray-500 hover:text-indigo-600 transition-colors"
                        title="تعديل المنشور"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
                            handleDeletePost(post.id, post.code_snippet);
                          }
                        }}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                        title="حذف المنشور"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="prose max-w-none text-base text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap break-words overflow-auto max-h-[1000px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2 min-h-10">
                  {post.content}
                </div>

                {post.image_url && (
                  <div className="mt-4 rounded-lg overflow-hidden">
                    <img
                      src={post.image_url}
                      alt="صورة المنشور"
                      className="w-full h-auto max-h-[600px] object-contain"
                      loading="lazy"
                    />
                  </div>
                )}

                {post.codeData && (
                  <div className="mt-4">
                    <CodeBlock 
                      code={post.codeData.content}
                      language={post.codeData.language || 'javascript'}
                      showLineNumbers={true}
                      maxHeight="400px"
                    />
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <button
                      onClick={() => setViewersModalOpen(post.id)}
                      className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {post.viewers.length} مشاهدة
                      </span>
                    </button>
                    <button
                      onClick={() => setHighlightedPostId(post.id)}
                      className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm font-medium">
                        تمييز
                      </span>
                    </button>
                  </div>
                </div>
                
                {/* قسم التعليقات */}
                {post.comments && post.comments.length > 0 && (
                  <div className="border-t border-gray-100">
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">التعليقات ({post.comments.length})</h4>
                      <div className="space-y-4">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex">
                            <div className="w-8 h-8 flex-shrink-0">
                              {comment.user?.avatar_url ? (
                                <img
                                  src={comment.user.avatar_url}
                                  alt={comment.user.full_name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center">
                                  <span className="text-indigo-600 text-sm font-semibold">
                                    {comment.user?.full_name?.charAt(0) || '?'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="mr-3 flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">
                                    {comment.user?.full_name}
                                  </h5>
                                  <p className="text-xs text-gray-500">
                                    {new Date(comment.created_at).toLocaleString('ar-SA')}
                                    {comment.updated_at && comment.updated_at !== comment.created_at && ' (تم التعديل)'}
                                  </p>
                                </div>
                                
                                {/* أزرار تعديل وحذف التعليق - تظهر فقط لصاحب التعليق */}
                                {comment.user_id === currentUserId && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openEditCommentModal(comment)}
                                      className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                      title="تعديل التعليق"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
                                          handleDeleteComment(post.id, comment.id, comment.code_snippet, comment.image_url);
                                        }
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                      title="حذف التعليق"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                                {comment.content}
                              </div>
                              
                              {/* عرض صورة التعليق إن وجدت */}
                              {comment.image_url && (
                                <div className="mt-2">
                                  {renderCommentImage(comment.image_url)}
                                </div>
                              )}
                              
                              {/* عرض كود التعليق إن وجد */}
                              {comment.codeData && (
                                <div className="mt-2">
                                  <CodeBlock 
                                    code={comment.codeData.content} 
                                    language={comment.codeData.language || 'javascript'} 
                                    maxHeight="200px"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
