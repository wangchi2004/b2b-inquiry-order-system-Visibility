"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function deleteOrder(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/orders");
  }

  const orderId = readString(formData.get("order_id"));

  if (!orderId) {
    redirect(adminOrdersPath(password, "Order ID is required."));
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("orders").delete().eq("id", orderId);

  if (error) {
    redirect(adminOrdersPath(password, error.message));
  }

  revalidatePath("/admin/orders");
  redirect(adminOrdersPath(password, "Order deleted."));
}

function adminOrdersPath(password: string, message?: string) {
  const params = new URLSearchParams({
    password
  });

  if (message) {
    params.set("message", message);
  }

  return `/admin/orders?${params.toString()}`;
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
