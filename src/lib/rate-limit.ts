// src/lib/rate-limit.ts
// Rate limiting مشترك عبر Upstash Redis
// يُستخدم إلزامياً على: api/auth/*, api/checkout/*, api/orders (POST)

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 10 محاولات/دقيقة لكل IP على مسارات المصادقة (login, register, forgot-password)
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:auth",
});

// 5 طلبات دفع/دقيقة لكل مستخدم
export const checkoutRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "ratelimit:checkout",
});

/**
 * يستخرج عنوان IP الحقيقي للعميل من رؤوس الطلب (يدعم النشر خلف Vercel/Proxy)
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}