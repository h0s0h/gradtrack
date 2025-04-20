'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { User } from '@/lib/supabase/schema';
import { CodeBlock } from '@/components/common/CodeBlock';

interface CommentProps {
  comment: {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
    user: User;
    code_snippet_data?: {
      content: string;
      language: string;
    } | null;
    viewers?: User[];
    views_count?: number;
  };
  currentUserId: string;
  onDelete: (commentId: string) => void;
  onUpdate: (commentId: string, newContent: string) => Promise<void>;
  children?: React.ReactNode;
}

const Comment: React.FC<CommentProps> = ({
  comment,
  currentUserId,
  onDelete,
  onUpdate,
  children
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showViewers, setShowViewers] = useState(false);

  const formatDate = (dateString: string) =>
    format(new Date(dateString), 'dd MMM yyyy - HH:mm', { locale: arSA });

  const handleUpdateComment = async () => {
    if (!editedContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onUpdate(comment.id, editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex space-x-3 rtl:space-x-reverse">
        <div className="flex-shrink-0">
          {comment.user.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={comment.user.full_name}
              className="h-10 w-10 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shadow-sm">
              <span className="text-indigo-600 font-semibold text-lg">
                {comment.user.full_name?.[0]}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="font-semibold text-gray-900">
                {comment.user.full_name}
              </span>
              <span className="text-sm text-gray-500">
                {formatDate(comment.created_at)}
                {comment.updated_at !== comment.created_at && ' (معدل)'}
              </span>
            </div>
          </div>

          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base leading-relaxed text-gray-900"
                rows={3}
                dir="rtl"
              />
              <div className="mt-2 flex justify-end space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isSubmitting}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateComment}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-base text-gray-800 whitespace-pre-line leading-relaxed">
                {comment.content}
              </p>
              
              {comment.code_snippet_data && (
                <div className="mt-3">
                  {/* <div className="bg-gray-800 text-white text-xs py-2 px-4 rounded-t-md flex justify-between items-center">
                    <span className="font-medium">{comment.code_snippet_data.language || 'code'}</span>
                  </div> */}
                  <CodeBlock
                    code={comment.code_snippet_data.content}
                    language={comment.code_snippet_data.language}
                  />
                </div>
              )}
              
              {children}
              
              {(currentUserId === comment.user.id) && (
                <div className="mt-2 flex space-x-4 rtl:space-x-reverse">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                  >
                    حذف
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comment;