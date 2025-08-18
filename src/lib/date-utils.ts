import { format, parse, isValid, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';

export const DATE_FORMATS = [
  // Dots
  'dd.MM.yyyy HH:mm:ss',
  'dd.MM.yyyy HH:mm',
  'dd.MM.yyyy',
  'd.M.yyyy HH:mm:ss',
  'd.M.yyyy HH:mm',
  'd.M.yyyy',
  // Dashes
  'dd-MM-yyyy HH:mm:ss',
  'dd-MM-yyyy HH:mm',
  'dd-MM-yyyy',
  'd-M-yyyy HH:mm:ss',
  'd-M-yyyy HH:mm',
  'd-M-yyyy',
  // Slashes
  'yyyy-MM-dd HH:mm:ss',
  'yyyy-MM-dd HH:mm',
  'yyyy-MM-dd',
  'dd/MM/yyyy HH:mm:ss',
  'dd/MM/yyyy HH:mm',
  'dd/MM/yyyy',
  'yyyy/MM/dd HH:mm:ss',
  'd/M/yyyy HH:mm:ss',
  'd/M/yyyy HH:mm',
  'd/M/yyyy',
  // Two-digit year variants (assume 2000–2068 per date-fns default cutoff)
  'dd.MM.yy HH:mm:ss',
  'dd.MM.yy HH:mm',
  'dd.MM.yy',
  'd.M.yy HH:mm:ss',
  'd.M.yy HH:mm',
  'd.M.yy',
  'dd-MM-yy HH:mm:ss',
  'dd-MM-yy HH:mm',
  'dd-MM-yy',
  'd-M-yy HH:mm:ss',
  'd-M-yy HH:mm',
  'd-M-yy',
  'dd/MM/yy HH:mm:ss',
  'dd/MM/yy HH:mm',
  'dd/MM/yy',
  'd/M/yy HH:mm:ss',
  'd/M/yy HH:mm',
  'd/M/yy'
];

export function parsePolishDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;
  
  let trimmed = dateString.trim();
  if (!trimmed) return null;

  // Normalize common separators between date and time:
  // - Replace comma between date and time with a space
  // - Remove stray dot after the year (often appears when comma was replaced with dot earlier)
  //   e.g., "10.01.25, 06:28:00" or "10.01.25. 06:28:00"
  trimmed = trimmed
    .replace(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s*[,.]\s*(?=\d{1,2}:\d{2})/, '$1 ')
    .replace(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\.(?=\s*\d{1,2}:\d{2})/, '$1 ')
    .replace(/\s+/, ' ');

  for (const formatStr of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, formatStr, new Date(), { locale: pl });
      if (isValid(parsed)) {
        // If date format without time, set to start of day
        if (!formatStr.includes('HH:mm')) {
          const d = startOfDay(parsed);
          // Normalize two-digit years to 2000+YY
          const y = d.getFullYear();
          if (y >= 0 && y < 100) {
            d.setFullYear(2000 + y);
          }
          return d;
        }
        // Normalize two-digit years to 2000+YY
        const y = parsed.getFullYear();
        if (y >= 0 && y < 100) {
          parsed.setFullYear(2000 + y);
        }
        return parsed;
      }
    } catch (error) {
      continue;
    }
  }

  // Try Excel date serial number
  const excelDate = parseFloat(dateString);
  if (!isNaN(excelDate) && excelDate > 0) {
    // Excel epoch starts from 1900-01-01, but has leap year bug
    // Excel treats 1900 as a leap year (it's not), so we need to adjust
    let daysSinceEpoch = excelDate;
    
    // If date is after Feb 28, 1900, subtract 1 day for Excel's leap year bug
    if (excelDate >= 60) {
      daysSinceEpoch = excelDate - 1;
    }
    
    // Excel epoch is 1900-01-01, but we calculate from 1899-12-30 (day 1 = 1900-01-01)
    const epochStart = new Date(1899, 11, 30); // December 30, 1899
    const result = new Date(epochStart.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
    
    // Ensure we have a valid date
    if (isValid(result) && result.getFullYear() > 1900 && result.getFullYear() < 2100) {
      return result;
    }
  }

  // Try parsing as timestamp (milliseconds)
  const timestamp = parseInt(dateString);
  if (!isNaN(timestamp) && timestamp > 946684800000) { // After year 2000
    const result = new Date(timestamp);
    if (isValid(result)) {
      return result;
    }
  }

  // Try parsing ISO string directly
  try {
    const isoDate = new Date(trimmed);
    if (isValid(isoDate) && !isNaN(isoDate.getTime())) {
      return isoDate;
    }
  } catch (error) {
    // Ignore ISO parsing errors
  }
  return null;
}

export function formatPolishDate(date: Date): string {
  return format(date, 'dd.MM.yyyy HH:mm', { locale: pl });
}

export function formatPolishTime(date: Date): string {
  return format(date, 'HH:mm', { locale: pl });
}

export function combineDateAndTime(dateStr: string, timeStr: string): Date | null {
  const baseDate = parsePolishDate(dateStr);
  if (!baseDate) return null;

  if (!timeStr || !timeStr.trim()) {
    return startOfDay(baseDate);
  }

  const trimmed = timeStr.trim();

  // If timeStr actually contains a full date (e.g. "09.10.2025 06:45"), parse it directly
  try {
    const parsedAsDate = parsePolishDate(trimmed);
    // Heuristic: if parsedAsDate exists and the string contains a date separator or space,
    // treat it as a full datetime and return it.
    if (parsedAsDate) {
      const looksLikeDate = /[.\-/]|\d{4}/.test(trimmed) || /\d{1,2}\.\d{1,2}\.\d{2,4}\s+\d{1,2}:/.test(trimmed);
      if (looksLikeDate) return parsedAsDate;
    }
  } catch (e) {
    // ignore and continue to time-only parsing
  }

  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!timeMatch) return startOfDay(baseDate);

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

  const result = startOfDay(baseDate);
  result.setHours(hours, minutes, seconds);
  return result;
}