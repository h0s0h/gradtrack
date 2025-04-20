import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Types pour les tâches et les props du composant
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
  assigned_to: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  project_id: string;
  created_by: string;
  assignee?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface TasksTableProps {
  projectId?: string; // Si non fourni, affiche toutes les tâches de l'utilisateur
  limit?: number; // Nombre maximum de tâches à afficher
  showFilters?: boolean; // Afficher les filtres ou non
  showPagination?: boolean; // Afficher la pagination ou non
  className?: string; // Classes CSS supplémentaires
}

// Composant Button personnalisé pour éviter l'erreur d'importation
const Button = ({ children, primary, href, onClick, className = '', ...props }: {
  children: React.ReactNode;
  primary?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) => {
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

const TasksTable: React.FC<TasksTableProps> = ({
  projectId,
  limit = 10,
  showFilters = true,
  showPagination = true,
  className = '',
}) => {
  // États pour les tâches et les filtres
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les filtres
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Traduction des statuts en arabe
  const statusTranslations = {
    'not_started': 'لم تبدأ',
    'in_progress': 'قيد التنفيذ',
    'completed': 'مكتملة',
    'delayed': 'متأخرة'
  };
  
  // Traduction des priorités en arabe
  const priorityTranslations = {
    'low': 'منخفضة',
    'medium': 'متوسطة',
    'high': 'عالية'
  };
  
  // Couleurs pour les statuts
  const statusColors = {
    'not_started': 'bg-gray-100 text-gray-700',
    'in_progress': 'bg-blue-100 text-blue-700',
    'completed': 'bg-green-100 text-green-700',
    'delayed': 'bg-amber-100 text-amber-700'
  };
  
  // Couleurs pour les priorités
  const priorityColors = {
    'low': 'bg-gray-100 text-gray-700',
    'medium': 'bg-indigo-100 text-indigo-700',
    'high': 'bg-red-100 text-red-700'
  };

  // Effet pour charger les tâches depuis la base de données
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        let query = supabase
          .from('tasks')
          .select(`
            *,
            assignee:assigned_to(full_name, email, avatar_url)
          `);
        
        // Filtrer par projet si projectId est fourni
        if (projectId) {
          query = query.eq('project_id', projectId);
        }
        
        // Limiter le nombre de résultats
        query = query.order('created_at', { ascending: false }).limit(limit * currentPage);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setTasks(data || []);
        setTotalPages(Math.ceil((data?.length || 0) / limit));
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError('حدث خطأ أثناء تحميل المهام. يرجى المحاولة مرة أخرى.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [projectId, limit, currentPage]);

  // Effet pour filtrer les tâches selon les critères sélectionnés
  useEffect(() => {
    let result = Array.isArray(tasks) ? [...tasks] : [];
    
    // Filtrer par statut
    if (statusFilter) {
      result = result.filter(task => task.status === statusFilter);
    }
    
    // Filtrer par priorité
    if (priorityFilter) {
      result = result.filter(task => task.priority === priorityFilter);
    }
    
    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(query) || 
        (task.description && task.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredTasks(result);
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  // Fonction pour formater la date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  // Fonction pour obtenir les tâches de la page actuelle
  const getCurrentPageTasks = () => {
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredTasks.slice(startIndex, endIndex);
  };

  // Rendu du composant
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-800 mb-6">قائمة المهام</h3>
      
      {/* Filtres */}
      {showFilters && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Recherche */}
            <div className="flex-grow">
              <input
                type="text"
                placeholder="البحث عن مهمة..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Filtre par statut */}
            <div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
              >
                <option value="">جميع الحالات</option>
                <option value="not_started">لم تبدأ</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتملة</option>
                <option value="delayed">متأخرة</option>
              </select>
            </div>
            
            {/* Filtre par priorité */}
            <div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                value={priorityFilter || ''}
                onChange={(e) => setPriorityFilter(e.target.value || null)}
              >
                <option value="">جميع الأولويات</option>
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* État de chargement */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
          {error}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <p className="text-gray-600 mb-4">لا توجد مهام تطابق معايير البحث</p>
          {statusFilter || priorityFilter || searchQuery ? (
            <Button 
              onClick={() => {
                setStatusFilter(null);
                setPriorityFilter(null);
                setSearchQuery('');
              }}
            >
              إعادة ضبط الفلاتر
            </Button>
          ) : (
            <Button primary href={projectId ? `/project/${projectId}/tasks/new` : '/tasks/new'}>
              إنشاء مهمة جديدة
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Tableau des tâches */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    العنوان
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الأولوية
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المكلف
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الاستحقاق
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نسبة الإنجاز
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentPageTasks().map((task) => (
                  <motion.tr 
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{task.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[task.status]}`}>
                        {statusTranslations[task.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[task.priority]}`}>
                        {priorityTranslations[task.priority]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.assignee ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            {task.assignee.avatar_url ? (
                              <img className="h-8 w-8 rounded-full" src={task.assignee.avatar_url} alt="" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-indigo-600 font-semibold">
                                  {task.assignee.full_name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mr-3">
                            <div className="text-sm font-medium text-gray-900">
                              {task.assignee.full_name}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">غير مكلف</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(task.due_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            task.status === 'completed' ? 'bg-green-500' : 
                            task.status === 'delayed' ? 'bg-amber-500' : 'bg-blue-500'
                          }`} 
                          style={{ width: `${task.completion_percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block text-center">
                        {task.completion_percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <Button 
                        href={`/tasks/${task.id}`} 
                        className="text-indigo-600 hover:text-indigo-900 ml-2"
                      >
                        عرض
                      </Button>
                      <Button 
                        href={`/tasks/${task.id}/edit`} 
                        className="text-gray-600 hover:text-gray-900"
                      >
                        تعديل
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {showPagination && totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="flex items-center">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  السابق
                </button>
                
                <div className="mx-4 text-sm text-gray-700">
                  الصفحة {currentPage} من {totalPages}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  التالي
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TasksTable;
