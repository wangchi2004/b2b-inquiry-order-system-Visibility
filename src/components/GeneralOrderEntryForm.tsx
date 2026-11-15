import { shopText } from "@/i18n/shopText";
import Link from 'next/link';
import { accountUser } from '@/lib/accountSession';
const languageLabels: Record<string, string> = { en: 'English', zh: '中文', ja: '日本語', ko: '한국어' };
type Props = {
    redirectTo?: string;
    compact?: boolean;
    showLanguageSelect?: boolean;
    defaultLocale?: string;
    localeRedirects?: Record<string, string>;
    labels?: {
        language?: string;
        email?: string;
        country?: string;
        button?: string;
        emailPlaceholder?: string;
        countryPlaceholder?: string;
        emailError?: string;
        countryError?: string;
    };
};
export async function GeneralOrderEntryForm({ redirectTo = '/en/order/general', compact, showLanguageSelect, defaultLocale = 'en', localeRedirects, labels }: Props) {
    const user = await accountUser();
    const locale = redirectTo.match(/^\/(en|zh|ja|ko)\//)?.[1] ?? defaultLocale;
    const t = (text: string) => shopText(locale, text);
    const destinations = localeRedirects ?? Object.fromEntries(Object.keys(languageLabels).map(language => [language, `/${language}/order/general`]));
    const href = (path: string, language: string) => user ? path : `/${language}/account?next=${encodeURIComponent(path)}`;
    return <div className={compact ? 'space-y-4' : 'max-w-xl space-y-4 rounded border border-slate-200 bg-white p-6 shadow-sm'}>
    <p className="break-all text-sm text-slate-600">{user ? <>{t("Signed in / \u5DF2\u767B\u5F55\uFF1A")}<strong>{user.email}</strong></> : t("Please sign in with the account shown at the top before entering. / \u8BF7\u5148\u767B\u5F55\u9876\u90E8\u7684\u8D26\u53F7\uFF0C\u518D\u8FDB\u5165\u9009\u54C1\u8BE2\u4EF7\u3002")}</p>
    {showLanguageSelect ? <div><p className="mb-3 text-sm font-semibold">{labels?.language ?? t("Language / \u8BED\u8A00")}</p><div className="grid grid-cols-2 gap-3">{Object.entries(destinations).map(([language, path]) => <Link key={language} href={href(path, language)} hrefLang={language} lang={language} className={`inline-flex min-h-12 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition hover:border-blue-700 hover:bg-blue-50 ${language === locale ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-800"}`}>{languageLabels[language] ?? language}</Link>)}</div></div> : <Link href={href(redirectTo, locale)} className="flex min-h-12 items-center justify-center rounded bg-slate-950 px-4 text-sm font-semibold text-white">{user ? labels?.button ?? t("Enter Product Page / \u8FDB\u5165\u9009\u54C1\u8BE2\u4EF7") : t("Sign in to continue / \u767B\u5F55\u540E\u8FDB\u5165")}</Link>}
  </div>;
}
