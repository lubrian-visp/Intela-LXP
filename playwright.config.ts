import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright smoke suite for Intela SkillChain.
 * R10 closure — runs against the deployed preview by default.
 *
 * Override the base URL with PLAYWRIGHT_BASE_URL.
 * Per-role credentials are loaded from env vars; tests skip cleanly if absent
 * so the suite never breaks CI when a role account is rotated.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "https://id-preview--46fb1b71-3f09-4ca8-b3b2-e779d3a44c92.lovable.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
