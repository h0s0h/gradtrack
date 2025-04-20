// components/TimeRangeSelector.tsx
import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface TimeRangeSelectorProps {
  timeRange: string;
  onChange: (range: string) => void;
  className?: string;
  options?: Array<{ value: string; label: string }>;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ 
  timeRange, 
  onChange, 
  className = '',
  options: customOptions
}) => {
  const options = useMemo(() => customOptions || [
    { value: 'أسبوع', label: 'أسبوع' },
    { value: 'شهر', label: 'شهر' },
    { value: '3 أشهر', label: '3 أشهر' },
    { value: 'سنة', label: 'سنة' }
  ], [customOptions]);
  
  return (
    <div className={`flex items-center space-x-2 rtl:space-x-reverse ${className}`}>
      <Calendar size={18} className="text-gray-500 flex-shrink-0" />
      <div className="flex rounded-lg bg-gray-100 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${
              timeRange === option.value
                ? 'bg-white shadow-sm text-indigo-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => onChange(option.value)}
            aria-pressed={timeRange === option.value}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeRangeSelector;