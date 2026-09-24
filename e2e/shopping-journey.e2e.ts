import { expect, test, type Page } from "@playwright/test";

const ADD_TO_CART = /add to cart|أضف إلى السلة|أضف للسلة|إضافة إلى السلة|إضافة للسلة/i;
const GO_CHECKOUT = /checkout|إتمام الشراء|متابعة الدفع|الدفع/i;

function findFirstArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) {
      const found = findFirstArray(v);
      if (found) return found;
    }
  }
  return null;
}

async function guestCartItems(page: Page): Promise<unknown[]> {
  const raw = await page.evaluate(() => localStorage.getItem("alzain-cart-storage:guest"));
  if (!raw) return [];
  return findFirstArray(JSON.parse(raw)) ?? [];
}

test("زائر: تصفح ← منتج ← إضافة للسلة ← السلة ← Checkout", async ({ page }) => {
  await page.goto("/products");

  const firstProduct = page.locator('a[href^="/products/"]').first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.click();

  await page.waitForURL(/\/products\/[^/?#]+$/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  await page.getByRole("button", { name: ADD_TO_CART }).first().click();

  // السلة محفوظة محلياً بمفتاح الزائر
  await expect.poll(async () => (await guestCartItems(page)).length).toBeGreaterThan(0);

  await page.goto("/cart");
  await expect(page).toHaveURL(/\/cart/);

  const checkoutLink = page
    .getByRole("link", { name: GO_CHECKOUT })
    .or(page.getByRole("button", { name: GO_CHECKOUT }))
    .first();
  await expect(checkoutLink).toBeVisible();
  await checkoutLink.click();

  // الزائر مسموح له بالـ Checkout — لا تحويل لصفحة الدخول
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page).not.toHaveURL(/\/login/);
});

test("السلة الفارغة لا تنكسر", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.locator("body")).toBeVisible();
  expect(page.url()).toContain("/cart");
});