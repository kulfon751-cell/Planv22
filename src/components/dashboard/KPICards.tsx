'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  FileText, 
  Settings, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { KPIData } from '@/hooks/useDashboardData';

interface KPICardsProps {
  data: KPIData;
}

// Animated counter component
function AnimatedCounter({ 
  value, 
  duration = 2000, 
  decimals = 0,
  suffix = ''
}: { 
  value: number; 
  duration?: number; 
  decimals?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setCount(value);
      return;
    }

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(progress * value);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration, shouldReduceMotion]);

  return (
    <span>
      {count.toLocaleString('pl-PL', { 
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals 
      })}{suffix}
    </span>
  );
}

export function KPICards({ data }: KPICardsProps) {
  const cards = [
    {
      title: 'Liczba zleceń',
      value: data.ordersCount,
      icon: FileText,
      color: 'blue',
      suffix: '',
      decimals: 0
    },
    {
      title: 'Liczba urządzeń',
      value: data.resourcesCount,
      icon: Settings,
      color: 'green',
      suffix: '',
      decimals: 0
    },
    {
      title: 'Łączne obciążenie',
      value: data.loadHTotal,
      icon: Clock,
      color: 'purple',
      suffix: ' h',
      decimals: 1
    },
    {
      title: 'Brakujące godziny',
      value: data.missingHTotal,
      icon: data.missingHTotal >= 0 ? TrendingUp : AlertTriangle,
      color: data.missingHTotal >= 0 ? 'green' : 'red',
      suffix: ' h',
      decimals: 1
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.title}
              </p>
              <p className={`text-3xl font-bold mt-2 ${
                card.color === 'blue' ? 'text-blue-600' :
                card.color === 'green' ? 'text-green-600' :
                card.color === 'purple' ? 'text-purple-600' :
                card.color === 'red' ? 'text-red-600' :
                'text-gray-900 dark:text-gray-100'
              }`}>
                <AnimatedCounter 
                  value={card.value} 
                  decimals={card.decimals}
                  suffix={card.suffix}
                />
              </p>
              
              {/* Utilization percentage for load card */}
              {card.title === 'Łączne obciążenie' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Wykorzystanie: <AnimatedCounter value={data.utilizationPercent} decimals={1} suffix="%" />
                </p>
              )}
            </div>
            
            <div className={`p-3 rounded-full ${
              card.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' :
              card.color === 'green' ? 'bg-green-100 dark:bg-green-900/20' :
              card.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/20' :
              card.color === 'red' ? 'bg-red-100 dark:bg-red-900/20' :
              'bg-gray-100 dark:bg-gray-700'
            }`}>
              <card.icon className={`h-6 w-6 ${
                card.color === 'blue' ? 'text-blue-600' :
                card.color === 'green' ? 'text-green-600' :
                card.color === 'purple' ? 'text-purple-600' :
                card.color === 'red' ? 'text-red-600' :
                'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}