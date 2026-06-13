import { createSupabaseAdminClient } from "@/lib/supabase";

export type AdminOrderListItem = {
  id: string;
  customer_email: string;
  country: string | null;
  status: string;
  created_at: string;
};

export type AdminOrderDetail = AdminOrderListItem & {
  customer_id: string | null;
  whatsapp: string | null;
  note: string | null;
  locale: string | null;
  inquiry_image_url_1: string | null;
  inquiry_image_url_2: string | null;
  inquiry_image_url_3: string | null;
  updated_at: string;
  product_subtotal: number | null;
  shipping_fee: number | null;
  grand_total: number | null;
  paypal_fee: number | null;
  paypal_collection: number | null;
  paypal_fee_rate: number | null;
  shipping_recipient_name: string | null;
  shipping_phone: string | null;
  shipping_country: string | null;
  shipping_address: string | null;
  shipping_note: string | null;
  quote_updated_at: string | null;
  customers: {
    name: string | null;
    email: string;
    company: string | null;
    whatsapp: string | null;
    country: string | null;
  } | null;
  order_items: AdminOrderItem[];
};

export type AdminOrderItem = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unit: string | null;
  product_variants: {
    price: number | null;
  } | null;
  products: {
    image_url: string | null;
    image_url_2: string | null;
    image_url_3: string | null;
  } | null;
};

type AdminOrderDetailRow = Omit<AdminOrderDetail, "customers"> & {
  customers: AdminOrderDetail["customers"] | AdminOrderDetail["customers"][];
  order_items: Array<Omit<AdminOrderItem, "product_variants" | "products"> & {
    product_variants: AdminOrderItem["product_variants"] | AdminOrderItem["product_variants"][];
    products: AdminOrderItem["products"] | AdminOrderItem["products"][];
  }>;
};

export async function getAdminOrders() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id,customer_email,country,status,created_at")
    .order("created_at", {
      ascending: false
    })
    .limit(100);

  if (error) {
    throw new Error(`Failed to load orders: ${error.message}`);
  }

  return (data ?? []) as AdminOrderListItem[];
}

export async function getAdminOrderById(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        customer_id,
        customer_email,
        country,
        whatsapp,
        note,
        locale,
        inquiry_image_url_1,
        inquiry_image_url_2,
        inquiry_image_url_3,
        status,
        product_subtotal,
        shipping_fee,
        grand_total,
        paypal_fee,
        paypal_collection,
        paypal_fee_rate,
        shipping_recipient_name,
        shipping_phone,
        shipping_country,
        shipping_address,
        shipping_note,
        quote_updated_at,
        created_at,
        updated_at,
        customers(name,email,company,whatsapp,country),
        order_items(
          id,
          product_id,
          variant_id,
          product_name,
          sku,
          size,
          color,
          quantity,
          unit,
          product_variants(price),
          products(image_url,image_url_2,image_url_3)
        )
      `
    )
    .eq("id", id)
    .single<AdminOrderDetailRow>();

  if (error?.code === "42703" || error?.message.includes("does not exist")) {
    return getAdminOrderByIdWithoutQuoteFields(id);
  }

  if (error) {
    throw new Error(`Failed to load order: ${error.message}`);
  }

  return normalizeAdminOrderDetail(data);
}

async function getAdminOrderByIdWithoutQuoteFields(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        customer_id,
        customer_email,
        country,
        whatsapp,
        note,
        status,
        created_at,
        updated_at,
        customers(name,email,company,whatsapp,country),
        order_items(
          id,
          product_id,
          variant_id,
          product_name,
          sku,
          size,
          color,
          quantity,
          unit,
          product_variants(price),
          products(image_url,image_url_2,image_url_3)
        )
      `
    )
    .eq("id", id)
    .single<AdminOrderDetailRow>();

  if (error) {
    throw new Error(`Failed to load order: ${error.message}`);
  }

  return normalizeAdminOrderDetail({
    ...data,
    locale: "en",
    inquiry_image_url_1: null,
    inquiry_image_url_2: null,
    inquiry_image_url_3: null,
    product_subtotal: null,
    shipping_fee: null,
    grand_total: null,
    paypal_fee: null,
    paypal_collection: null,
    paypal_fee_rate: 0.05,
    shipping_recipient_name: null,
    shipping_phone: null,
    shipping_country: null,
    shipping_address: null,
    shipping_note: null,
    quote_updated_at: null
  });
}

function normalizeAdminOrderDetail(data: AdminOrderDetailRow) {
  return {
    ...data,
    customers: Array.isArray(data.customers) ? data.customers[0] ?? null : data.customers,
    order_items: data.order_items.map((item) => ({
      ...item,
      product_variants: Array.isArray(item.product_variants)
        ? item.product_variants[0] ?? null
        : item.product_variants,
      products: Array.isArray(item.products) ? item.products[0] ?? null : item.products
    }))
  } satisfies AdminOrderDetail;
}
