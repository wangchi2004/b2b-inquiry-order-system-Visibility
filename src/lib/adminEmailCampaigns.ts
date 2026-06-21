import {
  getCampaignSendEligibility,
  type CampaignProduct,
  type CampaignTemplate
} from "@/lib/emailCampaign";
import { createSupabaseAdminClient } from "@/lib/supabase";

export type AdminCampaignTemplate = CampaignTemplate & {
  created_at: string;
  updated_at: string;
  products: CampaignProduct[];
};

export type AdminCampaignSendLog = {
  id: string;
  customer_id: string | null;
  template_id: string | null;
  recipient_email: string;
  country: string | null;
  template_name: string;
  subject_snapshot: string;
  html_snapshot: string;
  text_snapshot: string;
  status: "sending" | "success" | "failed";
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  updated_at: string;
};

type TemplateJoinRow = CampaignTemplate & {
  created_at: string;
  updated_at: string;
  email_template_products?: Array<{
    sort_order: number;
    products: CampaignProduct | CampaignProduct[] | null;
  }> | null;
};

export async function getAdminCampaignTemplates() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select(
      `
        id,
        name,
        country_matches,
        locale,
        subject,
        greeting,
        body,
        website_button_label,
        closing,
        signature,
        is_default,
        status,
        created_at,
        updated_at,
        email_template_products(
          sort_order,
          products(id,name,image_url)
        )
      `
    )
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as TemplateJoinRow[]).map((template) => ({
    id: template.id,
    name: template.name,
    country_matches: template.country_matches ?? [],
    locale: template.locale,
    subject: template.subject,
    greeting: template.greeting,
    body: template.body,
    website_button_label: template.website_button_label,
    closing: template.closing,
    signature: template.signature,
    is_default: template.is_default,
    status: template.status,
    created_at: template.created_at,
    updated_at: template.updated_at,
    products: (template.email_template_products ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((row) => {
        if (Array.isArray(row.products)) {
          return row.products;
        }

        return row.products ? [row.products] : [];
      })
  })) as AdminCampaignTemplate[];
}

export async function getAdminCampaignProducts() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,image_url")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CampaignProduct[];
}

export async function getAdminCampaignSendLogs(limit = 100) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_send_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminCampaignSendLog[];
}

export async function getLastSuccessfulCampaignSend(email: string | null) {
  const normalizedEmail = email?.trim().toLocaleLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_send_logs")
    .select("sent_at")
    .eq("status", "success")
    .ilike("recipient_email", normalizedEmail)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.sent_at ?? null;
}

export async function getCampaignEligibilityForCustomer(customer: {
  email: string | null;
  email_valid: boolean | null;
  unsubscribed: boolean | null;
  status: string | null;
}) {
  const lastSuccessfulSendAt = await getLastSuccessfulCampaignSend(customer.email);

  return getCampaignSendEligibility({
    email: customer.email,
    emailValid: customer.email_valid,
    unsubscribed: customer.unsubscribed,
    status: customer.status,
    lastSuccessfulSendAt
  });
}

export function isMissingEmailCampaignSchema(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("email_templates") ||
    message.includes("email_template_products") ||
    message.includes("email_send_logs") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}
