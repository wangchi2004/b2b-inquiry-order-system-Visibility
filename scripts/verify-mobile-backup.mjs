import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
const dir=process.argv[2];if(!dir) throw Error('Pass the private backup directory.');
const meta=JSON.parse(await readFile(resolve(dir,'metadata.json'),'utf8'));
const rows=[];for(let i=0;i<16;i++)rows.push(...JSON.parse(await readFile(resolve(dir,`rows-${i}.json`),'utf8')));
const qi=s=>'"'+s.replaceAll('"','""')+'"';
const db=new PGlite();
try {
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); grant usage on schema auth,public to service_role;');
 const tables=meta.tables.filter(t=>t.schema==='public');
 for(const t of tables){const cols=meta.columns.filter(c=>c.schema==='public'&&c.table_name===t.name);await db.exec(`create table public.${qi(t.name)} (${cols.map(c=>`${qi(c.name)} ${c.type}${c.default_expr?' default '+c.default_expr:''}${c.not_null?' not null':''}`).join(',')});`);}
 for(const f of meta.functions.filter(f=>f.schema==='public')) await db.exec(f.definition);
 for(const r of rows.filter(r=>r.source_schema==='public')) await db.query(`insert into public.${qi(r.source_table)} select * from jsonb_populate_record(null::public.${qi(r.source_table)},$1::jsonb)`,[JSON.stringify(r.data)]);
 for(const c of meta.constraints.filter(c=>c.schema==='public').sort((a,b)=>Number(a.type==='f')-Number(b.type==='f')))await db.exec(`alter table public.${qi(c.table_name)} add constraint ${qi(c.name)} ${c.definition};`);
 for(const g of meta.grants.filter(g=>g.table_schema==='public'&&['anon','authenticated','service_role'].includes(g.grantee)))await db.exec(`grant ${g.privilege_type} on public.${qi(g.table_name)} to ${qi(g.grantee)};`);
 for(const t of meta.triggers.filter(t=>t.schema==='public'))await db.exec(t.definition);
 for(const t of tables)if(t.rls)await db.exec(`alter table public.${qi(t.name)} enable row level security;`);
 let total=0;
 for(const t of tables){const expected=rows.filter(r=>r.source_schema==='public'&&r.source_table===t.name).length;assert.equal((await db.query(`select count(*)::int n from public.${qi(t.name)}`)).rows[0].n,expected);total+=expected;}
 const before=(await db.query('select id,product_id,price from product_variants order by id')).rows;
 for(const file of ['20260909232335_customer_mobile_orders.sql','20260910001328_variant_dimension_image.sql'])await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 assert.deepEqual((await db.query('select id,product_id,price from product_variants order by id')).rows,before);
 const user='10000000-0000-4000-8000-000000000099';
 await db.query("insert into auth.users values($1,'restore-check@example.invalid',now())",[user]);
 await db.query("insert into mobile_customer_profiles values($1,'MIGRATION TEST','','US','','TEST ADDRESS')",[user]);
 const v=(await db.query("select v.id,v.price from product_variants v join products p on p.id=v.product_id where p.status='active' and v.price is not null and v.stock_status<>'out_of_stock' limit 1")).rows[0];
 await db.exec('set role service_role');
 const items=JSON.stringify([{variantId:v.id,quantity:1,unitPrice:Number(v.price)}]);
 const id=(await db.query("select submit_mobile_order($1,'restore-check@example.invalid','backup-verify-key-001',$2,'en') id",[user,items])).rows[0].id;
 assert.equal((await db.query("select submit_mobile_order($1,'restore-check@example.invalid','backup-verify-key-001',$2,'en') id",[user,items])).rows[0].id,id);
 await db.query("select manage_mobile_order($1,'quote',10)",[id]);
 const result={verified:true,public_tables:tables.length,public_rows:total,migrations:2,catalog_preserved:true,test_order_and_quote:true,checked_at:new Date().toISOString()};
 await writeFile(resolve(dir,'verification.json'),JSON.stringify(result,null,2),{mode:0o600});console.log(result);
}catch(e){console.error('Verification failed:',e.message);process.exitCode=1;}finally{await db.close();}
