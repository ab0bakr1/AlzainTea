import { test, expect } from "@playwright/test";

const loginPath = process.env.E2E_LOGIN_PATH ?? "/login";
const adminPath = process.env.E2E_ADMIN_PATH ?? "/admin";

test.describe("Authentication and access control", () => {
  test("login page loads", async ({ page }) => {
    const response = await page.goto(loginPath);
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("anonymous visitor cannot access admin page", async ({ page }) => {
    // This assumes /admin is protected and redirects to login or returns 401/403.
    // If your app uses another admin route, set E2E_ADMIN_PATH.
    const response = await page.goto(adminPath);
    const finalUrl = page.url();
    const status = response?.status() ?? 0;
    const redirectedToLogin = /login|signin|sign-in/i.test(finalUrl);
    const denied = status === 401 || status === 403;
    const notFound = status === 404;

    expect(
      redirectedToLogin || denied || notFound,
      `Admin route may be public. status=${status}, finalUrl=${finalUrl}`
    ).toBeTruthy();
  });

  test("customer login works when local test credentials are configured", async ({ page }) => {
    const email = process.env.E2E_CUSTOMER_EMAIL;
    const password = process.env.E2E_CUSTOMER_PASSWORD;
    test.skip(!email || !password, "Set dedicated local E2E_CUSTOMER_EMAIL/PASSWORD.");

    await page.goto(loginPath);

    // Adjust these accessible labels to match your actual login form.
    const emailInput = page.getByLabel(/email|البريد الإلكتروني/i);
    const passwordInput = page.getByLabel(/password|كلمة المرور/i);
    await expect(emailInput).toBeVisible();
    await emailInput.fill(email!);
    await passwordInput.fill(password!);

    const submit = page.getByRole("button", { name: /login|sign in|دخول|تسجيل الدخول/i });
    await submit.click();

    // Prefer checking a stable signed-in UI element unique to your app.
    await expect(page).not.toHaveURL(new RegExp(`${loginPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\?)`));
  });

  test("admin login works when local test credentials are configured", async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    test.skip(!email || !password, "Set dedicated local E2E_ADMIN_EMAIL/PASSWORD.");

    await page.goto(loginPath);
    await page.getByLabel(/email|البريد الإلكتروني/i).fill(email!);
    await page.getByLabel(/password|كلمة المرور/i).fill(password!);
    await page.getByRole("button", { name: /login|sign in|دخول|تسجيل الدخول/i }).click();

    await page.goto(adminPath);
    // Replace this with a stable admin-only heading or element in your app.
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(adminPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});
