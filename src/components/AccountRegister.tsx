'use client';
import { shopText } from "@/i18n/shopText";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
export function AccountRegister({ locale }: {
    locale: string;
}) {
    const t = (text: string) => shopText(locale, text);
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (form.get('password') !== form.get('confirm')) {
            setMessage(t("Passwords do not match / \u4E24\u6B21\u5BC6\u7801\u4E0D\u4E00\u81F4"));
            return;
        }
        setBusy(true);
        setMessage('');
        try {
            const response = await fetch('/api/account/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password'), locale }) });
            const result = await response.json();
            if (!response.ok) {
                setMessage(result.error ?? t("Please try again / \u8BF7\u91CD\u8BD5"));
                return;
            }
            if (result.signedIn) {
                window.dispatchEvent(new Event('account-session-changed'));
            try { localStorage.setItem('account-session-sync',String(Date.now())); } catch { /* Cross-tab notification is optional. */ }
                router.push(`/${locale}/account`);
                router.refresh();
                return;
            }
            setSent(true);
            setMessage(t("Check your email to confirm registration, then sign in. If already registered, sign in or reset your password. / \u8BF7\u67E5\u770B\u90AE\u4EF6\u5B8C\u6210\u6CE8\u518C\u9A8C\u8BC1\uFF0C\u7136\u540E\u767B\u5F55\uFF1B\u5DF2\u6709\u8D26\u53F7\u8BF7\u767B\u5F55\u6216\u91CD\u7F6E\u5BC6\u7801\u3002"));
        }
        catch {
            setMessage(t("Please try again / \u8BF7\u91CD\u8BD5"));
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="mx-auto max-w-lg px-4 py-10"><h1 className="text-2xl font-bold">{t("Create account / \u6CE8\u518C\u65B0\u7528\u6237")}</h1><p className="my-4 text-slate-600">{t("Register to access sample catalog files. / \u6CE8\u518C\u5E76\u767B\u5F55\u540E\u53EF\u8BBF\u95EE\u6837\u672C\u76EE\u5F55\u6587\u4EF6\u3002")}</p>{!sent && <form onSubmit={submit} className="space-y-4 rounded-xl border p-5"><label className="block">{t("Email / \u90AE\u7BB1")}<input name="email" type="email" autoComplete="username" required className="mt-1 min-h-12 w-full rounded border px-3"/></label>{[['password', t("Password (8+ characters) / \u5BC6\u7801\uFF08\u81F3\u5C118\u4F4D\uFF09")], ['confirm', t("Confirm password / \u786E\u8BA4\u5BC6\u7801")]].map(([name, label]) => <label key={name} className="block">{label}<input name={name} type="password" autoComplete="new-password" required minLength={8} maxLength={1024} className="mt-1 min-h-12 w-full rounded border px-3"/></label>)}<button disabled={busy} className="min-h-12 rounded-lg bg-blue-700 px-5 text-white">{busy ? '…' : t("Register / \u6CE8\u518C")}</button></form>}<p role="status" className="my-4">{message}</p><Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center text-blue-700">{t("Already have an account? Sign in / \u5DF2\u6709\u8D26\u53F7\uFF1F\u767B\u5F55")}</Link></section>;
}
