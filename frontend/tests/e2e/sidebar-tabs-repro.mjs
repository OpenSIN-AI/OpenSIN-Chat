// SPDX-License-Identifier: MIT
/**
 * Repro script for SidebarTabs bug: clicking "Quellen" or "Global" on the
 * Memories sidebar (right) does nothing.
 *
 * Run: node frontend/tests/e2e/sidebar-tabs-repro.mjs [before|after]
 */
import pkg from "/Users/jeremy/dev/OpenAfD-Chat/node_modules/playwright/index.js";
const { chromium } = pkg;

const STAGE = process.argv[2] || "before";
const APP_URL = process.env.APP_URL || "http://localhost:3001";

const consoleErrors = [];
const pageErrors = [];

function log(msg) {
  console.log(`[${STAGE}] ${msg}`);
}

async function unlock(page) {
  // Pre-set both tokens: demo gate + auth
  const resp = await fetch(APP_URL + "/api/request-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "" }),
  });
  const { token } = await resp.json();
  await page.goto(APP_URL + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate((t) => {
    window.localStorage.setItem("openafd-demo-unlocked", "1");
    window.localStorage.setItem("openafd_authToken", t);
  }, token);
}

async function openWorkspace(page) {
  log("Navigating to workspace 'test'…");
  await page.goto(APP_URL + "/workspace/test", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(4000);
  log("URL: " + page.url());
}

async function clickBrainIcon(page) {
  log("Clicking Brain icon (right sidebar)…");
  const res = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("button"));
    for (const b of all) {
      const aria = (b.getAttribute("aria-label") || "");
      const title = (b.getAttribute("title") || "");
      if (/emories|memorie|brain/i.test(aria + " " + title)) {
        b.click();
        return aria || title;
      }
    }
    return null;
  });
  log(`Brain click result: ${res}`);
  await page.waitForTimeout(800);
}

async function snapshotTabs(page, label) {
  const html = await page.evaluate(() => {
    const panel = document.querySelector('[aria-label="Rechte Seitenleiste"]');
    if (!panel) return { found: false, url: location.href };
    return { found: true, snippet: panel.outerHTML.slice(0, 4000), url: location.href };
  });
  log(`--- SNAPSHOT (${label}) url=${html.url} ---`);
  if (html.found) {
    console.log(html.snippet);
  } else {
    console.log("(no right sidebar panel found)");
  }
  log(`--- END SNAPSHOT ---`);
}

async function clickTabInPanel(page, textRegex) {
  return await page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, "i");
    const panel = document.querySelector('[aria-label="Rechte Seitenleiste"]');
    if (!panel) return { ok: false, why: "no panel" };
    const buttons = Array.from(panel.querySelectorAll("button"));
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      const txt = (b.textContent || "").trim();
      if (re.test(txt) && txt.length < 30) {
        const rect = b.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0;
        if (!visible) return { ok: false, why: "button not visible", txt };
        const elAtPoint = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        if (!elAtPoint || !b.contains(elAtPoint)) {
          return { ok: false, why: `pointer-events blocked: top element is ${elAtPoint?.tagName}.${elAtPoint?.className}`, txt };
        }
        try {
          b.click();
          return { ok: true, txt };
        } catch (e) {
          return { ok: false, why: "click threw: " + e.message, txt };
        }
      }
    }
    return { ok: false, why: "no matching button" };
  }, textRegex.source);
}

async function getActiveTabState(page) {
  return await page.evaluate(() => {
    const panel = document.querySelector('[aria-label="Rechte Seitenleiste"]');
    if (!panel) return { found: false };
    const buttons = Array.from(panel.querySelectorAll("button"));
    const summary = buttons
      .filter((b) => /quellen|arbeitsbereich|global/i.test((b.textContent || "").trim()))
      .map((b) => {
        const txt = (b.textContent || "").trim();
        const isActive = b.className.includes("bg-zinc-800") || b.className.includes("bg-slate-300");
        return { txt: txt.slice(0, 30), active: isActive, classes: b.className.slice(0, 200) };
      });
    return { found: true, buttons: summary };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(`${e.name}: ${e.message}`));

  await unlock(page);
  await openWorkspace(page);

  // Open Memories sidebar
  await clickBrainIcon(page);
  const initial = await getActiveTabState(page);
  log(`Initial tab state: ${JSON.stringify(initial)}`);

  // Click "Quellen" (it's the leftmost tab, should switch to sources)
  log("=== TEST 1: Click 'Quellen' tab ===");
  const r1 = await clickTabInPanel(page, /^quellen$/i);
  log(`Quellen click: ${JSON.stringify(r1)}`);
  await page.waitForTimeout(1000);
  const after1 = await getActiveTabState(page);
  log(`State after Quellen click: ${JSON.stringify(after1)}`);
  await snapshotTabs(page, "after Quellen click");
  // Did the right sidebar swap from memories to sources?
  const panelHeadings1 = await page.evaluate(() => {
    const panel = document.querySelector('[aria-label="Rechte Seitenleiste"]');
    if (!panel) return null;
    return Array.from(panel.querySelectorAll("p")).slice(0, 5).map((p) => (p.textContent || "").trim());
  });
  log(`Panel headings after Quellen: ${JSON.stringify(panelHeadings1)}`);

  // Go back to Memories
  await clickBrainIcon(page);
  await page.waitForTimeout(800);

  // Click "Global"
  log("=== TEST 2: Click 'Global' tab ===");
  const r2 = await clickTabInPanel(page, /^global/i);
  log(`Global click: ${JSON.stringify(r2)}`);
  await page.waitForTimeout(800);
  const after2 = await getActiveTabState(page);
  log(`State after Global click: ${JSON.stringify(after2)}`);
  await snapshotTabs(page, "after Global click");

  // Click "Arbeitsbereich"
  log("=== TEST 3: Click 'Arbeitsbereich' tab ===");
  const r3 = await clickTabInPanel(page, /^arbeitsbereich/i);
  log(`Arbeitsbereich click: ${JSON.stringify(r3)}`);
  await page.waitForTimeout(800);
  const after3 = await getActiveTabState(page);
  log(`State after Arbeitsbereich click: ${JSON.stringify(after3)}`);

  // Report
  log("");
  log("========= RESULT =========");
  log(`Console errors: ${consoleErrors.length}`);
  consoleErrors.forEach((e) => log(`  - ${e}`));
  log(`Page errors:    ${pageErrors.length}`);
  pageErrors.forEach((e) => log(`  - ${e}`));
  log("===========================");

  await page.screenshot({ path: `/tmp/sidebar-tabs-${STAGE}.png`, fullPage: false });
  log(`Screenshot saved to /tmp/sidebar-tabs-${STAGE}.png`);

  await browser.close();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
