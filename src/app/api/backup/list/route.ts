import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs'

export async function GET() {
  const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
  const items: { path: string; size: number; mtime: number }[] = []
  try {
    if (!fs.existsSync(BACKUP_DIR)) return NextResponse.json({ ok: true, backups: [] })
    for (const y of fs.readdirSync(BACKUP_DIR)) {
      const yDir = path.join(BACKUP_DIR, y)
      if (!fs.statSync(yDir).isDirectory()) continue
      for (const m of fs.readdirSync(yDir)) {
        const mDir = path.join(yDir, m)
        if (!fs.statSync(mDir).isDirectory()) continue
        for (const f of fs.readdirSync(mDir)) {
          const fp = path.join(mDir, f)
          const st = fs.statSync(fp)
          items.push({ path: fp, size: st.size, mtime: st.mtimeMs })
        }
      }
    }
    items.sort((a, b) => b.mtime - a.mtime)
    return NextResponse.json({ ok: true, backups: items })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
