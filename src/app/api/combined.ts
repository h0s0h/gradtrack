'use client';

import { useState } from 'react';

/**
 * هوك React لإدارة المشرفين والدعوات
 */
export function useProjectSupervisorsAndInvitations(projectId: string, currentUserId: string) {
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  interface User {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    isInvitation?: boolean;
  }

  /**
   * البحث عن مستخدمين محتملين ليكونوا مشرفين
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
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('فشل البحث عن المستخدمين');
      
      const users: User[] = await response.json();
      
      if (query.includes('@') && !users.some(user => user.email.toLowerCase() === query.toLowerCase())) {
        users.push({
          id: `invite_${query}`,
          email: query,
          isInvitation: true
        });
      }
      
      setSearchResults(users);
    } catch (err) {
      console.error('خطأ في البحث:', err);
      setError('حدث خطأ أثناء البحث عن المستخدمين');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * معالجة اختيار المستخدم (إضافة مشرف أو دعوة)
   */
  const handleUserSelection = async (selectedUser: User) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      if (selectedUser.isInvitation) {
        const result = await inviteUserByEmail(selectedUser.email);
        if (result.success) {
          setSuccessMessage(result.message);
        } else {
          setError(result.message);
        }
      } else {
        const result = await addExistingUserAsSupervisor(selectedUser.id);
        if (result.success) {
          setSuccessMessage(result.message);
        } else {
          setError(result.message);
        }
      }
      
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
  const handleRemoveSupervisor = async (memberId: string, recipientEmail: string) => {
    if (!confirm('هل أنت متأكد من إلغاء صلاحية المشرف لهذا العضو؟')) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const { error } = await fetch('/api/projects/demote-supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, projectId })
      }).then(res => res.json());
      
      if (error) throw new Error(error);
      
      // إرسال إشعار للمستخدم عبر API
      const notificationResponse = await fetch('/api/email/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recipientEmail,
          subject: 'تم تغيير دورك في المشروع',
          message: `تم تغيير دورك في المشروع #${projectId} من مشرف إلى عضو.`
        })
      });
      
      if (!notificationResponse.ok) {
        console.warn('تم إلغاء دور المشرف ولكن فشل إرسال الإشعار');
      }
      
      setSuccessMessage('تم إلغاء صلاحية المشرف بنجاح');
      
    } catch (err) {
      console.error('خطأ في إلغاء دور المشرف:', err);
      setError('حدث خطأ أثناء إلغاء صلاحية المشرف');
    } finally {
      setIsProcessing(false);
    }
  };

  // وظائف مساعدة داخل الهوك

  /**
   * دعوة مستخدم عبر البريد الإلكتروني
   */
  async function inviteUserByEmail(email: string): Promise<{ success: boolean, message: string }> {
    try {
      const inviteCode = await createInviteCode(email);
      
      const response = await fetch(`/api/invitations/check?email=${encodeURIComponent(email)}&projectId=${projectId}`);
      const { exists } = await response.json();
      
      if (exists) {
        await fetch('/api/invitations/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            projectId, 
            inviteCode,
            role: 'supervisor',
            invitedBy: currentUserId
          })
        });
      } else {
        await saveInvitation(email, inviteCode);
      }
      
      // إرسال بريد الدعوة عبر API
      const emailResponse = await fetch('/api/email/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          inviteCode,
          projectId,
          role: 'supervisor'
        })
      });
      
      if (!emailResponse.ok) {
        throw new Error('فشل إرسال بريد الدعوة');
      }
      
      return { success: true, message: `تم إرسال دعوة إلى ${email} بنجاح` };
    } catch (err) {
      console.error('خطأ في دعوة المستخدم:', err);
      return { success: false, message: 'حدث خطأ أثناء إرسال الدعوة' };
    }
  }

  /**
   * إضافة مستخدم موجود كمشرف
   */
  async function addExistingUserAsSupervisor(userId: string): Promise<{ success: boolean, message: string }> {
    try {
      const checkResponse = await fetch(`/api/projects/check-membership?userId=${userId}&projectId=${projectId}`);
      const { exists, role, email } = await checkResponse.json();
      
      if (exists) {
        if (role === 'supervisor') {
          return { success: false, message: 'هذا المستخدم بالفعل مشرف على هذا المشروع' };
        }
        
        await fetch('/api/projects/add-supervisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            projectId,
            isExistingMember: true
          })
        });
        
        // إرسال إشعار للمستخدم عبر API
        await fetch('/api/email/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            subject: 'تمت ترقيتك كمشرف',
            message: `تمت ترقيتك كمشرف على المشروع #${projectId}. يمكنك الآن عرض وإدارة هذا المشروع بصلاحيات إضافية.`
          })
        });
        
        return { success: true, message: 'تمت ترقية العضو إلى مشرف بنجاح' };
      } else {
        await fetch('/api/projects/add-supervisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            projectId,
            isExistingMember: false
          })
        });
        
        // إرسال إشعار للمستخدم عبر API
        await fetch('/api/email/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            subject: 'تمت إضافتك كمشرف',
            message: `تمت إضافتك كمشرف على المشروع #${projectId}. يمكنك الآن عرض وإدارة هذا المشروع.`
          })
        });
        
        return { success: true, message: 'تمت إضافة المشرف بنجاح' };
      }
    } catch (err) {
      console.error('خطأ في إضافة المشرف:', err);
      return { success: false, message: 'حدث خطأ أثناء إضافة المشرف' };
    }
  }

  /**
   * إنشاء رمز دعوة فريد
   */
  async function createInviteCode(email: string): Promise<string> {
    const response = await fetch('/api/invitations/create-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, projectId })
    });
    
    if (!response.ok) throw new Error('فشل إنشاء رمز الدعوة');
    const data = await response.json();
    return data.inviteCode;
  }

  /**
   * حفظ الدعوة في قاعدة البيانات
   */
  async function saveInvitation(email: string, inviteCode: string): Promise<void> {
    const response = await fetch('/api/invitations/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        inviteCode, 
        projectId, 
        role: 'supervisor',
        invitedBy: currentUserId
      })
    });
    
    if (!response.ok) throw new Error('فشل حفظ الدعوة');
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
  
  clearMessages();

  return {
    searchQuery,
    setSearchQuery,
    searchUsers,
    searchResults,
    isSearching,
    isProcessing,
    error,
    successMessage,
    handleUserSelection,
    handleRemoveSupervisor
  };
}
