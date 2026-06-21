import Link from "next/link";
import { ConfirmEmailSendButton } from "@/components/ConfirmEmailSendButton";
import { EmailCampaignCustomerSelector } from "@/components/EmailCampaignCustomerSelector";
import { EmailCampaignPreview } from "@/components/EmailCampaignPreview";
import { Header } from "@/components/Header";
import { checkAdminAccess } from "@/lib/admin";
import {
  getAdminCampaignProducts,
  getAdminCampaignSendLogs,
  getAdminCampaignTemplates,
  getCampaignEligibilityForCustomer,
  isMissingEmailCampaignSchema,
  type AdminCampaignSendLog,
  type AdminCampaignTemplate
} from "@/lib/adminEmailCampaigns";
import {
  getTemplateCustomers,
  type AdminTemplateCustomer
} from "@/lib/adminEmailTemplates";
import {
  renderCampaignEmail,
  selectCampaignTemplate,
  type CampaignProduct
} from "@/lib/emailCampaign";
import {
  deactivateEmailCampaignTemplate,
  saveEmailCampaignTemplate,
  sendEmailCampaign
} from "./actions";

type EmailTemplateTab = "send" | "templates" | "history";

type AdminEmailTemplatePageProps = {
  searchParams: Promise<{
    password?: string;
    tab?: string;
    customer_id?: string;
    template_id?: string;
    edit_template_id?: string;
    message?: string;
  }>;
};

export default async function AdminEmailTemplatePage({
  searchParams
}: AdminEmailTemplatePageProps) {
  const params = await searchParams;
  const access = checkAdminAccess(params.password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  const tab = normalizeTab(params.tab);
  const customers = await getTemplateCustomers();
  let templates: AdminCampaignTemplate[] = [];
  let products: CampaignProduct[] = [];
  let logs: AdminCampaignSendLog[] = [];
  let schemaMissing = false;
  let loadError: string | null = null;

  try {
    [templates, products, logs] = await Promise.all([
      getAdminCampaignTemplates(),
      getAdminCampaignProducts(),
      getAdminCampaignSendLogs()
    ]);
  } catch (error) {
    schemaMissing = isMissingEmailCampaignSchema(error);
    loadError = error instanceof Error ? error.message : "Campaign data failed to load.";
  }

  const selectedCustomer =
    customers.find((customer) => customer.id === params.customer_id) ?? null;
  const activeTemplates = templates.filter(
    (template) => template.status === "active"
  );
  const selectedTemplate = selectedCustomer
    ? selectCampaignTemplate(
        activeTemplates,
        selectedCustomer.country,
        params.template_id
      )
    : null;
  const eligibility = selectedCustomer
    ? await getEligibilitySafely(selectedCustomer, schemaMissing)
    : null;
  const rendered =
    selectedCustomer && selectedTemplate
      ? renderCampaignEmail({
          template: selectedTemplate,
          customerName: selectedCustomer.name,
          websiteUrl:
            process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
            "https://www.wangchi2004.com",
          products: selectedTemplate.products
        })
      : null;
  const editTemplate =
    templates.find((template) => template.id === params.edit_template_id) ?? null;

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin / 后台</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Country Email Campaigns / 国家邮件模板
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Match a customer country to a reusable template, preview featured
              products, confirm the recipient, and send manually through Resend.
              按客户国家匹配模板，预览主推产品并手动确认发送。
            </p>
          </div>
          <Link
            href={`/admin/customers?password=${encodeURIComponent(access.password)}`}
            className="inline-flex h-10 items-center justify-center border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800"
          >
            Customer Database / 客户数据库
          </Link>
        </div>

        <nav className="mt-6 grid border border-slate-200 bg-white sm:grid-cols-3">
          <TabLink
            active={tab === "send"}
            href={emailPageHref(access.password, "send")}
          >
            Send Email / 发送邮件
          </TabLink>
          <TabLink
            active={tab === "templates"}
            href={emailPageHref(access.password, "templates")}
          >
            Templates / 模板管理
          </TabLink>
          <TabLink
            active={tab === "history"}
            href={emailPageHref(access.password, "history")}
          >
            History / 发送记录
          </TabLink>
        </nav>

        {params.message ? <MessageBanner message={params.message} /> : null}
        {schemaMissing ? <MigrationNotice /> : null}
        {!schemaMissing && loadError ? (
          <MessageBanner message={`Load failed: ${loadError}`} error />
        ) : null}

        {tab === "send" ? (
          <SendEmailView
            password={access.password}
            customers={customers}
            selectedCustomer={selectedCustomer}
            templates={activeTemplates}
            selectedTemplate={selectedTemplate}
            initialTemplateId={params.template_id ?? ""}
            eligibility={eligibility}
            rendered={rendered}
            schemaMissing={schemaMissing}
          />
        ) : null}

        {tab === "templates" ? (
          <TemplatesView
            password={access.password}
            templates={templates}
            products={products}
            editTemplate={editTemplate}
            schemaMissing={schemaMissing}
          />
        ) : null}

        {tab === "history" ? (
          <HistoryView logs={logs} schemaMissing={schemaMissing} />
        ) : null}
      </section>
    </main>
  );
}

function SendEmailView({
  password,
  customers,
  selectedCustomer,
  templates,
  selectedTemplate,
  initialTemplateId,
  eligibility,
  rendered,
  schemaMissing
}: {
  password: string;
  customers: AdminTemplateCustomer[];
  selectedCustomer: AdminTemplateCustomer | null;
  templates: AdminCampaignTemplate[];
  selectedTemplate: AdminCampaignTemplate | null;
  initialTemplateId: string;
  eligibility: Awaited<ReturnType<typeof getEligibilitySafely>> | null;
  rendered: ReturnType<typeof renderCampaignEmail> | null;
  schemaMissing: boolean;
}) {
  const canSend = Boolean(
    !schemaMissing &&
      selectedCustomer &&
      selectedTemplate &&
      rendered &&
      eligibility?.allowed
  );

  return (
    <div className="mt-6 space-y-6">
      <section className="border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">
          1. Customer and Template / 选择客户与模板
        </h2>
        <EmailCampaignCustomerSelector
          password={password}
          customers={customers}
          templates={templates}
          initialCustomerId={selectedCustomer?.id ?? ""}
          initialTemplateId={initialTemplateId}
        />
      </section>

      {selectedCustomer ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <CustomerSummary customer={selectedCustomer} />
            {rendered ? (
              <EmailCampaignPreview subject={rendered.subject} html={rendered.html} />
            ) : (
              <EmptyPanel text="No active matching template. Create an active default English template first. / 没有可用模板，请先创建默认英文模板。" />
            )}
          </div>

          <aside className="h-fit border border-slate-200 bg-white p-5 lg:sticky lg:top-4">
            <h2 className="text-lg font-semibold text-slate-950">
              2. Confirm Send / 确认发送
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Recipient / 收件人" value={selectedCustomer.email} />
              <SummaryRow label="Country / 国家" value={selectedCustomer.country} />
              <SummaryRow
                label="Template / 模板"
                value={selectedTemplate?.name ?? null}
              />
              <SummaryRow
                label="Products / 产品"
                value={selectedTemplate ? String(selectedTemplate.products.length) : null}
              />
            </dl>

            <div
              className={`mt-5 border p-3 text-sm ${
                eligibility?.allowed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {eligibility?.allowed
                ? "Ready to send. / 可以发送。"
                : eligibility?.reason ?? "Campaign schema is not ready."}
              {eligibility?.cooldownEndsAt ? (
                <p className="mt-1">
                  Available after / 可再次发送：
                  {formatDateTime(eligibility.cooldownEndsAt)}
                </p>
              ) : null}
            </div>

            <form action={sendEmailCampaign} className="mt-5">
              <input type="hidden" name="password" value={password} />
              <input
                type="hidden"
                name="customer_id"
                value={selectedCustomer.id}
              />
              <input
                type="hidden"
                name="template_id"
                value={selectedTemplate?.id ?? ""}
              />
              <ConfirmEmailSendButton
                recipient={selectedCustomer.email || "Missing email"}
                templateName={selectedTemplate?.name ?? "No template"}
                disabled={!canSend}
              />
            </form>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Successful sends start a 15-day cooldown. Failed sends do not.
              成功发送后 15 天内不能重复发送，失败不计入。
            </p>
          </aside>
        </section>
      ) : (
        <EmptyPanel text="Select a customer to match a country template and build the preview. / 选择客户后自动匹配国家模板并生成预览。" />
      )}
    </div>
  );
}

function TemplatesView({
  password,
  templates,
  products,
  editTemplate,
  schemaMissing
}: {
  password: string;
  templates: AdminCampaignTemplate[];
  products: CampaignProduct[];
  editTemplate: AdminCampaignTemplate | null;
  schemaMissing: boolean;
}) {
  if (schemaMissing) {
    return <EmptyPanel text="Run the migration before creating templates. / 请先运行数据库迁移。" />;
  }

  const selectedProductIds = new Set(
    editTemplate?.products.map((product) => product.id) ?? []
  );

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="h-fit border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-950">Templates / 模板</h2>
          <Link
            href={emailPageHref(password, "templates")}
            className="text-sm font-semibold text-blue-700"
          >
            New / 新增
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`${emailPageHref(password, "templates")}&edit_template_id=${encodeURIComponent(template.id)}`}
              className={`block border p-3 text-sm ${
                editTemplate?.id === template.id
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-800"
              }`}
            >
              <span className="font-semibold">{template.name}</span>
              <span className="mt-1 block text-xs opacity-75">
                {template.locale} · {template.status} · {template.products.length} products
              </span>
            </Link>
          ))}
          {templates.length === 0 ? (
            <p className="text-sm text-slate-500">No templates yet.</p>
          ) : null}
        </div>
      </aside>

      <section className="border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">
          {editTemplate ? "Edit Template / 修改模板" : "New Template / 新增模板"}
        </h2>
        <form action={saveEmailCampaignTemplate} className="mt-5 space-y-5">
          <input type="hidden" name="password" value={password} />
          <input type="hidden" name="template_id" value={editTemplate?.id ?? ""} />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Template Name / 模板名称" name="name" value={editTemplate?.name} required />
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Locale / 语言
              <select
                name="locale"
                defaultValue={editTemplate?.locale ?? "en"}
                className="h-10 border border-slate-300 bg-white px-3 font-normal"
              >
                <option value="en">English / 英语</option>
                <option value="ko">Korean / 韩语</option>
                <option value="ja">Japanese / 日语</option>
                <option value="zh">Chinese / 中文</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Country aliases / 匹配国家名称
            <textarea
              name="country_matches"
              defaultValue={editTemplate?.country_matches.join(", ") ?? ""}
              rows={2}
              className="border border-slate-300 p-3 font-normal"
              placeholder="Korea, South Korea, 대한민국, 한국"
            />
            <span className="text-xs font-normal text-slate-500">
              Separate aliases with commas or new lines. Default templates may leave this empty.
            </span>
          </label>
          <TextField label="Subject / 邮件标题" name="subject" value={editTemplate?.subject} required />
          <TextField
            label="Greeting / 问候语"
            name="greeting"
            value={editTemplate?.greeting ?? "Dear {customer_name},"}
            required
          />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Body / 正文
            <textarea
              name="body"
              defaultValue={editTemplate?.body ?? ""}
              rows={7}
              required
              className="border border-slate-300 p-3 font-normal"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              label="Website button / 网站按钮文字"
              name="website_button_label"
              value={editTemplate?.website_button_label ?? "Visit Website"}
              required
            />
            <TextField
              label="Closing / 结尾"
              name="closing"
              value={editTemplate?.closing ?? "Best regards"}
              required
            />
            <TextField
              label="Signature / 签名"
              name="signature"
              value={editTemplate?.signature ?? "Wang Chi"}
              required
            />
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">
              Featured products / 主推产品（选择 1–6 个）
            </legend>
            <div className="mt-3 grid max-h-[520px] gap-3 overflow-y-auto border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <label
                  key={product.id}
                  className="grid cursor-pointer grid-cols-[64px_1fr_auto] items-center gap-3 border border-slate-200 p-2 text-sm"
                >
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt=""
                      className="h-16 w-16 object-contain"
                    />
                  ) : (
                    <span className="h-16 w-16 bg-slate-100" />
                  )}
                  <span className="break-words font-medium">{product.name}</span>
                  <input
                    type="checkbox"
                    name="product_ids"
                    value={product.id}
                    defaultChecked={selectedProductIds.has(product.id)}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                name="is_default"
                defaultChecked={editTemplate?.is_default ?? false}
              />
              Default English fallback / 默认英文回退模板
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Status / 状态
              <select
                name="status"
                defaultValue={editTemplate?.status ?? "active"}
                className="h-9 border border-slate-300 bg-white px-2 font-normal"
              >
                <option value="active">active / 启用</option>
                <option value="inactive">inactive / 停用</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="h-11 bg-slate-950 px-5 text-sm font-semibold text-white"
          >
            Save Template / 保存模板
          </button>
        </form>

        {editTemplate?.status === "active" ? (
          <form action={deactivateEmailCampaignTemplate} className="mt-4 border-t border-slate-200 pt-4">
            <input type="hidden" name="password" value={password} />
            <input type="hidden" name="template_id" value={editTemplate.id} />
            <button
              type="submit"
              className="h-10 border border-red-300 px-4 text-sm font-semibold text-red-700"
            >
              Deactivate Template / 停用模板
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function HistoryView({
  logs,
  schemaMissing
}: {
  logs: AdminCampaignSendLog[];
  schemaMissing: boolean;
}) {
  if (schemaMissing) {
    return <EmptyPanel text="Run the migration before viewing send history. / 请先运行数据库迁移。" />;
  }

  return (
    <section className="mt-6 overflow-hidden border border-slate-200 bg-white">
      <div className="p-5">
        <h2 className="text-lg font-semibold text-slate-950">
          Send History / 发送记录
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Successful, failed, and in-progress attempts with immutable message snapshots.
          保存成功、失败、发送中状态及当时的邮件内容。
        </p>
      </div>
      {logs.length === 0 ? (
        <EmptyPanel text="No email sends yet. / 暂无发送记录。" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <TableHead>Status / 状态</TableHead>
                <TableHead>Recipient / 收件人</TableHead>
                <TableHead>Country / 国家</TableHead>
                <TableHead>Template / 模板</TableHead>
                <TableHead>Time / 时间</TableHead>
                <TableHead>Resend ID</TableHead>
                <TableHead>Snapshot / 快照</TableHead>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-200 align-top">
                  <TableCell>
                    <StatusBadge status={log.status} />
                    {log.error_message ? (
                      <p className="mt-2 max-w-52 text-xs text-red-700">
                        {log.error_message}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>{log.recipient_email}</TableCell>
                  <TableCell>{log.country || "-"}</TableCell>
                  <TableCell>{log.template_name}</TableCell>
                  <TableCell>{formatDateTime(log.sent_at ?? log.created_at)}</TableCell>
                  <TableCell>
                    <span className="break-all text-xs">{log.provider_message_id || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <details className="max-w-md">
                      <summary className="cursor-pointer font-semibold text-blue-700">
                        View / 查看
                      </summary>
                      <p className="mt-2 font-semibold">{log.subject_snapshot}</p>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap bg-slate-50 p-3 text-xs">
                        {log.text_snapshot}
                      </pre>
                    </details>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CustomerSummary({ customer }: { customer: AdminTemplateCustomer }) {
  return (
    <section className="border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">
        Customer / 客户资料
      </h2>
      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <SummaryRow label="Email / 邮箱" value={customer.email} />
        <SummaryRow label="Name / 姓名" value={customer.name} />
        <SummaryRow label="Country / 国家" value={customer.country} />
        <SummaryRow label="Company / 公司" value={customer.company} />
        <SummaryRow label="Status / 状态" value={customer.status} />
        <SummaryRow label="Last contacted / 最近联系" value={customer.last_contacted_at ? formatDateTime(customer.last_contacted_at) : null} />
      </dl>
    </section>
  );
}

function TextField({
  label,
  name,
  value,
  required = false
}: {
  label: string;
  name: string;
  value?: string | null;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input
        name={name}
        defaultValue={value ?? ""}
        required={required}
        className="h-10 border border-slate-300 px-3 font-normal"
      />
    </label>
  );
}

function SummaryRow({
  label,
  value
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-950">{value || "-"}</dd>
    </div>
  );
}

function TabLink({
  active,
  href,
  children
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex h-12 items-center justify-center border-b border-slate-200 px-4 text-sm font-semibold sm:border-b-0 sm:border-r ${
        active ? "bg-slate-950 text-white" : "bg-white text-slate-700"
      }`}
    >
      {children}
    </Link>
  );
}

function MessageBanner({ message, error = false }: { message: string; error?: boolean }) {
  const isError = error || /failed|invalid|missing|cannot|could not/i.test(message);

  return (
    <div
      className={`mt-5 border p-4 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      {message}
    </div>
  );
}

function MigrationNotice() {
  return (
    <div className="mt-5 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      Email campaign tables are not installed. Run
      <strong className="mx-1">supabase/email_campaign_templates.sql</strong>
      in the Supabase SQL Editor, then refresh this page.
      请在 Supabase SQL Editor 运行该文件后刷新页面。
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="mt-6 border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
      {text}
    </div>
  );
}

function StatusBadge({ status }: { status: AdminCampaignSendLog["status"] }) {
  const styles =
    status === "success"
      ? "bg-emerald-100 text-emerald-800"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-900";

  return <span className={`inline-flex px-2 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="border border-slate-200 px-3 py-3 font-semibold">{children}</th>;
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="border border-slate-200 px-3 py-3">{children}</td>;
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
          Country Email Campaigns / 国家邮件模板
        </h1>
        <p className="mt-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {reason === "missing_config"
            ? "ADMIN_PASSWORD is not configured. 请先配置 ADMIN_PASSWORD。"
            : "Invalid admin password. 管理员密码不正确。"}
        </p>
      </section>
    </main>
  );
}

async function getEligibilitySafely(
  customer: AdminTemplateCustomer,
  schemaMissing: boolean
) {
  if (schemaMissing) {
    return {
      allowed: false,
      reason: "Campaign database migration is required.",
      cooldownEndsAt: null
    };
  }

  try {
    return await getCampaignEligibilityForCustomer({
      email: customer.email,
      email_valid: customer.email_valid,
      unsubscribed: customer.unsubscribed,
      status: customer.status
    });
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : "Eligibility check failed.",
      cooldownEndsAt: null
    };
  }
}

function normalizeTab(value: string | undefined): EmailTemplateTab {
  return value === "templates" || value === "history" ? value : "send";
}

function emailPageHref(password: string, tab: EmailTemplateTab) {
  return `/admin/email-template?password=${encodeURIComponent(password)}&tab=${tab}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
