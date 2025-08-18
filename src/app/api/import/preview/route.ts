import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    let total = 0, ok = 0, skipped = 0
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      step: () => { total++ },
      complete: () => {}
    })
    // This is a lightweight preview; real parsing in apply
    return NextResponse.json({ ok: true, stats: { total, ok, skipped } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 })
  }
}
