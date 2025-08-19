import { useMemo } from 'react';
import { ProductionOperation } from '@/lib/types';

/**
 * Filters used by the machine‑load dashboard.  They mirror the slicers
 * present in the Power BI report (department, week, month and device name).
 */
export interface MachineLoadFilters {
  /** Selected departments (empty = all). */
  departments: string[];
  /** ISO year‑week strings (YYYY‑W##). */
  weeks: string[];
  /** Month identifiers in format YYYY‑MM. */
  months: string[];
  /** Device names (resource identifiers) to include. */
  devices: string[];
}

/** Row in the machine load table. */
export interface MachineLoadRow {
  device: string;
  deviceName: string;
  department: string;
  resourceGroup: string;
  availabilityH: number;
  loadH: number;
  missingH: number;
  utilizationPercent: number;
}

/** Order ranking entry. */
export interface MachineLoadOrderRanking {
  orderNo: string;
  loadH: number;
}

/** Options for filter dropdowns. */
export interface MachineLoadFilterOptions {
  departments: string[];
  weeks: string[];
  months: string[];
  devices: string[];
}

/** Helper: normalize a resource name for department/group detection. */
function normalizeResourceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => {
      const map: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
        'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
      };
      return map[ch] ?? ch;
    })
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/** Determine department based on resource id/name. */
function getDepartment(resource: string): string {
  const normalized = normalizeResourceName(resource);
  if (normalized.includes('cnc') || normalized.includes('centrum')) return 'CNC';
  if (normalized.includes('maszyna-a')) return 'Toczenie';
  if (normalized.includes('maszyna-b')) return 'Frezowanie';
  if (normalized.includes('maszyna-c')) return 'Obróbka';
  return 'Inne';
}

/** Determine resource group based on resource id/name. */
function getGroup(resource: string): string {
  const normalized = normalizeResourceName(resource);
  if (normalized.includes('cnc') || normalized.includes('centrum')) return 'cnc';
  if (normalized.includes('maszyna')) return 'maszyny‑konwencjonalne';
  return 'inne';
}

/** Compute ISO week string for a date (YYYY‑W##). */
function getISOWeek(date: Date): string {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const firstThursday = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber =
    1 + Math.round(((tempDate.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  const year = tempDate.getFullYear();
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

/** Compute a YYYY‑MM identifier for a date. */
function getYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Hook that prepares aggregated machine‑load data and filter options.
 */
export function useMachineLoadDashboardData(
  operations: ProductionOperation[],
  filters: MachineLoadFilters
): {
  rows: MachineLoadRow[];
  ranking: MachineLoadOrderRanking[];
  options: MachineLoadFilterOptions;
} {
  return useMemo(() => {
    const opts: MachineLoadFilterOptions = {
      departments: [],
      weeks: [],
      months: [],
      devices: [],
    };
    const deptSet = new Set<string>();
    const weekSet = new Set<string>();
    const monthSet = new Set<string>();
    const deviceSet = new Set<string>();
    operations.forEach((op) => {
      deptSet.add(getDepartment(op.resource));
      weekSet.add(getISOWeek(op.startTime));
      monthSet.add(getYearMonth(op.startTime));
      deviceSet.add(op.resource);
    });
    opts.departments = Array.from(deptSet).sort();
    opts.weeks = Array.from(weekSet).sort();
    opts.months = Array.from(monthSet).sort();
    opts.devices = Array.from(deviceSet).sort();

    const filteredOps = operations.filter((op) => {
      if (filters.departments.length && !filters.departments.includes(getDepartment(op.resource))) return false;
      if (filters.devices.length && !filters.devices.includes(op.resource)) return false;
      const week = getISOWeek(op.startTime);
      if (filters.weeks.length && !filters.weeks.includes(week)) return false;
      const month = getYearMonth(op.startTime);
      if (filters.months.length && !filters.months.includes(month)) return false;
      return true;
    });

    const map = new Map<string, { loadH: number; ops: ProductionOperation[] }>();
    filteredOps.forEach((op) => {
      const key = op.resource;
      const durMin = (op.endTime.getTime() - op.startTime.getTime()) / (1000 * 60);
      const loadH = Math.max(0, durMin / 60);
      if (!map.has(key)) {
        map.set(key, { loadH: 0, ops: [] });
      }
      const entry = map.get(key)!;
      entry.loadH += loadH;
      entry.ops.push(op);
    });

    let granularity: 'week' | 'month' = 'month';
    if (filters.weeks.length) granularity = 'week';
    else if (filters.months.length) granularity = 'month';
    const hoursPerWeek = 120;
    const hoursPerMonth = hoursPerWeek * 4.33;
    const defaultAvailability = granularity === 'week' ? hoursPerWeek : hoursPerMonth;

    const rows: MachineLoadRow[] = [];
    map.forEach((value, resource) => {
      const loadH = value.loadH;
      const availabilityH = defaultAvailability;
      const missingH = availabilityH - loadH;
      const utilization = availabilityH > 0 ? (loadH / availabilityH) * 100 : 0;
      rows.push({
        device: resource,
        deviceName: resource,
        department: getDepartment(resource),
        resourceGroup: getGroup(resource),
        availabilityH,
        loadH,
        missingH,
        utilizationPercent: utilization,
      });
    });
    rows.sort((a, b) => b.loadH - a.loadH);

    const orderMap = new Map<string, number>();
    filteredOps.forEach((op) => {
      const durMin = (op.endTime.getTime() - op.startTime.getTime()) / (1000 * 60);
      const loadH = Math.max(0, durMin / 60);
      orderMap.set(op.orderNo, (orderMap.get(op.orderNo) ?? 0) + loadH);
    });
    const ranking: MachineLoadOrderRanking[] = Array.from(orderMap.entries())
      .map(([orderNo, loadH]) => ({ orderNo, loadH }))
      .sort((a, b) => b.loadH - a.loadH)
      .slice(0, 20);

    return { rows, ranking, options: opts };
  }, [operations, filters]);
}

