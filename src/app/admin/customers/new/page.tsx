import Link from "next/link";
import { Header } from "@/components/Header";
import { checkAdminAccess } from "@/lib/admin";
import { createCustomerProfile } from "./actions";

type NewCustomerPageProps = {
  searchParams: Promise<{
    password?: string;
    message?: string;
  }>;
};

export default async function NewCustomerPage({
  searchParams
}: NewCustomerPageProps) {
  const { password, message } = await searchParams;
  const access = checkAdminAccess(password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin / Customer</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              New Customer / 新增客户
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Manually add a customer or sales lead. 手工录入客户或潜在客户资料。
            </p>
          </div>
          <Link
            href={`/admin/customers?password=${encodeURIComponent(access.password)}`}
            className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-900"
          >
            Back / 返回
          </Link>
        </div>

        {message ? (
          <p className="mb-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {message}
          </p>
        ) : null}

        <form
          action={createCustomerProfile}
          className="rounded border border-slate-200 bg-white p-5"
        >
          <input type="hidden" name="password" value={access.password} />

          <div className="grid gap-4 md:grid-cols-2">
            <TextInput label="Email / 邮件地址" name="email" required />
            <TextInput label="Country / 国家" name="country" />
            <TextInput label="Name / 姓名" name="name" />
            <TextInput label="Company / 公司" name="company" />
            <TextInput label="Phone / 电话" name="phone" />
            <TextInput label="WhatsApp" name="whatsapp" />
            <TextInput label="Instagram / INS" name="instagram" />
            <TextInput label="Website / 网址" name="website" />
            <TextInput label="Shop Name / 店名" name="shop_name" />
            <TextInput label="City / 城市" name="city" />
            <SelectInput
              label="Business Type / 客户类型"
              name="business_type"
              options={BUSINESS_TYPE_OPTIONS}
            />
            <SelectInput
              label="Source / 来源"
              name="source"
              defaultValue="manual"
              options={SOURCE_OPTIONS}
            />
            <TextInput label="Source URL / 来源链接" name="source_url" />
            <SelectInput
              label="Status / 客户状态"
              name="status"
              defaultValue="prospecting"
              options={STATUS_OPTIONS}
            />
            <SelectInput
              label="Stage / 跟进阶段"
              name="stage"
              defaultValue="new"
              options={STAGE_OPTIONS}
            />
            <TextInput
              label="Score / 评分"
              name="score"
              type="number"
              defaultValue="0"
            />
            <TextInput label="Owner / 负责人" name="owner" />
            <TextInput
              label="Last Contacted At / 最近联系时间"
              name="last_contacted_at"
              type="date"
            />
          </div>

          <div className="mt-4 grid gap-3 rounded border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
            <CheckboxInput
              label="Email valid / 邮箱有效"
              name="email_valid"
              defaultChecked
            />
            <CheckboxInput
              label="Unsubscribed or do not contact / 已退订或禁止联系"
              name="unsubscribed"
            />
          </div>

          <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-950">
              Shipping Address / 发货地址
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextInput
                label="Recipient Name / 收货人姓名"
                name="shipping_recipient_name"
              />
              <TextInput
                label="Shipping Phone / 收货电话"
                name="shipping_phone"
              />
              <TextInput
                label="Shipping Country / 发货国家"
                name="shipping_country"
              />
              <TextArea label="Detailed Address / 详细地址" name="shipping_address" />
              <TextArea label="Shipping Note / 物流备注" name="shipping_note" />
              <TextArea label="Customer Note / 客户备注" name="customer_note" />
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 h-11 rounded bg-slate-950 px-5 text-sm font-semibold text-white"
          >
            Create Customer / 创建客户
          </button>
        </form>
      </section>
    </main>
  );
}

function TextInput({
  label,
  name,
  required = false,
  type = "text",
  defaultValue = ""
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded border border-slate-300 px-3 text-sm font-normal text-slate-950 outline-none focus:border-slate-500"
      />
    </label>
  );
}

function SelectInput({
  label,
  name,
  options,
  defaultValue = ""
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded border border-slate-300 px-3 text-sm font-normal text-slate-950 outline-none focus:border-slate-500"
      >
        <option value="">Select / 选择</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxInput({
  label,
  name,
  defaultChecked = false
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 font-semibold text-slate-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-slate-300"
      />
      {label}
    </label>
  );
}

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
      {label}
      <textarea
        name={name}
        rows={4}
        className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-slate-500"
      />
    </label>
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
          New Customer / 新增客户
        </h1>
        <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {reason === "missing_config"
            ? "ADMIN_PASSWORD is not configured. 请先配置 ADMIN_PASSWORD。"
            : "Invalid admin password. 管理员密码不正确。"}
        </p>
      </section>
    </main>
  );
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
  {
    value: "shoe_material_supplier",
    label: "Shoe Material Supplier / 鞋材商"
  },
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
  { value: "manual", label: "Manual / 手工录入" }
];
