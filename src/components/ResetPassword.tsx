'use client';
import { shopText } from "@/i18n/shopText";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createRecoveryClient } from '@/lib/passwordRecovery';
export function ResetPassword({ locale }: {
    locale: string;
}) {
    const t = useCallback((text: string) => shopText(locale, text), [locale]);
    const client = useRef<ReturnType<typeof createRecoveryClient> | null>(null);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [message, setMessage] = useState(t("Checking reset link / \u6B63\u5728\u9A8C\u8BC1\u94FE\u63A5\u2026"));
    useEffect(() => {
        let active = true;
        client.current ??= createRecoveryClient();
        void client.current.auth.getSession().then(({ data, error }) => {
            if (!active)
                return;
            const valid = !error && Boolean(data.session);
            setReady(valid);
            setMessage(valid ? '' : t("Link expired or invalid. Request a new email. / \u94FE\u63A5\u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u53D1\u9001\u91CD\u7F6E\u90AE\u4EF6\u3002"));
        }).catch(() => { if (active)
            setMessage(t("Unable to verify link / \u65E0\u6CD5\u9A8C\u8BC1\u94FE\u63A5\uFF0C\u8BF7\u91CD\u8BD5\u3002")); });
        return () => { active = false; };
    }, [t]);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const password = String(form.get('password') ?? '');
        if (password !== form.get('confirm')) {
            setMessage(t("Passwords do not match / \u4E24\u6B21\u5BC6\u7801\u4E0D\u4E00\u81F4"));
            return;
        }
        if (password.length < 8) {
            setMessage(t("Use at least 8 characters / \u5BC6\u7801\u81F3\u5C11\u9700\u89818\u4E2A\u5B57\u7B26"));
            return;
        }
        if (!client.current || !ready)
            return;
        setBusy(true);
        setMessage('');
        try {
            const { error } = await client.current.auth.updateUser({ password });
            if (error) {
                setMessage(t("Unable to reset. Use a new password or request a new link. / \u91CD\u7F6E\u5931\u8D25\uFF0C\u8BF7\u5C1D\u8BD5\u4E0D\u540C\u7684\u65B0\u5BC6\u7801\u6216\u91CD\u65B0\u83B7\u53D6\u94FE\u63A5\u3002"));
                return;
            }
            // Clear the website cookie and the temporary recovery session.
            await fetch('/api/account/session', { method: 'DELETE' });
            await client.current.auth.signOut();
            setDone(true);
            setReady(false);
            setMessage(t("Password updated. Sign in with your new password. / \u5BC6\u7801\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u4F7F\u7528\u65B0\u5BC6\u7801\u767B\u5F55\u3002"));
        }
        catch {
            setMessage(t("Please try again / \u8BF7\u91CD\u8BD5"));
        }
        finally {
            setBusy(false);
        }
    }
    return <main className="mx-auto max-w-lg px-5 py-12"><h1 className="text-2xl font-bold">{t("Reset password / \u91CD\u7F6E\u5BC6\u7801")}</h1><p role="status" className="my-5">{message}</p>{ready && !done && <form onSubmit={submit} className="space-y-4">{[['password', t("New password / \u65B0\u5BC6\u7801")], ['confirm', t("Confirm password / \u786E\u8BA4\u5BC6\u7801")]].map(([name, label]) => <label key={name} className="block">{label}<input type="password" name={name} autoComplete="new-password" minLength={8} required className="mt-1 min-h-12 w-full rounded border px-3"/></label>)}<button disabled={busy} className="min-h-12 rounded bg-blue-700 px-5 text-white">{busy ? '…' : t("Save password / \u4FDD\u5B58\u65B0\u5BC6\u7801")}</button></form>}<Link href={`/${locale}/account`} className="mt-6 inline-flex min-h-11 items-center text-blue-700">{t("Back to account / \u8FD4\u56DE\u4E2A\u4EBA\u4E2D\u5FC3")}</Link></main>;
}
