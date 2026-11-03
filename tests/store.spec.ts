
import { test, expect } from '@playwright/test';

test.describe('Alzain Tea Store', () => {
  test('الصفحة الرئيسية تعمل', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    const response = await page.goto('http://localhost:3000');

    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({
      path: 'test-results/homepage.png',
      fullPage: true,
    });

    expect(errors).toEqual([]);
  });

  test('لا توجد روابط داخلية تؤدي إلى صفحات غير موجودة', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const links = await page.locator('a[href]').evaluateAll(anchors =>
      anchors
        .map(anchor => (anchor as HTMLAnchorElement).href)
        .filter(url => {
          const parsed = new URL(url);
          return parsed.origin === window.location.origin;
        })
    );

    const uniqueLinks = [...new Set(links)];

    for (const url of uniqueLinks) {
      const response = await page.request.get(url);

      expect(
        response.status(),
        `الرابط المعطّل: ${url}`
      ).toBeLessThan(400);
    }
  });
});
