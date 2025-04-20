'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import NotificationSystem from '@/components/ui/NotificationSystem';

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // التحقق من أن المسار الحالي هو أحد مسارات التطبيق المحمية
  const isAppRoute = pathname !== '/' && 
                     !pathname.startsWith('/auth') && 
                     pathname !== '/404' && 
                     pathname !== '/500';

  // إذا كان المسار هو مسار تطبيق محمي ولكن المستخدم غير مسجل الدخول، فلا نعرض التخطيط
  if (isAppRoute && !isLoading && !user) {
    return children;
  }

  // إذا كان المسار ليس مسار تطبيق محمي، فلا نعرض التخطيط
  if (!isAppRoute) {
    return children;
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navItems = [
    { name: 'لوحة التحكم', href: '/dashboard', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ) },
    { name: 'إنشاء مشروع', href: '/project/new', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ) },
    { name: 'الملف الشخصي', href: '/profile', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ) },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* الشريط العلوي */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            {/* زر القائمة للجوال */}
            <button
              className="md:hidden mr-2 text-gray-600"
              onClick={toggleMobileMenu}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">
              GradTrack
            </Link>
          </div>
          
          {/* القائمة للشاشات الكبيرة */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center text-gray-700 hover:text-indigo-600 ${
                  pathname === item.href ? 'text-indigo-600 font-semibold' : ''
                }`}
              >
                <span className="ml-2">{item.name}</span>
              </Link>
            ))}
            
            {user && (
              <div className="flex items-center space-x-4">
                <NotificationSystem />
                
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <span className="text-indigo-600 font-semibold">{user.full_name?.charAt(0) || user.email.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-gray-700">{user.full_name || user.email}</span>
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* القائمة الجانبية للجوال */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={toggleMobileMenu}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="px-4 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold text-indigo-600">GradTrack</div>
                <button
                  className="text-gray-600"
                  onClick={toggleMobileMenu}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {user && (
                <div className="mt-6 flex items-center">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <span className="text-indigo-600 font-semibold text-lg">{user.full_name?.charAt(0) || user.email.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{user.full_name || 'المستخدم'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex-1 px-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                    pathname === item.href
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                  }`}
                  onClick={toggleMobileMenu}
                >
                  <span className="ml-3">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
              
              <button
                onClick={() => {
                  logout();
                  toggleMobileMenu();
                }}
                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* المحتوى الرئيسي */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
