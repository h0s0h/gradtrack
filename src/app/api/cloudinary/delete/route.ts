import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// تكوين Cloudinary
const configCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

// دالة حذف الصورة من Cloudinary
export async function POST(req) {
  try {
    configCloudinary();
    
    // قراءة بيانات الجسم
    const body = await req.json();
    const { public_id } = body;
    
    // التحقق من وجود معرف الصورة
    if (!public_id) {
      console.error('No public_id provided');
      return NextResponse.json(
        { error: 'معرف الصورة مطلوب' },
        { status: 400 }
      );
    }
    
    console.log('Deleting image with public_id:', public_id);
    
    // حذف الصورة من Cloudinary
    const result = await cloudinary.uploader.destroy(public_id);
    
    console.log('Delete result:', result);
    
    // التحقق من نجاح العملية
    if (result.result === 'ok') {
      return NextResponse.json({
        success: true,
        message: 'تم حذف الصورة بنجاح'
      });
    } else {
      return NextResponse.json(
        { error: 'فشل حذف الصورة', details: result },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: `خطأ أثناء حذف الصورة: ${error.message}` },
      { status: 500 }
    );
  }
} 