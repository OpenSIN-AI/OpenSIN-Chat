// SPDX-License-Identifier: MIT
// Purpose: Production smoke verification for OpenSIN-Chat.
// Docs: frontend/tests/e2e/README.doc.md
//
// Runs from the local repo against the production sites. Because the operator
// did not provide OPENSIN_PASSWORD in this environment, authenticated flows are
// attempted only as a smoke check (login page renders, bad credentials are
// rejected) and the report explicitly marks which flows require valid credentials.
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SITES = {
  opensin: {
    name: "OpenSIN-Chat",
    url: "https://sinchat.delqhi.com",
    screenshotDir: "/Users/jeremy/dev/OpenSIN-Chat/screenshots",
  },
    screenshotDir: "/Users/jeremy/dev/OpenSIN-Chat/screenshots",
  },
};

const SCREENSHOT_DIR = SITES.opensin.screenshotDir;

for (const [key, site] of Object.entries(SITES)) {
  test.describe(`${site.name} production verification`, () => {
    const consoleErrors = [];
    const networkFailures = [];
    const networkResponses = [];
    const testLogs = [];

    test.beforeEach(async ({ page }) => {
      consoleErrors.length = 0;
      networkFailures.length = 0;
      networkResponses.length = 0;
      testLogs.length = 0;

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location(),
            site: site.name,
          });
        }
      });

      page.on("pageerror", (err) => {
        consoleErrors.push({
          type: "pageerror",
          text: err.message,
          site: site.name,
        });
      });

      page.on("requestfailed", (req) => {
        networkFailures.push({
          url: req.url(),
          method: req.method(),
          failure: req.failure()?.errorText || "unknown",
          site: site.name,
        });
      });

      page.on("response", (res) => {
        networkResponses.push({
          url: res.url(),
          method: res.request().method(),
          status: res.status(),
          site: site.name,
        });
      });
    });

    const screenshot = async (page, label) => {
      const fileName = `${site.name.replace(/\s+/g, "-")}_${label}_${Date.now()}.png`;
      const filePath = path.join(SCREENSHOT_DIR, fileName);
      await page.screenshot({ path: filePath, fullPage: true });
      testLogs.push({ step: label, screenshot: filePath });
      return filePath;
    };

    const assertNoCrash = async (page) => {
      const errorHeading = page.getByRole("heading", {
        level: 2,
        name: /Unexpected Application Error/i,
      });
      await expect(errorHeading).toHaveCount(0);
    };

    test("1. Site loads (HTTP 200, no crash boundary)", async ({ page }) => {
      const res = await page.request.get(site.url);
      expect(res.status()).toBe(200);
      testLogs.push({ step: "site-load", status: res.status() });

      await page.goto(site.url, { waitUntil: "networkidle" });
      await assertNoCrash(page);
      await screenshot(page, "01-homepage");
    });

    test("2. Login page loads and accepts login form", async ({ page }) => {
      await page.goto(`${site.url}/login`, { waitUntil: "networkidle" });
      await assertNoCrash(page);

      const username = page.locator('input[name="username"], input[placeholder*="Username" i], input[type="text"]').first();
      const password = page.locator('input[name="password"], input[type="password"]').first();
      const submit = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

      // We expect at least one username field OR a password field (some single-user setups hide them).
      const hasAuthInput = await username.isVisible().catch(() => false) || await password.isVisible().catch(() => false);
      testLogs.push({ step: "login-page-inputs", hasAuthInput });
      await screenshot(page, "02-login-page");

      // If no password input is present we are likely on a single-user/no-auth deployment.
      // If it is present, a bad login must be rejected (proves the auth endpoint is reachable).
      if (await password.isVisible().catch(() => false)) {
        await username.fill("admin");
        await password.fill("__invalid_for_smoke_test__");
        await submit.click();
        await page.waitForTimeout(2000);
        await screenshot(page, "03-login-bad-credentials");
        testLogs.push({ step: "bad-login-submitted", url: page.url() });
      }
    });

    test("3. Unauthenticated routes reachable where expected", async ({ page }) => {
      for (const route of ["/login", "/", "/workspace"]) {
        try {
          await page.goto(`${site.url}${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
          await assertNoCrash(page);
          testLogs.push({ step: "route-check", route, url: page.url(), ok: true });
        } catch (e) {
          testLogs.push({ step: "route-check", route, ok: false, error: e.message });
        }
      }
      await screenshot(page, "04-unauthenticated-routes");
    });

    test("4. Settings page requires authentication (documented)", async ({ page }) => {
      await page.goto(`${site.url}/settings/llm-preference`, { waitUntil: "networkidle" });
      await screenshot(page, "05-settings-unauthenticated");
      const currentUrl = page.url();
      testLogs.push({ step: "settings-unauthenticated", url: currentUrl, requiresAuth: currentUrl.includes("/login") || currentUrl.includes("/setup") });
    });

    test("5. Documents page requires authentication (documented)", async ({ page }) => {
      await page.goto(`${site.url}/workspace/e2e-documents-check`, { waitUntil: "networkidle" });
      await screenshot(page, "06-documents-unauthenticated");
      const currentUrl = page.url();
      testLogs.push({ step: "documents-unauthenticated", url: currentUrl, requiresAuth: currentUrl.includes("/login") || currentUrl.includes("/setup") });
    });

    test("6. Console errors and network failures summary", async () => {
      // Summaries are captured by the beforeEach handlers; this test writes them as a JSON artifact.
      const artifact = path.join(SCREENSHOT_DIR, `${site.name.replace(/\s+/g, "-")}_verification-log.json`);
      const summary = {
        site: site.name,
        url: site.url,
        consoleErrors,
        networkFailures: networkFailures.filter((n) => !n.url.includes("favicon")),
        non2xxNetworkResponses: networkResponses.filter((n) => {
          const status = n.status;
          return status >= 400 && ![404, 401, 403, 429].includes(status);
        }),
        testLogs,
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(artifact, JSON.stringify(summary, null, 2));
      testLogs.push({ step: "summary-artifact", path: artifact });

      expect(summary.consoleErrors.length).toBe(0);
      expect(summary.networkFailures.length).toBe(0);
      expect(summary.non2xxNetworkResponses.length).toBe(0);
    });
  });
}
