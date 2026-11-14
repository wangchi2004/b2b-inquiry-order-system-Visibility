import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSearchOptions, sortSearchProducts } from '../src/lib/searchOptions.ts';
import type { ProductWithVariants } from '../src/lib/types.ts';
const product = (id: string, price: number | null, currency='USD') => ({ id, name:id, currency, created_at:'2026-01-01', product_variants:[{ price }] }) as ProductWithVariants;
test('search input bounds and enum validation', () => {
 const result=parseSearchOptions(new URLSearchParams({q:'x'.repeat(250),sort:'invalid',availability:'invalid'}));
 assert.equal(result.q.length,200); assert.equal(result.sort,'relevance'); assert.equal(result.availability,'');
});
test('search sort keeps unknown prices last, zero valid, source unchanged and currencies separate', () => {
 const products=[product('unknown',null), product('high',9.5), product('zero',0),product('low',3.2)];
 assert.deepEqual(sortSearchProducts(products,'price_asc',new Map()).map(p=>p.id),['zero','low','high','unknown']);
 assert.deepEqual(sortSearchProducts(products,'price_desc',new Map()).map(p=>p.id),['high','low','zero','unknown']);
 assert.equal(products[0].id,'unknown');
 assert.equal(sortSearchProducts(products,'relevance',new Map([['low',100]]))[0].id,'low');
 assert.deepEqual(sortSearchProducts([product('usd',1),product('eur',20,'EUR')],'price_asc',new Map()).map(p=>p.currency),['EUR','USD']);
});
