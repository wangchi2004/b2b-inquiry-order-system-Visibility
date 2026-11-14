import { AccountLogin } from "@/components/AccountLogin";
import { accountUser } from "@/lib/accountSession";
import Link from "next/link";
import { ShopHeader } from "@/components/storefront/ShopNavigation";
import { ShopIcon } from "@/components/storefront/ShopIcon";
import { GeneralOrderEntryForm } from "@/components/GeneralOrderEntryForm";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await accountUser();
  return <main className="min-h-screen bg-white"><ShopHeader locale={locale} /><section className="mx-auto max-w-2xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">My Account</h1><div className="my-6 flex items-center gap-4 rounded-2xl bg-slate-50 p-5"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700"><ShopIcon name="account" /></span><div><h2 className="font-semibold">{user?.email ?? "Welcome, guest"}</h2><p className="mt-1 text-sm leading-6 text-slate-600">Sign in to access sample catalog files.</p></div></div>
    <AccountLogin signedIn={Boolean(user)} locale={locale} />
    {user ? <Link href={`/${locale}/catalog`} className="my-5 flex min-h-12 items-center rounded-lg bg-blue-700 px-5 font-semibold text-white">Sample Downloads / 样本目录文件</Link> : null}
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200"><Link href={`/${locale}/orders`} className="flex min-h-14 items-center justify-between px-4 font-medium">My Orders <ShopIcon name="arrow" /></Link>{["My Quotes", "Favorites", "Shipping Addresses", "Account Settings"].map(label => <div key={label} className="flex min-h-14 items-center justify-between gap-3 px-4"><span>{label}</span><span className="text-sm text-slate-500">Coming soon</span></div>)}</div>
    <div className="mt-8"><h2 className="text-xl font-semibold">Continue with an inquiry</h2><p className="mb-5 mt-2 text-sm leading-6 text-slate-600">You can still use our existing inquiry form. Enter your email and country to browse and request a quote; this does not create an account.</p><GeneralOrderEntryForm redirectTo={`/${locale}/order/general`} /></div>
    <div className="mt-6 flex flex-wrap gap-3" aria-label="Choose language">{["en", "zh", "ja", "ko"].map(language => <Link key={language} href={`/${language}/account`} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium" hrefLang={language}>{({ en: "English", zh: "中文", ja: "日本語", ko: "한국어" })[language]}</Link>)}</div>
  </section></main>;
}
