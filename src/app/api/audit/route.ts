import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../server/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const user = searchParams.get('user') || undefined
    const entity = searchParams.get('entity') || undefined
    const action = searchParams.get('action') || undefined
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const format = searchParams.get('format') || 'json'

    const where: any = {}
    if (user) where.userId = user
    if (entity) where.entity = entity
    if (action) where.action = action
    if (dateFrom || dateTo) where.atTs = {}
    if (dateFrom) where.atTs.gte = new Date(dateFrom)
    if (dateTo) where.atTs.lte = new Date(dateTo)

  const rows = await prisma.auditLog.findMany({ where, orderBy: { atTs: 'desc' }, take: 1000 })

    if (format === 'csv') {
      const headers = ['id','at_ts','user_id','role','action','entity','entity_id','before','after','ip','user_agent','txn_id']
      const escape = (val: unknown) => String(val ?? '').split('"').join('""')
      const lines = rows.map((r: any) => [r.id, r.atTs.toISOString(), r.userId||'', r.role||'', r.action, r.entity, r.entityId, JSON.stringify(r.before||{}), JSON.stringify(r.after||{}), r.ip||'', r.userAgent||'', r.txnId||''].map(s => `"${escape(s)}"`).join(','))
      const csv = [headers.join(','), ...lines].join('\n')
      return new NextResponse(csv, { headers: { 'content-type': 'text/csv' } })
    }

    return NextResponse.json({ ok: true, rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
