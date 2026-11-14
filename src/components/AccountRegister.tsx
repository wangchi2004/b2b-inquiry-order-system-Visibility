'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function AccountRegister({ locale }: { locale: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('confirm')) { setMessage('Passwords do not match / 两次密码不一致'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/account/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password'), locale }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? 'Please try again / 请重试'); return; }
      if (result.signedIn) { router.push(`/${locale}/account`); router.refresh(); return; }
      setSent(true);
      setMessage('Check your email to confirm registration, then sign in. If already registered, sign in or reset your password. / 请查看邮件完成注册验证，然后登录；已有账号请登录或重置密码。');
    } catch { setMessage('Please try again / 请重试'); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-lg px-4 py-10"><h1 className="text-2xl font-bold">Create account / 注册新用户</h1><p className="my-4 text-slate-600">Register to access sample catalog files. / 注册并登录后可访问样本目录文件。</p>{!sent && <form onSubmit={submit} className="space-y-4 rounded-xl border p-5"><label className="block">Email / 邮箱<input name="email" type="email" autoComplete="username" required className="mt-1 min-h-12 w-full rounded border px-3" /></label>{[['password', 'Password (8+ characters) / 密码（至少8位）'], ['confirm', 'Confirm password / 确认密码']].map(([name, label]) => <label key={name} className="block">{label}<input name={name} type="password" autoComplete="new-password" required minLength={8} maxLength={1024} className="mt-1 min-h-12 w-full rounded border px-3" /></label>)}<button disabled={busy} className="min-h-12 rounded-lg bg-blue-700 px-5 text-white">{busy ? '…' : 'Register / 注册'}</button></form>}<p role="status" className="my-4">{message}</p><Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center text-blue-700">Already have an account? Sign in / 已有账号？登录</Link></section>;
}
