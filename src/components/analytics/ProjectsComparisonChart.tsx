// components/ProjectsComparisonChart.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
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

interface ProjectComparisonData {
  name: string;
  [key: string]: string | number;
}

const chartColors = {
  primary: '#4F46E5',
  secondary: '#10B981',
  tertiary: '#F59E0B'
};

const ProjectsComparisonChart: React.FC<ChartProps> = ({ projectsData = [] }) => {
  const [data, setData] = useState<ProjectComparisonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'bar' | 'comparative'>('bar');

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
        const comparisonData = categories.map(category => ({ name: category.name }));
        const projectDataPromises = projectsData.map(async project => {
          const [tasksData, commentsCount] = await Promise.all([
            fetchProjectTasksData(project.id),
            fetchProjectCommentsData(project.id)
          ]);
          const totalTasks = tasksData.length;
          const completedTasks = tasksData.filter(task => task.status === 'completed').length;
          const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          return {
            projectName: project.name,
            completionPercentage,
            completedTasks,
            commentsCount
          };
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
        <Button size="small" onClick={toggleChartView} className="text-xs">
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
                  // حساب النسبة لتوضيح حالة المشروع
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
                          style={{ backgroundColor: chartColors.primary }}
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
              <Tooltip />
              <Legend />
              {data.map((category, index) => (
                <Bar key={index} dataKey={category.name} fill={chartColors.primary}>
                  {barChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={chartColors.primary} />
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

export default ProjectsComparisonChart;
