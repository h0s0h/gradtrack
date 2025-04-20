import { supabase } from '@/lib/supabase/client';

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark';
  language: 'ar' | 'en' | 'fr';
  created_at: string;
  updated_at: string;
}

/**
 * الحصول على تفضيلات المستخدم الحالي
 * @returns تفضيلات المستخدم
 */
export async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_preferences');
    
    if (error) {
      console.error('خطأ في الحصول على تفضيلات المستخدم:', error);
      return null;
    }
    
    return data as UserPreferences;
  } catch (error) {
    console.error('خطأ غير متوقع:', error);
    return null;
  }
}

/**
 * تحديث تفضيلات المستخدم بشكل عام
 * @param preferences التفضيلات المراد تحديثها
 * @returns البيانات المحدثة أو null في حالة الخطأ
 */
export async function updateUserPreferences(
  preferences: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error('لا يوجد مستخدم مسجل الدخول');
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userData.user.id,
        ...preferences
      }, {
        onConflict: 'user_id'
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('خطأ في تحديث تفضيلات المستخدم:', error);
      return null;
    }
    
    return data as UserPreferences;
  } catch (error) {
    console.error('خطأ غير متوقع:', error);
    return null;
  }
} 