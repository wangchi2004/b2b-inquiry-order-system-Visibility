import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase";

export type AdminTemplateCustomer = {
  id: string;
  name: string | null;
  email: string;
  country: string | null;
  phone: string | null;
  whatsapp: string | null;
  company: string | null;
  shipping_recipient_name: string | null;
  shipping_phone: string | null;
  shipping_country: string | null;
  shipping_address: string | null;
  shipping_note: string | null;
  customer_note: string | null;
  instagram: string | null;
  website: string | null;
  shop_name: string | null;
  city: string | null;
  business_type: string | null;
  source: string | null;
  source_url: string | null;
  status: string | null;
  stage: string | null;
  score: number | null;
  owner: string | null;
  last_contacted_at: string | null;
  email_valid: boolean | null;
  unsubscribed: boolean | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type CustomerRowWithTags = Omit<AdminTemplateCustomer, "tags"> & {
  customer_tags?: Array<{ tag: string }> | null;
};

export type CustomerOrderLink = {
  token: string;
  status: string;
  expires_at: string | null;
};

export async function getTemplateCustomers() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      `
        id,
        name,
        email,
        country,
        phone,
        whatsapp,
        company,
        shipping_recipient_name,
        shipping_phone,
        shipping_country,
        shipping_address,
        shipping_note,
        customer_note,
        instagram,
        website,
        shop_name,
        city,
        business_type,
        source,
        source_url,
        status,
        stage,
        score,
        owner,
        last_contacted_at,
        email_valid,
        unsubscribed,
        customer_tags(tag),
        created_at,
        updated_at
      `
    )
    .order("created_at", {
      ascending: false
    });

  if (error) {
    if (isMissingCustomerProfileColumn(error)) {
      return getTemplateCustomersFallback();
    }

    throw new Error(error.message);
  }

  return ((data ?? []) as CustomerRowWithTags[]).map((customer) => ({
    ...customer,
    tags: (customer.customer_tags ?? [])
      .map((tagRow) => tagRow.tag)
      .filter(Boolean)
  }));
}

async function getTemplateCustomersFallback() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id,name,email,country,whatsapp,company,created_at,updated_at")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((customer) => ({
    ...customer,
    phone: null,
    shipping_recipient_name: null,
    shipping_phone: null,
    shipping_country: null,
    shipping_address: null,
    shipping_note: null,
    customer_note: null,
    instagram: null,
    website: null,
    shop_name: null,
    city: null,
    business_type: null,
    source: null,
    source_url: null,
    status: null,
    stage: null,
    score: null,
    owner: null,
    last_contacted_at: null,
    email_valid: null,
    unsubscribed: null,
    tags: []
  })) as AdminTemplateCustomer[];
}

function isMissingCustomerProfileColumn(error: { message?: string; code?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST200" ||
    Boolean(error.message?.includes("schema cache")) ||
    Boolean(error.message?.includes("column")) ||
    Boolean(error.message?.includes("customer_tags"))
  );
}

export async function ensureCustomerOrderLink(customerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: existingLinks, error: selectError } = await supabase
    .from("order_links")
    .select("token,status,expires_at,created_at")
    .eq("customer_id", customerId)
    .neq("status", "disabled")
    .order("created_at", {
      ascending: false
    })
    .limit(10);

  if (selectError) {
    throw new Error(selectError.message);
  }

  const existingLink = (existingLinks ?? []).find((link) => isUsableLink(link));

  if (existingLink) {
    return existingLink as CustomerOrderLink;
  }

  const token = createOrderToken();
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { data, error } = await supabase
    .from("order_links")
    .insert({
      customer_id: customerId,
      token,
      status: "active",
      expires_at: expiresAt.toISOString()
    })
    .select("token,status,expires_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CustomerOrderLink;
}

export async function getTemplateCustomerById(customerId: string) {
  const customers = await getTemplateCustomers();

  return customers.find((customer) => customer.id === customerId) ?? null;
}

function isUsableLink(link: {
  status: string | null;
  expires_at: string | null;
}) {
  if (link.status !== "active") {
    return false;
  }

  return !link.expires_at || new Date(link.expires_at).getTime() > Date.now();
}

function createOrderToken() {
  return `buyer-${crypto.randomBytes(18).toString("hex")}`;
}
