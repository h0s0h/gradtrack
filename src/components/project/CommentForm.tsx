'use client';

import React, { useState, ChangeEvent, FormEvent, useRef } from 'react';
import { ImageThumbnail } from './ImageComponents';
import { toast } from 'sonner';
import LanguageSelector from '@/components/common/LanguageSelector';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_COMMENT_LENGTH = 500;
const MAX_CODE_LENGTH = 1000;

function formatCharacterCount(current: number, max: number): string {
  return `${current}/${max}`;
}

interface CommentFormProps {
  postId: string;
  onSubmit: (
    postId: string,
    content: string,
    codeSnippet?: string,
    codeLanguage?: string,
    commentImageFile?: File,
    clearForm?: () => void
  ) => Promise<void>;
  isSubmitting?: boolean;
  currentUserId: string;
}

export default function CommentForm({ 
  postId, 
  onSubmit, 
  isSubmitting = false,
  currentUserId
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      
      // Set selected image file for upload
      setSelectedImage(file);
      
      // Create and show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearForm = () => {
    setContent('');
    setSelectedImage(null);
    setImagePreview(null);
    setShowCodeInput(false);
    setCodeContent('');
    setCodeLanguage('javascript');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedImage && !codeContent.trim()) return;

    try {
      await onSubmit(
        postId,
        content,
        showCodeInput ? codeContent : '',
        showCodeInput ? codeLanguage : '',
        selectedImage || undefined,
        clearForm
      );
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('حدث خطأ أثناء إرسال التعليق');
    }
  };

  const toggleCodeInput = () => {
    setShowCodeInput(!showCodeInput);
    if (!showCodeInput) {
      setCodeLanguage('javascript');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="relative">
        {imagePreview && (
          <div className="mb-3">
            <div className="relative inline-block">
              <ImageThumbnail
                url={imagePreview}
                onClick={() => {}}
                maxWidth="180px"
                maxHeight="180px"
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-sm"
                aria-label="حذف الصورة"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="أضف تعليقًا..."
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base leading-relaxed text-gray-900 placeholder-gray-500"
            rows={3}
            dir="rtl"
            aria-label="محتوى التعليق"
          />
        </div>
      </div>
      
      <AnimatePresence>
        {showCodeInput && (
          <motion.div 
            className="mt-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center mb-2">
              <LanguageSelector
                selectedLanguage={codeLanguage}
                onLanguageChange={setCodeLanguage}
              />
              <button
                type="button"
                onClick={toggleCodeInput}
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                إزالة الكود
              </button>
            </div>
            <div className="relative">
              <textarea
                value={codeContent}
                onChange={(e) => setCodeContent(e.target.value)}
                placeholder="// أدخل الكود هنا..."
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm leading-relaxed bg-gray-50"
                rows={6}
                dir="ltr"
                aria-label="محتوى الكود"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex justify-between items-center">
        <div className="flex space-x-3 rtl:space-x-reverse">
          <label className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
              aria-label="اختيار صورة"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            إضافة صورة
          </label>

          {!showCodeInput && (
            <button
              type="button"
              onClick={toggleCodeInput}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              إضافة كود
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={
            (!content.trim() && !selectedImage && !codeContent.trim()) || 
            isSubmitting
          }
          className={`px-5 py-2 rounded-md text-white font-medium text-base flex items-center shadow-sm ${
            (!content.trim() && !selectedImage && !codeContent.trim()) || 
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          aria-label={isSubmitting ? 'جارٍ إرسال التعليق' : 'إرسال التعليق'}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin h-5 w-5 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              جارٍ الإرسال...
            </span>
          ) : (
            'إرسال'
          )}
        </button>
      </div>
    </form>
  );
}