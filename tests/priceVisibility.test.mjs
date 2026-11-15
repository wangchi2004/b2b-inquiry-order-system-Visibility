import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { productForViewer } from '../src/lib/priceVisibility.ts';
const product={id:'p1',name:'Sole',slug:'sole',image_url:'sole.png',galleryImages:['sole.png'],product_variants:[{id:'v1',price:123.456,sku:'SOLE1'},{id:'v2',price:0,sku:'SOLE2'},{id:'v3',price:null,sku:'SOLE3'}]};
test('guest product data strips every variant price without changing shared source data',()=>{
  const guest=productForViewer(product,false);
  assert.deepEqual(guest.product_variants.map(v=>v.price),[null,null,null]);
  assert.equal(guest.name,'Sole'); assert.equal(guest.product_variants[0].sku,'SOLE1');
  assert.deepEqual(guest.galleryImages,['sole.png']);
  assert.ok(!JSON.stringify(guest).includes('123.456'));
  assert.deepEqual(product.product_variants.map(v=>v.price),[123.456,0,null]);
});
test('signed-in data retains actual prices including zero',()=>{
  assert.deepEqual(productForViewer(product,true).product_variants.map(v=>v.price),[123.456,0,null]);
});
async function storefront(user){
  let src=await readFile(new URL('../src/lib/storefront.ts',import.meta.url),'utf8');src=src.replace(/^import .*;\n/gm,'');
  const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const factory=`export default (accountUser,getActiveProductsWithVariants,productForViewer)=>{const hasSupabaseAdminConfig=()=>false;${js.replace(/export /g,'')}return getStorefrontData;}`;
  const module=await import(`data:text/javascript;base64,${Buffer.from(factory).toString('base64')}`);
  return module.default(async()=>user,async()=>({products:[product],categoryTree:[],error:null}),productForViewer)('en');
}
test('homepage and search serialization use verified login to decide price access',async()=>{
  const guest=await storefront(null),customer=await storefront({email:'customer@example.com'});
  assert.equal(guest.canViewPrices,false); assert.equal(guest.products[0].product_variants[0].price,null);
  assert.equal(customer.canViewPrices,true); assert.equal(customer.products[0].product_variants[0].price,123.456);
});
test('database anonymous role can browse variants but cannot select prices or select star',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.product_variants(id text,product_id text,sku text,size text,color text,unit text,price numeric,stock_status text,created_at timestamptz,updated_at timestamptz,dimension_image_url text);
      grant usage on schema public to anon,authenticated,service_role;
      grant select on public.product_variants to anon,authenticated,service_role;
      insert into public.product_variants(id,sku,price) values('p1','SOLE1',123.456);`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261115002809_restrict_guest_product_prices.sql',import.meta.url),'utf8'));
    await db.exec('set role anon');
    assert.equal((await db.query('select sku from product_variants')).rows[0].sku,'SOLE1');
    await assert.rejects(db.query('select price from product_variants'),/permission denied/);
    await assert.rejects(db.query('select * from product_variants'),/permission denied/);
    await db.exec('reset role; set role authenticated');
    assert.equal(Number((await db.query('select price from product_variants')).rows[0].price),123.456);
    await db.exec('reset role; set role service_role');
    assert.equal(Number((await db.query('select price from product_variants')).rows[0].price),123.456);
  }finally{await db.close();}
});
