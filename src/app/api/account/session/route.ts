import { cookies } from 'next/headers';
import { ACCOUNT_COOKIE, ACCOUNT_REFRESH_COOKIE, sessionCookies, clearedAccountCookies } from '@/lib/accountCookies';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, { status: 403 });
  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string') return new Response(null, { status: 400 });
    const { data, error } = await createSupabaseServerClient().auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user?.email_confirmed_at || data.user.is_anonymous) return Response.json({ error: 'Invalid email or password / 邮箱或密码错误' }, { status: 401 });
    const jar = await cookies();
    for (const cookie of sessionCookies(data.session)) jar.set(cookie);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Login unavailable / 登录暂不可用' }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const jar = await cookies();
  let token = jar.get(ACCOUNT_COOKIE)?.value;
  const refresh = jar.get(ACCOUNT_REFRESH_COOKIE)?.value;
  for (const cookie of clearedAccountCookies()) jar.set(cookie);
  if (token || refresh) {
    try {
      const client = createSupabaseServerClient();
      if (refresh) {
        const { data } = await client.auth.refreshSession({ refresh_token: refresh });
        token = data.session?.access_token ?? token;
      }
      if (token) await client.auth.admin.signOut(token, 'local');
    } catch { /* Local logout must succeed even if the provider is unavailable. */ }
  }
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
