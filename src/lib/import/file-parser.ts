import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ImportProgress } from '@/lib/types';

export interface ParsedData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  encoding?: string;
  separator?: string;
  sheetName?: string;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  sheets?: string[];
}

// Detect CSV separator
export function detectSeparator(sample: string): string {
  const separators = [',', ';', '\t', '|'];
  const counts = separators.map(sep => (sample.match(new RegExp(sep, 'g')) || []).length);
  const maxIndex = counts.indexOf(Math.max(...counts));
  return separators[maxIndex] || ',';
}

// Detect encoding from BOM
export function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  
  // UTF-8 BOM
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8';
  }
  
  // UTF-16 LE BOM
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-16le';
  }
  
  // UTF-16 BE BOM
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'utf-16be';
  }
  
  // Default to UTF-8, fallback to Windows-1250 if needed
  return 'utf-8';
}

// Parse CSV file with streaming
export async function parseCSVFile(
  file: File,
  onProgress: (progress: ImportProgress) => void,
  signal?: AbortSignal
): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Import anulowany'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const sample = text.slice(0, 1000);
        const separator = detectSeparator(sample);
        
        let processedRows = 0;
        const allRows: string[][] = [];
        let headers: string[] = [];
        
        Papa.parse(text, {
          delimiter: separator,
          header: false,
          skipEmptyLines: true,
          // Explicitly type to avoid implicit any errors
          chunk: (results: any, parser: any) => {
            if (signal?.aborted) {
              parser.abort();
              reject(new Error('Import anulowany'));
              return;
            }
            
            const rows = results.data as string[][];
            
            if (processedRows === 0 && rows.length > 0) {
              headers = rows[0].map(h => h?.toString().trim() || '');
              allRows.push(...rows.slice(1));
              processedRows += rows.length - 1;
            } else {
              allRows.push(...rows);
              processedRows += rows.length;
            }
            
            onProgress({
              stage: 'parsing',
              progress: Math.min(95, (processedRows / (file.size / 100)) * 100),
              processedRows,
              totalRows: processedRows,
              errors: [],
              canCancel: true
            });
          },
          complete: () => {
            resolve({
              headers,
              rows: allRows,
              totalRows: allRows.length,
              separator,
              encoding: 'utf-8'
            });
          },
          error: (error: any) => {
            reject(new Error(`Błąd parsowania CSV: ${error.message}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Błąd odczytu pliku'));
    reader.readAsText(file, 'utf-8');
  });
}

// Parse Excel file
export async function parseExcelFile(
  file: File,
  sheetName?: string,
  headerRow: number = 1,
  onProgress?: (progress: ImportProgress) => void,
  signal?: AbortSignal
): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Import anulowany'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        onProgress?.({
          stage: 'parsing',
          progress: 50,
          processedRows: 0,
          totalRows: 0,
          errors: [],
          canCancel: true
        });

        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const targetSheet = sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[targetSheet];
        
        if (!worksheet) {
          reject(new Error(`Arkusz "${targetSheet}" nie został znaleziony`));
          return;
        }
        
        // Convert to array of arrays
          // Use raw: true and cellDates: true so we get JS Date objects or serial numbers
          // instead of locale-formatted strings which are ambiguous.
          // sheet_to_json typings don't include cellDates in some versions; cast opts to any
          const jsonData = XLSX.utils.sheet_to_json(worksheet, ({
            header: 1,
            defval: '',
            raw: true,
            cellDates: true
          } as any)) as any[][];
        
        if (jsonData.length === 0) {
          reject(new Error('Arkusz jest pusty'));
          return;
        }
        
        // Extract headers from specified row
        const headers = jsonData[headerRow - 1]?.map(h => h?.toString().trim() || '') || [];
        const rows = jsonData.slice(headerRow);
        
        onProgress?.({
          stage: 'parsing',
          progress: 100,
          processedRows: rows.length,
          totalRows: rows.length,
          errors: [],
          canCancel: false
        });
        
        resolve({
          headers,
          rows,
          totalRows: rows.length,
          sheetName: targetSheet
        });
      } catch (error) {
        reject(new Error(`Błąd parsowania Excel: ${error instanceof Error ? error.message : 'Nieznany błąd'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Błąd odczytu pliku'));
    reader.readAsArrayBuffer(file);
  });
}

// Get file info including sheets for Excel files
export async function getFileInfo(file: File): Promise<FileInfo> {
  const info: FileInfo = {
    name: file.name,
    size: file.size,
    type: file.type
  };
  
  if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xlsm')) {
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      info.sheets = workbook.SheetNames;
    } catch (error) {
      console.warn('Could not read Excel sheets:', error);
    }
  }
  
  return info;
}