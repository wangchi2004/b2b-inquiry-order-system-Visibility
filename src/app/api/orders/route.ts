import { accountUser } from "@/lib/accountSession";
import { NextResponse } from "next/server";
import { sendOrderNotificationEmails } from "@/lib/email";
import { getCustomerShippingDetails } from "@/lib/customerShipping";
import { getOrderLinkByToken } from "@/lib/orderLinks";
import { validateOrderSubmission } from "@/lib/orderValidation";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { CartLineItem, OrderCustomerInput, PricedOrderLineItem } from "@/lib/types";

export async function POST(request: Request) {
  const publicUrl = new URL(request.url);
  publicUrl.host = request.headers.get("host") ?? publicUrl.host;
  if (request.headers.get("origin") !== publicUrl.origin) return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  const user = await accountUser();
  if (!user?.email) return NextResponse.json({ message: "Please sign in before submitting an inquiry.", code: "LOGIN_REQUIRED" }, { status: 401 });
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: "Invalid JSON payload."
      },
      {
        status: 400
      }
    );
  }

  if (payload && typeof payload === "object" && "customer" in payload && payload.customer && typeof payload.customer === "object") {
    payload = { ...payload, customer: { ...payload.customer, email: user.email } };
  }
  const validation = validateOrderSubmission(payload);

  if (!validation.ok) {
    return NextResponse.json(
      {
        message: validation.message,
        field: validation.field
      },
      {
        status: 400
      }
    );
  }

  const { customer, items, token, locale } = validation.data;

  try {
    const supabase = createSupabaseAdminClient();
    const pricedItems = await getPricedOrderItems(items);
    const linkedCustomerId = await getLinkedCustomerId(token, user.email);
    const customerRecord = await findOrSaveCustomer(customer, linkedCustomerId);
    const customerShippingDetails = await getCustomerShippingDetails(customerRecord.id);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customerRecord.id,
        mobile_user_id: user.id,
        customer_email: customer.email,
        country: customer.country,
        whatsapp: customer.whatsapp ?? null,
        note: customer.note ?? null,
        ...customerShippingDetails,
        status: "new"
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return orderWriteError("Failed to create order.", orderError);
    }

    const orderItems = pricedItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      sku: item.sku,
      size: item.size ?? null,
      color: item.color ?? null,
      quantity: item.quantity,
      unit: item.unit ?? null,
      unit_price: item.unitPrice
    }));

    const { error: orderItemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      await supabase.from("orders").delete().eq("id", order.id);

      return orderWriteError("Failed to create order items.", orderItemsError);
    }

    const imageSaveWarning = await saveInquiryImageUrls(
      order.id,
      customer.inquiryImageUrls
    );
    const localeSaveWarning = await saveOrderLocale(order.id, locale);
    const submittedAt = new Date().toISOString();
    const emailResult = await sendOrderNotificationEmails({
      orderId: order.id,
      customer,
      items: pricedItems,
      submittedAt,
      locale: locale ?? "en"
    });

    return NextResponse.json(
      {
        message: "Order submitted successfully.",
        orderId: order.id,
        warning: combineWarnings(
          emailResult.warning,
          imageSaveWarning,
          localeSaveWarning
        )
      },
      {
        status: 201
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unexpected error while submitting order."
      },
      {
        status: 500
      }
    );
  }
}

async function saveOrderLocale(orderId: string, locale: string | undefined) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({
      locale: locale ?? "en"
    })
    .eq("id", orderId);

  if (!error) {
    return undefined;
  }

  console.warn("Failed to save order locale", {
    orderId,
    error: error.message
  });

  if (error.code === "42703" || error.message.includes("schema cache")) {
    return "Order language was used for email, but not saved in the order table. Run supabase/order_locale.sql.";
  }

  return `Order language was used for email, but not saved in the order table: ${error.message}`;
}

async function saveInquiryImageUrls(orderId: string, imageUrls: string[] | undefined) {
  if (!imageUrls || imageUrls.length === 0) {
    return undefined;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({
      inquiry_image_url_1: imageUrls[0] ?? null,
      inquiry_image_url_2: imageUrls[1] ?? null,
      inquiry_image_url_3: imageUrls[2] ?? null
    })
    .eq("id", orderId);

  if (!error) {
    return undefined;
  }

  console.warn("Failed to save inquiry images on order", {
    orderId,
    error: error.message
  });

  if (error.code === "42703" || error.message.includes("schema cache")) {
    return "Inquiry images were uploaded and emailed, but not saved in the order table. Run supabase/order_inquiry_images.sql.";
  }

  return `Inquiry images were uploaded and emailed, but not saved in the order table: ${error.message}`;
}

function combineWarnings(...warnings: Array<string | undefined>) {
  const combined = warnings.filter(Boolean).join(" ");

  return combined || undefined;
}

async function findOrSaveCustomer(
  customer: OrderCustomerInput,
  linkedCustomerId?: string
) {
  const supabase = createSupabaseAdminClient();
  const name = customer.name ?? customer.email;

  if (linkedCustomerId) {
    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update({
        country: customer.country,
        whatsapp: customer.whatsapp ?? null,
        name,
        company: customer.company ?? null
      })
      .eq("id", linkedCustomerId)
      .select("id")
      .single();

    if (updateError || !updatedCustomer) {
      throw new Error(
        `Failed to update linked customer: ${updateError?.message ?? "No customer returned."}`
      );
    }

    return updatedCustomer;
  }

  const { data: existingCustomer, error: findError } = await supabase
    .from("customers")
    .select("id,name")
    .eq("email", customer.email)
    .maybeSingle();

  if (findError) {
    throw new Error(`Failed to look up customer: ${findError.message}`);
  }

  if (existingCustomer) {
    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update({
        country: customer.country,
        whatsapp: customer.whatsapp ?? null,
        name,
        company: customer.company ?? null
      })
      .eq("id", existingCustomer.id)
      .select("id")
      .single();

    if (updateError || !updatedCustomer) {
      throw new Error(
        `Failed to update customer: ${updateError?.message ?? "No customer returned."}`
      );
    }

    return updatedCustomer;
  }

  const { data: newCustomer, error: insertError } = await supabase
    .from("customers")
    .insert({
      email: customer.email,
      country: customer.country,
      whatsapp: customer.whatsapp ?? null,
      name,
      company: customer.company ?? null
    })
    .select("id")
    .single();

  if (insertError || !newCustomer) {
    throw new Error(
      `Failed to create customer: ${insertError?.message ?? "No customer returned."}`
    );
  }

  return newCustomer;
}

async function getLinkedCustomerId(token: string | undefined, email: string) {
  if (!token) {
    return undefined;
  }

  const orderLink = await getOrderLinkByToken(token);

  if ((orderLink.status === "valid" || orderLink.status === "expired") && orderLink.customer.email?.toLowerCase() === email.toLowerCase()) {
    return orderLink.customerId;
  }

  return undefined;
}

async function getPricedOrderItems(
  items: CartLineItem[]
): Promise<PricedOrderLineItem[]> {
  const supabase = createSupabaseAdminClient();
  const variantIds = Array.from(new Set(items.map((item) => item.variantId)));
  const { data: variants, error } = await supabase
    .from("product_variants")
    .select("id,product_id,sku,size,color,unit,price,stock_status,products(name,status,image_url,image_url_2,image_url_3)")
    .in("id", variantIds);
  if (error) throw new Error("Unable to verify product prices. Please try again.");
  return items.map((item) => {
    const variant = variants?.find(v => String(v.id) === item.variantId);
    const product = Array.isArray(variant?.products) ? variant.products[0] : variant?.products;
    if (!variant || !product || String(variant.product_id) !== item.productId || product.status !== "active" || variant.stock_status === "out_of_stock" || !Number.isSafeInteger(item.quantity) || item.quantity > 100000) {
      throw new Error("A selected product is unavailable. Please refresh your cart.");
    }
    const price = variant.price === null ? null : Number(variant.price);
    const unitPrice = price !== null && Number.isFinite(price) && price >= 0 ? price : null;
    return {
      ...item, productName: product.name, sku: variant.sku, size: variant.size ?? undefined,
      color: variant.color ?? undefined, unit: variant.unit,
      imageUrl: readVariantImageUrl(product), unitPrice,
      lineTotal: unitPrice === null ? null : unitPrice * item.quantity
    };
  });
}

function readVariantImageUrl(products: unknown) {
  const product = Array.isArray(products) ? products[0] : products;

  if (
    typeof product === "object" &&
    product !== null &&
    "image_url" in product &&
    typeof product.image_url === "string"
  ) {
    return product.image_url;
  }

  if (
    typeof product === "object" &&
    product !== null &&
    "image_url_2" in product &&
    typeof product.image_url_2 === "string"
  ) {
    return product.image_url_2;
  }

  if (
    typeof product === "object" &&
    product !== null &&
    "image_url_3" in product &&
    typeof product.image_url_3 === "string"
  ) {
    return product.image_url_3;
  }

  return undefined;
}

function orderWriteError(message: string, error: { message?: string } | null) {
  return NextResponse.json(
    {
      message,
      detail: error?.message
    },
    {
      status: 500
    }
  );
}
