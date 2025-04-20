// components/analytics/AnalyticsCharts.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import LoadingSpinner from './LoadingSpinner';

// Dynamic imports to avoid SSR issues with chart components
const WeeklyActivityChart = dynamic(() => import('./WeeklyActivityChart'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />
});

const TaskStatusChart = dynamic(() => import('./TaskStatusChart'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />
});

const ProjectsComparisonChart = dynamic(() => import('./ProjectsComparisonChart'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />
});

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_id: string;
  completion_percentage?: number;
}

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

// Export the components
export { 
  WeeklyActivityChart, 
  TaskStatusChart, 
  ProjectsComparisonChart 
};

// Re-export interfaces
export type { Project };
