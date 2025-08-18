import { useEffect, useRef, useState } from 'react';
import type { ProductionOperation } from '@/lib/types';

type StatusResult = { id: string; status: string }[];
type ComputeParams = { ops: ProductionOperation[]; nowIso: string; shiftStartIso: string; shiftEndIso: string };

export function useStatusWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // instantiate worker
    workerRef.current = new Worker(new URL('../workers/status-worker.ts', import.meta.url));
    const w = workerRef.current;
    w.onmessage = (e: MessageEvent) => {
      const { result } = e.data as { result: StatusResult };
      const map: Record<string, string> = {};
      result.forEach((r) => { map[r.id] = r.status; });
      setStatuses(map);
    };
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  const compute = (ops: ProductionOperation[], now: Date, shiftStart: Date, shiftEnd: Date) => {
    if (!workerRef.current) return;
    const payload: ComputeParams = { ops, nowIso: now.toISOString(), shiftStartIso: shiftStart.toISOString(), shiftEndIso: shiftEnd.toISOString() };
    workerRef.current.postMessage(payload);
  };

  return { statuses, compute };
}
