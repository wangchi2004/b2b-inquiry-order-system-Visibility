"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin";
import {
  getAdminCampaignTemplates,
  getCampaignEligibilityForCustomer
} from "@/lib/adminEmailCampaigns";
import { renderCampaignEmail } from "@/lib/emailCampaign";
import { createEmailClient } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function saveEmailCampaignTemplate(formData: FormData) {
  const access = requireAdmin(formData);
  const templateId = readString(formData.get("template_id"));
  const productIds = Array.from(
    new Set(
      formData
        .getAll("product_ids")
        .map(readString)
        .filter(Boolean)
    )
  );

  if (productIds.length < 1 || productIds.length > 6) {
    redirectToEmailPage(
      access.password,
      "templates",
      "Select between 1 and 6 featured products.",
      { template_id: templateId }
    );
  }

  const payload = {
    name: readString(formData.get("name")),
    country_matches: parseCountryAliases(
      readString(formData.get("country_matches"))
    ),
    locale: readString(formData.get("locale")) || "en",
    subject: readString(formData.get("subject")),
    greeting: readString(formData.get("greeting")),
    body: readString(formData.get("body")),
    website_button_label:
      readString(formData.get("website_button_label")) || "Visit Website",
    closing: readString(formData.get("closing")) || "Best regards",
    signature: readString(formData.get("signature")) || "Wang Chi",
    is_default: formData.get("is_default") === "on",
    status: readString(formData.get("status")) === "inactive" ? "inactive" : "active"
  };

  if (!payload.name || !payload.subject || !payload.greeting || !payload.body) {
    redirectToEmailPage(
      access.password,
      "templates",
      "Template name, subject, greeting, and body are required.",
      { template_id: templateId }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: validProducts, error: productsError } = await supabase
    .from("products")
    .select("id")
    .eq("status", "active")
    .in("id", productIds);

  if (productsError || (validProducts ?? []).length !== productIds.length) {
    redirectToEmailPage(
      access.password,
      "templates",
      productsError?.message ?? "One or more selected products are unavailable.",
      { template_id: templateId }
    );
  }

  if (payload.is_default) {
    const defaultQuery = supabase
      .from("email_templates")
      .update({ is_default: false })
      .eq("is_default", true);

    if (templateId) {
      defaultQuery.neq("id", templateId);
    }

    const { error: defaultError } = await defaultQuery;

    if (defaultError) {
      redirectToEmailPage(access.password, "templates", defaultError.message, {
        template_id: templateId
      });
    }
  }

  const templateResult = templateId
    ? await supabase
        .from("email_templates")
        .update(payload)
        .eq("id", templateId)
        .select("id")
        .single()
    : await supabase.from("email_templates").insert(payload).select("id").single();

  if (templateResult.error || !templateResult.data?.id) {
    redirectToEmailPage(
      access.password,
      "templates",
      templateResult.error?.message ?? "Template could not be saved.",
      { template_id: templateId }
    );
  }

  const savedTemplateId = templateResult.data.id;
  const { error: deleteProductsError } = await supabase
    .from("email_template_products")
    .delete()
    .eq("template_id", savedTemplateId);

  if (deleteProductsError) {
    redirectToEmailPage(
      access.password,
      "templates",
      deleteProductsError.message,
      { template_id: savedTemplateId }
    );
  }

  const { error: insertProductsError } = await supabase
    .from("email_template_products")
    .insert(
      productIds.map((productId, index) => ({
        template_id: savedTemplateId,
        product_id: productId,
        sort_order: index
      }))
    );

  if (insertProductsError) {
    redirectToEmailPage(
      access.password,
      "templates",
      insertProductsError.message,
      { template_id: savedTemplateId }
    );
  }

  revalidatePath("/admin/email-template");
  redirectToEmailPage(access.password, "templates", "Template saved.", {
    template_id: savedTemplateId
  });
}

export async function deactivateEmailCampaignTemplate(formData: FormData) {
  const access = requireAdmin(formData);
  const templateId = readString(formData.get("template_id"));

  if (!templateId) {
    redirectToEmailPage(access.password, "templates", "Template ID is required.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("email_templates")
    .update({ status: "inactive", is_default: false })
    .eq("id", templateId);

  if (error) {
    redirectToEmailPage(access.password, "templates", error.message, {
      template_id: templateId
    });
  }

  revalidatePath("/admin/email-template");
  redirectToEmailPage(access.password, "templates", "Template deactivated.");
}

export async function sendEmailCampaign(formData: FormData) {
  const access = requireAdmin(formData);
  const customerId = readString(formData.get("customer_id"));
  const templateId = readString(formData.get("template_id"));

  if (!customerId || !templateId) {
    redirectToEmailPage(
      access.password,
      "send",
      "Customer and template are required.",
      { customer_id: customerId, template_id: templateId }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id,name,email,country,status,email_valid,unsubscribed")
    .eq("id", customerId)
    .single();

  if (customerError || !customer) {
    redirectToEmailPage(
      access.password,
      "send",
      customerError?.message ?? "Customer was not found.",
      { customer_id: customerId, template_id: templateId }
    );
  }

  const templates = await getAdminCampaignTemplates();
  const template = templates.find(
    (candidate) => candidate.id === templateId && candidate.status === "active"
  );

  if (!template) {
    redirectToEmailPage(
      access.password,
      "send",
      "The selected template is not active.",
      { customer_id: customerId }
    );
  }

  const eligibility = await getCampaignEligibilityForCustomer(customer);

  if (!eligibility.allowed) {
    redirectToEmailPage(
      access.password,
      "send",
      eligibility.reason ?? "Email cannot be sent.",
      { customer_id: customerId, template_id: templateId }
    );
  }

  const websiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.wangchi2004.com";
  const rendered = renderCampaignEmail({
    template,
    customerName: customer.name,
    websiteUrl,
    products: template.products
  });
  const recipientEmail = customer.email.trim().toLocaleLowerCase();
  const { data: logId, error: reservationError } = await supabase.rpc(
    "reserve_email_campaign_send",
    {
      p_customer_id: customer.id,
      p_template_id: template.id,
      p_recipient_email: recipientEmail,
      p_country: customer.country ?? "",
      p_template_name: template.name,
      p_subject_snapshot: rendered.subject,
      p_html_snapshot: rendered.html,
      p_text_snapshot: rendered.text
    }
  );

  if (reservationError || !logId) {
    const message = reservationError?.message.includes("EMAIL_COOLDOWN_ACTIVE")
      ? "This customer was emailed recently or another send is already in progress."
      : reservationError?.message ?? "Email send could not be reserved.";

    redirectToEmailPage(access.password, "send", message, {
      customer_id: customerId,
      template_id: templateId
    });
  }

  let providerMessageId: string | null = null;
  let sendError: string | null = null;

  try {
    const resend = createEmailClient();
    const result = await resend.emails.send({
      from:
        process.env.ORDER_EMAIL_FROM ??
        "B2B Inquiry Order <chi@chinashoerepairmaterials.com>",
      to: recipientEmail,
      ...(process.env.ADMIN_ORDER_EMAIL
        ? { replyTo: process.env.ADMIN_ORDER_EMAIL }
        : {}),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });

    if (result.error) {
      sendError = result.error.message;
    } else {
      providerMessageId = result.data?.id ?? null;
    }
  } catch (error) {
    sendError = error instanceof Error ? error.message : "Email send failed.";
  }

  const now = new Date().toISOString();
  const { error: logUpdateError } = await supabase
    .from("email_send_logs")
    .update(
      sendError
        ? {
            status: "failed",
            error_message: sendError,
            provider_message_id: providerMessageId
          }
        : {
            status: "success",
            error_message: null,
            provider_message_id: providerMessageId,
            sent_at: now
          }
    )
    .eq("id", logId);

  if (!sendError) {
    await supabase
      .from("customers")
      .update({ last_contacted_at: now })
      .eq("id", customerId);
  }

  revalidatePath("/admin/email-template");
  const message = sendError
    ? `Email failed: ${sendError}`
    : logUpdateError
      ? `Email sent, but log update failed: ${logUpdateError.message}`
      : "Email sent successfully.";

  redirectToEmailPage(access.password, "history", message, {
    customer_id: customerId,
    template_id: templateId
  });
}

function requireAdmin(formData: FormData) {
  const access = checkAdminAccess(readString(formData.get("password")));

  if (!access.ok) {
    redirect("/admin/email-template?message=Invalid+admin+password");
  }

  return access;
}

function parseCountryAliases(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((alias) => alias.trim())
        .filter(Boolean)
    )
  );
}

function redirectToEmailPage(
  password: string,
  tab: "send" | "templates" | "history",
  message: string,
  params: Record<string, string> = {}
): never {
  const query = new URLSearchParams({ password, tab, message });

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  redirect(`/admin/email-template?${query.toString()}`);
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
