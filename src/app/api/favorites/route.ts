import { accountUser } from '@/lib/accountSession';
import { createSupabaseAdminClient } from '@/lib/supabase';

const headers = { 'Cache-Control': 'private, no-store' };
function json(body: unknown, status = 200) { return Response.json(body, { status, headers }); }
export async function GET() {
  try {
    const user = await accountUser();
    if (!user) return json({ error: 'LOGIN_REQUIRED' }, 401);
    const db = createSupabaseAdminClient();
    const ids: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from('customer_favorites')
        .select('product_id').eq('user_id', user.id).order('created_at', { ascending: false }).order('product_id')
        .range(offset, offset + 999);
      if (error) throw error;
      ids.push(...(data ?? []).map(row => row.product_id));
      if (!data || data.length < 1000) break;
    }
    return json({ ids });
  } catch { return json({ error: 'FAVORITES_UNAVAILABLE' }, 503); }
}
async function mutate(request: Request, save: boolean) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'FORBIDDEN' }, 403);
  try {
    const user = await accountUser();
    if (!user) return json({ error: 'LOGIN_REQUIRED' }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'INVALID_PRODUCT' }, 400); }
    const id = body?.productId;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return json({ error: 'INVALID_PRODUCT' }, 400);
    const db = createSupabaseAdminClient();
    if (save) {
      const { data: product, error } = await db.from('products').select('id').eq('id', id).eq('status', 'active').maybeSingle();
      if (error) throw error;
      if (!product) return json({ error: 'PRODUCT_UNAVAILABLE' }, 404);
      const { error: writeError } = await db.from('customer_favorites').upsert({ user_id: user.id, product_id: id }, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
      if (writeError) throw writeError;
    } else {
      const { error } = await db.from('customer_favorites').delete().eq('user_id', user.id).eq('product_id', id);
      if (error) throw error;
    }
    return json({ productId: id, saved: save });
  } catch { return json({ error: 'FAVORITES_UNAVAILABLE' }, 503); }
}
export function PUT(request: Request) { return mutate(request, true); }
export function DELETE(request: Request) { return mutate(request, false); }
