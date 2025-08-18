// Worker: compute statuses for a batch of operations
type Op = { id: string; blocked?: { flag: boolean } | null; actualEnd?: string | Date | null; actualStart?: string | Date | null; startTime: string | Date; endTime: string | Date };
type Incoming = { ops: Op[]; nowIso: string; shiftStartIso: string; shiftEndIso: string };

self.onmessage = function (e: MessageEvent<Incoming>) {
  const { ops, nowIso, shiftStartIso, shiftEndIso } = e.data;
  const now = new Date(nowIso);
  const shiftStart = new Date(shiftStartIso);
  const shiftEnd = new Date(shiftEndIso);

  function compute(op: Op) {
    if (op.blocked && op.blocked.flag) return 'BLOCKED';
    if (op.actualEnd) return 'DONE';
    if (op.actualStart) return 'IN_PROGRESS';
    const start = new Date(op.startTime);
    const end = new Date(op.endTime);
    if (now >= shiftStart && now <= shiftEnd && start >= shiftStart && start <= shiftEnd) return 'DUE_NOW';
    if (now > end) return 'LATE';
    return 'PLANNED';
  }

  const result = ops.map((op) => ({ id: op.id, status: compute(op) }));
  postMessage({ result });
};
