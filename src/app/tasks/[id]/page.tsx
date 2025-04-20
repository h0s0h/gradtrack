"use client"
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import NotificationService from '@/lib/notifications/notificationService';
import { Task, Project, User as SchemaUser } from '@/lib/supabase/schema';
import { User2 } from 'lucide-react';

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

interface TaskViewProps {
  taskId: string;
}

// Types
interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: UserView;
}

// Composant Button personnalisé
const Button = ({ children, primary, href, onClick, type = 'button', disabled = false, className = '', ...props }: {
  children: React.ReactNode;
  primary?: boolean;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}) => {
  const baseClasses = "font-semibold rounded-lg px-4 py-2 transition-colors";
  const colorClasses = primary 
    ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 shadow-md" 
    : "text-gray-800 hover:bg-gray-100";
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

// Composant principal
const TaskView: React.FC<TaskViewProps> = ({ taskId }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserView | null>(null);
  const [task, setTask] = useState<ExtendedTask | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [projectMembers, setProjectMembers] = useState<UserView[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<ExtendedTask>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Traduction des statuts en arabe
  const statusTranslations = {
    'not_started': 'لم تبدأ',
    'in_progress': 'قيد التنفيذ',
    'completed': 'مكتملة',
    'delayed': 'متأخرة'
  };
  
  // Traduction des priorités en arabe
  const priorityTranslations = {
    'low': 'منخفضة',
    'medium': 'متوسطة',
    'high': 'عالية'
  };
  
  // Couleurs pour les statuts
  const statusColors = {
    'not_started': 'bg-gray-100 text-gray-700',
    'in_progress': 'bg-blue-100 text-blue-700',
    'completed': 'bg-green-100 text-green-700',
    'delayed': 'bg-amber-100 text-amber-700'
  };
  
  // Couleurs pour les priorités
  const priorityColors = {
    'low': 'bg-gray-100 text-gray-700',
    'medium': 'bg-indigo-100 text-indigo-700',
    'high': 'bg-red-100 text-red-700'
  };
  
  // Effet pour charger l'utilisateur actuel
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
          // توجيه المستخدم إلى صفحة تسجيل الدخول إذا لم يكن متصلاً
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('حدث خطأ غير متوقع');
      }
    };
    
    fetchCurrentUser();
  }, [router]);
  
  // Effet pour charger les détails de la tâche
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
          console.error('Error fetching task details:', error);
          setError('حدث خطأ أثناء تحميل تفاصيل المهمة: ' + error.message);
          return;
        }
        
        if (!data) {
          setError('لم يتم العثور على المهمة');
          return;
        }
        
        setTask(data);
        setEditedTask({
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date,
          assigned_to: data.assigned_to,
          completion_percentage: data.completion_percentage
        });
        
        // Charger les membres du projet pour le mode d'édition
        if (data.project_id) {
          fetchProjectMembers(data.project_id);
        }
      } catch (err: any) {
        console.error('Error fetching task details:', err);
        setError('حدث خطأ أثناء تحميل تفاصيل المهمة: ' + (err.message || 'خطأ غير معروف'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTaskDetails();
  }, [taskId]);
  
  // Fonction pour charger les membres du projet
  const fetchProjectMembers = async (projectId: string) => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('*, user:user_id(*)')
        .eq('project_id', projectId);
      
      if (membersError) {
        console.error('Error fetching project members:', membersError);
        return;
      }
      
      if (!membersData || membersData.length === 0) {
        setProjectMembers([]);
        return;
      }
      
      const membersList = membersData
        .filter(membership => membership.user) // Filtrer les utilisateurs null
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
  
  // Effet pour charger les commentaires
  useEffect(() => {
    const fetchComments = async () => {
      if (!taskId) return;
      
      try {
        const { data, error } = await supabase
          .from('task_comments')
          .select(`
            *,
            user:user_id(id, full_name, avatar_url, email)
          `)
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching comments:', error);
          return;
        }
        
        setComments(data || []);
      } catch (err) {
        console.error('Error fetching comments:', err);
      }
    };
    
    fetchComments();
  }, [taskId]);
  
  // تحديث formatDate ليستخدم التنسيق الميلادي بدلاً من الهجري
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'غير محدد';
    try {
      return new Date(dateString).toLocaleString('ar', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  // Gérer les changements dans le formulaire d'édition
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Mettre à jour automatiquement le pourcentage d'achèvement en fonction du statut
    if (name === 'status') {
      let completionPercentage = editedTask.completion_percentage;
      
      if (value === 'completed') {
        completionPercentage = 100;
      } else if (value === 'not_started') {
        completionPercentage = 0;
      } else if (value === 'in_progress' && (editedTask.completion_percentage === 0 || editedTask.completion_percentage === 100)) {
        completionPercentage = 50;
      }
      
      setEditedTask(prev => ({
        ...prev,
        [name]: value as "not_started" | "in_progress" | "completed" | "delayed",
        completion_percentage: completionPercentage
      }));
    } else if (name === 'completion_percentage') {
      // تحديث الحالة تلقائيًا بناءً على نسبة الإنجاز
      let status: "not_started" | "in_progress" | "completed" | "delayed" = editedTask.status as "not_started" | "in_progress" | "completed" | "delayed";
      const percentage = parseInt(value);
      
      if (percentage === 100) {
        status = 'completed';
      } else if (percentage === 0) {
        status = 'not_started';
      } else if (percentage > 0 && percentage < 100) {
        status = 'in_progress';
      }
      
      setEditedTask(prev => ({ 
        ...prev, 
        [name]: percentage, 
        status: status
      }));
    } else {
      setEditedTask(prev => ({ ...prev, [name]: value }));
    }
    
    // Réinitialiser les messages d'erreur lors de la modification du formulaire
    setError(null);
  };
  
  // Soumettre les modifications de la tâche
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('يجب تسجيل الدخول لتعديل المهمة');
      return;
    }
    
    if (!editedTask.title || editedTask.title.trim() === '') {
      setError('يرجى إدخال عنوان للمهمة');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: editedTask.title?.trim(),
          description: editedTask.description?.trim() || null,
          status: editedTask.status,
          priority: editedTask.priority,
          due_date: editedTask.due_date || null,
          assigned_to: editedTask.assigned_to || null,
          completion_percentage: editedTask.completion_percentage
        })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating task:', error);
        setError('حدث خطأ أثناء تحديث المهمة: ' + error.message);
        return;
      }
      
      if (!data) {
        setError('حدث خطأ أثناء تحديث المهمة: لم يتم إرجاع بيانات المهمة');
        return;
      }
      
      // Enviar notificaciones
      if (data) {
        await sendTaskUpdateNotifications(data as ExtendedTask);
      }
      
      // Mettre à jour la tâche dans l'état
      setTask(data);
      setIsEditing(false);
      setSuccessMessage('تم تحديث المهمة بنجاح');
      
      // Masquer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating task:', err);
      setError('حدث خطأ أثناء تحديث المهمة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to send task update notifications to project members
  const sendTaskUpdateNotifications = async (updatedTask: ExtendedTask) => {
    try {
      if (!task || !updatedTask || !updatedTask.project_id || !user) return;

      // Obtener miembros del proyecto para enviar notificaciones
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', updatedTask.project_id);

      if (!members || members.length === 0) return;
      
      // Preparar lista de usuarios excluyendo al usuario actual
      const userIds = members
        .map(member => member.user_id)
        .filter(id => id !== user.id);

      if (userIds.length === 0) return;

      // Usar título fijo en árabe como solicitado por el usuario
      const title = `تحديث مهمة "${updatedTask.title}"`;
      let content = '';
      
      // Check if status changed
      if (task.status !== updatedTask.status) {
        // Traducir estados para mejor legibilidad
        const statusMap: Record<string, string> = {
          'not_started': 'لم تبدأ',
          'in_progress': 'قيد التنفيذ',
          'completed': 'مكتملة',
          'delayed': 'متأخرة'
        };
        
        const oldStatusAr = statusMap[task.status] || task.status;
        const newStatusAr = statusMap[updatedTask.status] || updatedTask.status;
        
        content = `تم تغيير حالة المهمة من "${oldStatusAr}" إلى "${newStatusAr}"`;
      }
      // Check if assigned user changed
      else if (task.assigned_to !== updatedTask.assigned_to) {
        if (updatedTask.assigned_to) {
          // Obtener nombre del usuario asignado
          const { data: assigneeData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', updatedTask.assigned_to)
            .single();
            
          const assigneeName = assigneeData?.full_name || assigneeData?.email || 'مستخدم';
          
          content = `تم تعيين ${assigneeName} للعمل على المهمة`;
          
          // Notificar al usuario asignado usando la función de RPC existente
          if (updatedTask.assigned_to !== user.id) {
            await supabase.rpc('insert_notification', {
              p_user_id: updatedTask.assigned_to,
              p_title: `تم تعيينك لمهمة "${updatedTask.title}"`,
              p_content: `تم تعيينك للعمل على المهمة`,
              p_type: 'task_updated',
              p_related_id: taskId,
              p_is_read: false
            });
          }
        } else {
          // Notificación general para cuando se desasigna una tarea
          content = `تم إلغاء تكليف المهمة`;
        }
      } else {
        // General task update
        content = `تم إجراء تحديثات على المهمة في المشروع`;
      }
      
      // Enviar notificaciones usando RPC a todos los usuarios relevantes
      const promises = userIds.map(userId => 
        supabase.rpc('insert_notification', {
          p_user_id: userId,
          p_title: title,
          p_content: content,
          p_type: 'task_updated',
          p_related_id: taskId,
          p_is_read: false
        })
      );
      
      await Promise.all(promises);
    } catch (err) {
      console.error('Error sending notifications:', err);
      // No propagar el error para que no impida la actualización principal
    }
  };
  
  // Supprimer la tâche
  const handleDeleteTask = async () => {
    if (!user) {
      setError('يجب تسجيل الدخول لحذف المهمة');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) {
        console.error('Error deleting task:', error);
        setError('حدث خطأ أثناء حذف المهمة: ' + error.message);
        setConfirmDelete(false);
        return;
      }
      
      // Rediriger vers la page des tâches
      router.push('/tasks');
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError('حدث خطأ أثناء حذف المهمة: ' + (err.message || 'خطأ غير معروف'));
      setConfirmDelete(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Ajouter un commentaire
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('يجب تسجيل الدخول لإضافة تعليق');
      return;
    }
    
    if (!newComment.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          user:user_id(id, full_name, avatar_url, email)
        `)
        .single();
      
      if (error) {
        console.error('Error adding comment:', error);
        setError('حدث خطأ أثناء إضافة التعليق: ' + error.message);
        return;
      }
      
      if (!data) {
        setError('حدث خطأ أثناء إضافة التعليق: لم يتم إرجاع بيانات التعليق');
        return;
      }
      
      setComments([data, ...comments]);
      setNewComment('');
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError('حدث خطأ أثناء إضافة التعليق: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Supprimer un commentaire
  const handleDeleteComment = async (commentId: string) => {
    if (!user) {
      setError('يجب تسجيل الدخول لحذف التعليق');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) {
        console.error('Error deleting comment:', error);
        setError('حدث خطأ أثناء حذف التعليق: ' + error.message);
        return;
      }
      
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      setError('حدث خطأ أثناء حذف التعليق: ' + (err.message || 'خطأ غير معروف'));
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }
  
  if (error && !task) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center font-medium">
          {error}
        </div>
        <div className="mt-4 text-center">
          <Button href="/tasks">العودة إلى قائمة المهام</Button>
        </div>
      </div>
    );
  }
  
  if (!task) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-amber-50 text-amber-700 p-4 rounded-lg text-center font-medium">
          لم يتم العثور على المهمة
        </div>
        <div className="mt-4 text-center">
          <Button href="/tasks">العودة إلى قائمة المهام</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Messages d'erreur et de succès */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 font-medium">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 font-medium">
          {successMessage}
        </div>
      )}
      
      {/* Confirmation de suppression */}
      {confirmDelete && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          <p className="mb-4">هل أنت متأكد من رغبتك في حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <div className="flex justify-end space-x-4 space-x-reverse">
            <Button onClick={() => setConfirmDelete(false)}>إلغاء</Button>
            <Button 
              onClick={handleDeleteTask} 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري الحذف...' : 'تأكيد الحذف'}
            </Button>
          </div>
        </div>
      )}
      
      {/* Mode affichage */}
      {!isEditing ? (
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
              {task.project && (
                <div className="mt-1">
                  <Link href={`/projects/${task.project.id}`} className="text-indigo-700 hover:text-indigo-900 font-medium">
                    {task.project.name}
                  </Link>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 space-x-reverse">
              <Button onClick={() => router.push(`/tasks/edit/${task.id}`)}>تعديل</Button>
              <Button 
                onClick={() => setConfirmDelete(true)}
                className="text-red-600 hover:text-red-800"
              >
                حذف
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">الوصف</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {task.description ? (
                    <p className="whitespace-pre-wrap font-medium text-gray-800">{task.description}</p>
                  ) : (
                    <p className="text-gray-700 font-medium">لا يوجد وصف</p>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">التفاصيل</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">الحالة</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[task.status]} font-semibold`}>
                        {statusTranslations[task.status]}
                      </span>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">الأولوية</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[task.priority]} font-semibold`}>
                        {priorityTranslations[task.priority]}
                      </span>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">تاريخ الاستحقاق</p>
                      <p className="font-medium text-gray-800">{task.due_date ? formatDate(task.due_date) : 'غير محدد'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">نسبة الإنجاز</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                        <div 
                          className={`h-2.5 rounded-full ${
                            task.status === 'completed' ? 'bg-green-500' : 
                            task.status === 'delayed' ? 'bg-amber-500' : 'bg-blue-500'
                          }`} 
                          style={{ width: `${task.completion_percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 mt-1 block">
                        {task.completion_percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">المكلف</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {task.assignee ? (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {task.assignee.avatar_url ? (
                          <img className="h-10 w-10 rounded-full" src={task.assignee.avatar_url} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold">
                              {task.assignee.full_name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mr-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {task.assignee.full_name}
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          {task.assignee.email}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 font-medium">غير مكلف</p>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">المنشئ</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {task.creator ? (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {task.creator.avatar_url ? (
                          <img className="h-10 w-10 rounded-full" src={task.creator.avatar_url} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold">
                              {task.creator.full_name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mr-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {task.creator.full_name}
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          {task.creator.email}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 font-medium">غير معروف</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">التواريخ</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">تاريخ الإنشاء</p>
                      <p>{formatDate(task.created_at)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">آخر تحديث</p>
                      <p>{formatDate(task.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* معلومات المنشئ والمحدث */}
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap gap-4">
              <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-[200px]">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">المنشئ</h3>
                <div className="flex items-center gap-2">
                  {task.creator?.avatar_url ? (
                    <img 
                      src={task.creator.avatar_url} 
                      alt={task.creator.full_name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User2 className="w-4 h-4 text-indigo-600" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-900">{task.creator?.full_name}</span>
                </div>
                <div className="mt-2 text-xs font-medium text-gray-700">
                  {new Date(task.created_at).toLocaleString('ar', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  })}
                </div>
              </div>

              {task.updater && task.updater.id !== task.creator?.id && (
                <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-[200px]">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">آخر تحديث بواسطة</h3>
                  <div className="flex items-center gap-2">
                    {task.updater.avatar_url ? (
                      <img 
                        src={task.updater.avatar_url} 
                        alt={task.updater.full_name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <User2 className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    <span className="text-sm font-semibold text-gray-900">{task.updater.full_name}</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-gray-700">
                    {new Date(task.updated_at).toLocaleString('ar', {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: true
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Mode édition */
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">تعديل المهمة</h2>
          
          <form onSubmit={handleSubmitEdit} className="space-y-6">
            {/* Titre de la tâche */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                عنوان المهمة *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={editedTask.title || ''}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={isSubmitting}
              />
            </div>
            
            {/* Description de la tâche */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                وصف المهمة
              </label>
              <textarea
                id="description"
                name="description"
                value={editedTask.description || ''}
                onChange={handleEditChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Statut de la tâche */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  حالة المهمة
                </label>
                <select
                  id="status"
                  name="status"
                  value={editedTask.status || 'not_started'}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isSubmitting}
                >
                  <option value="not_started">لم تبدأ</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="completed">مكتملة</option>
                  <option value="delayed">متأخرة</option>
                </select>
              </div>
              
              {/* Priorité de la tâche */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  أولوية المهمة
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={editedTask.priority || 'medium'}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isSubmitting}
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                </select>
              </div>
              
              {/* Date d'échéance */}
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ الاستحقاق
                </label>
                <input
                  type="datetime-local"
                  id="due_date"
                  name="due_date"
                  value={editedTask.due_date || ''}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Assignation à un membre */}
              <div>
                <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
                  تكليف إلى
                </label>
                <select
                  id="assigned_to"
                  name="assigned_to"
                  value={editedTask.assigned_to || ''}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isSubmitting}
                >
                  <option value="">غير مكلف</option>
                  {projectMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Pourcentage d'achèvement */}
              <div>
                <label htmlFor="completion_percentage" className="block text-sm font-medium text-gray-700 mb-1">
                  نسبة الإنجاز
                </label>
                <input
                  type="range"
                  id="completion_percentage"
                  name="completion_percentage"
                  min="0"
                  max="100"
                  step="5"
                  value={editedTask.completion_percentage || 0}
                  onChange={handleEditChange}
                  className="w-full"
                  disabled={isSubmitting}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex justify-end space-x-4 space-x-reverse">
              <Button 
                type="button" 
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                primary 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {/* Section des commentaires */}
      <div className="mt-10">
        <h3 className="text-xl font-semibold mb-4 text-gray-900">التعليقات</h3>
        
        {/* Formulaire d'ajout de commentaire */}
        <form onSubmit={handleAddComment} className="mb-6">
          <div className="flex">
            <textarea
              placeholder="أضف تعليقًا..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-grow px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              primary 
              disabled={isSubmitting || !newComment.trim()}
              className="rounded-r-none"
            >
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال'}
            </Button>
          </div>
        </form>
        
        {/* Liste des commentaires */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-700 font-medium">
              لا توجد تعليقات بعد
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10">
                      {comment.user.avatar_url ? (
                        <img className="h-10 w-10 rounded-full" src={comment.user.avatar_url} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 font-semibold">
                            {comment.user.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mr-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {comment.user.full_name}
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  {user && (user.id === comment.user.id || (task.created_by === user.id)) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="حذف التعليق"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="mt-2 text-sm font-medium text-gray-800 whitespace-pre-wrap">
                  {comment.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Page Next.js
export default function TaskPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8 px-4">
      <TaskView taskId={params.id} />
    </div>
  );
}
