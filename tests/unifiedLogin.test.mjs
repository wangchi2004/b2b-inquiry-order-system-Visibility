import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { accountReturnPath } from '../src/lib/accountReturnPath.ts';

async function entry(user) {
  let source = await readFile(new URL('../src/components/GeneralOrderEntryForm.tsx',import.meta.url),'utf8');
  source=source.replace(/^import .*;\n/gm,'');
  source=`import {createElement,Fragment} from ${JSON.stringify(import.meta.resolve('react'))};\nconst Link=({children,...props})=>createElement('a',props,children);\nconst accountUser=async()=>(${JSON.stringify(user)});\n${source}`;
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,jsxFactory:'createElement',jsxFragmentFactory:'Fragment'}}).outputText;
  const module=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  return renderToStaticMarkup(await module.GeneralOrderEntryForm({redirectTo:'/zh/order/general'}));
}
test('legacy entrance sends guests to canonical sign-in with original destination',async()=>{
  const html=await entry(null);
  assert.match(html,/\/zh\/account\?next=%2Fzh%2Forder%2Fgeneral/);
  assert.doesNotMatch(html,/<input/);
});
test('legacy entrance uses verified account email and allows the original destination',async()=>{
  const html=await entry({email:'signed-in@example.com'});
  assert.match(html,/signed-in@example.com/);
  assert.match(html,/href="\/zh\/order\/general"/);
  assert.doesNotMatch(html,/<input/);
});
test('return destination rejects external, protocol-relative and escaped redirects',()=>{
  for(const value of ['https://evil.test','//evil.test','/\\evil.test','/zh/../../evil',undefined,'/en/order/general']) assert.equal(accountReturnPath(value,'zh'),'/zh/catalog');
  assert.equal(accountReturnPath('/zh/order/general?q=sole','zh'),'/zh/order/general?q=sole');
  assert.equal(accountReturnPath('/samples','zh'),'/samples');
});
async function orderAPI(user, validate) {
  let source=await readFile(new URL('../src/app/api/orders/route.ts',import.meta.url),'utf8');
  source=source.replace(/^import .*;\n/gm,'');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const module=await import(`data:text/javascript;base64,${Buffer.from(`export default (accountUser,validateOrderSubmission)=>{const NextResponse=Response;${js.replace(/export /g,'')};return POST;}`).toString('base64')}`);
  return module.default(async()=>user,validate);
}
const request=(origin='https://shop.test')=>new Request('https://shop.test/api/orders',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({customer:{email:'forged@example.com',country:'UK'},items:[]})});
test('inquiry API requires real login and rejects cross-origin requests',async()=>{
  const post=await orderAPI(null,()=>{throw Error('Must not process guest payload');});
  assert.equal((await post(request())).status,401);
  assert.equal((await post(request('https://evil.test'))).status,403);
  const proxied = new Request('http://localhost:3000/api/orders', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: '{}' });
  assert.equal((await post(proxied)).status,401);
});
test('inquiry identity comes from the logged-in account, overriding stale or forged email',async()=>{
  let captured;
  const post=await orderAPI({email:'signed-in@example.com'},payload=>{captured=payload;return {ok:false,message:'test validation stop'};});
  assert.equal((await post(request())).status,400);
  assert.equal(captured.customer.email,'signed-in@example.com');
  assert.equal(captured.customer.country,'UK');
});
