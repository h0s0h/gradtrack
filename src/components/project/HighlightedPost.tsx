'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface HighlightedPostProps {
  posts: any[];
  onHighlight?: (postId: string | null) => void;
}

export default function HighlightedPost({ posts, onHighlight }: HighlightedPostProps) {
  const searchParams = useSearchParams();
  const hasScrolled = useRef(false);

  useEffect(() => {
    // تجنب التمرير المتكرر عند تحديث المكون
    if (hasScrolled.current) return;

    const postId = searchParams.get('postId');
    if (postId && posts.length > 0) {
      const postElement = document.getElementById(`post-${postId}`);
      if (postElement) {
        // تمرير إلى المنشور مع تأثير سلس
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // إضافة تأثير التركيز
        postElement.classList.add('ring-2', 'ring-indigo-500', 'transition-all', 'duration-500');
        
        // إزالة التأثير بعد ثانيتين
        setTimeout(() => {
          postElement.classList.remove('ring-2', 'ring-indigo-500');
        }, 2000);

        // تحديث حالة التركيز
        onHighlight?.(postId);
        hasScrolled.current = true;
      }
    }

    // إعادة تعيين عند تغيير المنشورات
    return () => {
      hasScrolled.current = false;
    };
  }, [searchParams, posts, onHighlight]);

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-indigo-500">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center">
            <div className="w-14 h-14 relative">
              {post.user?.avatar_url ? (
                <img
                  src={post.user.avatar_url}
                  alt={post.user.full_name}
                  className="w-full h-full rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-semibold text-indigo-600">
                    {post.user?.full_name?.charAt(0) || '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="mr-4">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {post.user?.full_name}
              </h3>
              <p className="text-sm text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(post.created_at)}
                {post.updated_at && post.updated_at !== post.created_at && (
                  <span className="mr-2 text-gray-400">(تم التعديل)</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {post.user_id === currentUserId && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                  title="تعديل المنشور"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeletePost()}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="حذف المنشور"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdatePost} className="mb-6">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base leading-relaxed text-gray-900"
              rows={6}
              dir="rtl"
              required
            />
            <div className="mt-3 flex justify-end space-x-2 rtl:space-x-reverse">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-6">
            <div className="prose max-w-none text-lg text-gray-800 leading-relaxed">
              {post.content}
            </div>

            {post.image_url && (
              <div className="mt-4 rounded-lg overflow-hidden">
                <img
                  src={post.image_url}
                  alt="صورة المنشور"
                  className="w-full h-auto max-h-[500px] object-contain"
                  onClick={() => setSelectedImage(post.image_url)}
                />
              </div>
            )}

            {post.codeData && (
              <div className="mt-4">
                <div className="bg-gray-800 text-white text-sm py-2 px-4 rounded-t-md flex justify-between items-center">
                  <span className="font-medium">{post.codeData.language}</span>
                </div>
                <div className="relative">
                  <pre className="language-${post.codeData.language} rounded-b-md">
                    <code className="text-sm leading-relaxed">
                      {post.codeData.content}
                    </code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <button
              onClick={onToggleComments}
              className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-medium">
                {post.comments.length} تعليق
              </span>
            </button>

            <button
              onClick={() => setShowViewers(!showViewers)}
              className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm font-medium">
                {post.viewers?.length || 0} مشاهدة
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* عرض المشاهدين */}
      {showViewers && post.viewers && post.viewers.length > 0 && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">المشاهدون:</h4>
          <div className="flex flex-wrap gap-2">
            {post.viewers.map((viewer) => (
              <div
                key={viewer.id}
                className="flex items-center bg-white px-3 py-1 rounded-full border border-gray-200"
              >
                {viewer.avatar_url ? (
                  <img
                    src={viewer.avatar_url}
                    alt={viewer.full_name}
                    className="w-6 h-6 rounded-full ml-2"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center ml-2">
                    <span className="text-xs font-semibold text-indigo-600">
                      {viewer.full_name?.[0] || '?'}
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-700">{viewer.full_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* عرض التعليقات */}
      {showComments && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="p-6">
            <CommentsList
              postId={post.id}
              comments={post.comments}
              currentUserId={currentUserId}
              onSubmitComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onUpdateComment={handleUpdateComment}
            />
          </div>
        </div>
      )}

      {/* صورة كبيرة للعرض */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}