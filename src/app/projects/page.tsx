'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { Search, Filter, Grid, List, Plus, SortAsc, SortDesc, Tag, Calendar, User } from 'lucide-react';
import Header from '@/components/Header';
// import { useTranslations } from 'next-intl';

// استيراد المكونات المشتركة
interface ButtonProps {
  children: React.ReactNode;
  primary?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_id: string;
  owner?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  members_count?: number;
  role?: 'owner' | 'supervisor' | 'member';
  cloudinary_image_id?: string; // <== حقل الصورة المضاف
}

interface ProjectCardProps {
  project: Project;
  role: 'owner' | 'supervisor' | 'member';
  viewMode?: 'grid' | 'list';
  t: any; // إضافة مترجم
  onDeleteProject: (projectId: string) => void;
}

interface HeaderProps {
  user: any | null;
  t?: any; // Making t optional
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

// مكون الزر القابل لإعادة الاستخدام
const Button = ({ children, primary, href, onClick, className = '', ...props }: ButtonProps) => {
  const baseClasses = "font-medium rounded-lg px-4 py-2 transition-colors";
  const colorClasses = primary 
    ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 shadow-md" 
    : "text-gray-700 hover:bg-gray-100";
  
  const buttonClasses = `${baseClasses} ${colorClasses} ${className}`;
  
  return href ? (
    <Link href={href} className={buttonClasses} {...props}>
      {children}
    </Link>
  ) : (
    <button className={buttonClasses} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

// تعريف متغيرات الحركة خارج المكون للتنظيم
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Define a simple translation function since next-intl is commented out
const mockTranslation = (key: string, options?: { defaultValue: string }) => {
  return options?.defaultValue || key;
};

// مكون لعرض بطاقة المشروع لتجنب التكرار
const ProjectCard = ({ project, role, viewMode = 'grid', t = mockTranslation, onDeleteProject }: ProjectCardProps) => {
  // في وضع العرض القائم (list)
  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ backgroundColor: "#f9fafb" }}
        className="bg-white rounded-lg shadow p-4 transition-all border border-gray-100"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Link href={`/projects/${project.id}`} className="text-lg font-bold text-gray-800 hover:text-indigo-600 transition">
                {project.name}
              </Link>
              <div className={`mr-3 text-xs font-semibold py-1 px-2 rounded-full ${
                role === 'owner' ? 'bg-indigo-100 text-indigo-700' : 
                role === 'supervisor' ? 'bg-green-100 text-green-700' : 
                'bg-blue-100 text-blue-700'
              }`}>
                {role === 'owner' ? t('roles.owner', { defaultValue: 'مالك' }) : 
                 role === 'supervisor' ? t('roles.supervisor', { defaultValue: 'مشرف' }) : 
                 t('roles.member', { defaultValue: 'عضو' })}
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-2 line-clamp-1">
              {project.description ? project.description : 'لا يوجد وصف'}
            </p>
          </div>
          <div className="flex items-center mt-3 md:mt-0">
            <div className="flex flex-col items-end mr-4">
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <Calendar size={14} className="ml-1" />
                <span>تاريخ الإنشاء: {new Date(project.created_at).toLocaleDateString()}</span>
              </div>
              {project.owner && (
                <div className="flex items-center text-xs text-gray-500">
                  <User size={14} className="ml-1" />
                  <span>المالك: {project.owner.full_name || project.owner.email}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-2 space-x-reverse">
              <Link href={`/projects/${project.id}`} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-sm transition-colors">
                عرض المشروع
              </Link>
              {role === 'owner' && (
                <>
                  <Link href={`/projects/edit/${project.id}`} className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-sm transition-colors">
                    تعديل
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المشروع؟')) {
                        onDeleteProject(project.id);
                      }
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    حذف
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // في وضع العرض الشبكي (grid) نضيف صورة المشروع إن وجدت
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
      className="bg-white rounded-lg shadow p-5 transition-all h-full flex flex-col"
    >
      {project.cloudinary_image_id ? (
        <img
          src={project.cloudinary_image_id}
          alt={project.name}
          className="w-full h-40 object-cover rounded-md mb-4"
        />
      ) : (
        // يمكن استبدال العنصر التالي بصورة افتراضية
        <div className="w-full h-40 bg-gray-200 flex items-center justify-center rounded-md mb-4">
          <span className="text-gray-500">لا يوجد صورة</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <Link href={`/projects/${project.id}`} className="text-xl font-bold text-gray-800 hover:text-indigo-600 transition">
          {project.name}
        </Link>
        <div className={`text-xs font-semibold py-1 px-2 rounded-full ${
          role === 'owner' ? 'bg-indigo-100 text-indigo-700' : 
          role === 'supervisor' ? 'bg-green-100 text-green-700' : 
          'bg-blue-100 text-blue-700'
        }`}>
          {role === 'owner' ? t('roles.owner', { defaultValue: 'مالك' }) : 
           role === 'supervisor' ? t('roles.supervisor', { defaultValue: 'مشرف' }) : 
           t('roles.member', { defaultValue: 'عضو' })}
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">
        {project.description ? project.description : 'لا يوجد وصف'}
      </p>
      <div className="flex flex-col space-y-2 text-xs text-gray-500 mt-auto">
        <div className="flex justify-between items-center">
          <span className="flex items-center">
            <Calendar size={14} className="ml-1" />
            {new Date(project.created_at).toLocaleDateString()}
          </span>
          {project.members_count !== undefined && (
            <span className="flex items-center">
              <User size={14} className="ml-1" />
              {project.members_count} أعضاء
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          {project.owner && (
            <span className="text-gray-600 truncate">
              {project.owner.full_name || project.owner.email}
            </span>
          )}
          <div className="flex space-x-1 space-x-reverse">
            <Link href={`/projects/${project.id}`} className="text-indigo-600 hover:underline px-2 py-1">
              عرض
            </Link>
            {role === 'owner' && (
              <>
                <Link href={`/projects/edit/${project.id}`} className="text-blue-600 hover:underline px-2 py-1">
                  تعديل
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المشروع؟')) {
                      onDeleteProject(project.id);
                    }
                  }}
                  className="text-red-600 hover:underline px-2 py-1"
                >
                  حذف
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// مكون لعرض حالة التحميل
interface LoadingSpinnerProps {
  size?: string;
}

const LoadingSpinner = ({ size = 'h-12 w-12' }: LoadingSpinnerProps) => (
  <div className={`animate-spin rounded-full ${size} border-t-2 border-b-2 border-indigo-500`}></div>
);

// مكون الشعار
interface LogoProps {
  className?: string;
}

const Logo = ({ className = '' }: LogoProps) => (
  <div className={`flex items-center ${className}`}>
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-3 py-1 rounded-lg ml-2 shadow-md">G</div>
    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">GradTrack</h1>
  </div>
);

// مكون الفوتر
const Footer = ({ t = mockTranslation }) => (
  <footer className="bg-gray-900 text-white py-16">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-12">
        <div>
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-700 text-white px-3 py-2 rounded-lg ml-2 shadow-md">G</div>
            <h4 className="text-2xl font-bold">GradTrack</h4>
          </div>
          <p className="text-gray-300 leading-relaxed">
            {t('footer.description', { defaultValue: 'منصة متكاملة لإدارة المشاريع الأكاديمية والتفاعل بين الطلاب والمشرفين. نهدف إلى تيسير العملية التعليمية وتحسين جودة المخرجات الأكاديمية.' })}
          </p>
        </div>
        <div>
          <h4 className="text-2xl font-bold mb-6 text-blue-300">{t('footer.quickLinks', { defaultValue: 'روابط سريعة' })}</h4>
          <ul className="space-y-4">
            <li>
              <Link href="#features" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                <span className="text-blue-400 ml-2 transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">›</span>
                {t('footer.features', { defaultValue: 'المميزات' })}
              </Link>
            </li>
            <li>
              <Link href="/auth/login" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                <span className="text-blue-400 ml-2 transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">›</span>
                {t('login', { defaultValue: 'تسجيل الدخول' })}
              </Link>
            </li>
            <li>
              <Link href="/auth/signup" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                <span className="text-blue-400 ml-2 transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">›</span>
                {t('signup', { defaultValue: 'إنشاء حساب' })}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-2xl font-bold mb-6 text-blue-300">{t('footer.contactUs', { defaultValue: 'تواصل معنا' })}</h4>
          <p className="text-gray-300 leading-relaxed">
            {t('footer.contactDescription', { defaultValue: 'لأي استفسارات أو دعم فني، يرجى التواصل معنا عبر البريد الإلكتروني.' })}
          </p>
          <p className="text-blue-400 mt-4 hover:text-blue-300 transition-colors font-medium cursor-pointer flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@gradtrack.com
          </p>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
        <p>&copy; {new Date().getFullYear()} GradTrack. {t('footer.allRightsReserved', { defaultValue: 'جميع الحقوق محفوظة.' })}</p>
      </div>
    </div>
  </footer>
);

// مكون زر التبديل
interface ToggleButtonProps {
  options: { value: string; icon: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ToggleButton = ({ options, value, onChange, className = '' }: ToggleButtonProps) => (
  <div className={`flex rounded-lg bg-gray-100 p-1 ${className}`}>
    {options.map((option) => (
      <button
        key={option.value}
        className={`flex items-center justify-center px-3 py-1.5 rounded-md transition-colors ${
          value === option.value
            ? 'bg-white shadow-sm text-indigo-700'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        onClick={() => onChange(option.value)}
      >
        {option.icon}
      </button>
    ))}
  </div>
);

// الصفحة الرئيسية لعرض المشاريع
export default function ProjectsPage() {
  // const t = useTranslations('projects');
  const t = mockTranslation; // Use the mock translation function
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterRole, setFilterRole] = useState<'all' | 'owner' | 'supervisor' | 'member'>('all');
  
  // تأثير لتحميل المشاريع
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        setIsLoadingProjects(true);
        
        // جلب المشاريع التي ينتمي إليها المستخدم
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('project_members')
          .select('*, projects:project_id(*), role')
          .eq('user_id', user.id);
        
        if (membershipsError) throw membershipsError;
        
        // تحويل البيانات إلى تنسيق مناسب
        const projectsWithRoles: Project[] = [];
        
        if (membershipsData) {
          for (const membership of membershipsData) {
            if (membership.projects) {
              // جلب معلومات المالك
              const { data: ownerData } = await supabase
                .from('users')
                .select('full_name, email, avatar_url')
                .eq('id', membership.projects.owner_id)
                .single();
              
              // جلب عدد الأعضاء
              const { data: membersData, error: membersError } = await supabase
                .from('project_members')
                .select('id', { count: 'exact' })
                .eq('project_id', membership.projects.id);
              
              const membersCount = membersError ? 0 : (membersData?.length || 0);
              
              projectsWithRoles.push({
                ...membership.projects,
                role: membership.role as 'owner' | 'supervisor' | 'member',
                owner: ownerData || undefined,
                members_count: membersCount,
                cloudinary_image_id: membership.projects.cloudinary_image_id // <== جلب رابط الصورة من المشروع
              });
            }
          }
        }
        
        setProjects(projectsWithRoles);
        setIsLoadingProjects(false);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setIsLoadingProjects(false);
      }
    };

    if (user) {
      fetchProjects();
    } else {
      setIsLoadingProjects(false);
    }
  }, [user]);

  // تصفية المشاريع بناءً على البحث والفلتر
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // تصفية حسب البحث
      const matchesSearch = searchQuery === '' || 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // تصفية حسب الدور
      const matchesRole = filterRole === 'all' || project.role === filterRole;
      
      return matchesSearch && matchesRole;
    });
  }, [projects, searchQuery, filterRole]);

  // ترتيب المشاريع
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortOrder === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [filteredProjects, sortBy, sortOrder]);

  // تبديل ترتيب الفرز
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // داخل مكون ProjectsPage أضف دالة الحذف
  const handleDeleteProject = async (projectId: string) => {
    try {
      // عرض مؤشر التحميل
      setIsLoadingProjects(true);
      
      // حذف المشروع من قاعدة البيانات
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
        
      if (error) {
        throw error;
      }
      
      // حذف المشروع من حالة الواجهة
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
      
      // إظهار رسالة نجاح
      alert('تم حذف المشروع بنجاح');
      
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('حدث خطأ أثناء حذف المشروع');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // عرض أثناء التحميل
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجلاً الدخول
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* <Header user={null} t={t} /> */}
        <div className="flex-grow flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {t('loginRequired', { defaultValue: 'يجب تسجيل الدخول لعرض المشاريع' })}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('loginRequiredDescription', { defaultValue: 'قم بتسجيل الدخول أو إنشاء حساب جديد للوصول إلى مشاريعك' })}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button primary href="/auth/login">
                {t('login', { defaultValue: 'تسجيل الدخول' })}
              </Button>
              <Button href="/auth/signup">
                {t('signup', { defaultValue: 'إنشاء حساب' })}
              </Button>
            </div>
          </div>
        </div>
        <Footer t={t} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
                {t('projects.title', { defaultValue: 'المشاريع' })}
              </h1>
              
              <Button primary href="/projects/new" className="inline-flex items-center">
                <Plus size={18} className="ml-2" />
                {t('projects.new', { defaultValue: 'مشروع جديد' })}
              </Button>
            </div>
          </div>

          {/* شريط البحث والفلترة */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن مشروع..."
                  className="w-full py-2 pr-10 pl-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 ml-2">
                    تصفية:
                  </span>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as any)}
                    className="border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">الكل</option>
                    <option value="owner">مالك</option>
                    <option value="supervisor">مشرف</option>
                    <option value="member">عضو</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 ml-2">
                    ترتيب حسب:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="date">التاريخ</option>
                    <option value="name">الاسم</option>
                  </select>
                  <button
                    onClick={toggleSortOrder}
                    className="ml-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
                  >
                    {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
                  </button>
                </div>
                
                <ToggleButton
                  options={[
                    { value: 'grid', icon: <Grid size={18} /> },
                    { value: 'list', icon: <List size={18} /> }
                  ]}
                  value={viewMode}
                  onChange={(value) => setViewMode(value as 'grid' | 'list')}
                  className="ml-auto"
                />
              </div>
            </div>
          </div>

          {/* عرض المشاريع */}
          {isLoadingProjects ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : sortedProjects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-8 text-center"
            >
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {searchQuery || filterRole !== 'all' ? 
                    'لم يتم العثور على مشاريع مطابقة' : 
                  'ليس لديك أي مشاريع بعد'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterRole !== 'all' ? 
                  'جرب بحثًا مختلفًا أو قم بإزالة الفلاتر' : 
                  'قم بإنشاء مشروعك الأول للبدء في تتبع تقدمك الأكاديمي'}
              </p>
              {!searchQuery && filterRole === 'all' && (
                <Button primary href="/projects/new" className="flex items-center mx-auto">
                  <Plus size={18} className="ml-2" />
                  إنشاء مشروع جديد
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}
            >
              {sortedProjects.map((project) => (
                <motion.div key={project.id} variants={fadeIn}>
                  <ProjectCard 
                    project={project} 
                    role={project.role || 'member'} 
                    viewMode={viewMode} 
                    t={t} 
                    onDeleteProject={handleDeleteProject}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
      <Footer t={t} />
    </div>
  );
}
