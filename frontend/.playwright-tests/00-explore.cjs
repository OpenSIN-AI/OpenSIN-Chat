// SPDX-License-Identifier: MIT
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));

  const resp = await page.request.post('https://sinchat.delqhi.com/api/request-token', { data: { username: 'admin', password: '' } });
  const { token } = await resp.json();
  await page.addInitScript((t) => {
    localStorage.setItem('opensin_authToken', t);
    localStorage.setItem('opensin_user', JSON.stringify({ username: 'admin', role: 'admin' }));
    localStorage.setItem('opensin_theme', 'dark');
    localStorage.setItem('i18nextLng', 'en');
  }, token);

  await page.goto('https://sinchat.delqhi.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/oschat-tests/00-home.png', fullPage: true });

  // List workspaces via API
  const wsResp = await page.request.get('https://sinchat.delqhi.com/api/v1/workspaces', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const wsData = await wsResp.json();
  console.log('WORKSPACES:', JSON.stringify(wsData, null, 2));

  // Get the page text to understand the layout
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('PAGE TEXT (first 2000 chars):\n', bodyText);

  // Look for workspace links / sidebar items
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button')).slice(0, 40).map(el => ({
      tag: el.tagName,
      text: (el.innerText || '').substring(0, 50),
      href: el.href || '',
      aria: el.getAttribute('aria-label') || ''
    }));
  });
  console.log('LINKS/BUTTONS:', JSON.stringify(links, null, 2));

  console.log('\nERRORS:', errors);
  await browser.close();
})();
