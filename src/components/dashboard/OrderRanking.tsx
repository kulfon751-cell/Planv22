'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, ExternalLink } from 'lucide-react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { OrderRankingData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/Button';

interface OrderRankingProps {
  data: OrderRankingData[];
  onOrderClick: (orderIds: string[]) => void;
}

export function OrderRanking({ data, onOrderClick }: OrderRankingProps) {
  const chartData = data.slice(0, 20).map(order => ({
    ...order,
    shortName: order.orderNo.length > 12 
      ? order.orderNo.substring(0, 12) + '...' 
      : order.orderNo
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            {data.orderNo}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400">Obciążenie:</span>
              <span className="font-medium">{data.loadH.toFixed(1)} h</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400">Operacje:</span>
              <span className="font-medium">{data.operationsCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400">Urządzenia:</span>
              <span className="font-medium">{data.resourcesCount}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data: any) => {
    if (data && data.orderNo) {
      onOrderClick([data.orderNo]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BarChart className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ranking obciążenia wg zleceń (Top 20)
            </h3>
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOrderClick(data.slice(0, 10).map(d => d.orderNo))}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Top 10 w Plannerze
          </Button>
        </div>
        
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Godziny', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="category" 
                dataKey="shortName"
                tick={{ fontSize: 11 }}
                width={75}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="loadH" 
                fill="#3B82F6"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={handleBarClick}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Kliknij słupek, aby otworzyć zlecenie w Plannerze z auto-dopasowaniem widoku.
        </div>
      </div>
    </motion.div>
  );
}