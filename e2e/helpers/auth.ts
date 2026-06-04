import { expect, Page } from "@playwright/test";

/**
 * Sign in via the /auth page. Uses placeholder-based locators rather than
 * test IDs so the helper stays resilient to UI tweaks.
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth");
  // Make sure we are on the sign-in tab (Auth.tsx exposes Sign in / Sign up tabs).
  const signInTab = page.getByRole("tab", { name: /sign in/i });
  if (await signInTab.isVisible().catch(() => false)) {
    await signInTab.click();
  }
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).first().click();
  // Wait for redirect away from /auth.
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 20_000 });
}

export async function signOut(page: Page) {
  // Best-effort sign-out; the suite is read-only so failure to sign out
  // is non-fatal between tests (Playwright contexts are isolated anyway).
  await page.goto("/my-settings").catch(() => {});
  const btn = page.getByRole("button", { name: /sign out|log out/i });
  if (await btn.isVisible().catch(() => false)) await btn.click();
}
