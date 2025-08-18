import { NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { NextRequest } from 'next/server'
import { rateLimit, requireAll } from '../../../../server/security'
import { prisma } from '../../../../server/prisma'
import { writeAudit } from '../../../../server/audit/logger'

export async function POST(req: NextRequest) {
  const guard = requireAll(req, { role: 'admin' })
  if (guard) return guard
  const rl = rateLimit(req, 'backup:run', 5, 60)
  if (rl) return rl
  try {
    const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) return NextResponse.json({ ok: false, error: 'DATABASE_URL missing' }, { status: 400 })
    const now = new Date()
    const dir = path.join(BACKUP_DIR, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'))
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `pm_plan_${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}.dump`)
  await new Promise<void>((resolve, reject) => {
      const pgdump = spawn('pg_dump', ['-Fc', dbUrl, '-f', file])
      pgdump.on('close', (code) => (code === 0 ? resolve() : reject(new Error('pg_dump failed'))))
    })
  try { await prisma.backup.create({ data: { status: 'ok', location: file, sizeBytes: fs.statSync(file).size, note: 'manual' } }) } catch {}
    
    // Audit log
    await writeAudit({ action: 'backup.run', entity: 'backup', entityId: file, after: { location: file, manual: true } })
    
    globalThis.__PM_PLAN_BROADCAST__?.({ type: 'backup.status', payload: { status: 'ok', file } })
    return NextResponse.json({ ok: true, file })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
