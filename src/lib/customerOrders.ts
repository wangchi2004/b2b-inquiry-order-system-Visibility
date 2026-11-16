import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase';

export type OrderIdentity = { id: string; email?: string };
export function orderOwnerFilter(user: OrderIdentity) {
  // Quote PostgREST values and escape LIKE wildcards in verified email addresses.
  const email = (user.email ?? '').replace(/[\\%_]/g, '\\$&');
  return `mobile_user_id.eq.${user.id},and(mobile_user_id.is.null,customer_email.ilike.${JSON.stringify(email)})`;
}
export const orderFields = 'id,status,payment_status,paid_at,quote_ready_at,created_at,product_subtotal,shipping_fee,grand_total,quote_updated_at,paypal_fee,paypal_collection,shipping_carrier,tracking_number,shipping_recipient_name,shipping_phone,shipping_country,shipping_address,order_items(id,product_id,product_name,sku,size,color,quantity,unit,unit_price)';
export type CustomerOrder = {
  payment_status?: 'unknown'|'unpaid'|'paid'; paid_at?: string|null; quote_ready_at?: string|null;
  id: string; status: string; created_at: string; product_subtotal: number | null;
  shipping_fee: number | null; grand_total: number | null; quote_updated_at: string | null;
  paypal_fee: number | null; paypal_collection: number | null;
  shipping_carrier: string | null; tracking_number: string | null;
  shipping_recipient_name: string | null; shipping_phone: string | null;
  shipping_country: string | null; shipping_address: string | null;
  order_items: { id: string; product_id: string | null; product_name: string; sku: string | null; size: string | null; color: string | null; quantity: number; unit: string | null; unit_price: number | null }[];
};
export async function customerOrders(user: OrderIdentity, page: number) {
  const { data, error, count } = await createSupabaseAdminClient().from('orders').select(orderFields, { count: 'exact' })
    .or(orderOwnerFilter(user)).order('created_at', { ascending: false }).order('id').range((page - 1) * 10, page * 10 - 1);
  if (error) throw new Error('ORDERS_UNAVAILABLE');
  return { orders: (data ?? []) as CustomerOrder[], count: count ?? 0 };
}
export async function customerOrder(user: OrderIdentity, id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from('orders').select(orderFields).eq('id', id).or(orderOwnerFilter(user)).maybeSingle();
  if (error) throw new Error('ORDERS_UNAVAILABLE');
  return data as CustomerOrder | null;
}
