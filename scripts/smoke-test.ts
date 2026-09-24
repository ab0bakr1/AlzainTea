/**
 * scripts/smoke-test.ts
 *
 * اختبار دخان (Smoke Test) عبر HTTP ضد بيئة منشورة. لا يحتاج أي مكتبة إضافية (Node 18+).
 *
 * الاستخدام:
 *   npx tsx scripts/smoke-test.ts --url=https://staging.example.com --staging
 *   npx tsx scripts/smoke-test.ts --url=https://www.example.com
 *
 * الخيارات:
 *   --url=<origin>            رابط البيئة (أو المتغير SMOKE_BASE_URL)
 *   --staging                 يتوقع أن الموقع غير قابل للفهرسة (noindex). بدونه يتوقع الإنتاج ويفشل إن وجد noindex
 *   --bypass=<secret>         سر Vercel Protection Bypass إن كان staging محمياً
 *   --with-cron               يستدعي /api/cron/expire-orders بالسر الصحيح (السر من --cron-secret أو CRON_SECRET)
 *   --cron-secret=<secret>    سر الـ Cron
 *   --with-ratelimit          يرسل 14 طلباً غير صالح لـ /api/auth/register للتأكد من عمل Rate Limiting
 *                             (سيحظر IP الخاص بك على هذا المسار لمدة دقيقة تقريباً)
 *
 * رمز الخروج: 1 عند وجود أي فشل (FAIL)، والتحذيرات (WARN) لا تُفشل التشغيل.
 */

type Status = "pass" | "fail" | "warn";
interface Result {
  name: string;
  status: Status;
  detail?: string;
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}
const hasFlag = (name: string) => process.argv.slice(2).includes(`--${name}`);

const BASE = (getArg("url") ?? process.env.SMOKE_BASE_URL ?? "").replace(/\/+$/, "");
const IS_STAGING = hasFlag("staging");
const BYPASS = getArg("bypass");
const CRON_SECRET = getArg("cron-secret") ?? process.env.CRON_SECRET;

if (!BASE || !/^https?:\/\//.test(BASE)) {
  console.error("الاستخدام: --url=https://your-site.com [--staging] [--bypass=..] [--with-cron] [--with-ratelimit]");
  process.exit(2);
}

const results: Result[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (BYPASS) headers.set("x-vercel-protection-bypass", BYPASS);
  return fetch(`${BASE}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(20_000),
  });
}

function expectStatus(res: Response, allowed: number[]) {
  assert(allowed.includes(res.status), `الحالة ${res.status}، المتوقع أحد: ${allowed.join(" / ")}`);
}

async function run(
  name: string,
  fn: () => Promise<string | void>,
  severity: "fail" | "warn" = "fail",
) {
  try {
    const detail = await fn();
    results.push({ name, status: "pass", detail: detail || undefined });
  } catch (error) {
    results.push({
      name,
      status: severity === "warn" ? "warn" : "fail",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

const jsonPost = (body: unknown = {}): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

async function main() {
  console.log(`\n🚬 Smoke test → ${BASE} (${IS_STAGING ? "staging" : "production"})\n`);

  // ── الصحة والقراءة العامة ────────────────────────────────────────────
  await run("GET /api/health", async () => {
    const res = await call("/api/health");
    expectStatus(res, [200]);
    const json = await res.json();
    assert(json?.data?.status === "ok", "status ليس ok");
    return `${json.data.latencyMs}ms`;
  });

  for (const path of ["/api/products?limit=1", "/api/categories", "/api/products/facets"]) {
    await run(`GET ${path}`, async () => {
      const res = await call(path);
      expectStatus(res, [200]);
      const json = await res.json();
      assert(json?.success === true, "success ليس true");
    });
  }

  await run("GET /api/shipping/calculate?country=SA (بلا خطأ 5xx)", async () => {
    const res = await call("/api/shipping/calculate?country=SA");
    assert(res.status < 500, `الحالة ${res.status}`);
    return `status ${res.status}`;
  });

  await run("منتج غير موجود → 404 دون تسريب تفاصيل داخلية", async () => {
    const res = await call("/api/products/__smoke-nonexistent-slug__");
    expectStatus(res, [404]);
    const text = await res.text();
    assert(!/prisma|stack|node_modules|at \w+ \(/i.test(text), "الرد يحتوي تفاصيل داخلية");
  });

  // ── الحماية ─────────────────────────────────────────────────────────
  for (const path of ["/api/admin/reports/overview", "/api/admin/orders", "/api/admin/products"]) {
    await run(`GET ${path} بلا جلسة → 401/403`, async () => {
      expectStatus(await call(path), [401, 403]);
    });
  }
  for (const path of ["/api/orders", "/api/wishlist", "/api/addresses"]) {
    await run(`GET ${path} بلا جلسة → 401/403`, async () => {
      expectStatus(await call(path), [401, 403]);
    });
  }
  await run("POST /api/reviews بلا جلسة → 400/401/403", async () => {
    expectStatus(await call("/api/reviews", jsonPost()), [400, 401, 403]);
  });

  // ── Webhooks: يجب رفض أي طلب غير موقّع ─────────────────────────────
  await run("POST /api/webhooks/stripe بلا توقيع → رفض", async () => {
    expectStatus(await call("/api/webhooks/stripe", jsonPost()), [400, 401, 403]);
  });
  await run("POST /api/webhooks/local-gateway بلا توقيع → رفض", async () => {
    expectStatus(await call("/api/webhooks/local-gateway", jsonPost()), [400, 401, 403]);
  });

  // ── Cron ─────────────────────────────────────────────────────────────
  await run("GET /api/cron/expire-orders بلا سر → رفض", async () => {
    expectStatus(await call("/api/cron/expire-orders"), [401, 403]);
  });
  await run("GET /api/cron/expire-orders بسر خاطئ → رفض", async () => {
    const res = await call("/api/cron/expire-orders", {
      headers: { authorization: "Bearer wrong-secret-for-smoke-test" },
    });
    expectStatus(res, [401, 403]);
  });
  if (hasFlag("with-cron")) {
    await run("GET /api/cron/expire-orders بالسر الصحيح → 200", async () => {
      assert(CRON_SECRET, "مرّر --cron-secret أو عرّف CRON_SECRET");
      const res = await call("/api/cron/expire-orders", {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      expectStatus(res, [200]);
    });
  }

  // ── SEO والفهرسة ────────────────────────────────────────────────────
  let homeHtml = "";
  let homeHeaders = new Headers();
  await run("GET / → 200", async () => {
    const res = await call("/");
    expectStatus(res, [200]);
    homeHeaders = res.headers;
    homeHtml = await res.text();
  });

  await run(
    IS_STAGING ? "staging غير قابل للفهرسة (noindex)" : "الإنتاج قابل للفهرسة (لا noindex)",
    async () => {
      const header = (homeHeaders.get("x-robots-tag") ?? "").toLowerCase();
      const meta = /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(homeHtml);
      const noindex = header.includes("noindex") || meta;
      if (IS_STAGING) assert(noindex, "لا يوجد noindex — قد تُفهرس بيئة الاختبار!");
      else assert(!noindex, "يوجد noindex في الإنتاج — لن يظهر المتجر في Google!");
    },
  );

  await run("GET /sitemap.xml", async () => {
    const res = await call("/sitemap.xml");
    expectStatus(res, [200]);
    assert((await res.text()).includes("<urlset"), "ليس sitemap صالحاً");
  });

  if (!IS_STAGING) {
    await run("robots.txt يمنع /admin و /api", async () => {
      const res = await call("/robots.txt");
      expectStatus(res, [200]);
      const text = await res.text();
      assert(/disallow:\s*\/admin/i.test(text), "لا يمنع /admin");
      assert(/disallow:\s*\/api/i.test(text), "لا يمنع /api");
    });
  }

  // ── ترويسات الأمان (تحذيرات) ────────────────────────────────────────
  await run("X-Content-Type-Options: nosniff", async () => {
    assert(homeHeaders.get("x-content-type-options") === "nosniff", "غير موجودة");
  }, "warn");
  await run("حماية من الـ Clickjacking (X-Frame-Options أو frame-ancestors)", async () => {
    const csp = homeHeaders.get("content-security-policy") ?? "";
    assert(homeHeaders.get("x-frame-options") || /frame-ancestors/i.test(csp), "غير موجودة");
  }, "warn");
  if (BASE.startsWith("https://")) {
    await run("Strict-Transport-Security", async () => {
      assert(homeHeaders.get("strict-transport-security"), "غير موجودة");
    }, "warn");
  }

  // ── Rate Limiting (اختياري) ─────────────────────────────────────────
  if (hasFlag("with-ratelimit")) {
    await run("Rate limit على /api/auth/register → 429", async () => {
      let hit = false;
      for (let i = 0; i < 14; i++) {
        const res = await call("/api/auth/register", jsonPost());
        if (res.status === 429) {
          hit = true;
          break;
        }
      }
      assert(hit, "لم يظهر 429 بعد 14 طلباً — تحقق من إعدادات Upstash");
    });
  }

  // ── الملخص ──────────────────────────────────────────────────────────
  const icon: Record<Status, string> = { pass: "✅", fail: "❌", warn: "⚠️ " };
  for (const r of results) {
    console.log(`${icon[r.status]} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => r.status === "fail").length;
  const warned = results.filter((r) => r.status === "warn").length;
  const passed = results.filter((r) => r.status === "pass").length;
  console.log(`\nالنتيجة: ${passed} نجح، ${failed} فشل، ${warned} تحذير\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("خطأ غير متوقع:", error);
  process.exit(1);
});