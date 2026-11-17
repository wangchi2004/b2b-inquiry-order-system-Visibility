import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAccount } from '@/lib/accountSession';
import { customerOrder } from '@/lib/customerOrders';
import { orderText, orderMoney, orderDate } from '@/i18n/orders';
import { ShopHeader } from '@/components/storefront/ShopHeader';
import { confirmCustomerQuote } from './actions';
export const dynamic='force-dynamic';
export default async function OrderDetailPage({params,searchParams}:{params:Promise<{locale:string;id:string}>;searchParams:Promise<{message?:string}>}) {
  const {locale,id}=await params; const user=await requireAccount(locale,`/${locale}/orders/${id}`);
  const t=(key:string)=>orderText(locale,key); let order;
  try {order=await customerOrder(user,id);}catch{return <main><ShopHeader locale={locale}/><section className="mx-auto max-w-5xl p-8"><p role="alert">{t('Orders unavailable. Please try again.')}</p><a className="mt-4 inline-flex min-h-11 items-center text-blue-700" href={`/${locale}/orders/${id}`}>{t('Refresh')}</a></section></main>;}
  if(!order)notFound();
  const {message}=await searchParams;
  const stages=['new','quoted','confirmed','processing','shipped','completed'];
  const current=stages.indexOf(order.status==='submitted'?'new':order.status);
  const quoted=Boolean(order.quote_updated_at);
  const imageOf=(item:typeof order.order_items[number])=>{
    const product=Array.isArray(item.products)?item.products[0]:item.products;
    return product?.image_url??product?.image_url_2??product?.image_url_3;
  };
  const itemGroups=new Map<string,typeof order.order_items>();
  for(const item of order.order_items){
    const key=item.product_id??item.product_name;
    const items=itemGroups.get(key)??[];
    items.push(item);itemGroups.set(key,items);
  }
  return <main className="min-h-screen bg-white"><ShopHeader locale={locale}/><section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6"><Link className="inline-flex min-h-11 items-center text-blue-700" href={`/${locale}/orders`}>← {t('Back to orders')}</Link><div className="flex items-center justify-between gap-3"><h1 className="text-3xl font-bold">{t('Order details')}</h1><a href={`/${locale}/orders/${id}`} className="inline-flex min-h-11 items-center text-blue-700">{t('Refresh')}</a></div><p className="break-all text-sm">{t('Order number')}: {order.id}</p><p className="text-sm text-slate-500">{t('Created')}: {orderDate(order.created_at,locale)}</p>
    {message?<p role="status" className="rounded-xl bg-blue-50 p-4">{t(message==='confirmed'?'Quote confirmed':'Quote changed. Refresh and review the latest quote.')}</p>:null}
    <section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{t('Order status')}: {t(order.status)}</h2>{order.status!=='cancelled'?<ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{stages.map((stage,index)=><li key={stage} aria-current={index===current?'step':undefined} className={`rounded-lg p-3 text-sm ${index<=current?'bg-blue-50 text-blue-800':'bg-slate-50 text-slate-500'}`}>{index<current?'✓ ':''}{t(stage)}</li>)}</ol>:null}</section>
    <section className="min-w-0 rounded-xl border p-5">
      <h2 id="order-items-heading" className="text-xl font-semibold">{t('Items')}</h2>
      <p id="order-items-scroll" className="mt-2 text-sm text-slate-500 lg:hidden">{t('Scroll to see all columns')}</p>
      <div className="mt-4 overflow-x-auto" role="region" aria-labelledby="order-items-heading" aria-describedby="order-items-scroll" tabIndex={0}>
        <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr>{['Image','Product','SKU','Size','Color','Quantity','Unit','Unit price','Subtotal'].map(key=><th key={key} scope="col" className={`border border-slate-200 p-3 ${['Quantity','Unit price','Subtotal'].includes(key)?'text-right':''}`}>{t(key)}</th>)}</tr></thead>
          <tbody>{Array.from(itemGroups.values()).map(items=>items.map((item,index)=>{
            const image=items.map(imageOf).find(Boolean);
            return <tr key={item.id}>
              {index===0?<td rowSpan={items.length} className="w-24 border border-slate-200 p-3 align-top">{image?
                // Product photos use the same source and fallback order as the admin table.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={item.product_name} loading="lazy" className="h-16 w-16 rounded border border-slate-200 bg-white object-contain"/>
                :<span className="flex h-16 w-16 items-center justify-center rounded bg-slate-50 text-center text-xs text-slate-500">{t('No image')}</span>}</td>:null}
              <td className="min-w-44 border border-slate-200 p-3 font-medium">{item.product_name}</td>
              <td className="max-w-72 break-words border border-slate-200 p-3 text-slate-600">{item.sku||'—'}</td>
              <td className="whitespace-nowrap border border-slate-200 p-3">{item.size||'—'}</td>
              <td className="border border-slate-200 p-3">{item.color||'—'}</td>
              <td className="border border-slate-200 p-3 text-right tabular-nums">{item.quantity}</td>
              <td className="border border-slate-200 p-3">{item.unit||'—'}</td>
              <td className="whitespace-nowrap border border-slate-200 p-3 text-right tabular-nums">{orderMoney(item.unit_price,locale)}</td>
              <td className="whitespace-nowrap border border-slate-200 p-3 text-right font-semibold tabular-nums">{orderMoney(item.unit_price===null?null:item.quantity*item.unit_price,locale)}</td>
            </tr>;
          }))}</tbody>
        </table>
      </div>
    </section>
    <div className="grid gap-6 md:grid-cols-2"><section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{t('Quote')}</h2><p className="mt-3 text-sm">{t('Payment status')}: {t(order.payment_status??'unknown')}</p>{quoted?<><dl className="mt-4 space-y-3">{[['Product subtotal',order.product_subtotal],['Shipping fee',order.shipping_fee],['Total',order.grand_total],['PayPal fee',order.paypal_fee],['PayPal total',order.paypal_collection]].map(([key,value])=><div key={String(key)} className="flex justify-between gap-3"><dt>{t(String(key))}</dt><dd className="font-semibold">{orderMoney(value as number|null,locale)}</dd></div>)}</dl><p className="mt-4 text-xs text-slate-500">{t('Quote updated')}: {orderDate(order.quote_updated_at!,locale)}</p>{order.status==='quoted'&&order.payment_status==='unpaid'&&order.quote_ready_at&&order.shipping_fee!==null&&order.grand_total!==null?<form action={confirmCustomerQuote} className="mt-5"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="id" value={id}/><input type="hidden" name="version" value={order.quote_updated_at!}/><button className="min-h-12 rounded-lg bg-blue-700 px-5 font-semibold text-white">{t('Confirm quote')}</button><p className="mt-2 text-sm text-slate-500">{t('Confirmation is not a payment.')}</p></form>:null}</>:<p className="mt-4 text-slate-500">{t('Pending quote')}</p>}</section>
    <section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{t('Logistics')}</h2><dl className="mt-4 space-y-3"><dt className="text-sm text-slate-500">{t('Carrier')}</dt><dd>{order.shipping_carrier||'—'}</dd><dt className="text-sm text-slate-500">{t('Tracking number')}</dt><dd className="break-all font-semibold">{order.tracking_number||t(['shipped','completed'].includes(order.status)?'Tracking not available yet':'Not shipped yet')}</dd></dl></section></div>
    <section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{t('Shipping address')}</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">{[['Recipient',order.shipping_recipient_name],['Phone',order.shipping_phone],['Country',order.shipping_country],['Address',order.shipping_address]].map(([key,value])=><div key={key}><dt className="text-sm text-slate-500">{t(key!)}</dt><dd className="mt-1 whitespace-pre-line break-words">{value||'—'}</dd></div>)}</dl></section><a className="inline-flex min-h-11 items-center text-blue-700" href={`mailto:wangchi.2004@gmail.com?subject=${encodeURIComponent(`Order ${order.id}`)}`}>{t('Contact us')} →</a>
  </section></main>;
}
