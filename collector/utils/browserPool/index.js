// SPDX-License-Identifier: MIT
// Purpose: Bounded global Puppeteer browser pool - caps concurrent Chromium instances
// Docs: collector/utils/browserPool/index.js.doc.md
const puppeteer = require("puppeteer").default || require("puppeteer");

const MAX_CONCURRENT_BROWSERS = 2;
const IDLE_BROWSER_TTL_MS = 60_000;

const _state = {
  idle: [],
  active: 0,
  pending: [],
  reapTimer: null,
};

function log(...args) {
  // eslint-disable-next-line no-console
  console.log("\x1b[36m[browserPool]\x1b[0m", ...args);
}

/**
 * Launches a fresh browser instance. Headless mode is selected like the rest
 * of the codebase: headless on Linux/server, optional override on Darwin dev.
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function _launchBrowser() {
  const isDarwinDev =
    process.platform === "darwin" && process.env.NODE_ENV === "development";
  if (isDarwinDev) {
    log("Darwin dev mode: launching non-headless browser");
  }
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--no-zygote",
    "--single-process",
  ];
  if (process.env.NODE_ENV === "production") {
    args.push(
      "--enable-features=UseOzonePlatform",
      "--ozone-platform=headless",
    );
  }
  const browser = await puppeteer.launch({
    headless: isDarwinDev ? "false" : "new",
    ignoreHTTPSErrors: true,
    args,
  });
  return browser;
}

/**
 * Schedule an idle sweep that terminates browsers older than IDLE_BROWSER_TTL_MS.
 * Idempotent: clears any previously scheduled sweep.
 */
function _scheduleReap() {
  if (_state.reapTimer) clearTimeout(_state.reapTimer);
  _state.reapTimer = setTimeout(async () => {
    _state.reapTimer = null;
    const now = Date.now();
    const survivors = [];
    for (const entry of _state.idle) {
      if (now - entry.releasedAt < IDLE_BROWSER_TTL_MS) {
        survivors.push(entry);
        continue;
      }
      try {
        if (entry.browser.connected) await entry.browser.close();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[browserPool] reap failed:", e.message);
      }
    }
    _state.idle = survivors;
    if (_state.idle.length || _state.active > 0 || _state.pending.length)
      _scheduleReap();
  }, IDLE_BROWSER_TTL_MS / 2).unref?.();
}

/**
 * Acquire a browser from the pool. Creates a new browser if the pool is empty
 * and we are still under MAX_CONCURRENT_BROWSERS; queues otherwise.
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function acquire() {
  while (_state.idle.length) {
    const entry = _state.idle.pop();
    if (entry?.browser?.connected) {
      _state.active += 1;
      return entry.browser;
    }
  }
  if (_state.active < MAX_CONCURRENT_BROWSERS) {
    _state.active += 1;
    try {
      return await _launchBrowser();
    } catch (e) {
      _state.active -= 1;
      throw e;
    }
  }
  return await new Promise((resolve) => _state.pending.push(resolve));
}

/**
 * Return a browser to the pool. If the pool is full, terminate it instead.
 * @param {import('puppeteer').Browser} browser
 */
function release(browser) {
  if (!browser || _state.active <= 0) {
    if (browser?.connected) browser.close().catch(() => {});
    return;
  }
  _state.active -= 1;
  if (_state.pending.length) {
    const waiter = _state.pending.shift();
    _state.active += 1;
    waiter(browser);
    return;
  }
  if (_state.idle.length < MAX_CONCURRENT_BROWSERS) {
    _state.idle.push({ browser, releasedAt: Date.now() });
    _scheduleReap();
    return;
  }
  browser.close().catch(() => {});
}

/**
 * Close every browser the pool knows about - for graceful shutdown.
 */
async function shutdown() {
  if (_state.reapTimer) clearTimeout(_state.reapTimer);
  _state.reapTimer = null;
  const all = [..._state.idle.map((e) => e.browser)];
  _state.idle = [];
  _state.active = 0;
  for (const b of all) {
    try {
      if (b.connected) await b.close();
    } catch {
      // ignore
    }
  }
  for (const waiter of _state.pending) waiter(null);
  _state.pending = [];
}

module.exports = {
  browserPool: { acquire, release, shutdown },
  MAX_CONCURRENT_BROWSERS,
};
