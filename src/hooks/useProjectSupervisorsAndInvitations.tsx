import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

/**
 * هوك لإدارة المشرفين في المشروع
 * يجمع بين وظائف البحث عن المستخدمين وإضافة أو إزالة المشرفين
 */
export function useProjectSupervisorsAndInvitations(projectId: string, currentUserId: string) {
  // حالة البحث
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // رسائل النظام
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * البحث عن مستخدمين محتملين ليكونوا مشرفين
   * يتضمن البحث في قاعدة البيانات
   */
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchQuery(query);
    setIsSearching(true);
    setError(null);

    try {
      // البحث عن المستخدمين في قاعدة البيانات مباشرة
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);
      
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (err) {
      console.error('خطأ في البحث:', err);
      setError('حدث خطأ أثناء البحث عن المستخدمين');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * معالجة اختيار المستخدم (إضافة مشرف موجود)
   */
  const handleUserSelection = async (selectedUser: User) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // إضافة مستخدم موجود كمشرف
      const result = await addExistingUserAsSupervisor(selectedUser.id);
      if (result.success) {
        setSuccessMessage(result.message);
      } else {
        setError(result.message);
      }
      
      // إعادة تعيين البحث
      setSearchQuery('');
      setSearchResults([]);
      
    } catch (err) {
      console.error('خطأ في معالجة اختيار المستخدم:', err);
      setError('حدث خطأ أثناء إضافة المشرف');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * إلغاء ترقية المشرف إلى عضو عادي
   */
  const handleRemoveSupervisor = async (memberId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء صلاحية المشرف لهذا العضو؟')) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // تحديث دور المستخدم إلى عضو عادي
      const { error } = await supabase
        .from('project_members')
        .update({ role: 'member' })
        .eq('id', memberId)
        .eq('project_id', projectId);
      
      if (error) throw error;
      setSuccessMessage('تم إلغاء صلاحية المشرف بنجاح');
      
    } catch (err) {
      console.error('خطأ في إلغاء دور المشرف:', err);
      setError('حدث خطأ أثناء إلغاء صلاحية المشرف');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * إضافة مستخدم موجود كمشرف
   */
  async function addExistingUserAsSupervisor(userId: string): Promise<{ success: boolean, message: string }> {
    try {
      // التحقق من وجود عضوية للمستخدم في المشروع
      const { data, error: checkError } = await supabase
        .from('project_members')
        .select('id, role')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = لم يتم العثور على النتائج
        throw checkError;
      }

      const exists = !!data;
      const role = data?.role;
      
      if (exists) {
        if (role === 'supervisor') {
          return { 
            success: false, 
            message: 'هذا المستخدم بالفعل مشرف على هذا المشروع' 
          };
        }
        
        // ترقية العضو الموجود إلى مشرف
        const { error: updateError } = await supabase
          .from('project_members')
          .update({ role: 'supervisor' })
          .eq('id', data.id);
        
        if (updateError) throw updateError;
        
        return { 
          success: true, 
          message: 'تمت ترقية العضو إلى مشرف بنجاح' 
        };
      } else {
        // إضافة المستخدم الموجود كمشرف جديد
        const { error: insertError } = await supabase
          .from('project_members')
          .insert({
            user_id: userId,
            project_id: projectId,
            role: 'supervisor'
          });
        
        if (insertError) throw insertError;
        
        return { 
          success: true, 
          message: 'تمت إضافة المشرف بنجاح' 
        };
      }
    } catch (err) {
      console.error('خطأ في إضافة المشرف:', err);
      return { 
        success: false, 
        message: 'حدث خطأ أثناء إضافة المشرف' 
      };
    }
  }

  /**
   * مسح رسائل النظام بعد فترة زمنية
   */
  const clearMessages = () => {
    if (successMessage || error) {
      setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
    }
  };
  
  // تنظيف الرسائل عند تغييرها
  clearMessages();

  return {
    // حالة البحث
    searchQuery,
    setSearchQuery,
    searchUsers,
    searchResults,
    isSearching,
    
    // حالة المعالجة
    isProcessing,
    
    // رسائل النظام
    error,
    successMessage,
    
    // الوظائف الرئيسية
    handleUserSelection,
    handleRemoveSupervisor
  };
}