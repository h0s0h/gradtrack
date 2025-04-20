// components/Card.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';

interface CardProps {
  title: string;
  className?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  onExport?: () => void;
  initiallyCollapsed?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  title, 
  className = '',
  collapsible = false,
  onExport,
  initiallyCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);

  return (
    <motion.div 
      className={`bg-white p-6 rounded-lg shadow-md overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
        <div className="flex space-x-2 rtl:space-x-reverse">
          {onExport && (
            <button 
              className="text-gray-500 hover:text-indigo-600 transition-colors p-1.5 rounded-full hover:bg-gray-100"
              title="تصدير البيانات"
              onClick={onExport}
              aria-label="تصدير البيانات"
            >
              <Download size={18} />
            </button>
          )}
          {collapsible && (
            <button
              className="text-gray-500 hover:text-indigo-600 transition-colors p-1.5 rounded-full hover:bg-gray-100"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? "توسيع" : "طي"}
            >
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          )}
        </div>
      </div>
      <motion.div 
        className="transition-all duration-300 ease-in-out"
        animate={{ 
          height: isCollapsed ? 0 : "auto",
          opacity: isCollapsed ? 0 : 1
        }}
        initial={false}
      >
        {!isCollapsed && children}
      </motion.div>
    </motion.div>
  );
};

export default Card;