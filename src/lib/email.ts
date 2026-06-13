import { Resend } from "resend";
import type { OrderCustomerInput, PricedOrderLineItem } from "@/lib/types";

const resendApiKey = process.env.RESEND_API_KEY;
const adminOrderEmail = process.env.ADMIN_ORDER_EMAIL;
const emailFrom =
  process.env.ORDER_EMAIL_FROM ??
  "B2B Inquiry Order <chi@chinashoerepairmaterials.com>";
const publicBaseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

type OrderEmailInput = {
  orderId: string;
  customer: OrderCustomerInput;
  items: PricedOrderLineItem[];
  submittedAt: string;
  locale: string;
};

type EmailSendResult = {
  ok: boolean;
  warning?: string;
};

export function createEmailClient() {
  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  return new Resend(resendApiKey);
}

export async function sendOrderNotificationEmails(
  order: OrderEmailInput
): Promise<EmailSendResult> {
  if (!adminOrderEmail) {
    const warning = "Order saved, but ADMIN_ORDER_EMAIL is not configured.";
    console.warn(warning);

    return {
      ok: false,
      warning
    };
  }

  try {
    const resend = createEmailClient();
    const adminEmail = await resend.emails.send({
      from: emailFrom,
      to: adminOrderEmail,
      replyTo: order.customer.email,
      subject: "New B2B Inquiry Order",
      html: buildAdminOrderEmail(order)
    });
    const customerEmail = await resend.emails.send({
      from: emailFrom,
      to: order.customer.email,
      replyTo: adminOrderEmail,
      subject: getCustomerEmailCopy(order.locale).subject,
      html: buildCustomerConfirmationEmail(order)
    });

    const adminError = adminEmail.error;
    const customerError = customerEmail.error;

    if (adminError || customerError) {
      const warning = [
        adminError ? `Admin email failed: ${adminError.message}` : null,
        customerError ? `Customer email failed: ${customerError.message}` : null
      ]
        .filter(Boolean)
        .join(" ");

      console.warn("Order email warning", {
        orderId: order.orderId,
        warning
      });

      return {
        ok: false,
        warning: `Order saved, but email notification failed. ${warning}`.trim()
      };
    }

    console.log("Order emails sent", {
      orderId: order.orderId,
      adminEmailId: adminEmail.data?.id,
      customerEmailId: customerEmail.data?.id
    });

    return {
      ok: true
    };
  } catch (error) {
    const warning =
      error instanceof Error
        ? `Order saved, but email notification failed: ${error.message}`
        : "Order saved, but email notification failed.";

    console.warn("Order email warning", {
      orderId: order.orderId,
      warning
    });

    return {
      ok: false,
      warning
    };
  }
}

function buildAdminOrderEmail(order: OrderEmailInput) {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <h1 style="font-size: 22px; margin: 0 0 16px;">New B2B Inquiry Order</h1>
      <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
        <tbody>
          ${detailRow("Order ID", order.orderId)}
          ${detailRow("Customer Language / 客户语言", formatLocaleLabel(order.locale))}
          ${detailRow("Customer Email", order.customer.email)}
          ${detailRow("Country", order.customer.country)}
          ${detailRow("WhatsApp", order.customer.whatsapp)}
          ${detailRow("Name", order.customer.name)}
          ${detailRow("Company", order.customer.company)}
          ${detailRow("Note", order.customer.note)}
          ${detailRow("Submitted At", formatSubmittedAt(order.submittedAt))}
        </tbody>
      </table>
      ${buildInquiryImagesSection(order.customer.inquiryImageUrls)}
      <h2 style="font-size: 18px; margin: 0 0 12px;">Product Details</h2>
      ${buildItemsTable(order.items)}
    </div>
  `;
}

function buildCustomerConfirmationEmail(order: OrderEmailInput) {
  const copy = getCustomerEmailCopy(order.locale);

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">${escapeHtml(copy.heading)}</h1>
      <p>
        ${escapeHtml(copy.body)}
      </p>
      <p style="margin-top: 18px;">${escapeHtml(copy.orderIdLabel)}: <strong>${escapeHtml(order.orderId)}</strong></p>
      ${buildInquiryImagesSection(order.customer.inquiryImageUrls)}
      ${buildItemsTable(order.items)}
    </div>
  `;
}

function getCustomerEmailCopy(locale: string) {
  if (locale === "zh") {
    return {
      subject: "我们已收到您的询盘",
      heading: "我们已收到您的询盘",
      body: "感谢您的询盘。我们会确认价格、库存和运费，并尽快回复您。",
      orderIdLabel: "订单号"
    };
  }

  if (locale === "ko") {
    return {
      subject: "문의 요청을 받았습니다",
      heading: "문의 요청을 받았습니다",
      body: "문의해 주셔서 감사합니다. 가격, 재고 및 배송비를 확인한 후 곧 답변드리겠습니다.",
      orderIdLabel: "주문 번호"
    };
  }

  if (locale === "ja") {
    return {
      subject: "お問い合わせを受け付けました",
      heading: "お問い合わせを受け付けました",
      body: "お問い合わせありがとうございます。価格、在庫、送料を確認し、できるだけ早くご返信いたします。",
      orderIdLabel: "注文番号"
    };
  }

  return {
    subject: "We received your order request",
    heading: "We received your order request",
    body:
      "Thank you for your order request. We will check price, stock and shipping cost, then reply to you soon.",
    orderIdLabel: "Order ID"
  };
}

function formatLocaleLabel(locale: string) {
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

function buildInquiryImagesSection(imageUrls: string[] | undefined) {
  const urls = (imageUrls ?? [])
    .map(normalizeImageUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 3);

  if (urls.length === 0) {
    return "";
  }

  const images = urls
    .map(
      (url, index) => `
        <a href="${escapeHtml(url)}" style="display: inline-block; margin: 0 12px 12px 0;">
          <img
            src="${escapeHtml(url)}"
            alt="Customer inquiry image ${index + 1}"
            width="150"
            style="display: block; max-width: 150px; height: auto; border: 1px solid #dbe3ef; border-radius: 8px;"
          />
        </a>
      `
    )
    .join("");

  return `
    <div style="margin: 0 0 20px;">
      <h2 style="font-size: 18px; margin: 0 0 12px;">Customer Inquiry Images</h2>
      <div>${images}</div>
    </div>
  `;
}

function buildItemsTable(items: PricedOrderLineItem[]) {
  const groups = groupItemsByProduct(items);
  const subtotal = groups.reduce(
    (total, group) => total + (group.total ?? 0),
    0
  );
  const hasFullPricing = groups.every((group) => group.total !== null);
  const rows = groups.map((group) => buildProductGroupRow(group)).join("");

  return `
    <table style="border-collapse: collapse; width: 100%; border: 1px solid #dbe3ef;">
      <thead>
        <tr style="background: #f8fafc;">
          <th align="left" style="border: 1px solid #dbe3ef; padding: 12px;">Product Image</th>
          <th align="left" style="border: 1px solid #dbe3ef; padding: 12px;">Product Information</th>
          <th align="left" style="border: 1px solid #dbe3ef; padding: 12px;">Quantity &amp; Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="2" align="right" style="border: 1px solid #dbe3ef; padding: 12px; font-weight: bold;">Product Subtotal</td>
          <td align="right" style="border: 1px solid #dbe3ef; padding: 12px; font-weight: bold;">${hasFullPricing ? formatMoney(subtotal) : "-"}</td>
        </tr>
        <tr>
          <td colspan="2" align="right" style="border: 1px solid #dbe3ef; padding: 12px; font-weight: bold;">Shipping Fee</td>
          <td align="right" style="border: 1px solid #dbe3ef; padding: 12px;">Waiting for seller to fill in</td>
        </tr>
        <tr>
          <td colspan="2" align="right" style="border: 1px solid #dbe3ef; padding: 12px; font-weight: bold;">Grand Total</td>
          <td align="right" style="border: 1px solid #dbe3ef; padding: 12px;">Waiting for seller to fill in</td>
        </tr>
      </tbody>
    </table>
  `;
}

type ProductGroup = {
  productId: string;
  productName: string;
  imageUrl?: string;
  color?: string;
  unit?: string;
  items: PricedOrderLineItem[];
  totalQuantity: number;
  unitPrice: number | null;
  total: number | null;
};

function groupItemsByProduct(items: PricedOrderLineItem[]) {
  const groups = new Map<string, ProductGroup>();

  for (const item of items) {
    const groupKey = item.productId;
    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.totalQuantity += item.quantity;
      existingGroup.total =
        existingGroup.total === null || item.lineTotal === null
          ? null
          : existingGroup.total + item.lineTotal;

      if (existingGroup.unitPrice !== item.unitPrice) {
        existingGroup.unitPrice = null;
      }
    } else {
      groups.set(groupKey, {
        productId: item.productId,
        productName: item.productName,
        imageUrl: item.imageUrl,
        color: item.color,
        unit: item.unit,
        items: [item],
        totalQuantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.lineTotal
      });
    }
  }

  return Array.from(groups.values());
}

function buildProductGroupRow(group: ProductGroup) {
  const variants = group.items
    .map((item) => {
      const label = item.size ? `Size ${item.size}` : item.sku;

      return `<span style="display: inline-block; margin: 4px 6px 0 0; padding: 6px 10px; border: 1px solid #dbe3ef; border-radius: 999px; background: #f8fafc; color: #475569;">${escapeHtml(label)} x ${item.quantity}</span>`;
    })
    .join("");
  const imageUrl = normalizeImageUrl(group.imageUrl);

  return `
    <tr>
      <td style="border: 1px solid #dbe3ef; padding: 18px; width: 180px; vertical-align: middle;">
        ${
          imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(group.productName)}" width="140" style="display: block; max-width: 140px; height: auto; border-radius: 8px;" />`
            : `<div style="width: 140px; height: 96px; border: 1px dashed #cbd5e1; border-radius: 8px; color: #94a3b8; text-align: center; line-height: 96px;">No image</div>`
        }
      </td>
      <td style="border: 1px solid #dbe3ef; padding: 18px; vertical-align: top;">
        <h3 style="font-size: 18px; margin: 0 0 10px;">${escapeHtml(group.productName)}</h3>
        <p style="margin: 0 0 6px; color: #475569;">Color: ${escapeHtml(group.color ?? "-")}</p>
        <p style="margin: 0 0 10px; color: #475569;">Selected models:</p>
        <div>${variants}</div>
      </td>
      <td style="border: 1px solid #dbe3ef; padding: 18px; width: 260px; vertical-align: top;">
        <table style="border-collapse: collapse; width: 100%;">
          <tbody>
            <tr>
              <td style="padding: 4px 0; color: #475569;">Total Quantity</td>
              <td align="right" style="padding: 4px 0; font-weight: bold;">${group.totalQuantity} ${escapeHtml(formatUnit(group.unit, group.totalQuantity))}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475569;">Unit Price</td>
              <td align="right" style="padding: 4px 0; font-weight: bold;">${formatMoney(group.unitPrice)}</td>
            </tr>
            <tr>
              <td colspan="2" style="border-top: 1px solid #dbe3ef; padding-top: 10px;"></td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 16px; font-weight: bold;">Total</td>
              <td align="right" style="padding: 4px 0; font-size: 18px; font-weight: bold; color: #2563eb;">${formatMoney(group.total)}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  `;
}

function detailRow(label: string, value?: string) {
  return `
    <tr>
      <th align="left" style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; width: 180px;">
        ${escapeHtml(label)}
      </th>
      <td style="border: 1px solid #cbd5e1; padding: 8px;">
        ${escapeHtml(value ?? "-")}
      </td>
    </tr>
  `;
}

function formatSubmittedAt(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US");
}

function formatMoney(value: number | null) {
  return value === null ? "-" : `$${value.toFixed(2)}`;
}

function formatUnit(unit: string | undefined, quantity: number) {
  if (!unit) {
    return quantity === 1 ? "unit" : "units";
  }

  return quantity === 1 || unit.endsWith("s") ? unit : `${unit}s`;
}

function normalizeImageUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/") && publicBaseUrl) {
    return `${publicBaseUrl}${value}`;
  }

  return undefined;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
