import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Window = Parameters<typeof Ratelimit.slidingWindow>[1];

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms
}

export interface Limiter {
  limit(key: string): Promise<RateLimitResult>;
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn("[rate-limit] متغيرات Upstash غير مضبوطة — تحديد المعدل معطّل!");
}

const PASS: RateLimitResult = { success: true, limit: 0, remaining: 0, reset: 0 };

function createLimiter(prefix: string, requests: number, window: Window): Limiter {
  // بدون Redis (بيئة التطوير) يمر كل شيء
  if (!redis) return { limit: async () => PASS };

  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `rl:${prefix}`,
  });

  return {
    async limit(key: string) {
      try {
        const { success, limit, remaining, reset } = await rl.limit(key);
        return { success, limit, remaining, reset };
      } catch (error) {
        // Fail-open: تعطل Redis لا يجب أن يوقف المتجر
        console.error(`[rate-limit:${prefix}] Redis error — fail-open`, error);
        return PASS;
      }
    },
  };
}

// ── محدِّدات على مستوى الـ Route Handler (موجودة مسبقاً) ──
export const authRateLimit = createLimiter("auth", 10, "1 m");
export const checkoutRateLimit = createLimiter("checkout", 5, "1 m");

// ── محدِّدات على مستوى الـ Middleware (بمفاتيح منفصلة لتفادي العد المزدوج) ──
export const edgeAuthRateLimit = createLimiter("edge-auth-min", 10, "1 m");
export const edgeAuthHourlyRateLimit = createLimiter("edge-auth-hour", 40, "1 h");
export const sensitiveWriteRateLimit = createLimiter("sensitive", 30, "1 m");
export const apiRateLimit = createLimiter("api", 120, "1 m");
export const adminRateLimit = createLimiter("admin", 300, "1 m");

// ── أدوات مساعدة ──
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  if (!r.limit) return {};
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.reset / 1000)),
  };
}

export function tooManyRequests(r: RateLimitResult): Response {
  const retryAfter = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
  return Response.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "عدد الطلبات كبير جداً، يرجى المحاولة بعد قليل",
        statusCode: 429,
      },
    },
    {
      status: 429,
      headers: { ...rateLimitHeaders(r), "Retry-After": String(retryAfter) },
    },
  );
}