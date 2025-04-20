import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Calendar, Download, TrendingUp, TrendingDown, Activity, Filter } from 'lucide-react';

// مكون يُظهر حالة التحميل
const LoadingSpinner = ({ size = 'h-12 w-12' }: { size?: string }) => (
  <div className="flex justify-center items-center">
    <motion.div 
      className={`rounded-full ${size} border-t-2 border-b-2 border-indigo-500`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

// الأنماط والأنواع المستخدمة في الرسوم البيانية
interface ChartProps {
  projectsData?: Project[];
  timeRange?: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_id: string;
}

interface TaskStatusData {
  name: string;
  value: number;
  color: string;
}

interface ActivityData {
  name: string;
  تحديثات: number;
  مهام: number;
  تعليقات: number;
  dateKey?: string;
}

interface ProjectComparisonData {
  name: string;
  [key: string]: string | number;
}

// مكون Card لتغليف الرسوم البيانية والمحتويات
const Card = ({ children, title, className = '' }: { 
  children: React.ReactNode; 
  title: string;
  className?: string;
}) => (
  <motion.div 
    className={`bg-white p-6 rounded-lg shadow-md ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex justify-between items-center mb-4">
      <h4 className="text-lg font-semibold">{title}</h4>
      <div className="flex space-x-2">
        <button 
          className="text-gray-500 hover:text-indigo-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          title="تصدير البيانات"
        >
          <Download size={18} />
        </button>
      </div>
    </div>
    <div className="transition-all duration-300 ease-in-out">
      {children}
    </div>
  </motion.div>
);

// مكون Button محسّن
const Button = ({ children, primary, href, onClick, className = '', size = 'medium', icon, ...props }: {
  children: React.ReactNode;
  primary?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  [key: string]: any;
}) => {
  const sizeClasses = {
    small: "px-3 py-1 text-sm",
    medium: "px-4 py-2",
    large: "px-6 py-3 text-lg"
  };
  
  const baseClasses = "font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2";
  const colorClasses = primary 
    ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-lg" 
    : "text-gray-700 hover:bg-gray-100 border border-gray-200";
  
  const buttonClasses = `${baseClasses} ${colorClasses} ${sizeClasses[size]} ${className}`;
  
  const content = (
    <>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </>
  );
  
  return href ? (
    <Link href={href} className={buttonClasses} {...props}>
      {content}
    </Link>
  ) : (
    <button className={buttonClasses} onClick={onClick} {...props}>
      {content}
    </button>
  );
};

// تعريف ألوان الرسوم البيانية
const chartColors = {
  primary: '#4F46E5', // indigo-600
  secondary: '#10B981', // emerald-500
  tertiary: '#F59E0B', // amber-500
  quaternary: '#EF4444', // red-500
  neutral: '#6B7280', // gray-500
  gradient: ['#4F46E5', '#818CF8'], // indigo-600 to indigo-400
  background: '#F9FAFB', // gray-50
};

// ألوان حالات المهام
const taskStatusColors = {
  'completed': '#10B981', // أخضر
  'in_progress': '#4F46E5', // أزرق
  'delayed': '#F59E0B', // برتقالي
  'not_started': '#6B7280' // رمادي
};

// ترجمة حالات المهام للعربية
const statusTranslations = {
  'completed': 'مكتملة',
  'in_progress': 'قيد التنفيذ',
  'delayed': 'متأخرة',
  'not_started': 'لم تبدأ'
};

// مكون تحديد نطاق الوقت
const TimeRangeSelector = ({ timeRange, onChange }: { 
  timeRange: string;
  onChange: (range: string) => void;
}) => {
  const options = [
    { value: 'أسبوع', label: 'أسبوع' },
    { value: 'شهر', label: 'شهر' },
    { value: '3 أشهر', label: '3 أشهر' },
    { value: 'سنة', label: 'سنة' }
  ];
  
  return (
    <div className="flex items-center space-x-2 mb-4 rtl:space-x-reverse">
      <Calendar size={18} className="text-gray-500" />
      <div className="flex rounded-lg bg-gray-100 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === option.value
                ? 'bg-white shadow-sm text-indigo-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// دالة لحساب الاتجاه (التغير) بين قيمتين
const getTrend = (currentValue: number, previousValue: number) => {
  if (currentValue > previousValue) {
    return { 
      icon: <TrendingUp size={16} className="text-emerald-500" />, 
      percentage: ((currentValue - previousValue) / previousValue * 100).toFixed(1),
      positive: true
    };
  } else if (currentValue < previousValue) {
    return { 
      icon: <TrendingDown size={16} className="text-red-500" />, 
      percentage: ((previousValue - currentValue) / previousValue * 100).toFixed(1),
      positive: false
    };
  }
  return null;
};

// مكون الرسم البياني للنشاط الأسبوعي
export const WeeklyActivityChart: React.FC<ChartProps> = ({ projectsData = [], timeRange = 'أسبوع' }) => {
  const [data, setData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [trend, setTrend] = useState<{ updates: any, tasks: any, comments: any } | null>(null);
  
  const daysInArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  
  // جلب بيانات المهام
  const fetchTasksData = useCallback(async (projectIds: string[], startDate: Date) => {
    if (!projectIds.length) return [];
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('created_at')
        .in('project_id', projectIds)
        .gte('created_at', startDate.toISOString());
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching tasks data:', err);
      throw err;
    }
  }, []);
  
  // جلب بيانات المنشورات
  const fetchPostsData = useCallback(async (projectIds: string[], startDate: Date) => {
    if (!projectIds.length) return [];
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, created_at')
        .in('project_id', projectIds)
        .gte('created_at', startDate.toISOString());
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching posts data:', err);
      throw err;
    }
  }, []);
  
  // جلب بيانات التعليقات
  const fetchCommentsData = useCallback(async (postIds: string[], startDate: Date) => {
    if (!postIds.length) return [];
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('created_at')
        .in('post_id', postIds)
        .gte('created_at', startDate.toISOString());
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching comments data:', err);
      throw err;
    }
  }, []);
  
  // تجميع البيانات حسب اليوم
  const aggregateByDay = useCallback((items: any[], dateField: string, days: number, timeRange: string) => {
    const result: Record<string, { date: Date, count: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      result[dateKey] = { date, count: 0 };
    }
    items.forEach(item => {
      const itemDate = new Date(item[dateField]);
      itemDate.setHours(0, 0, 0, 0);
      const dateKey = itemDate.toISOString().split('T')[0];
      if (result[dateKey]) {
        result[dateKey].count += 1;
      }
    });
    return Object.entries(result).map(([dateKey, { date, count }]) => {
      const displayName = timeRange === 'أسبوع' 
        ? daysInArabic[date.getDay()]
        : date.toLocaleDateString('ar-SA');
      return { dateKey, displayName, count };
    });
  }, [daysInArabic]);
  
  // حساب الاتجاهات بناءً على البيانات
  const calculateTrends = useCallback((currentData: ActivityData[]) => {
    if (currentData.length < 2) return null;
    const halfLength = Math.floor(currentData.length / 2);
    const firstHalf = currentData.slice(0, halfLength);
    const secondHalf = currentData.slice(halfLength);
    const sumFirst = {
      updates: firstHalf.reduce((sum, item) => sum + item.تحديثات, 0),
      tasks: firstHalf.reduce((sum, item) => sum + item.مهام, 0),
      comments: firstHalf.reduce((sum, item) => sum + item.تعليقات, 0)
    };
    const sumSecond = {
      updates: secondHalf.reduce((sum, item) => sum + item.تحديثات, 0),
      tasks: secondHalf.reduce((sum, item) => sum + item.مهام, 0),
      comments: secondHalf.reduce((sum, item) => sum + item.تعليقات, 0)
    };
    return {
      updates: getTrend(sumSecond.updates, sumFirst.updates),
      tasks: getTrend(sumSecond.tasks, sumFirst.tasks),
      comments: getTrend(sumSecond.comments, sumFirst.comments)
    };
  }, []);
  
  useEffect(() => {
    const fetchActivityData = async () => {
      if (projectsData.length === 0) {
        setIsLoading(false);
        setData([]);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const startDate = new Date();
        let days = 7;
        switch (selectedTimeRange) {
          case 'أسبوع':
            startDate.setDate(startDate.getDate() - 6);
            days = 7;
            break;
          case 'شهر':
            startDate.setDate(startDate.getDate() - 29);
            days = 30;
            break;
          case '3 أشهر':
            startDate.setMonth(startDate.getMonth() - 3);
            days = 90;
            break;
          case 'سنة':
            startDate.setFullYear(startDate.getFullYear() - 1);
            days = 365;
            break;
          default:
            startDate.setDate(startDate.getDate() - 6);
            days = 7;
        }
        const projectIds = projectsData.map(project => project.id);
        const [tasksData, postsData] = await Promise.all([
          fetchTasksData(projectIds, startDate),
          fetchPostsData(projectIds, startDate)
        ]);
        const postIds = postsData.map(post => post.id);
        const commentsData = postIds.length > 0 
          ? await fetchCommentsData(postIds, startDate) 
          : [];
        const tasksByDay = aggregateByDay(tasksData, 'created_at', days, selectedTimeRange);
        const postsByDay = aggregateByDay(postsData, 'created_at', days, selectedTimeRange);
        const commentsByDay = aggregateByDay(commentsData, 'created_at', days, selectedTimeRange);
        const mergedData: Record<string, ActivityData> = {};
        const allDateKeys = new Set([
          ...tasksByDay.map(item => item.dateKey),
          ...postsByDay.map(item => item.dateKey),
          ...commentsByDay.map(item => item.dateKey)
        ]);
        allDateKeys.forEach(dateKey => {
          const taskItem = tasksByDay.find(item => item.dateKey === dateKey);
          const postItem = postsByDay.find(item => item.dateKey === dateKey);
          const commentItem = commentsByDay.find(item => item.dateKey === dateKey);
          mergedData[dateKey] = {
            name: taskItem?.displayName || postItem?.displayName || commentItem?.displayName || dateKey,
            تحديثات: postItem?.count || 0,
            مهام: taskItem?.count || 0,
            تعليقات: commentItem?.count || 0,
            dateKey: dateKey
          };
        });
        let result = Object.values(mergedData);
        if (selectedTimeRange === 'أسبوع') {
          result = result.sort((a, b) => {
            const dayIndexA = daysInArabic.indexOf(a.name);
            const dayIndexB = daysInArabic.indexOf(b.name);
            return dayIndexA - dayIndexB;
          });
        } else {
          result = result.sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());
        }
        setData(result);
        const trends = calculateTrends(result);
        setTrend(trends);
      } catch (err) {
        console.error('Error fetching activity data:', err);
        setError('حدث خطأ أثناء تحميل بيانات النشاط');
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivityData();
  }, [projectsData, selectedTimeRange, fetchTasksData, fetchPostsData, fetchCommentsData, aggregateByDay, calculateTrends, daysInArabic]);
  
  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
  };
  
  const totals = useMemo(() => {
    return {
      updates: data.reduce((sum, item) => sum + item.تحديثات, 0),
      tasks: data.reduce((sum, item) => sum + item.مهام, 0),
      comments: data.reduce((sum, item) => sum + item.تعليقات, 0)
    };
  }, [data]);
  
  const renderStatCard = (title: string, value: number, trend: any, color: string) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <div className="text-sm text-gray-500 font-medium mb-1">{title}</div>
      <div className="text-xl font-semibold mb-1">{value}</div>
      {trend && (
        <div className={`flex items-center text-xs font-medium ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend.icon}
          <span className="ml-1">
            {trend.percentage}% {trend.positive ? 'زيادة' : 'نقصان'}
          </span>
        </div>
      )}
    </div>
  );
  
  if (isLoading) {
    return (
      <Card title="نشاط المشاريع">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="h-8 w-8" />
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card title="نشاط المشاريع">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
          {error}
        </div>
      </Card>
    );
  }
  
  if (data.length === 0) {
    return (
      <Card title="نشاط المشاريع">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Activity size={40} className="text-gray-300 mb-4" />
          <p className="text-center">لا توجد بيانات نشاط متاحة</p>
          <p className="text-center text-sm text-gray-400 mt-2">جرب تحديد فترة زمنية أخرى أو إضافة مشاريع</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card title="نشاط المشاريع">
      <TimeRangeSelector timeRange={selectedTimeRange} onChange={handleTimeRangeChange} />
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        {renderStatCard("التحديثات", totals.updates, trend?.updates, "#4F46E5")}
        {renderStatCard("المهام", totals.tasks, trend?.tasks, "#10B981")}
        {renderStatCard("التعليقات", totals.comments, trend?.comments, "#F59E0B")}
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUpdates" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickMargin={10} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)', border: 'none' }} 
            />
            <Legend wrapperStyle={{ paddingTop: 15 }} iconType="circle" />
            <Area 
              type="monotone" 
              dataKey="تحديثات" 
              name="التحديثات"
              stroke="#4F46E5" 
              fillOpacity={1} 
              fill="url(#colorUpdates)" 
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
            <Area 
              type="monotone" 
              dataKey="مهام" 
              name="المهام"
              stroke="#10B981" 
              fillOpacity={1} 
              fill="url(#colorTasks)" 
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
            <Area 
              type="monotone" 
              dataKey="تعليقات" 
              name="التعليقات"
              stroke="#F59E0B" 
              fillOpacity={1} 
              fill="url(#colorComments)" 
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// مكون رسم بياني لحالة توزيع المهام
export const TaskStatusChart: React.FC<ChartProps> = ({ projectsData = [] }) => {
  const [data, setData] = useState<TaskStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTasks, setTotalTasks] = useState(0);
  
  // جلب بيانات المهام مع الحالة
  const fetchTasksData = useCallback(async (projectIds: string[]) => {
    if (!projectIds.length) return [];
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('status')
        .in('project_id', projectIds);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching tasks data:', err);
      throw err;
    }
  }, []);
  
  // تجميع بيانات المهام حسب الحالة
  const aggregateByStatus = useCallback((tasks: any[]) => {
    const counts: Record<string, number> = {
      'completed': 0,
      'in_progress': 0,
      'delayed': 0,
      'not_started': 0
    };
    tasks.forEach(task => {
      if (counts[task.status] !== undefined) {
        counts[task.status] += 1;
      }
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: statusTranslations[status as keyof typeof statusTranslations],
      value: count,
      color: taskStatusColors[status as keyof typeof taskStatusColors]
    }));
  }, []);
  
  useEffect(() => {
    const fetchTaskStatusData = async () => {
      if (projectsData.length === 0) {
        setIsLoading(false);
        setData([]);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const projectIds = projectsData.map(project => project.id);
        const tasksData = await fetchTasksData(projectIds);
        const statusData = aggregateByStatus(tasksData);
        const total = statusData.reduce((sum, item) => sum + item.value, 0);
        setTotalTasks(total);
        const filteredData = statusData.filter(item => item.value > 0);
        setData(filteredData.length > 0 ? filteredData : statusData);
      } catch (err) {
        console.error('Error fetching task status data:', err);
        setError('حدث خطأ أثناء تحميل بيانات حالة المهام');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTaskStatusData();
  }, [projectsData, fetchTasksData, aggregateByStatus]);
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.15;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text 
        x={x} 
        y={y} 
        fill={data[index].color}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${data[index].name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };
  
  const renderStats = () => {
    return (
      <div className="grid grid-cols-2 gap-4 mt-6">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
            <div className="flex-1">
              <div className="text-sm font-medium">{item.name}</div>
              <div className="flex items-center">
                <span className="font-semibold">{item.value}</span>
                <span className="text-xs text-gray-500 ml-1">({((item.value / totalTasks) * 100).toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <Card title="توزيع حالات المهام">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="h-8 w-8" />
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card title="توزيع حالات المهام">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
          {error}
        </div>
      </Card>
    );
  }
  
  if (data.every(item => item.value === 0)) {
    return (
      <Card title="توزيع حالات المهام">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Filter size={40} className="text-gray-300 mb-4" />
          <p className="text-center">لا توجد مهام متاحة</p>
          <p className="text-center text-sm text-gray-400 mt-2">أضف مهام إلى مشاريعك لتظهر هنا</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card title="توزيع حالات المهام">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-1/2">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={100}
                innerRadius={60}
                paddingAngle={5}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={renderCustomizedLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} (${((Number(value) / totalTasks) * 100).toFixed(0)}%)`, name]}
                contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)', border: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 flex items-center">
          {renderStats()}
        </div>
      </div>
      
      <div className="mt-6">
        <div className="text-sm font-medium mb-2">نسبة اكتمال المهام</div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          {data.map((item, index) => {
            const percentage = (item.value / totalTasks) * 100;
            const prevPercentages = data
              .slice(0, index)
              .reduce((sum, curr) => sum + (curr.value / totalTasks) * 100, 0);
            return (
              <div 
                key={index}
                className="h-full relative float-left rounded-l-full"
                style={{ 
                  width: `${percentage}%`, 
                  backgroundColor: item.color,
                  marginLeft: index === 0 ? '0' : 'auto',
                  borderTopRightRadius: index === data.length - 1 ? '0.25rem' : '0',
                  borderBottomRightRadius: index === data.length - 1 ? '0.25rem' : '0',
                  left: `${prevPercentages}%`
                }}
              ></div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

// مكون مقارنة المشاريع
export const ProjectsComparisonChart: React.FC<ChartProps> = ({ projectsData = [] }) => {
  const [data, setData] = useState<ProjectComparisonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'bar' | 'comparative'>('bar');
  
  // جلب بيانات المهام الخاصة بمشروع معين
  const fetchProjectTasksData = useCallback(async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(`Error fetching tasks for project ${projectId}:`, err);
      throw err;
    }
  }, []);
  
  // جلب عدد التعليقات الخاصة بمشروع معين
  const fetchProjectCommentsData = useCallback(async (projectId: string) => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .eq('project_id', projectId);
      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) {
        return 0;
      }
      const postIds = postsData.map(post => post.id);
      const { count, error: commentsError } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .in('post_id', postIds);
      if (commentsError) throw commentsError;
      return count || 0;
    } catch (err) {
      console.error(`Error fetching comments for project ${projectId}:`, err);
      throw err;
    }
  }, []);
  
  useEffect(() => {
    const fetchProjectComparisonData = async () => {
      if (projectsData.length === 0) {
        setIsLoading(false);
        setData([]);
        return;
      }
      if (projectsData.length > 5) {
        setIsLoading(false);
        setError('يرجى تحديد 5 مشاريع أو أقل للمقارنة');
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const categories = [
          { name: 'نسبة الإكمال', key: 'completion' },
          { name: 'المهام المكتملة', key: 'completed_tasks' },
          { name: 'التعليقات', key: 'comments' }
        ];
        const comparisonData = categories.map(category => {
          const item: ProjectComparisonData = { name: category.name };
          return item;
        });
        const projectDataPromises = projectsData.map(async (project) => {
          try {
            const [tasksData, commentsCount] = await Promise.all([
              fetchProjectTasksData(project.id),
              fetchProjectCommentsData(project.id)
            ]);
            const totalTasks = tasksData.length;
            const completedTasks = tasksData.filter(task => task.status === 'completed').length;
            const completionPercentage = totalTasks > 0 
              ? Math.round((completedTasks / totalTasks) * 100) 
              : 0;
            return {
              projectName: project.name,
              completionPercentage,
              completedTasks,
              commentsCount
            };
          } catch (err) {
            console.error(`Error processing data for project ${project.id}:`, err);
            throw err;
          }
        });
        const projectsResults = await Promise.all(projectDataPromises);
        projectsResults.forEach(result => {
          comparisonData[0][result.projectName] = result.completionPercentage;
          comparisonData[1][result.projectName] = result.completedTasks;
          comparisonData[2][result.projectName] = result.commentsCount;
        });
        setData(comparisonData);
      } catch (err) {
        console.error('Error fetching project comparison data:', err);
        setError('حدث خطأ أثناء تحميل بيانات مقارنة المشاريع');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjectComparisonData();
  }, [projectsData, fetchProjectTasksData, fetchProjectCommentsData]);
  
  const barChartData = useMemo(() => {
    if (!data.length || !projectsData.length) return [];
    return projectsData.map(project => {
      const projectData: Record<string, any> = { name: project.name };
      data.forEach(category => {
        projectData[category.name] = category[project.name] || 0;
      });
      return projectData;
    });
  }, [data, projectsData]);
  
  const getBarColors = useMemo(() => {
    return [
      { name: 'نسبة الإكمال', color: chartColors.primary },
      { name: 'المهام المكتملة', color: chartColors.secondary },
      { name: 'التعليقات', color: chartColors.tertiary }
    ];
  }, []);
  
  const toggleChartView = () => {
    setChartView(prev => prev === 'bar' ? 'comparative' : 'bar');
  };
  
  if (isLoading) {
    return (
      <Card title="مقارنة المشاريع النشطة">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="h-8 w-8" />
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card title="مقارنة المشاريع النشطة">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
          {error}
        </div>
      </Card>
    );
  }
  
  if (projectsData.length === 0) {
    return (
      <Card title="مقارنة المشاريع النشطة">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Activity size={40} className="text-gray-300 mb-4" />
          <p className="text-center">لا توجد مشاريع كافية للمقارنة</p>
          <p className="text-center text-sm text-gray-400 mt-2">أضف مشاريع للمقارنة</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card title="مقارنة المشاريع النشطة">
      <div className="flex justify-end mb-4">
        <Button 
          size="small"
          onClick={toggleChartView}
          className="text-xs"
        >
          {chartView === 'bar' ? 'عرض المقارنة المباشرة' : 'عرض الرسم البياني'}
        </Button>
      </div>
      
      {chartView === 'comparative' ? (
        <div className="space-y-6">
          {data.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-6">
              <h5 className="font-medium mb-3">{category.name}</h5>
              <div className="space-y-3">
                {projectsData.map((project, projectIndex) => {
                  const value = category[project.name] || 0;
                  const maxValue = Math.max(...projectsData.map(p => Number(category[p.name] || 0)));
                  const percentage = maxValue > 0 
                    ? (category.name === 'نسبة الإكمال' ? value : (value / maxValue) * 100)
                    : 0;
                  return (
                    <div key={projectIndex} className="flex items-center">
                      <span className="w-28 text-sm font-medium text-gray-700">{project.name}</span>
                      <div className="flex-grow bg-gray-200 h-6 rounded-full overflow-hidden mr-2 relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full rounded-full" 
                          style={{ backgroundColor: getBarColors[categoryIndex].color }}
                        >
                          <span className="absolute right-2 text-xs font-medium text-white leading-6">
                            {category.name === 'نسبة الإكمال' ? `${value}%` : value}
                          </span>
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={barChartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)', border: 'none' }}
              />
              <Legend />
              {data.map((category, index) => (
                <Bar 
                  key={index}
                  dataKey={category.name} 
                  fill={getBarColors[index].color}
                  radius={[0, 4, 4, 0]}
                >
                  {barChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColors[index % getBarColors.length].color} 
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

// المكون الرئيسي الذي يدمج جميع الرسوم البيانية
const AnalyticsDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('أسبوع');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">لوحة التحليلات</h1>
          <p className="text-gray-600">تتبع وتحليل البيانات من مشاريعك</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <WeeklyActivityChart projectsData={projects} timeRange={selectedTimeRange} />
          <TaskStatusChart projectsData={projects} />
        </div>
        
        <div className="mb-6">
          <ProjectsComparisonChart projectsData={projects} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
