'use client';
import {useFormStatus} from 'react-dom';
import {addressText} from '@/i18n/addresses';
export function AddressSubmitButton({locale,label}:{locale:string;label:'Save'|'Set as default'}){const {pending}=useFormStatus();return <button disabled={pending} className={label==='Save'?'min-h-12 rounded-lg bg-blue-700 px-5 font-semibold text-white disabled:opacity-50':'min-h-11 text-blue-700 disabled:opacity-50'}>{pending?'…':addressText(locale,label)}</button>;}
