import { NextResponse } from 'next/server'

export async function GET() {
  // This route is a placeholder; the actual WS upgrade is handled in custom server.
  return NextResponse.json({ ok: true, info: 'Upgrade to WebSocket at /api/realtime (handled by server)' })
}
