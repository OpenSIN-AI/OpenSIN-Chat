// SPDX-License-Identifier: MIT
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  let sseResponseBody = '';
  
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text().substring(0, 500)}`); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message.substring(0, 500)}`));

  const resp = await page.request.post('https://sinchat.delqhi.com/api/request-token', { data: { username: 'admin', password: '' } });
  const { token } = await resp.json();
  await page.addInitScript((t) => {
    localStorage.setItem('opensin_authToken', t);
    localStorage.setItem('opensin_user', JSON.stringify({ username: 'admin', role: 'admin' }));
    localStorage.setItem('opensin_theme', 'dark');
    localStorage.setItem('i18nextLng', 'en');
  }, token);

  // Intercept stream-chat to capture the SSE response
  await page.route('**/api/workspace/*/stream-chat', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    sseResponseBody = body;
    console.log('SSE RESPONSE BODY (first 2000 chars):');
    console.log(body.substring(0, 2000));
    console.log(`\nSSE RESPONSE LENGTH: ${body.length}`);
    await route.fulfill({ response });
  });

  await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // Type and send using type() for React compatibility
  const textarea = page.locator('#primary-prompt-input');
  await textarea.click();
  await textarea.type('Was ist 2+2?', { delay: 50 });
  await page.waitForTimeout(500);
  await textarea.press('Enter');
  
  // Wait for the stream to complete
  await page.waitForTimeout(30000);
  
  // Check the chat content
  const chatText = await page.evaluate(() => {
    const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
    return scroller?.innerText?.substring(0, 1500) || 'NO SCROLLER';
  });
  console.log('\nCHAT TEXT:', chatText.substring(0, 500));
  
  await page.screenshot({ path: '/tmp/oschat-tests/01-sse-result.png', fullPage: true });
  console.log('\nERRORS:', errors);
  await browser.close();
})();
