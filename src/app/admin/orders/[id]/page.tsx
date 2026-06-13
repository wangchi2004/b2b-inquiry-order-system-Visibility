import Link from "next/link";
import { AdminOrderProductDetails } from "@/components/AdminOrderProductDetails";
import { Header } from "@/components/Header";
import { checkAdminAccess } from "@/lib/admin";
import { type AdminOrderItem, getAdminOrderById } from "@/lib/adminOrders";
import { saveOrderQuote, sendQuoteReplyEmail } from "./actions";

type AdminOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    password?: string;
    message?: string;
  }>;
};

export default async function AdminOrderDetailPage({
  params,
  searchParams
}: AdminOrderDetailPageProps) {
  const [{ id }, { password, message }] = await Promise.all([params, searchParams]);
  const access = checkAdminAccess(password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  const order = await getAdminOrderById(id);
  const productGroups = groupOrderItemsByProduct(order.order_items);
  const inquiryImageUrls = [
    order.inquiry_image_url_1,
    order.inquiry_image_url_2,
    order.inquiry_image_url_3
  ].filter((url): url is string => Boolean(url));

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin / Order detail</p>
            <h1 className="break-all text-3xl font-semibold text-slate-950">
              {order.id}
            </h1>
          </div>
          <Link
            href={`/admin/orders?password=${encodeURIComponent(access.password)}`}
            className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-800"
          >
            Back to Orders
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Customer</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <DetailRow label="Customer Email" value={order.customer_email} />
              <DetailRow label="Name" value={order.customers?.name} />
              <DetailRow label="Company" value={order.customers?.company} />
              <DetailRow label="Country" value={order.country ?? order.customers?.country} />
              <DetailRow label="WhatsApp" value={order.whatsapp ?? order.customers?.whatsapp} />
              <DetailRow label="Language" value={formatLocaleLabel(order.locale)} />
              <DetailRow label="Note" value={order.note} />
            </dl>
            {inquiryImageUrls.length > 0 ? (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-700">
                  Inquiry Images
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {inquiryImageUrls.map((imageUrl, index) => (
                    <a
                      key={imageUrl}
                      href={imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded border border-slate-200 bg-slate-50 p-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={`Inquiry image ${index + 1}`}
                        className="aspect-[4/3] w-full rounded object-contain"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Order</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <DetailRow label="Order ID" value={order.id} />
              <DetailRow label="Status" value={order.status} />
              <DetailRow label="Created At" value={formatDate(order.created_at)} />
              <DetailRow label="Updated At" value={formatDate(order.updated_at)} />
            </dl>
          </section>
        </div>

        <section className="mt-6 rounded border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Product Details</h2>
          {message ? (
            <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {message}
            </p>
          ) : null}
          <AdminOrderProductDetails
            groups={productGroups}
            orderId={order.id}
            customerEmail={order.customer_email}
            password={access.password}
            savedQuote={{
              productSubtotal: order.product_subtotal,
              shippingFee: order.shipping_fee,
              grandTotal: order.grand_total,
              paypalFee: order.paypal_fee,
              paypalCollection: order.paypal_collection,
              shippingRecipientName: order.shipping_recipient_name,
              shippingPhone: order.shipping_phone,
              shippingCountry: order.shipping_country,
              shippingAddress: order.shipping_address,
              shippingNote: order.shipping_note,
              quoteUpdatedAt: order.quote_updated_at
            }}
            saveAction={saveOrderQuote}
            sendEmailAction={sendQuoteReplyEmail}
          />
        </section>
      </section>
    </main>
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
        <h1 className="text-3xl font-semibold text-slate-950">Admin Order Detail</h1>
        {reason === "missing_config" ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            ADMIN_PASSWORD is not configured. Add it to your environment variables
            before viewing the admin order pages.
          </p>
        ) : (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Invalid admin password. Open this page with ?password=YOUR_ADMIN_PASSWORD.
          </p>
        )}
      </section>
    </main>
  );
}

type OrderItemGroup = {
  key: string;
  productName: string;
  imageUrl: string | null;
  totalQuantity: number;
  items: AdminOrderItem[];
};

function groupOrderItemsByProduct(items: AdminOrderItem[]) {
  const groups = new Map<string, OrderItemGroup>();

  for (const item of items) {
    const key = item.product_id ?? item.product_name;
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.totalQuantity += item.quantity;
      continue;
    }

    groups.set(key, {
      key,
      productName: item.product_name,
      imageUrl: getProductImageUrl(item),
      totalQuantity: item.quantity,
      items: [item]
    });
  }

  return Array.from(groups.values());
}

function getProductImageUrl(item: AdminOrderItem) {
  return (
    item.products?.image_url ??
    item.products?.image_url_2 ??
    item.products?.image_url_3 ??
    null
  );
}

function DetailRow({
  label,
  value
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="break-words text-slate-950">{value || "-"}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatLocaleLabel(locale: string | null) {
  if (locale === "zh") {
    return "zh / Chinese / 中文";
  }

  if (locale === "ko") {
    return "ko / Korean / 韩语";
  }

  if (locale === "ja") {
    return "ja / Japanese / 日语";
  }

  return "en / English / 英语";
}
