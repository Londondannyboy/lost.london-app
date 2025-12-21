import { NextResponse } from 'next/server';

// Dynamic import to avoid build-time errors when env var is missing
export async function GET(request: Request) {
  if (!process.env.NEON_AUTH_BASE_URL) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }
  const { authApiHandler } = await import('@neondatabase/neon-js/auth/next');
  const handlers = authApiHandler();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  if (!process.env.NEON_AUTH_BASE_URL) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }
  const { authApiHandler } = await import('@neondatabase/neon-js/auth/next');
  const handlers = authApiHandler();
  return handlers.POST(request);
}
