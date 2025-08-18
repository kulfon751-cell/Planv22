'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Calendar, 
  Filter, 
  Download, 
  ExternalLink,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/app-store';
import { useDashboardData } from '@/hooks/useDashboardData';
import { KPICards } from '@/components/dashboard/KPICards';
import { ResourceTable } from '@/components/dashboard/ResourceTable';
import { LoadChart } from '@/components/dashboard/LoadChart';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { OrderRanking } from '@/components/dashboard/OrderRanking';
import { exportDashboardData } from '@/lib/export/dashboard-export';

export default function DashboardPage() {
  const { operations, updateViewState } = useAppStore();
  const [filters, setFilters] = useState({
    departments: [] as string[],
    resources: [] as string[],
    months: [] as string[],
    weeks: [] as string[],
    granularity: 'month' as 'month' | 'week'
  });

  // Calculate dashboard data with memoization
  const dashboardData = useDashboardData(operations, filters);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      departments: [],
      resources: [],
      months: [],
      weeks: [],
      granularity: filters.granularity
    });
  }, [filters.granularity]);

  const handleExport = useCallback(async (format: 'png' | 'pdf' | 'csv') => {
    try {
      await exportDashboardData(dashboardData, format, filters);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [dashboardData, filters]);

  const handleOpenInPlanner = useCallback((orderIds?: string[], resourceIds?: string[]) => {
    // Set filters in planner
    const selectedOrderIds = orderIds || [];
    const resourceFilters = resourceIds || [];
    
    // Auto-fit to selected data
    if (selectedOrderIds.length > 0 || resourceFilters.length > 0) {
      const filteredOps = operations.filter(op => 
        (selectedOrderIds.length === 0 || selectedOrderIds.includes(op.orderNo)) &&
        (resourceFilters.length === 0 || resourceFilters.includes(op.resource))
      );
      
      if (filteredOps.length > 0) {
        const startTimes = filteredOps.map(op => op.startTime.getTime());
        const endTimes = filteredOps.map(op => op.endTime.getTime());
        
        const dataStart = new Date(Math.min(...startTimes));
        const dataEnd = new Date(Math.max(...endTimes));
        
        const totalMs = dataEnd.getTime() - dataStart.getTime();
        const padding = Math.max(totalMs * 0.05, 30 * 60 * 1000); // 5% padding, min 30 min
        
        const paddedStart = new Date(dataStart.getTime() - padding);
        const paddedEnd = new Date(dataEnd.getTime() + padding);
        
        // Calculate optimal zoom
        const totalHours = (paddedEnd.getTime() - paddedStart.getTime()) / (1000 * 60 * 60);
        const optimalPixelsPerHour = Math.max(30, Math.min(300, 1200 / totalHours));
        
        updateViewState({
          startTime: paddedStart,
          endTime: paddedEnd,
          pixelsPerHour: optimalPixelsPerHour,
          selectedOrderIds,
          resourceFilters
        });
      }
    }
    
    // Navigate to planner
    window.location.href = '/planner';
  }, [operations, updateViewState]);

  const hasActiveFilters = filters.departments.length > 0 || 
                          filters.resources.length > 0 || 
                          filters.months.length > 0 || 
                          filters.weeks.length > 0;

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  PM — Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analiza obciążenia i dostępności zasobów
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Granularity toggle */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, granularity: 'month' }))}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filters.granularity === 'month'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Miesiąc
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, granularity: 'week' }))}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filters.granularity === 'week'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Tydzień
                </button>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClearFilters}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Wyczyść filtry
                </Button>
              )}

              {/* Export buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport('png')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  PNG
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              </div>

              {/* Open in Planner */}
              <Button
                onClick={() => handleOpenInPlanner()}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Otwórz w Plannerze
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6 space-y-6" id="dashboard-content">
        {/* KPI Cards */}
        <KPICards data={dashboardData.kpis} />

        {/* Row 1: Resource Table + Load Chart */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ResourceTable 
            data={dashboardData.resourceData}
            onResourceClick={(resourceId) => handleOpenInPlanner(undefined, [resourceId])}
          />
          <LoadChart 
            data={dashboardData.resourceData}
            granularity={filters.granularity}
          />
        </div>

        {/* Row 2: Filters */}
        <FilterPanel
          filters={filters}
          availableOptions={dashboardData.filterOptions}
          onChange={handleFilterChange}
        />

        {/* Row 3: Order Ranking */}
        <OrderRanking
          data={dashboardData.orderRanking}
          onOrderClick={(orderIds) => handleOpenInPlanner(orderIds)}
        />
      </div>
    </div>
  );
}