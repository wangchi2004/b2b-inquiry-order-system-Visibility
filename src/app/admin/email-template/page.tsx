import Link from "next/link";
import { headers } from "next/headers";
import { CopyButton } from "@/components/CopyButton";
import { Header } from "@/components/Header";
import { checkAdminAccess } from "@/lib/admin";
import {
  ensureCustomerOrderLink,
  getTemplateCustomers,
  type AdminTemplateCustomer
} from "@/lib/adminEmailTemplates";
import { buildCustomerCatalogEmailTemplate } from "@/lib/emailTemplate";

type AdminEmailTemplatePageProps = {
  searchParams: Promise<{
    password?: string;
    customer_id?: string;
  }>;
};

export default async function AdminEmailTemplatePage({
  searchParams
}: AdminEmailTemplatePageProps) {
  const { password, customer_id: selectedCustomerId } = await searchParams;
  const access = checkAdminAccess(password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  const customers = await getTemplateCustomers();
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const orderLink = selectedCustomer
    ? await ensureCustomerOrderLink(selectedCustomer.id)
    : null;
  const orderUrl = orderLink
    ? `${await getBaseUrl()}/order/${encodeURIComponent(orderLink.token)}`
    : "";
  const template = orderUrl
    ? buildCustomerCatalogEmailTemplate({
        orderUrl
      })
    : null;

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <p className="text-sm text-slate-500">Admin / 后台</p>
          <h1 className="text-3xl font-semibold text-slate-950">
            Email Template / 邮件模板
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Select a customer, generate a private order link, then copy the HTML
            or plain text email. 选择客户后生成专属订货链接，可复制 HTML 或纯文本邮件。
          </p>
        </div>

        <section className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Customer / 客户
          </h2>
          {customers.length === 0 ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No customers yet. Customers will appear here after order
              submissions. 暂无客户，客户提交订单后会显示在这里。
            </p>
          ) : (
            <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]" method="GET">
              <input type="hidden" name="password" value={access.password} />
              <select
                name="customer_id"
                defaultValue={selectedCustomer?.id ?? ""}
                className="h-11 rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
              >
                <option value="">Select customer / 选择客户</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customerLabel(customer)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-11 rounded bg-slate-950 px-4 text-sm font-semibold text-white"
              >
                Generate / 生成
              </button>
            </form>
          )}
        </section>

        {selectedCustomer && template ? (
          <section className="mt-6 space-y-6">
            <CustomerProfileCard customer={selectedCustomer} />

            <div className="rounded border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
              <p className="font-semibold">Final order link / 最终订货链接</p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                <Link
                  href={orderUrl}
                  className="break-all text-emerald-800 underline-offset-4 hover:underline"
                  target="_blank"
                >
                  {orderUrl}
                </Link>
                <CopyButton value={orderUrl}>Copy Link / 复制链接</CopyButton>
              </div>
              <p className="mt-3 text-emerald-800">
                Token status / 链接状态：{orderLink?.status}
              </p>
            </div>

            <TemplateBlock
              title="Subject / 邮件标题"
              value={template.subject}
              copyLabel="Copy Subject / 复制标题"
              compact
            />

            <TemplateBlock
              title="HTML Email / HTML 邮件"
              value={template.html}
              copyLabel="Copy HTML / 复制 HTML"
            />

            <TemplateBlock
              title="Plain Text Email / 纯文本邮件"
              value={template.text}
              copyLabel="Copy Text / 复制纯文本"
            />

            <section className="rounded border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-950">
                Preview / 预览
              </h2>
              <div
                className="mt-4 rounded border border-slate-200"
                dangerouslySetInnerHTML={{
                  __html: template.html
                }}
              />
            </section>
          </section>
        ) : (
          <div className="mt-6 rounded border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-950">
              Select a customer to generate email content / 请选择客户生成邮件内容
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              If the customer has no active token, the system will create one
              automatically. 如果客户没有可用 token，系统会自动创建。
            </p>
          </div>
        )}

        <section className="mt-6 rounded border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Customer Database / 客户数据库
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage customer profiles, CRM status, source, score, and
                contact permission in one place. 客户资料、CRM 状态、来源、评分和联系权限统一管理。
              </p>
            </div>
            <Link
              href={`/admin/customers?password=${encodeURIComponent(access.password)}`}
              className="inline-flex h-11 items-center justify-center rounded bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Open Customer Database / 打开客户数据库
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

function CustomerProfileCard({
  customer
}: {
  customer: AdminTemplateCustomer;
}) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">
        Customer Profile / 客户资料
      </h2>
      <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
        <ProfileItem label="Email / 邮件地址" value={customer.email} />
        <ProfileItem label="Country / 国家" value={customer.country} />
        <ProfileItem label="Name / 姓名" value={customer.name} />
        <ProfileItem label="Phone / 电话" value={customer.phone} />
        <ProfileItem label="WhatsApp" value={customer.whatsapp} />
        <ProfileItem label="Company / 公司" value={customer.company} />
        <ProfileItem label="Shop Name / 店名" value={customer.shop_name} />
        <ProfileItem label="City / 城市" value={customer.city} />
        <ProfileItem label="CRM Status / 客户状态" value={customer.status} />
        <ProfileItem label="Stage / 跟进阶段" value={customer.stage} />
        <ProfileItem
          label="Score / 评分"
          value={
            customer.score === null || customer.score === undefined
              ? null
              : String(customer.score)
          }
        />
        <ProfileItem label="Source / 来源" value={customer.source} />
        <ProfileItem
          label="Recipient / 收货人"
          value={customer.shipping_recipient_name}
        />
        <ProfileItem
          label="Shipping Phone / 收货电话"
          value={customer.shipping_phone}
        />
        <ProfileItem
          label="Shipping Country / 发货国家"
          value={customer.shipping_country}
        />
        <ProfileItem
          label="Shipping Address / 发货地址"
          value={customer.shipping_address}
          wide
        />
        <ProfileItem label="Note / 备注" value={customer.customer_note} wide />
        <ProfileItem
          label="Shipping Note / 物流备注"
          value={customer.shipping_note}
          wide
        />
        <ProfileLink label="Instagram / INS" value={customer.instagram} />
        <ProfileLink label="Website / 网址" value={customer.website} />
      </dl>
    </section>
  );
}

function ProfileItem({
  label,
  value,
  wide = false
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 min-h-6 whitespace-pre-wrap break-words rounded bg-slate-50 px-3 py-2 text-slate-950">
        {value || "-"}
      </dd>
    </div>
  );
}

function ProfileLink({
  label,
  value
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 min-h-6 break-words rounded bg-slate-50 px-3 py-2">
        <InlineLink value={value} />
      </dd>
    </div>
  );
}

function InlineLink({ value }: { value: string | null }) {
  if (!value) {
    return <span>-</span>;
  }

  const href = normalizeUrl(value);

  return (
    <Link
      href={href}
      target="_blank"
      className="break-all text-blue-700 underline-offset-4 hover:underline"
    >
      {value}
    </Link>
  );
}

function TemplateBlock({
  title,
  value,
  copyLabel,
  compact = false
}: {
  title: string;
  value: string;
  copyLabel: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <CopyButton value={value}>{copyLabel}</CopyButton>
      </div>
      <textarea
        readOnly
        value={value}
        rows={compact ? 2 : 12}
        className="mt-4 w-full rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800 outline-none"
      />
    </section>
  );
}

function AdminAccessMessage({
  reason
}: {
  reason: "missing_config" | "unauthorized";
}) {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-slate-950">
          Email Template / 邮件模板
        </h1>
        {reason === "missing_config" ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            ADMIN_PASSWORD is not configured. 请先配置 ADMIN_PASSWORD。
          </p>
        ) : (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Invalid admin password. Open this page with
            ?password=YOUR_ADMIN_PASSWORD. 管理员密码不正确。
          </p>
        )}
      </section>
    </main>
  );
}

async function getBaseUrl() {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    process.env.VERCEL_URL ??
    "localhost:3000";
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

function customerLabel(customer: AdminTemplateCustomer) {
  const name = customer.name ? `${customer.name} - ` : "";
  const company = customer.company ? ` / ${customer.company}` : "";
  const country = customer.country ? ` / ${customer.country}` : "";

  return `${name}${customer.email}${company}${country}`;
}

function normalizeUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("@")) {
    return `https://www.instagram.com/${value.slice(1)}`;
  }

  if (/^[A-Za-z0-9._]+$/.test(value)) {
    return `https://www.instagram.com/${value}`;
  }

  return `https://${value}`;
}
