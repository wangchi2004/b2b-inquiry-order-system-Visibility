import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreCart, mergeGuestCart } from '../mobile/src/cart.ts';
const line={variantId:'v1',name:'Rubber',sku:'R1',unit:'sheet',quantity:3,unitPrice:8.5};
test('cart restoration rejects invalid quantities and prices',()=>{
  assert.deepEqual(restoreCart([line,{...line,quantity:Infinity},{...line,quantity:-1},{...line,unitPrice:NaN},null]),[line]);
});
test('guest cart merges without changing the prior account snapshot in memory',()=>{
  const account=[{...line}];
  const merged=mergeGuestCart(account,[{...line,quantity:2},{...line,variantId:'v2'}]);
  assert.equal(merged[0].quantity,5);assert.equal(account[0].quantity,3);assert.equal(merged.length,2);
});
