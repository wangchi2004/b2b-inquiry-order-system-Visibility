'use client';
import {useRef,useState} from 'react';
export function CartQuantityInput({quantity,onCommit,label,className}:{quantity:number;onCommit:(quantity:number,expected:number)=>void;label:string;className?:string}){
 const [draft,setDraft]=useState<string|null>(null);const base=useRef(quantity);
 return <input type="number" min="1" max="100000" inputMode="numeric" aria-label={label} className={className} value={draft??quantity} onFocus={()=>{base.current=quantity;setDraft(String(quantity));}} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}} onBlur={()=>{const value=Number(draft);setDraft(null);if(Number.isSafeInteger(value)&&value>=1&&value<=100000&&value!==base.current)onCommit(value,base.current);}}/>;
}
