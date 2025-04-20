// schema.ts

// تعريف الأنواع الخاصة بالأدوار
export type UserRole = 'student' | 'supervisor' | 'admin';
export type MemberRole = 'owner' | 'supervisor' | 'member';
export type NotificationType =
  | 'post_created'
  | 'comment_added'
  | 'project_invitation'
  | 'inactivity_alert'
  | 'invitation_accepted'
  | 'deadline_reminder'
  | 'task_created'
  | 'task_updated'
  | 'task_status_changed'
  | 'task_assigned'
  | 'task_deleted'
  | 'post_comment';

// تعريف الأنواع الخاصة بالمهام
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';
export type TaskPriority = 'low' | 'medium' | 'high';

// تعريف واجهة المستخدم
export interface User {
  id: string; // UUID
  email: string;
  full_name: string;
  avatar_url?: string;
  cloudinary_avatar_id?: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

// تعريف واجهة المشروع
export interface Project {
  id: string; // UUID
  name: string;
  description?: string;
  owner_id: string; // UUID
  cloudinary_image_id?: string;
  thumbnail_url?: string;
  completion_percentage?: number;
  created_at: string;
  updated_at: string;
}

// تعريف واجهة أعضاء المشروع
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

// تعريف واجهة المشاركة
export interface Post {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  code_snippet?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// تعريف واجهة التعليق
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  code_snippet?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// تعريف واجهة الإشعار
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: NotificationType;
  related_id?: string;
  metadata?: {
    project_id?: string;
    post_id?: string;
    comment_id?: string;
    user_id?: string;
    [key: string]: any;
  };
  is_read: boolean;
  created_at: string;
}

// تعريف واجهة المهام
export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  priority: TaskPriority;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

// تعريف واجهة دعوات المشاريع
export interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  role: MemberRole;
  invite_code: string;
  invited_by: string;
  accepted: boolean;
  created_at: string;
  expires_at: string;
}
