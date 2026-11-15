import 'server-only';
import {createSupabaseAdminClient} from '@/lib/supabase';
import type {SavedAddress} from './addressData';
const fields='id,recipient,phone,country,region,city,postal_code,address,company,note,is_default';
export async function customerAddresses(userId:string) {
 const {data,error}=await createSupabaseAdminClient().from('customer_addresses').select(fields).eq('user_id',userId).order('is_default',{ascending:false}).order('created_at');
 if(error)throw new Error('ADDRESSES_UNAVAILABLE');
 return (data??[]) as SavedAddress[];
}
export async function checkoutAddress(userId:string,id?:string) {
 let query=createSupabaseAdminClient().from('customer_addresses').select(fields).eq('user_id',userId);
 if(id){if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('ADDRESS_NOT_FOUND');query=query.eq('id',id);}else query=query.eq('is_default',true);
 const {data,error}=await query.maybeSingle();
 if(error)throw new Error('ADDRESSES_UNAVAILABLE');
 if(id&&!data)throw new Error('ADDRESS_NOT_FOUND');
 return data as SavedAddress|null;
}
