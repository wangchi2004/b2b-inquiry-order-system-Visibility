"use server";

import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail
} from "@/lib/customerCreate";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function createCustomerProfile(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/customers/new?message=Invalid+admin+password");
  }

  const email = normalizeCustomerEmail(readString(formData.get("email")));

  if (!isValidCustomerEmail(email)) {
    redirect(
      `/admin/customers/new?password=${encodeURIComponent(
        access.password
      )}&message=Valid+email+is+required`
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: existingCustomer, error: lookupError } = await supabase
    .from("customers")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    redirectWithMessage(access.password, `Customer lookup failed: ${lookupError.message}`);
  }

  if (existingCustomer?.id) {
    redirectToCustomer(
      existingCustomer.id,
      access.password,
      "Email already exists. Existing customer opened."
    );
  }

  const { data: customer, error: insertError } = await supabase
    .from("customers")
    .insert({
      email,
      name: readString(formData.get("name")) || email,
      country: readNullableString(formData.get("country")),
      company: readNullableString(formData.get("company")),
      phone: readNullableString(formData.get("phone")),
      whatsapp: readNullableString(formData.get("whatsapp")),
      instagram: readNullableString(formData.get("instagram")),
      website: readNullableString(formData.get("website")),
      shop_name: readNullableString(formData.get("shop_name")),
      city: readNullableString(formData.get("city")),
      business_type: readNullableString(formData.get("business_type")),
      source: readNullableString(formData.get("source")) ?? "manual",
      source_url: readNullableString(formData.get("source_url")),
      status: readNullableString(formData.get("status")) ?? "prospecting",
      stage: readNullableString(formData.get("stage")) ?? "new",
      score: readNullableNumber(formData.get("score")) ?? 0,
      owner: readNullableString(formData.get("owner")),
      last_contacted_at: readNullableString(formData.get("last_contacted_at")),
      email_valid: readBoolean(formData.get("email_valid")),
      unsubscribed: readBoolean(formData.get("unsubscribed")),
      shipping_recipient_name: readNullableString(
        formData.get("shipping_recipient_name")
      ),
      shipping_phone: readNullableString(formData.get("shipping_phone")),
      shipping_country: readNullableString(formData.get("shipping_country")),
      shipping_address: readNullableString(formData.get("shipping_address")),
      shipping_note: readNullableString(formData.get("shipping_note")),
      customer_note: readNullableString(formData.get("customer_note"))
    })
    .select("id")
    .single();

  if (insertError || !customer?.id) {
    if (insertError?.code === "23505") {
      const { data: duplicate } = await supabase
        .from("customers")
        .select("id")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      if (duplicate?.id) {
        redirectToCustomer(
          duplicate.id,
          access.password,
          "Email already exists. Existing customer opened."
        );
      }
    }

    redirectWithMessage(
      access.password,
      `Customer creation failed: ${insertError?.message ?? "Missing customer ID"}`
    );
  }

  redirectToCustomer(customer.id, access.password, "Customer created");
}

function redirectToCustomer(id: string, password: string, message: string): never {
  redirect(
    `/admin/customers/${encodeURIComponent(id)}?password=${encodeURIComponent(
      password
    )}&message=${encodeURIComponent(message)}`
  );
}

function redirectWithMessage(password: string, message: string): never {
  redirect(
    `/admin/customers/new?password=${encodeURIComponent(
      password
    )}&message=${encodeURIComponent(message)}`
  );
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: FormDataEntryValue | null) {
  return readString(value) || null;
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
