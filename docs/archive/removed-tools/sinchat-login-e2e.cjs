// SPDX-License-Identifier: MIT
// Purpose: Interactive login flow E2E test against sinchat.delqhi.com

const { chromium } = require("playwright");
const fs = require("fs");

const PASSWORD = (fs.readFileSync("/tmp/auth-prod.txt", "utf8") || "").trim();
const BASE_URL = process.env.BASE_URL || "https://sinchat.delqhi.com";

if (!PASSWORD) {
  console.error("PASSWORD missing from /tmp/auth-prod.txt");
  process.exit(1);
}

(async () => {
  console.log(`[login-e2e] Launching Chromium against ${BASE_URL} ...`);
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log("[login-e2e] Navigate to landing page ...");
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 30000 });

  // Wait long enough to avoid rate limit (5/min on /api/request-token)
  console.log("[login-e2e] Waiting 65s to clear rate-limit window ...");
  await page.waitForTimeout(65000);

  console.log("[login-e2e] Filling password form ...");
  const passwordInput = await page.$('input[type="password"]');
  if (!passwordInput) {
    console.error("[login-e2e] No password input visible.");
    await page.screenshot({ path: "/tmp/login-e2e-no-input.png" });
    await browser.close();
    process.exit(1);
  }
  await passwordInput.fill(PASSWORD);

  console.log("[login-e2e] Clicking Login button ...");
  // Look for the Login button
  const loginButton = await page.$('button:has-text("Login")');
  if (!loginButton) {
    console.error("[login-e2e] No Login button found");
    await page.screenshot({ path: "/tmp/login-e2e-no-button.png" });
    await browser.close();
    process.exit(1);
  }

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch((e) => {
      console.log("[login-e2e] navigation wait timed out:", e.message);
    }),
    loginButton.click(),
  ]);

  console.log("[login-e2e] Capturing screenshot of post-login page ...");
  await page.screenshot({ path: "/tmp/login-e2e-after-login.png", fullPage: true });

  const newUrl = page.url();
  const newTitle = await page.title();
  const newBody = (await page.evaluate(() =>
    document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 800),
  )) || "";

  console.log("[login-e2e] Post-login URL:", newUrl);
  console.log("[login-e2e] Post-login title:", newTitle);
  console.log("[login-e2e] Post-login body (first 800 chars):", newBody);

  // Test endpoints with the assumed JWT
  const localStorage = await page.evaluate(() => {
    return Object.fromEntries(
      Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]),
    );
  });
  console.log("[login-e2e] localStorage keys:", Object.keys(localStorage));

  // Try fetching /api/env-dump with whatever JWT may be in localStorage
  const probeResults = await page.evaluate(async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("jwt") || "";
    const headers = { credentials: "include" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const out = {};
    for (const path of ["/api/setup-complete", "/api/env-dump", "/api/system/footer-data", "/api/workspaces"]) {
      try {
        const r = await fetch(path, headers);
        const ct = r.headers.get("content-type") || "";
        let body = null;
        if (ct.includes("application/json")) {
          try { body = await r.json(); } catch {}
        } else {
          body = await r.text().then((s) => s.slice(0, 80));
        }
        out[path] = { status: r.status, body };
      } catch (e) {
        out[path] = { error: e.message };
      }
    }
    return out;
  });
  console.log("[login-e2e] Endpoint probes after login:");
  for (const [path, r] of Object.entries(probeResults)) {
    const body = typeof r.body === "string" ? r.body : JSON.stringify(r.body).slice(0, 200);
    console.log(`  ${path} -> ${r.status || "?"} ${body}`);
  }

  await browser.close();
  console.log("[login-e2e] DONE");
})().catch((err) => {
  console.error("[login-e2e] FATAL:", err.stack || err.message);
  process.exit(1);
});
