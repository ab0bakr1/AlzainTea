import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const useProd = !!(process.env.CI || process.env.E2E_PROD);

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // dev server يتأثر بالتوازي الكثيف؛ الإنتاج يتحمل أكثر
  workers: process.env.CI ? 2 : useProd ? 4 : 2,

  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : [['html', { open: 'never' }], ['list']],

  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // المتصفحات الأخرى في CI فقط
    ...(process.env.CI
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],

  webServer: {
    command: useProd ? 'npm run build && npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000, // البناء قد يستغرق وقتاً
  },
});