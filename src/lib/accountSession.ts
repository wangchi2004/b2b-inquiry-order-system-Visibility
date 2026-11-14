import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';

import { ACCOUNT_COOKIE } from '@/lib/accountCookies';
export async function accountUser() {
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { data, error } = await createSupabaseServerClient().auth.getUser(token);
    return !error && data.user?.email_confirmed_at && !data.user.is_anonymous ? data.user : null;
  } catch { return null; }
}
export async function requireAccount(locale: string) {
  const user = await accountUser();
  if (!user) redirect(`/${locale}/account`);
  return user;
}
