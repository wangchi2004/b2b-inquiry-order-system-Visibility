import 'server-only';
import {createSupabaseAdminClient} from '@/lib/supabase';
import {orderOwnerFilter,orderFields,type OrderIdentity,type CustomerOrder} from './customerOrders';
export async function customerQuotes(user:OrderIdentity,page:number){
 const {data,error,count}=await createSupabaseAdminClient().from('orders').select(orderFields,{count:'exact'})
  .or(orderOwnerFilter(user)).eq('payment_status','unpaid').not('quote_ready_at','is',null).neq('status','cancelled')
  .not('product_subtotal','is',null).not('shipping_fee','is',null).not('grand_total','is',null)
  .order('quote_ready_at',{ascending:false}).order('id').range((page-1)*10,page*10-1);
 if(error)throw new Error('QUOTES_UNAVAILABLE');
 return {quotes:(data??[]) as CustomerOrder[],count:count??0};
}
