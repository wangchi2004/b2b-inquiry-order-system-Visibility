'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
export function AccountLogin({ signedIn, locale }: { signedIn: boolean; locale: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setBusy(true); setError('');
    const form = event ? new FormData(event.currentTarget) : null;
    try {
      const res = await fetch('/api/account/session', { method: signedIn ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: form ? JSON.stringify({ email: form.get('email'), password: form.get('password') }) : undefined });
      if (!res.ok) { setError((await res.json()).error ?? 'Please try again'); return; }
      window.dispatchEvent(new Event('account-session-changed'));
      if (!signedIn) router.push(`/${locale}/catalog`);
      router.refresh();
    } catch { setError('Please try again / 请重试'); } finally { setBusy(false); }
  }
  if (signedIn) return <button disabled={busy} onClick={() => submit()} className="min-h-11 text-blue-700">Sign out / 退出登录</button>;
  return <form onSubmit={submit} className="my-6 space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">Sign in / 登录个人中心</h2><label className="block">Email / 邮箱<input required type="email" name="email" autoComplete="username" className="mt-1 min-h-12 w-full rounded border px-3" /></label><label className="block">Password / 密码<input required type="password" name="password" autoComplete="current-password" className="mt-1 min-h-12 w-full rounded border px-3" /></label>{error && <p role="alert">{error}</p>}<button disabled={busy} className="min-h-12 rounded bg-blue-700 px-5 text-white">{busy ? '…' : 'Sign in / 登录'}</button></form>;
}
