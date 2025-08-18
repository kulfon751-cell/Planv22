import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../server/prisma'
import { requireAll, rateLimit } from '../../../../server/security'
import { writeAudit } from '../../../../server/audit/logger'

export async function POST(req: NextRequest) {
  const guard = requireAll(req, { role: 'admin' })
  if (guard) return guard
  const rl = rateLimit(req, 'ops:bulk', 30, 60)
  if (rl) return rl
  try {
    const payload = await req.json()
    const headerVersion = req.headers.get('if-match')
    const updates: Array<{ id: string; version?: number; data: any }> = payload?.updates || []
    if (headerVersion) {
      const v = parseInt(headerVersion, 10)
      if (!Number.isNaN(v)) updates.forEach(u => { if (u.version == null) u.version = v })
    }
    if (!Array.isArray(updates)) return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })

    const results: any[] = []
    await prisma.$transaction(async (tx: any) => {
      for (const u of updates) {
        if (u.version == null) { results.push({ id: u.id, error: 'missing_version' }); continue }
        const updated = await tx.operation.updateMany({
          where: { id: u.id, version: u.version },
          data: { ...u.data, version: { increment: 1 } },
        })
        if (updated.count === 0) {
          const current = await tx.operation.findUnique({ where: { id: u.id } })
          results.push({ id: u.id, conflict: true, before: u, now: current })
        } else {
          results.push({ id: u.id, ok: true })
        }
      }
    })

    const conflicts = results.filter(r => r.conflict)
    if (conflicts.length) return NextResponse.json({ ok: false, conflicts }, { status: 409 })

    globalThis.__PM_PLAN_BROADCAST__?.({ type: 'ops.updated', payload: { ids: updates.map(u => u.id), changed: updates.map(u => Object.keys(u.data)) } })
    for (const r of results) if (r.ok) await writeAudit({ action: 'ops.update', entity: 'operation', entityId: r.id })

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
