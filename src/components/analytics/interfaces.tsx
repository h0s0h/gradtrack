import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Activity } from 'lucide-react';

// تعريف واجهات البيانات
export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_id: string;
}

export interface ActivityData {
  name: string;
  تحديثات: number;
  مهام: number;
  تعليقات: number;
  dateKey?: string;
}

export interface ChartProps {
  projectsData?: Project[];
  timeRange?: string;
}

// دالة دوران عرض الاتجاه (Trend)
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
