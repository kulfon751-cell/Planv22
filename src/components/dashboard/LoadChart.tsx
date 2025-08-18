'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ComposedChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { ResourceData } from '@/hooks/useDashboardData';

interface LoadChartProps {
  data: ResourceData[];
  granularity: 'month' | 'week';
}

export function LoadChart({ data, granularity }: LoadChartProps) {
  // Prepare chart data
  const chartData = data.map(resource => ({
    name: resource.resourceName.length > 15 
      ? resource.resourceName.substring(0, 15) + '...' 
      : resource.resourceName,
    fullName: resource.resourceName,
    loadH: resource.loadH,
    missingH: resource.missingH,
    availabilityH: resource.availabilityH,
    utilizationPercent: resource.utilizationPercent
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            {data.fullName}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-green-600">Obciążenie:</span>
              <span className="font-medium">{data.loadH.toFixed(1)} h</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-blue-600">Dostępność:</span>
              <span className="font-medium">{data.availabilityH.toFixed(1)} h</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className={data.missingH >= 0 ? "text-green-600" : "text-red-600"}>
                {data.missingH >= 0 ? 'Nadwyżka:' : 'Deficyt:'}
              </span>
              <span className="font-medium">{Math.abs(data.missingH).toFixed(1)} h</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Wykorzystanie:</span>
              <span className="font-medium">{data.utilizationPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Obciążenie vs Dostępność
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Obciążenie</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Deficyt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-300 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Nadwyżka</span>
            </div>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Godziny', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Load bar (green) */}
              <Bar 
                dataKey="loadH" 
                fill="#10B981" 
                name="Obciążenie"
                radius={[2, 2, 0, 0]}
              />
              
              {/* Missing hours bar (red for deficit, light green for surplus) */}
              <Bar 
                dataKey="missingH"
                name="Różnica"
                radius={[2, 2, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.missingH >= 0 ? '#10B981' : '#EF4444'}
                    fillOpacity={0.6}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Wykres pokazuje obciążenie (zielony) oraz różnicę względem dostępności. 
          Czerwony = deficyt, jasny zielony = nadwyżka.
        </div>
      </div>
    </motion.div>
  );
}