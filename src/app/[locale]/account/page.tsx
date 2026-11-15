import { shopText } from "@/i18n/shopText";
import { accountReturnPath } from "@/lib/accountReturnPath";
import { ForgotPassword } from "@/components/ForgotPassword";
import { AccountLogin } from "@/components/AccountLogin";
import { accountUser } from "@/lib/accountSession";
import Link from "next/link";
import { ShopHeader } from "@/components/storefront/ShopHeader";
import { ShopIcon } from "@/components/storefront/ShopIcon";
import { GeneralOrderEntryForm } from "@/components/GeneralOrderEntryForm";
export default async function AccountPage({ params, searchParams }: {
    params: Promise<{
        locale: string;
    }>;
    searchParams: Promise<{
        next?: string;
    }>;
}) {
    const { locale } = await params;
    const t = (text: string) => shopText(locale, text);
    const user = await accountUser();
    const nextPath = accountReturnPath((await searchParams).next, locale);
    return <main className="min-h-screen bg-white"><ShopHeader locale={locale}/><section className="mx-auto max-w-2xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">{t("My Account")}</h1><div className="my-6 flex items-center gap-4 rounded-2xl bg-slate-50 p-5"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700"><ShopIcon name="account"/></span><div><h2 className="font-semibold">{user?.email ?? t("Welcome, guest")}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t("Sign in to access sample catalog files.")}</p></div></div>
    <AccountLogin signedIn={Boolean(user)} locale={locale} nextPath={nextPath}/>
    {!user ? <ForgotPassword locale={locale}/> : null}
    {user ? <Link href={`/${locale}/catalog`} className="my-5 flex min-h-12 items-center rounded-lg bg-blue-700 px-5 font-semibold text-white">{t("Sample Downloads / \u6837\u672C\u76EE\u5F55\u6587\u4EF6")}</Link> : null}
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200"><Link href={`/${locale}/orders`} className="flex min-h-14 items-center justify-between px-4 font-medium">{t("My Orders")}<ShopIcon name="arrow"/></Link><Link href={`/${locale}/favorites`} className="flex min-h-14 items-center justify-between px-4 font-medium">{t("My Favorites / \u6211\u7684\u6536\u85CF")}<ShopIcon name="heart"/></Link><Link href={`/${locale}/addresses`} className="flex min-h-14 items-center justify-between px-4 font-medium">{t("Shipping Addresses")}<ShopIcon name="arrow"/></Link>{[t("My Quotes"), t("Account Settings")].map(label => <div key={label} className="flex min-h-14 items-center justify-between gap-3 px-4"><span>{t(label)}</span><span className="text-sm text-slate-500">{t("Coming soon")}</span></div>)}</div>
    <div className="mt-8"><h2 className="text-xl font-semibold">{t("Continue with an inquiry")}</h2><p className="mb-5 mt-2 text-sm leading-6 text-slate-600">{t("Use your signed-in account to enter product selection and request a quote. / \u4F7F\u7528\u5F53\u524D\u767B\u5F55\u8D26\u53F7\u8FDB\u5165\u9009\u54C1\u8BE2\u4EF7\u3002")}</p><GeneralOrderEntryForm redirectTo={`/${locale}/order/general`}/></div>
    <div className="mt-6 flex flex-wrap gap-3" aria-label="Choose language">{["en", "zh", "ja", "ko"].map(language => <Link key={language} href={`/${language}/account`} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium" hrefLang={language}>{({ en: "English", zh: "中文", ja: "日本語", ko: "한국어" })[language]}</Link>)}</div>
  </section></main>;
}
