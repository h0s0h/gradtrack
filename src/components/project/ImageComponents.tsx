import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface ImageThumbnailProps {
  url: string;
  onClick?: () => void;
  maxWidth?: string;
  maxHeight?: string;
}

export function ImageThumbnail({ url, onClick, maxWidth = "120px", maxHeight = "120px" }: ImageThumbnailProps) {
  return (
    <div 
      className="relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
      style={{ maxWidth, maxHeight }}
      onClick={onClick}
      role="button"
      aria-label="عرض الصورة في الحجم الكامل"
    >
      <img
        src={url}
        alt="معاينة الصورة"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  // إغلاق النافذة عند النقر خارج الصورة
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // إغلاق النافذة عند الضغط على ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-[90vw] max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
          aria-label="إغلاق الصورة"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={imageUrl}
          alt="عرض الصورة بالحجم الكامل"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-xl"
        />
      </div>
    </div>
  );
}