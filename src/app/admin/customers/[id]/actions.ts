"use server";

import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function saveCustomerProfile(formData: FormData) {
  const password = readString(formData.get("password"));
  const customerId = readString(formData.get("customer_id"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/email-template?message=Invalid+admin+password");
  }

  if (!customerId) {
    redirect(`/admin/email-template?password=${encodeURIComponent(access.password)}&message=Missing+customer`);
  }

  const email = readString(formData.get("email")).toLowerCase();
  const name = readString(formData.get("name")) || email;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(
      `/admin/customers/${encodeURIComponent(customerId)}?password=${encodeURIComponent(
        access.password
      )}&message=Valid+email+is+required`
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("customers")
    .update({
      email,
      name,
      country: readNullableString(formData.get("country")),
      phone: readNullableString(formData.get("phone")),
      whatsapp: readNullableString(formData.get("whatsapp")),
      company: readNullableString(formData.get("company")),
      shipping_recipient_name: readNullableString(
        formData.get("shipping_recipient_name")
      ),
      shipping_phone: readNullableString(formData.get("shipping_phone")),
      shipping_country: readNullableString(formData.get("shipping_country")),
      shipping_address: readNullableString(formData.get("shipping_address")),
      shipping_note: readNullableString(formData.get("shipping_note")),
      customer_note: readNullableString(formData.get("customer_note")),
      instagram: readNullableString(formData.get("instagram")),
      website: readNullableString(formData.get("website")),
      shop_name: readNullableString(formData.get("shop_name")),
      city: readNullableString(formData.get("city")),
      business_type: readNullableString(formData.get("business_type")),
      source: readNullableString(formData.get("source")),
      source_url: readNullableString(formData.get("source_url")),
      status: readNullableString(formData.get("status")) ?? "prospecting",
      stage: readNullableString(formData.get("stage")),
      score: readNullableNumber(formData.get("score")),
      owner: readNullableString(formData.get("owner")),
      last_contacted_at: readNullableString(formData.get("last_contacted_at")),
      email_valid: readBoolean(formData.get("email_valid")),
      unsubscribed: readBoolean(formData.get("unsubscribed"))
    })
    .eq("id", customerId);

  if (error) {
    redirect(
      `/admin/customers/${encodeURIComponent(customerId)}?password=${encodeURIComponent(
        access.password
      )}&message=${encodeURIComponent(error.message)}`
    );
  }

  redirect(
    `/admin/email-template?password=${encodeURIComponent(
      access.password
    )}&customer_id=${encodeURIComponent(customerId)}&message=Customer+saved`
  );
}

export async function deleteCustomerProfile(formData: FormData) {
  const password = readString(formData.get("password"));
  const customerId = readString(formData.get("customer_id"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/email-template?message=Invalid+admin+password");
  }

  if (!customerId) {
    redirect(`/admin/email-template?password=${encodeURIComponent(access.password)}&message=Missing+customer`);
  }

  const supabase = createSupabaseAdminClient();
  await supabase.from("order_links").delete().eq("customer_id", customerId);

  const { error } = await supabase.from("customers").delete().eq("id", customerId);

  if (error) {
    const message =
      error.code === "23503"
        ? "Customer has orders and cannot be deleted. Keep the customer record to protect order history."
        : `Customer delete failed: ${error.message}`;

    redirect(
      `/admin/email-template?password=${encodeURIComponent(
        access.password
      )}&message=${encodeURIComponent(message)}`
    );
  }

  redirect(
    `/admin/email-template?password=${encodeURIComponent(
      access.password
    )}&message=Customer+deleted`
  );
}

export async function markCustomerDoNotContact(formData: FormData) {
  const password = readString(formData.get("password"));
  const customerId = readString(formData.get("customer_id"));
  const email = readString(formData.get("email")).toLowerCase();
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/customers?message=Invalid+admin+password");
  }

  if (!customerId) {
    redirect(`/admin/customers?password=${encodeURIComponent(access.password)}&message=Missing+customer`);
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("customers")
    .update({
      status: "do_not_contact",
      unsubscribed: true
    })
    .eq("id", customerId);

  if (error) {
    redirect(
      `/admin/customers?password=${encodeURIComponent(
        access.password
      )}&message=${encodeURIComponent(`Do not contact failed: ${error.message}`)}`
    );
  }

  if (email) {
    await supabase.from("suppression_list").upsert(
      {
        email,
        reason: "manual_block"
      },
      {
        onConflict: "email"
      }
    );
  }

  redirect(
    `/admin/customers?password=${encodeURIComponent(
      access.password
    )}&message=Customer+marked+as+do+not+contact`
  );
}

export async function saveCustomerTags(formData: FormData) {
  const password = readString(formData.get("password"));
  const customerId = readString(formData.get("customer_id"));
  const tags = normalizeTags(readString(formData.get("tags")));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/customers?message=Invalid+admin+password");
  }

  if (!customerId) {
    redirect(`/admin/customers?password=${encodeURIComponent(access.password)}&message=Missing+customer`);
  }

  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("customer_tags")
    .delete()
    .eq("customer_id", customerId);

  if (deleteError) {
    redirect(
      `/admin/customers/${encodeURIComponent(customerId)}?password=${encodeURIComponent(
        access.password
      )}&message=${encodeURIComponent(`Tag save failed: ${deleteError.message}`)}`
    );
  }

  if (tags.length > 0) {
    const { error: insertError } = await supabase.from("customer_tags").insert(
      tags.map((tag) => ({
        customer_id: customerId,
        tag
      }))
    );

    if (insertError) {
      redirect(
        `/admin/customers/${encodeURIComponent(customerId)}?password=${encodeURIComponent(
          access.password
        )}&message=${encodeURIComponent(`Tag save failed: ${insertError.message}`)}`
      );
    }
  }

  redirect(
    `/admin/customers/${encodeURIComponent(customerId)}?password=${encodeURIComponent(
      access.password
    )}&message=Tags+saved`
  );
}

export async function importVisitorSessionsToCustomers(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/customers?message=Invalid+admin+password");
  }

  const supabase = createSupabaseAdminClient();
  const { data: visitors, error: visitorsError } = await supabase
    .from("visitor_sessions")
    .select("email,country,locale,first_seen_at,last_seen_at");

  if (visitorsError) {
    redirect(
      `/admin/customers?password=${encodeURIComponent(
        access.password
      )}&message=${encodeURIComponent(`Visitor import failed: ${visitorsError.message}`)}`
    );
  }

  const visitorRows = (visitors ?? [])
    .map((visitor) => ({
      email: readString(visitor.email).toLowerCase(),
      country: readNullableString(visitor.country),
      locale: readNullableString(visitor.locale),
      firstSeenAt: readNullableString(visitor.first_seen_at),
      lastSeenAt: readNullableString(visitor.last_seen_at)
    }))
    .filter((visitor) => visitor.email && visitor.email.includes("@"));

  if (visitorRows.length === 0) {
    redirect(
      `/admin/customers?password=${encodeURIComponent(
        access.password
      )}&message=No+visitor+emails+to+import`
    );
  }

  const { data: existingCustomers, error: customersError } = await supabase
    .from("customers")
    .select("email");

  if (customersError) {
    redirect(
      `/admin/customers?password=${encodeURIComponent(
        access.password
      )}&message=${encodeURIComponent(`Customer lookup failed: ${customersError.message}`)}`
    );
  }

  const existingEmails = new Set(
    (existingCustomers ?? [])
      .map((customer) => readString(customer.email).toLowerCase())
      .filter(Boolean)
  );
  const seenEmails = new Set<string>();
  const newCustomers = visitorRows.filter((visitor) => {
    if (existingEmails.has(visitor.email) || seenEmails.has(visitor.email)) {
      return false;
    }

    seenEmails.add(visitor.email);
    return true;
  });

  if (newCustomers.length > 0) {
    const { error: insertError } = await supabase.from("customers").insert(
      newCustomers.map((visitor) => ({
        email: visitor.email,
        name: visitor.email,
        country: visitor.country,
        source: "website_login",
        source_url: visitor.locale ? `locale:${visitor.locale}` : null,
        status: "prospecting",
        stage: "new",
        score: 0,
        email_valid: true,
        unsubscribed: false,
        customer_note: `Imported from login visitor records. First seen: ${
          visitor.firstSeenAt ?? "-"
        }. Last seen: ${visitor.lastSeenAt ?? "-"}.`
      }))
    );

    if (insertError) {
      redirect(
        `/admin/customers?password=${encodeURIComponent(
          access.password
        )}&message=${encodeURIComponent(`Visitor import failed: ${insertError.message}`)}`
      );
    }
  }

  const skipped = visitorRows.length - newCustomers.length;
  redirect(
    `/admin/customers?password=${encodeURIComponent(
      access.password
    )}&message=${encodeURIComponent(
      `Imported ${newCustomers.length} visitor emails. Existing skipped ${skipped}.`
    )}`
  );
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: FormDataEntryValue | null) {
  const text = readString(value);

  return text || null;
}

function readNullableNumber(value: FormDataEntryValue | null) {
  const text = readString(value);

  if (!text) {
    return null;
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function readBoolean(value: FormDataEntryValue | null) {
  return value === "on";
}

function normalizeTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,，]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 20);
}
