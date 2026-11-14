import Link from "next/link";
import { ShopHeader } from "@/components/storefront/ShopNavigation";
import { ShopIcon } from "@/components/storefront/ShopIcon";

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <main className="min-h-screen bg-white"><ShopHeader locale={locale} /><section className="mx-auto max-w-2xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">My Orders</h1><div className="mt-6 rounded-2xl border border-slate-200 p-6"><ShopIcon name="orders" className="mb-4 text-blue-700" width="32" height="32" /><h2 className="text-xl font-semibold">Your orders, in one place</h2><p className="mt-3 leading-7 text-slate-600">Web order history is coming soon. Existing inquiries are still handled by our team, with confirmations and quotes sent by email.</p><p className="mt-3 leading-7 text-slate-600">For an update on an existing inquiry, contact us with your order reference.</p><a href="mailto:wangchi.2004@gmail.com" className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-blue-700 px-5 font-semibold text-white">Contact us</a></div><Link href={`/${locale}/search`} className="mt-5 inline-flex min-h-11 items-center text-blue-700">Continue browsing →</Link></section></main>;
}
