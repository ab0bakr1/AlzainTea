import { expect, test } from "@playwright/test";

async function firstProductSlug(request: import("@playwright/test").APIRequestContext) {
  const res = await request.get("/api/products?limit=1");
  const body = await res.json();
  const list = Array.isArray(body.data) ? body.data : (body.data?.items ?? []);
  return (list[0]?.slug as string | undefined) ?? null;
}

test.describe("ترويسات الأمان", () => {
  test("الصفحة الرئيسية تحمل الترويسات المطلوبة", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["strict-transport-security"]).toContain("max-age");
    expect(h["content-security-policy"] ?? h["content-security-policy-report-only"]).toBeTruthy();
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("Rate limiting", () => {
  // يحتاج Upstash مضبوطاً: E2E_RATE_LIMIT=1 npm run test:e2e
  test.skip(!process.env.E2E_RATE_LIMIT, "فعّل E2E_RATE_LIMIT=1 مع Upstash مضبوط");

  test("تسجيل الحسابات يُحجب بعد تجاوز الحد (429)", async ({ request }) => {
    // IP عشوائي حتى لا يتأثر باقي الاختبارات
    const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.7`;
    const statuses: number[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await request.post("/api/auth/register", {
        headers: { "x-forwarded-for": ip },
        data: {},
      });
      statuses.push(res.status());
    }
    expect(statuses).toContain(429);
  });
});

test.describe("SEO", () => {
  test("robots.txt يحجب المسارات الخاصة ويشير للـ sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("Disallow: /admin");
    expect(text).toContain("Disallow: /api/");
    expect(text).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test("sitemap.xml صالح ويحتوي رابط منتج", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<urlset");

    const slug = await firstProductSlug(request);
    test.skip(!slug, "لا توجد منتجات في قاعدة البيانات");
    expect(xml).toContain(`/products/${slug}`);
  });

  test("صفحة المنتج: title + canonical + JSON-LD (Product و BreadcrumbList)", async ({ page, request }) => {
    const slug = await firstProductSlug(request);
    test.skip(!slug, "لا توجد منتجات في قاعدة البيانات");

    await page.goto(`/products/${slug}`);
    await expect(page).toHaveTitle(/.+/);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toMatch(new RegExp(`/products/${slug}$`));

    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = scripts.flatMap((s) => {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [parsed];
    });

    const product = nodes.find((n) => n["@type"] === "Product");
    expect(product, "Product JSON-LD مفقود").toBeTruthy();
    expect(product.name).toBeTruthy();
    expect(product.offers.priceCurrency).toBe("USD");
    expect(Number(product.offers.price)).toBeGreaterThan(0);
    expect(product.offers.availability).toMatch(/schema\.org\/(InStock|OutOfStock)/);

    expect(nodes.some((n) => n["@type"] === "BreadcrumbList")).toBe(true);
  });
});