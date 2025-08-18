import { FieldMapping } from './types';

// Normalize header names for mapping detection
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (match) => {
      const map: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
        'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'
      };
      return map[match] || match;
    })
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const FIELD_ALIASES: Partial<Record<keyof FieldMapping, string[]>> = {
  orderNo: [
    'order no', 'order no.', 'order_no', 'orderno', 'id', 'order id',
    'zlecenie', 'numer zlecenia', 'nr zlecenia'
  ],
  resource: [
    'resource', 'machine', 'workcenter', 'workstation', 'work station',
    'maszyna', 'stanowisko', 'gniazdo', 'zasoby'
  ],
  startTime: [
    'start', 'start time', 'start_time', 'startdate', 'start date', 
    'from', 'poczatek', 'początek', 'od', 'data rozpoczecia'
  ],
  endTime: [
    'end', 'end time', 'end_time', 'enddate', 'end date', 
    'to', 'koniec', 'do', 'data zakonczenia'
  ],
  opNo: [
    'op', 'op no', 'op. no.', 'op_no', 'operation', 'operacja', 'nr operacji'
  ],
  partNo: [
    'part', 'partno', 'part no', 'part_no', 'nr partii', 'part number',
    'partia', 'batch', 'lot'
  ],
  productName: [
    'product', 'product name', 'produkt', 'nazwa produktu'
  ],
  qty: [
    'qty', 'quantity', 'ilosc', 'ilość', 'count', 'amount', 'ile'
  ],
  operationId: [
    'operation id', 'op id', 'operation_id', 'op_id'
  ],
  sequence: [
    'sequence', 'seq', 'kolejnosc', 'kolejność', 'porządek'
  ],
  notes: [
    'notes', 'note', 'uwagi', 'opis', 'komentarz', 'remarks'
  ],
  // Optional date/time split columns
  dateColumn: [
    'date', 'data', 'data operacji', 'dzien'
  ],
  timeColumn: [
    'time', 'czas', 'godzina', 'godz'
  ]
};

export function detectFieldMapping(headers: string[]): Partial<FieldMapping> {
  const mapping: Partial<FieldMapping> = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      if (aliases.some(alias => header.includes(alias) || alias.includes(header))) {
        (mapping as any)[field] = headers[i];
        break;
      }
    }
  }

  return mapping;
}

export function validateFieldMapping(mapping: FieldMapping): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!mapping.orderNo) errors.push('Pole "Numer zlecenia" jest wymagane');
  if (!mapping.resource) errors.push('Pole "Zasób/Maszyna" jest wymagane');
  if (!mapping.startTime) errors.push('Pole "Data rozpoczęcia" jest wymagane');
  if (!mapping.endTime) errors.push('Pole "Data zakończenia" jest wymagane');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Create default mapping profile
export function createDefaultMapping(): FieldMapping {
  return {
    orderNo: '',
    resource: '',
    startTime: '',
    endTime: '',
    opNo: '',
    partNo: '',
  productName: '',
    qty: '',
    operationId: '',
    sequence: '',
    notes: ''
  };
}

// Check if two mappings are equivalent
export function areMappingsEqual(a: FieldMapping, b: FieldMapping): boolean {
  const keys = Object.keys(a) as (keyof FieldMapping)[];
  return keys.every(key => a[key] === b[key]);
}