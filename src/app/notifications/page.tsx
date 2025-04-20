'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { Notification, NotificationType } from '@/lib/supabase/schema';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchNotifications();
  }, [user, currentFilter]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      // تطبيق الفلتر اعتمادًا على الحالة الحالية
      if (currentFilter === 'unread') {
        query = query.eq('is_read', false);
      } else if (currentFilter === 'read') {
        query = query.eq('is_read', true);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRelatedLink = (notification: Notification) => {
    if (!notification.related_id) return '/dashboard';

    switch (notification.type) {
      case 'post_created':
      case 'comment_added':
        return `/projects/post/${notification.related_id}`;
      case 'project_invitation':
        return `/projects/${notification.related_id}`;
      case 'inactivity_alert':
        return `/projects/${notification.related_id}`;
      case 'invitation_accepted':
        return `/projects/${notification.related_id}`;
      case 'deadline_reminder':
        return `/projects/${notification.related_id}`;
      default:
        return '/dashboard';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // تعليم الإشعار كمقروء
      await markAsRead(notification.id);

      // التوجيه إلى الصفحة المرتبطة بالإشعار
      const link = getRelatedLink(notification);
      router.push(link);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      // تحديث حالة الإشعارات محلياً
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // تحديث حالة الإشعارات محلياً اعتمادًا على الفلتر الحالي
      if (currentFilter === 'unread') {
        // إذا كنا نعرض فقط غير المقروءة، سيتم إفراغ القائمة
        await fetchNotifications();
      } else {
        // في حالات أخرى، تحديث المعلومات محليًا
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (!user || notifications.length === 0) return;

    // استخدام تأكيد قبل الحذف
    const confirmDelete = window.confirm('هل أنت متأكد من رغبتك في حذف جميع الإشعارات؟');
    if (!confirmDelete) return;

    try {
      let query = supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      
      // تطبيق الفلتر على عملية الحذف
      if (currentFilter === 'unread') {
        query = query.eq('is_read', false);
      } else if (currentFilter === 'read') {
        query = query.eq('is_read', true);
      }
      
      const { error } = await query;

      if (error) throw error;

      // تحديث قائمة الإشعارات
      await fetchNotifications();
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // تحديث القائمة محليًا
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'post_created':
        return (
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'comment_added':
        return (
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          </div>
        );
      case 'project_invitation':
        return (
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
        );
      case 'inactivity_alert':
        return (
          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'deadline_reminder':
        return (
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'invitation_accepted':
        return (
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
        );
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.is_read).length;
  };

  return (
    <>
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-semibold text-gray-900 text-right">الإشعارات</h1>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 mt-16 rtl" dir="rtl">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow">
          <div className="py-4 px-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800 mb-4 sm:mb-0">إشعاراتي</h1>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentFilter('all')}
                  className={`px-4 py-1.5 text-sm rounded-md ${
                    currentFilter === 'all' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setCurrentFilter('unread')}
                  className={`px-4 py-1.5 text-sm rounded-md ${
                    currentFilter === 'unread' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  غير مقروءة
                </button>
                <button
                  onClick={() => setCurrentFilter('read')}
                  className={`px-4 py-1.5 text-sm rounded-md ${
                    currentFilter === 'read' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  مقروءة
                </button>
              </div>
              
              <div className="flex gap-2 mt-3 sm:mt-0">
                {getUnreadCount() > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100"
                  >
                    تعيين الكل كمقروء
                  </button>
                )}
                
                {notifications.length > 0 && (
                  <button
                    onClick={deleteAllNotifications}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                  >
                    حذف {currentFilter === 'all' ? 'الكل' : currentFilter === 'unread' ? 'غير المقروءة' : 'المقروءة'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <span className="mr-2 text-gray-500">جار التحميل...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-gray-500 mt-2">
                {currentFilter === 'unread' 
                  ? 'ليس لديك إشعارات غير مقروءة' 
                  : currentFilter === 'read' 
                    ? 'ليس لديك إشعارات مقروءة' 
                    : 'ليس لديك إشعارات'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex py-4 px-6 hover:bg-gray-50 ${!notification.is_read ? 'bg-indigo-50' : ''}`}
                >
                  <div className="ml-4">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-medium text-gray-900">{notification.title}</h3>
                        <p className="mt-1 text-sm text-gray-600">{notification.content}</p>
                        <div className="text-xs font-medium text-gray-700 ml-auto">
                          {formatDate(notification.created_at)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleNotificationClick(notification)}
                          className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100"
                        >
                          عرض
                        </button>
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}