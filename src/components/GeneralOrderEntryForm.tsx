import Link from 'next/link';
import { accountUser } from '@/lib/accountSession';

const languageLabels: Record<string, string> = { en: 'English', zh: '中文', ja: '日本語', ko: '한국어' };

type Props = {
  redirectTo?: string; compact?: boolean; showLanguageSelect?: boolean;
  defaultLocale?: string; localeRedirects?: Record<string, string>;
  labels?: { language?: string; email?: string; country?: string; button?: string; emailPlaceholder?: string; countryPlaceholder?: string; emailError?: string; countryError?: string };
};
export async function GeneralOrderEntryForm({ redirectTo = '/en/order/general', compact, showLanguageSelect, defaultLocale = 'en', localeRedirects, labels }: Props) {
  const user = await accountUser();
  const locale = redirectTo.match(/^\/(en|zh|ja|ko)\//)?.[1] ?? defaultLocale;
  const destinations = localeRedirects ?? Object.fromEntries(Object.keys(languageLabels).map(language => [language, `/${language}/order/general`]));
  const href = (path: string, language: string) => user ? path : `/${language}/account?next=${encodeURIComponent(path)}`;
  return <div className={compact ? 'space-y-4' : 'max-w-xl space-y-4 rounded border border-slate-200 bg-white p-6 shadow-sm'}>
    <p className="break-all text-sm text-slate-600">{user ? <>Signed in / 已登录：<strong>{user.email}</strong></> : 'Please sign in with the account shown at the top before entering. / 请先登录顶部的账号，再进入选品询价。'}</p>
    {showLanguageSelect ? <div><p className="mb-3 text-sm font-semibold">{labels?.language ?? 'Language / 语言'}</p><div className="grid grid-cols-2 gap-3">{Object.entries(destinations).map(([language, path]) => <Link key={language} href={href(path, language)} hrefLang={language} lang={language} className={`inline-flex min-h-12 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition hover:border-blue-700 hover:bg-blue-50 ${language === locale ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-800"}`}>{languageLabels[language] ?? language}</Link>)}</div></div> : <Link href={href(redirectTo, locale)} className="flex min-h-12 items-center justify-center rounded bg-slate-950 px-4 text-sm font-semibold text-white">{user ? labels?.button ?? 'Enter Product Page / 进入选品询价' : 'Sign in to continue / 登录后进入'}</Link>}
  </div>;
}
