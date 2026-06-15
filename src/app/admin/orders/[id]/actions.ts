"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin";
import { getAdminOrderById, type AdminOrderItem } from "@/lib/adminOrders";
import { saveCustomerShippingDetails } from "@/lib/customerShipping";
import { createEmailClient } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function saveOrderQuote(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/orders");
  }

  const orderId = readString(formData.get("order_id"));

  if (!orderId) {
    redirect(adminOrderPath(orderId, password, "Order ID is required."));
  }

  const productSubtotal = readMoney(formData.get("product_subtotal"));
  const shippingFee = readMoney(formData.get("shipping_fee"));
  const grandTotal = readMoney(formData.get("grand_total"));
  const paypalFee = readMoney(formData.get("paypal_fee"));
  const paypalCollection = readMoney(formData.get("paypal_collection"));
  const shippingDetails = readShippingDetails(formData);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({
      product_subtotal: productSubtotal,
      shipping_fee: shippingFee,
      grand_total: grandTotal,
      paypal_fee: paypalFee,
      paypal_collection: paypalCollection,
      paypal_fee_rate: 0.05,
      ...shippingDetails,
      quote_updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (error) {
    redirect(
      adminOrderPath(
        orderId,
        password,
        error.code === "42703" || error.message.includes("does not exist")
          ? "Quote fields are not in the database yet. Run supabase/order_quote_fields.sql first."
          : error.message
      )
    );
  }

  const order = await getAdminOrderById(orderId);
  const customerShippingWarning = await saveCustomerShippingDetails(
    order.customer_id,
    shippingDetails
  );

  revalidatePath(`/admin/orders/${orderId}`);
  redirect(
    adminOrderPath(
      orderId,
      password,
      customerShippingWarning
        ? `Quote saved. ${customerShippingWarning}`
        : "Quote saved."
    )
  );
}

export async function saveOrderItems(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/orders");
  }

  const orderId = readString(formData.get("order_id"));

  if (!orderId) {
    redirect(adminOrderPath(orderId, password, "Order ID is required."));
  }

  const itemUpdates = readOrderItemUpdates(formData);

  if (itemUpdates.length === 0) {
    redirect(adminOrderPath(orderId, password, "No order items to save."));
  }

  const supabase = createSupabaseAdminClient();

  for (const item of itemUpdates) {
    const { error } = await supabase
      .from("order_items")
      .update({
        product_name: item.product_name,
        sku: item.sku,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price
      })
      .eq("id", item.id)
      .eq("order_id", orderId);

    if (error) {
      redirect(
        adminOrderPath(
          orderId,
          password,
          error.code === "42703" || error.message.includes("schema cache")
            ? "Order item price field is not in the database yet. Run supabase/order_item_edit_fields.sql first."
            : error.message
        )
      );
    }
  }

  const productSubtotal = itemUpdates.reduce(
    (total, item) => total + (item.unit_price ?? 0) * item.quantity,
    0
  );
  const order = await getAdminOrderById(orderId);
  const shippingFee = order.shipping_fee ?? 0;
  const grandTotal = productSubtotal + shippingFee;

  try {
    await persistQuote(orderId, {
      productSubtotal,
      shippingFee: order.shipping_fee,
      grandTotal,
      paypalFee: grandTotal * 0.05,
      paypalCollection: grandTotal * 1.05,
      shippingDetails: {
        shipping_recipient_name: order.shipping_recipient_name,
        shipping_phone: order.shipping_phone,
        shipping_country: order.shipping_country,
        shipping_address: order.shipping_address,
        shipping_note: order.shipping_note
      }
    });
  } catch (error) {
    console.warn("Quote recalculation after item save failed", {
      orderId,
      error: error instanceof Error ? error.message : error
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  redirect(adminOrderPath(orderId, password, "Order items saved."));
}

export async function sendQuoteReplyEmail(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/orders");
  }

  const orderId = readString(formData.get("order_id"));

  if (!orderId) {
    redirect(adminOrderPath(orderId, password, "Order ID is required."));
  }

  const quote = {
    productSubtotal: readMoney(formData.get("product_subtotal")),
    shippingFee: readMoney(formData.get("shipping_fee")),
    grandTotal: readMoney(formData.get("grand_total")),
    paypalFee: readMoney(formData.get("paypal_fee")),
    paypalCollection: readMoney(formData.get("paypal_collection")),
    shippingDetails: readShippingDetails(formData)
  };

  const order = await getAdminOrderById(orderId);

  try {
    await persistQuote(orderId, quote);
    await saveCustomerShippingDetails(order.customer_id, quote.shippingDetails);
  } catch (error) {
    console.warn("Quote save before email failed", {
      orderId,
      error: error instanceof Error ? error.message : error
    });
  }

  let emailErrorMessage: string | null = null;

  try {
    const resend = createEmailClient();
    const result = await resend.emails.send({
      from:
        process.env.ORDER_EMAIL_FROM ??
        "B2B Inquiry Order <chi@chinashoerepairmaterials.com>",
      to: order.customer_email,
      replyTo: process.env.ADMIN_ORDER_EMAIL,
      subject: `Quotation for B2B Inquiry Order ${order.id.slice(0, 8)}`,
      html: buildQuoteReplyEmailHtml({
        orderId: order.id,
        customerName: order.customers?.name,
        groups: groupOrderItemsByProduct(order.order_items),
        quote
      })
    });

    if (result.error) {
      emailErrorMessage = result.error.message;
    } else {
      console.log("Quote reply email sent", {
        orderId,
        emailId: result.data?.id
      });
    }
  } catch (error) {
    emailErrorMessage = error instanceof Error ? error.message : "Email failed.";
  }

  if (emailErrorMessage) {
    redirect(adminOrderPath(orderId, password, `Email failed: ${emailErrorMessage}`));
  }

  revalidatePath(`/admin/orders/${orderId}`);
  redirect(adminOrderPath(orderId, password, "Reply email sent."));
}

async function persistQuote(
  orderId: string,
  quote: {
    productSubtotal: number | null;
    shippingFee: number | null;
    grandTotal: number | null;
    paypalFee: number | null;
    paypalCollection: number | null;
    shippingDetails: ShippingDetails;
  }
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({
      product_subtotal: quote.productSubtotal,
      shipping_fee: quote.shippingFee,
      grand_total: quote.grandTotal,
      paypal_fee: quote.paypalFee,
      paypal_collection: quote.paypalCollection,
      paypal_fee_rate: 0.05,
      ...quote.shippingDetails,
      quote_updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }
}

type QuoteProductGroup = {
  key: string;
  productName: string;
  imageUrl: string | null;
  totalQuantity: number;
  items: AdminOrderItem[];
};

type ShippingDetails = {
  shipping_recipient_name: string | null;
  shipping_phone: string | null;
  shipping_country: string | null;
  shipping_address: string | null;
  shipping_note: string | null;
};

function groupOrderItemsByProduct(items: AdminOrderItem[]) {
  const groups = new Map<string, QuoteProductGroup>();

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

function buildQuoteReplyEmailHtml({
  orderId,
  customerName,
  groups,
  quote
}: {
  orderId: string;
  customerName: string | null | undefined;
  groups: QuoteProductGroup[];
  quote: {
    productSubtotal: number | null;
    shippingFee: number | null;
    grandTotal: number | null;
    paypalFee: number | null;
    paypalCollection: number | null;
    shippingDetails: ShippingDetails;
  };
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <p style="margin: 0 0 14px;">Dear ${escapeHtml(customerName || "customer")},</p>
      <p style="margin: 0 0 18px;">Thank you for your inquiry. Please find our quotation details below.</p>
      <p style="margin: 0 0 18px;">Order ID: <strong>${escapeHtml(orderId)}</strong></p>
      <h2 style="font-size: 22px; margin: 0 0 18px;">Product Details</h2>
      <table style="border-collapse: collapse; width: 100%; border: 1px solid #dbe3ef; font-size: 14px;">
        <thead>
          <tr style="background: #f8fafc; color: #334155;">
            <th align="left" style="${cellStyle()} width: 110px;">Image</th>
            <th align="left" style="${cellStyle()} width: 180px;">Product</th>
            <th align="left" style="${cellStyle()}">SKU</th>
            <th align="left" style="${cellStyle()} width: 70px;">Size</th>
            <th align="left" style="${cellStyle()} width: 80px;">Color</th>
            <th align="right" style="${cellStyle()} width: 80px;">Quantity</th>
            <th align="left" style="${cellStyle()} width: 70px;">Unit</th>
            <th align="right" style="${cellStyle()} width: 90px;">Unit Price</th>
            <th align="right" style="${cellStyle()} width: 90px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${groups.map((group) => buildProductRows(group)).join("")}
        </tbody>
      </table>
      ${buildShippingDetailsTable(quote.shippingDetails)}
      <table align="right" style="border-collapse: collapse; width: 430px; max-width: 100%; margin-top: 20px; border: 1px solid #dbe3ef; background: #f8fafc; font-size: 14px;">
        <tbody>
          ${summaryRow("Product Subtotal", formatMoney(quote.productSubtotal), true)}
          ${summaryRow("Shipping Fee", formatMoney(quote.shippingFee))}
          ${summaryRow("Grand Total", formatMoney(quote.grandTotal), true)}
          ${summaryRow("PayPal fee (5%)", formatMoney(quote.paypalFee))}
          ${summaryRow("PayPal Collection", formatMoney(quote.paypalCollection), true)}
        </tbody>
      </table>
      <div style="clear: both;"></div>
      <p style="margin: 24px 0 0;">Please confirm if everything is correct.</p>
      <p style="margin: 18px 0 0;">Best regards</p>
    </div>
  `;
}

function buildShippingDetailsTable(shippingDetails: ShippingDetails) {
  return `
    <h2 style="font-size: 18px; margin: 24px 0 12px;">Shipping Details</h2>
    <table style="border-collapse: collapse; width: 100%; border: 1px solid #dbe3ef; font-size: 14px;">
      <tbody>
        ${shippingRow("Recipient Name", shippingDetails.shipping_recipient_name)}
        ${shippingRow("Phone", shippingDetails.shipping_phone)}
        ${shippingRow("Country", shippingDetails.shipping_country)}
        ${shippingRow("Detailed Address", shippingDetails.shipping_address)}
        ${shippingRow("Shipping Note", shippingDetails.shipping_note)}
      </tbody>
    </table>
  `;
}

function shippingRow(label: string, value: string | null) {
  return `
    <tr>
      <th align="left" style="border: 1px solid #dbe3ef; background: #f8fafc; padding: 10px 12px; width: 180px;">${escapeHtml(label)}</th>
      <td style="border: 1px solid #dbe3ef; padding: 10px 12px;">${escapeHtml(value || "-")}</td>
    </tr>
  `;
}

function buildProductRows(group: QuoteProductGroup) {
  return group.items
    .map((item, index) => {
      const unitPrice = item.unit_price ?? item.product_variants?.price ?? null;
      const lineTotal = unitPrice === null ? null : unitPrice * item.quantity;

      return `
        <tr>
          ${
            index === 0
              ? `
                <td rowspan="${group.items.length}" style="${cellStyle()} vertical-align: top;">
                  ${productImageHtml(group)}
                </td>
                <td rowspan="${group.items.length}" style="${cellStyle()} vertical-align: top;">
                  <strong>${escapeHtml(group.productName)}</strong>
                  <div style="margin-top: 8px; color: #64748b;">Total: ${group.totalQuantity}</div>
                </td>
              `
              : ""
          }
          <td style="${cellStyle()}">${escapeHtml(item.sku ?? "-")}</td>
          <td style="${cellStyle()}">${escapeHtml(item.size ?? "-")}</td>
          <td style="${cellStyle()}">${escapeHtml(item.color ?? "-")}</td>
          <td align="right" style="${cellStyle()}">${item.quantity}</td>
          <td style="${cellStyle()}">${escapeHtml(item.unit ?? "-")}</td>
          <td align="right" style="${cellStyle()}">${formatMoney(unitPrice)}</td>
          <td align="right" style="${cellStyle()} font-weight: bold;">${formatMoney(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");
}

function productImageHtml(group: QuoteProductGroup) {
  if (!group.imageUrl) {
    return `<div style="width: 82px; height: 82px; border: 1px dashed #cbd5e1; color: #94a3b8; text-align: center; line-height: 82px;">No image</div>`;
  }

  return `<img src="${escapeHtml(group.imageUrl)}" alt="${escapeHtml(group.productName)}" width="82" style="display: block; width: 82px; height: 82px; object-fit: contain; border: 1px solid #dbe3ef; border-radius: 4px;" />`;
}

function summaryRow(label: string, value: string, strong = false) {
  return `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #dbe3ef; font-weight: ${strong ? "bold" : "600"};">${escapeHtml(label)}</td>
      <td align="right" style="padding: 10px 14px; border-bottom: 1px solid #dbe3ef; font-weight: ${strong ? "bold" : "400"};">${escapeHtml(value)}</td>
    </tr>
  `;
}

function cellStyle() {
  return "border: 1px solid #dbe3ef; padding: 10px 12px;";
}

function getProductImageUrl(item: AdminOrderItem) {
  return (
    item.products?.image_url ??
    item.products?.image_url_2 ??
    item.products?.image_url_3 ??
    null
  );
}

function adminOrderPath(orderId: string, password: string, message?: string) {
  const params = new URLSearchParams({
    password
  });

  if (message) {
    params.set("message", message);
  }

  return `/admin/orders/${orderId}?${params.toString()}`;
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: FormDataEntryValue | null) {
  const text = readString(value);

  return text || null;
}

function readShippingDetails(formData: FormData): ShippingDetails {
  return {
    shipping_recipient_name: readNullableString(formData.get("shipping_recipient_name")),
    shipping_phone: readNullableString(formData.get("shipping_phone")),
    shipping_country: readNullableString(formData.get("shipping_country")),
    shipping_address: readNullableString(formData.get("shipping_address")),
    shipping_note: readNullableString(formData.get("shipping_note"))
  };
}

type OrderItemUpdate = {
  id: string;
  product_name: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number | null;
};

function readOrderItemUpdates(formData: FormData): OrderItemUpdate[] {
  const itemIds = formData.getAll("item_id").map((value) => readString(value));

  return itemIds
    .map((id) => {
      if (!id) {
        return null;
      }

      const quantity = Math.max(
        1,
        Math.floor(readNumber(formData.get(`item_quantity_${id}`)) ?? 1)
      );

      return {
        id,
        product_name: readString(formData.get(`item_product_name_${id}`)),
        sku: readNullableString(formData.get(`item_sku_${id}`)),
        size: readNullableString(formData.get(`item_size_${id}`)),
        color: readNullableString(formData.get(`item_color_${id}`)),
        quantity,
        unit: readNullableString(formData.get(`item_unit_${id}`)),
        unit_price: readMoney(formData.get(`item_unit_price_${id}`))
      };
    })
    .filter((item): item is OrderItemUpdate => Boolean(item && item.product_name));
}

function readMoney(value: FormDataEntryValue | null) {
  const text = readString(value);

  if (!text) {
    return null;
  }

  const parsedValue = Number(text);

  return Number.isFinite(parsedValue) ? Number(parsedValue.toFixed(2)) : null;
}

function readNumber(value: FormDataEntryValue | null) {
  const text = readString(value);

  if (!text) {
    return null;
  }

  const parsedValue = Number(text);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatMoney(value: number | null) {
  return value === null ? "-" : `$${value.toFixed(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
