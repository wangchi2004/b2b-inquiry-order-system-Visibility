import Link from 'next/link';
import {cookies} from 'next/headers';
import {ADMIN_SESSION_COOKIE,verifyAdminToken} from '@/lib/adminToken';
import {loginWorkspace,logoutWorkspace} from './actions';
export const dynamic='force-dynamic';
const groups=[
 {title:'订单与报价',items:[['订单管理','查看订单、修改商品、报价、收款及物流','/admin/orders'],['创建手工订单','代客户选择商品、填写收货信息并创建订单','/admin/manual-order']]},
 {title:'商品与目录',items:[['产品管理','产品、规格、价格、图片及上下架','/admin/products'],['分类管理','维护产品分类和样本目录','/admin/categories']]},
 {title:'客户与联系',items:[['客户管理','搜索客户、查看资料、导入及导出','/admin/customers'],['新增客户','录入新的客户资料','/admin/customers/new'],['发送邮件','选择客户并发送邮件','/admin/email-template?tab=send'],['邮件模板','创建和编辑邮件模板','/admin/email-template?tab=templates'],['发送历史','查看邮件发送记录','/admin/email-template?tab=history']]},
 {title:'网站访问',items:[['访问记录','查看访客、样本访问和点击记录','/admin/visitors']]}
];
export default async function Workspace({searchParams}:{searchParams:Promise<{error?:string}>}){
 const signedIn=verifyAdminToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value,process.env.ADMIN_PASSWORD??'');
 if(!signedIn)return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="w-full max-w-sm rounded-2xl border bg-white p-8"><h1 className="text-2xl font-bold">私人工作台</h1><p className="mt-3 text-sm text-slate-600">仅限网站管理员使用。客户账号不能访问。</p><form action={loginWorkspace} className="mt-6 space-y-4"><label className="grid gap-2">管理员密码<input required type="password" name="admin_password" autoComplete="current-password" className="rounded-lg border p-3"/></label>{(await searchParams).error?<p role="alert" className="text-sm text-red-700">无法登录，请检查管理员密码。</p>:null}<button className="min-h-11 w-full rounded-lg bg-blue-700 text-white">进入工作台</button></form></section></main>;
 return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl"><header className="mb-10 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-blue-700">管理员专用 · 私人空间</p><h1 className="mt-2 text-3xl font-bold">我的网站工作台</h1><p className="mt-3 text-slate-600">管理订单、商品、客户与日常联系。</p></div><form action={logoutWorkspace}><button className="min-h-11 rounded-lg border bg-white px-5">退出工作台</button></form></header><div className="space-y-9">{groups.map(group=><section key={group.title}><h2 className="mb-4 text-lg font-semibold">{group.title}</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group.items.map(([title,description,href])=><Link key={href} href={href} className="rounded-xl border bg-white p-6 transition hover:border-blue-500 hover:shadow-sm"><h3 className="font-semibold text-slate-950">{title} →</h3><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></Link>)}</div></section>)}</div><p className="mt-10 text-sm text-slate-500">订单详情及添加商品，请先在订单管理中选择订单；客户详情请从客户管理进入。</p></div></main>;
}
