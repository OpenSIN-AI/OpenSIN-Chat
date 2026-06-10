// SPDX-License-Identifier: MIT
/**
 * Repro script for SidebarTabs bug: clicking "Quellen"/"Sources" or "Global"
 * tab on the Memories sidebar (right) does nothing.
 *
 * Run: node frontend/tests/e2e/sidebar-tabs-repro.mjs [before|after]
 */
import pkg from "/Users/jeremy/dev/OpenSIN-Chat/node_modules/playwright/index.js";
const { chromium } = pkg;

const STAGE = process.argv[2] || "before";
const APP_URL = process.env.APP_URL || "http://localhost:3001";
const WORKSPACE = process.env.WORKSPACE || "bro";

const consoleErrors = [];
const pageErrors = [];

function log(msg) {
  console.log(`[${STAGE}] ${msg}`);
}

async function unlock(page) {
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
  log(`Navigating to workspace '${WORKSPACE}'…`);
  await page.goto(APP_URL + `/workspace/${WORKSPACE}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(5000);
  log(`URL: ${page.url()}`);
}

async function openMemoriesSidebar(page) {
  log("Opening Memories sidebar…");
  const res = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("button"));
    for (const b of all) {
      const aria = (b.getAttribute("aria-label") || "").toLowerCase();
      if (aria.includes("memories") || aria.includes("emories")) {
        const rect = b.getBoundingClientRect();
        if (rect.width === 0) continue; // collapsed
        b.click();
        return aria;
      }
    }
    return null;
  });
  log(`Brain click result: ${res}`);
  await page.waitForTimeout(1000);
}

async function getActiveSidebar(page) {
  return await page.evaluate(() => {
    const panel = document.querySelector('[aria-label="Rechte Seitenleiste"]');
    if (!panel) return { found: false };
    // Identify the open sidebar by looking at the heading <p>
    const headings = Array.from(panel.querySelectorAll("p")).map((p) =>
      (p.textContent || "").trim()
    );
    return { found: true, headings: headings.slice(0, 6) };
  });
}

async function getTabsState(page) {
  return await page.evaluate(() => {
    const panel = document.querySelector('[aria-label="Rechte Seitenleiste"]');
    if (!panel) return { found: false };
    const buttons = Array.from(panel.querySelectorAll("button"));
    // Top row tabs: "Sources"/"Quellen" + "Workspace"/"Arbeitsbereich" + "Global"
    const summary = buttons
      .map((b) => {
        const txt = (b.textContent || "").trim();
        // active: bg-zinc-800 or bg-slate-300
        const isActive = b.className.includes("bg-zinc-800") || b.className.includes("bg-slate-300");
        return { txt, active: isActive, classes: b.className };
      })
      .filter((x) => /^(sources|quellen|workspace|arbeitsbereich|global)/i.test(x.txt) && x.txt.length < 30);
    return { found: true, tabs: summary };
  });
}

async function clickTabByLabel(page, labelRegex) {
  return await page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, "i");
    const panel = document.querySelector('[aria-label="Rechte Seitenleiste"]');
    if (!panel) return { ok: false, why: "no panel" };
    const buttons = Array.from(panel.querySelectorAll("button"));
    for (const b of buttons) {
      const txt = (b.textContent || "").trim();
      if (re.test(txt) && txt.length < 30) {
        const rect = b.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return { ok: false, why: "button has zero size", txt };
        }
        const elAtPoint = document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        );
        if (!elAtPoint) {
          return { ok: false, why: "no element at center point", txt };
        }
        const isClickable =
          b === elAtPoint || b.contains(elAtPoint) || elAtPoint.contains(b);
        if (!isClickable) {
          return {
            ok: false,
            why: `pointer-events blocked by ${elAtPoint.tagName}.${(elAtPoint.className || "").slice(0, 80)}`,
            txt,
            blockedBy: elAtPoint.outerHTML.slice(0, 200),
          };
        }
        // Also check the wrapper div for pointer-events-none
        let parent = b.parentElement;
        let depth = 0;
        while (parent && depth < 4) {
          const cls = (parent.className || "") + " " + (parent.style?.cssText || "");
          if (/pointer-events-none/.test(cls)) {
            return { ok: false, why: `parent has pointer-events-none (${parent.tagName})`, txt };
          }
          parent = parent.parentElement;
          depth++;
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
  }, labelRegex.source);
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
  await openMemoriesSidebar(page);

  const sidebar0 = await getActiveSidebar(page);
  const tabs0 = await getTabsState(page);
  log(`Sidebar headings after opening memories: ${JSON.stringify(sidebar0.headings)}`);
  log(`Tabs visible: ${JSON.stringify(tabs0.tabs)}`);

  // ─── TEST 1: click the Quellen / Sources tab ──────────────────────────
  log("");
  log("=== TEST 1: Click 'Quellen' (Sources) tab ===");
  const r1 = await clickTabByLabel(page, /^(sources|quellen)$/i);
  log(`Result: ${JSON.stringify(r1)}`);
  await page.waitForTimeout(1200);
  const sidebar1 = await getActiveSidebar(page);
  const tabs1 = await getTabsState(page);
  log(`Sidebar headings after: ${JSON.stringify(sidebar1.headings)}`);
  log(`Tabs after: ${JSON.stringify(tabs1.tabs)}`);

  // Reset by clicking Brain icon again to open Memories
  await openMemoriesSidebar(page);
  // If that closed the panel, re-open
  const sidebarCheck = await getActiveSidebar(page);
  if (!sidebarCheck.headings.some((h) => /memories|erinnerungen/i.test(h))) {
    await openMemoriesSidebar(page);
  }
  await page.waitForTimeout(800);

  // ─── TEST 2: click the Global tab ─────────────────────────────────────
  log("");
  log("=== TEST 2: Click 'Global' tab (in memories sub-tab strip) ===");
  const r2 = await clickTabByLabel(page, /^global/i);
  log(`Result: ${JSON.stringify(r2)}`);
  await page.waitForTimeout(800);
  const sidebar2 = await getActiveSidebar(page);
  const tabs2 = await getTabsState(page);
  log(`Sidebar headings after: ${JSON.stringify(sidebar2.headings)}`);
  log(`Tabs after: ${JSON.stringify(tabs2.tabs)}`);

  // ─── TEST 3: click Arbeitsbereich / Workspace tab ────────────────────
  log("");
  log("=== TEST 3: Click 'Arbeitsbereich' (Workspace) tab ===");
  const r3 = await clickTabByLabel(page, /^(workspace|arbeitsbereich)\b/i);
  log(`Result: ${JSON.stringify(r3)}`);
  await page.waitForTimeout(800);
  const sidebar3 = await getActiveSidebar(page);
  const tabs3 = await getTabsState(page);
  log(`Sidebar headings after: ${JSON.stringify(sidebar3.headings)}`);
  log(`Tabs after: ${JSON.stringify(tabs3.tabs)}`);

  // ─── Report ─────────────────────────────────────────────────────────
  log("");
  log("========= RESULT =========");
  log(`Console errors: ${consoleErrors.length}`);
  consoleErrors.forEach((e) => log(`  - ${e.slice(0, 200)}`));
  log(`Page errors:    ${pageErrors.length}`);
  pageErrors.forEach((e) => log(`  - ${e}`));
  log(`Quellen click:   ${r1.ok ? "OK" : "BLOCKED — " + r1.why}`);
  log(`Global click:    ${r2.ok ? "OK" : "BLOCKED — " + r2.why}`);
  log(`Arbeitsbereich:  ${r3.ok ? "OK" : "BLOCKED — " + r3.why}`);
  log("===========================");

  await page.screenshot({ path: `/tmp/sidebar-tabs-${STAGE}.png`, fullPage: false });
  log(`Screenshot saved to /tmp/sidebar-tabs-${STAGE}.png`);

  await browser.close();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
