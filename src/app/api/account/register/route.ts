import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { sessionCookies } from '@/lib/accountCookies';
import { isLocale } from '@/i18n/routing';

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) return new Response(null, { status: 403 });
  try {
    const { email, password, locale } = await request.json();
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || password.length < 8 || password.length > 1024 || !isLocale(locale)) {
      return Response.json({ error: 'Enter a valid email and a password of at least 8 characters / 请输入有效邮箱和至少8位密码' }, { status: 400 });
    }
    const { data, error } = await createSupabaseServerClient().auth.signUp({
      email: email.trim(), password, options: { emailRedirectTo: `${origin}/${locale}/account` },
    });
    if (error) return Response.json({ error: 'Unable to register. Please try later, or sign in if you already have an account. / 注册失败，请稍后重试；已有账号请直接登录。' }, { status: error.status === 429 ? 429 : 400 });
    const signedIn = Boolean(data.session && data.user?.email_confirmed_at && !data.user.is_anonymous);
    if (signedIn && data.session) {
      const jar = await cookies();
      for (const cookie of sessionCookies(data.session)) jar.set(cookie);
    }
    return Response.json({ signedIn }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return Response.json({ error: 'Registration unavailable / 注册暂不可用，请稍后重试' }, { status: 503 }); }
}
