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
      .from("mobile_customer_profiles")
      .select("name,company,country,phone,address")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return mobileJson({ profile: data });
  } catch (e) {
    return mobileFailure(e);
  }
}
export async function PUT(request: Request) {
  try {
    const { db, user } = await mobileUser(request);
    const body = await mobileBody(request);
    const profile = Object.fromEntries(
      ["name", "company", "country", "phone", "address"].map((k) => [
        k,
        typeof body[k] === "string" ? body[k].trim() : "",
      ]),
    );
    if (
      !profile.name ||
      !profile.country ||
      !profile.address ||
      Object.values(profile).some((v) => v.length > 1000)
    )
      throw new MobileError(400, "INVALID_INPUT");
    const { error } = await db
      .from("mobile_customer_profiles")
      .upsert({ user_id: user.id, ...profile });
    if (error) throw error;
    return mobileJson({ profile });
  } catch (e) {
    return mobileFailure(e);
  }
}
