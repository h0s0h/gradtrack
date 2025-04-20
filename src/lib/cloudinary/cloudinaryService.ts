/**
 * Service for handling image uploads and transformations with Cloudinary
 */

interface UploadResponse {
  url: string;
  publicId: string;
}

/**
 * Uploads an image to Cloudinary with optimizations
 */
export const uploadImage = async (
  file: File | string,
  folder = 'gradtrack-images'
): Promise<UploadResponse> => {
  try {
    let imageToUpload: string;
    
    if (typeof file === 'string') {
      // If it's already a base64 string
      imageToUpload = file.startsWith('data:') ? file : `data:image/jpeg;base64,${file}`;
    } else {
      // Convert File to base64
      imageToUpload = await fileToBase64(file);
    }

    const response = await fetch('/api/cloudinary/images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageToUpload,
        folder: folder,
        transformation: {
          quality: 'auto',
          fetch_format: 'auto',
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      url: data.url,
      publicId: data.publicId
    };
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
};

/**
 * Deletes an image from Cloudinary
 */
export const deleteImage = async (publicId: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_id: publicId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Deletion failed: ${response.status}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error in deleteImage:', error);
    throw error;
  }
};

/**
 * Optimizes an image URL using Cloudinary transformations
 */
export const optimizeImageUrl = (url: string, options: { width?: number; height?: number; quality?: number } = {}) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const { width, height, quality = 'auto' } = options;
  const transformations = [];

  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push(`q_${quality}`);
  transformations.push('f_auto');

  const transformationString = transformations.join(',');
  return url.replace('/upload/', `/upload/${transformationString}/`);
};

/**
 * Converts a File object to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};