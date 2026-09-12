import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/i18n/routing";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always"
});

function isLocalePath(pathname: string) {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export default function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  if (pathname.startsWith("/api/mobile/")) {
    const origin = request.headers.get("origin");
    const allowedOrigins = new Set([
      "https://www.wangchi2004.com",
      "http://localhost:8087",
      "http://127.0.0.1:8087",
      ...(process.env.MOBILE_WEB_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean),
    ]);
    const response = request.method === "OPTIONS"
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();
    if (origin && allowedOrigins.has(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
      response.headers.set("Vary", "Origin");
    }
    return response;
  }
  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();
  const allowKey = process.env.ADMIN_ACCESS_KEY;
  const hasAllowBypass =
    Boolean(allowKey) && nextUrl.searchParams.get("allow") === allowKey;

  if (
    country === "CN" &&
    !isLocalhost(nextUrl.hostname) &&
    !pathname.startsWith("/admin") &&
    !hasAllowBypass
  ) {
    return new NextResponse("Access denied.", {
      status: 403,
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }

  if (isLocalePath(pathname)) {
    return intlMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/mobile/:path*", "/((?!api|_next|.*\\..*).*)"]
};
