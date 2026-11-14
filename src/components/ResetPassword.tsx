'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createRecoveryClient } from '@/lib/passwordRecovery';

export function ResetPassword({ locale }: { locale: string }) {
  const client = useRef<ReturnType<typeof createRecoveryClient> | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('Checking reset link / 正在验证链接…');
  useEffect(() => {
    let active = true;
    client.current ??= createRecoveryClient();
    void client.current.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      const valid = !error && Boolean(data.session);
      setReady(valid);
      setMessage(valid ? '' : 'Link expired or invalid. Request a new email. / 链接无效或已过期，请重新发送重置邮件。');
    }).catch(() => { if (active) setMessage('Unable to verify link / 无法验证链接，请重试。'); });
    return () => { active = false; };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== form.get('confirm')) { setMessage('Passwords do not match / 两次密码不一致'); return; }
    if (password.length < 8) { setMessage('Use at least 8 characters / 密码至少需要8个字符'); return; }
    if (!client.current || !ready) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await client.current.auth.updateUser({ password });
      if (error) { setMessage('Unable to reset. Use a new password or request a new link. / 重置失败，请尝试不同的新密码或重新获取链接。'); return; }
      // Clear the website cookie and the temporary recovery session.
      await fetch('/api/account/session', { method: 'DELETE' });
      await client.current.auth.signOut();
      setDone(true); setReady(false);
      setMessage('Password updated. Sign in with your new password. / 密码已更新，请使用新密码登录。');
    } catch { setMessage('Please try again / 请重试'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-lg px-5 py-12"><h1 className="text-2xl font-bold">Reset password / 重置密码</h1><p role="status" className="my-5">{message}</p>{ready && !done && <form onSubmit={submit} className="space-y-4">{[['password', 'New password / 新密码'], ['confirm', 'Confirm password / 确认密码']].map(([name, label]) => <label key={name} className="block">{label}<input type="password" name={name} autoComplete="new-password" minLength={8} required className="mt-1 min-h-12 w-full rounded border px-3" /></label>)}<button disabled={busy} className="min-h-12 rounded bg-blue-700 px-5 text-white">{busy ? '…' : 'Save password / 保存新密码'}</button></form>}<Link href={`/${locale}/account`} className="mt-6 inline-flex min-h-11 items-center text-blue-700">Back to account / 返回个人中心</Link></main>;
}
