import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import ts from 'typescript';
test('only reviewed unpaid quotes qualify; payment, editing and retries preserve financial state',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create table orders(id uuid primary key,status text,product_subtotal numeric,shipping_fee numeric,grand_total numeric,paypal_fee numeric,paypal_collection numeric,quote_updated_at timestamptz,mobile_user_id uuid);
   create table order_items(id uuid primary key,order_id uuid references orders on delete cascade,product_id uuid,variant_id uuid,quantity integer,unit_price numeric,size text,color text,sku text);
   grant usage on schema public to anon,authenticated,service_role;grant all on orders,order_items to service_role;
   insert into orders values('10000000-0000-4000-8000-000000000001','new',100,10,110,null,null,'2026-11-15T01:00:00Z',null);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261115143204_unpaid_customer_quotes.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261115145130_protect_confirmed_payments.sql',import.meta.url),'utf8'));
  const id='10000000-0000-4000-8000-000000000001',item='20000000-0000-4000-8000-000000000001',version='2026-11-15T01:00:00Z';
  assert.equal((await db.query('select payment_status from orders')).rows[0].payment_status,'unknown');
  await db.query('insert into order_items(id,order_id,quantity,unit_price) values($1,$2,2,50)',[item,id]);
  const call=(action,v=version)=>db.query('select manage_order_payment($1,$2,$3)',[id,action,v]);
  await db.exec('set role service_role');
  await assert.rejects(call('publish','2026-11-14T00:00:00Z'),/QUOTE_CHANGED/);
  await call('publish');await call('publish');
  assert.equal((await db.query("select count(*)::int as n from orders where payment_status='unpaid' and quote_ready_at is not null and status<>'cancelled'")).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int as n from order_payment_events')).rows[0].n,1);
  await db.query('update order_items set quantity=3 where id=$1',[item]);assert.equal((await db.query('select quote_ready_at from orders')).rows[0].quote_ready_at,null);
  await assert.rejects(call('publish'),/COMPLETE_QUOTE_REQUIRED/);
  await db.query('update orders set product_subtotal=150,grand_total=160 where id=$1',[id]);await call('publish');
  await assert.rejects(call('paid','2026-11-14T00:00:00Z'),/QUOTE_CHANGED/);
  await call('paid');await call('paid');
  assert.equal((await db.query("select count(*)::int as n from orders where payment_status='unpaid' and quote_ready_at is not null")).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int as n from order_payment_events where action='paid'")).rows[0].n,1);
  await assert.rejects(db.query('update order_items set unit_price=5 where id=$1',[item]),/PAID_ORDER_LOCKED/);
  await assert.rejects(db.query('update orders set grand_total=1 where id=$1',[id]),/PAID_ORDER_LOCKED/);
  await assert.rejects(call('publish'),/ORDER_NOT_ELIGIBLE/);
  await db.exec('reset role;set role authenticated');await assert.rejects(call('paid'),/permission denied/);
 }finally{await db.close();}
});
test('quote query enforces owner, confirmed availability, complete totals and unpaid state before pagination',async()=>{
 let source=(await readFile(new URL('../src/lib/customerQuotes.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');const calls=[],q={};for(const key of ['select','or','eq','not','neq','order','range'])q[key]=(...args)=>{calls.push([key,...args]);return q};q.then=resolve=>Promise.resolve({data:[],count:0,error:null}).then(resolve);
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const code=`export default createSupabaseAdminClient=>{const orderFields='customer-safe-fields';const orderOwnerFilter=user=>'owner:'+user.id;${js.replace(/export /g,'')};return customerQuotes}`;
 const loader=(await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default(()=>({from:()=>q}));
 await loader({id:'verified-account'},2);
 for(const expected of [['or','owner:verified-account'],['eq','payment_status','unpaid'],['not','quote_ready_at','is',null],['neq','status','cancelled'],['not','shipping_fee','is',null],['not','grand_total','is',null],['range',10,19]])assert.ok(calls.some(call=>JSON.stringify(call)===JSON.stringify(expected)),JSON.stringify(expected));
});
