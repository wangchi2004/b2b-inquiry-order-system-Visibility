'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
export function AdminWorkspaceBack(){
 const password=useSearchParams().get('password');
 return <Link prefetch={false} href={password?`/admin?password=${encodeURIComponent(password)}`:'/admin'}>← 私人工作台</Link>;
}
