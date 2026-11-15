import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {readAddress,shippingSnapshot} from '../src/lib/addressData.ts';

test('address validation trims input and requires recipient, phone, country and street',()=>{
 const form=new FormData();for(const [k,v]of Object.entries({recipient:' Buyer ',phone:'+44 123',country:' UK ',address:' Street 1 ',city:' London '}))form.set(k,v);
 assert.equal(readAddress(form).recipient,'Buyer');assert.equal(readAddress(form).city,'London');
 form.set('phone','');assert.equal(readAddress(form),null);form.set('phone','123');form.set('address','x'.repeat(1001));assert.equal(readAddress(form),null);
});
test('order address snapshot is independent of later address-book edits',()=>{
 const address={recipient:'Buyer',phone:'123',country:'UK',company:'Shop',address:'Street 1',city:'London',region:'',postal_code:'AB1',note:'Door 2'};
 const snapshot=shippingSnapshot(address);address.address='Street 2';
 assert.equal(snapshot.shipping_address,'Shop\nStreet 1\nLondon\nAB1');assert.equal(snapshot.shipping_note,'Door 2');assert.equal(snapshot.shipping_country,'UK');
});
test('transactional address book enforces owner isolation and exactly one default',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261115073609_customer_address_book.sql',import.meta.url),'utf8'));
  const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
  await db.query('insert into auth.users values($1),($2)',[a,b]);
  const data={recipient:'Buyer',phone:'123',country:'UK',address:'Street 1',is_default:false};
  const call=(user,action,id=null,body=data)=>db.query('select public.manage_customer_address($1,$2,$3,$4::jsonb)',[user,action,id,JSON.stringify(body)]);
  await db.exec('set role service_role');await call(a,'save');await call(a,'save',null,{...data,address:'Street 2'});await call(b,'save');
  const rows=(await db.query('select * from customer_addresses where user_id=$1 order by created_at,id',[a])).rows;
  assert.equal(rows.filter(r=>r.is_default).length,1);const first=rows.find(r=>r.is_default).id,second=rows.find(r=>!r.is_default).id;
  await assert.rejects(call(b,'delete',first),/ADDRESS_NOT_FOUND/);await assert.rejects(call(b,'default',first),/ADDRESS_NOT_FOUND/);await assert.rejects(call(b,'save',first),/ADDRESS_NOT_FOUND/);
  await call(a,'default',second);assert.equal((await db.query('select id from customer_addresses where user_id=$1 and is_default',[a])).rows[0].id,second);
  await call(a,'save',second,{...data,address:'Updated'});assert.equal((await db.query('select address from customer_addresses where id=$1',[second])).rows[0].address,'Updated');
  await call(a,'delete',second);assert.equal((await db.query('select id from customer_addresses where user_id=$1 and is_default',[a])).rows[0].id,first);
  await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${a}';`);assert.equal((await db.query('select * from customer_addresses')).rows.length,1);
  await assert.rejects(call(a,'delete',first),/permission denied/);
  await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from customer_addresses'),/permission denied/);
  await db.exec('reset role;set role service_role');await call(a,'delete',first);assert.equal((await db.query('select * from customer_addresses where user_id=$1',[a])).rows.length,0);
 }finally{await db.close();}
});

import ts from 'typescript';
async function addressLoader(result){
 const calls=[];const q={};for(const method of ['select','eq','order','maybeSingle'])q[method]=(...args)=>{calls.push([method,...args]);return q};q.then=(resolve,reject)=>Promise.resolve(result).then(resolve,reject);
 let src=(await readFile(new URL('../src/lib/customerAddresses.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const module=await import(`data:text/javascript;base64,${Buffer.from(`export default createSupabaseAdminClient=>{${js.replace(/export /g,'')};return {checkoutAddress,customerAddresses}}`).toString('base64')}`);
 return {...module.default(()=>({from:()=>q})),calls};
}
test('checkout looks up selected address only within the signed-in account',async()=>{
 const api=await addressLoader({data:null,error:null});const id='20000000-0000-4000-8000-000000000001';
 await assert.rejects(api.checkoutAddress('account-a',id),/ADDRESS_NOT_FOUND/);
 assert.ok(api.calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]==='account-a'));
 assert.ok(api.calls.some(c=>c[0]==='eq'&&c[1]==='id'&&c[2]===id));
 const defaults=await addressLoader({data:null,error:null});assert.equal(await defaults.checkoutAddress('account-a'),null);
 assert.ok(defaults.calls.some(c=>c[0]==='eq'&&c[1]==='is_default'&&c[2]===true));
});
test('address provider failures are reported instead of silently dropping the shipping address',async()=>{
 const api=await addressLoader({data:null,error:{message:'offline'}});
 await assert.rejects(api.checkoutAddress('account-a'),/ADDRESSES_UNAVAILABLE/);
 await assert.rejects(api.customerAddresses('account-a'),/ADDRESSES_UNAVAILABLE/);
});
