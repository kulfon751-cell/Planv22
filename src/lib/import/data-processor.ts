import { ProductionOperation, FieldMapping, ImportResult, ImportProgress } from '@/lib/types';
import { parsePolishDate, combineDateAndTime } from '@/lib/date-utils';
import { v4 as uuidv4 } from 'uuid';

// Diagnostics and performance monitoring
interface ProcessingDiagnostics {
  startTime: number;
  processedRows: number;
  validOperations: number;
  skippedRows: number;
  dateNormalizations: number;
  performanceMetrics: {
    avgRowProcessingTime: number;
    slowestRowTime: number;
    slowestRowIndex: number;
    memoryUsage?: number;
  };
  errorBreakdown: {
    missingFields: number;
    dateParsingErrors: number;
    dateNormalizationFailures: number;
    duplicates: number;
    other: number;
  };
}

// Performance monitoring
class PerformanceMonitor {
  private startTime: number = 0;
  private rowTimes: number[] = [];
  private maxSamples = 1000;

  start() {
    this.startTime = performance.now();
  }

  recordRowTime(time: number) {
    this.rowTimes.push(time);
    if (this.rowTimes.length > this.maxSamples) {
      this.rowTimes.shift();
    }
  }

  getMetrics() {
    const avgTime = this.rowTimes.length > 0 
      ? this.rowTimes.reduce((a, b) => a + b, 0) / this.rowTimes.length 
      : 0;
    const maxTime = Math.max(...this.rowTimes, 0);
    const maxIndex = this.rowTimes.indexOf(maxTime);
    
    return {
      avgRowProcessingTime: avgTime,
      slowestRowTime: maxTime,
      slowestRowIndex: maxIndex,
      totalTime: performance.now() - this.startTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
    };
  }
}

// Normalizacja końca operacji - autokorekta typowych przypadków
function normalizeEndAfterStart(startTime: Date, endTime: Date): Date {
  if (endTime > startTime) return endTime;

  // Zabezpieczenie przed nieskończoną rekursją
  let normalizedEnd = new Date(endTime);
  
  const sameYear = endTime.getFullYear() === startTime.getFullYear();
  const sameMonth = endTime.getMonth() === startTime.getMonth();
  const sameDay = endTime.getDate() === startTime.getDate();

  // 1) Przejście przez północ (np. start 22:00, koniec 02:00 tego samego dnia)
  if (sameYear && sameMonth && sameDay) {
    normalizedEnd = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    if (normalizedEnd > startTime) {
      console.log(`Normalizacja przez północ: ${startTime.toLocaleString()} -> ${normalizedEnd.toLocaleString()}`);
      return normalizedEnd;
    }
  }

  // 2) Przejście przez nowy rok (start: IX–XII, koniec: I–III, rok ten sam)
  if (sameYear && startTime.getMonth() >= 8 && endTime.getMonth() <= 2) {
    normalizedEnd = new Date(endTime);
    normalizedEnd.setFullYear(normalizedEnd.getFullYear() + 1);
    if (normalizedEnd > startTime) {
      console.log(`Normalizacja przez nowy rok: ${startTime.toLocaleString()} -> ${normalizedEnd.toLocaleString()}`);
      return normalizedEnd;
    }
  }

  // Fallback: zapewnij minimalnie dodatni czas trwania (1 minuta)
  normalizedEnd = new Date(startTime.getTime() + 60 * 1000);
  console.log(`Normalizacja fallback: ${startTime.toLocaleString()} -> ${normalizedEnd.toLocaleString()}`);
  return normalizedEnd;
}

// Enhanced progress reporting with diagnostics
function reportProgress(
  onProgress: (progress: ImportProgress) => void,
  stage: ImportProgress['stage'],
  processed: number,
  total: number,
  diagnostics: ProcessingDiagnostics,
  errors: string[]
) {
  const progress = total > 0 ? (processed / total) * 100 : 0;
  const metrics = diagnostics.performanceMetrics;
  
  // Enhanced progress with diagnostics
  onProgress({
    stage,
    progress,
    processedRows: processed,
    totalRows: total,
    errors: errors.slice(0, 10), // Limit errors shown
    canCancel: stage !== 'complete',
    diagnostics: {
      validOperations: diagnostics.validOperations,
      skippedRows: diagnostics.skippedRows,
      dateNormalizations: diagnostics.dateNormalizations,
      avgProcessingTime: metrics.avgRowProcessingTime,
      slowestRow: metrics.slowestRowIndex,
      memoryUsage: metrics.memoryUsage,
      errorBreakdown: diagnostics.errorBreakdown
    }
  });
}

export interface ProcessingOptions {
  mapping: FieldMapping;
  transformations: Record<string, string>;
  maxRows?: number;
}

// Generate unique key for deduplication
function generateOperationKey(op: Partial<ProductionOperation>): string {
  return `${op.orderNo}-${op.opNo || ''}-${op.resource}-${op.startTime?.getTime()}`;
}

// Apply transformations to cell value
function transformValue(value: string, transformations: Record<string, string>): string {
  let result = value?.toString().trim() || '';
  
  // Apply custom transformations
  for (const [pattern, replacement] of Object.entries(transformations)) {
    result = result.replace(new RegExp(pattern, 'gi'), replacement);
  }
  
  // Standard transformations
  result = result.replace(/,/g, '.'); // Comma to dot for numbers
  
  return result;
}

// Process parsed data into operations
export async function processImportData(
  headers: string[],
  rows: any[][],
  options: ProcessingOptions,
  onProgress: (progress: ImportProgress) => void,
  signal?: AbortSignal
): Promise<ImportResult> {
  const { mapping, transformations, maxRows = 50000 } = options;
  
  // Initialize diagnostics
  const diagnostics: ProcessingDiagnostics = {
    startTime: performance.now(),
    processedRows: 0,
    validOperations: 0,
    skippedRows: 0,
    dateNormalizations: 0,
    performanceMetrics: {
      avgRowProcessingTime: 0,
      slowestRowTime: 0,
      slowestRowIndex: 0
    },
    errorBreakdown: {
      missingFields: 0,
      dateParsingErrors: 0,
      dateNormalizationFailures: 0,
      duplicates: 0,
      other: 0
    }
  };
  
  const monitor = new PerformanceMonitor();
  monitor.start();
  
  const result: ImportResult = {
    total: 0,
    parsedOK: 0,
    skippedMissing: 0,
    skippedDateError: 0,
    skippedEndBeforeStart: 0,
    errors: [],
    operations: []
  };
  
  const processedKeys = new Set<string>();
  const limitedRows = rows.slice(0, maxRows);
  result.total = limitedRows.length;
  
  // Find column indices
  const getColumnIndex = (fieldName: string): number => {
    const mappedColumn = (mapping as any)[fieldName];
    return mappedColumn ? headers.indexOf(mappedColumn) : -1;
  };
  
  const indices = {
    orderNo: getColumnIndex('orderNo'),
    resource: getColumnIndex('resource'),
    startTime: getColumnIndex('startTime'),
    endTime: getColumnIndex('endTime'),
    opNo: getColumnIndex('opNo'),
    partNo: getColumnIndex('partNo'),
  productName: getColumnIndex('productName'),
    qty: getColumnIndex('qty'),
    operationId: getColumnIndex('operationId'),
    sequence: getColumnIndex('sequence'),
    notes: getColumnIndex('notes'),
    dateColumn: mapping.dateColumn ? headers.indexOf(mapping.dateColumn) : -1,
    timeColumn: mapping.timeColumn ? headers.indexOf(mapping.timeColumn) : -1
  };
  
  // Process rows in chunks
  const chunkSize = 500; // Smaller chunks for better responsiveness
  let lastProgressUpdate = 0;
  const progressThrottle = 100; // Update progress every 100ms minimum
  
  for (let i = 0; i < limitedRows.length; i += chunkSize) {
    if (signal?.aborted) {
      throw new Error('Import anulowany');
    }
    
    const chunk = limitedRows.slice(i, Math.min(i + chunkSize, limitedRows.length));
    const chunkStartTime = performance.now();
    
    for (let rowIndex = 0; rowIndex < chunk.length; rowIndex++) {
      const rowStartTime = performance.now();
      const row = chunk[rowIndex];
      const actualRowIndex = i + rowIndex + 1; // +1 for header row
      
      try {
        diagnostics.processedRows++;
        
        // Extract required fields
        const orderNo = transformValue(row[indices.orderNo], transformations);
        const resource = transformValue(row[indices.resource], transformations);
        
        // Skip if missing required fields
        if (!orderNo || !resource) {
          result.skippedMissing++;
          diagnostics.skippedRows++;
          diagnostics.errorBreakdown.missingFields++;
          // Zapisz pełną listę błędów (bez limitu)
          result.errors.push(`Wiersz ${actualRowIndex}: Brak wymaganego pola (zlecenie lub zasób)`);
          monitor.recordRowTime(performance.now() - rowStartTime);
          continue;
        }
        
        // Parse dates
        let startTime: Date | null = null;
        let endTime: Date | null = null;
        
        console.log(`Row ${actualRowIndex}: Processing dates for order ${orderNo}, resource ${resource}`);
        
        if (mapping.dateColumn && mapping.timeColumn) {
          // Combine date and time columns — cells may be raw Date objects, numbers (Excel serial), or strings
          const rawTimeCell = row[indices.timeColumn];

          const getDateFromCell = (cell: any): Date | null => {
            if (!cell && cell !== 0) return null;
            if (cell instanceof Date) return cell;
            if (typeof cell === 'number') return parsePolishDate(cell.toString());
            const s = transformValue(cell?.toString?.() || '', transformations);
            return parsePolishDate(s);
          };

          const combineDateObjAndTime = (dateObj: Date | null, timeCell: any): Date | null => {
            if (!dateObj) return null;
            if (timeCell instanceof Date) {
              // Excel may return a Date representing time-only with year 1899
              if (timeCell.getFullYear() < 1900) {
                const d = new Date(dateObj);
                d.setHours(timeCell.getHours(), timeCell.getMinutes(), timeCell.getSeconds());
                return d;
              }
              // Full datetime provided
              return timeCell;
            }
            if (typeof timeCell === 'number') {
              const parsed = parsePolishDate(timeCell.toString());
              if (parsed) {
                // If parsed has year < 1900, treat as time-only
                if (parsed.getFullYear() < 1900) {
                  const d = new Date(dateObj);
                  d.setHours(parsed.getHours(), parsed.getMinutes(), parsed.getSeconds());
                  return d;
                }
                return parsed;
              }
              return null;
            }
            const timeStr = transformValue(timeCell?.toString?.() || '', transformations);
            // If timeStr contains a full date, combineDateAndTime will detect and return it
            return combineDateAndTime(dateObj.toISOString(), timeStr);
          };

          const dateObj = getDateFromCell(row[indices.dateColumn]);
          const maybeStart = combineDateObjAndTime(dateObj, rawTimeCell);
          startTime = maybeStart;

          // End time: prefer explicit end time column if present, otherwise add default duration
          const rawEndCell = row[indices.endTime];
          const maybeEnd = rawEndCell !== undefined && rawEndCell !== null
            ? ( // try combining using same date
                ((rawEndCell as any) instanceof Date || typeof rawEndCell === 'number')
                  ? (((rawEndCell as any) instanceof Date) ? (rawEndCell as Date) : parsePolishDate((rawEndCell as any).toString()))
                  : combineDateObjAndTime(dateObj, rawEndCell)
              )
            : null;

          if (maybeEnd) {
            // If maybeEnd is a Date but appears to be time-only (year < 1900) and we have a base date, fix it
            if (maybeEnd.getFullYear && maybeEnd.getFullYear() < 1900 && dateObj) {
              const d = new Date(dateObj);
              d.setHours(maybeEnd.getHours(), maybeEnd.getMinutes(), maybeEnd.getSeconds());
              endTime = d;
            } else {
              endTime = maybeEnd as Date;
            }
          } else {
            endTime = startTime ? new Date(startTime.getTime() + 60 * 60 * 1000) : null; // +1 hour default
          }
        } else {
          // Parse start and end times directly. Cells can be Date/number/string.
          const rawStartCell = row[indices.startTime];
          const rawEndCell = row[indices.endTime];

          const parseCell = (cell: any): Date | null => {
            if (cell === undefined || cell === null || cell === '') return null;
            if (cell instanceof Date) return cell;
            if (typeof cell === 'number') return parsePolishDate(cell.toString());
            return parsePolishDate(transformValue(cell?.toString?.() || '', transformations));
          };

          startTime = parseCell(rawStartCell);
          endTime = parseCell(rawEndCell);
        }
        
        // Skip if date parsing failed
        if (!startTime || !endTime) {
          result.skippedDateError++;
          diagnostics.skippedRows++;
          diagnostics.errorBreakdown.dateParsingErrors++;
          // Zapisz pełną listę błędów (bez limitu)
          result.errors.push(`Wiersz ${actualRowIndex}: Błędny format daty (start: "${row[indices.startTime]}", end: "${row[indices.endTime]}")`);
          monitor.recordRowTime(performance.now() - rowStartTime);
          continue;
        }
          // Filtruj daty spoza zakresu 2000–2050
          const minYear = 2000;
          const maxYear = 2050;
          if (
            startTime.getFullYear() < minYear || startTime.getFullYear() > maxYear ||
            endTime.getFullYear() < minYear || endTime.getFullYear() > maxYear
          ) {
            result.skippedDateError++;
            diagnostics.skippedRows++;
            diagnostics.errorBreakdown.dateParsingErrors++;
            // Zapisz pełną listę błędów (bez limitu)
            result.errors.push(`Wiersz ${actualRowIndex}: Data poza zakresem (${minYear}–${maxYear}) (start: "${startTime.toLocaleString('pl-PL')}", end: "${endTime.toLocaleString('pl-PL')}")`);
            monitor.recordRowTime(performance.now() - rowStartTime);
            continue;
          }
        
        // Normalizuj daty - spróbuj naprawić typowe przypadki;
        // zaakceptuj przypadek end == start, ustawiając minimalny czas trwania 1 min.
        const startMs = startTime.getTime();
        let endMs = endTime.getTime();
        if (endMs < startMs) {
          endTime = normalizeEndAfterStart(startTime, endTime);
          diagnostics.dateNormalizations++;
          endMs = endTime.getTime();
          if (endMs < startMs) {
            endTime = new Date(startMs + 60 * 60 * 1000); // +1 godzina fallback
            endMs = endTime.getTime();
          }
        } else if (endMs === startMs) {
          endTime = new Date(startMs + 60 * 1000); // +1 minuta dla wizualizacji
          diagnostics.dateNormalizations++;
          endMs = endTime.getTime();
        }
        
        // Skip tylko jeśli po wszystkich próbach nadal end < start
        if (endMs < startMs) {
          result.skippedEndBeforeStart++;
          diagnostics.skippedRows++;
          diagnostics.errorBreakdown.dateNormalizationFailures++;
          // Zapisz pełną listę błędów (bez limitu)
          const startStr = startTime.toLocaleString('pl-PL');
          const endStr = endTime.toLocaleString('pl-PL');
          result.errors.push(`Wiersz ${actualRowIndex}: Nie udało się naprawić dat (start: ${startStr}, end: ${endStr})`);
          monitor.recordRowTime(performance.now() - rowStartTime);
          continue;
        }
        
        // Create operation object
        const operation: ProductionOperation = {
          id: uuidv4(),
          orderNo,
          resource,
          startTime,
          endTime,
          opNo: indices.opNo >= 0 ? transformValue(row[indices.opNo], transformations) : undefined,
          partNo: indices.partNo >= 0 ? transformValue(row[indices.partNo], transformations) : undefined,
          productName: indices.productName >= 0 ? transformValue(row[indices.productName], transformations) : undefined,
          qty: indices.qty >= 0 ? parseFloat(transformValue(row[indices.qty], transformations)) || undefined : undefined,
          operationId: indices.operationId >= 0 ? transformValue(row[indices.operationId], transformations) : undefined,
          sequence: indices.sequence >= 0 ? parseInt(transformValue(row[indices.sequence], transformations)) || undefined : undefined,
          notes: indices.notes >= 0 ? transformValue(row[indices.notes], transformations) : undefined
        };
        
        // Check for duplicates
        const key = generateOperationKey(operation);
        if (processedKeys.has(key)) {
          diagnostics.skippedRows++;
          diagnostics.errorBreakdown.duplicates++;
          monitor.recordRowTime(performance.now() - rowStartTime);
          continue; // Skip duplicate
        }
        processedKeys.add(key);
        
        result.operations.push(operation);
        result.parsedOK++;
        diagnostics.validOperations++;
        
      } catch (error) {
        diagnostics.skippedRows++;
        diagnostics.errorBreakdown.other++;
  // Zapisz pełną listę błędów (bez limitu)
  result.errors.push(`Wiersz ${actualRowIndex}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
      }
      
      monitor.recordRowTime(performance.now() - rowStartTime);
    }
    
    // Update progress with throttling and diagnostics
    const processed = Math.min(i + chunkSize, limitedRows.length);
    const now = performance.now();
    
    if (now - lastProgressUpdate > progressThrottle || processed === limitedRows.length) {
      diagnostics.performanceMetrics = monitor.getMetrics();
      
      reportProgress(
        onProgress,
        'validating',
        processed,
        limitedRows.length,
        diagnostics,
        result.errors
      );
      
      lastProgressUpdate = now;
    }
    
    // Force garbage collection hint every 5000 rows
    if (processed % 5000 === 0 && (window as any).gc) {
      (window as any).gc();
    }
    
    // Allow UI to update more frequently
    if (i % 500 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    // Performance warning
    const chunkTime = performance.now() - chunkStartTime;
    if (chunkTime > 1000) { // Chunk took more than 1 second
      console.warn(`Slow chunk processing: ${chunkTime.toFixed(2)}ms for ${chunk.length} rows`);
    }
  }
  
  // Final diagnostics report
  const totalTime = performance.now() - diagnostics.startTime;
  console.log('Import completed:', {
    totalTime: `${totalTime.toFixed(2)}ms`,
    totalRows: limitedRows.length,
    validOperations: diagnostics.validOperations,
    skippedRows: diagnostics.skippedRows,
    normalizations: diagnostics.dateNormalizations,
    avgRowTime: `${diagnostics.performanceMetrics.avgRowProcessingTime.toFixed(3)}ms`,
    errorBreakdown: diagnostics.errorBreakdown
  });
  
  return result;
}

// Generate header hash for profile matching
export function generateHeaderHash(headers: string[]): string {
  const normalized = headers
    .map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .sort()
    .join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(36);
}