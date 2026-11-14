import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

test('favorites enforce ownership, uniqueness, deletion and account/product cascades', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      create table public.products(id uuid primary key);`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261114160053_customer_favorites.sql', import.meta.url), 'utf8'));
    const a='10000000-0000-4000-8000-000000000001', b='10000000-0000-4000-8000-000000000002', p='20000000-0000-4000-8000-000000000001';
    await db.query('insert into auth.users values ($1),($2)',[a,b]);
    await db.query('insert into products values ($1)',[p]);
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${a}';`);
    await db.query('insert into customer_favorites(user_id,product_id) values ($1,$2) on conflict do nothing',[a,p]);
    await db.query('insert into customer_favorites(user_id,product_id) values ($1,$2) on conflict do nothing',[a,p]);
    assert.equal((await db.query('select * from customer_favorites')).rows.length,1);
    await assert.rejects(db.query('insert into customer_favorites(user_id,product_id) values ($1,$2)',[b,p]),/row-level security/);
    await db.exec(`set request.jwt.claim.sub='${b}';`);
    assert.equal((await db.query('select * from customer_favorites')).rows.length,0);
    await db.query('delete from customer_favorites where user_id=$1',[a]);
    await db.query('insert into customer_favorites(user_id,product_id) values ($1,$2)',[b,p]);
    await db.exec('reset role');
    assert.equal((await db.query('select * from customer_favorites')).rows.length,2);
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from customer_favorites'),/permission denied/);
    await db.exec('reset role');
    await db.query('delete from auth.users where id=$1',[a]);
    assert.equal((await db.query('select * from customer_favorites')).rows.length,1);
    await db.query('delete from products where id=$1',[p]);
    assert.equal((await db.query('select * from customer_favorites')).rows.length,0);
  } finally { await db.close(); }
});

async function route(user, database) {
  let source = await readFile(new URL('../src/app/api/favorites/route.ts',import.meta.url),'utf8');
  source=source.replace(/^import .*;\n/gm,'');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const url=`data:text/javascript;base64,${Buffer.from(`export default (accountUser,createSupabaseAdminClient)=>{${js.replace(/export /g,'')};return {GET,PUT,DELETE};}`).toString('base64')}`;
  return (await import(url)).default(async()=>user,()=>database);
}
function database() {
  const rows = new Set();
  const chain = (table) => {
    let filters={}, op='get', value;
    const q={select(){return q;}, eq(k,v){filters[k]=v;return q;},order(){return q;},range(){return q;},maybeSingle(){return Promise.resolve({data: filters.id==='20000000-0000-4000-8000-000000000001'?{id:filters.id}:null,error:null});},upsert(v){op='save';value=v;return q;},delete(){op='delete';return q;},then(resolve){
      if(op==='save')rows.add(`${value.user_id}:${value.product_id}`);
      if(op==='delete')rows.delete(`${filters.user_id}:${filters.product_id}`);
      return Promise.resolve({data:table==='customer_favorites'&&op==='get'?[...rows].filter(r=>r.startsWith(filters.user_id+':')).map(r=>({product_id:r.split(':')[1]})):null,error:null}).then(resolve);
    }};return q;
  };
  return {from:chain,rows};
}
const id='20000000-0000-4000-8000-000000000001';
const req=(method,body,origin='https://shop.test')=>new Request('https://shop.test/api/favorites',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('API rejects guest and cross-origin writes without accessing storage',async()=>{
  const guest=await route(null,null);
  assert.equal((await guest.GET()).status,401);
  assert.equal((await guest.PUT(req('PUT',{productId:id}))).status,401);
  assert.equal((await guest.PUT(req('PUT',{productId:id},'https://other.test'))).status,403);
});
test('API binds ownership to login, retries safely, and permits only own deletion',async()=>{
  const db=database();const a=await route({id:'a'},db), b=await route({id:'b'},db);
  assert.equal((await a.PUT(req('PUT',{productId:id,user_id:'b'}))).status,200);
  await a.PUT(req('PUT',{productId:id}));
  assert.equal(db.rows.size,1);
  assert.deepEqual(await (await a.GET()).json(),{ids:[id]});
  assert.deepEqual(await (await b.GET()).json(),{ids:[]});
  await b.DELETE(req('DELETE',{productId:id,user_id:'a'}));
  assert.equal(db.rows.size,1);
  await a.DELETE(req('DELETE',{productId:id}));
  await a.DELETE(req('DELETE',{productId:id}));
  assert.equal(db.rows.size,0);
  assert.equal((await a.PUT(req('PUT',{productId:'bad'}))).status,400);
  assert.equal((await a.PUT(req('PUT',{productId:'20000000-0000-4000-8000-000000000002'}))).status,404);
});
