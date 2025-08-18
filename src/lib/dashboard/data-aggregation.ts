import { ProductionOperation } from '@/lib/types';
import { differenceInMinutes, format } from 'date-fns';
import { pl } from 'date-fns/locale';

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

// Normalize resource names for consistent matching
export function normalizeResourceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (match) => {
      const map: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
        'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'
      };
      return map[match] || match;
    })
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Calculate duration in hours from operation
function calculateLoadH(operation: ProductionOperation): number {
  const durationMin = differenceInMinutes(operation.endTime, operation.startTime);
  return Math.max(0, durationMin / 60);
}

// Get default availability for resource (fallback values)
function getDefaultAvailability(resource: string, granularity: 'month' | 'week'): number {
  // Default availability assumptions
  const hoursPerWeek = 120; // 5 days * 24 hours (3 shifts)
  const hoursPerMonth = hoursPerWeek * 4.33; // Average weeks per month
  
  return granularity === 'week' ? hoursPerWeek : hoursPerMonth;
}

// Build availability keys for joining with availability tables
function buildAvailabilityKeys(resource: string, date: Date, granularity: 'month' | 'week') {
  const normalized = normalizeResourceName(resource);
  const yearMonth = format(date, 'yyyy-MM');
  const yearWeek = getISOWeek(date);
  
  return {
    keyResMonth: `${normalized}::${yearMonth}`,
    keyResWeek: `${normalized}::${yearWeek}`,
    keyGrpMonth: `${getResourceGroup(resource)}::${yearMonth}`,
    keyGrpWeek: `${getResourceGroup(resource)}::${yearWeek}`
  };
}

// Get resource group for resource
function getResourceGroup(resource: string): string {
  const normalized = normalizeResourceName(resource);
  
  if (normalized.includes('cnc') || normalized.includes('centrum')) {
    return 'cnc';
  } else if (normalized.includes('maszyna')) {
    return 'maszyny-konwencjonalne';
  } else {
    return 'inne';
  }
}

// Get ISO week string
function getISOWeek(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

// Aggregate resource data with availability calculations
export function aggregateResourceData(
  operations: ProductionOperation[],
  granularity: 'month' | 'week'
): ResourceData[] {
  const resourceMap = new Map<string, {
    loadH: number;
    operations: ProductionOperation[];
  }>();

  // Aggregate load by resource
  operations.forEach(op => {
    const loadH = calculateLoadH(op);
    
    if (!resourceMap.has(op.resource)) {
      resourceMap.set(op.resource, {
        loadH: 0,
        operations: []
      });
    }
    
    const resourceData = resourceMap.get(op.resource)!;
    resourceData.loadH += loadH;
    resourceData.operations.push(op);
  });

  // Convert to ResourceData array
  const result: ResourceData[] = [];
  
  for (const [resource, data] of resourceMap.entries()) {
    // Calculate availability (with fallback to defaults)
    const availabilityH = getDefaultAvailability(resource, granularity);
    
    // TODO: Here you would join with actual availability tables:
    // - DostepnoscBazowa
    // - DostepnoscWPoszczeg
    // - DostepnoscPomocnicza
    // Using the keys built by buildAvailabilityKeys()
    
    const missingH = availabilityH - data.loadH;
    const utilizationPercent = availabilityH > 0 ? (data.loadH / availabilityH) * 100 : 0;
    
    result.push({
      resource,
      resourceName: resource, // TODO: Map to NazwaUrz.Nazwa from Urządzenia table
      department: getDepartmentForResource(resource),
      resourceGroup: getResourceGroup(resource),
      availabilityH,
      loadH: data.loadH,
      missingH,
      utilizationPercent
    });
  }

  return result.sort((a, b) => b.loadH - a.loadH);
}

// Calculate KPIs from resource data
export function calculateKPIs(resourceData: ResourceData[]): KPIData {
  const ordersCount = 0; // TODO: Calculate from filtered operations
  const resourcesCount = resourceData.length;
  const loadHTotal = resourceData.reduce((sum, r) => sum + r.loadH, 0);
  const availabilityHTotal = resourceData.reduce((sum, r) => sum + r.availabilityH, 0);
  const missingHTotal = availabilityHTotal - loadHTotal;
  const utilizationPercent = availabilityHTotal > 0 ? (loadHTotal / availabilityHTotal) * 100 : 0;

  return {
    ordersCount,
    resourcesCount,
    loadHTotal,
    availabilityHTotal,
    missingHTotal,
    utilizationPercent
  };
}

// Generate order ranking by load
export function generateOrderRanking(operations: ProductionOperation[]): OrderRankingData[] {
  const orderMap = new Map<string, {
    loadH: number;
    operationsCount: number;
    resources: Set<string>;
  }>();

  operations.forEach(op => {
    const loadH = calculateLoadH(op);
    
    if (!orderMap.has(op.orderNo)) {
      orderMap.set(op.orderNo, {
        loadH: 0,
        operationsCount: 0,
        resources: new Set()
      });
    }
    
    const orderData = orderMap.get(op.orderNo)!;
    orderData.loadH += loadH;
    orderData.operationsCount++;
    orderData.resources.add(op.resource);
  });

  return Array.from(orderMap.entries())
    .map(([orderNo, data]) => ({
      orderNo,
      loadH: data.loadH,
      operationsCount: data.operationsCount,
      resourcesCount: data.resources.size
    }))
    .sort((a, b) => b.loadH - a.loadH)
    .slice(0, 20); // Top 20
}

// Get available filter options
export function getFilterOptions(operations: ProductionOperation[]) {
  const departments = new Set<string>();
  const resources = new Map<string, { name: string; department?: string }>();
  const months = new Set<string>();
  const weeks = new Set<string>();

  operations.forEach(op => {
    const department = getDepartmentForResource(op.resource);
    departments.add(department);
    
    resources.set(op.resource, {
      name: op.resource,
      department
    });

    const yearMonth = format(op.startTime, 'yyyy-MM');
    const monthName = format(op.startTime, 'MMMM yyyy', { locale: pl });
    months.add(`${yearMonth}|${monthName}|${op.startTime.getFullYear()}`);

    const yearWeek = getISOWeek(op.startTime);
    const weekName = `Tydzień ${yearWeek.split('-W')[1]} (${format(op.startTime, 'dd.MM', { locale: pl })})`;
    weeks.add(`${yearWeek}|${weekName}|${op.startTime.getFullYear()}`);
  });

  return {
    departments: Array.from(departments).sort(),
    resources: Array.from(resources.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      department: data.department
    })).sort((a, b) => a.name.localeCompare(b.name)),
    months: Array.from(months).map(m => {
      const [id, name, year] = m.split('|');
      return { id, name, year: parseInt(year) };
    }).sort((a, b) => a.id.localeCompare(b.id)),
    weeks: Array.from(weeks).map(w => {
      const [id, name, year] = w.split('|');
      const weekNumber = parseInt(id.split('-W')[1]);
      return { id, name, year: parseInt(year), weekNumber };
    }).sort((a, b) => a.id.localeCompare(b.id))
  };
}

// Helper function to get department for resource
function getDepartmentForResource(resource: string): string {
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