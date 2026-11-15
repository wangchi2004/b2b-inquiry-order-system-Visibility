'use client';
import {usePathname} from 'next/navigation';
import {shopText} from '@/i18n/shopText';
import {useEffect,useState} from 'react';
import {CART_UPDATED_EVENT,cartOwner,readGuestCart,refreshAccountCart,resetAccountCart,importGuestCart} from '@/lib/cart';
export function AccountCartSync(){
 const locale=usePathname().match(/^\/(en|zh|ja|ko)(?:\/|$)/)?.[1]??'en';
 const t=(text:string)=>shopText(locale,text);
 const [error,setError]=useState('');const [legacy,setLegacy]=useState(false);const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;let loading=false;
  const inspect=()=>{if(active)setLegacy(Boolean(cartOwner())&&readGuestCart().length>0);};
  const reload=async()=>{if(loading||!active||document.visibilityState==='hidden')return;loading=true;try{await refreshAccountCart();if(active){setError('');inspect();}}catch{if(active)setError('Unable to sync cart. Please retry. / 购物车同步失败，请重试。');}finally{loading=false;}};
  const changed=()=>{resetAccountCart();void reload();};
  const visibility=()=>{if(document.visibilityState==='visible')void reload();};
  const storage=(event:StorageEvent)=>{if(event.key==='account-session-sync')changed();};
  resetAccountCart();void reload();
  const timer=window.setInterval(()=>void reload(),5000);
  window.addEventListener('focus',reload);window.addEventListener('online',reload);document.addEventListener('visibilitychange',visibility);window.addEventListener('account-session-changed',changed);window.addEventListener('storage',storage);window.addEventListener(CART_UPDATED_EVENT,inspect);
  return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',reload);window.removeEventListener('online',reload);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('account-session-changed',changed);window.removeEventListener('storage',storage);window.removeEventListener(CART_UPDATED_EVENT,inspect);};
 },[]);
 return <>{error?<div role="alert" className="bg-amber-50 px-5 py-3 text-sm">{t(error)}<button className="ml-3 min-h-11 underline" onClick={async()=>{try{await refreshAccountCart();setError('');}catch{/* Keep the visible retry state. */}}}>{t('Retry / 重试')}</button></div>:null}{legacy?<div className="bg-blue-50 px-5 py-3 text-sm">{t('This device has an old cart. Import it into the signed-in account? / 此设备有旧购物车，可导入当前登录账号。')}<button disabled={busy} className="ml-3 min-h-11 font-semibold text-blue-700 underline" onClick={async()=>{setBusy(true);try{await importGuestCart();setLegacy(false);setError('');}catch(e){setError(e instanceof Error?e.message:'Import failed / 导入失败');}finally{setBusy(false);}}}>{busy?'…':t('Import / 导入')}</button></div>:null}</>;
}
