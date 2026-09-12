import {
  mobileUser,
  mobileFailure,
  mobileJson,
  mobileBody,
  MobileError,
} from "@/lib/mobileApi";
export async function POST(request: Request) {
  try {
    const { db, user } = await mobileUser(request);
    const body = await mobileBody(request);
    if (typeof body.id !== "string" || typeof body.version !== "string")
      throw new MobileError(400, "INVALID_INPUT");
    const { data, error } = await db
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", body.id)
      .eq("mobile_user_id", user.id)
      .eq("status", "quoted")
      .eq("quote_updated_at", body.version)
      .not("shipping_fee", "is", null)
      .not("grand_total", "is", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new MobileError(409, "QUOTE_CHANGED");
    return mobileJson({ ok: true });
  } catch (e) {
    return mobileFailure(e);
  }
}
