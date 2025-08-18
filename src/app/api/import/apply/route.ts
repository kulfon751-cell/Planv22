import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { prisma } from '../../../../server/prisma'
import { writeAudit } from '../../../../server/audit/logger'
import { requireAll } from '../../../../server/security'

export async function POST(req: NextRequest) {
  const guard = requireAll(req, { role: 'admin' })
  if (guard) return guard
  try {
    const { searchParams } = new URL(req.url)
    const source = searchParams.get('source') || 'upload'
    const text = await req.text()
    const rows: any[] = []
    const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true })
    if (parsed.errors?.length) return NextResponse.json({ ok: false, error: 'Parse error' }, { status: 400 })
    rows.push(...(parsed.data as any[]))

    const txn = await prisma.$transaction(async (tx: any) => {
      // block concurrent import (postgres only)
      try { await tx.$executeRawUnsafe('SELECT pg_advisory_lock(1)') } catch {}
      let ok = 0, skipped = 0
      for (const r of rows) {
        try {
          // minimal mapping expectations: orderNo, resourceId, startTs, endTs
          if (!r.orderNo || !r.resourceId || !r.startTs || !r.endTs) { skipped++; continue }
          await tx.operation.create({ data: {
            orderNo: String(r.orderNo),
            resourceId: String(r.resourceId),
            startTs: new Date(r.startTs),
            endTs: new Date(r.endTs),
            opNo: r.opNo ? String(r.opNo) : null,
            partNo: r.partNo ? String(r.partNo) : null,
            qty: r.qty ? Number(r.qty) : null,
            sequence: r.sequence ? Number(r.sequence) : null,
          } })
          ok++
        } catch { skipped++ }
      }
      await tx.import.create({ data: { source, filename: 'upload.csv', rowsOk: ok, rowsSkipped: skipped } })
      try { await tx.$executeRawUnsafe('SELECT pg_advisory_unlock(1)') } catch {}
      return { ok, skipped }
    }, { timeout: 120_000 })

    globalThis.__PM_PLAN_BROADCAST__?.({ type: 'import.applied', payload: { rows_ok: txn.ok, rows_skipped: txn.skipped } })
    await writeAudit({ action: 'import.apply', entity: 'import', entityId: 'batch', after: { rows_ok: txn.ok, rows_skipped: txn.skipped } })

    return NextResponse.json({ ok: true, ...txn })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
