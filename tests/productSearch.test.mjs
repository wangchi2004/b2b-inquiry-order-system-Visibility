import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('database search: reordered tokens, stemming, SKU, same-variant facets, keywords and permissions', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table products(id uuid primary key,name text,slug text,sku text,description text,category text,category_id uuid,material text,color text,size text,status text);
      create table categories(id uuid primary key,name text);
      create table product_variants(id uuid,product_id uuid,sku text,color text,size text,stock_status text);
      create table product_translations(product_id uuid,name text,description text);
      insert into products values ('00000000-0000-0000-0000-000000000001','Loro Piana sneaker soles','loro',null,'Replacement outsole','Soles',null,'rubber',null,null,'active'),
      ('00000000-0000-0000-0000-000000000002','Black heel rubber sheets','heel',null,null,'Sheets',null,'rubber','black',null,'active'),
      ('00000000-0000-0000-0000-000000000003','Hidden sole','hidden',null,null,null,null,null,null,null,'draft');
      insert into product_variants values
      (null,'00000000-0000-0000-0000-000000000001','LP-W-42','white','42','in_stock'),
      (null,'00000000-0000-0000-0000-000000000001','LP-B-43','black','43','out_of_stock');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20260923064727_product_text_search.sql',import.meta.url),'utf8'));
    const search = async (q='',color='',size='',material='',availability='') => (await db.query('select * from search_storefront_products($1,$2,$3,$4,$5)',[q,color,size,material,availability])).rows;
    assert.equal((await search('white sneaker sole')).length,1);
    assert.equal((await search('Loro Piana sole')).length,1);
    assert.equal((await search('black heel rubber')).length,1);
    assert.equal((await search('size 42 white outsole')).length,1);
    assert.equal((await search('LP-W-42'))[0].relevance,100);
    assert.equal((await search('', 'white','43')).length,0);
    assert.equal((await search('', 'black','43','','in_stock')).length,0);
    assert.equal((await search('43 white')).length,0);
    assert.equal((await search('142')).length,0);
    assert.equal((await search('hidden')).length,0);
    assert.equal((await search("%' OR 1=1 --")).length,0);
    assert.equal((await search('')).length,2);
    await db.exec(`update products set keywords=array['repairing heels'] where slug='heel';`);
    assert.equal((await search('repairing heels')).length,1);
    assert.equal((await search('', '', '', 'leather')).length,0);
    await db.exec('set role anon');
    await assert.rejects(search('sole'), /permission denied/);
  } finally { await db.close(); }
});
