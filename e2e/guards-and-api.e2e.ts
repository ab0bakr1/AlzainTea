import { expect, test } from "@playwright/test";

test.describe("API contract (الصيغة الموحدة)", () => {
  test("GET /api/products يرجع success + data", async ({ request }) => {
    const res = await request.get("/api/products?limit=5");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test("GET /api/products/facets و /api/categories يعملان", async ({ request }) => {
    for (const url of ["/api/products/facets", "/api/categories"]) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
      expect((await res.json()).success).toBe(true);
    }
  });

  for (const url of ["/api/coupons/validate", "/api/cart/validate", "/api/checkout/session"]) {
    test(`POST ${url} بجسم فارغ يرجع 400 بصيغة خطأ موحدة`, async ({ request }) => {
      const res = await request.post(url, { data: {} });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBeTruthy();
      expect(body.error.statusCode).toBe(400);
    });
  }

  test("JSON تالف لا يسبب 500 ولا يسرّب تفاصيل داخلية", async ({ request }) => {
    const res = await request.post("/api/coupons/validate", {
      headers: { "Content-Type": "application/json" },
      data: "{not-json",
    });
    const text = await res.text();
    expect(res.status()).toBeLessThan(500);
    expect(text).not.toMatch(/prisma|stack|node_modules|SyntaxError/i);
  });
});

test.describe("حماية المسارات (Auth Guards)", () => {
  const protectedGets = [
    "/api/orders",
    "/api/wishlist",
    "/api/addresses",
    "/api/admin/products",
    "/api/admin/orders",
    "/api/admin/reviews",
    "/api/admin/reports/overview",
    "/api/admin/reports/low-stock",
  ];

  for (const url of protectedGets) {
    test(`GET ${url} بدون جلسة → 401/403`, async ({ request }) => {
      const res = await request.get(url);
      expect([401, 403]).toContain(res.status());
      expect((await res.json()).success).toBe(false);
    });
  }

  test("POST /api/reviews بدون جلسة → 401/403", async ({ request }) => {
    const res = await request.post("/api/reviews", {
      data: { productId: "x", rating: 5 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("/admin بدون جلسة يحوّل لصفحة الدخول", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/account/orders بدون جلسة يحوّل لصفحة الدخول", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Cron و Webhooks", () => {
  test("Cron بدون سر صحيح مرفوض", async ({ request }) => {
    const none = await request.get("/api/cron/expire-orders");
    expect([401, 403]).toContain(none.status());

    const wrong = await request.get("/api/cron/expire-orders", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect([401, 403]).toContain(wrong.status());
  });

  for (const url of ["/api/webhooks/stripe", "/api/webhooks/local-gateway"]) {
    test(`Webhook غير موقّع مرفوض: ${url}`, async ({ request }) => {
      const res = await request.post(url, { data: { type: "test", id: "evt_fake" } });
      expect([400, 401, 403]).toContain(res.status());
    });
  }
});