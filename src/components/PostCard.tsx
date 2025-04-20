import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CodeBlock } from '@/components/common/CodeBlock';
import LanguageSelector from '@/components/common/LanguageSelector';
import { ImageThumbnail, ImageModal } from '@/components/project/ImageComponents';
import { optimizeImageUrl } from '@/lib/cloudinary/cloudinaryService';

interface PostCardProps {
  post: {
    id: string;
    content: string;
    code_snippet: string | null;
    image_url: string | null;
    created_at: string;
    views_count: number;
    user: {
      id: string;
      full_name: string;
      email: string;
      avatar_url?: string;
    };
    comments: Array<{
      id: string;
      content: string;
      code_snippet: string | null;
      image_url: string | null;
      created_at: string;
      user_id: string;
      user: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
      };
      code_snippet_data?: {
        content: string;
        language: string;
      };
    }>;
    code_snippet_data?: {
      content: string;
      language: string;
    };
  };
  currentUser: {
    id: string;
  };
  userRole: 'owner' | 'supervisor' | 'member';
  onSubmitComment: (postId: string, content: string, image: File | null, codeSnippet?: string, codeLanguage?: string) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
  onUpdatePost: (post: any) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  animationDelay: number;
  formatDate: (date: string) => string;
}

export default function PostCard({
  post,
  currentUser,
  userRole,
  onSubmitComment,
  onDeleteComment,
  onUpdatePost,
  onDeletePost,
  animationDelay,
  formatDate
}: PostCardProps) {
  // State for comment form
  const [commentContent, setCommentContent] = useState('');
  const [commentCode, setCommentCode] = useState('');
  const [commentCodeLanguage, setCommentCodeLanguage] = useState('javascript');
  const [showCommentCodeInput, setShowCommentCodeInput] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editedCode, setEditedCode] = useState(post.code_snippet || '');
  const [editedCodeLanguage, setEditedCodeLanguage] = useState(post.code_snippet_data?.language || 'javascript');
  const [showEditCodeInput, setShowEditCodeInput] = useState(!!post.code_snippet);
  
  // State for code visibility
  const [isCodeVisible, setIsCodeVisible] = useState(true);

  // Comments with code visibility tracking
  const [commentsCodeVisibility, setCommentsCodeVisibility] = useState<{ [key: string]: boolean }>({});

  // Image handling state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCommentImage, setSelectedCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  
  // Check if the current user can edit/delete this post
  const canModify = currentUser.id === post.user.id || userRole === 'owner' || userRole === 'supervisor';

  // Animation variants
  const postAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: animationDelay } }
  };

  // Helper function to get code language with proper type
  const getCodeLanguage = (language: string | undefined): string => {
    return language || 'javascript';
  };

  // Submit edited post
  const handleSubmitEdit = async () => {
    const updatedPost = {
      ...post,
      content: editedContent,
      code_snippet: showEditCodeInput ? editedCode : null,
      code_snippet_data: showEditCodeInput ? {
        content: editedCode,
        language: editedCodeLanguage
      } : undefined
    };
    
    await onUpdatePost(updatedPost);
    setIsEditing(false);
  };

  // Submit new comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() && !selectedCommentImage) return;
    
    setIsSubmittingComment(true);
    
    try {
      await onSubmitComment(
        post.id, 
        commentContent,
        selectedCommentImage,
        showCommentCodeInput ? commentCode : '', 
        showCommentCodeInput ? commentCodeLanguage : ''
      );
      
      // Reset form
      setCommentContent('');
      setCommentCode('');
      setShowCommentCodeInput(false);
      setSelectedCommentImage(null);
      setCommentImagePreview(null);
      
      // Show comments after posting
      setShowComments(true);
    } catch (error) {
      console.error('Error submitting comment', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle image selection for comments
  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      
      setSelectedCommentImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCommentImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle comment code visibility
  const toggleCommentCodeVisibility = (commentId: string) => {
    setCommentsCodeVisibility(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  // Render comment images with proper optimization
  const renderCommentImage = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    
    const optimizedUrl = optimizeImageUrl(imageUrl, { width: 180, height: 180 });
    return (
      <ImageThumbnail
        url={optimizedUrl}
        onClick={() => setSelectedImage(imageUrl)}
        maxWidth="180px"
        maxHeight="180px"
      />
    );
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={postAnimation}
      className="bg-white rounded-lg shadow-md overflow-hidden"
    >
      {/* Post header */}
      <div className="p-6 pb-3">
        <div className="flex justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center ml-3">
              {post.user.avatar_url ? (
                <img src={post.user.avatar_url} alt={post.user.full_name} className="w-10 h-10 rounded-full" />
              ) : (
                <span className="text-indigo-600 font-bold">{post.user.full_name?.charAt(0) || post.user.email.charAt(0)}</span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{post.user.full_name || post.user.email}</h3>
              <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
            </div>
          </div>
          
          {canModify && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-gray-400 hover:text-indigo-600 transition"
                aria-label="تعديل"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDeletePost(post.id)}
                className="text-gray-400 hover:text-red-600 transition"
                aria-label="حذف"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Post content */}
        {isEditing ? (
          <div className="mb-4">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
              dir="rtl"
            />
            
            <div className="flex justify-between items-center mt-2 mb-2">
              <button
                type="button"
                onClick={() => setShowEditCodeInput(!showEditCodeInput)}
                className="text-sm text-indigo-600 hover:text-indigo-800 transition flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {showEditCodeInput ? 'إخفاء الكود' : 'إضافة كود'}
              </button>
            </div>
            
            {showEditCodeInput && (
              <>
                <div className="mb-2">
                  <LanguageSelector
                    selectedLanguage={editedCodeLanguage}
                    onLanguageChange={setEditedCodeLanguage}
                  />
                </div>
                <textarea
                  value={editedCode}
                  onChange={(e) => setEditedCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  rows={4}
                  dir="ltr"
                />
              </>
            )}
            
            <div className="flex justify-end space-x-2 mt-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmitEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-gray-800 whitespace-pre-line mb-4" dir="rtl">{post.content}</div>
            
            {/* Post image */}
            {post.image_url && (
              <div className="mb-4">
                <ImageThumbnail
                  url={optimizeImageUrl(post.image_url, { width: 600 })}
                  onClick={() => setSelectedImage(post.image_url)}
                  maxWidth="100%"
                />
              </div>
            )}
            
            {/* Code snippet with toggle button */}
            {post.code_snippet && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 ml-2">الكود:</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md">{post.code_snippet_data?.language}</span>
                  </div>
                  <button
                    onClick={() => setIsCodeVisible(!isCodeVisible)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    {isCodeVisible ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        إخفاء الكود
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        عرض الكود
                      </>
                    )}
                  </button>
                </div>
                
                  {isCodeVisible && (
                         <><div className="bg-gray-800 text-white text-xs py-2 px-4 rounded-t-md flex justify-between items-center">
                         <span className="font-medium">{post.code_snippet_data?.language || 'code'}</span>
                       </div>
                  <CodeBlock
                    code={post.code_snippet}
                    language={getCodeLanguage(post.code_snippet_data?.language)}
                    showLineNumbers={true}
                      />
                      </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Post footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-gray-600 hover:text-indigo-600 flex items-center transition text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{post.comments.length} تعليق</span>
            </button>
          </div>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-gray-500 text-sm">{post.views_count}</span>
          </div>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="pt-2 border-t border-gray-100">
            {/* Comment list */}
            {post.comments.length > 0 && (
              <div className="mb-4 space-y-4">
                {post.comments.map(comment => {
                  // Initialize comment code visibility if not yet set
                  if (commentsCodeVisibility[comment.id] === undefined) {
                    commentsCodeVisibility[comment.id] = true;
                  }
                  
                  return (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center ml-2">
                            {comment.user.avatar_url ? (
                              <img src={comment.user.avatar_url} alt={comment.user.full_name} className="w-8 h-8 rounded-full" />
                            ) : (
                              <span className="text-indigo-600 font-semibold">{comment.user.full_name?.charAt(0) || comment.user.email.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">{comment.user.full_name || comment.user.email}</p>
                            <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                          </div>
                        </div>
                        
                        {(currentUser.id === comment.user_id || userRole === 'owner' || userRole === 'supervisor') && (
                          <button
                            onClick={() => onDeleteComment(post.id, comment.id)}
                            className="text-gray-400 hover:text-red-600 transition"
                            aria-label="حذف التعليق"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <div className="text-gray-800 text-sm whitespace-pre-line" dir="rtl">{comment.content}</div>
                      
                      {/* Comment image */}
                      {comment.image_url && (
                        <div className="mt-2">
                          {renderCommentImage(comment.image_url)}
                        </div>
                      )}
                      
                      {/* Comment code snippet with toggle button */}
                      {comment.code_snippet && (
                        <div className="mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                              <span className="text-xs font-medium text-gray-700 ml-2">الكود:</span>
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{comment.code_snippet_data?.language}</span>
                            </div>
                            <button
                              onClick={() => toggleCommentCodeVisibility(comment.id)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                            >
                              {commentsCodeVisibility[comment.id] ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  إخفاء الكود
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  عرض الكود
                                </>
                              )}
                            </button>
                          </div>
                          
                          {commentsCodeVisibility[comment.id] && (
                            <CodeBlock
                              code={comment.code_snippet}
                              language={getCodeLanguage(comment.code_snippet_data?.language)}
                              showLineNumbers={true}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add comment form */}
            <form onSubmit={handleSubmitComment} className="mt-3">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="أضف تعليقك..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                rows={2}
                dir="rtl"
                required
              />
              
              {/* Comment image upload */}
              {commentImagePreview && (
                <div className="mt-2 relative inline-block">
                  <ImageThumbnail
                    url={commentImagePreview}
                    onClick={() => {}}
                    maxWidth="120px"
                    maxHeight="120px"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCommentImage(null);
                      setCommentImagePreview(null);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCommentImageSelect}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    إضافة صورة
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setShowCommentCodeInput(!showCommentCodeInput)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 transition flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    {showCommentCodeInput ? 'إخفاء الكود' : 'إضافة كود'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingComment || (!commentContent.trim() && !selectedCommentImage)}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-70 text-sm flex items-center"
                >
                  {isSubmittingComment ? (
                    <>
                      <svg className="animate-spin h-4 w-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      إرسال
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Image modal */}
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
            <button 
              className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
              onClick={() => setSelectedImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}