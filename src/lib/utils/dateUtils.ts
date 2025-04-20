import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

/**
 * تنسيق التاريخ الميلادي
 * @param dateString سلسلة نصية تمثل التاريخ
 * @param formatPattern نمط التنسيق (اختياري)
 * @returns التاريخ المنسق
 */
export function formatDate(dateString: string | null, formatPattern: string = 'dd MMM yyyy') {
  if (!dateString) return 'غير محدد';
  
  try {
    return format(new Date(dateString), formatPattern, { locale: arSA });
  } catch (error) {
    console.error('خطأ في تنسيق التاريخ:', error);
    return dateString;
  }
} 