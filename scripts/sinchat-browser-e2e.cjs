// SPDX-License-Identifier: MIT
// Purpose: Live E2E browser smoke test against sinchat.delqhi.com

const { chromium } = require("playwright");
const fs = require("fs");

const AUTH_TOKEN = (fs.readFileSync("/tmp/auth-prod.txt", "utf8") || "").trim();
const BASE_URL = process.env.BASE_URL || "https://sinchat.delqhi.com";

if (!AUTH_TOKEN) {
  console.error("AUTH_TOKEN missing from /tmp/auth-prod.txt");
  process.exit(1);
}

(async () => {
  console.log(`[e2e] Launching Chromium headless against ${BASE_URL} ...`);
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
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 OpenSIN-Chat-E2E-Test",
  });
  const page = await context.newPage();

  // Capture client errors (more valuable than network logs)
  const errors = [];
  const responses = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push({ kind: "console", text: msg.text() });
  });
  page.on("pageerror", (err) => errors.push({ kind: "pageerror", text: err.message }));
  page.on("requestfailed", (req) =>
    errors.push({ kind: "network", url: req.url(), text: req.failure()?.errorText }),
  );
  page.on("response", (resp) => {
    const url = resp.url();
    if (url.includes("/api/") || url.includes("/assets/")) {
      responses.push({ status: resp.status(), url });
    }
  });

  console.log("[e2e] Navigating to home ...");
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 30000 });

  console.log("[e2e] Capturing screenshot of landing page ...");
  await page.screenshot({ path: "/tmp/e2e-step-1-landing.png", fullPage: true });
  console.log("[e2e] screenshot: /tmp/e2e-step-1-landing.png");

  // Capture what the page actually rendered
  const pageTitle = await page.title();
  const pageBody = (await page.content()).slice(0, 800);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 600));

  console.log("[e2e] Page title:", pageTitle);
  console.log("[e2e] Body text:", bodyText.replace(/\s+/g, " ").trim());

  // Wait for SPA bundle to hydrate
  await page.waitForTimeout(3000);

  // Look for login form (DOM probe)
  const hasLoginField = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input"));
    return inputs.map((i) => ({
      type: i.type,
      name: i.name,
      placeholder: i.placeholder,
      autocomplete: i.autocomplete,
    }));
  });
  console.log("[e2e] Form inputs found:", JSON.stringify(hasLoginField, null, 2));

  // Try auth-protected routes (anonymous, expect 401 / 302)
  console.log("[e2e] Probing auth-protected endpoints via in-browser fetch ...");
  for (const path of ["/api/env-dump", "/api/admin/users", "/api/system/footer-data"]) {
    const result = await page.evaluate(async (p) => {
      const r = await fetch(p, { credentials: "include" });
      return { status: r.status, contentType: r.headers.get("content-type") };
    }, path);
    console.log(`[e2e] GET ${path} anonymous -> ${JSON.stringify(result)}`);
  }

  // Now fetch with valid JWT bearer (programmatic login)
  console.log("[e2e] Performing programmatic login via /api/request-token ...");
  const loginResult = await page.evaluate(async (token) => {
    const r = await fetch("/api/request-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: "root", password: token }),
    });
    let body = null;
    try {
      body = await r.json();
    } catch (e) {
      body = await r.text();
    }
    return { status: r.status, body };
  }, AUTH_TOKEN);
  console.log(
    "[e2e] Login result:",
    JSON.stringify(loginResult, null, 2).slice(0, 800),
  );

  // Save JWT to localStorage for subsequent calls
  if (loginResult.body?.token) {
    await page.evaluate((t) => localStorage.setItem("token", t), loginResult.body.token);
    console.log("[e2e] Token stored in localStorage");

    // Use the token to hit a previously-401 endpoint
    const envDumpAuthed = await page.evaluate(async (token) => {
      const r = await fetch("/api/env-dump", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      return { status: r.status };
    }, loginResult.body.token);
    console.log("[e2e] /api/env-dump with valid JWT ->", JSON.stringify(envDumpAuthed));
  }

  await page.screenshot({ path: "/tmp/e2e-step-2-landing-after-login.png", fullPage: true });
  await browser.close();

  console.log("\n[e2e] Errors collected during run:");
  if (errors.length === 0) console.log("  (none)");
  else
    for (const e of errors.slice(0, 20))
      console.log(`  [${e.kind}] ${e.text || ""} ${e.url || ""}`);

  console.log("\n[e2e] First 12 API responses:");
  for (const r of responses.slice(0, 12))
    console.log(`  ${r.status} ${r.url}`);

  console.log("\n[e2e] DONE.");
})().catch((err) => {
  console.error("[e2e] FATAL:", err.stack || err.message);
  process.exit(1);
});
