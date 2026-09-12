import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export class MobileError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export async function mobileUser(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new MobileError(401, "LOGIN_REQUIRED");
  const db = createSupabaseAdminClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at)
    throw new MobileError(401, "LOGIN_REQUIRED");
  return { db, user: data.user, email: data.user.email.toLowerCase() };
}
export function mobileFailure(error: unknown) {
  if (error instanceof MobileError)
    return NextResponse.json({ code: error.code }, { status: error.status });
  console.error("Mobile API failure", error);
  return NextResponse.json({ code: "SERVICE_UNAVAILABLE" }, { status: 503 });
}
export function mobileJson(data: unknown) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function mobileBody(
  request: Request,
): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > 100000)
    throw new MobileError(413, "INVALID_INPUT");
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new MobileError(400, "INVALID_INPUT");
  }
}
