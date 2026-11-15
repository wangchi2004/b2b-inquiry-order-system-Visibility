'use client';
import { shopText } from "@/i18n/shopText";
import { useState, type FormEvent } from 'react';
import { createRecoveryClient } from '@/lib/passwordRecovery';
export function ForgotPassword({ locale }: {
    locale: string;
}) {
    const t = (text: string) => shopText(locale, text);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
        setBusy(true);
        setMessage('');
        try {
            const { error } = await createRecoveryClient().auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/${locale}/reset-password`,
            });
            setMessage(error ? t("Unable to send. Please try again later / \u6682\u65F6\u65E0\u6CD5\u53D1\u9001\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002") : t("If this email is registered, a reset link will arrive shortly. Check spam too. / \u5982\u679C\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C\uFF0C\u4F60\u5C06\u6536\u5230\u91CD\u7F6E\u90AE\u4EF6\uFF0C\u8BF7\u540C\u65F6\u68C0\u67E5\u5783\u573E\u90AE\u4EF6\u3002"));
        }
        catch {
            setMessage(t("Please try again later / \u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002"));
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="my-5"><button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-h-11 text-blue-700 underline">{t("Forgot password? / \u5FD8\u8BB0\u5BC6\u7801\uFF1F")}</button>{open && <form onSubmit={submit} className="mt-3 space-y-4 rounded-xl border p-5"><label className="block">{t("Registered email / \u6CE8\u518C\u90AE\u7BB1")}<input name="email" type="email" autoComplete="email" required className="mt-1 min-h-12 w-full rounded border px-3"/></label><button disabled={busy} className="min-h-12 rounded bg-blue-700 px-5 text-white">{busy ? '…' : t("Send reset email / \u53D1\u9001\u91CD\u7F6E\u90AE\u4EF6")}</button><p role="status">{message}</p></form>}</section>;
}
