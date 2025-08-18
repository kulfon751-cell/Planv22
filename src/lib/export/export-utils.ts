import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { format, differenceInMinutes } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ProductionOperation, ViewState } from '@/lib/types';

// Generate filename with timestamp and filters
export function generateExportFilename(
  exportFormat: 'png' | 'pdf' | 'csv',
  viewState: ViewState,
  selectedOrderIds?: string[]
): string {
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const dateRange = `${format(viewState.startTime, 'ddMM', { locale: pl })}-${format(viewState.endTime, 'ddMM', { locale: pl })}`;
  
  let orderPart = 'all';
  if (selectedOrderIds && selectedOrderIds.length > 0) {
    if (selectedOrderIds.length <= 3) {
      orderPart = selectedOrderIds.join('-');
    } else {
      orderPart = `${selectedOrderIds.length}orders`;
    }
  }
  
  return `plan_${dateRange}_${orderPart}_${timestamp}.${exportFormat}`;
}

// Generate filename for Control exports
export function generateControlExportFilename(
  exportFormat: 'png' | 'pdf' | 'csv',
  view: 'today' | 'week' | 'late' | 'inprogress' | 'kanban',
  shift?: 'I' | 'II' | 'III'
): string {
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const day = format(new Date(), 'yyyyMMdd', { locale: pl });
  const shiftPart = shift ? `_${shift}` : '';
  return `control_${view}_${day}${shiftPart}_${timestamp}.${exportFormat}`;
}

// Generic element export wrappers (can be used outside Gantt as well)
export const exportElementAsPNG = exportGanttAsPNG;
export const exportElementAsPDF = exportGanttAsPDF;

// Export Gantt chart as PNG
export async function exportGanttAsPNG(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element do eksportu nie został znaleziony');
  }

  try {
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      filter: (node) => {
        // Exclude scrollbars and other UI elements
        if (node.classList?.contains('scrollbar')) return false;
        return true;
      }
    });

    // Create download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    throw new Error(`Błąd eksportu PNG: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
  }
}

// Export Gantt chart as PDF
export async function exportGanttAsPDF(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element do eksportu nie został znaleziony');
  }

  try {
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 1,
      backgroundColor: '#ffffff'
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 297; // A4 landscape width in mm
    const imgHeight = 210; // A4 landscape height in mm

    pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  } catch (error) {
    throw new Error(`Błąd eksportu PDF: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
  }
}

// Export operations data as CSV
export function exportOperationsAsCSV(
  operations: ProductionOperation[],
  filename: string,
  viewState?: ViewState
): void {
  // Filter operations based on view state
  let filteredOps = operations;
  
  if (viewState) {
    if (viewState.selectedOrderIds.length > 0) {
      filteredOps = filteredOps.filter(op => viewState.selectedOrderIds.includes(op.orderNo));
    }
    
    if (viewState.resourceFilters.length > 0) {
      filteredOps = filteredOps.filter(op => viewState.resourceFilters.includes(op.resource));
    }
    
    if (viewState.partNoFilters.length > 0) {
      filteredOps = filteredOps.filter(op => op.partNo && viewState.partNoFilters.includes(op.partNo));
    }
    
    if (viewState.opNoFilters.length > 0) {
      filteredOps = filteredOps.filter(op => op.opNo && viewState.opNoFilters.includes(op.opNo));
    }
  }

  // Define CSV headers
  const headers = [
    'Numer zlecenia',
    'Nr operacji',
    'Nr partii',
    'Zasób',
    'Data rozpoczęcia',
    'Data zakończenia',
    'Ilość',
    'Czas trwania (min)',
    'ID operacji',
    'Kolejność',
    'Uwagi'
  ];

  // Convert operations to CSV rows
  const rows = filteredOps.map(op => [
    op.orderNo,
    op.opNo || '',
    op.partNo || '',
    op.resource,
    format(op.startTime, 'dd.MM.yyyy HH:mm', { locale: pl }),
    format(op.endTime, 'dd.MM.yyyy HH:mm', { locale: pl }),
    op.qty?.toString() || '',
    differenceInMinutes(op.endTime, op.startTime).toString(),
    op.operationId || '',
    op.sequence?.toString() || '',
    op.notes || ''
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Prepare Gantt element for export (hide scrollbars, etc.)
export function prepareGanttForExport(elementId: string): () => void {
  const element = document.getElementById(elementId);
  if (!element) return () => {};

  // Store original styles
  const originalStyles = new Map<Element, string>();
  
  // Hide scrollbars and other UI elements
  const elementsToHide = element.querySelectorAll('.scrollbar, .hover-only');
  elementsToHide.forEach(el => {
    originalStyles.set(el, (el as HTMLElement).style.display);
    (el as HTMLElement).style.display = 'none';
  });

  // Return cleanup function
  return () => {
    originalStyles.forEach((originalDisplay, el) => {
      (el as HTMLElement).style.display = originalDisplay;
    });
  };
}