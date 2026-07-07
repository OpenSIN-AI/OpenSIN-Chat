// SPDX-License-Identifier: MIT
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const sseData = [];
  
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text().substring(0, 500)}`); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message.substring(0, 500)}\n${err.stack?.substring(0, 500)}`));

  const resp = await page.request.post('https://sinchat.delqhi.com/api/request-token', { data: { username: 'admin', password: '' } });
  const { token } = await resp.json();
  await page.addInitScript((t) => {
    localStorage.setItem('opensin_authToken', t);
    localStorage.setItem('opensin_user', JSON.stringify({ username: 'admin', role: 'admin' }));
    localStorage.setItem('opensin_theme', 'dark');
    localStorage.setItem('i18nextLng', 'en');
  }, token);

  // Intercept the stream-chat response to see what the server returns
  await page.route('**/api/workspace/*/stream-chat', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    // Parse SSE data
    const lines = body.split('\n').filter(l => l.startsWith('data:'));
    for (const line of lines) {
      const data = line.substring(5).trim();
      if (data) {
        try {
          const parsed = JSON.parse(data);
          sseData.push(JSON.stringify(parsed).substring(0, 200));
        } catch {
          sseData.push(`RAW: ${data.substring(0, 200)}`);
        }
      }
    }
    await route.fulfill({ response });
  });

  // Navigate to a fresh workspace (create new thread via new chat)
  await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click "New Chat" to start fresh
  const newChatBtn = page.locator('button', { hasText: 'New Chat' });
  if (await newChatBtn.count() > 0) {
    await newChatBtn.click();
    await page.waitForTimeout(2000);
    console.log('Clicked New Chat, URL:', page.url());
  }

  // Type and send
  const textarea = page.locator('#primary-prompt-input');
  await textarea.fill('Was ist 2+2?');
  await page.waitForTimeout(500);
  await textarea.press('Enter');
  console.log('Sent message...');
  
  // Wait for response
  await page.waitForTimeout(45000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/oschat-tests/01-chat-newthread.png', fullPage: true });
  
  // Get page text
  const pageText = await page.evaluate(() => {
    const main = document.querySelector('[id="chat-history"], [data-testid="virtuoso-scroller"], main, [role="main"]');
    return (main?.innerText || document.body.innerText).substring(0, 2000);
  });
  console.log('CHAT AREA TEXT:', pageText);

  // Check if there's an error boundary
  const errorBoundary = await page.evaluate(() => {
    const el = document.querySelector('[class*="error"], [class*="Error"], [class*="fallback"]');
    return el ? el.innerText.substring(0, 200) : null;
  });
  console.log('ERROR BOUNDARY:', errorBoundary);

  console.log('\nSSE DATA (first 15):', sseData.slice(0, 15));
  console.log('\nERRORS:', errors);
  await browser.close();
})();
