'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAccount } from '@/lib/accountSession';
import { orderOwnerFilter } from '@/lib/customerOrders';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { isLocale } from '@/i18n/routing';
export async function confirmCustomerQuote(form: FormData) {
  const locale=String(form.get('locale')); if(!isLocale(locale)) return;
  const id=String(form.get('id')), version=String(form.get('version'));
  if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isFinite(Date.parse(version))) return;
  const user=await requireAccount(locale,`/${locale}/orders/${id}`);
  const {data,error}=await createSupabaseAdminClient().from('orders').update({status:'confirmed'})
    .eq('id',id).or(orderOwnerFilter(user)).eq('status','quoted').eq('quote_updated_at',version)
    .not('shipping_fee','is',null).not('grand_total','is',null).select('id').maybeSingle();
  revalidatePath(`/${locale}/orders`); revalidatePath(`/${locale}/orders/${id}`);
  redirect(`/${locale}/orders/${id}?message=${error||!data?'changed':'confirmed'}`);
}
