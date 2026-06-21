import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import {
  deleteCustomerProfile,
  importVisitorSessionsToCustomers,
  markCustomerDoNotContact
} from "@/app/admin/customers/[id]/actions";
import { checkAdminAccess } from "@/lib/admin";
import {
  customerCellContentClass,
  customerInlineLinkClass
} from "@/lib/customerTableDisplay";
import {
  getTemplateCustomers,
  type AdminTemplateCustomer
} from "@/lib/adminEmailTemplates";

type AdminCustomersPageProps = {
  searchParams: Promise<{
    password?: string;
    status?: string;
    country?: string;
    business_type?: string;
    source?: string;
    tag?: string;
    q?: string;
    message?: string;
  }>;
};

export default async function AdminCustomersPage({
  searchParams
}: AdminCustomersPageProps) {
  const {
    password,
    status = "",
    country = "",
    business_type = "",
    source = "",
    tag = "",
    q = "",
    message
  } = await searchParams;
  const access = checkAdminAccess(password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  const customers = await getTemplateCustomers();
  const normalizedQuery = q.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) => {
    const matchesStatus = status ? customer.status === status : true;
    const matchesCountry = country ? customer.country === country : true;
    const matchesBusinessType = business_type
      ? customer.business_type === business_type
      : true;
    const matchesSource = source ? customer.source === source : true;
    const matchesTag = tag ? customer.tags.includes(tag) : true;
    const searchable = [
      customer.email,
      customer.name,
      customer.shop_name,
      customer.company,
      customer.country,
      customer.city,
      customer.whatsapp,
      customer.instagram,
      customer.website,
      ...customer.tags
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      matchesStatus &&
      matchesCountry &&
      matchesBusinessType &&
      matchesSource &&
      matchesTag &&
      (!normalizedQuery || searchable.includes(normalizedQuery))
    );
  });
  const countryOptions = uniqueOptions(customers.map((customer) => customer.country));
  const tagOptions = uniqueOptions(customers.flatMap((customer) => customer.tags));
  const exportHref = buildCustomerExportHref({
    password: access.password,
    q,
    status,
    country,
    business_type,
    source,
    tag
  });

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin / 后台</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Customer Database / 客户数据库
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              CRM master list for order customers, login records, and manually
              collected leads. 客户资料、登录记录和手工开发客户统一在这里管理。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/customers/new?password=${encodeURIComponent(access.password)}`}
              className="inline-flex h-11 items-center justify-center rounded bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
            >
              New Customer / 新增客户
            </Link>
            <Link
              href={`/admin/email-template?password=${encodeURIComponent(access.password)}`}
              className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-900"
            >
              Email Template / 邮件模板
            </Link>
            <Link
              href={exportHref}
              className="inline-flex h-11 items-center justify-center rounded bg-emerald-700 px-4 text-sm font-semibold text-white"
            >
              Export CSV / 导出 CSV
            </Link>
            <form action={importVisitorSessionsToCustomers}>
              <input type="hidden" name="password" value={access.password} />
              <button
                type="submit"
                className="h-11 rounded bg-slate-950 px-4 text-sm font-semibold text-white"
              >
                Import Login Records / 导入登录记录
              </button>
            </form>
          </div>
        </div>

        {message ? (
          <p className="mb-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {message}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Customers / 客户总数" value={customers.length} />
          <StatCard
            label="Prospecting / 开发中"
            value={countByStatus(customers, "prospecting")}
          />
          <StatCard label="Leads / 意向客户" value={countByStatus(customers, "lead")} />
          <StatCard
            label="Do Not Contact / 禁止联系"
            value={
              customers.filter(
                (customer) =>
                  customer.status === "do_not_contact" || customer.unsubscribed
              ).length
            }
          />
        </div>

        <form className="mt-6 grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-[1fr_repeat(5,180px)_auto]">
          <input type="hidden" name="password" value={access.password} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email, shop, name, country, website... / 搜索邮箱、店名、国家、网址"
            className="h-11 rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          />
          <select
            name="status"
            defaultValue={status}
            className="h-11 rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="">All status / 全部状态</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="country"
            defaultValue={country}
            className="h-11 rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="">All countries / 全部国家</option>
            {countryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            name="business_type"
            defaultValue={business_type}
            className="h-11 rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="">All types / 全部类型</option>
            {BUSINESS_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="source"
            defaultValue={source}
            className="h-11 rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="">All sources / 全部来源</option>
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="website_login">Website Login / 网站登录</option>
          </select>
          <select
            name="tag"
            defaultValue={tag}
            className="h-11 rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="">All tags / 全部标签</option>
            {tagOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-11 rounded bg-slate-950 px-5 text-sm font-semibold text-white"
          >
            Filter / 筛选
          </button>
        </form>

        <section className="mt-6 rounded border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Customers / 客户列表
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Showing / 当前显示：{filteredCustomers.length} / {customers.length}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-[1840px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <TableHead sticky>Actions / 操作</TableHead>
                  <TableHead>Email / 邮件</TableHead>
                  <TableHead>Status / 状态</TableHead>
                  <TableHead>Stage / 阶段</TableHead>
                  <TableHead>Tags / 标签</TableHead>
                  <TableHead>Score / 评分</TableHead>
                  <TableHead>Shop / 店名</TableHead>
                  <TableHead>Name / 姓名</TableHead>
                  <TableHead>Country / 国家</TableHead>
                  <TableHead>City / 城市</TableHead>
                  <TableHead>Business / 类型</TableHead>
                  <TableHead>Phone / 电话</TableHead>
                  <TableHead>Address / 地址</TableHead>
                  <TableHead>Source / 来源</TableHead>
                  <TableHead>INS</TableHead>
                  <TableHead>Website / 网址</TableHead>
                  <TableHead>Updated / 更新</TableHead>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-t border-slate-200">
                    <TableCell sticky>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/customers/${encodeURIComponent(
                            customer.id
                          )}?password=${encodeURIComponent(access.password)}`}
                          aria-label="Edit customer / 修改客户"
                          title="Edit / 修改"
                          className="inline-flex size-7 shrink-0 items-center justify-center border border-slate-300 text-base font-semibold text-slate-900 hover:bg-slate-50"
                        >
                          ✎
                        </Link>
                        <form action={deleteCustomerProfile} className="shrink-0">
                          <input
                            type="hidden"
                            name="password"
                            value={access.password}
                          />
                          <input
                            type="hidden"
                            name="customer_id"
                            value={customer.id}
                          />
                          <button
                            type="submit"
                            aria-label="Delete customer / 删除客户"
                            title="Delete / 删除"
                            className="inline-flex size-7 items-center justify-center border border-red-300 text-base font-semibold text-red-700 hover:bg-red-50"
                          >
                            ×
                          </button>
                        </form>
                        <form action={markCustomerDoNotContact} className="shrink-0">
                          <input
                            type="hidden"
                            name="password"
                            value={access.password}
                          />
                          <input
                            type="hidden"
                            name="customer_id"
                            value={customer.id}
                          />
                          <input
                            type="hidden"
                            name="email"
                            value={customer.email}
                          />
                          <button
                            type="submit"
                            aria-label="Block customer / 禁止联系客户"
                            title="Block / 禁止联系"
                            className="inline-flex size-7 items-center justify-center border border-amber-300 text-base font-semibold text-amber-800 hover:bg-amber-50"
                          >
                            ⊘
                          </button>
                        </form>
                      </div>
                    </TableCell>
                    <TableCell strong>{customer.email}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          customer.unsubscribed
                            ? "do_not_contact"
                            : customer.status
                        }
                      />
                    </TableCell>
                    <TableCell>{labelFor(STAGE_OPTIONS, customer.stage)}</TableCell>
                    <TableCell>
                      {customer.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.map((customerTag) => (
                            <span
                              key={customerTag}
                              className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                            >
                              {customerTag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{customer.score ?? "-"}</TableCell>
                    <TableCell>{customer.shop_name ?? "-"}</TableCell>
                    <TableCell>{customer.name ?? "-"}</TableCell>
                    <TableCell>{customer.country ?? "-"}</TableCell>
                    <TableCell>{customer.city ?? "-"}</TableCell>
                    <TableCell>
                      {labelFor(BUSINESS_TYPE_OPTIONS, customer.business_type)}
                    </TableCell>
                    <TableCell>
                      {customer.phone ??
                        customer.whatsapp ??
                        customer.shipping_phone ??
                        "-"}
                    </TableCell>
                    <TableCell>
                      {joinParts([
                        customer.shipping_recipient_name,
                        customer.shipping_country,
                        customer.shipping_address
                      ])}
                    </TableCell>
                    <TableCell>
                      {labelFor(SOURCE_OPTIONS, customer.source)}
                      {customer.source_url ? (
                        <div className="mt-1">
                          <InlineLink value={customer.source_url} />
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <InlineLink value={customer.instagram} />
                    </TableCell>
                    <TableCell>
                      <InlineLink value={customer.website} />
                    </TableCell>
                    <TableCell>{formatDate(customer.updated_at)}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function TableHead({
  children,
  sticky = false
}: {
  children: ReactNode;
  sticky?: boolean;
}) {
  return (
    <th
      className={`px-3 py-3 font-semibold ${
        sticky
          ? "sticky left-0 z-10 w-28 min-w-28 border-r border-slate-200 bg-slate-50"
          : ""
      }`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  strong = false,
  sticky = false
}: {
  children: ReactNode;
  strong?: boolean;
  sticky?: boolean;
}) {
  return (
    <td
      className={`max-w-60 px-3 py-3 align-top ${
        strong ? "font-semibold text-slate-950" : "text-slate-700"
      } ${sticky ? "sticky left-0 z-10 w-28 min-w-28 border-r border-slate-200 bg-white px-2" : ""}`}
    >
      <div className={sticky ? "" : customerCellContentClass}>{children}</div>
    </td>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const label = labelFor(STATUS_OPTIONS, status);
  const isBlocked = status === "do_not_contact";
  const isCustomer = status === "customer";

  return (
    <span
      className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
        isBlocked
          ? "bg-red-50 text-red-700"
          : isCustomer
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-700"
      }`}
    >
      {label}
    </span>
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
      className={customerInlineLinkClass}
      title={value}
    >
      {value}
    </Link>
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
          Customer Database / 客户数据库
        </h1>
        {reason === "missing_config" ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            ADMIN_PASSWORD is not configured. 请先配置 ADMIN_PASSWORD。
          </p>
        ) : (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Invalid admin password. 管理员密码不正确。
          </p>
        )}
      </section>
    </main>
  );
}

function countByStatus(customers: AdminTemplateCustomer[], status: string) {
  return customers.filter((customer) => customer.status === status).length;
}

function labelFor(
  options: Array<{ value: string; label: string }>,
  value: string | null
) {
  if (!value) {
    return "-";
  }

  return options.find((option) => option.value === value)?.label ?? value;
}

function joinParts(parts: Array<string | null>) {
  const value = parts.filter(Boolean).join(" / ");

  return value || "-";
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));
}

function buildCustomerExportHref(params: Record<string, string>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  return `/api/admin/customers/export?${searchParams.toString()}`;
}

function normalizeUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

const STATUS_OPTIONS = [
  { value: "customer", label: "Customer / 成交客户" },
  { value: "lead", label: "Lead / 意向客户" },
  { value: "prospecting", label: "Prospecting / 开发中客户" },
  { value: "silent", label: "Silent / 沉默客户" },
  { value: "do_not_contact", label: "Do Not Contact / 禁止联系" }
];

const STAGE_OPTIONS = [
  { value: "new", label: "New / 新客户" },
  { value: "screening", label: "Screening / 待筛选" },
  { value: "ready", label: "Ready / 准备开发" },
  { value: "first_sent", label: "First Email Sent / 已发第1封" },
  { value: "second_sent", label: "Second Email Sent / 已发第2封" },
  { value: "replied", label: "Replied / 已回复" },
  { value: "stopped", label: "Stopped / 已停止" }
];

const BUSINESS_TYPE_OPTIONS = [
  { value: "shoe_repair", label: "Shoe Repair Shop / 修鞋店" },
  { value: "shoe_material_supplier", label: "Shoe Material Supplier / 鞋材商" },
  { value: "leather_repair", label: "Leather Repair / 皮具维修" },
  { value: "shoe_store", label: "Shoe Store / 鞋店" },
  { value: "wholesaler", label: "Wholesaler / 批发商" }
];

const SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "google_maps", label: "Google Maps" },
  { value: "website", label: "Website / 网站" },
  { value: "trade_show", label: "Trade Show / 展会" },
  { value: "referral", label: "Referral / 老客户介绍" },
  { value: "manual", label: "Manual / 手工录入" },
  { value: "website_login", label: "Website Login / 网站登录" }
];
