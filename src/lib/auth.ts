import { cookies } from 'next/headers';

export const AUTH_CONFIG = {
  ADMIN_LOGIN: 'Admin',
  ADMIN_PASSWORD: 'Admin1234',
  COOKIE_NAME: 'user-role',
  COOKIE_OPTIONS: {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  }
};

export function validateAdminCredentials(login: string, password: string): boolean {
  return login === AUTH_CONFIG.ADMIN_LOGIN && password === AUTH_CONFIG.ADMIN_PASSWORD;
}

export async function getUserRole(): Promise<'admin' | 'production' | null> {
  const cookieStore = cookies();
  const roleCookie = cookieStore.get(AUTH_CONFIG.COOKIE_NAME);
  
  if (!roleCookie) {
    return 'production'; // Default to production role
  }
  
  return roleCookie.value === 'admin' ? 'admin' : 'production';
}

export function requireAdminRole(userRole: string | null) {
  if (userRole !== 'admin') {
    throw new Error('Dostęp tylko dla administratora');
  }
}