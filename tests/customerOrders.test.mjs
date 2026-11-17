import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {orderText,orderMoney} from '../src/i18n/orders.ts';
async function loader(db){
 let source=await readFile(new URL('../src/lib/customerOrders.ts',import.meta.url),'utf8');source=source.replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const text=`export default (createSupabaseAdminClient)=>{${js.replace(/export /g,'')};return {customerOrders,customerOrder,orderOwnerFilter,orderFields};}`;
 return (await import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`)).default(()=>db);
}
const owner={id:'10000000-0000-4000-8000-000000000001',email:'user@example.com'};
const id='20000000-0000-4000-8000-000000000001';
function database(result){const calls=[];const q={};for(const name of ['select','or','order','range','eq','maybeSingle'])q[name]=(...args)=>{calls.push([name,...args]);return q;};q.then=(resolve,reject)=>Promise.resolve(result).then(resolve,reject);return {calls,from:table=>{assert.equal(table,'orders');return q;}};}
test('customer list scopes both account and legacy email, and paginates',async()=>{
 const db=database({data:[],count:21,error:null});const api=await loader(db);const result=await api.customerOrders(owner,2);
 assert.equal(result.count,21);
 assert.deepEqual(db.calls.find(c=>c[0]==='range'),['range',10,19]);
 const filter=db.calls.find(c=>c[0]==='or')[1];
 assert.equal(filter,`mobile_user_id.eq.${owner.id},and(mobile_user_id.is.null,customer_email.ilike."user@example.com")`);
 assert.ok(!api.orderFields.includes('note'));assert.ok(!api.orderFields.includes('customers('));assert.ok(api.orderFields.includes('products(image_url,image_url_2,image_url_3)'));
});
test('detail lookup adds order id AND the same ownership restriction; unauthorized/missing order is null',async()=>{
 const db=database({data:null,error:null});const api=await loader(db);
 assert.equal(await api.customerOrder(owner,id),null);
 assert.deepEqual(db.calls.find(c=>c[0]==='eq'),['eq','id',id]);
 assert.deepEqual(db.calls.find(c=>c[0]==='or'),['or',api.orderOwnerFilter(owner)]);
 const before=db.calls.length;assert.equal(await api.customerOrder(owner,'not-a-uuid'),null);assert.equal(db.calls.length,before);
});
test('email wildcards and filter punctuation remain escaped literals',async()=>{
 const api=await loader(null);const filter=api.orderOwnerFilter({...owner,email:'a_%",b@example.com'});
 assert.equal(filter,`mobile_user_id.eq.${owner.id},and(mobile_user_id.is.null,customer_email.ilike.${JSON.stringify('a\\_\\%",b@example.com')})`);
});
test('database failure is an error, never a misleading empty order list',async()=>{
 const api=await loader(database({data:null,error:{message:'offline'}}));
 await assert.rejects(api.customerOrders(owner,1),/ORDERS_UNAVAILABLE/);
 await assert.rejects(api.customerOrder(owner,id),/ORDERS_UNAVAILABLE/);
});
test('quotes preserve pending versus zero and order statuses have localized labels',()=>{
 assert.equal(orderMoney(null,'en'),'—'); assert.match(orderMoney(0,'en'),/0\.00/);
 assert.equal(orderText('zh','shipped'),'已发货');assert.equal(orderText('ko','processing'),'상품 준비 중');
});

async function confirmAction(user,db){
 let src=(await readFile(new URL('../src/app/[locale]/orders/[id]/actions.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const code=`export default (requireAccount,createSupabaseAdminClient,orderOwnerFilter)=>{const isLocale=l=>['en','zh','ja','ko'].includes(l);const revalidatePath=()=>{};const redirect=url=>{throw new Error(url)};${js.replace(/export /g,'')};return confirmCustomerQuote;}`;
 const api=await loader(null);
 return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default(async()=>{if(!user)throw Error('LOGIN_REQUIRED');return user},()=>db,api.orderOwnerFilter);
}
test('quote confirmation is ownership-scoped and guarded by status, current version and complete totals',async()=>{
 const db=database({data:{id},error:null});db.from('orders').update=value=>{db.calls.push(['update',value]);return db.from('orders')};
 const q=db.from('orders');q.not=(...args)=>{db.calls.push(['not',...args]);return q};
 const action=await confirmAction(owner,db);const form=new FormData();
 form.set('locale','en');form.set('id',id);form.set('version','2026-11-15T01:00:00Z');
 await assert.rejects(action(form),/message=confirmed/);
 assert.deepEqual(db.calls.find(c=>c[0]==='update'),['update',{status:'confirmed'}]);
 assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]==='status'&&c[2]==='quoted'));
 assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]==='quote_updated_at'&&c[2]===form.get('version')));
 assert.ok(db.calls.some(c=>c[0]==='or'&&c[1].includes(owner.id)));
 assert.ok(db.calls.some(c=>c[0]==='not'&&c[1]==='grand_total'));
});
test('stale quote returns review message and signed-out user cannot confirm',async()=>{
 const db=database({data:null,error:null});db.from('orders').update=()=>db.from('orders');const q=db.from('orders');q.not=()=>q;
 const form=new FormData();form.set('locale','en');form.set('id',id);form.set('version','2026-11-15T01:00:00Z');
 await assert.rejects((await confirmAction(owner,db))(form),/message=changed/);
 await assert.rejects((await confirmAction(null,db))(form),/LOGIN_REQUIRED/);
});

test('customer detail renders line items, real quote and tracking, and pending states',async()=>{
 const {renderToStaticMarkup}=await import('react-dom/server');
 let src=(await readFile(new URL('../src/app/[locale]/orders/[id]/page.tsx',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 src=src.replace("export const dynamic='force-dynamic';",'').replace('export default async function','async function');
 const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,jsxFactory:'createElement',jsxFragmentFactory:'Fragment'}}).outputText;
 const code=`import {createElement,Fragment} from ${JSON.stringify(import.meta.resolve('react'))};import {orderText,orderMoney,orderDate} from ${JSON.stringify(new URL('../src/i18n/orders.ts',import.meta.url).href)};export default (customerOrder)=>{const requireAccount=async()=>({id:'user'});const ShopHeader=()=>null;const Link=({children,...props})=>createElement('a',props,children);const notFound=()=>{throw Error('NOT_FOUND')};const confirmCustomerQuote='/test-confirm';${js};return OrderDetailPage;}`;
 const factory=(await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
 const fixture={id,status:'shipped',created_at:'2026-11-15T01:00:00Z',quote_updated_at:'2026-11-15T02:00:00Z',product_subtotal:100,shipping_fee:10,grand_total:110,paypal_fee:null,paypal_collection:null,shipping_carrier:'DHL',tracking_number:'TEST123',shipping_recipient_name:'Buyer',shipping_country:'UK',shipping_address:'Test address',shipping_phone:null,order_items:[{id:'line',product_name:'Repair sole',sku:'SOLE1',size:'40',color:'black',quantity:2,unit:'pair',unit_price:50,product_id:'sole',products:{image_url:null,image_url_2:'https://example.com/order-sole.jpg',image_url_3:null}}]};
 const page=factory(async()=>fixture);
 const html=renderToStaticMarkup(await page({params:Promise.resolve({locale:'en',id}),searchParams:Promise.resolve({})}));
 for(const value of ['Repair sole','DHL','TEST123','$110.00','Shipped','Test address'])assert.ok(html.includes(value),value);
 assert.ok(html.includes('https://example.com/order-sole.jpg'));assert.ok(html.includes('object-contain'));
 for(const column of ['Image','SKU','Size','Color','Quantity','Unit','Unit price','Subtotal'])assert.ok(html.includes(column),column);
 assert.ok(html.includes('overflow-x-auto'));assert.ok(!html.includes('name="item_'));
 const grouped=factory(async()=>({...fixture,order_items:[fixture.order_items[0],{...fixture.order_items[0],id:'line2',size:'41'}]}));
 const groupedHtml=renderToStaticMarkup(await grouped({params:Promise.resolve({locale:'zh',id}),searchParams:Promise.resolve({})}));
 assert.ok(groupedHtml.includes('rowSpan="2"')||groupedHtml.includes('rowspan="2"'));assert.equal((groupedHtml.match(/<img /g)||[]).length,1);
 const arrayPhoto=factory(async()=>({...fixture,order_items:[{...fixture.order_items[0],products:[fixture.order_items[0].products]}]}));
 const arrayHtml=renderToStaticMarkup(await arrayPhoto({params:Promise.resolve({locale:'en',id}),searchParams:Promise.resolve({})}));
 assert.ok(arrayHtml.includes('https://example.com/order-sole.jpg'));
 const noPhoto=factory(async()=>({...fixture,order_items:[{...fixture.order_items[0],products:null,unit_price:null}]}));
 const noPhotoHtml=renderToStaticMarkup(await noPhoto({params:Promise.resolve({locale:'zh',id}),searchParams:Promise.resolve({})}));
 assert.ok(noPhotoHtml.includes('暂无图片'));assert.ok(noPhotoHtml.includes('—'));
 const pending=factory(async()=>({...fixture,status:'new',quote_updated_at:null,grand_total:null,shipping_fee:null,shipping_carrier:null,tracking_number:null}));
 const pendingHtml=renderToStaticMarkup(await pending({params:Promise.resolve({locale:'zh',id}),searchParams:Promise.resolve({})}));
 assert.ok(pendingHtml.includes('等待报价'));assert.ok(pendingHtml.includes('尚未发货'));assert.ok(!pendingHtml.includes('/test-confirm'));
});
