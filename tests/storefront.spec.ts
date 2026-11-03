import { test, expect } from "@playwright/test";

const productsPath = process.env.E2E_PRODUCTS_PATH ?? "/products";

test.describe("Storefront smoke checks", () => {
  test("homepage loads without uncaught JavaScript errors", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    const response = await page.goto("/");
    expect(response, "Homepage should return a response").not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();

    await page.screenshot({
      path: "test-results/homepage.png",
      fullPage: true,
    });
    expect(pageErrors, "Uncaught browser errors").toEqual([]);
  });

  test("page has no horizontal overflow on the current viewport", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.content,
      `Horizontal overflow: viewport=${dimensions.viewport}, content=${dimensions.content}`
    ).toBeLessThanOrEqual(dimensions.viewport + 1);
  });

  test("products page responds successfully", async ({ page }) => {
    const response = await page.goto(productsPath);
    expect(response, `No response from ${productsPath}`).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("internal links do not return HTTP 4xx/5xx", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const hrefs = await page.locator("a[href]").evaluateAll(anchors =>
      anchors
        .map(anchor => (anchor as HTMLAnchorElement).href)
        .filter(href => {
          try {
            const url = new URL(href);
            return url.origin === window.location.origin &&
              !url.pathname.startsWith("/api/") &&
              !url.pathname.startsWith("/_next/");
          } catch {
            return false;
          }
        })
    );

    const urls = [...new Set(hrefs)].slice(0, 40);
    const failures: string[] = [];

    for (const url of urls) {
      const response = await page.request.get(url, { maxRedirects: 5 });
      if (response.status() >= 400) {
        failures.push(`${response.status()} ${url}`);
      }
    }
    expect(failures, "Broken internal links found").toEqual([]);
  });

  test("images on homepage are loaded or explicitly lazy/deferred", async ({ page }) => {
    await page.goto("/", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
    const images = page.locator("img");
    const count = await images.count();
    const broken: string[] = [];

    for (let i = 0; i < count; i++) {
      const image = images.nth(i);
      await image.scrollIntoViewIfNeeded().catch(() => {});
      const result = await image.evaluate((img: HTMLImageElement) => ({
        src: img.currentSrc || img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
      }));
      if (result.complete && result.naturalWidth === 0 && result.src) {
        broken.push(result.src);
      }
    }
    expect(broken, "Broken images found on homepage").toEqual([]);
  });
});
