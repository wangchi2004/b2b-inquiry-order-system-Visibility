import type { Session, User } from '@supabase/supabase-js';

export const ACCOUNT_COOKIE = 'catalog-account-token';
export const ACCOUNT_REFRESH_COOKIE = 'catalog-account-refresh';
export const REMEMBER_SECONDS = 90 * 24 * 60 * 60;
export const accountCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
export function sessionCookies(session: Session) {
  return [
    { name: ACCOUNT_COOKIE, value: session.access_token, ...accountCookieOptions, maxAge: session.expires_in },
    { name: ACCOUNT_REFRESH_COOKIE, value: session.refresh_token, ...accountCookieOptions, maxAge: REMEMBER_SECONDS },
  ];
}
export function clearedAccountCookies() {
  return [ACCOUNT_COOKIE, ACCOUNT_REFRESH_COOKIE].map(name => ({ name, value: '', ...accountCookieOptions, maxAge: 0 }));
}

type Auth = {
  getUser(token: string): Promise<{ data: { user: User | null }; error: { status?: number } | null }>;
  refreshSession(session: { refresh_token: string }): Promise<{ data: { session: Session | null; user: User | null }; error: { status?: number } | null }>;
};
export async function renewAccountCookies(access: string | undefined, refresh: string | undefined, auth: Auth) {
  if (!refresh) return [];
  if (access) {
    const { data, error } = await auth.getUser(access);
    if (!error && data.user?.email_confirmed_at && !data.user.is_anonymous) return [];
    // Do not discard a remembered login during a temporary provider outage.
    if (error && error.status !== 401 && error.status !== 403) return [];
  }
  const { data, error } = await auth.refreshSession({ refresh_token: refresh });
  if (error) return error.status && error.status >= 400 && error.status < 500 && error.status !== 429
    ? clearedAccountCookies() : [];
  if (!data.session || !data.user?.email_confirmed_at || data.user.is_anonymous) return clearedAccountCookies();
  return sessionCookies(data.session);
}
