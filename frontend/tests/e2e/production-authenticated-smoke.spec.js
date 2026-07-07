// SPDX-License-Identifier: MIT
// Purpose: Combined authenticated production smoke for one APP_URL. Runs the
// requested verification steps and writes a JSON log of console errors, network
// failures, and non-2xx API responses.
// Docs: frontend/tests/e2e/README.doc.md
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { sharedLogin as login } from "./_token-cache.js";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";

const SCREENSHOT_DIR = "/Users/jeremy/dev/OpenSIN-Chat/screenshots";

test.describe("authenticated production smoke", () => {
  const consoleErrors = [];
  const networkFailures = [];
  const networkResponses = [];
  const testLog = [];
  let token;
  let createdSlug = null;
  let siteName;
  let siteUrl;

  test.beforeAll(async ({ request }) => {
    siteUrl = process.env.APP_URL || "http://localhost:38471";
    siteName = "OpenSIN-Chat";
    token = await login(request);
    testLog.push({ step: "login", ok: true, url: siteUrl });
  });

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    networkFailures.length = 0;
    networkResponses.length = 0;

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push({ type: msg.type(), text: msg.text(), location: msg.location() });
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push({ type: "pageerror", text: err.message });
    });
    page.on("requestfailed", (req) => {
      networkFailures.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText || "unknown" });
    });
    page.on("response", (res) => {
      networkResponses.push({ url: res.url(), method: res.request().method(), status: res.status() });
    });

    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test.afterEach(async ({ request }) => {
    if (createdSlug) {
      await request
        .delete(`${siteUrl}/api/workspace/${createdSlug}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
      createdSlug = null;
    }
  });

  const screenshot = async (page, label) => {
    const fileName = `${siteName.replace(/\s+/g, "-")}_auth_${label}_${Date.now()}.png`;
    const filePath = path.join(SCREENSHOT_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    testLog.push({ step: label, screenshot: filePath });
    return filePath;
  };

  test("1. chat — 5 messages and responses", async ({ page, request }) => {
    const listResp = await request.get(`${siteUrl}/api/workspaces`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResp.ok()).toBeTruthy();
    const { workspaces } = await listResp.json();
    expect(workspaces?.length).toBeGreaterThan(0);
    const slug = workspaces[0].slug;

    await page.goto(`${siteUrl}/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);
    const promptInput = page.locator("#primary-prompt-input");
    await expect(promptInput).toBeVisible({ timeout: 30000 });
    await screenshot(page, "01-chat-start");

    const markers = [];
    for (let i = 1; i <= 5; i++) {
      const marker = `auth-e2e-${i}-${Date.now()}`;
      markers.push(marker);
      await promptInput.fill(`Message ${i}: ${marker}. Please reply with OK.`);
      await promptInput.press("Enter");
      await expect(page.getByText(marker, { exact: false })).toBeAttached({ timeout: 15000 });
      const indicator = page.locator(".dot-falling, .bg-red-50").first();
      await indicator.waitFor({ state: "visible", timeout: 45000 });
      await indicator.waitFor({ state: "hidden", timeout: 45000 }).catch(() => {});
      testLog.push({ step: `chat-message-${i}`, marker });
    }
    await screenshot(page, "02-chat-after-5");
  });

  test("2. create a new workspace", async ({ page, request }) => {
    const res = await request.post(`${siteUrl}/api/workspace/new`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `auth-e2e-workspace-${Date.now()}` },
    });
    if (res.status() === 429) {
      test.skip(true, "Workspace creation rate-limited (5/hour)");
    }
    expect(res.ok()).toBeTruthy();
    const { workspace } = await res.json();
    createdSlug = workspace.slug;
    testLog.push({ step: "create-workspace", slug: createdSlug, name: workspace.name });

    await page.goto(`${siteUrl}/workspace/${createdSlug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);
    await expect(page.locator("#primary-prompt-input").first()).toBeVisible({ timeout: 30000 });
    await screenshot(page, "03-created-workspace");
  });

  test("3. settings page loads", async ({ page }) => {
    await page.goto(`${siteUrl}/settings/llm-preference`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);
    await expect(page.getByText(/Instance Settings/i).first()).toBeVisible({ timeout: 10000 });
    await screenshot(page, "04-settings");
    testLog.push({ step: "settings-load", ok: true });
  });

  test("4. document manager loads", async ({ page }) => {
    await page.goto(`${siteUrl}/workspace/${createdSlug || "default"}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);
    await expect(page.locator("#primary-prompt-input").first()).toBeVisible({ timeout: 30000 });
    const uploadBtn = page.locator('[data-tooltip-id="upload-workspace"]').first();
    await expect(uploadBtn).toBeVisible({ timeout: 10000 });
    await uploadBtn.click();
    await expect(page.locator('input[type="file"]').first()).toBeAttached({ timeout: 15000 });
    await screenshot(page, "05-documents-modal");
    testLog.push({ step: "documents-modal", ok: true });
  });

  test("5. console and network error summary", async () => {
    const artifact = path.join(SCREENSHOT_DIR, `${siteName.replace(/\s+/g, "-")}_auth-summary.json`);
    const summary = {
      site: siteName,
      url: siteUrl,
      consoleErrors,
      networkFailures: networkFailures.filter((n) => !n.url.includes("favicon")),
      non2xxNetworkResponses: networkResponses.filter((n) => {
        const status = n.status;
        return status >= 400 && ![401, 403, 404, 429].includes(status);
      }),
      testLog,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(artifact, JSON.stringify(summary, null, 2));

    expect(summary.consoleErrors.length).toBe(0);
    expect(summary.networkFailures.length).toBe(0);
    expect(summary.non2xxNetworkResponses.length).toBe(0);
  });
});
