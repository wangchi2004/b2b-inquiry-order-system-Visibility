import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase";

export type AdminTemplateCustomer = {
  id: string;
  name: string | null;
  email: string;
  country: string | null;
  company: string | null;
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
    .select("id,name,email,country,company")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminTemplateCustomer[];
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
