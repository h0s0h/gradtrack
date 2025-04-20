// components/analytics/WeeklyActivityChart.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Activity, RefreshCcw, Download, Filter, AlertCircle, User, Users, Globe, Phone } from 'lucide-react';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';
import Button from './Button';
import TimeRangeSelector from './TimeRangeSelector';
import { supabase } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_id: string;
  completion_percentage?: number;
}

interface ChartProps {
  projectsData?: Project[];
  timeRange?: string;
  refreshInterval?: number; // بالملي ثانية، افتراضيًا لا يوجد تحديث تلقائي
  onDataLoaded?: (data: ActivityData[]) => void;
}

interface ActivityData {
  name: string;
  تحديثات: number;
  مهام: number;
  تعليقات: number;
  dateKey?: string;
}

interface TrendData {
  title: string;
  value: string;
  trend: boolean;
  color: string;
  icon: React.ReactElement;
  percentage?: string;
  positive?: boolean;
  change?: number;
}

// Demographics data interfaces
interface DemographicData {
  name: string;
  value: number;
  percentage?: number;
}

interface BrowserData {
  name: string;
  value: number;
  percentage?: number;
}

interface NetworkData {
  name: string;
  value: number;
  percentage?: number;
}

interface DeviceData {
  name: string;
  value: number;
  percentage?: number;
}

interface UserEngagementData {
  date: string;
  new: number;
  returning: number;
}

// Add comparison interface
interface ProjectComparisonData {
  name: string;
  tasks: number;
  updates: number;
  comments: number;
  progress: number;
  totalActivity: number;
}

// دالة لحساب الاتجاه (Trend) بشكل أكثر دقة
const getTrend = (currentValue: number, previousValue: number): TrendData | null => {
  if (previousValue === 0) {
    if (currentValue === 0) return null;
    // تعامل خاص عندما تكون القيمة السابقة صفر
    return {
      title: "",
      value: "",
      trend: true,
      color: "text-emerald-500",
      icon: <TrendingUp size={16} className="text-emerald-500" />,
      percentage: "100",
      positive: true,
      change: currentValue
    };
  }

  const difference = currentValue - previousValue;
  const percentageChange = (difference / previousValue) * 100;

  if (percentageChange > 0) {
    return {
      title: "",
      value: "",
      trend: true,
      color: "text-emerald-500",
      icon: <TrendingUp size={16} className="text-emerald-500" />,
      percentage: percentageChange.toFixed(1),
      positive: true,
      change: difference
    };
  } else if (percentageChange < 0) {
    return {
      title: "",
      value: "",
      trend: false,
      color: "text-red-500",
      icon: <TrendingDown size={16} className="text-red-500" />,
      percentage: Math.abs(percentageChange).toFixed(1),
      positive: false,
      change: difference
    };
  }

  return null; // لا تغيير
};

const WeeklyActivityChart: React.FC<ChartProps> = ({
  projectsData = [],
  timeRange = 'أسبوع',
  refreshInterval = 0,
  onDataLoaded
}) => {
  const [data, setData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [refreshKey, setRefreshKey] = useState(0);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const refreshTimerRef = useRef<number | null>(null);
  const wasLoading = useRef(isLoading);

  // إحصائيات إجمالية
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [totalComments, setTotalComments] = useState(0);

  // Add new state for demographic data
  const [ageGroupData, setAgeGroupData] = useState<DemographicData[]>([]);
  const [genderData, setGenderData] = useState<DemographicData[]>([]);
  const [browserData, setBrowserData] = useState<BrowserData[]>([]);
  const [networkData, setNetworkData] = useState<NetworkData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [userEngagement, setUserEngagement] = useState<UserEngagementData[]>([]);

  // Add project comparison state
  const [projectComparison, setProjectComparison] = useState<ProjectComparisonData[]>([]);

  // استخراج تواريخ البداية والنهاية بناءً على النطاق الزمني المحدد
  const getDateRange = useCallback(() => {
    const endDate = new Date();
    const startDate = new Date();

    switch (selectedTimeRange) {
      case 'أسبوع':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'شهر':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3 أشهر':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'سنة':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return { startDate, endDate };
  }, [selectedTimeRange]);

  // دالة لتحويل التاريخ إلى مفتاح - تم تحديثها لاستخدام التقويم الميلادي
  const formatDateKey = useCallback((date: Date): string => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    switch (selectedTimeRange) {
      case 'أسبوع':
        // بتنسيق اليوم والشهر (مثل "1 Jan")
        return `${date.getDate()} ${months[date.getMonth()]}`;
      case 'شهر':
        // بتنسيق اليوم (مثل "1")
        return `${date.getDate()}`;
      case '3 أشهر':
        // بتنسيق اليوم والشهر (مثل "1 Jan")
        return `${date.getDate()} ${months[date.getMonth()]}`;
      case 'سنة':
        // بتنسيق الشهر (مثل "Jan")
        return months[date.getMonth()];
      default:
        return `${date.getDate()} ${months[date.getMonth()]}`;
    }
  }, [selectedTimeRange]);

  // دالة لتوليد مصفوفة من التواريخ بين تاريخين
  const generateDateRange = useCallback((start: Date, end: Date): Date[] => {
    const dates: Date[] = [];
    const current = new Date(start);

    // تحديد الفاصل الزمني بناءً على النطاق الزمني المحدد
    let interval: 'day' | 'week' | 'month' = 'day';
    let skipDays = 1;

    switch (selectedTimeRange) {
      case 'أسبوع':
        interval = 'day';
        skipDays = 1;
        break;
      case 'شهر':
        interval = 'day';
        skipDays = 1;
        break;
      case '3 أشهر':
        interval = 'week';
        skipDays = 7;
        break;
      case 'سنة':
        interval = 'month';
        skipDays = 30;
        break;
    }

    while (current <= end) {
      dates.push(new Date(current));

      if (interval === 'day') {
        current.setDate(current.getDate() + skipDays);
      } else if (interval === 'week') {
        current.setDate(current.getDate() + skipDays);
      } else if (interval === 'month') {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return dates;
  }, [selectedTimeRange]);

  // دالة لجلب بيانات النشاط للمشاريع
  const fetchActivityData = useCallback(async () => {
    if (projectsData.length === 0) {
      setIsLoading(false);
      setData([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange();
      const dateRange = generateDateRange(startDate, endDate);

      // توليد هيكل البيانات المبدئي
      const initialData = dateRange.map(date => ({
        name: formatDateKey(date),
        تحديثات: 0,
        مهام: 0,
        تعليقات: 0,
        dateKey: date.toISOString().split('T')[0]
      }));

      const projectIds = projectsData.map(project => project.id);

      // جلب بيانات المهام
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('created_at, updated_at')
        .in('project_id', projectIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (tasksError) throw tasksError;

      // جلب بيانات المنشورات
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('created_at, updated_at, id')
        .in('project_id', projectIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (postsError) throw postsError;

      // جلب بيانات التعليقات
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('created_at, post_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (commentsError) throw commentsError;

      // فلترة التعليقات للمشاريع المحددة (نحتاج للتحقق من أن التعليق ينتمي لمنشور في أحد المشاريع المحددة)
      const filteredComments = commentsData?.filter(comment => {
        const postId = comment.post_id;
        return postsData?.some(post => post.id === postId);
      }) || [];

      // تجميع البيانات حسب التاريخ
      const tasksByDate: Record<string, number> = {};
      const updatesByDate: Record<string, number> = {};
      const commentsByDate: Record<string, number> = {};

      // تجميع المهام حسب تاريخ الإنشاء
      tasksData?.forEach(task => {
        const dateKey = task.created_at.split('T')[0];
        tasksByDate[dateKey] = (tasksByDate[dateKey] || 0) + 1;
      });

      // تجميع التحديثات حسب تاريخ التحديث
      postsData?.forEach(post => {
        const dateKey = post.created_at.split('T')[0];
        updatesByDate[dateKey] = (updatesByDate[dateKey] || 0) + 1;
      });

      // تجميع التعليقات حسب تاريخ الإنشاء
      filteredComments?.forEach(comment => {
        const dateKey = comment.created_at.split('T')[0];
        commentsByDate[dateKey] = (commentsByDate[dateKey] || 0) + 1;
      });

      // دمج البيانات المجمعة مع البيانات المبدئية
      const mergedData = initialData.map(item => ({
        ...item,
        تحديثات: updatesByDate[item.dateKey as string] || 0,
        مهام: tasksByDate[item.dateKey as string] || 0,
        تعليقات: commentsByDate[item.dateKey as string] || 0
      }));

      // حساب المجاميع الكلية
      const totTasks = mergedData.reduce((sum, item) => sum + item.مهام, 0);
      const totUpdates = mergedData.reduce((sum, item) => sum + item.تحديثات, 0);
      const totComments = mergedData.reduce((sum, item) => sum + item.تعليقات, 0);

      setTotalTasks(totTasks);
      setTotalUpdates(totUpdates);
      setTotalComments(totComments);

      // تنسيق البيانات للرسم البياني
      setData(mergedData);

      // استدعاء دالة callback إذا تم توفيرها
      if (onDataLoaded) {
        onDataLoaded(mergedData);
      }
    } catch (err) {
      console.error('Error fetching activity data:', err);
      setError('حدث خطأ أثناء تحميل بيانات النشاط');
    } finally {
      setIsLoading(false);
    }
  }, [projectsData, getDateRange, generateDateRange, formatDateKey, onDataLoaded]);

  // Add mock demographic data function
  const fetchDemographicData = useCallback(async () => {
    try {
      // Simulate fetching age groups data
      const mockAgeGroups: DemographicData[] = [
        { name: '18 to 28', value: 250, percentage: 45 },
        { name: '29 to 45', value: 180, percentage: 32 },
        { name: 'less than 18', value: 60, percentage: 11 },
        { name: 'More Than 45', value: 70, percentage: 12 },
      ];
      setAgeGroupData(mockAgeGroups);

      // Simulate fetching gender data
      const mockGenderData: DemographicData[] = [
        { name: 'Male', value: 320, percentage: 68.41 },
        { name: 'Female', value: 148, percentage: 31.59 },
      ];
      setGenderData(mockGenderData);

      // Simulate fetching browser data
      const mockBrowserData: BrowserData[] = [
        { name: 'Chrome', value: 156, percentage: 28 },
        { name: 'Firefox', value: 94, percentage: 16.8 },
        { name: 'Safari', value: 124, percentage: 22.1 },
        { name: 'Edge', value: 68, percentage: 12.1 },
        { name: 'Opera', value: 45, percentage: 8 },
        { name: 'Android WebView', value: 76, percentage: 13 },
      ];
      setBrowserData(mockBrowserData);

      // Simulate fetching network provider data
      const mockNetworkData: NetworkData[] = [
        { name: 'Vodafone', value: 152, percentage: 27.44 },
        { name: 'Orange', value: 134, percentage: 24.19 },
        { name: 'Etisalat', value: 103, percentage: 18.6 },
        { name: 'WE', value: 87, percentage: 15.7 },
        { name: 'others', value: 78, percentage: 14.07 },
      ];
      setNetworkData(mockNetworkData);

      // Simulate fetching device brand data
      const mockDeviceData: DeviceData[] = [
        { name: 'Apple', value: 124, percentage: 22.38 },
        { name: 'Samsung', value: 98, percentage: 17.7 },
        { name: 'Oppo', value: 84, percentage: 15.16 },
        { name: 'Xiaomi', value: 76, percentage: 13.72 },
        { name: 'realme', value: 65, percentage: 11.74 },
        { name: 'Huawei', value: 54, percentage: 9.75 },
        { name: 'Infinix', value: 28, percentage: 5.05 },
        { name: 'Honor', value: 12, percentage: 2.17 },
        { name: 'Poco', value: 8, percentage: 1.44 },
        { name: 'Vivo', value: 5, percentage: 0.9 },
      ];
      setDeviceData(mockDeviceData);

      // Simulate fetching user engagement data
      const mockUserEngagement: UserEngagementData[] = [
        { date: '08-06', new: 10, returning: 5 },
        { date: '08-07', new: 15, returning: 9 },
        { date: '08-08', new: 25, returning: 12 },
        { date: '08-09', new: 18, returning: 14 },
        { date: '08-10', new: 22, returning: 16 },
        { date: '08-11', new: 12, returning: 10 },
        { date: '08-12', new: 14, returning: 11 },
      ];
      setUserEngagement(mockUserEngagement);

    } catch (err) {
      console.error('Error fetching demographic data:', err);
    }
  }, []);

  // Function to generate project comparison data from actual project data
  const generateProjectComparisonData = useCallback(async () => {
    if (projectsData.length === 0) return;

    try {
      const comparisonData: ProjectComparisonData[] = [];

      // Get project IDs
      const projectIds = projectsData.map(project => project.id);

      // For each project, get activity counts
      for (const project of projectsData) {
        // Get tasks count
        const { count: tasksCount, error: tasksError } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        if (tasksError) throw tasksError;

        // Get updates/posts count
        const { count: updatesCount, error: updatesError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        if (updatesError) throw updatesError;

        // Get comments count for this project's posts
        const { data: projectPosts, error: postsError } = await supabase
          .from('posts')
          .select('id')
          .eq('project_id', project.id);

        if (postsError) throw postsError;

        let commentsCount = 0;

        if (projectPosts && projectPosts.length > 0) {
          const postIds = projectPosts.map(post => post.id);

          const { count: comments, error: commentsError } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .in('post_id', postIds);

          if (commentsError) throw commentsError;

          commentsCount = comments || 0;
        }

        // ********** MODIFICATION: Use project's completion_percentage directly from database **********
        // Instead of calculating progress based on tasks completed
        const progress = project.completion_percentage || 0;

        // Calculate total activity
        const totalActivity = (tasksCount || 0) + (updatesCount || 0) + commentsCount;

        comparisonData.push({
          name: project.name,
          tasks: tasksCount || 0,
          updates: updatesCount || 0,
          comments: commentsCount,
          progress: progress,
          totalActivity: totalActivity
        });
      }

      // Sort by total activity descending
      comparisonData.sort((a, b) => b.totalActivity - a.totalActivity);

      setProjectComparison(comparisonData);

    } catch (error) {
      console.error('Error generating project comparison data:', error);
    }
  }, [projectsData]);

  useEffect(() => {
    // إنشاء مؤقت للتحديث التلقائي إذا تم تعيين فاصل زمني
    if (refreshInterval > 0) {
      refreshTimerRef.current = window.setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, refreshInterval);
    }

    return () => {
      // تنظيف المؤقت عند إزالة المكون
      if (refreshTimerRef.current !== null) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshInterval]);

  useEffect(() => {
    fetchActivityData();
    fetchDemographicData();
    generateProjectComparisonData();
  }, [fetchActivityData, fetchDemographicData, generateProjectComparisonData, refreshKey]);

  useEffect(() => {
    // تحديث wasLoading لاستخدامه في الرسومات المتحركة
    wasLoading.current = isLoading;
  }, [isLoading]);

  // حساب الاتجاهات (Trends)
  const trends = useMemo(() => {
    // التأكد من وجود بيانات كافية للمقارنة
    if (data.length < 2) return { tasks: null, updates: null, comments: null };

    // حساب قيم الفترة الحالية والفترة السابقة
    const halfLength = Math.ceil(data.length / 2);
    const currentPeriod = data.slice(halfLength);
    const previousPeriod = data.slice(0, halfLength);

    // حساب المجاميع للفترتين
    const currentTasks = currentPeriod.reduce((sum, item) => sum + item.مهام, 0);
    const previousTasks = previousPeriod.reduce((sum, item) => sum + item.مهام, 0);

    const currentUpdates = currentPeriod.reduce((sum, item) => sum + item.تحديثات, 0);
    const previousUpdates = previousPeriod.reduce((sum, item) => sum + item.تحديثات, 0);

    const currentComments = currentPeriod.reduce((sum, item) => sum + item.تعليقات, 0);
    const previousComments = previousPeriod.reduce((sum, item) => sum + item.تعليقات, 0);

    // حساب الاتجاهات باستخدام دالة getTrend
    return {
      tasks: getTrend(currentTasks, previousTasks),
      updates: getTrend(currentUpdates, previousUpdates),
      comments: getTrend(currentComments, previousComments)
    };
  }, [data]);

  // دالة لتحديث البيانات يدويًا
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // دالة لتغيير النطاق الزمني
  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
  };

  // دالة لتوليد ملف CSV للتصدير
  const generateCSV = () => {
    if (!data.length) return '';

    const headers = ['التاريخ', 'تحديثات', 'مهام', 'تعليقات'];
    const csvRows = [headers.join(',')];

    data.forEach(item => {
      const row = [
        item.name,
        item.تحديثات,
        item.مهام,
        item.تعليقات
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  // Generate colors for charts
  const GENDER_COLORS = ['#4e79a7', '#f28e2c'];
  const AGE_GROUP_COLORS = ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2'];
  const BROWSER_COLORS = ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949'];
  const NETWORK_COLORS = ['#e15759', '#af7aa1', '#59a14f', '#f28e2c', '#4e79a7'];
  const USER_ENGAGEMENT_COLORS = ['#4e79a7', '#f28e2c'];

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // تصميم بطاقة الإحصائيات مع تحسين المظهر
  const renderStatCard = (title: string, value: number, trendValue: TrendData | null, iconColor: string) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between h-full"
    >
      <div>
        <h3 className="text-gray-500 font-medium text-sm mb-1 flex items-center">
          {title}
        </h3>
        <div className="text-2xl font-bold text-gray-800">
          {value}
        </div>
      </div>

      {trendValue && (
        <div className={`mt-2 text-sm flex items-center ${trendValue.positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {trendValue.icon}
          <span className="ml-1">
            {trendValue.percentage}%
          </span>
          <span className="text-gray-500 text-xs ml-1">
            ({trendValue.positive ? '+' : ''}{trendValue.change}) من الفترة السابقة
          </span>
        </div>
      )}

      <div
        className={`w-full h-1 rounded-full mt-3 bg-gray-100 overflow-hidden`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((value / Math.max(totalTasks, totalUpdates, totalComments, 1)) * 100, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full ${iconColor}`}
        ></motion.div>
      </div>
    </motion.div>
  );

  // Custom tooltip for pie charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 shadow-md rounded-md border border-gray-200">
          <p className="font-semibold">{payload[0].name}</p>
          <p>Value: {payload[0].value}</p>
          <p>Percentage: {payload[0].payload.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // Customer age group chart
  const renderAgeGroupChart = () => (
    <Card
      title="Customer Age Groups"
      collapsible={false}
    >
      <div className="h-[300px] relative">
        {ageGroupData.length > 0 ? (
          <div className="flex h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ageGroupData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {ageGroupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AGE_GROUP_COLORS[index % AGE_GROUP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Users size={40} className="text-gray-300 mb-4" />
            <p className="text-center">No age group data available</p>
          </div>
        )}
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          Displayed customers: {ageGroupData.reduce((sum, item) => sum + item.value, 0)}
        </div>
      </div>
    </Card>
  );

  // Customer engagement chart
  const renderCustomerEngagementChart = () => (
    <Card
      title="Number Of Customers By Time"
      collapsible={false}
    >
      <div className="h-[300px]">
        {userEngagement.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={userEngagement}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4e79a7" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#4e79a7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReturning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f28e2c" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f28e2c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                formatter={(value) => [value, '']}
                labelFormatter={(label) => {
                  // Find the item with this date to show more detailed tooltip
                  const item = userEngagement.find(d => d.date === label);
                  if (item) {
                    return `${label}`;
                  }
                  return label;
                }}
              />
              <Legend iconType="circle" verticalAlign="top" height={36} />
              <Area
                type="monotone"
                dataKey="new"
                stroke="#4e79a7"
                fillOpacity={1}
                fill="url(#colorNew)"
                strokeWidth={2}
                activeDot={{ r: 6 }}
                name="new"
              />
              <Area
                type="monotone"
                dataKey="returning"
                stroke="#f28e2c"
                fillOpacity={1}
                fill="url(#colorReturning)"
                strokeWidth={2}
                activeDot={{ r: 6 }}
                name="returning"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <User size={40} className="text-gray-300 mb-4" />
            <p className="text-center">No customer engagement data available</p>
          </div>
        )}
        <div className="text-xs text-gray-500 text-right">
          Displayed customers: {userEngagement.reduce((sum, item) => sum + item.new + item.returning, 0)}
        </div>
      </div>
    </Card>
  );

  // Browser types chart
  const renderBrowserTypesChart = () => (
    <Card
      title="Browser Types and Versions"
      collapsible={false}
    >
      <div className="h-[300px]">
        {browserData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={browserData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={1}
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
              >
                {browserData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BROWSER_COLORS[index % BROWSER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                Android WebView
              </text>
              <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="text-xs">
                28.15%
              </text>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Globe size={40} className="text-gray-300 mb-4" />
            <p className="text-center">No browser data available</p>
          </div>
        )}
      </div>
    </Card>
  );

  // Gender distribution chart
  const renderGenderChart = () => (
    <Card
      title="Gender"
      collapsible={false}
    >
      <div className="h-[300px]">
        {genderData.length > 0 ? (
          <div className="flex h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={0}
                  dataKey="value"
                  labelLine={false}
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  formatter={(value, entry, index) => (
                    <span className="text-gray-700">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Users size={40} className="text-gray-300 mb-4" />
            <p className="text-center">No gender data available</p>
          </div>
        )}
      </div>
    </Card>
  );

  // Network Provider chart
  const renderNetworkProviderChart = () => (
    <Card
      title="Network Provider"
      collapsible={false}
    >
      <div className="h-[300px]">
        {networkData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={networkData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={1}
                dataKey="value"
                labelLine={false}
              >
                {networkData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={NETWORK_COLORS[index % NETWORK_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                formatter={(value, entry, index) => (
                  <span className="text-gray-700">{value}</span>
                )}
              />
              <Tooltip content={<CustomTooltip />} />
              <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="font-medium">
                Orange
              </text>
              <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-xs">
                Value: 152
              </text>
              <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="text-xs">
                Percentage: 27.44%
              </text>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Phone size={40} className="text-gray-300 mb-4" />
            <p className="text-center">No network provider data available</p>
          </div>
        )}
      </div>
    </Card>
  );

  // Device brands chart 
  const renderDeviceBrandsChart = () => (
    <Card
      title="Device Brands"
      collapsible={false}
    >
      <div className="h-[300px]">
        {deviceData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={deviceData.slice(0, 10)} // Show top 10 device brands
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip
                contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                formatter={(value, name, props) => {
                  const item = props.payload;
                  return [`${value} (${item.percentage}%)`, 'Value'];
                }}
              />
              <Bar dataKey="value" fill="#4e79a7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Phone size={40} className="text-gray-300 mb-4" />
            <p className="text-center">No device brand data available</p>
          </div>
        )}
      </div>
    </Card>
  );

  // Render project comparison charts
  const renderProjectComparisonChart = () => (
    <Card
      title="مقارنة المشاريع النشطة"
      collapsible={false}
    >
      <div className="h-[500px]">
        {projectComparison.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={projectComparison}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip
                contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                formatter={(value, name) => {
                  return [value, name === 'progress' ? 'نسبة الإنجاز' : name === 'tasks' ? 'المهام' :
                    name === 'updates' ? 'التحديثات' : 'التعليقات'];
                }}
                labelFormatter={(label) => `المشروع: ${label}`}
              />
              <Legend />
              <Bar dataKey="tasks" name="المهام" stackId="a" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="updates" name="التحديثات" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comments" name="التعليقات" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Activity size={40} className="text-gray-300 mb-4" />
            <p className="text-center">لا توجد مشاريع لإجراء المقارنة</p>
            <p className="text-center text-sm text-gray-400 mt-2">أضف المزيد من المشاريع للمقارنة بينها</p>
          </div>
        )}
      </div>
    </Card>
  );

  const renderProjectProgressChart = () => (
    <Card
      title="نسبة إنجاز المشاريع"
      collapsible={false}
    >
      <div className="h-[400px]">
        {projectComparison.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              يعرض هذا المخطط نسبة إنجاز كل مشروع كما تم تحديدها من قبل مالك المشروع
            </p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={projectComparison}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value}%`, 'نسبة الإنجاز']}
                  labelFormatter={(label) => `المشروع: ${label}`}
                />
                <Legend />
                <Bar dataKey="progress" name="نسبة الإنجاز" fill="#8884d8">
                  {projectComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.progress > 75 ? '#10B981' :
                      entry.progress > 50 ? '#F59E0B' : entry.progress > 25 ? '#F97316' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Activity size={40} className="text-gray-300 mb-4" />
            <p className="text-center">لا توجد مشاريع لعرض نسبة الإنجاز</p>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <Card
        title="نشاط المشروع على مدار الوقت"
        onExport={data.length > 0 ? () => {
          const csvContent = generateCSV();
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `نشاط-المشاريع-${selectedTimeRange}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } : undefined}
        collapsible={false}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
            <AlertCircle size={24} className="mx-auto mb-2" />
            <p>{error}</p>
            <Button onClick={handleRefresh} className="mt-3" size="small">
              إعادة المحاولة
            </Button>
          </div>
        ) : projectsData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Activity size={40} className="text-gray-300 mb-4" />
            <p className="text-center">لا توجد مشاريع لعرض نشاطها</p>
            <p className="text-center text-sm text-gray-400 mt-2">أضف مشاريع لعرض نشاطها هنا</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <TimeRangeSelector
                timeRange={selectedTimeRange}
                onChange={handleTimeRangeChange}
              />

              <div className="flex gap-2">
                <div className="flex rounded-lg p-0.5 bg-gray-100">
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${chartType === 'area'
                        ? 'bg-white shadow-sm text-indigo-700 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                    onClick={() => setChartType('area')}
                  >
                    المساحة
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${chartType === 'bar'
                        ? 'bg-white shadow-sm text-indigo-700 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                    onClick={() => setChartType('bar')}
                  >
                    الأعمدة
                  </button>
                </div>

                <button
                  onClick={handleRefresh}
                  className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 flex items-center gap-1"
                >
                  <RefreshCcw size={14} className="ml-1" />
                  تحديث
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {renderStatCard('المهام', totalTasks, trends.tasks, 'bg-indigo-500')}
              {renderStatCard('التحديثات', totalUpdates, trends.updates, 'bg-green-500')}
              {renderStatCard('التعليقات', totalComments, trends.comments, 'bg-amber-500')}
            </div>

            {data.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart
                      data={data}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorUpdates" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [value, '']}
                      />
                      <Legend iconType="circle" />
                      <Area
                        type="monotone"
                        dataKey="تحديثات"
                        stroke="#10B981"
                        fillOpacity={1}
                        fill="url(#colorUpdates)"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="مهام"
                        stroke="#4F46E5"
                        fillOpacity={1}
                        fill="url(#colorTasks)"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="تعليقات"
                        stroke="#F59E0B"
                        fillOpacity={1}
                        fill="url(#colorComments)"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={data}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [value, '']}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="تحديثات" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="مهام" stackId="a" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="تعليقات" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Filter size={40} className="text-gray-300 mb-4" />
                <p className="text-center">لا توجد بيانات نشاط للفترة المحددة</p>
                <p className="text-center text-sm text-gray-400 mt-2">جرب تغيير النطاق الزمني</p>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
              <span>تم التحديث: {new Date().toLocaleString('en-US')}</span>
              <button
                onClick={() => {
                  const csvContent = generateCSV();
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `نشاط-المشاريع-${selectedTimeRange}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Download size={14} className="ml-1" />
                تنزيل البيانات
              </button>
            </div>
          </>
        )}
      </Card>

      {/* قسم مقارنة المشاريع - عرض كامل */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* عمود المقارنة الرئيسي */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Activity className="ml-2" size={24} />
            مقارنة المشاريع النشطة
          </h2>
          <div className="h-[500px]">
            {projectComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectComparison}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => {
                      return [value, name === 'progress' ? 'نسبة الإنجاز' : name === 'tasks' ? 'المهام' :
                        name === 'updates' ? 'التحديثات' : 'التعليقات'];
                    }}
                    labelFormatter={(label) => `المشروع: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="tasks" name="المهام" stackId="a" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="updates" name="التحديثات" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comments" name="التعليقات" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Activity size={40} className="text-gray-300 mb-4" />
                <p className="text-center">لا توجد مشاريع لإجراء المقارنة</p>
                <p className="text-center text-sm text-gray-400 mt-2">أضف المزيد من المشاريع للمقارنة بينها</p>
              </div>
            )}
          </div>
        </div>

        {/* نسبة إنجاز المشاريع */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Activity className="ml-2" size={24} />
            نسبة إنجاز المشاريع
          </h2>
          <div className="h-[400px]">
            {projectComparison.length > 0 ? (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  يعرض هذا المخطط نسبة إنجاز كل مشروع كما تم تحديدها من قبل مالك المشروع
                </p>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart
                    data={projectComparison}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`${value}%`, 'نسبة الإنجاز']}
                      labelFormatter={(label) => `المشروع: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="progress" name="نسبة الإنجاز" fill="#8884d8">
                      {projectComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.progress > 75 ? '#10B981' :
                          entry.progress > 50 ? '#F59E0B' : entry.progress > 25 ? '#F97316' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Activity size={40} className="text-gray-300 mb-4" />
                <p className="text-center">لا توجد مشاريع لعرض نسبة الإنجاز</p>
              </div>
            )}
          </div>
        </div>

        {/* نشاط المشاريع حسب النوع */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Activity className="ml-2" size={24} />
            نشاط المشاريع حسب النوع
          </h2>
          <div className="h-[400px]">
            {projectComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'المهام', value: totalTasks, fill: '#4F46E5' },
                      { name: 'التحديثات', value: totalUpdates, fill: '#10B981' },
                      { name: 'التعليقات', value: totalComments, fill: '#F59E0B' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  />
                  <Tooltip
                    formatter={(value) => [value, 'العدد']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Activity size={40} className="text-gray-300 mb-4" />
                <p className="text-center">لا توجد بيانات للعرض</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyActivityChart;