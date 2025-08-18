import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const runtimeDir = process.env.RUNTIME_USER_DATA || process.cwd();
const RUNTIME_FILE = path.join(runtimeDir, 'runtime.json');

export async function GET() {
  try {
    if (fs.existsSync(RUNTIME_FILE)) {
      const raw = fs.readFileSync(RUNTIME_FILE, 'utf-8');
      const data = JSON.parse(raw || '{}');
      return NextResponse.json({ ok: true, data });
    }
    return NextResponse.json({ ok: true, data: null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let role = request.headers.get('x-user-role') || 'production';
    if (role === 'production') {
      // fallback to cookie if present
      const cookieStore = cookies();
      const c = cookieStore.get('user-role');
      if (c?.value === 'admin') role = 'admin';
    }
    if (role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const data = body.data ?? null;
    // write atomically
    fs.writeFileSync(RUNTIME_FILE + '.tmp', JSON.stringify(data || {}));
    fs.renameSync(RUNTIME_FILE + '.tmp', RUNTIME_FILE);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
