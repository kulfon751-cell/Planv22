import { useMemo, useState } from 'react';
import { Upload, Download, Trash2, Calendar, ZoomIn, ZoomOut, RotateCcw, HelpCircle, ListTree } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchBar } from './SearchBar';
import { useAppStore } from '@/store/app-store';
import { addDays, startOfDay, endOfDay } from 'date-fns';

interface ToolbarProps {
  onImport: () => void;
  onLoadDemo: () => void;
  onExport: (format: 'png' | 'pdf' | 'csv') => void;
  onClearData: () => void;
}

export function Toolbar({ onImport, onLoadDemo, onExport, onClearData }: ToolbarProps) {
  const { userRole, operations, viewState, updateViewState, setResourceOrder } = useAppStore();
  const isAdmin = userRole === 'admin';
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [tempOrder, setTempOrder] = useState<string[]>([]);
  const [showRangeDialog, setShowRangeDialog] = useState(false);
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');

  const availableResources = useMemo(() => {
    return Array.from(new Set(operations.map((op: { resource: string }) => op.resource))).sort();
  }, [operations]);

  const openOrderDialog = () => {
    const current = (viewState.resourceOrder && viewState.resourceOrder.length > 0)
      ? viewState.resourceOrder
      : availableResources;
    setTempOrder(current);
    setShowOrderDialog(true);
  };

  const moveItem = (from: number, to: number) => {
    setTempOrder(prev => {
      const arr = [...prev];
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return arr;
    });
  };

  const saveOrder = () => {
    setResourceOrder(tempOrder);
    setShowOrderDialog(false);
  };

  const openRangeDialog = () => {
    // Prefill from current viewState
    const s = viewState.startTime;
    const e = viewState.endTime;
    const toInput = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    };
    setRangeStart(toInput(s));
    setRangeEnd(toInput(e));
    setShowRangeDialog(true);
  };

  const applyRange = () => {
    if (!rangeStart || !rangeEnd) {
      setShowRangeDialog(false);
      return;
    }
    const s = new Date(rangeStart);
    const e = new Date(rangeEnd);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
      // Simple guard; keep dialog open if invalid
      return;
    }
    updateViewState({
      startTime: startOfDay(s),
      endTime: endOfDay(e)
    });
    setShowRangeDialog(false);
  };

  const handleZoomIn = () => {
    updateViewState({ 
      pixelsPerHour: Math.min(viewState.pixelsPerHour * 1.5, 300) 
    });
  };

  const handleZoomOut = () => {
    updateViewState({ 
      pixelsPerHour: Math.max(viewState.pixelsPerHour / 1.5, 30) 
    });
  };

  const handleTimeRangePreset = (preset: 'today' | '7days' | '30days') => {
    const now = new Date();
    let startTime: Date;
    let endTime: Date;

    switch (preset) {
      case 'today':
        startTime = startOfDay(now);
        endTime = endOfDay(now);
        break;
      case '7days':
        startTime = startOfDay(now);
        endTime = endOfDay(addDays(now, 7));
        break;
      case '30days':
        startTime = startOfDay(now);
        endTime = endOfDay(addDays(now, 30));
        break;
    }

    updateViewState({ startTime, endTime });
  };

  const handleResetView = () => {
    if (operations.length === 0) return;

    // Find data range
  const startTimes = operations.map((op: { startTime: Date }) => op.startTime.getTime());
  const endTimes = operations.map((op: { endTime: Date }) => op.endTime.getTime());
    
    const dataStart = new Date(Math.min(...startTimes));
    const dataEnd = new Date(Math.max(...endTimes));
    
    // Add 10% padding
    const totalMs = dataEnd.getTime() - dataStart.getTime();
    const padding = totalMs * 0.1;
    
    const paddedStart = new Date(dataStart.getTime() - padding);
    const paddedEnd = new Date(dataEnd.getTime() + padding);

    updateViewState({
      startTime: paddedStart,
      endTime: paddedEnd,
      pixelsPerHour: 60,
      selectedOrderIds: [],
      resourceFilters: [],
      partNoFilters: [],
      opNoFilters: []
    });
  };

  return (
    <div className="sticky top-16 z-30 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Main toolbar */}
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Import controls - Admin only */}
            <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-4">
              <Button
                size="sm"
                onClick={onImport}
                disabled={!isAdmin}
                className="flex items-center gap-2"
                title={!isAdmin ? 'Dostęp tylko dla administratora' : 'Załaduj dane CSV/XLSX'}
              >
                <Upload className="h-4 w-4" />
                Załaduj CSV/XLSX
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onLoadDemo}
                disabled={!isAdmin}
                title={!isAdmin ? 'Dostęp tylko dla administratora' : 'Załaduj dane demonstracyjne'}
              >
                Demo
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={onClearData}
                disabled={!isAdmin || operations.length === 0}
                title={!isAdmin ? 'Dostęp tylko dla administratora' : 'Wyczyść wszystkie dane'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* View controls */}
            <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-4 relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={viewState.pixelsPerHour <= 30}
                title="Pomniejsz"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-2 min-w-[60px] text-center">
                {viewState.pixelsPerHour.toFixed(0)}px/h
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={viewState.pixelsPerHour >= 300}
                title="Powiększ"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetView}
                disabled={operations.length === 0}
                title="Resetuj widok do zakresu danych"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              {/* Shortcuts helper */}
              <div
                onMouseEnter={() => setShowShortcuts(true)}
                onMouseLeave={() => setShowShortcuts(false)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  title="Skróty klawiszowe"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
              {showShortcuts && (
                <div className="absolute left-0 top-full mt-2 w-80 p-3 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm z-50">
                  <div className="font-medium mb-1 text-gray-900 dark:text-gray-100">Skróty Gantta</div>
                  <ul className="text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                    <li><span className="font-mono">Z</span> + kółko myszy — powiększ/pomniejsz</li>
                    <li><span className="font-mono">X</span> + kółko myszy — przewiń oś czasu (lewo/prawo)</li>
                    <li>Przyciski <span className="font-mono">-</span>/<span className="font-mono">+</span> — zoom</li>
                    <li><span className="font-mono">Reset</span> — dopasuj do zakresu danych</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Time range presets */}
            <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-4">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTimeRangePreset('today')}
              >
                Dziś
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTimeRangePreset('7days')}
              >
                7 dni
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTimeRangePreset('30days')}
              >
                30 dni
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={openRangeDialog}
                title="Wybierz zakres dat"
              >
                Zakres…
              </Button>
              <div className="ml-2" />
              <Button
                variant="secondary"
                size="sm"
                onClick={openOrderDialog}
                title="Ustal kolejność maszyn"
              >
                <ListTree className="h-4 w-4 mr-1" /> Kolejność maszyn
              </Button>
            </div>

            {/* Current time range display */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {viewState.startTime.toLocaleDateString('pl-PL')} - {viewState.endTime.toLocaleDateString('pl-PL')}
            </div>
          </div>

          {/* Export controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onExport('png')}
              disabled={operations.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PNG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onExport('pdf')}
              disabled={operations.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onExport('csv')}
              disabled={operations.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800">
        <SearchBar />
      </div>
      {/* Reorder machines dialog */}
      <OrderDialog
        open={showOrderDialog}
        onClose={() => setShowOrderDialog(false)}
        order={tempOrder}
        onMove={moveItem}
        onSave={saveOrder}
      />

      {/* Date range dialog */}
      <RangeDialog
        open={showRangeDialog}
        onClose={() => setShowRangeDialog(false)}
        startValue={rangeStart}
        endValue={rangeEnd}
        setStart={setRangeStart}
        setEnd={setRangeEnd}
        onApply={applyRange}
      />
    </div>
  );
}

// Prosty lekki dialog bez dodatkowych zależności
function OrderDialog({
  open,
  onClose,
  order,
  onMove,
  onSave
}: { open: boolean; onClose: () => void; order: string[]; onMove: (from: number, to: number) => void; onSave: () => void; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg w-full max-w-lg p-4 shadow-xl">
        <div className="text-lg font-semibold mb-3">Kolejność maszyn</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Przeciągaj pozycje (lub użyj przycisków), aby ustawić kolejność w widoku.</div>
        <ul className="space-y-2 max-h-96 overflow-auto">
          {order.map((res, idx) => (
            <li key={res} className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
              <span className="font-medium text-gray-900 dark:text-gray-100">{res}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => onMove(idx, Math.max(0, idx - 1))} disabled={idx === 0}>▲</Button>
                <Button size="sm" variant="secondary" onClick={() => onMove(idx, Math.min(order.length - 1, idx + 1))} disabled={idx === order.length - 1}>▼</Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button onClick={onSave}>Zapisz</Button>
        </div>
      </div>
    </div>
  );
}

function RangeDialog({
  open,
  onClose,
  startValue,
  endValue,
  setStart,
  setEnd,
  onApply
}: {
  open: boolean;
  onClose: () => void;
  startValue: string;
  endValue: string;
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
  onApply: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg w-full max-w-lg p-4 shadow-xl">
        <div className="text-lg font-semibold mb-3">Zakres dat</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Od</label>
            <input type="date" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                   value={startValue} onChange={e => setStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Do</label>
            <input type="date" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                   value={endValue} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button onClick={onApply}>Zastosuj</Button>
        </div>
      </div>
    </div>
  );
}