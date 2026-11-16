import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('catalog addition is atomic, uses current catalog price, preserves old lines and rejects stale/locked/client writes',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table orders(id uuid primary key,status text,payment_status text,quote_updated_at timestamptz,quote_ready_at timestamptz,updated_at timestamptz,product_subtotal numeric,shipping_fee numeric,grand_total numeric,paypal_fee numeric,paypal_collection numeric);
 create table products(id uuid primary key,name text,status text);
 create table product_variants(id uuid primary key,product_id uuid,sku text,size text,color text,unit text,price numeric);
 create table order_items(id uuid default gen_random_uuid(),order_id uuid,product_id uuid,variant_id uuid,product_name text,sku text,size text,color text,quantity integer,unit text,unit_price numeric);
 grant all on orders,products,product_variants,order_items to service_role;
 insert into orders(id,status,payment_status,shipping_fee,quote_ready_at) values('10000000-0000-4000-8000-000000000001','confirmed','unpaid',10,now());
 insert into products values('20000000-0000-4000-8000-000000000001','Soles','active');
 insert into product_variants values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','SKU','42','Black','pair',15);
 insert into order_items(order_id,quantity,unit_price) values('10000000-0000-4000-8000-000000000001',2,7);`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261116021827_admin_add_order_catalog_item.sql',import.meta.url),'utf8'));
 const call=(qty=3,version=null)=>db.query('select admin_add_order_catalog_item($1,$2,$3,$4)',['10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',qty,version]);
 await db.exec('set role authenticated');await assert.rejects(call(),/permission denied/);
 await db.exec('reset role;set role service_role');
 await assert.rejects(call(0),/INVALID_QUANTITY/);
 await call();
 const o=(await db.query('select * from orders')).rows[0];
 assert.equal(Number(o.product_subtotal),59);assert.equal(Number(o.grand_total),69);assert.equal(Number(o.paypal_collection),72.45);assert.equal(o.quote_ready_at,null);assert.equal(o.status,'new');
 assert.equal((await db.query('select unit_price from order_items where quantity=2')).rows[0].unit_price,'7');
 await assert.rejects(call(),/ORDER_CHANGED/);
 await db.exec("update orders set payment_status='paid'");await assert.rejects(call(1,o.quote_updated_at),/ORDER_LOCKED/);
 await db.exec("update orders set payment_status='unpaid',status='shipped'");await assert.rejects(call(1,o.quote_updated_at),/ORDER_LOCKED/);
 assert.equal((await db.query('select count(*)::int as n from order_items')).rows[0].n,2);
 }finally{await db.close();}
});
