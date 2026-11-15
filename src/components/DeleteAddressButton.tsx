'use client';
import {useFormStatus} from 'react-dom';
import {addressText} from '@/i18n/addresses';
export function DeleteAddressButton({locale}:{locale:string}){const {pending}=useFormStatus();return <button disabled={pending} className="min-h-11 px-3 text-red-700" onClick={event=>{if(!window.confirm(addressText(locale,'Delete this address?')))event.preventDefault();}}>{addressText(locale,'Delete')}</button>;}
