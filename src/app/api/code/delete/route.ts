// src/app/api/code/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteCodeSnippet } from '@/lib/firebase/codes';

export async function DELETE(request: NextRequest) {
  try {
    // التحقق من المصادقة (يمكن إضافة منطق المصادقة هنا)
    
    // الحصول على المعلمات من URL
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    // التحقق من توفير معرف الكود
    if (!id) {
      return NextResponse.json(
        { error: 'يجب توفير معرف الكود للحذف' },
        { status: 400 }
      );
    }
    
    // حذف مقطع الكود
    await deleteCodeSnippet(id);
    
    // إرجاع النتيجة
    return NextResponse.json({ success: true, message: 'تم حذف مقطع الكود بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف مقطع الكود:', error);
    return NextResponse.json(
      { error: `فشل حذف مقطع الكود: ${error.message}` },
      { status: 500 }
    );
  }
}
