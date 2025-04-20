'use client'
import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NotificationService from '@/lib/notifications/notificationService';
import type { Task as SchemaTask, Project, User, TaskStatus, TaskPriority } from '@/lib/supabase/schema';
import { useAuth } from '@/components/auth/AuthProvider';
import { format } from 'date-fns';

// Types
interface User {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

interface CreateTaskProps {
  projectId?: string; // Optional ID for creating a task for a specific project
}

// Custom Button component
const Button = ({
  children,
  primary,
  href,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  primary?: boolean;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}) => {
  const baseClasses = "font-medium rounded-lg px-4 py-2 transition-colors";
  const colorClasses = primary
    ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 shadow-md"
    : "text-gray-700 hover:bg-gray-100";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  const buttonClasses = `${baseClasses} ${colorClasses} ${disabledClasses} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={buttonClasses} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Form feedback component
const FormAlert = ({
  type,
  message
}: {
  type: 'error' | 'success';
  message: string;
}) => {
  if (!message) return null;

  const bgColor = type === 'error' ? 'bg-red-50' : 'bg-green-50';
  const textColor = type === 'error' ? 'text-red-700' : 'text-green-700';

  return (
    <div className={`${bgColor} ${textColor} p-4 rounded-lg mb-6`}>
      {message}
    </div>
  );
};

// Main component
const CreateTask: React.FC<CreateTaskProps> = ({ projectId }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form data setup
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    projectId: projectId || '',
    completionPercentage: 0
  });

  // Get current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error('Error fetching auth user:', authError);
          setError('حدث خطأ أثناء التحقق من المستخدم');
          return;
        }

        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name, avatar_url, email')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching user:', error);
            setError('حدث خطأ أثناء تحميل بيانات المستخدم');
            return;
          }

          setUser(data);
        } else {
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('حدث خطأ غير متوقع');
      }
    };

    fetchCurrentUser();
  }, [router]);

  // Update task status based on completion percentage
  const updateTaskStatusBasedOnCompletion = (percentage: number, currentStatus: string) => {
    if (percentage === 100) {
      return 'completed';
    } else if (percentage > 0) {
      return currentStatus === 'delayed' ? 'delayed' : 'in_progress';
    } else {
      return currentStatus === 'delayed' ? 'delayed' : 'not_started';
    }
  };

  // Fetch projects if projectId is not provided
  useEffect(() => {
    if (projectId) {
      setFormData(prev => ({ ...prev, projectId }));
      return;
    }

    const fetchProjects = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        const { data: membershipsData, error: membershipsError } = await supabase
          .from('project_members')
          .select('*, project:project_id(*)')
          .eq('user_id', user.id);

        if (membershipsError) {
          console.error('Error fetching projects:', membershipsError);
          setError('حدث خطأ أثناء تحميل المشاريع');
          return;
        }

        if (!membershipsData || membershipsData.length === 0) {
          setProjects([]);
          return;
        }

        const projectsList = membershipsData
          .filter(membership => membership.project)
          .map(membership => ({
            id: membership.project.id,
            name: membership.project.name
          }));

        setProjects(projectsList);

        // Auto-select project if there's only one
        if (projectsList.length === 1) {
          setFormData(prev => ({ ...prev, projectId: projectsList[0].id }));
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setError('حدث خطأ أثناء تحميل المشاريع');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user, projectId]);

  // Fetch project members when projectId changes
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!formData.projectId) {
        setProjectMembers([]);
        return;
      }

      try {
        setIsLoading(true);

        const { data: membersData, error: membersError } = await supabase
          .from('project_members')
          .select('*, user:user_id(*)')
          .eq('project_id', formData.projectId);

        if (membersError) {
          console.error('Error fetching project members:', membersError);
          setError('حدث خطأ أثناء تحميل أعضاء المشروع');
          return;
        }

        if (!membersData || membersData.length === 0) {
          setProjectMembers([]);
          return;
        }

        const membersList = membersData
          .filter(membership => membership.user)
          .map(membership => ({
            id: membership.user.id,
            full_name: membership.user.full_name,
            avatar_url: membership.user.avatar_url,
            email: membership.user.email
          }));

        setProjectMembers(membersList);
      } catch (error) {
        console.error('Error fetching project members:', error);
        setError('حدث خطأ أثناء تحميل أعضاء المشروع');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectMembers();
  }, [formData.projectId]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'completionPercentage') {
      const percentage = Math.min(Math.max(0, parseInt(value) || 0), 100);
      const newStatus = updateTaskStatusBasedOnCompletion(percentage, formData.status);

      setFormData(prev => ({
        ...prev,
        completionPercentage: percentage,
        status: newStatus
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Reset error messages when form is edited
    setError(null);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('يجب تسجيل الدخول لإنشاء مهمة');
      return;
    }

    if (!formData.projectId) {
      setError('يرجى اختيار مشروع');
      return;
    }

    if (!formData.title.trim()) {
      setError('يرجى إدخال عنوان للمهمة');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Prepare task data
      const taskData = {
        project_id: formData.projectId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.dueDate || null,
        assigned_to: formData.assignedTo || null,
        created_by: user.id,
        completion_percentage: formData.completionPercentage
      };

      // Insert task into database
      const { data: newTask, error: insertError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating task:', insertError);
        setError('حدث خطأ أثناء إنشاء المهمة: ' + insertError.message);
        return;
      }

      if (!newTask) {
        setError('حدث خطأ أثناء إنشاء المهمة: لم يتم إرجاع بيانات المهمة');
        return;
      }

      // Send notifications to project members about the new task
      await sendNewTaskNotifications(newTask);

      // Show success message
      setSuccessMessage('تم إنشاء المهمة بنجاح');

      // Reset form
      setFormData({
        title: '',
        description: '',
        status: 'not_started',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        projectId: formData.projectId,
        completionPercentage: 0
      });

      // Redirect after a brief delay
      setTimeout(() => {
        router.push(`/tasks/${newTask.id}`);
      }, 1500);
    } catch (error: any) {
      console.error('Error creating task:', error);
      setError('حدث خطأ أثناء إنشاء المهمة: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setIsLoading(false);
    }
  };

  // Send notifications to project members about a new task
  const sendNewTaskNotifications = async (task: any) => {
    try {
      // Get project members
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', task.project_id);

      if (!members?.length) return;

      // Get project name
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', task.project_id)
        .single();

      if (!project) return;

      // Send notification to each member
      for (const member of members) {
        // Skip notification for task creator
        if (member.user_id === task.created_by) continue;

        await NotificationService.sendNotification(
          member.user_id,
          `مهمة جديدة في مشروع ${project.name}`,
          `تم إنشاء مهمة جديدة بعنوان: ${task.title}`,
          'task_created',
          task.id
        );
      }

    } catch (error) {
      console.error('Error sending task notifications:', error);
    }
  };

  // Form field renderer
  const renderFormField = (
    id: string,
    label: string,
    component: React.ReactNode,
    required: boolean = false
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {component}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">إنشاء مهمة جديدة</h2>

      <FormAlert type="error" message={error || ''} />
      <FormAlert type="success" message={successMessage || ''} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project selection (if projectId not provided) */}
        {!projectId && renderFormField(
          'projectId',
          'المشروع',
          <select
            id="projectId"
            name="projectId"
            value={formData.projectId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            disabled={isLoading}
          >
            <option value="">اختر مشروعًا</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>,
          true
        )}

        {/* Task title */}
        {renderFormField(
          'title',
          'عنوان المهمة',
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            disabled={isLoading}
          />,
          true
        )}

        {/* Task description */}
        {renderFormField(
          'description',
          'وصف المهمة',
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
        )}

        {/* Completion percentage */}
        {renderFormField(
          'completionPercentage',
          `نسبة الإكمال: ${formData.completionPercentage}%`,
          <>
            <input
              type="range"
              id="completionPercentage"
              name="completionPercentage"
              value={formData.completionPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="5"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </>
        )}

        {/* Task status */}
        {renderFormField(
          'status',
          'حالة المهمة',
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            <option value="not_started">لم تبدأ</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="delayed">متأخرة</option>
          </select>
        )}

        {/* Task priority */}
        {renderFormField(
          'priority',
          'أولوية المهمة',
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
          </select>
        )}

        {/* Due date */}
        {renderFormField(
          'dueDate',
          'تاريخ الاستحقاق',
          <input
            type="datetime-local"
            id="dueDate"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
        )}

        {/* Assign to member */}
        {renderFormField(
          'assignedTo',
          'تكليف إلى',
          <select
            id="assignedTo"
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading || !formData.projectId}
          >
            <option value="">غير مكلف</option>
            {projectMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        )}

        {/* Action buttons */}
        <div className="flex justify-end space-x-4 space-x-reverse">
          <Button
            type="button"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            primary
            disabled={isLoading}
          >
            {isLoading ? 'جاري الإنشاء...' : 'إنشاء المهمة'}
          </Button>
        </div>
      </form>
    </div>
  );
};

// Next.js page component
export default function CreateTaskPage({ params }: { params?: { projectId?: string } }) {
  return (
    <div className="container mx-auto py-8 px-4">
      <CreateTask projectId={params?.projectId} />
    </div>
  );
}