import Link from 'next/link';
import { requireAccount } from '@/lib/accountSession';
import { customerOrders } from '@/lib/customerOrders';
import { orderText, orderMoney, orderDate } from '@/i18n/orders';
import { ShopHeader } from '@/components/storefront/ShopHeader';
export const dynamic = 'force-dynamic';
export default async function OrdersPage({ params, searchParams }: { params: Promise<{locale:string}>; searchParams: Promise<{page?:string}> }) {
  const {locale}=await params;
  const user=await requireAccount(locale,`/${locale}/orders`);
  const raw=Number((await searchParams).page);
  const page=Number.isSafeInteger(raw)&&raw>0&&raw<=100000?raw:1;
  const t=(key:string)=>orderText(locale,key);
  let result;
  try { result=await customerOrders(user,page); } catch { /* Render retry state without revealing database details. */ }
  return <main className="min-h-screen bg-white"><ShopHeader locale={locale}/><section className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><div className="mb-6 flex items-center justify-between"><h1 className="text-3xl font-bold">{t('My Orders')}</h1><a href={`/${locale}/orders?page=${page}`} className="min-h-11 content-center text-blue-700">{t('Refresh')}</a></div>
    {!result ? <p role="alert" className="rounded-xl bg-amber-50 p-5">{t('Orders unavailable. Please try again.')}</p> : <>{result.orders.length===0 ? <div className="rounded-xl border border-dashed p-8"><p>{t('No orders yet')}</p><Link href={`/${locale}/search`} className="mt-4 inline-flex min-h-11 items-center text-blue-700">{t('Browse products')} →</Link></div> : <ul className="space-y-4">{result.orders.map(order=><li key={order.id} className="rounded-xl border p-5"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/${locale}/orders/${order.id}`} className="break-all font-semibold text-blue-700">{t('Order number')}: {order.id}</Link><span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800">{t(order.status)}</span></div><p className="mt-2 text-sm text-slate-500">{orderDate(order.created_at,locale)}</p><p className="mt-3">{order.order_items.slice(0,3).map(item=>item.product_name).join(' · ')}{order.order_items.length>3?' …':''}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span>{t('Quote')}: {order.quote_updated_at ? orderMoney(order.grand_total,locale) : t('Pending quote')}</span><Link href={`/${locale}/orders/${order.id}`} className="inline-flex min-h-11 items-center font-medium text-blue-700">{t('View details')} →</Link></div></li>)}</ul>}<nav aria-label="Pagination" className="mt-6 flex justify-between">{page>1?<Link className="min-h-11 content-center text-blue-700" href={`/${locale}/orders?page=${page-1}`}>← {t('Previous')}</Link>:<span/>}{page*10<result.count?<Link className="min-h-11 content-center text-blue-700" href={`/${locale}/orders?page=${page+1}`}>{t('Next')} →</Link>:null}</nav></>}
  </section></main>;
}
