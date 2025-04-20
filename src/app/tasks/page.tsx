'use client';

// import { useTranslations } from 'next-intl';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Link from 'next/link';
import { Task, TaskStatus, TaskPriority, Project, User } from '@/lib/supabase/schema';

// Extended Task interface to include related data
interface ExtendedTask extends Task {
  project?: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export default function TasksPage() {
  // const t = useTranslations();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('due_date');

  // تحديث المهام عند تغيير المستخدم أو معايير التصفية أو الترتيب
  useEffect(() => {
    if (user) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [user, filterStatus, filterPriority, sortBy]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // بناء الاستعلام لجلب المهام المرتبطة بالمشاريع التي ينتمي إليها المستخدم
      // RLS في Supabase ستتحقق من أن المستخدم عضو في المشروع
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:project_id(id, name),
          assignee:assigned_to(id, full_name, avatar_url)
        `);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // تحويل البيانات إلى النموذج المطلوب
      const tasksData = data.map(task => ({
        ...task,
        due_date: task.due_date,
      })) as ExtendedTask[];
      
      setTasks(tasksData);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError('حدث خطأ أثناء جلب المهام: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  // تطبيق التصفية والترتيب على المهام
  const filteredAndSortedTasks = useMemo(() => {
    // تطبيق التصفية حسب الحالة
    let result = [...tasks];
    
    if (filterStatus !== 'all') {
      result = result.filter(task => task.status === filterStatus);
    }
    
    // تطبيق التصفية حسب الأولوية
    if (filterPriority !== 'all') {
      result = result.filter(task => task.priority === filterPriority);
    }
    
    // تطبيق الترتيب
    result.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          return a.due_date && b.due_date 
            ? new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            : a.due_date ? -1 : b.due_date ? 1 : 0;
        case 'priority': {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        case 'status': {
          const statusOrder = { not_started: 0, in_progress: 1, delayed: 2, completed: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        }
        default:
          return 0;
      }
    });
    
    return result;
  }, [tasks, filterStatus, filterPriority, sortBy]);

  const getStatusTranslation = (status: string) => {
    // استخدام ترجمات مباشرة بدلاً من مفاتيح الترجمة حتى يتم تفعيل نظام الترجمة
    switch (status) {
      case 'not_started':
        return 'لم تبدأ';
      case 'in_progress':
        return 'قيد التنفيذ';
      case 'completed':
        return 'مكتملة';
      case 'delayed':
        return 'متأخرة';
      default:
        return status;
    }
    // عند تفعيل نظام الترجمة، يمكن استخدام:
    // return t(`tasks.status.${status}`);
  };

  const getPriorityTranslation = (priority: string) => {
    // استخدام ترجمات مباشرة بدلاً من مفاتيح الترجمة حتى يتم تفعيل نظام الترجمة
    switch (priority) {
      case 'high':
        return 'عالية';
      case 'medium':
        return 'متوسطة';
      case 'low':
        return 'منخفضة';
      default:
        return priority;
    }
    // عند تفعيل نظام الترجمة، يمكن استخدام:
    // return t(`tasks.priority.${priority}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'غير محدد';
    
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: arSA });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">يجب تسجيل الدخول للوصول إلى المهام</h2>
            <Link href="/auth/login" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">المهام</h1>
        <Link href="/tasks/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
          إنشاء مهمة جديدة
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">تصفية المهام بالحالة</h2>
          <select
            className="w-full p-2 border rounded-md"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="not_started">لم تبدأ</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="delayed">متأخرة</option>
          </select>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">تصفية المهام بالأولوية</h2>
          <select
            className="w-full p-2 border rounded-md"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">كل الأولويات</option>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
          </select>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">ترتيب المهام</h2>
          <select
            className="w-full p-2 border rounded-md"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="due_date">الموعد</option>
            <option value="priority">الأولوية</option>
            <option value="status">الحالة</option>
          </select>
        </div>
      </div>

      <div className="mt-8">
        {filteredAndSortedTasks.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-600">لا يوجد مهام</h3>
            <p className="text-gray-500 mt-2">
              {tasks.length > 0 
                ? 'لا توجد مهام تطابق معايير التصفية المحددة' 
                : 'لا يوجد مهام لعرضها'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedTasks.map((task) => (
              <Link href={`/tasks/${task.id}`} key={task.id} className="block">
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow h-full">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold">{task.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${getPriorityColor(task.priority)}`}>
                      {getPriorityTranslation(task.priority)}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-2">{task.description || 'لا يوجد وصف'}</p>
                  
                  {/* عرض معلومات المشروع */}
                  <div className="mb-4">
                    <span className="text-sm text-gray-500">المشروع: {task.project?.name}</span>
                  </div>
                  
                  {/* نسبة الإكمال */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          task.status === 'completed' ? 'bg-green-600' : 
                          task.status === 'delayed' ? 'bg-red-600' : 'bg-blue-600'
                        }`} 
                        style={{ width: `${task.completion_percentage}%` }}>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{task.completion_percentage}% مكتمل</span>
                  </div>
                  
                  {/* عرض معلومات المسؤول */}
                  <div className="flex items-center mb-4">
                    {task.assignee ? (
                      <>
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                          {task.assignee.avatar_url ? (
                            <img 
                              src={task.assignee.avatar_url} 
                              alt={task.assignee.full_name} 
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <span className="text-indigo-600 font-semibold">
                              {task.assignee.full_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">{task.assignee.full_name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">غير مكلف</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(task.status)}`}>
                      {getStatusTranslation(task.status)}
                    </span>
                    <span className="text-gray-500">{formatDate(task.due_date)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
