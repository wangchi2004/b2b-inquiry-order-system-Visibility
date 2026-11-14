import { cookies } from 'next/headers';
import { ACCOUNT_COOKIE } from '@/lib/accountSession';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, { status: 403 });
  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string') return new Response(null, { status: 400 });
    const { data, error } = await createSupabaseServerClient().auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user?.email_confirmed_at || data.user.is_anonymous) return Response.json({ error: 'Invalid email or password / 邮箱或密码错误' }, { status: 401 });
    (await cookies()).set(ACCOUNT_COOKIE, data.session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: data.session.expires_in });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Login unavailable / 登录暂不可用' }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, { status: 403 });
  (await cookies()).delete(ACCOUNT_COOKIE);
  return Response.json({ ok: true });
}
