import { supabase } from '@/lib/supabase/client';
import { NotificationType } from '@/lib/supabase/schema';

/**
 * خدمة إرسال الإشعارات - تستخدم لإرسال إشعارات بعد أي عملية أو تغيير
 */
export class NotificationService {
  /**
   * إرسال إشعار جديد
   * @param userId معرف المستخدم المستلم للإشعار
   * @param title عنوان الإشعار
   * @param content محتوى الإشعار
   * @param type نوع الإشعار
   * @param relatedId معرف العنصر المرتبط (مثل المهمة أو المشروع)
   * @returns وعد بنتيجة العملية
   */
  static async sendNotification(
    userId: string,
    title: string,
    content: string,
    type: NotificationType,
    relatedId?: string
  ) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          content,
          type,
          related_id: relatedId,
          is_read: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending notification:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Unexpected error sending notification:', err);
      return { success: false, error: err };
    }
  }

  /**
   * إرسال إشعار لعدة مستخدمين
   * @param userIds قائمة معرفات المستخدمين
   * @param title عنوان الإشعار
   * @param content محتوى الإشعار
   * @param type نوع الإشعار
   * @param relatedId معرف العنصر المرتبط
   * @returns وعد بنتيجة العملية
   */
  static async sendNotificationToMultipleUsers(
    userIds: string[],
    title: string,
    content: string,
    type: NotificationType,
    relatedId?: string
  ) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        content,
        type,
        related_id: relatedId,
        is_read: false
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {
        console.error('Error sending notifications to multiple users:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Unexpected error sending notifications to multiple users:', err);
      return { success: false, error: err };
    }
  }

  /**
   * إرسال إشعار لجميع أعضاء المشروع
   * @param projectId معرف المشروع
   * @param title عنوان الإشعار
   * @param content محتوى الإشعار
   * @param type نوع الإشعار
   * @param relatedId معرف العنصر المرتبط
   * @param excludeUserId معرف المستخدم المستثنى من الإشعار (مثل منشئ التغيير)
   * @returns وعد بنتيجة العملية
   */
  static async sendNotificationToProjectMembers(
    projectId: string,
    title: string,
    content: string,
    type: NotificationType,
    relatedId?: string,
    excludeUserId?: string
  ) {
    try {
      // جلب جميع أعضاء المشروع
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

      if (membersError) {
        console.error('Error fetching project members:', membersError);
        return { success: false, error: membersError };
      }

      // استثناء المستخدم المحدد (إذا تم تحديده)
      const userIds = members
        .map(member => member.user_id)
        .filter(id => id !== excludeUserId);

      if (userIds.length === 0) {
        return { success: true, data: [] };
      }

      // إرسال الإشعار لجميع الأعضاء
      return await this.sendNotificationToMultipleUsers(
        userIds,
        title,
        content,
        type,
        relatedId
      );
    } catch (err) {
      console.error('Unexpected error sending notifications to project members:', err);
      return { success: false, error: err };
    }
  }

  /**
   * إرسال إشعار عن إنشاء مهمة جديدة
   * @param taskId معرف المهمة
   * @param projectId معرف المشروع
   * @param taskTitle عنوان المهمة
   * @param priority أولوية المهمة
   * @param creatorId معرف منشئ المهمة
   * @param assigneeId معرف المستخدم المكلف بالمهمة (اختياري)
   */
  static async notifyNewTask(
    taskId: string,
    projectId: string,
    taskTitle: string,
    priority: string,
    creatorId: string,
    assigneeId?: string
  ) {
    try {
      // جلب معلومات المشروع
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('Error fetching project info:', projectError);
        return { success: false, error: projectError };
      }

      // ترجمة الأولوية
      const priorityMap: Record<string, string> = {
        'low': 'منخفضة',
        'medium': 'متوسطة',
        'high': 'عالية'
      };
      const priorityAr = priorityMap[priority] || 'متوسطة';

      // تحضير محتوى الإشعار
      let content = `تم إضافة مهمة جديدة في مشروع "${project.name}". الأولوية: ${priorityAr}`;

      // إضافة معلومات عن المسند إليه
      if (assigneeId) {
        const { data: assignee } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', assigneeId)
          .single();

        if (assignee) {
          const assigneeName = assignee.full_name || assignee.email || 'مستخدم';
          content += ` وتم تعيينها إلى ${assigneeName}`;
        }
      }

      // إرسال إشعار لجميع أعضاء المشروع باستثناء المنشئ
      return await this.sendNotificationToProjectMembers(
        projectId,
        `تم إنشاء مهمة جديدة "${taskTitle}"`,
        content,
        'task_created',
        taskId,
        creatorId
      );
    } catch (err) {
      console.error('Error sending task creation notification:', err);
      return { success: false, error: err };
    }
  }

  /**
   * إرسال إشعار عند تغيير حالة مهمة
   * @param taskId معرف المهمة
   * @param projectId معرف المشروع
   * @param taskTitle عنوان المهمة
   * @param oldStatus الحالة القديمة
   * @param newStatus الحالة الجديدة
   * @param updaterId معرف المستخدم الذي قام بالتحديث
   */
  static async notifyTaskStatusChanged(
    taskId: string,
    projectId: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string,
    updaterId: string
  ) {
    try {
      // ترجمة الحالات
      const statusMap: Record<string, string> = {
        'not_started': 'لم تبدأ',
        'in_progress': 'قيد التنفيذ',
        'completed': 'مكتملة',
        'delayed': 'متأخرة'
      };

      const oldStatusAr = statusMap[oldStatus] || oldStatus;
      const newStatusAr = statusMap[newStatus] || newStatus;

      const content = `تم تغيير حالة المهمة من "${oldStatusAr}" إلى "${newStatusAr}"`;

      // استخدام الطريقة الجديدة مع الوظيفة المخصصة
      return await this.sendNotificationToProjectMembersWithFunctionCall(
        projectId,
        `تم تغيير حالة المهمة "${taskTitle}"`,
        content,
        'task_status_changed',
        taskId,
        updaterId
      );
    } catch (err) {
      console.error('Error sending task status change notification:', err);
      return { success: false, error: err };
    }
  }

  /**
   * إرسال إشعار عند تعيين مهمة إلى مستخدم
   * @param taskId معرف المهمة
   * @param projectId معرف المشروع
   * @param taskTitle عنوان المهمة
   * @param assignerId معرف المستخدم الذي قام بالتعيين
   * @param assigneeId معرف المستخدم المكلف
   */
  static async notifyTaskAssigned(
    taskId: string,
    projectId: string,
    taskTitle: string,
    assignerId: string,
    assigneeId: string
  ) {
    try {
      // جلب بيانات المعين والمسند إليه
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', [assignerId, assigneeId]);

      if (usersError) {
        console.error('Error fetching users info:', usersError);
        return { success: false, error: usersError };
      }

      const assignerUser = users?.find(u => u.id === assignerId);
      const assigneeUser = users?.find(u => u.id === assigneeId);

      if (!assignerUser || !assigneeUser) {
        console.error('Could not find user information');
        return { success: false, error: 'Missing user information' };
      }

      const assignerName = assignerUser.full_name || assignerUser.email || 'مستخدم';
      const assigneeName = assigneeUser.full_name || assigneeUser.email || 'مستخدم';

      // 1. إرسال إشعار للمستخدم المسند إليه باستخدام الوظيفة المخصصة (إذا كان مختلفاً عن المعين)
      if (assignerId !== assigneeId) {
        await supabase.rpc('insert_notification', {
          p_user_id: assigneeId,
          p_title: `تم تعيينك لمهمة "${taskTitle}"`,
          p_content: `قام ${assignerName} بتعيينك للعمل على المهمة في المشروع`,
          p_type: 'task_assigned',
          p_related_id: taskId,
          p_is_read: false
        });
      }

      // 2. إرسال إشعار لبقية أعضاء المشروع باستخدام الوظيفة المخصصة
      return await this.sendNotificationToProjectMembersWithFunctionCall(
        projectId,
        `تم تعيين مهمة "${taskTitle}"`,
        `تم تعيين ${assigneeName} للعمل على المهمة`,
        'task_assigned',
        taskId,
        // استثناء كل من المعين والمسند إليه
        assignerId === assigneeId ? assignerId : undefined
      );
    } catch (err) {
      console.error('Error sending task assignment notification:', err);
      return { success: false, error: err };
    }
  }

  /**
   * إرسال إشعار عن تحديث عام للمهمة
   * @param taskId معرف المهمة
   * @param projectId معرف المشروع
   * @param taskTitle عنوان المهمة
   * @param updaterId معرف المستخدم الذي قام بالتحديث
   */
  static async notifyTaskUpdated(
    taskId: string,
    projectId: string,
    taskTitle: string,
    updaterId: string
  ) {
    try {
      // تجربة استخدام الوظيفة المخصصة للإدراج إذا كان هناك خطأ في إرسال الإشعار بالطريقة العادية
      return await this.sendNotificationToProjectMembersWithFunctionCall(
        projectId,
        `تم تحديث المهمة "${taskTitle}"`,
        `تم إجراء تحديثات على المهمة في المشروع`,
        'task_updated',
        taskId,
        updaterId
      );
    } catch (err) {
      console.error('Error sending task update notification:', err);
      return { success: false, error: err };
    }
  }

  /**
   * إرسال إشعار لجميع أعضاء المشروع باستخدام وظيفة SQL مخصصة
   * يستخدم هذا الأسلوب لتجنب مشاكل تحويل الأنواع في قاعدة البيانات
   * @param projectId معرف المشروع
   * @param title عنوان الإشعار
   * @param content محتوى الإشعار
   * @param type نوع الإشعار كنص
   * @param relatedId معرف العنصر المرتبط
   * @param excludeUserId معرف المستخدم المستثنى
   */
  static async sendNotificationToProjectMembersWithFunctionCall(
    projectId: string,
    title: string,
    content: string,
    type: string,
    relatedId?: string,
    excludeUserId?: string
  ) {
    try {
      // جلب جميع أعضاء المشروع
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

      if (membersError) {
        console.error('Error fetching project members:', membersError);
        return { success: false, error: membersError };
      }

      // استثناء المستخدم المحدد (إذا تم تحديده)
      const userIds = members
        .map(member => member.user_id)
        .filter(id => id !== excludeUserId);

      if (userIds.length === 0) {
        return { success: true, data: [] };
      }

      // إرسال الإشعارات باستخدام الوظيفة المخصصة في قاعدة البيانات
      const notificationPromises = userIds.map(userId => 
        supabase.rpc('insert_notification', {
          p_user_id: userId,
          p_title: title,
          p_content: content,
          p_type: type,
          p_related_id: relatedId || null,
          p_is_read: false
        })
      );

      const results = await Promise.all(notificationPromises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        console.error('Errors sending notifications:', errors);
        return { success: false, errors };
      }

      return { success: true, data: results.map(r => r.data) };
    } catch (err) {
      console.error('Unexpected error sending notifications to project members:', err);
      return { success: false, error: err };
    }
  }

  /**
   * إرسال إشعار عن تعليق جديد على منشور
   * @param postId معرف المنشور
   * @param commentId معرف التعليق
   * @param commenterId معرف كاتب التعليق
   * @param commenterName اسم كاتب التعليق
   */
  static async notifyNewComment(
    postId: string,
    commentId: string,
    commenterId: string,
    commenterName: string
  ) {
    try {
      // جلب معلومات المنشور وصاحبه
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('user_id, project_id')
        .eq('id', postId)
        .single();

      if (postError) {
        console.error('Error fetching post info:', postError);
        return { success: false, error: postError };
      }

      const postAuthorId = post.user_id;
      const projectId = post.project_id;

      // إرسال إشعار لصاحب المنشور (إذا كان مختلفاً عن كاتب التعليق)
      if (postAuthorId && postAuthorId !== commenterId) {
        await this.sendNotification(
          postAuthorId,
          'تعليق جديد على منشورك',
          `علق ${commenterName} على منشورك في المشروع`,
          'comment_added',
          commentId
        );
      }

      // إرسال إشعار لبقية أعضاء المشروع
      return await this.sendNotificationToProjectMembers(
        projectId,
        'تعليق جديد على منشور',
        `أضاف ${commenterName} تعليقاً جديداً على منشور في المشروع`,
        'comment_added',
        commentId,
        // استثناء كاتب التعليق وصاحب المنشور
        commenterId
      );
    } catch (err) {
      console.error('Error sending new comment notification:', err);
      return { success: false, error: err };
    }
  }

  /**
   * إرسال إشعار اختباري
   * @param userId معرف المستخدم المستلم
   */
  static async sendTestNotification(userId: string) {
    return await this.sendNotification(
      userId,
      'اختبار نظام الإشعارات',
      'هذا إشعار اختباري للتأكد من عمل نظام الإشعارات بشكل صحيح! ' + new Date().toLocaleString('ar-SA'),
      'task_created',
      'test-notification'
    );
  }
}

export default NotificationService;
