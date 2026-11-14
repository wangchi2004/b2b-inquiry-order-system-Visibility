import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

test('pgvector migration queues changes, prevents stale completion, filters matches and isolates access', async () => {
 const db=new PGlite({extensions:{vector}});
 const id='00000000-0000-0000-0000-000000000001';
 try {
  await db.exec(`create schema extensions; create role anon; create role authenticated; create role service_role;
  create table products(id uuid primary key,name text,slug text,sku text,description text,category text,category_id uuid,material text,color text,size text,status text);
  create table categories(id uuid primary key,name text);
  create table product_variants(id uuid,product_id uuid,sku text,color text,size text,stock_status text,price numeric);
  create table product_translations(product_id uuid,name text,description text);
  insert into products(id,name,status) values('${id}','Black Heel Rubber Sheet','active');
  insert into product_variants(product_id,sku,color,size,stock_status,price) values('${id}','B-42','Black','42','in_stock',10);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20260923064727_product_text_search.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20260923070230_product_semantic_search.sql',import.meta.url),'utf8'));
  const first=(await db.query('select product_id,revision,lease_token from claim_product_embeddings(5)')).rows[0];
  assert.equal(first.product_id,id);
  assert.equal((await db.query('select * from claim_product_embeddings(5)')).rows.length,0,'lease prevents duplicate jobs');
  await db.exec(`update products set description='For repairing heels' where id='${id}'`);
  const stale=await db.query(`update product_embeddings set status='ready' where product_id=$1 and revision=$2 and lease_token=$3 returning product_id`,[id,first.revision,first.lease_token]);
  assert.equal(stale.rows.length,0,'old job cannot overwrite changed product');
  const job=(await db.query('select * from claim_product_embeddings(5)')).rows[0];
  const embedding=JSON.stringify([1,...Array(1535).fill(0)]);
  await db.query("update product_embeddings set embedding=$1,status='ready' where product_id=$2 and revision=$3",[embedding,id,job.revision]);
  const match=async(color='')=>(await db.query('select * from match_product_embeddings($1,$2,$3)',[embedding,'text-embedding-3-small',color])).rows;
  assert.equal((await match())[0].product_id,id);
  assert.equal((await match('White')).length,0);
  await db.exec('update product_variants set price=11');
  assert.equal((await match()).length,1,'price does not require re-embedding');
  await db.exec("update product_variants set color='White'");
  assert.equal((await match()).length,0,'pending embeddings excluded');
  await db.exec(`insert into product_translations values('${id}','Heel rubber','Translated description')`);
  assert.ok(Number((await db.query('select revision from product_embeddings')).rows[0].revision)>Number(job.revision));
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from product_embeddings'),/permission denied/);
  await assert.rejects(db.query('select * from claim_product_embeddings(5)'),/permission denied/);
 } finally {await db.close();}
});
