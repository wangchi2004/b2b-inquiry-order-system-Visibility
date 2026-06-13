import { createSupabaseAdminClient } from "@/lib/supabase";

export type CustomerShippingDetails = {
  shipping_recipient_name: string | null;
  shipping_phone: string | null;
  shipping_country: string | null;
  shipping_address: string | null;
  shipping_note: string | null;
};

const emptyShippingDetails: CustomerShippingDetails = {
  shipping_recipient_name: null,
  shipping_phone: null,
  shipping_country: null,
  shipping_address: null,
  shipping_note: null
};

export function hasCustomerShippingDetails(details: CustomerShippingDetails) {
  return Object.values(details).some((value) => Boolean(value));
}

export async function getCustomerShippingDetails(customerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      `
        shipping_recipient_name,
        shipping_phone,
        shipping_country,
        shipping_address,
        shipping_note
      `
    )
    .eq("id", customerId)
    .maybeSingle<CustomerShippingDetails>();

  if (!error) {
    return data ?? emptyShippingDetails;
  }

  console.warn("Failed to load customer shipping defaults", {
    customerId,
    error: error.message
  });

  return emptyShippingDetails;
}

export async function saveCustomerShippingDetails(
  customerId: string | null | undefined,
  details: CustomerShippingDetails
) {
  if (!customerId || !hasCustomerShippingDetails(details)) {
    return undefined;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("customers")
    .update(details)
    .eq("id", customerId);

  if (!error) {
    return undefined;
  }

  console.warn("Failed to save customer shipping defaults", {
    customerId,
    error: error.message
  });

  if (error.code === "42703" || error.message.includes("schema cache")) {
    return "Customer default shipping address was not saved. Run supabase/customer_shipping_fields.sql.";
  }

  return `Customer default shipping address was not saved: ${error.message}`;
}

