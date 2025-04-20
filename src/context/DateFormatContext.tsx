'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { formatDate } from '@/lib/utils/dateUtils';

// نوع السياق
interface DateFormatContextType {
  formatDateString: (dateString: string | null, formatPattern?: string) => string;
}

// إنشاء السياق مع الدالة الوحيدة لتنسيق التاريخ
const DateFormatContext = createContext<DateFormatContextType>({
  formatDateString: (date) => date || '',
});

// hook لاستخدام السياق
export const useDateFormat = () => useContext(DateFormatContext);

interface DateFormatProviderProps {
  children: ReactNode;
}

// مزود السياق المبسط للتاريخ الميلادي فقط
export const DateFormatProvider: React.FC<DateFormatProviderProps> = ({ children }) => {
  // دالة تنسيق التاريخ باستخدام التاريخ الميلادي دائمًا
  const formatDateString = (dateString: string | null, formatPattern?: string) => {
    return formatDate(dateString, formatPattern);
  };
  
  return (
    <DateFormatContext.Provider
      value={{
        formatDateString
      }}
    >
      {children}
    </DateFormatContext.Provider>
  );
}; 