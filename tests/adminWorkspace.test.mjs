import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const load=source=>import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,jsxFactory:'createElement'}}).outputText).toString('base64')}`);
const tokens=await load(await readFile(new URL('../src/lib/adminToken.ts',import.meta.url),'utf8'));
test('administrator tokens reject forgery, expiry and password rotation',()=>{
 const token=tokens.createAdminToken('admin-secret',1000);
 assert.ok(tokens.verifyAdminToken(token,'admin-secret',1000));
 assert.equal(tokens.verifyAdminToken(token+'x','admin-secret',1000),false);
 assert.equal(tokens.verifyAdminToken(token,'other-secret',1000),false);
 assert.equal(tokens.verifyAdminToken(token,'admin-secret',1000+tokens.ADMIN_SESSION_SECONDS*1000),false);
 assert.equal(tokens.verifyAdminToken('customer-token','admin-secret',1000),false);
});
test('workspace reveals management links only to administrator session; links contain no password',async()=>{
 let source=await readFile(new URL('../src/app/admin/page.tsx',import.meta.url),'utf8');
 source=source.replace(/^import .*;\n/gm,'');
 const module=await load(`import {createElement} from ${JSON.stringify(import.meta.resolve('react'))};
 let authorized=false;
 export function authorize(value){authorized=value}
 const cookies=async()=>({get:()=>({value:'customer-or-admin-token'})});
 const ADMIN_SESSION_COOKIE='private_admin_session';
 const verifyAdminToken=()=>authorized;
 const loginWorkspace='/login',logoutWorkspace='/logout';
 const Link=props=>createElement('a',props);
 ${source}`);
 const props={searchParams:Promise.resolve({})};
 let html=renderToStaticMarkup(await module.default(props));
 assert.ok(html.includes('管理员密码'));assert.ok(!html.includes('/admin/orders'));assert.ok(!html.includes('/admin/customers'));
 module.authorize(true);html=renderToStaticMarkup(await module.default(props));
 for(const route of ['/admin/orders','/admin/manual-order','/admin/products','/admin/categories','/admin/customers','/admin/visitors','tab=send','tab=templates','tab=history'])assert.ok(html.includes(route),route);
 assert.ok(!html.includes('password='));
});
test('shared admin guard accepts only independent admin session or admin password',async()=>{
 const source=(await readFile(new URL('../src/lib/admin.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const module=await load(`let cookie;export function setCookie(value){cookie=value};const cookies=async()=>({get:name=>name==='private_admin_session'?{value:cookie}:undefined});const ADMIN_SESSION_COOKIE='private_admin_session';const verifyAdminToken=${tokens.verifyAdminToken.toString()};const sameSecret=(a,b)=>a===b;${source}`.replace(`const verifyAdminToken=${tokens.verifyAdminToken.toString()};`,'let valid=false;export function setValid(v){valid=v};const verifyAdminToken=()=>valid;'));
 const previous=process.env.ADMIN_PASSWORD;
 try{
 process.env.ADMIN_PASSWORD='owner-only-secret';
 assert.equal((await module.checkAdminAccess(undefined)).ok,false);
 module.setCookie('customer-session');assert.equal((await module.checkAdminAccess('customer-password')).ok,false);
 module.setValid(true);const access=await module.checkAdminAccess(undefined);assert.equal(access.ok,true);assert.equal(access.password,'');
 module.setValid(false);assert.equal((await module.checkAdminAccess('owner-only-secret')).ok,true);
 }finally{if(previous===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=previous;}
});
