'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-12">
        <div>
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-700 text-white px-3 py-2 rounded-lg mr-2 shadow-md">G</div>
            <h4 className="text-2xl font-bold">GradTrack</h4>
          </div>
          <p className="text-gray-300 leading-relaxed">منصة متكاملة لإدارة المشاريع الأكاديمية والتفاعل بين الطلاب والمشرفين. نهدف إلى تيسير العملية التعليمية وتحسين جودة المخرجات الأكاديمية.</p>
        </div>
        <div>
          <h4 className="text-2xl font-bold mb-6 text-blue-300">روابط سريعة</h4>
          <ul className="space-y-4">
            <li>
              <Link href="#features" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                <span className="text-blue-400 ml-2 transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">›</span>
                المميزات
              </Link>
            </li>
            <li>
              <Link href="/auth/login" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                <span className="text-blue-400 ml-2 transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">›</span>
                تسجيل الدخول
              </Link>
            </li>
            <li>
              <Link href="/auth/signup" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                <span className="text-blue-400 ml-2 transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">›</span>
                إنشاء حساب
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-2xl font-bold mb-6 text-blue-300">تواصل معنا</h4>
          <p className="text-gray-300 leading-relaxed">لأي استفسارات أو دعم فني، يرجى التواصل معنا عبر البريد الإلكتروني.</p>
          <p className="text-blue-400 mt-4 hover:text-blue-300 transition-colors font-medium cursor-pointer flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@gradtrack.com
          </p>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
        <p>&copy; {new Date().getFullYear()} GradTrack. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  </footer>
  );
}