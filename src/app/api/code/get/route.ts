// src/app/api/code/get/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCodeSnippetById, getCodeSnippetsByRelatedId } from '@/lib/firebase/codes';

export async function GET(request: NextRequest) {
  try {
    // الحصول على المعلمات من URL
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const relatedId = searchParams.get('relatedId');
    const relatedType = searchParams.get('relatedType') as 'post' | 'comment';
    
    // التحقق من توفير معلمات البحث
    if (!id && (!relatedId || !relatedType)) {
      return NextResponse.json(
        { error: 'يجب توفير معرف الكود أو معرف العنصر المرتبط ونوعه' },
        { status: 400 }
      );
    }
    
    let result;
    
    // الحصول على مقطع كود واحد أو مجموعة من مقاطع الكود
    if (id) {
      result = await getCodeSnippetById(id);
      if (!result) {
        return NextResponse.json(
          { error: 'مقطع الكود غير موجود' },
          { status: 404 }
        );
      }
    } else {
      result = await getCodeSnippetsByRelatedId(relatedId!, relatedType);
    }
    
    // إرجاع النتيجة
    return NextResponse.json(result);
  } catch (error) {
    console.error('خطأ في الحصول على مقطع الكود:', error);
    return NextResponse.json(
      { error: `فشل الحصول على مقطع الكود: ${error.message}` },
      { status: 500 }
    );
  }
}
