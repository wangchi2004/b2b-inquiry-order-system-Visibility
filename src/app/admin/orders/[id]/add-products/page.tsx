import Link from 'next/link';
import {checkAdminAccess} from '@/lib/admin';
import {createSupabaseAdminClient} from '@/lib/supabase';
import {addCatalogItemToOrder} from '../actions';

export default async function AddProducts({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{password?:string;q?:string;page?:string;message?:string}>}) {
  const {id}=await params;
  const {password,q='',page:raw,message}=await searchParams;
  const access=(await checkAdminAccess(password));
  if(!access.ok)return <p className="p-8">请先登录后台。</p>;
  const db=createSupabaseAdminClient();
  const {data:order}=await db.from('orders').select('status,payment_status,quote_updated_at').eq('id',id).maybeSingle();
  const back=`/admin/orders/${id}?password=${encodeURIComponent(access.password)}`;
  if(!order)return <p className="p-8">订单不存在。</p>;
  if(order.payment_status==='paid'||!['new','submitted','quoted','confirmed'].includes(order.status))return <main className="p-8"><p>此订单已收款或进入履约阶段，不能添加商品。</p><Link href={back}>返回订单</Link></main>;
  const parsed=Number(raw);
  const page=Number.isSafeInteger(parsed)&&parsed>0&&parsed<=10000?parsed:1;
  let query=db.from('products').select('id,name,image_url,product_variants(id,sku,size,color,unit,price)',{count:'exact'}).eq('status','active').order('name').order('id');
  const term=q.trim().slice(0,100).replace(/[\\%_]/g,'\\$&');
  if(term)query=query.ilike('name',`%${term}%`);
  const {data:products,error,count}=await query.range((page-1)*20,page*20-1);
  const href=(p:number)=>`?${new URLSearchParams({password:access.password,q,page:String(p)})}`;
  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <Link className="text-blue-700" href={back}>← 返回订单</Link>
    <h1 className="text-2xl font-bold">修改订单 / 从产品目录添加商品</h1>
    <p>选择规格和数量，添加后返回原订单。原有商品及价格保留；金额自动重算，现货和运费需要重新确认。</p>
    {message?<p role="status" className="rounded bg-blue-50 p-4">{message}</p>:null}
    <form className="flex gap-3"><input type="hidden" name="password" value={access.password}/><input aria-label="搜索商品名称" name="q" defaultValue={q} placeholder="搜索商品名称" className="grow rounded border p-3"/><button className="rounded bg-blue-700 px-5 text-white">搜索</button></form>
    {error?<p role="alert">产品目录暂时无法加载，请刷新重试。</p>:!products?.length?<p>没有找到商品。</p>:products.map(product=><article key={product.id} className="rounded border p-4">
      <div className="mb-4 flex items-center gap-4">{/* eslint-disable-next-line @next/next/no-img-element */}
        {product.image_url?<img src={product.image_url} alt={product.name} className="h-20 w-20 object-contain"/>:null}<h2 className="font-semibold">{product.name}</h2></div>
      {product.product_variants.length?<form action={addCatalogItemToOrder} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="password" value={access.password}/><input type="hidden" name="order_id" value={id}/><input type="hidden" name="quote_version" value={order.quote_updated_at??''}/><input type="hidden" name="q" value={q}/><input type="hidden" name="page" value={page}/>
        <label className="grid gap-1">规格 / 价格 USD<select required name="variant_id" className="max-w-full rounded border p-3">{product.product_variants.map(v=><option key={v.id} value={v.id} disabled={v.price===null}>{[v.sku,v.size,v.color,`${v.price??'待报价'} / ${v.unit??''}`].filter(Boolean).join(' · ')}</option>)}</select></label>
        <label className="grid gap-1">数量<input required name="quantity" type="number" min="1" max="100000" step="1" defaultValue="1" className="w-24 rounded border p-3"/></label>
        <button className="min-h-12 rounded bg-blue-700 px-4 text-white">添加到此订单</button>
      </form>:<p>暂无可用规格。</p>}
    </article>)}
    <nav className="flex justify-between">{page>1?<Link href={href(page-1)}>上一页</Link>:<span/>}{page*20<(count??0)?<Link href={href(page+1)}>下一页</Link>:null}</nav>
  </main>;
}
