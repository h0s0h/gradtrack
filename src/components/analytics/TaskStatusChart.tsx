// components/TaskStatusChart.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, PieChart as PieChartIcon, X, BarChart as BarChartIcon, Download, ChevronRight } from 'lucide-react';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';
import Button from './Button';
import { supabase } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_id: string;
}

interface ChartProps {
  projectsData?: Project[];
}

interface TaskStatusData {
  name: string;
  value: number;
  color: string;
  statusKey: string;
}

const taskStatusColors = {
  'completed': '#10B981',
  'in_progress': '#4F46E5',
  'delayed': '#F59E0B',
  'not_started': '#6B7280'
};

const statusTranslations = {
  'completed': 'مكتملة',
  'in_progress': 'قيد التنفيذ',
  'delayed': 'متأخرة',
  'not_started': 'لم تبدأ'
};

// مكون عرض التقرير التفصيلي
interface DetailedReportProps {
  data: TaskStatusData[];
  totalTasks: number;
  onClose: () => void;
  projectsData: Project[];
}

const DetailedReport: React.FC<DetailedReportProps> = ({ data, totalTasks, onClose, projectsData }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects'>('overview');
  
  // تحضير بيانات للمخطط الشريطي
  const barChartData = useMemo(() => {
    return projectsData.map(project => ({
      name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
      fullName: project.name,
      // هنا نفترض بيانات عشوائية للمهام - في التطبيق الحقيقي ستقوم بجلب البيانات الفعلية
      completed: Math.floor(Math.random() * 10),
      inProgress: Math.floor(Math.random() * 8),
      delayed: Math.floor(Math.random() * 5),
      notStarted: Math.floor(Math.random() * 7),
    }));
  }, [projectsData]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div 
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-90vh overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="flex justify-between items-center border-b p-5">
          <h3 className="text-xl font-bold text-gray-800">تقرير حالات المهام المفصّل</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="px-5 py-3 border-b bg-gray-50">
          <div className="flex space-x-4 rtl:space-x-reverse">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              نظرة عامة
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'projects' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('projects')}
            >
              حسب المشاريع
            </button>
          </div>
        </div>
        
        <div className="p-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {data.map(item => (
                    <div 
                      key={item.statusKey}
                      className="bg-white border rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <h4 className="font-medium text-gray-700">{item.name}</h4>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {Math.round((item.value / totalTasks) * 100)}% من المهام
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
                  <h4 className="font-medium text-gray-700 mb-4">توزيع حالات المهام</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} مهمة`, '']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <h4 className="font-medium text-gray-700 mb-2">ملاحظات وتوصيات</h4>
                  <ul className="space-y-2 text-gray-600">
                    {data.find(d => d.statusKey === 'delayed') && data.find(d => d.statusKey === 'delayed')!.value > 0 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight size={16} className="text-amber-500 mt-1 flex-shrink-0" />
                        <span>يوجد {data.find(d => d.statusKey === 'delayed')!.value} مهام متأخرة تحتاج إلى مراجعة.</span>
                      </li>
                    )}
                    {data.find(d => d.statusKey === 'not_started') && data.find(d => d.statusKey === 'not_started')!.value > 0 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight size={16} className="text-gray-500 mt-1 flex-shrink-0" />
                        <span>هناك {data.find(d => d.statusKey === 'not_started')!.value} مهام لم تبدأ بعد وتحتاج للجدولة.</span>
                      </li>
                    )}
                    {data.find(d => d.statusKey === 'completed') && (
                      <li className="flex items-start gap-2">
                        <ChevronRight size={16} className="text-green-500 mt-1 flex-shrink-0" />
                        <span>
                          {data.find(d => d.statusKey === 'completed')!.value > 0 
                            ? `تم إكمال ${data.find(d => d.statusKey === 'completed')!.value} مهام (${Math.round((data.find(d => d.statusKey === 'completed')!.value / totalTasks) * 100)}% من الإجمالي).`
                            : 'لم يتم إكمال أي مهام بعد.'
                          }
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
                  <h4 className="font-medium text-gray-700 mb-4">توزيع المهام حسب المشاريع</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barChartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 65 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => {
                            const labels = {
                              completed: 'مكتملة',
                              inProgress: 'قيد التنفيذ',
                              delayed: 'متأخرة',
                              notStarted: 'لم تبدأ'
                            };
                            return [value, labels[name as keyof typeof labels] || name];
                          }}
                          labelFormatter={(label, items) => {
                            const item = barChartData.find(d => d.name === label);
                            return item ? item.fullName : label;
                          }}
                        />
                        <Legend 
                          formatter={(value) => {
                            const labels = {
                              completed: 'مكتملة',
                              inProgress: 'قيد التنفيذ',
                              delayed: 'متأخرة',
                              notStarted: 'لم تبدأ'
                            };
                            return labels[value as keyof typeof labels] || value;
                          }}
                        />
                        <Bar dataKey="completed" fill={taskStatusColors.completed} />
                        <Bar dataKey="inProgress" fill={taskStatusColors.in_progress} />
                        <Bar dataKey="delayed" fill={taskStatusColors.delayed} />
                        <Bar dataKey="notStarted" fill={taskStatusColors.not_started} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-700">تفاصيل المشاريع والمهام</h4>
                    <Button 
                      size="small" 
                      icon={<Download size={14} />}
                    >
                      تصدير البيانات
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            اسم المشروع
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            مكتملة
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            قيد التنفيذ
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            متأخرة
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            لم تبدأ
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            المجموع
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {barChartData.map((project, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{project.fullName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {project.completed}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                {project.inProgress}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                                {project.delayed}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                {project.notStarted}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {project.completed + project.inProgress + project.delayed + project.notStarted}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <Button onClick={onClose}>إغلاق</Button>
        </div>
      </motion.div>
    </div>
  );
};

const TaskStatusChart: React.FC<ChartProps> = ({ projectsData = [] }) => {
  const [data, setData] = useState<TaskStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTasks, setTotalTasks] = useState(0);
  const [showDetailedReport, setShowDetailedReport] = useState(false);

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
      color: taskStatusColors[status as keyof typeof taskStatusColors],
      statusKey: status
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
        setData(statusData.filter(item => item.value > 0));
      } catch (err) {
        console.error('Error fetching task status data:', err);
        setError('حدث خطأ أثناء تحميل بيانات حالة المهام');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTaskStatusData();
  }, [projectsData, fetchTasksData, aggregateByStatus]);

  // دالة لعرض الإحصائيات بالتفصيل
  const renderStats = useMemo(() => {
    if (!data.length) return null;

    // ترتيب البيانات حسب القيمة (من الأعلى إلى الأدنى)
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    
    const getStatusIcon = (statusKey: string) => {
      switch(statusKey) {
        case 'completed':
          return <div className="w-3 h-3 rounded-full bg-green-500"></div>;
        case 'in_progress':
          return <div className="w-3 h-3 rounded-full bg-indigo-600"></div>;
        case 'delayed':
          return <div className="w-3 h-3 rounded-full bg-amber-500"></div>;
        case 'not_started':
          return <div className="w-3 h-3 rounded-full bg-gray-500"></div>;
        default:
          return <div className="w-3 h-3 rounded-full bg-gray-300"></div>;
      }
    };

    return (
      <div className="px-4 py-2">
        <div className="mb-4">
          <h5 className="text-lg font-medium text-gray-700 mb-1">إجمالي المهام</h5>
          <p className="text-3xl font-bold text-indigo-700">{totalTasks}</p>
        </div>
        
        <div className="space-y-4">
          {sortedData.map((item) => (
            <motion.div 
              key={item.statusKey}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(item.statusKey)}
                <span className="text-gray-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold" style={{ color: item.color }}>
                  {item.value}
                </span>
                <div className="text-sm text-gray-500">
                  {Math.round((item.value / totalTasks) * 100)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-100">
          <Button 
            size="small" 
            className="w-full justify-center" 
            icon={<PieChartIcon size={16} />}
            onClick={() => setShowDetailedReport(true)}
          >
            عرض تقرير مفصّل
          </Button>
        </div>
      </div>
    );
  }, [data, totalTasks]);

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

  if (data.length === 0 || data.every(item => item.value === 0)) {
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
    <>
      <Card title="توزيع حالات المهام">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  label
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} مهمة`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 flex items-center">
            {renderStats}
          </div>
        </div>
      </Card>

      {/* نافذة التقرير المفصل */}
      <AnimatePresence>
        {showDetailedReport && (
          <DetailedReport 
            data={data} 
            totalTasks={totalTasks} 
            onClose={() => setShowDetailedReport(false)}
            projectsData={projectsData}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default TaskStatusChart;