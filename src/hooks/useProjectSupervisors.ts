// src/hooks/useProjectSupervisors.ts
import { useState } from 'react';
import { 
  handleSupervisorInvitation, 
  demoteSupervisor, 
  searchPotentialSupervisors 
} from '@/lib/invitation';

export function useProjectSupervisors(projectId: string, currentUserId: string) {
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * البحث عن مستخدمين
   */
  const searchSupervisors = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const results = await searchPotentialSupervisors(query);
      setSearchResults(results);
    } catch (err) {
      console.error('خطأ في البحث:', err);
      setError('حدث خطأ أثناء البحث عن المستخدمين');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * معالجة اختيار المشرف
   */
  const handleSelectSupervisor = async (selectedUser: any) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await handleSupervisorInvitation(
        projectId,
        selectedUser,
        currentUserId
      );
      
      if (result.success) {
        setSuccessMessage(result.message);
        // إعادة تعيين البحث
        setSearchQuery('');
        setSearchResults([]);
      } else {
        setError(result.message);
      }
      
    } catch (err) {
      console.error('خطأ في معالجة المشرف:', err);
      setError('حدث خطأ أثناء معالجة المشرف');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * إلغاء دور المشرف
   */
  const handleRemoveSupervisor = async (memberId: string, recipientEmail: string) => {
    if (!confirm('هل أنت متأكد من إلغاء صلاحية المشرف لهذا العضو؟')) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await demoteSupervisor(memberId, recipientEmail, projectId);
      
      if (result.success) {
        setSuccessMessage(result.message);
      } else {
        setError(result.message);
      }
      
    } catch (err) {
      console.error('خطأ في إلغاء دور المشرف:', err);
      setError('حدث خطأ أثناء إلغاء صلاحية المشرف');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * مسح رسائل الخطأ والنجاح بعد فترة زمنية
   */
  const clearMessages = () => {
    setTimeout(() => {
      setError(null);
      setSuccessMessage(null);
    }, 5000);
  };

  // تنظيف الرسائل عند النجاح أو الخطأ
  if (successMessage || error) {
    clearMessages();
  }

  return {
    searchQuery,
    setSearchQuery,
    searchSupervisors,
    searchResults,
    isSearching,
    isProcessing,
    error,
    successMessage,
    handleSelectSupervisor,
    handleRemoveSupervisor
  };
}