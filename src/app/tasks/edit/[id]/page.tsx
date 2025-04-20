'use client'
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { NotificationService } from '@/lib/notifications/notificationService';
import { Task, Project, User as SchemaUser, TaskStatus, TaskPriority, NotificationType } from '@/lib/supabase/schema';
import { ar } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { ChevronRight, Calendar, Flag, User2, AlertTriangle, Check, X, Loader2 } from 'lucide-react';

// Define a simpler User type for the view
interface UserView {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

// Extended Task interface to include related data
interface ExtendedTask extends Task {
  project?: Project;
  assignee?: UserView;
  creator?: UserView;
  updater?: UserView;
}

interface EditTaskProps {
  params: {
    id: string;
  };
}

// Status and priority options with labels and colors for UI
const STATUS_OPTIONS = [
  { value: 'not_started', label: 'لم تبدأ', color: 'bg-gray-200 text-gray-800' },
  { value: 'in_progress', label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'مكتملة', color: 'bg-green-100 text-green-800' },
  { value: 'delayed', label: 'متأخرة', color: 'bg-amber-100 text-amber-800' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'منخفضة', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'متوسطة', color: 'bg-amber-100 text-amber-800' },
  { value: 'high', label: 'عالية', color: 'bg-red-100 text-red-800' },
];

// Custom Button component
const Button = ({
  children,
  primary,
  href,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  icon,
  ...props
}: {
  children: React.ReactNode;
  primary?: boolean;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  [key: string]: any;
}) => {
  const baseClasses = "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 transition-all duration-200 font-medium text-sm";
  const colorClasses = primary
    ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 hover:shadow-md disabled:opacity-70 disabled:from-blue-600 disabled:to-indigo-700 disabled:hover:shadow-none"
    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-70";
  const allClasses = `${baseClasses} ${colorClasses} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={allClasses} {...props}>
        {icon && icon}
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={allClasses}
      {...props}
    >
      {icon && icon}
      {children}
      {disabled && type === 'submit' && <Loader2 className="h-4 w-4 animate-spin" />}
    </button>
  );
};

// Form field wrapper component
const FormField = ({
  id,
  label,
  required = false,
  children,
  className = '',
  error,
  helpText,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  error?: string;
  helpText?: string;
}) => (
  <div className={`space-y-1.5 ${className}`}>
    <label htmlFor={id} className="block text-sm font-semibold text-gray-800">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {helpText && <p className="text-xs font-medium text-gray-700">{helpText}</p>}
    {error && <p className="text-xs font-medium text-red-600">{error}</p>}
  </div>
);

// Status badge component with improved design
const StatusBadge = ({ status }: { status: string }) => {
  const statusObj = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusObj.color} transition-colors duration-200`}>
      {statusObj.label}
    </span>
  );
};

// Priority badge component with improved design
const PriorityBadge = ({ priority }: { priority: string }) => {
  const priorityObj = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[0];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${priorityObj.color} transition-colors duration-200`}>
      {priorityObj.label}
    </span>
  );
};

// Main component
export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  // Acceder de forma segura a la ID de la tarea
  const taskId = params?.id as string;
  
  const [user, setUser] = useState<SchemaUser | null>(null);
  const [task, setTask] = useState<ExtendedTask | null>(null);
  const [editedTask, setEditedTask] = useState<Partial<ExtendedTask>>({});
  const [projectMembers, setProjectMembers] = useState<UserView[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, avatar_url, email')
          .eq('id', data.user.id)
          .single();

        if (userData) {
          setUser(userData as SchemaUser);
        }
      }
    };

    getCurrentUser();
  }, []);

  // Fetch task details
  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!taskId) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            project:project_id(id, name),
            assignee:assigned_to(id, full_name, avatar_url, email),
            creator:created_by(id, full_name, avatar_url, email),
            updater:updated_by(id, full_name, avatar_url, email)
          `)
          .eq('id', taskId)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error('لم يتم العثور على المهمة');
        }

        // Check if the user is allowed to edit this task
        // This can be expanded to check if user is a project member
        if (data.project_id) {
          fetchProjectMembers(data.project_id);
        }

        setTask(data as ExtendedTask);
        setEditedTask({
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date,
          assigned_to: data.assigned_to,
          completion_percentage: data.completion_percentage,
          project_id: data.project_id
        });
      } catch (err: any) {
        console.error('Error fetching task details:', err);
        setError('حدث خطأ أثناء تحميل تفاصيل المهمة: ' + (err.message || 'خطأ غير معروف'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskDetails();
  }, [taskId]);

  // Fetch project members
  const fetchProjectMembers = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('*, user:user_id(*)')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching project members:', error);
        return;
      }

      if (!data || data.length === 0) {
        setProjectMembers([]);
        return;
      }

      const membersList = data
        .filter(membership => membership.user)
        .map(membership => ({
          id: membership.user.id,
          full_name: membership.user.full_name,
          avatar_url: membership.user.avatar_url,
          email: membership.user.email
        }));

      setProjectMembers(membersList);
    } catch (err) {
      console.error('Error fetching project members:', err);
    }
  };

  // Handle form field changes
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'status') {
      // When status changes, update completion percentage accordingly
      let completionPercentage = editedTask.completion_percentage;
      const status = value as 'not_started' | 'in_progress' | 'completed' | 'delayed';
      
      if (value === 'completed') {
        completionPercentage = 100;
      } else if (value === 'not_started') {
        completionPercentage = 0;
      }
      
      setEditedTask(prev => ({
        ...prev,
        status,
        ...(completionPercentage !== undefined && { completion_percentage: completionPercentage })
      }));
    } else if (name === 'completion_percentage') {
      // When completion percentage changes, update status accordingly
      const percentage = parseInt(value);
      let status = editedTask.status as 'not_started' | 'in_progress' | 'completed' | 'delayed';
      
      if (percentage === 100) {
        status = 'completed';
      } else if (percentage === 0) {
        status = 'not_started';
      } else if (percentage > 0 && percentage < 100 && status === 'not_started') {
        status = 'in_progress';
      }
      
      setEditedTask(prev => ({
        ...prev,
        [name]: percentage,
        status
      }));
    } else {
      setEditedTask(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    setHasChanges(true);
    
    // Reset error when user edits form
    if (error) {
      setError(null);
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('يجب تسجيل الدخول لتعديل المهمة');
      return;
    }

    if (!task) {
      setError('لم يتم العثور على المهمة');
      return;
    }

    if (!editedTask.title || editedTask.title.trim() === '') {
      setError('عنوان المهمة مطلوب');
      return;
    }

    if (!taskId) {
      setError('معرف المهمة غير صالح');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // استخدام طريقة التحديث المباشرة بدلاً من RPC
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editedTask.title?.trim(),
          description: editedTask.description?.trim() || null,
          status: editedTask.status,
          priority: editedTask.priority,
          due_date: editedTask.due_date || null,
          assigned_to: editedTask.assigned_to || null,
          completion_percentage: editedTask.completion_percentage || 0,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', taskId);

      if (error) {
        console.error('خطأ في تحديث المهمة:', error);
        throw new Error(error.message || 'خطأ في تحديث المهمة');
      }

      // تعيين رسالة النجاح وإعادة تعيين علامة التغييرات
      setSuccessMessage('تم تحديث المهمة بنجاح');
      setHasChanges(false);

      // تأخير التوجيه لعرض رسالة النجاح
      setTimeout(() => {
        router.push(`/tasks/${taskId}`);
      }, 1500);
    } catch (err: any) {
      console.error('خطأ في تحديث المهمة:', err);
      
      // عرض رسالة خطأ أكثر وضوحاً
      setError('حدث خطأ أثناء تحديث المهمة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel with confirmation if there are changes
  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirmCancel(true);
    } else {
      router.push(`/tasks/${taskId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-md rounded-xl p-8">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-gray-500 animate-pulse">جاري تحميل بيانات المهمة...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="bg-white shadow-md rounded-xl p-8">
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
        <div className="mt-6 text-center">
          <Button 
            href="/tasks" 
            primary
            icon={<ChevronRight className="h-4 w-4 ml-1" />}
          >
            العودة إلى قائمة المهام
          </Button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-white shadow-md rounded-xl p-8">
        <div className="bg-amber-50 border border-amber-100 text-amber-700 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>لم يتم العثور على المهمة</p>
        </div>
        <div className="mt-6 text-center">
          <Button 
            href="/tasks" 
            primary
            icon={<ChevronRight className="h-4 w-4 ml-1" />}
          >
            العودة إلى قائمة المهام
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>تعديل المهمة</span>
          </h1>
          {task.project && (
            <Link href={`/projects/${task.project.id}`} className="text-indigo-100 hover:text-white text-sm flex items-center gap-1">
              <span>{task.project.name}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Success message */}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 bg-green-50 border border-green-100 text-green-700 p-4 rounded-lg flex items-center gap-3 shadow-sm"
          >
            <div className="bg-green-100 p-1 rounded-full">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <p>{successMessage}</p>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-100 text-red-700 p-4 rounded-lg flex items-center gap-3 shadow-sm"
          >
            <div className="bg-red-100 p-1 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <p>{error}</p>
          </motion.div>
        )}

        {/* Task current status */}
        <div className="mb-8 bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-lg border border-gray-200 shadow-sm transition-all duration-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <span>معلومات المهمة الحالية</span>
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-700">الحالة</span>
              <StatusBadge status={task.status} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-700">الأولوية</span>
              <PriorityBadge priority={task.priority} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-700">نسبة الإنجاز</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      task.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-green-500' : 
                      task.status === 'in_progress' ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 
                      task.status === 'delayed' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    } transition-all duration-300 ease-out`}
                    style={{ width: `${task.completion_percentage}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold text-gray-800">{task.completion_percentage}%</span>
              </div>
            </div>
          </div>

          {/* إضافة معلومات المنشئ والمحدث */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-700">المنشئ</span>
                <div className="flex items-center gap-2">
                  {task.creator?.avatar_url ? (
                    <img 
                      src={task.creator.avatar_url} 
                      alt={task.creator.full_name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User2 className="w-3 h-3 text-indigo-600" />
                    </div>
                  )}
                  <span className="text-xs font-semibold text-gray-800">{task.creator?.full_name}</span>
                </div>
              </div>

              {task.updater && task.updater.id !== task.creator?.id && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-gray-700">آخر تحديث بواسطة</span>
                  <div className="flex items-center gap-2">
                    {task.updater.avatar_url ? (
                      <img 
                        src={task.updater.avatar_url} 
                        alt={task.updater.full_name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <User2 className="w-3 h-3 text-blue-600" />
                      </div>
                    )}
                    <span className="text-xs font-semibold text-gray-800">{task.updater.full_name}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-700">تاريخ الإنشاء</span>
                <span className="text-xs font-semibold text-gray-800">
                  {new Date(task.created_at).toLocaleString('ar', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  })}
                </span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-700">آخر تحديث</span>
                <span className="text-xs font-semibold text-gray-800">
                  {new Date(task.updated_at).toLocaleString('ar', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task title */}
          <FormField
            id="title"
            label="عنوان المهمة"
            required
          >
            <input
              type="text"
              id="title"
              name="title"
              value={editedTask.title || ''}
              onChange={handleEditChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
              disabled={isSubmitting}
            />
          </FormField>

          {/* Task description */}
          <FormField
            id="description"
            label="وصف المهمة"
          >
            <textarea
              id="description"
              name="description"
              value={editedTask.description || ''}
              onChange={handleEditChange}
              rows={4}
              placeholder="أضف وصفاً تفصيلياً للمهمة هنا..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={isSubmitting}
            />
          </FormField>

          {/* Status and Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task status */}
            <FormField
              id="status"
              label="حالة المهمة"
            >
              <div className="relative">
                <select
                  id="status"
                  name="status"
                  value={editedTask.status || 'not_started'}
                  onChange={handleEditChange}
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-colors"
                  disabled={isSubmitting}
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </FormField>

            {/* Completion percentage */}
            <FormField
              id="completion_percentage"
              label={`نسبة الإنجاز: ${editedTask.completion_percentage || 0}%`}
            >
              <div className="relative pt-1">
                <input
                  type="range"
                  id="completion_percentage"
                  name="completion_percentage"
                  min="0"
                  max="100"
                  step="5"
                  value={editedTask.completion_percentage || 0}
                  onChange={handleEditChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  disabled={isSubmitting || editedTask.status === 'completed'}
                />
                <div className="flex justify-between text-xs text-gray-500 px-1 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </FormField>

            {/* Priority */}
            <FormField
              id="priority"
              label="أولوية المهمة"
            >
              <div className="relative">
                <select
                  id="priority"
                  name="priority"
                  value={editedTask.priority || 'medium'}
                  onChange={handleEditChange}
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-colors"
                  disabled={isSubmitting}
                >
                  {PRIORITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Flag className={`w-4 h-4 ${
                    editedTask.priority === 'high' ? 'text-red-500' : 
                    editedTask.priority === 'medium' ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                </div>
              </div>
            </FormField>

            {/* Due date */}
            <FormField
              id="due_date"
              label="تاريخ الاستحقاق"
            >
              <div className="relative">
                <input
                  type="datetime-local"
                  id="due_date"
                  name="due_date"
                  value={editedTask.due_date || ''}
                  onChange={handleEditChange}
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={isSubmitting}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Calendar className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </FormField>

            {/* Assigned to */}
            <FormField
              id="assigned_to"
              label="تكليف إلى"
              className="md:col-span-2"
            >
              <div className="relative">
                <select
                  id="assigned_to"
                  name="assigned_to"
                  value={editedTask.assigned_to || ''}
                  onChange={handleEditChange}
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-colors"
                  disabled={isSubmitting}
                >
                  <option value="">غير مُكلف</option>
                  {projectMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <User2 className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </FormField>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-100">
            <Button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              icon={<X className="h-4 w-4" />}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              primary
              disabled={isSubmitting}
              icon={!isSubmitting && <Check className="h-4 w-4" />}
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation modal */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200"
          >
            <div className="text-center mb-5">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-100 mb-4">
                <AlertTriangle className="h-7 w-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">تأكيد الإلغاء</h3>
              <p className="text-sm text-gray-600">
                لديك تغييرات لم يتم حفظها. هل أنت متأكد من رغبتك في المغادرة؟
              </p>
            </div>
            <div className="flex justify-center space-x-4 space-x-reverse mt-6">
              <Button
                onClick={() => setShowConfirmCancel(false)}
                className="border-gray-300 hover:bg-gray-100"
              >
                استمرار التحرير
              </Button>
              <Button
                primary
                onClick={() => router.push(`/tasks/${taskId}`)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              >
                تجاهل التغييرات
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 