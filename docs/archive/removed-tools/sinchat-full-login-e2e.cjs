// SPDX-License-Identifier: MIT
// Purpose: Full E2E browser login flow against sinchat.delqhi.com

const { chromium } = require("playwright");
const fs = require("fs");

const PASSWORD = (fs.readFileSync("/tmp/auth-prod.txt", "utf8") || "").trim();
const BASE_URL = process.env.BASE_URL || "https://sinchat.delqhi.com";

if (!PASSWORD) {
  console.error("PASSWORD missing from /tmp/auth-prod.txt");
  process.exit(1);
}

(async () => {
  console.log(`[login-e2e-v2] Launching Chromium against ${BASE_URL} ...`);
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

  console.log("[step 1/6] Navigate to landing page ...");
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: "/tmp/login-e2e-step1-landing.png", fullPage: true });

  console.log("[step 2/6] Page title and visible elements:");
  const landingBody = await page.evaluate(() => document.body.innerText.slice(0, 600));
  console.log("  body:", landingBody.replace(/\s+/g, " ").trim());
  console.log("  title:", await page.title());

  console.log("[step 3/6] Filling password form ...");
  await page.fill('input[type="password"]', PASSWORD);

  console.log("[step 4/6] Submitting login form ...");
  await Promise.all([
    page
      .waitForResponse(
        (r) => r.url().includes("/api/request-token") && r.request().method() === "POST",
        { timeout: 30000 },
      )
      .catch(() => console.log("  (request-token response not captured)")),
    page.click('button:has-text("Login"), button[type="submit"]'),
  ]);

  console.log("[step 5/6] Capturing post-login state ...");
  await page.waitForTimeout(4000); // let SPA hydrate
  await page.screenshot({ path: "/tmp/login-e2e-step2-postlogin.png", fullPage: true });

  const postUrl = page.url();
  const postTitle = await page.title();
  const postBody = await page.evaluate(() =>
    document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 800),
  );
  console.log("  post-login URL:", postUrl);
  console.log("  post-login title:", postTitle);
  console.log("  post-login body:", postBody);

  console.log("[step 6/6] Probing auth-required endpoints with bearer JWT ...");
  const probe = await page.evaluate(async () => {
    const lsKeys = Object.keys(localStorage);
    const ls = {};
    for (const k of lsKeys) ls[k] = localStorage.getItem(k)?.slice(0, 80);
    const t = localStorage.getItem("token") || localStorage.getItem("opensin_authToken") || "";
    const h = t ? { Authorization: `Bearer ${t}` } : {};
    const out = { localStorageKeys: lsKeys, localStorage: ls, probes: {} };
    for (const path of [
      "/api/setup-complete",
      "/api/system/footer-data",
      "/api/env-dump",
      "/api/workspaces",
    ]) {
      try {
        const r = await fetch(path, { headers: h, credentials: "include" });
        const ct = r.headers.get("content-type") || "";
        let body = null;
        if (ct.includes("application/json")) {
          try { body = await r.json(); } catch {}
        } else {
          body = (await r.text()).slice(0, 100);
        }
        out.probes[path] = { status: r.status, body: typeof body === "object" ? body : (body || "").slice(0, 80) };
      } catch (e) {
        out.probes[path] = { error: e.message };
      }
    }
    return out;
  });

  console.log("  localStorage keys:", probe.localStorageKeys);
  for (const [k, v] of Object.entries(probe.probes)) {
    const body = typeof v.body === "string"
      ? v.body
      : JSON.stringify(v.body).slice(0, 200);
    console.log(`  ${k} -> ${v.status || v.error || "?"} ${body}`);
  }

  await browser.close();
  console.log("\n[login-e2e-v2] DONE");
})().catch((e) => {
  console.error("[login-e2e-v2] FATAL:", e.message);
  process.exit(1);
});
