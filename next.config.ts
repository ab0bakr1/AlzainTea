import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const isProd = process.env.NODE_ENV === "production";

// CSP: يبدأ Report-Only لتراقب الـ Console بدون كسر شيء.
// بعد التأكد من خلوه من التحذيرات ضع CSP_ENFORCE="true".
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://js.stripe.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const cspHeaderName =
  process.env.CSP_ENFORCE === "true"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

const securityHeaders = [
  { key: cspHeaderName, value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      // أضف هنا أي نطاق صور آخر تستخدمه في بيانات المنتجات (seed / R2 ...)
      // { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons"],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // أصول ثابتة: كاش يوم + إعادة تحقق أسبوع
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // استجابات عامة غير مرتبطة بالمستخدم فقط (لا تضع هنا مراجعات/مفضلة/طلبات)
        source: "/api/products",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" }],
      },
      {
        source: "/api/products/facets",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" }],
      },
      {
        source: "/api/categories",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);