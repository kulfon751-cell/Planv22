'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { ResourceData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/Button';

interface ResourceTableProps {
  data: ResourceData[];
  onResourceClick: (resourceId: string) => void;
}

type SortField = 'resource' | 'availabilityH' | 'loadH' | 'missingH' | 'utilizationPercent';
type SortDirection = 'asc' | 'desc';

export function ResourceTable({ data, onResourceClick }: ResourceTableProps) {
  const [sortField, setSortField] = useState<SortField>('loadH');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      const numA = Number(aValue) || 0;
      const numB = Number(bValue) || 0;
      
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  // Calculate totals
  const totals = useMemo(() => ({
    availabilityH: data.reduce((sum, r) => sum + r.availabilityH, 0),
    loadH: data.reduce((sum, r) => sum + r.loadH, 0),
    missingH: data.reduce((sum, r) => sum + r.missingH, 0),
    utilizationPercent: data.length > 0 
      ? data.reduce((sum, r) => sum + r.utilizationPercent, 0) / data.length 
      : 0
  }), [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Obciążenie urządzeń
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th 
                  className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort('resource')}
                >
                  <div className="flex items-center gap-2">
                    Urządzenie
                    <SortIcon field="resource" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort('availabilityH')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Dostępność (h)
                    <SortIcon field="availabilityH" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort('loadH')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Obciążenie (h)
                    <SortIcon field="loadH" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort('missingH')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Brakujące (h)
                    <SortIcon field="missingH" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort('utilizationPercent')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Wykorzystanie (%)
                    <SortIcon field="utilizationPercent" />
                  </div>
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((resource, index) => (
                <motion.tr
                  key={resource.resource}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {resource.resourceName}
                      </div>
                      {resource.department && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {resource.department}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                    {resource.availabilityH.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                    {resource.loadH.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${
                    resource.missingH >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {resource.missingH.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className={`font-medium ${
                      resource.utilizationPercent > 100 
                        ? 'text-red-600 dark:text-red-400'
                        : resource.utilizationPercent > 80
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {resource.utilizationPercent.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onResourceClick(resource.resource)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Planner
                    </Button>
                  </td>
                </motion.tr>
              ))}
              
              {/* Totals row */}
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 font-semibold">
                <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                  SUMA ({data.length} urządzeń)
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                  {totals.availabilityH.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                  {totals.loadH.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </td>
                <td className={`py-3 px-4 text-right ${
                  totals.missingH >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {totals.missingH.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                  {totals.utilizationPercent.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}