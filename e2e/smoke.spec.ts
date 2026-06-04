import { test, expect } from "@playwright/test";
import { ROLES } from "./fixtures/roles";
import { signIn } from "./helpers/auth";

/**
 * R10 — Per-role smoke suite.
 *
 * For every configured role:
 *   1. Sign in.
 *   2. Visit the role's top 5 pages.
 *   3. Assert: no console errors, no 5xx, page rendered something matching the route's expectation.
 *
 * Roles without credentials in env are skipped (not failed) so a credential
 * rotation never red-bars the build.
 */
for (const role of ROLES) {
  test.describe(`Smoke — ${role.label}`, () => {
    test.skip(!role.email || !role.password, `No credentials configured for ${role.key}`);

    test(`visits ${role.pages.length} pages without errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const serverErrors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          // Filter the well-known noise: 3rd-party tracking, favicon, react-devtools.
          if (/favicon|devtools|react_devtools|sentry|posthog|analytics/i.test(text)) return;
          consoleErrors.push(text);
        }
      });
      page.on("response", (resp) => {
        if (resp.status() >= 500 && !/\.(png|jpg|ico|svg|woff2?)$/.test(resp.url())) {
          serverErrors.push(`${resp.status()} ${resp.url()}`);
        }
      });

      await signIn(page, role.email!, role.password!);

      for (const { path, expect: matcher } of role.pages) {
        await test.step(`GET ${path}`, async () => {
          const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
          expect(resp?.status() ?? 200, `HTTP status for ${path}`).toBeLessThan(500);
          // Verify the route actually rendered something on-topic.
          const body = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "");
          if (typeof matcher === "string") {
            expect(body, `Page body should mention "${matcher}"`).toContain(matcher);
          } else {
            expect(body, `Page body should match ${matcher}`).toMatch(matcher);
          }
          // /404 sanity check
          expect(page.url(), "should not redirect to 404").not.toMatch(/\/404|not[-_]?found/i);
        });
      }

      expect(serverErrors, "no 5xx responses").toEqual([]);
      expect(consoleErrors, "no unexpected console errors").toEqual([]);
    });
  });
}

test("unauthenticated /auth page renders", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: /sign in|log in/i }).first()).toBeVisible();
});
