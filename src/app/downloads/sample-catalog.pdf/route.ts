import { requireAccount } from '@/lib/accountSession';
import { readFile } from 'node:fs/promises';
export async function GET() {
  await requireAccount('en');
  const file = await readFile(`${process.cwd()}/sample-catalog.pdf`);
  return new Response(file, { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' } });
}
