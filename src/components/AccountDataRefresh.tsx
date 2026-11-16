'use client';
import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';
export function AccountDataRefresh(){
 const pathname=usePathname(),router=useRouter();
 useEffect(()=>{
  if(pathname!=='/cart'&&!/^\/(en|zh|ja|ko)\/(addresses|orders|quotes|account|cart)(\/|$)/.test(pathname))return;
  const refresh=()=>{if(document.visibilityState!=='hidden'&&!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))router.refresh();};
  const timer=window.setInterval(()=>{if(!pathname.endsWith('/cart'))refresh();},15000);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);
  return()=>{document.removeEventListener('visibilitychange',refresh);window.clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);};
 },[pathname,router]);return null;
}
