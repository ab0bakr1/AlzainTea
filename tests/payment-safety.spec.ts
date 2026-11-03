import { test, expect } from "@playwright/test";

test.describe("Payment safety guardrails", () => {
  test("the browser is not configured to use production payment credentials", async () => {
    // Browser tests cannot inspect server-side secrets; this checks only public env flags.
    // Also verify PAYMENT_PROVIDER keys and server env manually before running checkout tests.
    expect(process.env.NODE_ENV).not.toBe("production");
  });

  test("checkout page loads without submitting a payment", async ({ page }) => {
    const checkoutPath = process.env.E2E_CHECKOUT_PATH ?? "/checkout";
    const response = await page.goto(checkoutPath);

    // A checkout page may redirect guests to login; both are acceptable.
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();

    // Deliberately do not click any Pay/Place order button.
    // Add payment-success/failure tests only with provider sandbox keys and a test DB.
  });
});
