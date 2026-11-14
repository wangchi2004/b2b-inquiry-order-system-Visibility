import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productEmbeddingText, validEmbedding, mergeSearchMatches } from '../src/lib/embeddings/core.ts';
test('embedding document contains catalog descriptions but excludes money and inventory',()=>{
 const product={name:'Black heel rubber',description:'Repairing heels',price:999,stock_status:'secret-stock',keywords:['repair'],product_variants:[{sku:'B42',size:'42',color:'Black',price:777}]};
 const text=productEmbeddingText(product);
 assert.ok(text.includes('B42'));assert.ok(text.includes('Repairing heels'));assert.ok(!text.includes('999'));assert.ok(!text.includes('777'));assert.ok(!text.includes('secret-stock'));
 assert.ok(new TextEncoder().encode(productEmbeddingText({name:'a'.repeat(20000)})).length<=6000);
});
test('embedding validates dimensions and numbers; hybrid merging keeps exact matches first without duplicates',()=>{
 assert.equal(validEmbedding([1]),false);assert.equal(validEmbedding(Array(1536).fill(0)),false);
 assert.equal(validEmbedding([NaN,...Array(1535).fill(0)]),false);
 assert.equal(validEmbedding([1,...Array(1535).fill(0)]),true);
 const matches=mergeSearchMatches([{product_id:'exact',relevance:100}],[{product_id:'semantic',similarity:.8},{product_id:'exact',similarity:.9},{product_id:'bad',similarity:.1}]);
 assert.equal(matches.length,2);assert.ok(matches[0].relevance>matches[1].relevance);assert.equal(matches[0].product_id,'exact');
});
