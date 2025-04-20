'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import NotificationSystem from './NotificationSystem';
import Link from 'next/link';
import { useState } from 'react';
import Logo from '@/components/Logo';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // لن نعرض أي شيء إذا لم يكن هناك مستخدم مسجل الدخول
  if (!user) return null;

  const userDisplayName = user.full_name || '';
  const userInitial = userDisplayName.charAt(0);

  return (
    <>
      {/* Navbar الأساسي - تم حذف Header */}
      <nav className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">

                <Link href="/" className="text-2xl font-bold text-indigo-600 mr-2">
                  <Logo />
                </Link>
              </div>
              <div className="hidden sm:mr-6 sm:flex sm:space-x-8 sm:space-x-reverse">
                <Link
                  href="/dashboard"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  لوحة التحكم
                </Link>
                <Link
                  href="/projects"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  المشاريع
                </Link>
                <Link
                  href="/tasks"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  المهام
                </Link>
              </div>
            </div>

            {user && (
              <div className="hidden sm:flex sm:items-center">
                {/* زر الإشعارات بشكل أكثر وضوحًا */}
                <div className="ml-4 relative ">
                  <NotificationSystem />
                </div>

                {/* رابط لصفحة جميع الإشعارات */}
                {/* <Link
                  href="/notifications"
                  className="ml-4 text-sm text-gray-500 hover:text-indigo-600 flex items-center"
                >
                  جميع الإشعارات
                </Link> */}

                <div className="mr-4 relative flex items-center">
                  {/* عرض اسم المستخدم بجانب الأيقونة */}
                  <span className="text-gray-700 ml-2">{userDisplayName}</span>

                  <button
                    onClick={toggleMenu}
                    className="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-gray-300 transition duration-150 ease-in-out"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={userDisplayName}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <span className="inline-block h-8 w-8 rounded-full overflow-hidden bg-indigo-100">
                        <div className="h-full w-full flex items-center justify-center">
                          <span className="text-indigo-600 font-semibold">{userInitial}</span>
                        </div>
                      </span>
                    )}
                  </button>

                  {isMenuOpen && (
                    <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5" dir="rtl" style={{ top: '100%' }}>
                      <div className="px-4 py-3">
                        <p className="text-sm">مرحباً</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.email}
                        </p>
                      </div>
                      <hr />
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        الملف الشخصي
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setIsMenuOpen(false);
                        }}
                        className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* القائمة للشاشات الصغيرة */}
            <div className="flex items-center sm:hidden">
              {/* إضافة زر الإشعارات للشاشات الصغيرة */}
              <div className="ml-2 relative">
                <NotificationSystem />
              </div>

              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <svg
                  className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <svg
                  className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* القائمة المتنقلة للشاشات الصغيرة */}
        {isMenuOpen && (
          <div className="sm:hidden" dir="rtl">
            <div className="pt-2 pb-3 space-y-1">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                لوحة التحكم
              </Link>
              <Link
                href="/projects"
                className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                المشاريع
              </Link>
              <Link
                href="/tasks"
                className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                المهام
              </Link>
              {/* إضافة رابط لصفحة جميع الإشعارات */}
              {/* <Link
                href="/notifications"
                className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                جميع الإشعارات
              </Link> */}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={userDisplayName}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <span className="inline-block h-10 w-10 rounded-full overflow-hidden bg-indigo-100">
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">{userInitial}</span>
                      </div>
                    </span>
                  )}
                </div>
                <div className="mr-3">
                  <div className="text-base font-medium text-gray-800">{userDisplayName}</div>
                  <div className="text-sm font-medium text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  الملف الشخصي
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-right px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* مساحة فارغة لتجنب تداخل المحتوى مع القائمة الثابتة */}
      <div className="h-16"></div>
    </>
  );
}

export const metadata = {
  // ...الميتاداتا الحالية
};

// استخدم هذا لإيقاف تحذيرات الـ hydration
export const dynamic = 'force-dynamic';