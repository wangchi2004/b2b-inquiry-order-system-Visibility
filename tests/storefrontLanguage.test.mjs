import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { shopText } from '../src/i18n/shopText.ts';

test('all translated storefront UI keys resolve for Chinese, Japanese and Korean',async()=>{
  const files=['storefront/Storefront','storefront/SearchFilters','storefront/ProductDetailView','storefront/ShopHeader','AccountLogin','AccountRegister','ForgotPassword','ResetPassword','FavoriteButton','FavoritesList','GeneralOrderEntryForm'];
  const keys=new Set();
  for(const file of files){
    const text=await readFile(new URL(`../src/components/${file}.tsx`,import.meta.url),'utf8');
    const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    function visit(node){
      if(ts.isCallExpression(node)&&node.expression.getText(source)==='t'&&ts.isStringLiteral(node.arguments[0])) keys.add(node.arguments[0].text);
      ts.forEachChild(node,visit);
    }visit(source);
  }
  assert.ok(keys.size>100);
  for(const locale of ['zh','ja','ko'])for(const key of keys){
    assert.notEqual(shopText(locale,key),key,`${locale} missing translation: ${key}`);
    assert.ok(!shopText(locale,key).includes('\uFFFD'));
  }
});
test('Korean homepage and Chinese/Japanese controls reflect selected language',()=>{
  assert.equal(shopText('ko','Better materials.'),'더 좋은 소재.');
  assert.equal(shopText('ko','Explore products'),'상품 둘러보기');
  assert.equal(shopText('ko','Search products'),'상품 검색');
  assert.equal(shopText('zh','Shop by category'),'按分类选购');
  assert.equal(shopText('ja','My Account'),'マイアカウント');
  assert.equal(shopText('ko','{count} products',{count:12}),'상품 12개');
  assert.equal(shopText('en','Sign out / 退出登录'),'Sign out');
  assert.equal(shopText('ko','unknown catalog value'),'unknown catalog value');
});
