import {
  mobileUser,
  mobileFailure,
  mobileJson,
  mobileBody,
  MobileError,
} from "@/lib/mobileApi";
export async function GET(request: Request) {
  try {
    const { db, user } = await mobileUser(request);
    const { data, error } = await db
      .from("orders")
      .select(
        "id,status,created_at,product_subtotal,shipping_fee,grand_total,quote_updated_at,tracking_number,shipping_carrier,order_items(product_id,variant_id,product_name,sku,size,color,quantity,unit,unit_price)",
      )
      .eq("mobile_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return mobileJson({ orders: data });
  } catch (e) {
    return mobileFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user, email } = await mobileUser(request);
    const body = await mobileBody(request);
    const key = request.headers.get("idempotency-key");
    if (
      !key ||
      !/^[a-zA-Z0-9-]{16,80}$/.test(key) ||
      !Array.isArray(body.items) ||
      !body.items.length ||
      body.items.length > 100
    )
      throw new MobileError(400, "INVALID_INPUT");
    const items = body.items.map((item: Record<string, unknown>) => {
      if (
        !item ||
        typeof item.variantId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(item.variantId) ||
        !Number.isSafeInteger(item.quantity) ||
        Number(item.quantity) < 1 ||
        Number(item.quantity) > 100000 ||
        typeof item.unitPrice !== "number" ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0
      )
        throw new MobileError(400, "INVALID_INPUT");
      return {
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });
    if (new Set(items.map((i) => i.variantId)).size !== items.length)
      throw new MobileError(400, "INVALID_INPUT");
    const { data, error } = await db.rpc("submit_mobile_order", {
      p_user: user.id,
      p_email: email,
      p_key: key,
      p_items: items,
      p_locale: "en",
    });
    if (error) {
      const code = [
        "PRICE_CHANGED",
        "PRODUCT_UNAVAILABLE",
        "PROFILE_REQUIRED",
        "KEY_REUSED",
      ].find((c) => error.message.includes(c));
      if (code) throw new MobileError(409, code);
      throw error;
    }
    return mobileJson({ orderId: data });
  } catch (e) {
    return mobileFailure(e);
  }
}
