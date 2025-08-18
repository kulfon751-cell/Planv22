import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateAdminCredentials, AUTH_CONFIG } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { login, password } = await request.json();
    
    if (!validateAdminCredentials(login, password)) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane logowania' },
        { status: 401 }
      );
    }
    
    const cookieStore = cookies();
    cookieStore.set(AUTH_CONFIG.COOKIE_NAME, 'admin', AUTH_CONFIG.COOKIE_OPTIONS);
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}