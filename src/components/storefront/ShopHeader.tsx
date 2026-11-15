import { shopText } from "@/i18n/shopText";
import { LanguageSwitcher } from './LanguageSwitcher';
import Link from 'next/link';
import { accountUser } from '@/lib/accountSession';
import { ShopIcon } from './ShopIcon';
const copy = {
    en: { register: 'Register', login: 'Sign in', signedIn: 'Signed in' },
    zh: { register: '注册新用户', login: '登录', signedIn: '已登录' },
    ja: { register: '新規登録', login: 'ログイン', signedIn: 'ログイン中' },
    ko: { register: '회원가입', login: '로그인', signedIn: '로그인됨' },
};
export async function ShopHeader({ locale }: {
    locale: string;
}) {
    const user = await accountUser();
    const t = (text: string) => shopText(locale, text);
    const labels = copy[locale as keyof typeof copy] ?? copy.en;
    return <header className="border-b border-slate-100 bg-white">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-4 sm:px-6">
      <Link href={`/${locale}`} aria-label="Shoe repair materials home" className="flex min-h-11 items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white"><ShopIcon name="box"/></span>
        <span><span className="block text-lg font-bold tracking-tight text-slate-950">{t("Shoe Repair Materials")}</span><span className="block text-xs text-slate-500">{t("PARTS \u00B7 MATERIALS \u00B7 TOOLS")}</span></span>
      </Link>
      <nav aria-label="Account navigation" className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-5">
        <LanguageSwitcher locale={locale}/>
        {user ? <Link href={`/${locale}/account`} className="flex min-w-0 max-w-full flex-col justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
          <span className="font-semibold text-emerald-800">● {labels.signedIn}</span>
          <span className="break-all text-slate-700">{user.email}</span>
        </Link> : <>
          <Link href={`/${locale}/register`} className="inline-flex min-h-11 items-center rounded-lg border border-blue-700 px-4 text-sm font-semibold text-blue-700">{labels.register}</Link>
          <Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">{labels.login}</Link>
        </>}
      </nav>
    </div>
  </header>;
}
