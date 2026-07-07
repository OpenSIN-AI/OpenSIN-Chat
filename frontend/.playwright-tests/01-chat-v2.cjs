// SPDX-License-Identifier: MIT
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const apiCalls = [];
  
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text().substring(0, 300)}`); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message.substring(0, 300)}`));
  
  // Track API calls
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/') && !url.includes('csp-violation')) {
      apiCalls.push(`REQ: ${req.method()} ${url.substring(url.indexOf('/api/'))}`);
    }
  });
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/api/') && !url.includes('csp-violation')) {
      const status = resp.status();
      if (status >= 400) {
        apiCalls.push(`RESP_ERR: ${status} ${url.substring(url.indexOf('/api/'))}`);
      }
    }
  });

  const resp = await page.request.post('https://sinchat.delqhi.com/api/request-token', { data: { username: 'admin', password: '' } });
  const { token } = await resp.json();
  await page.addInitScript((t) => {
    localStorage.setItem('opensin_authToken', t);
    localStorage.setItem('opensin_user', JSON.stringify({ username: 'admin', role: 'admin' }));
    localStorage.setItem('opensin_theme', 'dark');
    localStorage.setItem('i18nextLng', 'en');
  }, token);

  // Navigate to workspace
  await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Get the prompt textarea
  const textarea = page.locator('#primary-prompt-input');
  console.log('Textarea visible:', await textarea.isVisible());
  
  // Type and send
  await textarea.fill('Was ist 2+2?');
  await page.waitForTimeout(500);
  await textarea.press('Enter');
  console.log('Message sent, waiting...');
  
  // Wait for navigation (new thread creation) and response
  await page.waitForTimeout(5000);
  
  // Check current URL
  console.log('Current URL:', page.url());
  
  // Wait more for response
  await page.waitForTimeout(30000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/oschat-tests/01-chat-result.png', fullPage: true });
  
  // Get full page text
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('PAGE TEXT:', pageText);
  
  // Get all message-like elements
  const allMessages = await page.evaluate(() => {
    // Look for any element that might be a chat message
    const selectors = [
      '[class*="chat"]', '[class*="message"]', '[class*="response"]', 
      '[class*="prompt"]', '[class*="user"]', '[class*="assistant"]',
      '[data-testid]', '[role="article"]'
    ];
    const results = [];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const text = el.innerText?.substring(0, 100) || '';
        if (text && text.length > 5 && el.offsetParent !== null) {
          results.push({
            selector: sel,
            text: text.replace(/\n/g, ' '),
            testid: el.getAttribute('data-testid') || '',
            className: el.className?.substring?.(0, 50) || ''
          });
        }
      }
    }
    return results.slice(0, 30);
  });
  console.log('VISIBLE ELEMENTS:', JSON.stringify(allMessages, null, 2));

  console.log('\nAPI CALLS:', apiCalls.slice(0, 20));
  console.log('\nERRORS:', errors);
  await browser.close();
})();
