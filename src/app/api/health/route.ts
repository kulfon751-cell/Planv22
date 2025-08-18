import { NextResponse } from 'next/server'
import { prisma } from '../../../server/prisma'

export async function GET() {
  try {
    if (process.env.APP_MODE === 'server') {
      // Ping DB
      await prisma.$queryRaw`SELECT 1`
    }
    return NextResponse.json({ ok: true, mode: process.env.APP_MODE || 'portable' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
