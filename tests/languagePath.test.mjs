import { test } from 'node:test';
import assert from 'node:assert/strict';
import { languagePath } from '../src/lib/languagePath.ts';
test('language selection retains product, search filters and hash',()=>{
  assert.equal(languagePath('/en/products/sole','?color=black','#details','zh'),'/zh/products/sole?color=black#details');
  assert.equal(languagePath('/ja/search','?q=sole&category=tools','','ko'),'/ko/search?q=sole&category=tools');
});
test('login return destination follows the selected website language',()=>{
  const result=languagePath('/en/account','?next=%2Fen%2Forder%2Fgeneral','','zh');
  assert.equal(result,'/zh/account?next=%2Fzh%2Forder%2Fgeneral');
});
test('legacy entrances use existing translated routes',()=>{
  assert.equal(languagePath('/','','','zh'),'/zh');
  assert.equal(languagePath('/cart','','','ja'),'/ja/cart');
  assert.equal(languagePath('/order/customer-token','','','ko'),'/ko/order/customer-token');
  assert.equal(languagePath('/samples','','','zh'),'/zh/search');
  assert.equal(languagePath('/sample-catalog','','','en'),'/en/catalog');
});
