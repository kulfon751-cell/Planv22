import { useMemo } from 'react';
import { ProductionOperation } from '@/lib/types';
import { 
  aggregateResourceData, 
  calculateKPIs, 
  generateOrderRanking,
  getFilterOptions,
  normalizeResourceName
} from '@/lib/dashboard/data-aggregation';

export interface DashboardFilters {
  departments: string[];
  resources: string[];
  months: string[];
  weeks: string[];
  granularity: 'month' | 'week';
}

export interface ResourceData {
  resource: string;
  resourceName: string;
  department?: string;
  resourceGroup?: string;
  availabilityH: number;
  loadH: number;
  missingH: number;
  utilizationPercent: number;
}

export interface KPIData {
  ordersCount: number;
  resourcesCount: number;
  loadHTotal: number;
  availabilityHTotal: number;
  missingHTotal: number;
  utilizationPercent: number;
}

export interface OrderRankingData {
  orderNo: string;
  loadH: number;
  operationsCount: number;
  resourcesCount: number;
}

export interface FilterOptions {
  departments: string[];
  resources: { id: string; name: string; department?: string }[];
  months: { id: string; name: string; year: number }[];
  weeks: { id: string; name: string; year: number; weekNumber: number }[];
}

export interface DashboardData {
  resourceData: ResourceData[];
  kpis: KPIData;
  orderRanking: OrderRankingData[];
  filterOptions: FilterOptions;
}

export function useDashboardData(
  operations: ProductionOperation[],
  filters: DashboardFilters
): DashboardData {
  return useMemo(() => {
    // Apply filters to operations
    const filteredOperations = operations.filter(op => {
      // Department filter
      if (filters.departments.length > 0) {
        const department = getDepartmentForResource(op.resource);
        if (!filters.departments.includes(department)) return false;
      }

      // Resource filter
      if (filters.resources.length > 0) {
        if (!filters.resources.includes(op.resource)) return false;
      }

      // Time filters
      const opDate = op.startTime;
      const yearMonth = `${opDate.getFullYear()}-${String(opDate.getMonth() + 1).padStart(2, '0')}`;
      const yearWeek = getISOWeek(opDate);

      if (filters.granularity === 'month' && filters.months.length > 0) {
        if (!filters.months.includes(yearMonth)) return false;
      }

      if (filters.granularity === 'week' && filters.weeks.length > 0) {
        if (!filters.weeks.includes(yearWeek)) return false;
      }

      return true;
    });

    // Aggregate data
    const resourceData = aggregateResourceData(filteredOperations, filters.granularity);
    const kpis = calculateKPIs(resourceData);
    const orderRanking = generateOrderRanking(filteredOperations);
    const filterOptions = getFilterOptions(operations);

    return {
      resourceData,
      kpis,
      orderRanking,
      filterOptions
    };
  }, [operations, filters]);
}

// Helper functions
function getDepartmentForResource(resource: string): string {
  // Map resources to departments based on naming patterns
  const normalized = normalizeResourceName(resource);
  
  if (normalized.includes('cnc') || normalized.includes('centrum')) {
    return 'CNC';
  } else if (normalized.includes('maszyna-a')) {
    return 'Toczenie';
  } else if (normalized.includes('maszyna-b')) {
    return 'Frezowanie';
  } else if (normalized.includes('maszyna-c')) {
    return 'Obróbka';
  } else {
    return 'Inne';
  }
}

function getISOWeek(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}