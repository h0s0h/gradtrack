import { useState, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { ImageThumbnail } from './ImageComponents';
import { uploadImage } from '@/lib/cloudinary/cloudinaryService';

interface MediaUploaderProps {
  onFileSelect: (file: File) => void;
  onUploadComplete: (url: string) => void;
  onCancel: () => void;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  showPreview?: boolean;
}

export default function MediaUploader({
  onFileSelect,
  onUploadComplete,
  onCancel,
  maxSize = 5, // Default 5MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  showPreview = true,
}: MediaUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`حجم الملف يجب أن يكون أقل من ${maxSize} ميجابايت`);
      return;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    // Create preview if enabled
    if (showPreview) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      const { url } = await uploadImage(selectedFile);
      onUploadComplete(url);
      
      // Reset state
      setSelectedFile(null);
      setPreview(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    onCancel();
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <label className="cursor-pointer flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors">
          <input
            type="file"
            className="hidden"
            accept={allowedTypes.join(',')}
            onChange={handleFileSelect}
          />
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="mt-2 block text-sm text-gray-600">اختر ملفاً أو اسحبه هنا</span>
          </div>
        </label>
      ) : (
        <div className="relative">
          {preview && showPreview && (
            <div className="relative inline-block">
              <ImageThumbnail
                url={preview}
                onClick={() => {}}
                maxWidth="200px"
                maxHeight="200px"
              />
              <button
                type="button"
                onClick={handleCancel}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
              disabled={isUploading}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  جارِ الرفع...
                </span>
              ) : (
                'رفع'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}