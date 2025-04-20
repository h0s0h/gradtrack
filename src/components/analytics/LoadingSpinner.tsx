// components/LoadingSpinner.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: string;
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'h-12 w-12', 
  color = 'border-indigo-500', 
  className = '' 
}) => (
  <div className="flex justify-center items-center">
    <motion.div 
      className={`rounded-full ${size} border-4 border-t-transparent border-l-transparent ${color} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      aria-label="جاري التحميل..."
      role="status"
    />
  </div>
);

export default LoadingSpinner;