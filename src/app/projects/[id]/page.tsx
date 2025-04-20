'use client';
// app/project/[id]/page.tsx
import { useState, useEffect, useRef, FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { Project, Post, Comment, User, ProjectMember } from '@/lib/supabase/schema';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { detectLanguage } from '../../../utils/codeUtils
// استيراد خدمة التنبيهات
import { NotificationService } from '@/lib/notifications/notificationService';

// استيراد دوال Firebase للتعامل مع قاعدة البيانات
import { ref, set, get, remove, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';

import ProjectHeader from '@/components/project/ProjectHeader';
import CreatePostForm from '@/components/project/CreatePostForm';
import PostsSection from '@/components/project/PostsSection';
import ProjectSidebar from '@/components/project/ProjectSidebar';
import AddSupervisorModal from '@/components/project/AddSupervisorModal';
import ManageSupervisorsModal from '@/components/project/ManageSupervisorsModal';
import Notifications from '@/components/project/Notifications';
import { CodeBlock } from '@/components/common/CodeBlock';
import { ImageThumbnail, ImageModal } from '@/components/project/ImageComponents';
import CommentsList from '@/components/project/CommentsList';
import ImageUploader from '@/components/common/ImageUploader';
import EditCommentModal from '@/components/project/EditCommentModal';
import { toast } from 'sonner';

export type PostWithUser = Post & {
  user: User;
  comments: (Comment & { 
    user: User;
    image_public_id?: string;
    views_count: number;
    viewers: User[];
  })[];
  views_count: number;
  viewers: User[];
  code_snippet_data?: any;
};

// Update type definitions for the API responses
interface CommentResponse {
  data: Array<{
    id: string;
    post_id: string;
    user: User;
    content: string;
    code_snippet?: string;
    image_url?: string;
  }> | null;
  error: any;
}

interface ViewResponse {
  data: Array<{
    post_id: string;
    comment_id?: string;
    user: User;
  }> | null;
  error: any;
}

// ====================
// أنماط CSS للتحريك والمظهر
// ====================
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

const popIn = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } }
};

const slideIn = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3 } }
};

// ====================
// مكوّن EnhancedPostsSection لتمرير مكوناتنا المخصصة إلى PostsSection
// ====================
const EnhancedPostsSection = ({ 
  projectId,
  currentUserId,
  currentUserName,
  onSubmitComment,
  onImageClick
}: {
  projectId: string;
  currentUserId: string;
  currentUserName: string;
  onSubmitComment: (
    postId: string, 
    content: string, 
    codeSnippet?: string, 
    codeLanguage?: string, 
    commentImageFile?: File,
    clearCommentInput?: () => void
  ) => Promise<void>;
  onImageClick: (url: string) => void;
}) => {
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentCodeInputs, setCommentCodeInputs] = useState<Record<string, string>>({});
  const [commentCodeLanguages, setCommentCodeLanguages] = useState<Record<string, string>>({});
  const [showCommentCodeInput, setShowCommentCodeInput] = useState<string | null>(null);
  const [commentImages, setCommentImages] = useState<Record<string, File | null>>({});
  const [commentImagePreviews, setCommentImagePreviews] = useState<Record<string, string | null>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // Render code snippets with our enhanced component
  const renderCodeSnippet = (code: string, language: string) => {
    return <CodeBlock code={code} language={language} />;
  };
  
  // Render images with our enhanced thumbnail component
  const renderImage = (imageUrl: string) => {
    return <ImageThumbnail url={imageUrl} onClick={() => onImageClick(imageUrl)} />;
  };
  
  // Toggle code input for a specific post
  const toggleCodeInput = (postId: string) => {
    setShowCommentCodeInput(prev => prev === postId ? null : postId);
  };
  
  // Update comment text input for a specific post
  const updateCommentInput = (postId: string, value: string) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };
  
  // Update comment code input for a specific post
  const updateCommentCodeInput = (postId: string, code: string) => {
    setCommentCodeInputs(prev => ({ ...prev, [postId]: code }));
  };
  
  // Update code language for a specific post
  const updateCommentCodeLanguage = (postId: string, language: string) => {
    setCommentCodeLanguages(prev => ({ ...prev, [postId]: language }));
  };
  
  // Handle image selection for a comment
  const handleCommentImageChange = (postId: string, file: File | null) => {
    setCommentImages(prev => ({ ...prev, [postId]: file }));
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCommentImagePreviews(prev => ({ 
          ...prev, 
          [postId]: e.target?.result as string 
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setCommentImagePreviews(prev => ({ ...prev, [postId]: null }));
    }
  };
  
  // Update upload progress for a specific post
  const updateUploadProgress = (postId: string, progress: number) => {
    setUploadProgress(prev => ({ ...prev, [postId]: progress }));
  };
  
  // Handle comment submission
  const handleSubmitComment = async (postId: string) => {
    if (!commentInputs[postId]?.trim()) {
      return;
    }
    
    setIsSubmittingComment(true);
    
    try {
      await onSubmitComment(
        postId,
        commentInputs[postId] || '',
        showCommentCodeInput === postId ? commentCodeInputs[postId] || '' : '',
        showCommentCodeInput === postId ? commentCodeLanguages[postId] || 'javascript' : '',
        commentImages[postId] || undefined,
        () => {
          // Clear inputs after submission
          setCommentInputs(prev => ({ ...prev, [postId]: '' }));
          setCommentCodeInputs(prev => ({ ...prev, [postId]: '' }));
          setCommentCodeLanguages(prev => ({ ...prev, [postId]: 'javascript' }));
          setShowCommentCodeInput(null);
          setCommentImages(prev => ({ ...prev, [postId]: null }));
          setCommentImagePreviews(prev => ({ ...prev, [postId]: null }));
          setUploadProgress(prev => ({ ...prev, [postId]: 0 }));
        }
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  // في المشروع الكامل، سنقوم بتعديل مكون PostsSection ليقبل هذه المكونات المخصصة
  // هذا مجرد مثال لكيفية استخدام المكونات المخصصة
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={slideIn}
      className="space-y-6"
    >
      <PostsSection
        projectId={projectId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />
      
      {/* هذا مجرد مكون وسيط. لتطبيق كامل، يجب تعديل PostsSection
        ليمكنه استخدام المكونات المخصصة ونقل المنطق إليه. */}
    </motion.div>
  );
};

// ====================
// بقية الكود (ProjectPage)
// ====================
export default function ProjectPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hashPostId, setHashPostId] = useState<string | null>(null);
  // state لتعقب الصورة المختارة للعرض الكامل
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // state for edit comment modal
  const [isEditCommentModalOpen, setIsEditCommentModalOpen] = useState(false);
  const [commentToEdit, setCommentToEdit] = useState<any>(null);

  // state
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [members, setMembers] = useState<(ProjectMember & { user: User })[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCode, setNewPostCode] = useState('');
  const [newPostCodeLanguage, setNewPostCodeLanguage] = useState('javascript');
  const [showCodeInput, setShowCodeInput] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showSupervisorMenu, setShowSupervisorMenu] = useState(false);
  const [showAddSupervisorModal, setShowAddSupervisorModal] = useState(false);
  const [showManageSupervisorsModal, setShowManageSupervisorsModal] = useState(false);
  const [isProcessingSupervisor, setIsProcessingSupervisor] = useState(false);
  const supervisorMenuRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const [newSupervisorQuery, setNewSupervisorQuery] = useState('');
  const [newSupervisorResults, setNewSupervisorResults] = useState<any[]>([]);
  const [isSearchingSupervisor, setIsSearchingSupervisor] = useState(false);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImagePublicId, setUploadedImagePublicId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // format date in Arabic
  const formatDate = (dateString: string) =>
    format(new Date(dateString), 'dd MMM yyyy - HH:mm', { locale: arSA });

  // click-outside for supervisor menu
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        showSupervisorMenu &&
        supervisorMenuRef.current &&
        !supervisorMenuRef.current.contains(event.target as Node)
      ) {
        setShowSupervisorMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSupervisorMenu]);

  // Effect to handle search params
  useEffect(() => {
    const postId = searchParams.get('postId');
    if (postId) {
      setHashPostId(postId);
      const postElement = document.getElementById(`post-${postId}`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth' });
        postElement.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => {
          postElement.classList.remove('ring-2', 'ring-indigo-500');
        }, 2000);
      }
    }
  }, [searchParams]);

  // Effect to scroll to post when posts are loaded
  useEffect(() => {
    if (hashPostId && posts.length > 0) {
      const postElement = document.getElementById(`post-${hashPostId}`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [hashPostId, posts]);

  // fetch project, members, posts, comments, views
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !id) return;
      try {
        setIsLoadingProject(true);
        setError(null);

        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) throw projectError;

        const { data: membersData, error: membersError } = await supabase
          .from('project_members')
          .select('*, user:users!user_id(*)')
          .eq('project_id', id);

        if (membersError) throw membersError;

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            user:user_id(id, full_name, avatar_url, email)
          `)
          .eq('project_id', id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        const postIds = postsData.map((p: any) => p.id);

        // First fetch comments
        const commentsData = await supabase
          .from('comments')
          .select('*, user:users!user_id(*)')
          .in('post_id', postIds)
          .order('created_at', { ascending: true });

        if (commentsData.error) throw commentsData.error;

        // Then get both post and comment views
        const postViewsData = await supabase
          .from('post_views')
          .select('*, user:users!user_id(*)')
          .in('post_id', postIds);

        if (postViewsData.error) throw postViewsData.error;

        // Group views by post ID
        const viewsByPostId = (postViewsData.data || []).reduce((acc: Record<string, any[]>, view) => {
          (acc[view.post_id] ||= []).push(view);
          return acc;
        }, {});

        // Process comments with their views
        const commentsWithViews = (commentsData.data || []).map((comment) => ({
          ...comment,
          views_count: (viewsByPostId[comment.post_id] || []).length,
          viewers: (viewsByPostId[comment.post_id] || []).map(v => v.user)
        }));

        // Update posts with comments and views
        const postsWithComments = await Promise.all(
          postsData.map(async (post: any) => {
            const postComments = commentsWithViews.filter(c => c.post_id === post.id);
            const postViews = viewsByPostId[post.id] || [];
            let codeData = null;

            if (post.code_snippet) {
              try {
                codeData = await getCodeSnippetById(post.code_snippet);
              } catch (err) {
                console.error(`Error fetching code for post ${post.id}:`, err);
              }
            }

            const commentsWithCode = await Promise.all(
              postComments.map(async (comment: any) => {
                let commentCode = null;
                if (comment.code_snippet) {
                  try {
                    commentCode = await getCodeSnippetById(comment.code_snippet);
                  } catch (err) {
                    console.error(`Error fetching code for comment ${comment.id}:`, err);
                  }
                }
                return {
                  ...comment,
                  code_snippet_data: commentCode
                };
              })
            );

            return {
              ...post,
              comments: commentsWithCode,
              views_count: postViews.length,
              viewers: postViews.map(v => v.user),
              code_snippet_data: codeData,
            };
          })
        );

        const myMember = membersData.find((m: any) => m.user_id === user.id);
        setUserRole(myMember?.role || null);

        setProject(projectData);
        setMembers(membersData);
        setPosts(postsWithComments);
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء جلب بيانات المشروع');
      } finally {
        setIsLoadingProject(false);
      }
    };
    fetchData();
  }, [id, user]);

  // helpers: file → dataURI
  const fileToDataUri = (file: File) =>
    new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  // upload image for posts
  const handleImageUpload = async (file: File) => {
    try {
      setIsUploadingImage(true);
      setUploadProgress(0);
      setError(null);

      // تحويل الملف إلى Data URI
      const data = await fileToDataUri(file);
      setUploadProgress(40);

      // رفع الصورة إلى Cloudinary
      const resp = await fetch('/api/cloudinary/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: data, 
          folder: 'gradtrack/posts',
          transformation: {
            quality: 'auto',
            fetch_format: 'auto',
            width: 1200,
            height: 1200,
            crop: 'limit'
          }
        }),
      });

      setUploadProgress(80);

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || `فشل الرفع بحالة: ${resp.status}`);
      }

      const result = await resp.json();
      setUploadedImage(result.url);
      setUploadedImagePublicId(result.publicId);
      setUploadProgress(100);

      // إعادة تعيين حقل إدخال الملف
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('تم رفع الصورة بنجاح');
    } catch (e) {
      console.error('خطأ في رفع الصورة:', e);
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء رفع الصورة');
      toast.error(e instanceof Error ? e.message : 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setTimeout(() => {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // delete image
  const handleImageDelete = async (publicId: string) => {
    try {
      const resp = await fetch('/api/cloudinary/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId }),
      });
      if (!resp.ok) throw new Error('Delete failed');
      const { result } = await resp.json();
      if (result === 'ok') setUploadedImage(null);
    } catch (e) {
      console.error(e);
      setError('حدث خطأ أثناء حذف الصورة');
    }
  };

  // Upload image for comments
  const handleImageUploadForComment = async (file: File, setProgress?: (progress: number) => void): Promise<{ url: string | null; publicId: string | null }> => {
    try {
      if (!file) {
        console.warn('لم يتم توفير ملف للرفع');
        return { url: null, publicId: null };
      }
      
      // التحقق من نوع الملف
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!validImageTypes.includes(file.type)) {
        console.error('نوع الملف غير صالح. الأنواع المدعومة هي: JPG، PNG، GIF، WEBP، SVG');
        throw new Error('نوع الملف غير صالح. الأنواع المدعومة هي: JPG، PNG، GIF، WEBP، SVG');
      }
      
      // التحقق من حجم الملف (10MB كحد أقصى)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        console.error('حجم الملف كبير جدًا. الحد الأقصى هو 10 ميجابايت.');
        throw new Error('حجم الملف كبير جدًا. الحد الأقصى هو 10 ميجابايت.');
      }
      
      // إظهار تقدم الرفع البدائي
      setProgress?.(10);
      
      // تحويل الملف إلى Data URI
      const data = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      
      setProgress?.(30);
      
      console.log('جاري رفع صورة التعليق إلى Cloudinary...');
      
      // رفع الصورة إلى Cloudinary عبر API الخاص بنا
      const resp = await fetch('/api/cloudinary/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: data, 
          folder: 'gradtrack/comments',
          transformation: 'comment_image' // يمكن تعريف تحويلات مخصصة في Cloudinary
        }),
      });
      
      setProgress?.(70);
      
      if (!resp.ok) {
        const errorData = await resp.json();
        console.error('خطأ في استجابة رفع الصورة:', errorData);
        throw new Error(errorData.error || `فشل الرفع بحالة: ${resp.status}`);
      }
      
      const result = await resp.json();
      console.log('تم رفع صورة التعليق بنجاح');
      
      setProgress?.(100);
      
      return { 
        url: result.url, 
        publicId: result.publicId 
      };
    } catch (e) {
      console.error('خطأ في رفع صورة التعليق:', e);
      setProgress?.(0);
      return { url: null, publicId: null };
    }
  };

  const handleOpenFileDialog = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  // submit new post
  const handleSubmitPost = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !project || !newPostContent.trim()) return;
    try {
      setError(null);
      setIsSubmittingPost(true);
      let codeId: string | null = null;
      
      if (newPostCode && newPostCode.trim()) {
        try {
          console.log("Saving code snippet to Firebase...");
          codeId = await saveCodeSnippet({
            content: newPostCode,
            language: newPostCodeLanguage || detectLanguage(newPostCode),
            relatedId: project.id,
            relatedType: 'post',
            createdBy: user.id,
          });
          console.log("Code snippet saved successfully with ID:", codeId);
        } catch (codeError) {
          console.error("Error saving code snippet:", codeError);
          setError('حدث خطأ أثناء تخزين الكود. يرجى المحاولة مرة أخرى.');
          setIsSubmittingPost(false);
          return;
        }
      }
      
      const postData = {
        project_id: project.id,
        user_id: user.id,
        content: newPostContent,
        code_snippet: codeId,
        image_url: uploadedImage,
      };
      
      console.log("Creating new post with data:", postData);
      
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert(postData)
        .select('*, user:users!user_id(*)')
        .single();
      
      if (postError) {
        console.error("Error creating post in Supabase:", postError);
        setError(`حدث خطأ أثناء إنشاء المنشور: ${postError.message || 'خطأ غير معروف'}`);
        setIsSubmittingPost(false);
        return;
      }
      
      console.log("Post created successfully:", newPost);
      
      setPosts([
        {
          ...newPost,
          comments: [],
          views_count: 0,
          viewers: [],
          code_snippet_data: codeId
            ? { id: codeId, content: newPostCode, language: newPostCodeLanguage }
            : null,
        },
        ...posts,
      ]);
      
      try {
        await NotificationService.sendNotificationToProjectMembers(
          project.id,
          `منشور جديد من ${user.full_name || 'مستخدم'}`,
          newPostContent.substring(0, 100) + (newPostContent.length > 100 ? '...' : ''),
          'post_created',
          newPost.id,
          user.id
        );
        console.log("Notification sent for new post");
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
        // Continue even if notification fails
      }
      
      setSuccessMessage('تم نشر المنشور بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
      setNewPostContent('');
      setNewPostCode('');
      setNewPostCodeLanguage('javascript');
      setShowCodeInput(false);
      setUploadedImage(null);
      setUploadedImagePublicId(null);
      setUploadProgress(0);
    } catch (err) {
      console.error("Error in handleSubmitPost:", err);
      setError('حدث خطأ أثناء إنشاء المنشور');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // update post
  const handleUpdatePost = async (upd: PostWithUser) => {
    try {
      let codeId = upd.code_snippet;
      if (upd.code_snippet_data?.content) {
        try {
          if (upd.code_snippet) {
            await saveCodeSnippet({
              id: upd.code_snippet,
              content: upd.code_snippet_data.content,
              language: upd.code_snippet_data.language || detectLanguage(upd.code_snippet_data.content),
              relatedId: upd.project_id,
              relatedType: 'post',
              createdBy: user!.id,
            });
          } else {
            codeId = await saveCodeSnippet({
              content: upd.code_snippet_data.content,
              language: upd.code_snippet_data.language || detectLanguage(upd.code_snippet_data.content),
              relatedId: upd.project_id,
              relatedType: 'post',
              createdBy: user!.id,
            });
          }
        } catch (codeError) {
          console.error("Error updating code snippet:", codeError);
          setError('حدث خطأ أثناء تحديث الكود. يرجى المحاولة مرة أخرى.');
          return;
        }
      }
      const { error: updErr } = await supabase
        .from('posts')
        .update({
          content: upd.content,
          code_snippet: codeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', upd.id);
      if (updErr) throw updErr;
      setPosts(posts.map(p => p.id === upd.id ? { ...upd, code_snippet: codeId } : p));
      setSuccessMessage('تم تحديث المنشور بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setError('حدث خطأ أثناء تحديث المنشور');
    }
  };

  // delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    try {
      const toDel = posts.find(p => p.id === postId);
      if (toDel?.code_snippet) {
        try {
          await deleteCodeSnippet(toDel.code_snippet);
        } catch (codeError) {
          console.error("Error deleting code snippet:", codeError);
        }
      }
      if (toDel?.image_url) {
        try {
          // Extract the public ID from the image URL if available
          const urlParts = toDel.image_url.split('/');
          const filenameWithExt = urlParts[urlParts.length - 1];
          const filename = filenameWithExt.split('.')[0];
          if (filename) {
            await handleImageDelete(filename);
          }
        } catch (imageError) {
          console.error("Error deleting image:", imageError);
        }
      }
      const { error: delErr } = await supabase.from('posts').delete().eq('id', postId);
      if (delErr) throw delErr;
      setPosts(posts.filter(p => p.id !== postId));
      setSuccessMessage('تم حذف المنشور بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setError('حدث خطأ أثناء حذف المنشور');
    }
  };

  // submit comment مع دعم الصور والنصوص والكود
  const handleSubmitComment = async (
    postId: string,
    content: string,
    codeSnippet: string = '',
    codeLanguage: string = '',
    commentImageFile?: File,
    clearCommentInput?: () => void
  ) => {
    if (!user || !content.trim()) {
      console.error("User not authenticated or empty content");
      return;
    }
    
    try {
      setError(null);
      setUploadProgress(0);
      
      // Prepare comment data
      const commentData = {
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        code_snippet: null as string | null,
        image_url: null as string | null,
      };

      // Handle code snippet if provided
      if (codeSnippet?.trim()) {
        try {
          const codeId = await saveCodeSnippet({
            content: codeSnippet,
            language: codeLanguage || detectLanguage(codeSnippet),
            relatedId: postId,
            relatedType: 'comment',
            createdBy: user.id,
          });
          commentData.code_snippet = codeId;
        } catch (error) {
          console.error("Error saving code snippet:", error);
          throw new Error('Failed to save code snippet');
        }
      }

      // Handle image upload if provided
      if (commentImageFile) {
        try {
          const { url } = await handleImageUploadForComment(commentImageFile, setUploadProgress);
          if (url) {
            commentData.image_url = url;
          }
        } catch (error) {
          console.error("Error uploading image:", error);
          setError('حدث خطأ أثناء رفع الصورة. يرجى المحاولة مرة أخرى.');
          return;
        }
      }

      // Create comment in database
      const { data: newComment, error: commentError } = await supabase
        .from('comments')
        .insert(commentData)
        .select('*, user:users!user_id(*)')
        .single();
      
      if (commentError) {
        console.error("Error creating comment:", commentError);
        setError(`حدث خطأ أثناء إضافة التعليق: ${commentError.message || 'خطأ غير معروف'}`);
        return;
      }
      
      // Find the post to get its author ID
      const post = posts.find(p => p.id === postId);
      if (!post) {
        console.error("Post not found for comment:", postId);
        return;
      }
      
      // Update UI with new comment
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...p.comments, {
              ...newComment,
              code_snippet_data: commentData.code_snippet ? {
                content: codeSnippet, 
                language: codeLanguage || detectLanguage(codeSnippet) 
              } : null
            }]
          };
        }
        return p;
      }));

      // Clear inputs and show success message
      if (clearCommentInput) {
        clearCommentInput();
      }
      setSuccessMessage('تم إضافة التعليق بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Send notification - use post.user_id to get the post author
      try {
        // First for all project members
        await NotificationService.sendNotificationToProjectMembers(
          project!.id,
          'تعليق جديد على منشور',
          content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          'comment_added',
          postId,
          user.id
        );
        
        // Then specific notification for post author if different from commenter
        if (post.user_id && post.user_id !== user.id) {
          await NotificationService.sendNotification(
            post.user_id,
            'تعليق جديد على منشورك',
            `علق ${user.full_name || 'مستخدم'} على منشورك`,
            'comment_added',
            postId
          );
        }
      } catch (error) {
        console.error("Error sending notification:", error);
        // Continue even if notification fails
      }

    } catch (error) {
      console.error("Error in handleSubmitComment:", error);
      setError('حدث خطأ أثناء إضافة التعليق');
    } finally {
      setUploadProgress(0);
    }
  };

  // حذف التعليق
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    try {
      const post = posts.find(p => p.id === postId);
      const comment = post?.comments.find(c => c.id === commentId);
      
      // حذف كود التعليق إذا وجد
      if (comment?.code_snippet) {
        try {
          await deleteCodeSnippet(comment.code_snippet);
          console.log("تم حذف كود التعليق بنجاح");
        } catch (codeError) {
          console.error("خطأ في حذف كود التعليق:", codeError);
        }
      }
      
      // حذف صورة التعليق من Cloudinary إذا وجدت
      if (comment?.image_url) {
        try {
          // استخراج معرف الصورة من الرابط إذا لم يكن هناك معرف محدد
          const imageUrl = comment.image_url;
          let publicId = (comment as any).image_public_id;
          
          if (!publicId && imageUrl.includes('cloudinary.com')) {
            // استخراج معرف الصورة من عنوان URL
            const urlParts = imageUrl.split('/');
            const filenameWithExt = urlParts[urlParts.length - 1];
            const filename = filenameWithExt.split('.')[0];
            publicId = `gradtrack/comments/${filename}`;
          }
          
          if (publicId) {
            await fetch('/api/cloudinary/images', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicId }),
            });
            console.log("تم حذف صورة التعليق من Cloudinary");
          }
        } catch (imageError) {
          console.error("خطأ في حذف صورة التعليق:", imageError);
        }
      }
      
      // حذف التعليق من قاعدة البيانات
      const { error: delErr } = await supabase.from('comments').delete().eq('id', commentId);
      if (delErr) throw delErr;
      
      // تحديث واجهة المستخدم
      setPosts(
        posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.filter(c => c.id !== commentId),
            };
          }
          return p;
        })
      );
      
      setSuccessMessage('تم حذف التعليق بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error("خطأ في حذف التعليق:", e);
      setError('حدث خطأ أثناء حذف التعليق');
    }
  };

  // supervisor management helpers
  const generateInviteCode = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  
  const sendInvitation = async (email: string, role = 'supervisor') => {
    try {
      const code = generateInviteCode();
      const { data: existing, error: chkErr } = await supabase
        .from('project_invitations')
        .select('id')
        .eq('project_id', project!.id)
        .eq('email', email);
      if (chkErr) throw chkErr;
      if (existing?.length) {
        await supabase
          .from('project_invitations')
          .update({ 
            role, 
            invite_code: code, 
            invited_by: user!.id, 
            accepted: false, 
            expires_at: new Date(Date.now() + 7*86400000).toISOString() 
          })
          .eq('id', existing[0].id);
      } else {
        await supabase
          .from('project_invitations')
          .insert({
            project_id: project!.id,
            email,
            role,
            invite_code: code,
            invited_by: user!.id
          });
      }
      return true;
    } catch {
      return false;
    }
  };

  const searchSupervisor = async (q: string) => {
    setNewSupervisorQuery(q);
    if (q.length < 2) {
      setNewSupervisorResults([]);
      return;
    }
    setIsSearchingSupervisor(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url')
        .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(5);
      if (error) throw error;
      let results = data || [];
      const isEmail = /^\S+@\S+\.\S+$/.test(q);
      if (isEmail && !results.length) {
        results = [{ id: 'invite', email: q, full_name: q, isInvitation: true } as any];
      }
      setNewSupervisorResults(results);
    } catch {
      setNewSupervisorResults([]);
    } finally {
      setIsSearchingSupervisor(false);
    }
  };

  const handleSelectSupervisor = async (sel: any) => {
    setIsProcessingSupervisor(true);
    try {
      if (sel.isInvitation) {
        const ok = await sendInvitation(sel.email);
        if (ok) setSuccessMessage(`تم إرسال دعوة للمستخدم ${sel.email}`);
        else setError('حدث خطأ أثناء إرسال الدعوة');
      } else {
        const existing = members.find(m => m.user.id === sel.id);
        if (existing) {
          if (existing.role === 'member') {
            await supabase.from('project_members').update({ role: 'supervisor' }).eq('id', existing.id);
            setMembers(members.map(m => m.id === existing.id ? { ...m, role: 'supervisor' } : m));
            setSuccessMessage('تم ترقية العضو إلى مشرف');
          } else {
            setError('هذا المستخدم بالفعل مشرف');
          }
        } else {
          const { data: newMember, error } = await supabase
            .from('project_members')
            .insert({ project_id: project!.id, user_id: sel.id, role: 'supervisor' })
            .select('*, user:users!user_id(*)')
            .single();
          if (error) throw error;
          setMembers([...members, newMember]);
          setSuccessMessage('تم إضافة المشرف بنجاح');
        }
      }
    } catch {
      setError('حدث خطأ أثناء معالجة المشرف');
    } finally {
      setIsProcessingSupervisor(false);
      setNewSupervisorQuery('');
      setNewSupervisorResults([]);
      setShowAddSupervisorModal(false);
    }
  };

  const handleRemoveSupervisor = async (memberId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء صلاحية المشرف لهذا العضو؟')) return;
    setIsProcessingSupervisor(true);
    try {
      await supabase.from('project_members').update({ role: 'member' }).eq('id', memberId);
      setMembers(members.map(m => m.id === memberId ? { ...m, role: 'member' } : m));
      setSuccessMessage('تم إلغاء صلاحية المشرف');
      setShowManageSupervisorsModal(false);
    } catch {
      setError('حدث خطأ أثناء إلغاء صلاحية المشرف');
    } finally {
      setIsProcessingSupervisor(false);
    }
  };

  // ====================
  // دوال مساعدة للتعامل مع Firebase (كود snippet)
  // ====================
  const addData = async (path: string, data: any) => {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error("Invalid path: Path must be a non-empty string");
      }
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid data: Data must be a non-empty object");
      }
      console.log(`Adding data to Firebase path: ${path}`);
      const dbRef = ref(database, path);
      await set(dbRef, data);
      console.log(`Successfully added data to Firebase path: ${path}`);
      return true;
    } catch (error) {
      console.error("Error adding data to Firebase:", error);
      throw error;
    }
  };

  const getData = async (path: string) => {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error("Invalid path: Path must be a non-empty string");
      }
      console.log(`Getting data from Firebase path: ${path}`);
      const dbRef = ref(database, path);
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        console.log(`Data found at path: ${path}`);
        return snapshot.val();
      }
      console.log(`No data found at path: ${path}`);
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
      console.log(`Deleting data from Firebase path: ${path}`);
      const dbRef = ref(database, path);
      await remove(dbRef);
      console.log(`Successfully deleted data from Firebase path: ${path}`);
      return true;
    } catch (error) {
      console.error("Error deleting data from Firebase:", error);
      throw error;
    }
  };

  // حفظ كود الكود في Firebase
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
      if (!content || typeof content !== 'string') {
        throw new Error("Invalid content: Content must be a non-empty string");
      }
      if (!language || typeof language !== 'string') {
        throw new Error("Invalid language: Language must be a non-empty string");
      }
      if (!relatedId || typeof relatedId !== 'string') {
        throw new Error("Invalid relatedId: RelatedId must be a non-empty string");
      }
      if (!relatedType || typeof relatedType !== 'string') {
        throw new Error("Invalid relatedType: RelatedType must be a non-empty string");
      }
      if (!createdBy || typeof createdBy !== 'string') {
        throw new Error("Invalid createdBy: CreatedBy must be a non-empty string");
      }
      
      const codeId = id ? id : `code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const path = `codes/${codeId}`;
      
      console.log(`Saving code snippet to Firebase path: ${path}`);
      console.log(`Code snippet details: language=${language}, relatedType=${relatedType}, contentLength=${content.length}`);
      
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
          console.log(`Successfully saved code snippet to Firebase path: ${path}`);
          return codeId;
        } catch (error) {
          attempts++;
          console.error(`Attempt ${attempts}/${maxAttempts} failed:`, error);
          if (attempts >= maxAttempts) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to save code snippet after ${maxAttempts} attempts: ${errorMessage}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      throw new Error("Failed to save code snippet after maximum attempts");
    } catch (error) {
      console.error("Error saving code snippet:", error);
      alert("حدث خطأ أثناء تخزين الكود. يرجى المحاولة مرة أخرى.");
      throw error;
    }
  };

  // جلب كود الكود من Firebase بناءً على معرفه
  const getCodeSnippetById = async (codeId: string) => {
    try {
      if (!codeId || typeof codeId !== 'string') {
        throw new Error("Invalid codeId: CodeId must be a non-empty string");
      }
      const path = `codes/${codeId}`;
      console.log(`Fetching code snippet from Firebase path: ${path}`);
      const data = await getData(path);
      if (!data) {
        console.warn(`No code snippet found at path: ${path}`);
      } else {
        console.log(`Successfully fetched code snippet from Firebase path: ${path}`);
      }
      return data;
    } catch (error) {
      console.error("Error fetching code snippet:", error);
      throw error;
    }
  };

  // حذف كود الكود من Firebase
  const deleteCodeSnippet = async (codeId: string) => {
    try {
      if (!codeId || typeof codeId !== 'string') {
        throw new Error("Invalid codeId: CodeId must be a non-empty string");
      }
      const path = `codes/${codeId}`;
      console.log(`Deleting code snippet from Firebase path: ${path}`);
      const result = await deleteData(path);
      console.log(`Successfully deleted code snippet from Firebase path: ${path}`);
      return result;
    } catch (error) {
      console.error("Error deleting code snippet:", error);
      throw error;
    }
  };

  // Update post views handling
  const handlePostView = async (postId: string) => {
    if (!user) return;
    
    try {
      // Validar que tenemos todos los datos necesarios
      if (!postId || !user.id) {
        console.warn("Missing required data for post view:", { postId, userId: user.id });
        return;
      }
      
      console.log("Recording post view:", { postId, userId: user.id });
      
      const viewData = { 
        post_id: postId, 
        user_id: user.id,
        viewed_at: new Date().toISOString()
      };
      
      // Intenta grabar la vista del post
      const { error } = await supabase
        .from('post_views')
        .upsert(viewData, {
          onConflict: 'post_id,user_id'
        });

      if (error) {
        console.error("Error recording post view:", error);
        return;
      }

      // Solo actualizamos el estado local si no hubo error
      setPosts(prevPosts => prevPosts.map(p => {
        if (p.id === postId) {
          const existingViewer = p.viewers.find(v => v.id === user.id);
          if (!existingViewer) {
            return {
              ...p,
              views_count: p.views_count + 1,
              viewers: [...p.viewers, user]
            };
          }
        }
        return p;
      }));
      
      console.log("Successfully recorded post view for post:", postId);
    } catch (error) {
      // Capturar y registrar cualquier error inesperado
      console.error("Unexpected error in handlePostView:", error);
    }
  };

  // Update useEffect for fetching posts to include proper view counting
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !id) return;
      try {
        setIsLoadingProject(true);
        setError(null);

        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) throw projectError;

        const { data: membersData, error: membersError } = await supabase
          .from('project_members')
          .select('*, user:users!user_id(*)')
          .eq('project_id', id);

        if (membersError) throw membersError;

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            user:user_id(id, full_name, avatar_url, email)
          `)
          .eq('project_id', id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        const postIds = postsData.map((p: any) => p.id);

        // Fetch comments and views for all posts
        const [commentsRes, viewsRes] = await Promise.all([
          supabase.from('comments').select('*, user:users!user_id(*)').in('post_id', postIds).order('created_at', { ascending: true }),
          supabase.from('post_views').select('*, user:users!user_id(*)').in('post_id', postIds)
        ]);

        if (commentsRes.error) throw commentsRes.error;
        if (viewsRes.error) throw viewsRes.error;

        // Record views for newly loaded posts
        for (const postId of postIds) {
          await handlePostView(postId);
        }

        const commentsByPostId = commentsRes.data.reduce((acc: any, c: any) => {
          (acc[c.post_id] ||= []).push(c);
          return acc;
        }, {} as Record<string, any[]>);
        const viewsByPostId = viewsRes.data.reduce((acc: any, v: any) => {
          (acc[v.post_id] ||= []).push(v);
          return acc;
        }, {} as Record<string, any[]>);

        if (postIds.length) {
          const toUpsert = postIds.map((pid: string) => ({ post_id: pid, user_id: user.id }));
          await supabase.from('post_views').upsert(toUpsert, { onConflict: 'post_id,user_id' });
        }

        const postsWithComments = await Promise.all(
          postsData.map(async (post: any) => {
            const postComments = commentsByPostId[post.id] || [];
            const postViews = viewsByPostId[post.id] || [];
            let codeData = null;
            if (post.code_snippet) {
              try {
                codeData = await getCodeSnippetById(post.code_snippet);
              } catch (err) {
                console.error(`Error fetching code for post ${post.id}:`, err);
              }
            }
            const commentsWithCode = await Promise.all(
              postComments.map(async (cm: any) => {
                let cmCode = null;
                if (cm.code_snippet) {
                  try {
                    cmCode = await getCodeSnippetById(cm.code_snippet);
                  } catch (err) {
                    console.error(`Error fetching code for comment ${cm.id}:`, err);
                  }
                }
                return { ...cm, code_snippet_data: cmCode };
              })
            );
            return {
              ...post,
              comments: commentsWithCode,
              views_count: postViews.length,
              viewers: postViews.map((v: any) => v.user),
              code_snippet_data: codeData,
            };
          })
        );

        const myMember = membersData.find((m: any) => m.user_id === user.id);
        setUserRole(myMember?.role || null);

        setProject(projectData);
        setMembers(membersData);
        setPosts(postsWithComments);
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء جلب بيانات المشروع');
      } finally {
        setIsLoadingProject(false);
      }
    };
    fetchData();
  }, [id, user]);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-6">Loading...</h1>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (isLoadingProject) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mr-3 text-lg">جاري تحميل المشروع...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">المشروع غير موجود</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          العودة إلى لوحة التحكم
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ProjectHeader
        projectName={project?.name || 'جار التحميل...'}
        projectId={id as string}
        userRole={userRole}
        showSupervisorMenu={showSupervisorMenu}
        onToggleSupervisorMenu={() => setShowSupervisorMenu(!showSupervisorMenu)}
        onAddSupervisor={() => { setShowAddSupervisorModal(true); setShowSupervisorMenu(false); }}
        onManageSupervisors={() => { setShowManageSupervisorsModal(true); setShowSupervisorMenu(false); }}
        supervisorMenuRef={supervisorMenuRef}
        projectImage={project?.cloudinary_image_id}
      />

      <div className="container mx-auto px-4 py-6 flex-grow">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-1/4">
            <ProjectSidebar project={project} members={members} />
          </div>

          {/* Main Content */}
          <div className="md:w-3/4">
            {/* Create Post Form */}
            <CreatePostForm
              newPostContent={newPostContent}
              onContentChange={setNewPostContent}
              showCodeInput={showCodeInput}
              onToggleCodeInput={() => setShowCodeInput(!showCodeInput)}
              newPostCode={newPostCode}
              onCodeChange={setNewPostCode}
              newPostCodeLanguage={newPostCodeLanguage}
              onLanguageChange={setNewPostCodeLanguage}
              isSubmittingPost={isSubmittingPost}
              onSubmitPost={handleSubmitPost}
              className="mb-6"
              userId={user.id}
              projectId={project.id}
            >
              <ImageUploader
                onImageSelect={handleImageUpload}
                onImageRemove={() => {
                  if (uploadedImagePublicId) {
                    handleImageDelete(uploadedImagePublicId);
                  } else {
                    setUploadedImage(null);
                  }
                }}
                imagePreview={uploadedImage}
                isUploading={isUploadingImage}
                uploadProgress={uploadProgress}
                maxSize={5}
                className="mt-4"
              />
            </CreatePostForm>

            {/* Posts List */}
            <div>
              <h2 className="text-xl font-bold mb-4 text-gray-900">منشورات المشروع</h2>
              {posts.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <h3 className="mt-2 text-base font-semibold text-gray-900">لا توجد منشورات</h3>
                  <p className="mt-1 text-sm text-gray-600">ابدأ بإنشاء أول منشور عن هذا المشروع.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      id={`post-${post.id}`}
                      className="bg-white rounded-lg shadow overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            {post.user.avatar_url ? (
                              <img
                                src={post.user.avatar_url}
                                alt={post.user.full_name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-indigo-600 font-medium">
                                  {post.user.full_name[0]}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <h3 className="text-base font-bold text-gray-900">
                                {post.user.full_name}
                              </h3>
                              <div className="flex space-x-2 rtl:space-x-reverse">
                                {userRole === 'owner' || post.user.id === user?.id ? (
                                  <>
                                    <button
                                      onClick={() => router.push(`/projects/edit-post/${post.id}`)}
                                      className="p-1.5 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                      title="تعديل"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeletePost(post.id)}
                                      className="p-1.5 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50"
                                      title="حذف"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <p className="text-sm font-medium text-gray-500 mb-3">
                              {formatDate(post.created_at)}
                              {post.created_at !== post.updated_at && " (معدل)"}
                            </p>
                            <div className="text-base text-gray-800 whitespace-pre-line leading-relaxed">
                              {post.content}
                            </div>

                            {/* عرض كود المنشور إذا وجد */}
                            {post.code_snippet_data && (
                              <div className="mt-4">
                                <CodeBlock 
                                  code={post.code_snippet_data.content || ''} 
                                  language={post.code_snippet_data.language || 'javascript'} 
                                  showLineNumbers={true}
                                />
                              </div>
                            )}

                            {/* عرض صورة المنشور إذا وجدت */}
                            {post.image_url && (
                              <div 
                                className="mt-4 relative group cursor-zoom-in overflow-hidden rounded-lg"
                                onClick={() => post.image_url && setSelectedImage(post.image_url)}
                              >
                                <ImageThumbnail
                                  url={post.image_url}
                                  maxWidth="100%"
                                  maxHeight="400px"
                                  onClick={() => post.image_url && setSelectedImage(post.image_url)}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white transform scale-75 group-hover:scale-100 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                            
                            {/* عدد المشاهدات */}
                            <div className="mt-3 flex items-center text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <div className="relative inline-block">
                                  <button
                                    className="flex items-center text-gray-500 hover:text-gray-700"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const el = e.currentTarget.nextElementSibling;
                                      if (el) {
                                        el.classList.toggle('hidden');
                                      }
                                    }}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                    <span className="ml-1">{post.views_count} مشاهدة</span>
                                  </button>
                                  <div className="hidden absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                      {post.viewers.map((viewer) => (
                                        <div
                                          key={viewer.id}
                                          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                          role="menuitem"
                                        >
                                          {viewer.avatar_url ? (
                                            <img
                                              src={viewer.avatar_url}
                                              alt={viewer.full_name}
                                              className="h-6 w-6 rounded-full ml-2"
                                            />
                                          ) : (
                                            <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center ml-2">
                                              <span className="text-indigo-600 text-xs">
                                                {viewer.full_name?.[0]}
                                              </span>
                                            </div>
                                          )}
                                          <span>{viewer.full_name || viewer.email}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* قسم التعليقات */}
                      <div className="bg-gray-50 px-6 py-3">
                        <CommentsList 
                          postId={post.id} 
                          comments={post.comments}
                          currentUserId={user?.id || ''}
                          onSubmitComment={handleSubmitComment}
                          onDeleteComment={(commentId: string) => handleDeleteComment(post.id, commentId)}
                          onUpdateComment={async (commentId: string, newContent: string) => {
                            const comment = post.comments.find(c => c.id === commentId);
                            if (comment) {
                              const commentWithUser = {
                                ...comment,
                                user: comment.user || { id: '', full_name: '', avatar_url: '' }
                              };
                              setCommentToEdit(commentWithUser);
                              setIsEditCommentModalOpen(true);
                            }
                            return Promise.resolve();
                          }}
                          onImageClick={(url: string) => setSelectedImage(url)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddSupervisorModal && (
        <AddSupervisorModal
          show={showAddSupervisorModal}
          onClose={() => setShowAddSupervisorModal(false)}
          query={newSupervisorQuery}
          onQueryChange={searchSupervisor}
          results={newSupervisorResults}
          isSearching={isSearchingSupervisor}
          onSelect={handleSelectSupervisor}
          isProcessing={isProcessingSupervisor}
          projectId={project.id}
          currentUserId={user.id}
        />
      )}

      {showManageSupervisorsModal && (
        <ManageSupervisorsModal
          show={showManageSupervisorsModal}
          onClose={() => setShowManageSupervisorsModal(false)}
          supervisors={members.filter(m => m.role === 'supervisor')}
          userRole={userRole}
          onRemove={handleRemoveSupervisor}
          isProcessing={isProcessingSupervisor}
        />
      )}

      {/* Edit Comment Modal */}
      <EditCommentModal
        isOpen={isEditCommentModalOpen}
        onClose={() => setIsEditCommentModalOpen(false)}
        comment={commentToEdit}
        userId={user?.id || ''}
        onCommentUpdated={(updatedComment) => {
          // بدلاً من محاولة تحديث الحالة مباشرة، نقوم بإعادة تحميل البيانات
          if (commentToEdit) {
            // تحديث محتوى التعليق في الواجهة فقط
            toast.success('تم تحديث التعليق بنجاح');
            // إغلاق النافذة المنبثقة
            setIsEditCommentModalOpen(false);
            // إعادة تحميل المنشورات لتحديث البيانات
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }}
      />

      {/* Notifications */}
      <Notifications
        successMessage={successMessage}
        errorMessage={error}
      />

      {/* Image Modal لعرض الصورة بالحجم الكامل عند النقر */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedImage}
              alt="صورة بالحجم الكامل"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-2 right-2 flex space-x-2">
              <a 
                href={selectedImage} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-white rounded-full hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <button 
                className="p-2 bg-white rounded-full hover:bg-gray-100"
                onClick={() => setSelectedImage(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
