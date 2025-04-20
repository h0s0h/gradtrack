// src/lib/invitation/index.ts
import { supabase } from '@/lib/supabase/client';
import { sendInvitationEmail, sendNotificationEmail } from '@/app/api/send-email';

/**
 * وظيفة موحدة لإدارة دعوة المشرفين وإضافتهم
 */
export async function handleSupervisorInvitation(
  projectId: string,
  selectedUser: any,
  currentUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // إذا كان العنصر المحدد هو دعوة (بريد إلكتروني غير مسجل)
    if (selectedUser.isInvitation) {
      // إنشاء رمز دعوة فريد
      const inviteCode = generateInviteCode();
      
      // التحقق من وجود دعوة سابقة
      const { data: existing, error: chkErr } = await supabase
        .from('project_invitations')
        .select('id')
        .eq('project_id', projectId)
        .eq('email', selectedUser.email);

      if (chkErr) throw chkErr;

      // تحديث أو إنشاء دعوة جديدة
      if (existing?.length) {
        await supabase
          .from('project_invitations')
          .update({
            role: 'supervisor', 
            invite_code: inviteCode, 
            invited_by: currentUserId, 
            accepted: false, 
            expires_at: new Date(Date.now() + 7*86400000).toISOString()
          })
          .eq('id', existing[0].id);
      } else {
        await supabase
          .from('project_invitations')
          .insert({
            project_id: projectId,
            email: selectedUser.email,
            role: 'supervisor',
            invite_code: inviteCode,
            invited_by: currentUserId,
            expires_at: new Date(Date.now() + 7*86400000).toISOString()
          });
      }

      // الحصول على معلومات المشروع لإضافتها في البريد الإلكتروني
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      
      // إرسال بريد دعوة
      await sendInvitationEmail(
        selectedUser.email,
        inviteCode,
        projectId
      );

      return { 
        success: true, 
        message: `تم إرسال دعوة للمستخدم ${selectedUser.email}`
      };
    } 
    // إذا كان المستخدم موجودًا بالفعل
    else {
      // التحقق من وجود المستخدم بالفعل كعضو في المشروع
      const { data: members } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', selectedUser.id);

      const existingMember = members && members.length > 0 ? members[0] : null;

      if (existingMember) {
        // إذا كان المستخدم عضوًا عاديًا، قم بترقيته إلى مشرف
        if (existingMember.role === 'member') {
          await supabase
            .from('project_members')
            .update({ role: 'supervisor' })
            .eq('id', existingMember.id);
          
          // الحصول على معلومات المشروع
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .single();
            
          // إرسال بريد تنبيه للمستخدم بالترقية
          await sendNotificationEmail(
            selectedUser.email,
            'تمت ترقيتك إلى مشرف',
            `تمت ترقيتك إلى مشرف على المشروع "${projectData.name}". يمكنك الآن الوصول إلى جميع خصائص المشرفين.`
          );
          
          return { success: true, message: 'تم ترقية العضو إلى مشرف' };
        } else {
          // المستخدم مشرف بالفعل
          return { success: false, message: 'هذا المستخدم بالفعل مشرف' };
        }
      } else {
        // إضافة مستخدم جديد كمشرف
        await supabase
          .from('project_members')
          .insert({ 
            project_id: projectId, 
            user_id: selectedUser.id, 
            role: 'supervisor' 
          });
        
        // الحصول على معلومات المشروع
        const { data: projectData } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();
        
        // إرسال بريد تنبيه للمستخدم بالإضافة
        await sendNotificationEmail(
          selectedUser.email,
          'تمت إضافتك كمشرف',
          `تمت إضافتك كمشرف على المشروع "${projectData.name}". يمكنك الآن عرض وإدارة هذا المشروع.`
        );
        
        return { success: true, message: 'تم إضافة المشرف بنجاح' };
      }
    }
  } catch (error) {
    console.error('خطأ في إدارة المشرفين:', error);
    return { success: false, message: 'حدث خطأ أثناء معالجة طلب الإشراف' };
  }
}

/**
 * إلغاء دور المشرف وتحويله إلى عضو عادي
 */
export async function demoteSupervisor(
  memberId: string,
  recipientEmail: string,
  projectId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // تحديث دور المستخدم في قاعدة البيانات
    await supabase
      .from('project_members')
      .update({ role: 'member' })
      .eq('id', memberId);
    
    // الحصول على معلومات المشروع
    const { data: projectData } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();
    
    // إرسال بريد تنبيه للمستخدم بتغيير الدور
    await sendNotificationEmail(
      recipientEmail,
      'تم تغيير دورك في المشروع',
      `تم تغيير دورك من مشرف إلى عضو عادي في المشروع "${projectData.name}".`
    );
    
    return { success: true, message: 'تم إلغاء صلاحية المشرف' };
  } catch (error) {
    console.error('خطأ في إلغاء دور المشرف:', error);
    return { success: false, message: 'حدث خطأ أثناء إلغاء صلاحية المشرف' };
  }
}

/**
 * إنشاء رمز دعوة فريد
 */
export function generateInviteCode(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * البحث عن مستخدمين أو مشرفين محتملين
 */
export async function searchPotentialSupervisors(query: string): Promise<any[]> {
  if (query.length < 2) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(5);
    
    if (error) throw error;
    
    let results = data || [];
    const isEmail = /^\S+@\S+\.\S+$/.test(query);
    
    // إذا كان الاستعلام عبارة عن بريد إلكتروني ولم يتم العثور عليه، أضفه كخيار دعوة
    if (isEmail && !results.some(user => user.email === query)) {
      results.push({ 
        id: `invite_${query}`, 
        email: query, 
        full_name: null, 
        isInvitation: true 
      });
    }
    
    return results;
  } catch (error) {
    console.error('خطأ في البحث عن المستخدمين:', error);
    return [];
  }
}