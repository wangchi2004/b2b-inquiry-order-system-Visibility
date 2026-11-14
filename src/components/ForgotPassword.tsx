'use client';
import { useState, type FormEvent } from 'react';
import { createRecoveryClient } from '@/lib/passwordRecovery';

export function ForgotPassword({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setBusy(true); setMessage('');
    try {
      const { error } = await createRecoveryClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/reset-password`,
      });
      setMessage(error ? 'Unable to send. Please try again later / 暂时无法发送，请稍后重试。' : 'If this email is registered, a reset link will arrive shortly. Check spam too. / 如果该邮箱已注册，你将收到重置邮件，请同时检查垃圾邮件。');
    } catch { setMessage('Please try again later / 请稍后重试。'); }
    finally { setBusy(false); }
  }
  return <section className="my-5"><button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-h-11 text-blue-700 underline">Forgot password? / 忘记密码？</button>{open && <form onSubmit={submit} className="mt-3 space-y-4 rounded-xl border p-5"><label className="block">Registered email / 注册邮箱<input name="email" type="email" autoComplete="email" required className="mt-1 min-h-12 w-full rounded border px-3" /></label><button disabled={busy} className="min-h-12 rounded bg-blue-700 px-5 text-white">{busy ? '…' : 'Send reset email / 发送重置邮件'}</button><p role="status">{message}</p></form>}</section>;
}
