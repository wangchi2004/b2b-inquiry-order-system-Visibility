import { accountUser } from '@/lib/accountSession';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { isSafeSampleFileName, SAMPLE_FILES_BUCKET } from '@/lib/sampleFileNames';
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!await accountUser()) return new Response('Login required', { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  const { name } = await params;
  if (!isSafeSampleFileName(name)) return new Response(null, { status: 404 });
  const { data, error } = await createSupabaseAdminClient().storage.from(SAMPLE_FILES_BUCKET).download(name);
  if (error || !data) return new Response('File unavailable', { status: 404 });
  return new Response(data, { headers: { 'Content-Type': data.type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
