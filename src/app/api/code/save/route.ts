// src/app/api/code/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { saveCodeSnippet, CodeSnippet } from '@/lib/firebase/codes';

export async function POST(request: NextRequest) {
  try {
    // التحقق من المصادقة (يمكن إضافة منطق المصادقة هنا)
    
    // الحصول على البيانات من الطلب
    const data = await request.json();
    const { content, language, relatedId, relatedType, id, createdBy } = data;
    
    // التحقق من البيانات المطلوبة
    if (!content || !language || !relatedId || !relatedType) {
      return NextResponse.json(
        { error: 'يجب توفير جميع البيانات المطلوبة' },
        { status: 400 }
      );
    }
    
    // إعداد بيانات مقطع الكود
    const codeData: CodeSnippet = {
      content,
      language,
      relatedId,
      relatedType,
      createdBy
    };
    
    // إضافة المعرف إذا كان موجوداً (للتحديث)
    if (id) {
      codeData.id = id;
    }
    
    // حفظ مقطع الكود
    const codeId = await saveCodeSnippet(codeData);
    
    // إرجاع النتيجة
    return NextResponse.json({ id: codeId, success: true });
  } catch (error) {
    console.error('خطأ في حفظ مقطع الكود:', error);
    return NextResponse.json(
      { error: `فشل حفظ مقطع الكود: ${error.message}` },
      { status: 500 }
    );
  }
}
