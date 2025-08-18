import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

const rateStore = new Map<string, { count: number; resetAt: number }>()

function parseAllowlist() {
  const raw = process.env.LAN_ALLOWLIST || ''
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export function roleGuard(req: NextRequest, role: 'admin' | 'production' = 'production') {
  const hdrRole = req.headers.get('x-user-role')?.toLowerCase() as 'admin' | 'production' | undefined
  if (role === 'production') return true
  return hdrRole === 'admin'
}

export function cidrGuard(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
  const allow = parseAllowlist()
  if (allow.length === 0) return true
  return allow.some(c => ipInCidr(ip, c))
}

export function csrfGuard(req: NextRequest) {
  if (req.method === 'GET') return true
  const token = req.headers.get('x-csrf')
  return Boolean(token)
}

export function requireAll(req: NextRequest, options?: { role?: 'admin' | 'production' }) {
  if (!csrfGuard(req)) return NextResponse.json({ ok: false, error: 'CSRF' }, { status: 403 })
  if (!cidrGuard(req)) return NextResponse.json({ ok: false, error: 'CIDR' }, { status: 403 })
  if (options?.role && !roleGuard(req, options.role)) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  return null
}

export function rateLimit(req: NextRequest, keyPrefix: string, limit = 30, windowSec = 60) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
  const key = `${keyPrefix}:${ip}`
  const now = Date.now()
  const rec = rateStore.get(key)
  if (!rec || rec.resetAt < now) {
    rateStore.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    return null
  }
  if (rec.count >= limit) {
    return NextResponse.json({ ok: false, error: 'Rate limit' }, { status: 429 })
  }
  rec.count += 1
  return null
}

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(n => Number(n))
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return null
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [base, maskStr] = cidr.split('/')
  const ipInt = ipToInt(ip)
  const baseInt = ipToInt(base)
  const mask = maskStr ? Number(maskStr) : 32
  if (ipInt == null || baseInt == null || Number.isNaN(mask) || mask < 0 || mask > 32) return false
  const maskBits = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0
  return (ipInt & maskBits) === (baseInt & maskBits)
}
