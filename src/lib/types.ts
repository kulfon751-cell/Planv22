export interface ProductionOperation {
  id: string;
  orderNo: string;
  resource: string;
  startTime: Date;
  endTime: Date;
  opNo?: string;
  partNo?: string;
  productName?: string; // Nazwa produktu
  qty?: number;
  operationId?: string;
  sequence?: number;
  notes?: string;
  // optional real events / runtime metadata
  actualStart?: Date | null;
  actualEnd?: Date | null;
  blocked?: { flag: boolean; note?: string } | null;
}

export interface GanttRow {
  resourceId: string;
  resourceName: string;
  top: number;
  height: number;
  lanes: ProductionOperation[][];
}

export interface ImportProfile {
  id: string;
  name: string;
  isDefault: boolean;
  mapping: FieldMapping;
  transformations: Record<string, string>;
  createdAt: Date;
  headerHash?: string;
}

export interface FieldMapping {
  orderNo: string;
  resource: string;
  startTime: string;
  endTime: string;
  opNo?: string;
  partNo?: string;
  productName?: string; // nazwa produktu
  qty?: string;
  operationId?: string;
  sequence?: string;
  notes?: string;
  dateColumn?: string; // for combining date + time
  timeColumn?: string;
}

export interface ImportResult {
  total: number;
  parsedOK: number;
  skippedMissing: number;
  skippedDateError: number;
  skippedEndBeforeStart: number;
  errors: string[];
  operations: ProductionOperation[];
}

export interface ImportProgress {
  stage: 'reading' | 'parsing' | 'validating' | 'saving' | 'complete';
  progress: number;
  processedRows: number;
  totalRows: number;
  errors: string[];
  canCancel: boolean;
  diagnostics?: {
    validOperations: number;
    skippedRows: number;
    dateNormalizations: number;
    avgProcessingTime: number;
    slowestRow: number;
    memoryUsage?: number;
    errorBreakdown: {
      missingFields: number;
      dateParsingErrors: number;
      dateNormalizationFailures: number;
      duplicates: number;
      other: number;
    };
  };
}

export interface ViewState {
  startTime: Date;
  endTime: Date;
  pixelsPerHour: number;
  selectedOrderIds: string[];
  searchQuery: string;
  resourceFilters: string[];
  resourceOrder?: string[]; // preferred order of resource (machine) rows
  partNoFilters: string[];
  opNoFilters: string[];
}

export interface ViewPreset {
  id: string;
  name: string;
  viewState: Partial<ViewState>;
  createdAt: Date;
}

export type UserRole = 'admin' | 'production' | null;

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'pl';
  timezone: string;
  autoFitPadding: number; // minutes
}

export interface RouteConnection {
  fromOperation: ProductionOperation;
  toOperation: ProductionOperation;
  orderNo: string;
  color: string;
}

export interface ResourceConflict {
  resource: string;
  operations: ProductionOperation[];
  overlapMinutes: number;
}