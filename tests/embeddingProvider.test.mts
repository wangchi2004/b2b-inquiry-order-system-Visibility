import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateEmbedding } from '../src/lib/embeddings/provider.ts';
import { processProductEmbeddings } from '../src/lib/embeddings/worker.ts';
test('provider fails closed without credentials and validates remote model/dimensions/errors',async()=>{
 const originalKey=process.env.OPENAI_API_KEY, originalFetch=globalThis.fetch;
 try {
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(generateEmbedding('heel rubber'),/NOT_CONFIGURED/);
  assert.equal((await processProductEmbeddings()).configured,false);
  process.env.OPENAI_API_KEY='test-only-not-a-real-key';
  let body: { model?: string; input?: string; dimensions?: number } = {};
  globalThis.fetch=async (_url,init)=>{ body=JSON.parse(String(init?.body));return Response.json({model:'text-embedding-3-small',data:[{embedding:[1,...Array(1535).fill(0)]}]}); };
  assert.equal((await generateEmbedding('repairing heels')).length,1536);
  assert.equal(body.input,'repairing heels');assert.equal(body.dimensions,1536);
  globalThis.fetch=async()=>Response.json({model:'wrong',data:[{embedding:[1,...Array(1535).fill(0)]}]});
  await assert.rejects(generateEmbedding('heel'),/INVALID_RESPONSE/);
  globalThis.fetch=async()=>new Response('private upstream error',{status:429});
  await assert.rejects(generateEmbedding('heel'),/^Error: EMBEDDING_HTTP_429$/);
 } finally {globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;}
});
