// /components/CommentSection.tsx

import React, { useState } from 'react';
import { User, Comment } from '@/lib/supabase/schema';
import CodeBlock from '@/components/common/CodeBlock';
import LanguageSelector from '@/components/common/LanguageSelector';
import { detectLanguage } from '@/utils/codeUtils';

interface CommentSectionProps {
  comments: (Comment & { user: User })[];
  currentUser: User;
  userRole: string | null;
  postOwnerId: string;
  onSubmitComment: (content: string, codeSnippet?: string, codeLanguage?: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  formatDate: (dateString: string) => string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  currentUser,
  userRole,
  postOwnerId,
  onSubmitComment,
  onDeleteComment,
  formatDate
}) => {
  const [newComment, setNewComment] = useState('');
  const [newCommentCode, setNewCommentCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [commentCodeLanguage, setCommentCodeLanguage] = useState('javascript');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Soumission d'un commentaire avec support pour le code et le langage
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      setIsSubmittingComment(true);
      await onSubmitComment(
        newComment, 
        newCommentCode, 
        newCommentCode ? commentCodeLanguage : undefined
      );
      setNewComment('');
      setNewCommentCode('');
      setShowCodeInput(false);
      setCommentCodeLanguage('javascript');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Vérification des permissions pour la suppression des commentaires
  const canDeleteComment = (comment: Comment & { user: User }) => 
    currentUser.id === comment.user_id || 
    currentUser.id === postOwnerId || 
    userRole === 'owner' || 
    userRole === 'supervisor';

  return (
    <div className="bg-gray-50 p-6 border-t border-gray-100">
      {/* Formulaire d'ajout de commentaire */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex items-start mb-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3 mt-1">
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-8 h-8 rounded-full" />
            ) : (
              <span className="text-indigo-600 font-semibold">
                {currentUser.full_name?.charAt(0) || currentUser.email.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <textarea
              className="w-full px-3 py-2 border border-gray-400 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition"
              rows={2}
              placeholder="أضف تعليقًا..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              dir="rtl"
            ></textarea>
            
            <div className="flex justify-between items-center mt-2">
              <button
                type="button"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className="text-sm text-indigo-600 hover:text-indigo-800 transition flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {showCodeInput ? 'إخفاء الكود' : 'إضافة كود'}
              </button>
              
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition disabled:opacity-70 flex items-center text-sm"
              >
                {isSubmittingComment ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    إرسال
                  </>
                )}
              </button>
            </div>
            
            {/* Champ d'entrée de code avec sélecteur de langage */}
            {showCodeInput && (
              <>
                <LanguageSelector
                  selectedLanguage={commentCodeLanguage}
                  onLanguageChange={setCommentCodeLanguage}
                />
                <textarea
                  className="w-full px-3 py-2 border border-gray-400 rounded-md font-mono text-sm bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition mt-2"
                  rows={3}
                  placeholder="// أضف الكود هنا"
                  value={newCommentCode}
                  onChange={(e) => setNewCommentCode(e.target.value)}
                  dir="ltr"
                ></textarea>
              </>
            )}
          </div>
        </div>
      </form>
      
      {/* Liste des commentaires */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 py-4">لا توجد تعليقات بعد. كن أول من يعلق!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start group">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3 mt-1">
                {comment.user.avatar_url ? (
                  <img src={comment.user.avatar_url} alt={comment.user.full_name} className="w-8 h-8 rounded-full" />
                ) : (
                  <span className="text-indigo-600 font-semibold">
                    {comment.user.full_name?.charAt(0) || comment.user.email.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{comment.user.full_name || comment.user.email}</p>
                      <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                    </div>
                    {canDeleteComment(comment) && (
                      <button 
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-gray-800 mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
                  
                  {/* Utilisation du composant CodeBlock pour afficher le code du commentaire */}
                  {comment.code_snippet && (
                    <CodeBlock 
                      code={comment.code_snippet} 
                      language={comment.code_language || detectLanguage(comment.code_snippet)}
                      showLineNumbers={false}
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;
