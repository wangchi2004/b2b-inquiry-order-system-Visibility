import type {Metadata} from 'next';
import Link from 'next/link';
export const metadata:Metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default function AdminLayout({children}:{children:React.ReactNode}){
 return <><div className="border-b bg-slate-950 px-6 py-3 text-sm text-white"><Link href="/admin">← 私人工作台</Link></div>{children}</>;
}
