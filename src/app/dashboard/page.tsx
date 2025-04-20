'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { WeeklyActivityChart, TaskStatusChart, ProjectsComparisonChart } from '@/components/analytics/AnalyticsCharts';
import TasksTable from '@/components/tasks/TasksTable';

// Types pour les props des composants
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
  completion_percentage?: number;
}

interface ProjectCardProps {
  project: Project;
  role: 'owner' | 'supervisor' | 'member';
}

interface StatCardProps {
  title: string;
  count: number;
  description: string;
  bgColor: string;
  textColor: string;
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

// مكون لعرض بطاقة المشروع لتجنب التكرار
const ProjectCard = ({ project, role }: ProjectCardProps) => (
  <motion.div
    whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
    className="bg-white rounded-lg shadow p-5 transition-all"
  >
    <div className="flex items-center justify-between mb-4">
      <Link href={`/projects/${project.id}`} className="text-xl font-bold text-gray-800 hover:text-indigo-600 transition">
        {project.name}
      </Link>
      <div className={`text-xs font-semibold py-1 px-2 rounded-full ${
        role === 'owner' ? 'bg-indigo-100 text-indigo-700' : 
        role === 'supervisor' ? 'bg-green-100 text-green-700' : 
        'bg-blue-100 text-blue-700'
      }`}>
        {role === 'owner' ? 'مالك' : role === 'supervisor' ? 'مشرف' : 'عضو'}
      </div>
    </div>
    <p className="text-gray-600 text-sm mb-4 h-10 overflow-hidden">
      {project.description ? project.description : 'لا يوجد وصف'}
    </p>
    
    {/* إضافة شريط نسبة الإنجاز */}
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">نسبة الإنجاز</span>
        <span className="text-xs font-semibold">{project.completion_percentage || 0}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${
            (project.completion_percentage || 0) === 100 ? 'bg-green-500' : 'bg-indigo-500'
          }`} 
          style={{ width: `${project.completion_percentage || 0}%` }}
        ></div>
      </div>
    </div>
    
    <div className="flex justify-between items-center text-xs text-gray-500">
      <span>تاريخ الإنشاء: {new Date(project.created_at).toLocaleDateString('ar-SA')}</span>
      <Link href={`/projects/${project.id}`} className="text-indigo-600 hover:underline">
        عرض المشروع
      </Link>
    </div>
  </motion.div>
);

// مكون لعرض الإحصائيات
const StatCard = ({ title, count, description, bgColor, textColor }: StatCardProps) => (
  <div className={`${bgColor} rounded-lg p-4 shadow-sm`}>
    <h4 className={`text-lg font-semibold ${textColor} mb-2`}>{title}</h4>
    <p className="text-3xl font-bold">{count}</p>
    <p className="text-gray-600 text-sm">{description}</p>
  </div>
);

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
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-3 py-1 rounded-lg mr-2 shadow-md">G</div>
    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">GradTrack</h1>
  </div>
);

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [supervisedProjects, setSupervisedProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('أسبوع');
  const [taskCounts, setTaskCounts] = useState({
    total: 0,
    completed: 0,
    in_progress: 0,
    not_started: 0,
    delayed: 0
  });
  
  // الخيارات الزمنية للرسوم البيانية
  const timeRangeOptions = ['أسبوع', 'شهر', '3 أشهر', 'سنة'];

  // Effet pour charger les projets
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        setIsLoadingProjects(true);
        
        // جلب المشاريع التي ينتمي إليها المستخدم
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('project_members')
          .select('*, project:project_id(*)')
          .eq('user_id', user.id);
        
        if (membershipsError) throw membershipsError;
        
        // فصل المشاريع بناءً على دور المستخدم
        const owned: Project[] = [];
        const supervised: Project[] = [];
        const member: Project[] = [];
        
        if (membershipsData) {
          for (const membership of membershipsData) {
            if (membership.project) {
              if (membership.role === 'owner') {
                owned.push(membership.project);
              } else if (membership.role === 'supervisor') {
                supervised.push(membership.project);
              } else {
                member.push(membership.project);
              }
            }
          }
        }
        
        setOwnedProjects(owned);
        setSupervisedProjects(supervised);
        setProjects([...owned, ...supervised, ...member]);
        
        // Récupérer les statistiques des tâches
        await fetchTaskStats([...owned, ...supervised, ...member].map(p => p.id));
        
        setIsLoadingProjects(false);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setIsLoadingProjects(false);
      }
    };

    // Fonction pour récupérer les statistiques des tâches
    const fetchTaskStats = async (projectIds: string[]) => {
      if (projectIds.length === 0) return;
      
      try {
        // Fetch the session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setTaskCounts({
            total: 0,
            completed: 0,
            in_progress: 0,
            not_started: 0,
            delayed: 0
          });
          return;
        }
        
        // Récupérer le nombre total de tâches par statut
        const { data: taskStats, error: taskError } = await supabase
          .from('tasks')
          .select('status, count')
          .in('project_id', projectIds);
        
        if (taskError) throw taskError;
        
        // Calculer les comptages par statut
        const counts = {
          total: 0,
          completed: 0,
          in_progress: 0,
          not_started: 0,
          delayed: 0
        };
        
        taskStats?.forEach((stat: { status: string; count: number }) => {
          const count = Number(stat.count);
          counts.total += count;
          
          switch (stat.status) {
            case 'completed':
              counts.completed += count;
              break;
            case 'in_progress':
              counts.in_progress += count;
              break;
            case 'not_started':
              counts.not_started += count;
              break;
            case 'delayed':
              counts.delayed += count;
              break;
          }
        });
        
        setTaskCounts(counts);
      } catch (error) {
        console.error("Error fetching task stats:", error instanceof Error ? error.message : "Unknown error");
        setTaskCounts({
          total: 0,
          completed: 0,
          in_progress: 0,
          not_started: 0,
          delayed: 0
        });
      }
    };

    if (user) {
      fetchProjects();
    } else {
      setIsLoadingProjects(false);
    }
  }, [user]);

  // عرض حالة التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // التحقق من تسجيل الدخول
  if (!user) {
    return (
      <>
    
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">يجب تسجيل الدخول للوصول إلى لوحة التحكم</h2>
            <Button primary href="/auth/login">
              تسجيل الدخول
            </Button>
          </div>
        </div>
       
      </>
    );
  }

  // استخراج اسم المستخدم أو البريد الإلكتروني
  const userDisplayName = user.full_name;

  // إعداد بيانات الإحصائيات
  const statsData = [
    {
      title: 'المشاريع',
      count: projects.length,
      description: 'إجمالي المشاريع',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    },
    {
      title: 'المهام',
      count: taskCounts.total,
      description: 'إجمالي المهام',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'المهام المكتملة',
      count: taskCounts.completed,
      description: `${taskCounts.total > 0 ? Math.round((taskCounts.completed / taskCounts.total) * 100) : 0}% من المهام`,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'إنجاز المشاريع',
      count: projects.length > 0 
        ? Math.round(projects.reduce((sum, project) => sum + (project.completion_percentage || 0), 0) / projects.length) 
        : 0,
      description: 'متوسط نسبة الإنجاز',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
     
      {/* المحتوى الرئيسي */}
      <main className="container mx-auto px-4 py-8 flex-grow">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">لوحة التحكم</h2>
          
          {/* بطاقة المعلومات الأساسية */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">مرحباً، {userDisplayName}</h3>
                <p className="text-gray-600">هذه هي لوحة التحكم الخاصة بك. يمكنك إدارة مشاريعك ومتابعة تقدمها من هنا.</p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button primary href="/projects/new">إنشاء مشروع جديد</Button>
              </div>
            </div>
            
            {/* الإحصائيات */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {statsData.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>
            
            {/* المشاريع الحديثة */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">المشاريع الحديثة</h3>
                <Link href="/projects" className="text-indigo-600 hover:text-indigo-800 text-sm">عرض جميع المشاريع</Link>
              </div>
              
              {isLoadingProjects ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="h-8 w-8" />
                </div>
              ) : projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.slice(0, 3).map((project) => {
                    const role = ownedProjects.some(p => p.id === project.id) 
                      ? 'owner' 
                      : supervisedProjects.some(p => p.id === project.id) 
                        ? 'supervisor' 
                        : 'member';
                    
                    return (
                      <ProjectCard key={project.id} project={project} role={role as 'owner' | 'supervisor' | 'member'} />
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">ليس لديك أي مشاريع حالياً</p>
                  <Button primary href="/projects/new">إنشاء مشروع جديد</Button>
                </div>
              )}
            </div>
            
            {/* جدول المهام */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">المهام</h3>
                <Link href="/tasks" className="text-indigo-600 hover:text-indigo-800 text-sm">عرض جميع المهام</Link>
              </div>
              
              {isLoadingProjects ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="h-8 w-8" />
                </div>
              ) : projects.length > 0 ? (
                <TasksTable 
                  limit={5} 
                  showPagination={false} 
                  showFilters={true}
                  className="mb-4"
                />
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">ليس لديك أي مهام حالياً</p>
                  <Button primary href="/tasks/new">إنشاء مهمة جديدة</Button>
                </div>
              )}
            </div>
          </div>
            
          {/* قسم التحليلات والرسوم البيانية - كامل العرض */}
          {projects.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">تحليلات المشاريع</h3>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  {timeRangeOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelectedTimeRange(option)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        selectedTimeRange === option
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      } text-black`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
                  
              {/* مكون مخطط النشاط الأسبوعي بعرض كامل */}
              <div className="mb-8">
                <WeeklyActivityChart projectsData={projects} timeRange={selectedTimeRange} />
              </div>
                  
              {/* المخططات الإضافية في شبكة */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TaskStatusChart projectsData={projects} />
                <ProjectsComparisonChart projectsData={projects.slice(0, 5)} />
              </div>
            </div>
          )}
        </motion.div>
      </main>
      
   
    </div>
  );
}
