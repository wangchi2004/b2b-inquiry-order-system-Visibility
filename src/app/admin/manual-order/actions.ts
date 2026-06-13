"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin";
import { saveCustomerShippingDetails, type CustomerShippingDetails } from "@/lib/customerShipping";
import { createSupabaseAdminClient } from "@/lib/supabase";

type ManualOrderItem = {
  productId: string;
  variantId: string;
  productName: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  unit: string | null;
  quantity: number;
};

export async function createManualOrder(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/manual-order");
  }

  const customerEmail = readString(formData.get("customer_email"));
  const country = readString(formData.get("country"));
  const customerName = readString(formData.get("customer_name"));
  const company = readString(formData.get("company"));
  const whatsapp = readString(formData.get("whatsapp"));
  const note = readString(formData.get("note"));
  const items = readManualOrderItems(formData.get("items_json"));

  if (!customerEmail || !customerEmail.includes("@")) {
    redirect(manualOrderPath(password, "Valid customer email is required."));
  }

  if (!country) {
    redirect(manualOrderPath(password, "Country is required."));
  }

  if (items.length === 0) {
    redirect(manualOrderPath(password, "Add at least one product."));
  }

  const supabase = createSupabaseAdminClient();
  const customerId = await upsertCustomer({
    email: customerEmail,
    country,
    name: customerName || customerEmail,
    company,
    whatsapp
  });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      customer_email: customerEmail,
      country,
      whatsapp: whatsapp || null,
      note: note || null,
      status: "manual_order"
    })
    .select("id")
    .single();

  if (orderError || !order) {
    redirect(manualOrderPath(password, orderError?.message ?? "Failed to create manual order."));
  }

  const { error: orderItemsError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      sku: item.sku,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unit: item.unit
    }))
  );

  if (orderItemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    redirect(manualOrderPath(password, orderItemsError.message));
  }

  const quoteWarning = await saveQuoteFields(order.id, formData);
  const customerShippingWarning = await saveCustomerShippingDetails(
    customerId,
    readShippingDetails(formData)
  );

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.id}`);
  redirect(
    adminOrderPath(
      order.id,
      password,
      ["Manual order created.", quoteWarning, customerShippingWarning]
        .filter(Boolean)
        .join(" ")
    )
  );
}

async function upsertCustomer({
  email,
  country,
  name,
  company,
  whatsapp
}: {
  email: string;
  country: string;
  name: string;
  company: string;
  whatsapp: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: existingCustomer, error: findError } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (findError) {
    throw new Error(`Failed to find customer: ${findError.message}`);
  }

  if (existingCustomer) {
    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update({
        country,
        name,
        company: company || null,
        whatsapp: whatsapp || null
      })
      .eq("id", existingCustomer.id)
      .select("id")
      .single();

    if (updateError || !updatedCustomer) {
      throw new Error(updateError?.message ?? "Failed to update customer.");
    }

    return updatedCustomer.id as string;
  }

  const { data: newCustomer, error: insertError } = await supabase
    .from("customers")
    .insert({
      email,
      country,
      name,
      company: company || null,
      whatsapp: whatsapp || null
    })
    .select("id")
    .single();

  if (insertError || !newCustomer) {
    throw new Error(insertError?.message ?? "Failed to create customer.");
  }

  return newCustomer.id as string;
}

async function saveQuoteFields(orderId: string, formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({
      product_subtotal: readMoney(formData.get("product_subtotal")),
      shipping_fee: readMoney(formData.get("shipping_fee")),
      grand_total: readMoney(formData.get("grand_total")),
      paypal_fee: readMoney(formData.get("paypal_fee")),
      paypal_collection: readMoney(formData.get("paypal_collection")),
      paypal_fee_rate: 0.05,
      ...readShippingDetails(formData),
      quote_updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (!error) {
    return null;
  }

  if (error.code === "42703" || error.message.includes("schema cache")) {
    return "Quote fields were not saved. Run supabase/order_quote_fields.sql in Supabase SQL Editor.";
  }

  return `Quote fields were not saved: ${error.message}`;
}

function readShippingDetails(formData: FormData): CustomerShippingDetails {
  return {
    shipping_recipient_name: readNullableString(formData.get("shipping_recipient_name")),
    shipping_phone: readNullableString(formData.get("shipping_phone")),
    shipping_country: readNullableString(formData.get("shipping_country")),
    shipping_address: readNullableString(formData.get("shipping_address")),
    shipping_note: readNullableString(formData.get("shipping_note"))
  };
}

function readManualOrderItems(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((item) => normalizeManualOrderItem(item))
      .filter((item): item is ManualOrderItem => Boolean(item));
  } catch {
    return [];
  }
}

function normalizeManualOrderItem(item: unknown): ManualOrderItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const productId = readUnknownString(record.productId);
  const variantId = readUnknownString(record.variantId);
  const productName = readUnknownString(record.productName);
  const quantity = Number(record.quantity);

  if (!productId || !variantId || !productName || !Number.isFinite(quantity) || quantity < 1) {
    return null;
  }

  return {
    productId,
    variantId,
    productName,
    sku: readUnknownNullableString(record.sku),
    size: readUnknownNullableString(record.size),
    color: readUnknownNullableString(record.color),
    unit: readUnknownNullableString(record.unit),
    quantity: Math.floor(quantity)
  };
}

function manualOrderPath(password: string, message?: string) {
  const params = new URLSearchParams({
    password
  });

  if (message) {
    params.set("message", message);
  }

  return `/admin/manual-order?${params.toString()}`;
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

function readUnknownString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readUnknownNullableString(value: unknown) {
  const text = readUnknownString(value);

  return text || null;
}

function readMoney(value: FormDataEntryValue | null) {
  const text = readString(value);

  if (!text) {
    return null;
  }

  const parsedValue = Number(text);

  return Number.isFinite(parsedValue) ? Number(parsedValue.toFixed(2)) : null;
}
