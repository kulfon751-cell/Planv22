import { NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { NextRequest } from 'next/server'
import { rateLimit, requireAll } from '../../../../../server/security'
import { writeAudit } from '../../../../../server/audit/logger'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAll(req, { role: 'admin' })
  if (guard) return guard
  const rl = rateLimit(req, 'backup:restore', 2, 300)
  if (rl) return rl
  const body = await req.json().catch(() => ({} as any))
  if (!body?.confirmPassword || !body?.confirmPassword2 || body.confirmPassword !== body.confirmPassword2) {
    return NextResponse.json({ ok: false, error: 'Confirmation required' }, { status: 400 })
  }
  try {
    const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) return NextResponse.json({ ok: false, error: 'DATABASE_URL missing' }, { status: 400 })
    // id is a relative path fragment encoded
    const id = decodeURIComponent(params.id)
    const file = path.join(BACKUP_DIR, id)
    if (!fs.existsSync(file)) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    await new Promise<void>((resolve, reject) => {
      const psql = spawn('pg_restore', ['-c', '-d', dbUrl, file])
      psql.on('close', (code) => (code === 0 ? resolve() : reject(new Error('pg_restore failed'))))
    })
    
    // Audit log
    await writeAudit({ action: 'backup.restore', entity: 'backup', entityId: id, after: { restored_from: file } })
    
    globalThis.__PM_PLAN_BROADCAST__?.({ type: 'backup.status', payload: { status: 'restored', id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
