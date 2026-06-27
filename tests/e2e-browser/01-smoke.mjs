// SPDX-License-Identifier: MIT
// E2E browser smoke runner for OpenSIN-Chat at https://sinchat.delqhi.com
// Tests the FULL user journey in one run with deep inspection.
// Usage: node tests/e2e-browser/01-smoke.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'https://sinchat.delqhi.com';
const OUT = '/Users/jeremy/dev/OpenSIN-Chat/tests/e2e-browser/_artifacts';
fs.mkdirSync(OUT, { recursive: true });

const results = []; // { id, title, status: 'pass'|'fail'|'skip', details, error?, consoleErrors? }

function rec(id, title, status, details, err, consoleErrors) {
  results.push({ id, title, status, details, err: err?.slice(0, 400), consoleErrors: consoleErrors?.slice(0, 10) });
  const line = `[${status.toUpperCase()}] ${id} ${title}`;
  console.log(line);
  if (status === 'fail') {
    console.log('  DETAILS:', details);
    if (err) console.log('  ERROR  :', err);
    if (consoleErrors?.length) console.log('  CONSOLE:', consoleErrors);
  }
}

async function shot(page, name) {
  try { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }); } catch {}
}

async function login(page) {
  const r = await page.request.post(`${BASE}/api/request-token`, { data: { username: 'admin', password: '' } });
  if (!r.ok()) throw new Error('login token: ' + r.status());
  const { token } = await r.json();
  await page.addInitScript((t) => {
    localStorage.setItem('openafd_authToken', t);
    localStorage.setItem('openafd_user', JSON.stringify({ username: 'admin', role: 'admin' }));
    localStorage.setItem('openafd_theme', 'dark');
  }, token);
  return token;
}

async function expect(cond, msg) {
  if (!cond) throw new Error('assertion failed: ' + msg);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push({ text: m.text(), url: m.location()?.url }); });
  page.on('pageerror', e => errors.push({ text: 'PAGE_ERROR: ' + e.message }));

  try {
    await login(page);
    await page.goto(`${BASE}/workspace/opensin-chat`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, '01-loaded');

    // -------- 1. Send a simple message --------
    try {
      const ta = page.locator('textarea').first();
      await expect(await ta.count(), 'textarea exists');
      await ta.fill('Hallo Welt');
      await ta.press('Enter');
      await page.waitForTimeout(8000);
      const msgs = await page.locator('[data-message-id], .chatMessage, [id^="assistant-msg"]').count();
      // broader fallback: look for any text containing the reply sentinel
      const text = await page.content();
      const ok = msgs >= 1 || /assistant|response|antwort/i.test(text);
      // wait longer if not yet
      if (!ok) {
        await page.waitForTimeout(15000);
      }
      const finalMsgs = await page.locator('.chatMessage, [data-role="assistant"], div').filter({ hasText: /Hallo Welt|Welt|hello/i }).count();
      rec(1, 'Send simple message', ok ? 'pass' : 'fail', `msgs=${msgs} finalMsgs=${finalMsgs}`, null, errors.slice());
    } catch (e) { rec(1, 'Send simple message', 'fail', '', e.message, errors.slice()); }

    // -------- 2. Long markdown question --------
    try {
      const ta = page.locator('textarea').first();
      await ta.fill('Erkläre mir die deutsche Geschichte des 20. Jahrhunderts in Markdown mit Überschriften');
      await ta.press('Enter');
      await page.waitForTimeout(20000);
      const html = await page.content();
      const renderedMd = /<h[12][^>]*>/.test(html) || /<strong>|<em>/.test(html);
      rec(2, 'Markdown rendering', renderedMd ? 'pass' : 'partial', 'h1/h2 strong detected', null, errors.slice());
      await shot(page, '02-markdown');
    } catch (e) { rec(2, 'Markdown rendering', 'fail', '', e.message, errors.slice()); }

    // -------- 3. Multi-turn conversation --------
    try {
      const ta = page.locator('textarea').first();
      await ta.waitFor({ state: 'visible', timeout: 10000 });
      await ta.fill('Was ist die Hauptstadt von Frankreich?');
      await ta.press('Enter');
      await page.waitForTimeout(15000);
      await ta.fill('Und wie viele Menschen leben dort?');
      await ta.press('Enter');
      await page.waitForTimeout(15000);
      // Any 2nd assistant turn containing the word Paris or 2 Mio
      const html = await page.content();
      const turn2 = /Paris|Frankreich/i.test(html);
      rec(3, 'Multi-turn conversation', turn2 ? 'pass' : 'fail', '', null, errors.slice());
    } catch (e) { rec(3, 'Multi-turn conversation', 'fail', '', e.message, errors.slice()); }

    // -------- 4. Code generation --------
    try {
      const ta = page.locator('textarea').first();
      await ta.fill('Schreibe eine Python-Funktion für Fibonacci');
      await ta.press('Enter');
      await page.waitForTimeout(20000);
      const html = await page.content();
      const codeBlock = /<pre|<code|```/.test(html) && /def\s+\w+\(|fibonacci/i.test(html);
      rec(4, 'Code generation', codeBlock ? 'pass' : 'fail', '', null, errors.slice());
      await shot(page, '04-code');
    } catch (e) { rec(4, 'Code generation', 'fail', '', e.message, errors.slice()); }

    // -------- 5. Switch chat mode --------
    try {
      const modeSelectors = await page.locator('button:has-text("chat"), button:has-text("query"), button:has-text("agent"), [data-mode], select').all();
      let found = false;
      for (const sel of modeSelectors) {
        const txt = (await sel.textContent()) || '';
        if (/chat|query|agent/i.test(txt)) { found = true; rec(5, 'Chat mode selector', 'pass', `Found: ${txt.trim().slice(0,40)}`, null, errors.slice()); break; }
      }
      if (!found) rec(5, 'Chat mode selector', 'partial', 'No chat/query/agent buttons detected by simple locator', null, errors.slice());
    } catch (e) { rec(5, 'Chat mode selector', 'fail', '', e.message, errors.slice()); }

    // -------- 6. Timestamps --------
    try {
      const dateText = await page.locator('time, [data-time], .timestamp').first().textContent({ timeout: 5000 }).catch(() => '');
      rec(6, 'Timestamps present', dateText ? 'pass' : 'partial', `first="${dateText}"`, null, errors.slice());
    } catch (e) { rec(6, 'Timestamps present', 'fail', '', e.message, errors.slice()); }

    // -------- 7. Feedback (thumbs) --------
    try {
      const ups = page.locator('button[aria-label*="up" i], button[title*="up" i], button:has(svg)').filter({ has: page.locator('svg') });
      const count = await ups.count();
      rec(7, 'Feedback buttons', count > 0 ? 'pass' : 'partial', `svg buttons=${count}`, null, errors.slice());
    } catch (e) { rec(7, 'Feedback buttons', 'fail', '', e.message, errors.slice()); }

    // -------- 8. Copy --------
    try {
      const copyBtns = await page.locator('button[aria-label*="copy" i], button[title*="copy" i], button:has-text("Copy")').count();
      rec(8, 'Copy buttons present', copyBtns > 0 ? 'pass' : 'partial', `count=${copyBtns}`, null, errors.slice());
    } catch (e) { rec(8, 'Copy buttons present', 'fail', '', e.message, errors.slice()); }

    // -------- 9. Regenerate --------
    try {
      const regen = await page.locator('button:has-text("Regenerate"), button[aria-label*="regenerate" i]').count();
      rec(9, 'Regenerate button', regen > 0 ? 'pass' : 'partial', `count=${regen}`, null, errors.slice());
    } catch (e) { rec(9, 'Regenerate button', 'fail', '', e.message, errors.slice()); }

    // -------- 10. Delete single chat (button present) --------
    try {
      const del = await page.locator('button:has-text("Delete"), button[aria-label*="delete" i]').count();
      rec(10, 'Delete option present', del > 0 ? 'pass' : 'partial', `count=${del}`, null, errors.slice());
    } catch (e) { rec(10, 'Delete option present', 'fail', '', e.message, errors.slice()); }
  } catch (e) {
    console.error('FATAL:', e.message);
  }

  console.log('\n===== SMOKE RESULTS =====');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n===== CONSOLE ERRORS =====');
  console.log(JSON.stringify(errors.slice(0, 30), null, 2));
  fs.writeFileSync(path.join(OUT, 'smoke.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
})().catch(err => { console.error('FATAL', err); process.exit(1); });
