// Simple IndexedDB helper for storing runtime operation metadata
export const RUNTIME_DB = 'planv22-runtime';
export const RUNTIME_STORE = 'runtime';
export const RUNTIME_KEY = 'control_ops_v1';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RUNTIME_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RUNTIME_STORE)) {
        db.createObjectStore(RUNTIME_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRuntimeData(data: Record<string, unknown>) {
  // Try server-side API first
  try {
    const res = await fetch('/api/runtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: RUNTIME_KEY, data })
    });
    if (res.ok) return;
  } catch {
    // ignore and fallback to indexedDB
  }

  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RUNTIME_STORE, 'readwrite');
    const store = tx.objectStore(RUNTIME_STORE);
    const req = store.put(data, RUNTIME_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadRuntimeData(): Promise<Record<string, unknown> | null> {
  // Try fetching from server API first
  try {
    const res = await fetch('/api/runtime');
    if (res.ok) {
      const json = await res.json();
      return json?.data ?? null;
    }
  } catch {
    // fallback to indexedDB
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RUNTIME_STORE, 'readonly');
    const store = tx.objectStore(RUNTIME_STORE);
    const req = store.get(RUNTIME_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

// Merge runtime meta into operations by composite key
export function runtimeKeyForOp(op: { orderNo: string; opNo?: string; resource: string; startTime: Date | string }) {
  // OrderNo+OpNo+Resource+Start (ISO)
  return `${op.orderNo}||${op.opNo||''}||${op.resource}||${new Date(op.startTime).toISOString()}`;
}

export function buildRuntimeMap<T>(runtimeData: Record<string, T> | null): Map<string, T> {
  if (!runtimeData) return new Map<string, T>();
  return new Map<string, T>(Object.entries(runtimeData) as [string, T][]);
}
