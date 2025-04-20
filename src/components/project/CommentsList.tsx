'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Comment from './Comment';
import CommentForm from './CommentForm';
import { User } from '@/lib/supabase/schema';
import { ImageModal } from './ImageComponents';

interface CommentData {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  code_snippet?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  user: User;
  code_snippet_data?: {
    content: string;
    language: string;
  } | null;
}

interface CommentsListProps {
  postId: string;
  comments: (CommentData & { 
    user: User;
    image_public_id?: string;
    views_count: number;
    viewers: User[];
  })[];
  currentUserId: string;
  onSubmitComment: (
    postId: string,
    content: string,
    codeSnippet?: string,
    codeLanguage?: string,
    commentImageFile?: File,
    clearForm?: () => void
  ) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onUpdateComment?: (commentId: string, newContent: string) => Promise<void>;
  onImageClick?: (url: string) => void;
}

const CommentsList: React.FC<CommentsListProps> = ({
  postId,
  comments,
  currentUserId,
  onSubmitComment,
  onDeleteComment,
  onUpdateComment = async () => {}
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(comments.length <= 3);
  
  // فلترة التعليقات حسب حالة التوسيع
  const visibleComments = isExpanded 
    ? comments 
    : comments.slice(Math.max(0, comments.length - 3));

  // تحديد إذا كان هناك المزيد من التعليقات للعرض
  const hasMoreComments = comments.length > 3;
  
  return (
    <div className="mt-4">
      <div className="flex items-center mb-3">
        <h3 className="text-md font-medium text-gray-900">التعليقات ({comments.length})</h3>
        
        {hasMoreComments && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-3 text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors flex items-center"
          >
            {isExpanded ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                إخفاء
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                عرض الكل ({comments.length})
              </>
            )}
          </button>
        )}
      </div>
      
      {/* نموذج إضافة تعليق جديد */}
      <CommentForm
        postId={postId}
        currentUserId={currentUserId}
        onSubmit={onSubmitComment}
        isSubmitting={false}
      />
      
      {/* قائمة التعليقات الحالية */}
      <AnimatePresence initial={false}>
        {visibleComments.map((comment) => (
          <motion.div
            key={comment.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <Comment
              comment={comment}
              currentUserId={currentUserId}
              onDelete={(commentId) => onDeleteComment(commentId)}
              onUpdate={(commentId, newContent) => onUpdateComment(commentId, newContent)}
            >
              {comment.image_url && (
                <div 
                  className="mt-2 cursor-zoom-in"
                  onClick={() => setSelectedImage(comment.image_url)}
                >
                  <img 
                    src={comment.image_url} 
                    alt="صورة التعليق" 
                    className="max-w-full max-h-[200px] rounded-lg object-cover"
                  />
                </div>
              )}
            </Comment>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* زر عرض المزيد من التعليقات */}
      {!isExpanded && hasMoreComments && (
        <div className="text-center mt-2">
          <motion.button
            onClick={() => setIsExpanded(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            عرض {comments.length - 3} تعليقات أخرى...
          </motion.button>
        </div>
      )}
      
      {/* معرض الصور للعرض الكامل */}
      {selectedImage && (
        <ImageModal
          url={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

export default CommentsList;