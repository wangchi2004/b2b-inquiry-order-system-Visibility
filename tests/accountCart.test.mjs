import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import ts from 'typescript';
test('two devices share atomic increments, deduplicated retries, conflict protection and checkout consumption',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table products(id uuid primary key,status text);create table product_variants(id uuid primary key,product_id uuid references products);grant usage on schema auth,public to anon,authenticated,service_role;grant select on products,product_variants to service_role;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261115074944_account_cart_sync.sql',import.meta.url),'utf8'));
  const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',v='20000000-0000-4000-8000-000000000001';
  await db.query('insert into auth.users values($1),($2)',[a,b]);await db.query("insert into products values($1,'active')",[v]);await db.query('insert into product_variants values($1,$1)',[v]);
  await db.exec('set role service_role');
  const call=(user,changes,key=crypto.randomUUID())=>db.query('select mutate_customer_cart($1,$2,$3::jsonb)',[user,key,JSON.stringify(changes)]);
  const state=async user=>(await db.query('select items,revision from customer_carts where user_id=$1',[user])).rows[0];
  const key=crypto.randomUUID();await call(a,[{type:'add',variantId:v,quantity:2}],key);await call(a,[{type:'add',variantId:v,quantity:2}],key);
  assert.equal((await state(a)).items[v],2);assert.equal(Number((await state(a)).revision),1);
  await call(a,[{type:'set',variantId:v,quantity:3,expected:2}]);
  await assert.rejects(call(a,[{type:'set',variantId:v,quantity:9,expected:2}]),/CART_CONFLICT/);assert.equal((await state(a)).items[v],3);
  await assert.rejects(call(a,[{type:'add',variantId:v,quantity:1},{type:'remove',variantId:v,expected:1}]),/CART_CONFLICT/);assert.equal((await state(a)).items[v],3);
  await call(a,[{type:'add',variantId:v,quantity:2}]);const checkout=crypto.randomUUID();await call(a,[{type:'consume',variantId:v,quantity:3}],checkout);await call(a,[{type:'consume',variantId:v,quantity:3}],checkout);assert.equal((await state(a)).items[v],2);
  await call(b,[{type:'add',variantId:v,quantity:7}]);assert.equal((await state(a)).items[v],2);assert.equal((await state(b)).items[v],7);
  await db.exec('reset role;set role authenticated');await assert.rejects(db.query('select * from customer_carts'),/permission denied/);await assert.rejects(call(a,[]),/permission denied/);
  await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from customer_carts'),/permission denied/);
 }finally{await db.close();}
});
async function api(user,rpc){let source=(await readFile(new URL('../src/app/api/cart/route.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;const code=`export default (accountUser,accountCart,createSupabaseAdminClient)=>{${js.replace(/export /g,'')};return {GET,POST}}`;return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default(async()=>user,async id=>({userId:id,revision:1,items:[]}),()=>({rpc}));}
const request=body=>new Request('https://shop.test/api/cart',{method:'POST',headers:{origin:'https://shop.test','content-type':'application/json'},body:JSON.stringify(body)});
test('cart API binds operations to the verified user, rejects guest and stale account identity',async()=>{
 const guest=await api(null,()=>{throw Error('No guest database access')});assert.equal((await guest.GET(new Request('https://shop.test/api/cart'))).status,401);assert.equal((await guest.POST(request({}))).status,401);
 let args;const user=await api({id:'verified-account'},async(name,params)=>{assert.equal(name,'mutate_customer_cart');args=params;return {error:null}});
 const body={userId:'verified-account',operationId:crypto.randomUUID(),changes:[{type:'add',variantId:'20000000-0000-4000-8000-000000000001',quantity:2}]};
 assert.equal((await user.POST(request({...body,userId:'other-account'}))).status,409);
 assert.equal((await user.POST(request(body))).status,200);assert.equal(args.p_user,'verified-account');
 assert.equal((await user.POST(request({...body,changes:[{...body.changes[0],quantity:-1}]}))).status,400);
});

async function device(backend){
 let source=(await readFile(new URL('../src/lib/cart.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const factory=`export default (window,fetch,crypto)=>{${js.replace(/export /g,'')};return {readCart,refreshAccountCart,resetAccountCart,addCartItems,updateCartItemQuantity,adjustCartItemQuantity,isCartSyncPending,cartOwner};}`;
 const storage=new Map();const window={localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},dispatchEvent:()=>{}};
 return (await import(`data:text/javascript;base64,${Buffer.from(factory).toString('base64')}`)).default(window,backend,crypto);
}
function sharedServer(){
 let quantity=0,revision=0,owner='account-a';const operations=new Set();let lost=false;
 const item='20000000-0000-4000-8000-000000000001';
 const snapshot=()=>({userId:owner,revision,items:quantity?[{variantId:item,productId:'product',productName:'Sole',sku:'SOLE',quantity,unitPrice:25}]:[]});
 async function fetch(_url,options={}){
  if(!owner)return Response.json({error:'LOGIN_REQUIRED'},{status:401});
  if(options.method==='POST'){
   const body=JSON.parse(options.body);
   if(body.userId&&body.userId!==owner)return Response.json({error:'ACCOUNT_CHANGED'},{status:409});
   if(!operations.has(body.operationId)){
    for(const change of body.changes){
     if(['set','remove'].includes(change.type)&&change.expected!==quantity)return Response.json({error:'CART_CONFLICT'},{status:409});
     if(change.type==='add')quantity+=change.quantity;
     if(change.type==='set')quantity=change.quantity;
     if(change.type==='remove')quantity=0;
     if(change.type==='consume')quantity=Math.max(0,quantity-change.quantity);
    }
    operations.add(body.operationId);revision++;
    if(lost){lost=false;throw Error('Response lost after commit');}
   }
  }
  return Response.json(snapshot());
 }
 return {fetch,snapshot,loseNextResponse:()=>{lost=true},signOut:()=>{owner=null}};
}
test('separate phone and PC clients converge and reject stale quantity writes',async()=>{
 const server=sharedServer(),pc=await device(server.fetch),phone=await device(server.fetch);
 await pc.refreshAccountCart();await phone.refreshAccountCart();
 const line={variantId:'20000000-0000-4000-8000-000000000001',quantity:2};
 await pc.addCartItems([line]);await phone.refreshAccountCart();assert.equal(phone.readCart()[0].quantity,2);
 await phone.addCartItems([{...line,quantity:3}]);
 await assert.rejects(pc.updateCartItemQuantity(line.variantId,9),/another device/);
 assert.equal(pc.readCart()[0].quantity,5);await phone.refreshAccountCart();assert.deepEqual(pc.readCart(),phone.readCart());
 server.signOut();pc.resetAccountCart();await pc.refreshAccountCart();assert.deepEqual(pc.readCart(),[]);
});
test('client retries a committed request with the same id without doubling quantities',async()=>{
 const server=sharedServer(),pc=await device(server.fetch);await pc.refreshAccountCart();server.loseNextResponse();
 await pc.addCartItems([{variantId:'20000000-0000-4000-8000-000000000001',quantity:2}]);assert.equal(server.snapshot().items[0].quantity,2);
});
test('a delayed old poll cannot overwrite a newer mutation response',async()=>{
 const server=sharedServer();let delayed=false,release;
 const client=await device(async(url,options)=>{
  if(delayed&&!options?.method){delayed=false;const old=await server.fetch(url,options);return new Promise(resolve=>{release=()=>resolve(old)});}
  return server.fetch(url,options);
 });
 await client.refreshAccountCart();delayed=true;const poll=client.refreshAccountCart();
 await new Promise(resolve=>setTimeout(resolve,0));
 await client.addCartItems([{variantId:'20000000-0000-4000-8000-000000000001',quantity:4}]);release();await poll;
 assert.equal(client.readCart()[0].quantity,4);
});

test('rapid quantity buttons accumulate without stale absolute writes; pending state blocks early checkout',async()=>{
 const server=sharedServer(),pc=await device(server.fetch);await pc.refreshAccountCart();
 const id='20000000-0000-4000-8000-000000000001';const save=pc.addCartItems([{variantId:id,quantity:2}]);assert.equal(pc.isCartSyncPending(),true);await save;assert.equal(pc.isCartSyncPending(),false);
 await Promise.all([pc.adjustCartItemQuantity(id,1),pc.adjustCartItemQuantity(id,1)]);assert.equal(pc.readCart()[0].quantity,4);
 await pc.adjustCartItemQuantity(id,-1);assert.equal(pc.readCart()[0].quantity,3);
});
test('late response from a signed-out account cannot repopulate the visible cart',async()=>{
 const server=sharedServer();let hold=false,release;
 const client=await device(async(url,options)=>{const response=await server.fetch(url,options);if(hold&&options?.method==='POST')return new Promise(resolve=>{release=()=>resolve(response)});return response;});
 await client.refreshAccountCart();hold=true;
 const pending=client.addCartItems([{variantId:'20000000-0000-4000-8000-000000000001',quantity:2}]);
 await new Promise(resolve=>setTimeout(resolve,0));client.resetAccountCart();release();await assert.rejects(pending,/Account changed/);assert.deepEqual(client.readCart(),[]);
});
