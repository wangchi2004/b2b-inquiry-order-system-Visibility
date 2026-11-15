'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireAccount} from '@/lib/accountSession';
import {createSupabaseAdminClient} from '@/lib/supabase';
import {isLocale} from '@/i18n/routing';
import {readAddress} from '@/lib/addressData';
export async function manageAddress(form:FormData){
 const locale=String(form.get('locale'));if(!isLocale(locale))return;
 const user=await requireAccount(locale,`/${locale}/addresses`);
 const action=String(form.get('action')),id=String(form.get('id')??'');
 const path=`/${locale}/addresses`;
 if(!['save','delete','default'].includes(action)||(id&&!/^[0-9a-f-]{36}$/i.test(id))||(action!=='save'&&!id))redirect(`${path}?message=error`);
 const data=action==='save'?readAddress(form):{};
 if(!data)redirect(`${path}?message=error`);
 const {error}=await createSupabaseAdminClient().rpc('manage_customer_address',{p_user:user.id,p_action:action,p_id:id||null,p_data:data});
 revalidatePath(path);revalidatePath(`/${locale}/cart`);
 redirect(`${path}?message=${error?'error':action==='delete'?'deleted':action==='default'?'default':'saved'}`);
}
