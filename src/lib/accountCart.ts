import 'server-only';
import {createSupabaseAdminClient} from '@/lib/supabase';
import type {CartLineItem} from '@/lib/types';
export async function accountCart(userId:string,locale="en"){
 const db=createSupabaseAdminClient();
 const {data,error}=await db.from('customer_carts').select('items,revision').eq('user_id',userId).maybeSingle();
 if(error)throw error;
 const quantities=(data?.items??{}) as Record<string,number>,ids=Object.keys(quantities);
 let variants:Record<string,unknown>[]=[];
 if(ids.length){const result=await db.from('product_variants').select('id,product_id,sku,size,color,unit,price,products(name,status,image_url,image_url_2,image_url_3,product_translations(locale,name))').in('id',ids);if(result.error)throw result.error;variants=result.data??[];}
 const items:CartLineItem[]=ids.map(id=>{
  const v=variants.find(v=>v.id===id);const p=(Array.isArray(v?.products)?v.products[0]:v?.products) as Record<string,unknown>|undefined;
  const active=p?.status==='active';
  const translations=(p?.product_translations??[]) as {locale:string;name:string}[];
  const name=translations.find(t=>t.locale===locale)?.name??translations.find(t=>t.locale==='en')?.name??p?.name;
  return {variantId:id,productId:String(v?.product_id??id),sku:String(v?.sku??id),productName:active?String(name):'Product unavailable / 商品已下架',quantity:quantities[id],size:v?.size?String(v.size):undefined,color:v?.color?String(v.color):undefined,unit:v?.unit?String(v.unit):undefined,unitPrice:active&&v?.price!=null?Number(v.price):undefined,imageUrl:active?String(p?.image_url||p?.image_url_2||p?.image_url_3||'')||undefined:undefined};
 });
 return {userId,revision:Number(data?.revision??0),items};
}
