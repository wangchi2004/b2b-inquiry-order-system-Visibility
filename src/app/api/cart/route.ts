import {accountUser} from '@/lib/accountSession';
import {accountCart} from '@/lib/accountCart';
import {createSupabaseAdminClient} from '@/lib/supabase';
const headers={'Cache-Control':'private, no-store'};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
const localeFor=(request:Request)=>{const locale=new URL(request.url).searchParams.get('locale')??'en';return ['en','zh','ja','ko'].includes(locale)?locale:'en';};
export async function GET(request:Request){try{const user=await accountUser();if(!user)return json({error:'LOGIN_REQUIRED'},401);return json(await accountCart(user.id,localeFor(request)));}catch{return json({error:'CART_UNAVAILABLE'},503);}}
export async function POST(request:Request){
 const url=new URL(request.url);url.host=request.headers.get('host')??url.host;
 if(request.headers.get('origin')!==url.origin)return json({error:'FORBIDDEN'},403);
 try{
  const user=await accountUser();if(!user)return json({error:'LOGIN_REQUIRED'},401);
  let body;try{body=await request.json();}catch{return json({error:'INVALID_CART'},400);}
  if(body?.userId!==user.id)return json({error:'ACCOUNT_CHANGED'},409);
  if(!/^[0-9a-f-]{36}$/i.test(body?.operationId)||!Array.isArray(body?.changes)||body.changes.length>200)return json({error:'INVALID_CART'},400);
  if(body.changes.some((c:Record<string,unknown>)=>!c||!['add','set','remove','consume'].includes(String(c.type))||typeof c.variantId!=='string'||!/^[0-9a-f-]{36}$/i.test(c.variantId)||(['set','remove'].includes(String(c.type))&&(!Number.isSafeInteger(c.expected)||Number(c.expected)<0))||(c.type!=='remove'&&(!Number.isSafeInteger(c.quantity)||Number(c.quantity)<1||Number(c.quantity)>100000))))return json({error:'INVALID_CART'},400);
  const {error}=await createSupabaseAdminClient().rpc('mutate_customer_cart',{p_user:user.id,p_operation:body.operationId,p_changes:body.changes});
  if(error)return json({error:['CART_CONFLICT','CART_LIMIT','PRODUCT_UNAVAILABLE'].find(key=>error.message.includes(key))??'CART_UNAVAILABLE'},409);
  return json(await accountCart(user.id,localeFor(request)));
 }catch{return json({error:'CART_UNAVAILABLE'},503);}
}
