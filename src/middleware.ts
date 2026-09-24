import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  adminRateLimit,
  apiRateLimit,
  edgeAuthHourlyRateLimit,
  edgeAuthRateLimit,
  getClientIp,
  rateLimitHeaders,
  sensitiveWriteRateLimit,
  tooManyRequests,
  type Limiter,
} from "@/lib/rate-limit";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// مسارات المصادقة القابلة للتخمين وكلمات المرور
const AUTH_ABUSE_PATHS = new Set([
  "/api/auth/register",
  "/api/auth/callback/credentials",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

// عمليات كتابة حساسة (تخمين كوبونات، سبام مراجعات...)
const SENSITIVE_WRITE_PREFIXES = [
  "/api/coupons/",
  "/api/reviews",
  "/api/wishlist",
  "/api/addresses",
  "/api/orders/",
];

type Policy = { name: string; limiter: Limiter };

function resolvePolicies(pathname: string, method: string): Policy[] {
  // Webhooks و Cron مصدرها بوابات الدفع / Vercel — لا تُقيَّد (لها توقيع/سر خاص)
  if (pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/cron/")) return [];

  // checkout يطبّق checkoutRateLimit داخل الـ Route نفسه
  if (pathname === "/api/checkout/session") return [];

  if (method === "POST" && AUTH_ABUSE_PATHS.has(pathname)) {
    return [
      { name: "auth-min", limiter: edgeAuthRateLimit },
      { name: "auth-hour", limiter: edgeAuthHourlyRateLimit },
    ];
  }

  // NextAuth يستدعي session/csrf باستمرار — لا نقيّدها
  if (pathname.startsWith("/api/auth/")) return [];

  if (pathname.startsWith("/api/admin/")) {
    return [{ name: "admin", limiter: adminRateLimit }];
  }

  if (WRITE_METHODS.has(method) && SENSITIVE_WRITE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return [{ name: "sensitive", limiter: sensitiveWriteRateLimit }];
  }

  return [{ name: "api", limiter: apiRateLimit }];
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, error: { code, message, statusCode: status } },
    { status },
  );
}

function redirectToLogin(req: NextRequest) {
  const url = new URL("/login", req.url);
  url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const passHeaders: Record<string, string> = {};

  // ── 1) تحديد المعدل لمسارات الـ API ──
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(req.headers);
    for (const policy of resolvePolicies(pathname, req.method)) {
      const result = await policy.limiter.limit(`${policy.name}:${ip}`);
      if (!result.success) return tooManyRequests(result);
      if (Object.keys(passHeaders).length === 0) {
        Object.assign(passHeaders, rateLimitHeaders(result));
      }
    }
  }

  // ── 2) حماية الإدارة وبوابة العميل ──
  const isAdminApi = pathname.startsWith("/api/admin/");
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAccountPage = pathname === "/account" || pathname.startsWith("/account/");

  if (isAdminApi || isAdminPage || isAccountPage) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return isAdminApi
        ? jsonError(401, "UNAUTHORIZED", "يجب تسجيل الدخول أولاً")
        : redirectToLogin(req);
    }

    if (isAdminApi || isAdminPage) {
      const role = (token as { role?: string }).role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return isAdminApi
          ? jsonError(403, "FORBIDDEN", "غير مصرح لك بهذا الإجراء")
          : NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(passHeaders)) res.headers.set(k, v);
  return res;
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/account/:path*"],
};