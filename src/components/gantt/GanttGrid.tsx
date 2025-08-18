import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { format, startOfHour, addMinutes, startOfDay, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useAppStore } from '../../store/app-store';
import { packOperationsIntoLanes, LANE_HEIGHT, LANE_GAP, ROW_GAP } from '../../lib/lane-packing';
import { getResourceColor, getOrderColor } from '../../lib/colors';
import { GanttRow, ProductionOperation, RouteConnection } from '../../lib/types';
import { Modal } from '../ui/Modal';

const MACHINE_COLUMN_WIDTH = 300; // sticky sidebar width
const GUTTER = 8; // space between sidebar and timeline
const HOUR_MARKS_HEIGHT = 40;
const MIN_LABEL_SPACING_PX = 60;
const VIRTUALIZATION_THRESHOLD = 500; // manual virtualization kicks in over this

// ...

// Helpers to compute dynamic tick density based on px/hour
function getTickConfig(pxPerHour: number) {
  // Return step in minutes for minor and label ticks
  let minorMin = 60; // minutes
  let labelMin = 360; // minutes
  if (pxPerHour >= 480) { minorMin = 5; labelMin = 15; }
  else if (pxPerHour >= 240) { minorMin = 10; labelMin = 30; }
  else if (pxPerHour >= 120) { minorMin = 15; labelMin = 60; }
  else if (pxPerHour >= 60) { minorMin = 30; labelMin = 120; }
  else if (pxPerHour >= 30) { minorMin = 60; labelMin = 360; }
  else { minorMin = 360; labelMin = 1440; }

  // Enforce min label spacing in px
  const labelPx = (labelMin / 60) * pxPerHour;
  if (labelPx < MIN_LABEL_SPACING_PX) {
    const multiplier = Math.ceil(MIN_LABEL_SPACING_PX / labelPx);
    labelMin *= multiplier;
  }
  return { minorMin, labelMin };
}

export function GanttGrid() {
  const { operations, viewState, updateViewState, settings } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [keyZoomPressed, setKeyZoomPressed] = useState(false); // 'Z'
  const [keyPanPressed, setKeyPanPressed] = useState(false);   // 'X'
  const [scrollLeft, setScrollLeft] = useState(0);
  const [selectedOperation, setSelectedOperation] = useState<ProductionOperation | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate time range and dimensions
  const timeRange = useMemo(() => {
    const totalHours = Math.max(0, (viewState.endTime.getTime() - viewState.startTime.getTime()) / 3600000);
    const totalWidth = Math.max(totalHours * viewState.pixelsPerHour, 200);
    return { totalHours, totalWidth };
  }, [viewState]);

  const timelineOriginX = MACHINE_COLUMN_WIDTH + GUTTER;

  // Group operations by resource and pack into lanes
  const ganttRows = useMemo((): GanttRow[] => {
    const resourceMap = new Map<string, ProductionOperation[]>();

    // Apply filters
    let filteredOps = operations;

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

    // Sort operations w ramach marszruty według sequence/opNo/startTime
    filteredOps = filteredOps.slice().sort((a, b) => {
      // Najpierw sequence, potem opNo, potem startTime
      const seqA = a.sequence ?? (a.opNo ? parseInt(a.opNo) : 0);
      const seqB = b.sequence ?? (b.opNo ? parseInt(b.opNo) : 0);
      if (seqA !== seqB) return seqA - seqB;
      return a.startTime.getTime() - b.startTime.getTime();
    });

    // Group by resource
    filteredOps.forEach(op => {
      if (!resourceMap.has(op.resource)) {
        resourceMap.set(op.resource, []);
      }
      resourceMap.get(op.resource)!.push(op);
    });

    // Create rows with lane packing
    let currentTop = 0;
    let rows: GanttRow[] = [];

    for (const [resource, ops] of resourceMap.entries()) {
      const lanes = packOperationsIntoLanes(ops);
      const rowHeight = Math.max(lanes.length * LANE_HEIGHT + (lanes.length - 1) * LANE_GAP, LANE_HEIGHT);

      rows.push({
        resourceId: resource,
        resourceName: resource,
        top: currentTop,
        height: rowHeight,
        lanes
      });

      currentTop += rowHeight + ROW_GAP;
    }

    // Apply custom resource order if provided
    const order = viewState.resourceOrder && viewState.resourceOrder.length > 0 ? viewState.resourceOrder : null;
    if (order) {
      const index = new Map<string, number>();
      order.forEach((id: string, i: number) => index.set(id, i));
      rows.sort((a, b) => {
        const ai = index.has(a.resourceId) ? index.get(a.resourceId)! : Number.MAX_SAFE_INTEGER;
        const bi = index.has(b.resourceId) ? index.get(b.resourceId)! : Number.MAX_SAFE_INTEGER;
        return ai - bi || a.resourceName.localeCompare(b.resourceName);
      });
      // Recompute top positions after sorting
      currentTop = 0;
      rows = rows.map(r => {
        const out = { ...r, top: currentTop };
        currentTop += r.height + ROW_GAP;
        return out;
      });
    }

    return rows;
  }, [operations, viewState]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (ganttRows.length === 0) return 200;
    const lastRow = ganttRows[ganttRows.length - 1];
    return lastRow.top + lastRow.height + ROW_GAP;
  }, [ganttRows]);

  // Generate adaptive ticks/grid based on px/hour
  const ticks = useMemo(() => {
    const { minorMin, labelMin } = getTickConfig(viewState.pixelsPerHour);
    const start = startOfHour(viewState.startTime);
    const endHour = startOfHour(viewState.endTime);
    const result: { x: number; time: Date; type: 'minor' | 'label' }[] = [];

    // Walk in minor minute steps
    let t = start;
    while (t <= endHour) {
      const hoursFromStart = (t.getTime() - viewState.startTime.getTime()) / 3600000;
      const x = hoursFromStart * viewState.pixelsPerHour;
      const isLabel = ((t.getTime() - start.getTime()) / 60000) % labelMin === 0;
      result.push({ x, time: t, type: isLabel ? 'label' as const : 'minor' as const });
      t = addMinutes(t, minorMin);
    }
    return result;
  }, [viewState.startTime, viewState.endTime, viewState.pixelsPerHour]);

  // Day segments for parent axis (date) and month labels when spanning multiple months
  const daySegments = useMemo(() => {
    const segments: { x: number; width: number; time: Date }[] = [];
    let d = startOfDay(viewState.startTime);
    const end = viewState.endTime;
    while (d < end) {
      const next = addDays(d, 1);
      const x = ((d.getTime() - viewState.startTime.getTime()) / 3600000) * viewState.pixelsPerHour;
      const width = ((Math.min(next.getTime(), end.getTime()) - Math.max(d.getTime(), viewState.startTime.getTime())) / 3600000) * viewState.pixelsPerHour;
      segments.push({ x, width, time: d });
      d = next;
    }
    return segments;
  }, [viewState.startTime, viewState.endTime, viewState.pixelsPerHour]);

  // Current time line
  const currentTimePosition = useMemo(() => {
    const now = new Date();
    if (now < viewState.startTime || now > viewState.endTime) return null;
    const hoursFromStart = (now.getTime() - viewState.startTime.getTime()) / 3600000;
    return hoursFromStart * viewState.pixelsPerHour;
  }, [viewState]);

  // Generate route connections for selected orders
  const routeConnections = useMemo((): RouteConnection[] => {
    if (viewState.selectedOrderIds.length === 0) return [];
    
    const connections: RouteConnection[] = [];
    
    viewState.selectedOrderIds.forEach((orderNo: string) => {
      const orderOps = operations
        .filter((op: ProductionOperation) => op.orderNo === orderNo)
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0) || a.startTime.getTime() - b.startTime.getTime());
      
      for (let i = 0; i < orderOps.length - 1; i++) {
        connections.push({
          fromOperation: orderOps[i],
          toOperation: orderOps[i + 1],
          orderNo,
          color: getOrderColor(orderNo)
        });
      }
    });
    
    return connections;
  }, [operations, viewState.selectedOrderIds]);

  // Handle horizontal scroll synchronization
  const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollLeft(target.scrollLeft);
    setScrollTop(target.scrollTop);
  }, []);

  // Handle operation click
  const handleOperationClick = useCallback((operation: ProductionOperation) => {
    setSelectedOperation(operation);
  }, []);

  // Close modal
  const closeModal = () => {
    console.log('Modal zamykany');
    setSelectedOperation(null);
  };

  // Auto-fit view to selected operations
  const autoFitView = useCallback(() => {
    if (viewState.selectedOrderIds.length === 0) return;
    const selectedOps = operations.filter(op => viewState.selectedOrderIds.includes(op.orderNo));
    if (selectedOps.length === 0) return;

    const startTimes = selectedOps.map(op => op.startTime.getTime());
    const endTimes = selectedOps.map(op => op.endTime.getTime());

    const minStartMs = Math.min(...startTimes);
    const maxEndMs = Math.max(...endTimes);
    const durationMs = Math.max(0, maxEndMs - minStartMs);
    // padding in minutes: use settings.autoFitPadding as minimum, and 5% of duration as dynamic
    const minPadMin = typeof settings?.autoFitPadding === 'number' ? settings.autoFitPadding : 30;
    const dynamicPadMin = (durationMs / 3600000) * 0.05 * 60; // 5% of hours -> minutes
    const paddingMin = Math.max(minPadMin, dynamicPadMin);

    const paddedStart = new Date(minStartMs - paddingMin * 60 * 1000);
    const paddedEnd = new Date(maxEndMs + paddingMin * 60 * 1000);

  // Use the actual scrollable viewport width to compute available timeline space
  const viewportWidth = scrollRef.current?.clientWidth || containerRef.current?.clientWidth || 800;
  const availableWidth = Math.max(100, viewportWidth - (MACHINE_COLUMN_WIDTH + GUTTER));
    const durationHours = Math.max(0.1, (paddedEnd.getTime() - paddedStart.getTime()) / 3600000);
    const optimalPixelsPerHour = Math.max(30, Math.min(300, availableWidth / durationHours));

    updateViewState({
      startTime: paddedStart,
      endTime: paddedEnd,
      pixelsPerHour: optimalPixelsPerHour
    });

    // reset horizontal scroll to start of fitted range on next frame
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = 0;
      }
    });
  }, [operations, viewState.selectedOrderIds, updateViewState, settings]);

  // Keyboard shortcuts for zoom/pan (Z + wheel for zoom, X + wheel for pan)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'z') setKeyZoomPressed(true);
      if (e.key.toLowerCase() === 'x') setKeyPanPressed(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'z') setKeyZoomPressed(false);
      if (e.key.toLowerCase() === 'x') setKeyPanPressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const viewport = scrollRef.current;

    if (keyZoomPressed) {
      e.preventDefault();
      // Anchor zoom to cursor time under pointer
      const rect = viewport.getBoundingClientRect();
      const cursorX = e.clientX - rect.left; // x in viewport
      const timelineXInViewport = Math.max(0, cursorX - timelineOriginX);
      const contentX = viewport.scrollLeft + timelineXInViewport; // px from timeline origin

      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const next = Math.max(30, Math.min(300, viewState.pixelsPerHour * factor));
      if (next === viewState.pixelsPerHour) return;

      // time at cursor in hours relative to start
      const timeAtCursorHours = contentX / viewState.pixelsPerHour;
      // compute new scrollLeft so that timeAtCursor maps back to same cursorX
      const newContentX = timeAtCursorHours * next;
      let newScrollLeft = newContentX - timelineXInViewport;

      // clamp scrollLeft
      const maxScrollLeft = Math.max(0, timeRange.totalWidth - (viewport.clientWidth - timelineOriginX));
      newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft));

      updateViewState({ pixelsPerHour: next });
      // apply after a tick to ensure layout updates, but try immediately as well
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = newScrollLeft;
      });
      return;
    }
    if (keyPanPressed) {
      e.preventDefault();
      viewport.scrollLeft += e.deltaY * 2; // horizontal pan
      return;
    }
  }, [keyZoomPressed, keyPanPressed, viewState.pixelsPerHour, timelineOriginX, timeRange.totalWidth, updateViewState]);

  // Automatyczne dopasowanie widoku po zmianie selectedOrderIds
  useEffect(() => {
    if (viewState.selectedOrderIds.length > 0) {
      autoFitView();
    }
    (window as any).ganttAutoFit = autoFitView;
    return () => {
      delete (window as any).ganttAutoFit;
    };
  }, [autoFitView, viewState.selectedOrderIds]);

  // Manual virtualization window based on single viewport scroll
  const useVirtualization = ganttRows.length > VIRTUALIZATION_THRESHOLD;
  const visibleWindow = useMemo(() => {
    const vpH = scrollRef.current?.clientHeight || 800;
    const top = scrollTop;
    const bottom = top + vpH;
    const overscan = 600;
    return { top: Math.max(0, top - overscan), bottom: bottom + overscan };
  }, [scrollTop]);

  const visibleRows = useMemo(() => {
    if (!useVirtualization) return ganttRows;
    const { top, bottom } = visibleWindow;
    return ganttRows.filter(r => r.top + r.height >= top && r.top <= bottom);
  }, [ganttRows, useVirtualization, visibleWindow]);

  return (
    <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
      {/* Timeline header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex">
          {/* Machine column header */}
          <div 
            className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800 flex-shrink-0"
            style={{ width: MACHINE_COLUMN_WIDTH, height: HOUR_MARKS_HEIGHT }}
          >
            <div className="font-medium text-gray-900 dark:text-gray-100">Maszyna</div>
          </div>
          
          {/* Timeline header */}
          <div 
            className="flex-1 overflow-hidden border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            style={{ height: HOUR_MARKS_HEIGHT }}
          >
            <div 
              className="relative"
              style={{ 
                width: timeRange.totalWidth,
                transform: `translateX(-${scrollLeft}px)`
              }}
            >
              {/* Parent day segments background */}
              {daySegments.map((seg, idx) => (
                <div key={`day-${idx}`} className="absolute top-0 bottom-0" style={{ left: seg.x, width: seg.width }}>
                  <div className="absolute inset-y-0 left-0 w-px bg-gray-300/70 dark:bg-gray-600/70" />
                  <div className="absolute bottom-0 left-1 text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {format(seg.time, 'dd.MM.yyyy', { locale: pl })}
                  </div>
                </div>
              ))}
              {ticks.map((tick, idx) => (
                <div key={idx} className="absolute top-0 bottom-0" style={{ left: tick.x }}>
                  <div className={tick.type === 'label' ? 'h-full w-px bg-gray-300 dark:bg-gray-600' : 'h-2 w-px bg-gray-300/70 dark:bg-gray-600/70'} />
                  {tick.type === 'label' && (
                    <div className="absolute top-1 left-1 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {format(tick.time, 'dd.MM.yyyy HH:mm', { locale: pl })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div
        className="flex-1 overflow-auto"
        style={{ marginTop: HOUR_MARKS_HEIGHT }}
        onScroll={handleTimelineScroll}
        onWheel={onWheel}
        ref={scrollRef}
      >
        <div
          className="relative"
          style={{ width: Math.max(timelineOriginX + timeRange.totalWidth, containerRef.current?.clientWidth || 800), height: totalHeight }}
        >
          {/* Sticky machine sidebar */}
          <div
            className="sticky left-0 top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700"
            style={{ width: MACHINE_COLUMN_WIDTH, height: totalHeight }}
          >
            {visibleRows.map((row) => (
              <div
                key={`machine-${row.resourceId}`}
                className="absolute px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center"
                style={{ top: row.top, height: row.height, width: MACHINE_COLUMN_WIDTH }}
              >
                <div className="w-4 h-4 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: getResourceColor(row.resourceName) }} />
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{row.resourceName}</div>
              </div>
            ))}
          </div>

          {/* Timeline grid + content (clipped to start at origin) */}
          <div className="absolute top-0" style={{ left: timelineOriginX, width: timeRange.totalWidth, height: totalHeight, overflow: 'hidden' }}>
            {/* Grid background */}
            <div className="absolute inset-0">
              {ticks.map((tick, idx) => (
                <div
                  key={`grid-${idx}`}
                  className={`absolute top-0 bottom-0 ${tick.type === 'label' ? 'border-l border-gray-300 dark:border-gray-600' : 'border-l border-gray-100 dark:border-gray-700'}`}
                  style={{ left: tick.x }}
                />
              ))}
            </div>

            {/* Route connections */}
            <svg className="absolute inset-0 pointer-events-none z-10">
              {routeConnections.map((connection, index) => {
                const fromRow = ganttRows.find(r => r.resourceName === connection.fromOperation.resource);
                const toRow = ganttRows.find(r => r.resourceName === connection.toOperation.resource);
                if (!fromRow || !toRow) return null;
                const fromX = ((connection.fromOperation.endTime.getTime() - viewState.startTime.getTime()) / 3600000) * viewState.pixelsPerHour;
                const fromY = fromRow.top + LANE_HEIGHT / 2;
                const toX = ((connection.toOperation.startTime.getTime() - viewState.startTime.getTime()) / 3600000) * viewState.pixelsPerHour;
                const toY = toRow.top + LANE_HEIGHT / 2;
                return (
                  <line key={index} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={connection.color} strokeWidth="2" strokeDasharray="5,5" opacity="0.7" />
                );
              })}
            </svg>

            {/* Operations bars (manual virtualization) */}
            {visibleRows.map((row) => (
              <div key={`row-${row.resourceId}`} className="absolute" style={{ top: row.top, left: 0, right: 0, height: row.height }}>
                {row.lanes.map((lane, laneIndex) =>
                  lane.map((operation) => {
                    // positional math in px relative to timeline origin
                    const startPx = ((operation.startTime.getTime() - viewState.startTime.getTime()) / 3600000) * viewState.pixelsPerHour;
                    const endPx = ((operation.endTime.getTime() - viewState.startTime.getTime()) / 3600000) * viewState.pixelsPerHour;
                    const rawLeft = startPx;
                    const rawWidth = Math.max(endPx - startPx, 0);
                    const left = Math.max(0, rawLeft);
                    const width = Math.max(0, rawWidth - Math.max(0, -rawLeft)); // clamp to left boundary

                    const top = laneIndex * (LANE_HEIGHT + LANE_GAP);
                    const height = LANE_HEIGHT;

                    const isSelectedOrder = viewState.selectedOrderIds.includes(operation.orderNo);
                    const barColor = viewState.selectedOrderIds.length > 0 && isSelectedOrder
                      ? getOrderColor(operation.orderNo)
                      : getResourceColor(operation.resource);

                    const invalid = operation.endTime.getTime() <= operation.startTime.getTime();

                    return (
                      <button
                        key={operation.id}
                        role="button"
                        className="absolute rounded px-2 py-1 text-white text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-400"
                        style={{ left, top, width: Math.max(width, 2), height, backgroundColor: barColor }}
                        onClick={() => handleOperationClick(operation)}
                        title={`Zlecenie: ${operation.orderNo}${operation.opNo ? ` (${operation.opNo})` : ''} - ${operation.resource}\nProdukt: ${operation.productName ?? '—'}\nPart No.: ${operation.partNo ?? '—'}\n${format(operation.startTime, 'dd.MM.yyyy HH:mm')} - ${format(operation.endTime, 'dd.MM.yyyy HH:mm')}${invalid ? '\n⚠ Błędny zakres czasu' : ''}`}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            handleOperationClick(operation);
                          }
                        }}
                      >
                        <div className="truncate flex items-center gap-1">
                          {invalid && <span aria-hidden>⚠</span>}
                          <span className="truncate">
                            {operation.orderNo}
                            {operation.opNo && ` (${operation.opNo})`}
                            {operation.productName && ` • ${operation.productName}`}
                            {operation.partNo && ` • ${operation.partNo}`}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ))}

            {/* Current time line */}
            {currentTimePosition && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none" style={{ left: currentTimePosition }}>
                <div className="absolute -top-2 -left-1 w-3 h-3 bg-red-500 rounded-full" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for operation details */}
      {selectedOperation && (
        <Modal
          isOpen={!!selectedOperation}
          onClose={closeModal}
          title={`Informacje o zleceniu – ${selectedOperation.orderNo}`}
          size="lg"
        >
          {(() => {
            const start = selectedOperation.startTime;
            const end = selectedOperation.endTime;
            const durMs = Math.max(0, end.getTime() - start.getTime());
            const durH = (durMs / 3600000);
            const durHPretty = durH.toFixed(2).replace('.', ',');
            const durMin = Math.round(durMs / 60000);
            const partNo = selectedOperation.partNo ?? '—';
            const productName = selectedOperation.productName ?? '—';
            const resourceGroup = selectedOperation.resource ?? '—';
            return (
              <div className="space-y-4">
                {/* Produkt */}
                <div className="grid grid-cols-1">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Produkt</div>
                    <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100 break-all">{productName}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Part No.</div>
                    <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100 break-all">{partNo}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Resource Group Name</div>
                    <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{resourceGroup}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Czas trwania</div>
                    <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{durHPretty} h <span className="text-gray-500 dark:text-gray-400 font-normal">({durMin} min)</span></div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Maszyna</div>
                    <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{selectedOperation.resource}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Start</div>
                    <div className="mt-1 text-base font-medium text-gray-900 dark:text-gray-100">{format(start, 'dd.MM.yyyy HH:mm', { locale: pl })}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Koniec</div>
                    <div className="mt-1 text-base font-medium text-gray-900 dark:text-gray-100">{format(end, 'dd.MM.yyyy HH:mm', { locale: pl })}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}