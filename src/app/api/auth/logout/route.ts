import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = cookies();
    cookieStore.delete(AUTH_CONFIG.COOKIE_NAME);
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}