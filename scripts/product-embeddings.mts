import { processProductEmbeddings } from '../src/lib/embeddings/worker.ts';
// Bounded backfill; rerunnable. No credentials or product text are logged.
for(let batch=0;batch<100;batch++) {
  const result=await processProductEmbeddings(10);
  console.log(JSON.stringify(result));
  if(!result.configured || result.failed) { process.exitCode=1; break; }
  if(result.processed+result.superseded===0) break;
}
