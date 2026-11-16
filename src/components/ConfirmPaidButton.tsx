'use client';
import {useFormStatus} from 'react-dom';
export function ConfirmPaidButton(){const {pending}=useFormStatus();return <button name="quote_action" value="paid" disabled={pending} onClick={e=>{if(!window.confirm('请确认款项已实际到账。标记已收款后，该订单将从客户“我的报价”中移除。'))e.preventDefault();}} className="min-h-11 rounded bg-emerald-800 px-4 text-white disabled:opacity-50">{pending?'保存中…':'确认已收款'}</button>;}
