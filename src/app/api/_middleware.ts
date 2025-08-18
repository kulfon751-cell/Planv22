import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // simple role extraction from header X-User-Role
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _role = req.headers.get('x-user-role') || 'production';
  // attach role to request via header for downstream (can't mutate request object easily)
  // For now this middleware is a placeholder to indicate where auth would go.
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
