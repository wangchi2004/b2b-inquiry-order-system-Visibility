import type {Metadata} from 'next';
import {Suspense} from 'react';
import {AdminWorkspaceBack} from '@/components/AdminWorkspaceBack';
export const metadata:Metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default function AdminLayout({children}:{children:React.ReactNode}){
 return <><div className="border-b bg-slate-950 px-6 py-3 text-sm text-white"><Suspense fallback={<span>私人工作台</span>}><AdminWorkspaceBack/></Suspense></div>{children}</>;
}
