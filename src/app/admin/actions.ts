'use server';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ADMIN_SESSION_COOKIE,ADMIN_SESSION_SECONDS,createAdminToken,sameSecret} from '@/lib/adminToken';
export async function loginWorkspace(form:FormData){
 const password=String(form.get('admin_password')??'');
 const secret=process.env.ADMIN_PASSWORD;
 if(!secret||!sameSecret(password,secret))redirect('/admin?error=1');
 (await cookies()).set(ADMIN_SESSION_COOKIE,createAdminToken(secret),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:ADMIN_SESSION_SECONDS});
 redirect('/admin');
}
export async function logoutWorkspace(){
 (await cookies()).delete(ADMIN_SESSION_COOKIE);
 redirect('/admin');
}
