'use client';
import { shopText } from "@/i18n/shopText";
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
export function AccountLogin({ signedIn, locale, nextPath }: {
    signedIn: boolean;
    locale: string;
    nextPath?: string;
}) {
    const router = useRouter();
    const t = (text: string) => shopText(locale, text);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();
        setBusy(true);
        setError('');
        const form = event ? new FormData(event.currentTarget) : null;
        try {
            const res = await fetch('/api/account/session', { method: signedIn ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: form ? JSON.stringify({ email: form.get('email'), password: form.get('password') }) : undefined });
            if (!res.ok) {
                setError((await res.json()).error ?? t("Please try again"));
                return;
            }
            window.dispatchEvent(new Event('account-session-changed'));
            try { localStorage.setItem('account-session-sync',String(Date.now())); } catch { /* Cross-tab notification is optional. */ }
            if (!signedIn)
                router.push(nextPath ?? `/${locale}/catalog`);
            router.refresh();
        }
        catch {
            setError(t("Please try again / \u8BF7\u91CD\u8BD5"));
        }
        finally {
            setBusy(false);
        }
    }
    if (signedIn)
        return <button disabled={busy} onClick={() => submit()} className="min-h-11 text-blue-700">{t("Sign out / \u9000\u51FA\u767B\u5F55")}</button>;
    return <form onSubmit={submit} className="my-6 space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">{t("Sign in / \u767B\u5F55\u4E2A\u4EBA\u4E2D\u5FC3")}</h2><label className="block">{t("Email / \u90AE\u7BB1")}<input required type="email" name="email" autoComplete="username" className="mt-1 min-h-12 w-full rounded border px-3"/></label><label className="block">{t("Password / \u5BC6\u7801")}<input required type="password" name="password" autoComplete="current-password" className="mt-1 min-h-12 w-full rounded border px-3"/></label>{error && <p role="alert">{t(error)}</p>}<button disabled={busy} className="min-h-12 rounded bg-blue-700 px-5 text-white">{busy ? '…' : t("Sign in / \u767B\u5F55")}</button></form>;
}
