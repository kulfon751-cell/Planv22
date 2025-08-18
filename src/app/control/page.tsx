"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { ProductionOperation } from '@/lib/types';
import { differenceInMinutes, isWithinInterval } from 'date-fns';
import { loadRuntimeData, saveRuntimeData, runtimeKeyForOp, buildRuntimeMap } from '@/lib/runtime-persistence';
import { useRouter } from 'next/navigation';
import { exportOperationsAsCSV, generateExportFilename, generateControlExportFilename, exportElementAsPNG, exportElementAsPDF } from '@/lib/export/export-utils';
import { useStatusWorker } from '@/hooks/useStatusWorker';
import { FixedSizeList } from 'react-window';

function computeStatus(op: ProductionOperation, now: Date, shiftWindow?: { start: Date; end: Date }) {
  if (op.blocked && op.blocked.flag) return 'BLOCKED';
  if (op.actualEnd) return 'DONE';
  if (op.actualStart) return 'IN_PROGRESS';
  if (shiftWindow && isWithinInterval(now, { start: shiftWindow.start, end: shiftWindow.end }) && isWithinInterval(op.startTime, { start: shiftWindow.start, end: shiftWindow.end })) {
    return 'DUE_NOW';
  }
  if (now > op.endTime) return 'LATE';
  return 'PLANNED';
}

export default function ControlPage() {
  const { operations, userRole, setOperations, viewState } = useAppStore();
  const [now, setNow] = useState<Date>(new Date());
  type RuntimeMeta = { actualStart?: string; actualEnd?: string; blocked?: { flag: boolean; note?: string } };
  const [runtimeMap, setRuntimeMap] = useState<Map<string, RuntimeMeta>>(new Map());
  const [tab, setTab] = useState<'today' | 'week' | 'late' | 'inprogress' | 'kanban'>('today');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadRuntimeData();
        setRuntimeMap(buildRuntimeMap<RuntimeMeta>(data as Record<string, RuntimeMeta> | null));
      } catch {
        // ignore load errors
      }
    })();
  }, []);

  // default shift window: day (00:00 - 23:59)
  const shiftWindow = useMemo(() => ({ start: new Date(new Date().setHours(0, 0, 0, 0)), end: new Date(new Date().setHours(23, 59, 59, 999)) }), []);

  const [shift, setShift] = useState<'I'|'II'|'III'>(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 14) return 'I';
    if (h >= 14 && h < 22) return 'II';
    return 'III';
  });

  // Filters
  const [onlySelected, setOnlySelected] = useState(false);
  const [search, setSearch] = useState('');
  const [resourceFilters, setResourceFilters] = useState<string[]>([]);
  const [partFilters, setPartFilters] = useState<string[]>([]);

  // shift windows presets
  const shiftWindows = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    return {
      I: { start: new Date(y, m, day, 6, 0, 0, 0), end: new Date(y, m, day, 13, 59, 59, 999) },
      II: { start: new Date(y, m, day, 14, 0, 0, 0), end: new Date(y, m, day, 21, 59, 59, 999) },
      III: { start: new Date(y, m, day, 22, 0, 0, 0), end: new Date(y, m, day + 1, 5, 59, 59, 999) },
      All: shiftWindow
    };
  }, [shiftWindow]);

  const activeWindow = shiftWindows[shift] || shiftWindow;

  const filteredBase = useMemo(() => {
    let ops = operations as ProductionOperation[];
    // window filter
    ops = ops.filter(op => !(op.endTime < activeWindow.start || op.startTime > activeWindow.end));
    // only selected from planner
    if (onlySelected && viewState.selectedOrderIds.length > 0) {
      ops = ops.filter(op => viewState.selectedOrderIds.includes(op.orderNo));
    }
    // search
    const q = search.trim().toLowerCase();
    if (q) {
      ops = ops.filter(op =>
        op.orderNo.toLowerCase().includes(q) ||
        (op.opNo || '').toLowerCase().includes(q) ||
        (op.partNo || '').toLowerCase().includes(q)
      );
    }
    // resource filters
    if (resourceFilters.length) ops = ops.filter(op => resourceFilters.includes(op.resource));
    // part filters
    if (partFilters.length) ops = ops.filter(op => (op.partNo ? partFilters.includes(op.partNo) : false));
    return ops;
  }, [operations, activeWindow, onlySelected, viewState.selectedOrderIds, search, resourceFilters, partFilters]);

  const opsToday = filteredBase;

  const { statuses, compute } = useStatusWorker();

  useEffect(() => {
    compute(opsToday, now, shiftWindow.start, shiftWindow.end);
  }, [opsToday, now, shiftWindow, compute]);

  type OpWithStatus = { op: ProductionOperation; status: string };
  const withStatus: OpWithStatus[] = useMemo(() => opsToday.map((op: ProductionOperation) => {
    const key = runtimeKeyForOp(op);
    const meta = runtimeMap.get(key) || {};
    const merged: ProductionOperation = {
      ...op,
      actualStart: meta.actualStart ? new Date(meta.actualStart) : op.actualStart,
      actualEnd: meta.actualEnd ? new Date(meta.actualEnd) : op.actualEnd,
      blocked: meta.blocked ?? op.blocked
    };
    const status = statuses[op.id] || computeStatus(merged, now, shiftWindow);
    return { op: merged, status };
  }), [opsToday, now, shiftWindow, runtimeMap, statuses]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = { PLANNED: 0, DUE_NOW: 0, LATE: 0, IN_PROGRESS: 0, DONE: 0, BLOCKED: 0 };
    withStatus.forEach((s: OpWithStatus) => acc[s.status] = (acc[s.status] || 0) + 1);
    return acc;
  }, [withStatus]);

  const persistRuntimeChange = async (op: ProductionOperation, changes: Record<string, unknown>) => {
    try {
    const key = runtimeKeyForOp(op);
  const data: Record<string, RuntimeMeta> = Object.fromEntries(runtimeMap.entries());
  data[key] = { ...(data[key] || {}), ...changes } as RuntimeMeta;
      await saveRuntimeData(data);
  setRuntimeMap(buildRuntimeMap<RuntimeMeta>(data));
  } catch {
      // ignore
    }
  };

  const blockOp = (opId: string, note?: string) => {
    if (userRole !== 'admin') return;
    const idx = operations.findIndex((o: ProductionOperation) => o.id === opId);
    if (idx === -1) return;
    const updated = [...operations];
    updated[idx] = { ...updated[idx], blocked: { flag: true, note } };
    setOperations(updated);
    persistRuntimeChange(updated[idx], { blocked: { flag: true, note } });
  };

  const unblockOp = (opId: string) => {
    if (userRole !== 'admin') return;
    const idx = operations.findIndex((o: ProductionOperation) => o.id === opId);
    if (idx === -1) return;
    const updated = [...operations];
    updated[idx] = { ...updated[idx], blocked: null };
    setOperations(updated);
    persistRuntimeChange(updated[idx], { blocked: null });
  };

  const startOp = (opId: string) => {
    if (userRole !== 'admin') return;
    const idx = operations.findIndex((o: ProductionOperation) => o.id === opId);
    if (idx === -1) return;
    const nowDate = new Date();
    const updated = [...operations];
    updated[idx] = { ...updated[idx], actualStart: nowDate };
    setOperations(updated);
    persistRuntimeChange(updated[idx], { actualStart: nowDate.toISOString() });
  };

  const endOp = (opId: string) => {
    if (userRole !== 'admin') return;
    const idx = operations.findIndex((o: ProductionOperation) => o.id === opId);
    if (idx === -1) return;
    const nowDate = new Date();
    const updated = [...operations];
    updated[idx] = { ...updated[idx], actualEnd: nowDate };
    setOperations(updated);
    persistRuntimeChange(updated[idx], { actualEnd: nowDate.toISOString() });
  };

  const router = useRouter();

  const showInPlanner = (op: ProductionOperation) => {
    // set view to around operation and navigate
    const paddingMs = 60 * 60 * 1000; // 1h padding
    const newView = {
      startTime: new Date(op.startTime.getTime() - paddingMs),
      endTime: new Date(op.endTime.getTime() + paddingMs),
      pixelsPerHour: 60,
      selectedOrderIds: [op.orderNo],
      searchQuery: '',
      resourceFilters: [op.resource],
      partNoFilters: [],
      opNoFilters: []
    };
    // update store and navigate
  useAppStore.getState().updateViewState(newView);
    router.push('/planner');
  };

  // Kanban columns builder
  const kanbanColumns: Record<string, OpWithStatus[]> = useMemo(() => {
    const cols: Record<string, OpWithStatus[]> = { DUE_NOW: [], IN_PROGRESS: [], ZAGROZONE: [], LATE: [], DONE: [] };
    withStatus.forEach(s => {
      if (s.status === 'DUE_NOW') cols.DUE_NOW.push(s);
      else if (s.status === 'IN_PROGRESS') cols.IN_PROGRESS.push(s);
      else if (s.status === 'LATE') cols.LATE.push(s);
      else if (s.status === 'DONE') cols.DONE.push(s);
      else if (s.status === 'PLANNED' && differenceInMinutes(s.op.endTime, now) <= 120 && s.op.endTime > now) cols.ZAGROZONE.push(s);
      else if (s.status === 'PLANNED') cols.DUE_NOW.push(s); // fallback
    });
    return cols;
  }, [withStatus, now]);


  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Zarządzanie i kontrola produkcji</h2>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('today')} className={`px-3 py-1 rounded ${tab === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Dziś</button>
        <button onClick={() => setTab('week')} className={`px-3 py-1 rounded ${tab === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Tydzień</button>
        <button onClick={() => setTab('late')} className={`px-3 py-1 rounded ${tab === 'late' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Zaległe</button>
  <button onClick={() => setTab('inprogress')} className={`px-3 py-1 rounded ${tab === 'inprogress' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>W toku</button>
  <button onClick={() => setTab('kanban')} className={`px-3 py-1 rounded ${tab === 'kanban' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Kanban</button>
      </div>

      {tab === 'today' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
              <div className="text-sm text-gray-500">Operacje dziś</div>
              <div className="text-3xl font-bold">{counts.PLANNED + counts.DUE_NOW + counts.IN_PROGRESS + counts.LATE + counts.DONE}</div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
              <div className="text-sm text-gray-500">W toku</div>
              <div className="text-3xl font-bold">{counts.IN_PROGRESS}</div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
              <div className="text-sm text-gray-500">Zaległe</div>
              <div className="text-3xl font-bold">{counts.LATE}</div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
              <div className="text-sm text-gray-500">Ryzyko opóźnień (≤2h)</div>
              <div className="text-3xl font-bold">{withStatus.filter(s => s.status !== 'DONE' && differenceInMinutes(s.op.endTime, now) <= 120 && s.op.endTime > now).length}</div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mb-4">
            <button onClick={() => {
              const filename = generateExportFilename('csv', viewState, []);
              exportOperationsAsCSV(operations, filename, viewState);
            }} className="px-3 py-1 bg-blue-600 text-white rounded">Eksport CSV (Dziś)</button>
            <button onClick={() => exportElementAsPNG('control-view', generateControlExportFilename('png','today', shift))} className="px-3 py-1 bg-gray-700 text-white rounded">PNG</button>
            <button onClick={() => exportElementAsPDF('control-view', generateControlExportFilename('pdf','today', shift))} className="px-3 py-1 bg-gray-700 text-white rounded">PDF</button>
          </div>

          <div className="mb-4 sticky top-24 bg-transparent z-10">
            <div className="flex gap-3 items-center">
              <div className="text-sm text-gray-600">Zmiana:</div>
              <select value={shift} onChange={(e) => setShift(e.target.value as 'I'|'II'|'III')} className="px-2 py-1 border rounded">
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
              </select>

              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Szukaj Order/Op/Part" className="px-2 py-1 border rounded flex-1" />

              <label className="flex items-center gap-2"><input type="checkbox" checked={onlySelected} onChange={e => setOnlySelected(e.target.checked)} /> Tylko z Planner</label>
            </div>
          </div>

          <div id="control-view">
            <h3 className="text-lg font-medium mb-2">Kolejka dzienna</h3>
            <div style={{ height: 400 }}>
              <FixedSizeList
                height={400}
                itemCount={withStatus.length}
                itemSize={84}
                width={'100%'}
              >
                {({ index, style }) => {
                  const { op, status } = withStatus.sort((a, b) => a.op.startTime.getTime() - b.op.startTime.getTime())[index];
                  return (
                    <div style={style} key={op.id} className="p-3 bg-white dark:bg-gray-800 rounded shadow flex items-center justify-between m-2">
                      <div>
                        <div className="text-sm text-gray-500">{status}</div>
                        <div className="font-medium">{op.orderNo} • {op.opNo} • {op.partNo} • {op.resource}</div>
                        <div className="text-sm text-gray-500">{op.startTime.toLocaleString()} – {op.endTime.toLocaleString()} • Δ {differenceInMinutes(op.endTime, op.startTime)} min • Qty: {op.qty ?? ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => showInPlanner(op)} className="text-sm px-3 py-1 bg-gray-200 rounded">Pokaż w Plannerze</button>
                        {userRole === 'admin' && (
                          <>
                            <button onClick={() => startOp(op.id)} className="text-sm px-3 py-1 bg-orange-500 text-white rounded">Start</button>
                            <button onClick={() => endOp(op.id)} className="text-sm px-3 py-1 bg-green-600 text-white rounded">Zakończ</button>
                            {op.blocked?.flag ? (
                              <button onClick={() => unblockOp(op.id)} className="text-sm px-3 py-1 bg-purple-600 text-white rounded">Odblokuj</button>
                            ) : (
                              <button onClick={() => blockOp(op.id)} className="text-sm px-3 py-1 bg-red-600 text-white rounded">Zablokuj</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                }}
              </FixedSizeList>
            </div>
          </div>
        </>
      )}

      {tab === 'week' && (
  <div id="control-view" className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="font-medium mb-2">Siatka tygodnia</h3>
          <div className="text-sm text-gray-500">Kliknij dzień, aby przejść do widoku Dziś dla wybranego dnia (placeholder)</div>
        </div>
      )}

      {tab === 'late' && (
  <div id="control-view" className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="font-medium mb-2">Zaległe</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>OrderNo</th>
                <th>OpNo</th>
                <th>Resource</th>
                <th>End plan</th>
                <th>Min po czasie</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {withStatus.filter(s => s.status === 'LATE').map(({ op }) => (
                <tr key={op.id} className="border-t">
                  <td>{op.orderNo}</td>
                  <td>{op.opNo}</td>
                  <td>{op.resource}</td>
                  <td>{op.endTime.toLocaleString()}</td>
                  <td>{Math.max(0, differenceInMinutes(now, op.endTime))} min</td>
                  <td><button onClick={() => showInPlanner(op)} className="px-2 py-1 bg-gray-200 rounded">Pokaż</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'inprogress' && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="font-medium mb-2">W toku</h3>
          <div style={{ height: 400 }}>
            <FixedSizeList height={400} itemCount={withStatus.filter(s => s.status === 'IN_PROGRESS').length} itemSize={64} width={'100%'}>
              {({ index, style }) => {
                const s = withStatus.filter(x => x.status === 'IN_PROGRESS')[index];
                const op = s.op;
                return (
                  <div style={style} key={op.id} className="p-2 border rounded flex justify-between m-2">
                    <div>{op.orderNo} • {op.opNo} • {op.resource}</div>
                    <div className="text-sm text-gray-500">Czas trwania: {Math.max(0, differenceInMinutes(now, op.actualStart || op.startTime))} min</div>
                  </div>
                );
              }}
            </FixedSizeList>
          </div>
        </div>
      )}

      {tab === 'kanban' && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="font-medium mb-2">Kanban (Dziś)</h3>
          <div className="grid grid-cols-5 gap-3">
            {['DUE_NOW','IN_PROGRESS','ZAGROZONE','LATE','DONE'].map(col => (
              <div key={col} className="p-2 border rounded">
                <div className="font-semibold mb-2">{col}</div>
                <div className="space-y-2">
                  {(kanbanColumns[col] || []).map(s => (
                    <div key={s.op.id} className="p-2 bg-gray-50 rounded">
                      <div className="text-sm font-medium">{s.op.orderNo} • {s.op.opNo}</div>
                      <div className="text-xs text-gray-500">{s.op.resource} • {s.op.startTime.toLocaleTimeString()} - {s.op.endTime.toLocaleTimeString()}</div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => showInPlanner(s.op)} className="px-2 py-1 text-xs bg-gray-200 rounded">Pokaż</button>
                        {userRole === 'admin' && <button onClick={() => startOp(s.op.id)} className="px-2 py-1 text-xs bg-orange-500 text-white rounded">Start</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
