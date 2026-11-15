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
  const href = (path: string, language: string) => user ? path : `/${language}/account?next=${encodeURIComponent(path)}`;
  return <div className={compact ? 'space-y-4' : 'max-w-xl space-y-4 rounded border border-slate-200 bg-white p-6 shadow-sm'}>
    <p className="break-all text-sm text-slate-600">{user ? <>Signed in / 已登录：<strong>{user.email}</strong></> : 'Please sign in with the account shown at the top before entering. / 请先登录顶部的账号，再进入选品询价。'}</p>
    {showLanguageSelect && localeRedirects ? <div><p className="mb-3 text-sm font-semibold">{labels?.language ?? 'Language / 语言'}</p><div className="flex flex-wrap gap-3">{Object.entries(localeRedirects).map(([language, path]) => <Link key={language} href={href(path, language)} className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold">{languageLabels[language] ?? language}</Link>)}</div></div> : <Link href={href(redirectTo, locale)} className="flex min-h-12 items-center justify-center rounded bg-slate-950 px-4 text-sm font-semibold text-white">{user ? labels?.button ?? 'Enter Product Page / 进入选品询价' : 'Sign in to continue / 登录后进入'}</Link>}
  </div>;
}
