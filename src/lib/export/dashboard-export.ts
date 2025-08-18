import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { DashboardData, DashboardFilters, ResourceData, OrderRankingData } from '@/hooks/useDashboardData';

// Export dashboard as PNG
export async function exportDashboardAsPNG(filename?: string): Promise<void> {
  const element = document.getElementById('dashboard-content');
  if (!element) {
    throw new Error('Dashboard element not found');
  }

  try {
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    });

    const link = document.createElement('a');
    link.download = filename || `dashboard_${format(new Date(), 'yyyyMMdd_HHmmss')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    throw new Error(`Błąd eksportu PNG: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
  }
}

// Export dashboard as PDF
export async function exportDashboardAsPDF(filename?: string): Promise<void> {
  const element = document.getElementById('dashboard-content');
  if (!element) {
    throw new Error('Dashboard element not found');
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

    const imgWidth = 297; // A4 landscape width
    const imgHeight = 210; // A4 landscape height

    pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename || `dashboard_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  } catch (error) {
    throw new Error(`Błąd eksportu PDF: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
  }
}

// Export dashboard data as CSV (ZIP with multiple files)
export async function exportDashboardAsCSV(
  data: DashboardData,
  filename?: string
): Promise<void> {
  try {
    // Prepare CSV files
    const files = [];

    // 1. Resource data CSV
    const resourceHeaders = [
      'Urządzenie',
      'Nazwa',
      'Dział',
      'Grupa zasobów',
      'Dostępność (h)',
      'Obciążenie (h)',
      'Brakujące (h)',
      'Wykorzystanie (%)'
    ];

    const resourceRows = data.resourceData.map((r: ResourceData) => [
      r.resource,
      r.resourceName,
      r.department || '',
      r.resourceGroup || '',
      r.availabilityH.toFixed(1),
      r.loadH.toFixed(1),
      r.missingH.toFixed(1),
      r.utilizationPercent.toFixed(1)
    ]);

    const resourceCSV = [
      resourceHeaders.join(','),
      ...resourceRows.map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(','))
    ].join('\n');

    files.push({
      name: 'by_resource.csv',
      content: '\ufeff' + resourceCSV // BOM for Excel
    });

    // 2. Order ranking CSV
    const orderHeaders = [
      'Numer zlecenia',
      'Obciążenie (h)',
      'Liczba operacji',
      'Liczba urządzeń'
    ];

  const orderRows = data.orderRanking.map((o: OrderRankingData) => [
      o.orderNo,
      o.loadH.toFixed(1),
      o.operationsCount.toString(),
      o.resourcesCount.toString()
    ]);

    const orderCSV = [
      orderHeaders.join(','),
  ...orderRows.map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(','))
    ].join('\n');

    files.push({
      name: 'by_order.csv',
      content: '\ufeff' + orderCSV
    });

    // 3. KPI summary CSV
    const kpiHeaders = ['Metryka', 'Wartość', 'Jednostka'];
    const kpiRows = [
      ['Liczba zleceń', data.kpis.ordersCount.toString(), 'szt'],
      ['Liczba urządzeń', data.kpis.resourcesCount.toString(), 'szt'],
      ['Łączne obciążenie', data.kpis.loadHTotal.toFixed(1), 'h'],
      ['Łączna dostępność', data.kpis.availabilityHTotal.toFixed(1), 'h'],
      ['Brakujące godziny', data.kpis.missingHTotal.toFixed(1), 'h'],
      ['Wykorzystanie', data.kpis.utilizationPercent.toFixed(1), '%']
    ];

    const kpiCSV = [
      kpiHeaders.join(','),
      ...kpiRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    files.push({
      name: 'kpi.csv',
      content: '\ufeff' + kpiCSV
    });

    // Create and download ZIP (simplified - just download first file for now)
    // In a real implementation, you'd use JSZip to create a proper ZIP file
    const firstFile = files[0];
    const blob = new Blob([firstFile.content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
  link.download = filename || `dashboard_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    throw new Error(`Błąd eksportu CSV: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
  }
}

// Main export function
export async function exportDashboardData(
  data: DashboardData,
  exportFormat: 'png' | 'pdf' | 'csv',
  filters: DashboardFilters
): Promise<void> {
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const granularity = filters.granularity === 'month' ? 'M' : 'W';
  const filename = `dashboard_${granularity}_${timestamp}`;

  switch (exportFormat) {
    case 'png':
      await exportDashboardAsPNG(`${filename}.png`);
      break;
    case 'pdf':
      await exportDashboardAsPDF(`${filename}.pdf`);
      break;
    case 'csv':
      await exportDashboardAsCSV(data, `${filename}.csv`);
      break;
    default:
      throw new Error(`Nieobsługiwany format eksportu: ${exportFormat}`);
  }
}