// SPDX-License-Identifier: MIT
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const apiCalls = [];
  
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text().substring(0, 500)}`); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message.substring(0, 500)}\n${err.stack?.substring(0, 800)}`));
  page.on('request', req => {
    const url = req.url();
    if (url.includes('stream-chat') || url.includes('/chats')) {
      apiCalls.push(`REQ: ${req.method()} ${url.substring(url.indexOf('/api/'))}`);
    }
  });
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('stream-chat')) {
      apiCalls.push(`RESP: ${resp.status()} ${url.substring(url.indexOf('/api/'))}`);
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

  await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // Use type() instead of fill() to trigger React onChange
  const textarea = page.locator('#primary-prompt-input');
  await textarea.click();
  await textarea.type('Was ist 2+2?', { delay: 50 });
  await page.waitForTimeout(500);
  
  // Verify the value is set
  const inputValue = await page.evaluate(() => document.getElementById('primary-prompt-input')?.value);
  console.log('Input value after typing:', JSON.stringify(inputValue));
  
  // Press Enter to submit
  await textarea.press('Enter');
  console.log('Enter pressed');
  
  // Wait for response - check every second
  let foundResponse = false;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const chatContent = await page.evaluate(() => {
      const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
      if (!scroller) return { items: 0, text: '' };
      const allText = scroller.innerText || '';
      // Check for new message "2+2" or response containing "4"
      return {
        items: scroller.children.length,
        text: allText.substring(0, 500),
        hasNewMsg: allText.includes('2+2'),
        hasResponse: allText.includes('vier') || (allText.includes('4') && !allText.includes('1781'))
      };
    });
    
    if (i % 5 === 0 || chatContent.hasNewMsg || chatContent.hasResponse) {
      console.log(`[${i+1}s] items=${chatContent.items} hasNewMsg=${chatContent.hasNewMsg} hasResponse=${chatContent.hasResponse}`);
    }
    if (chatContent.hasNewMsg && chatContent.hasResponse) {
      foundResponse = true;
      console.log(`[${i+1}s] RESPONSE FOUND!`);
      console.log('Chat text:', chatContent.text.substring(0, 300));
      break;
    }
  }
  
  if (!foundResponse) {
    console.log('No response found after 60s');
    // Get full chat text
    const finalText = await page.evaluate(() => {
      const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
      return scroller?.innerText?.substring(0, 1000) || 'NO SCROLLER';
    });
    console.log('Final chat text:', finalText);
  }
  
  await page.screenshot({ path: '/tmp/oschat-tests/01-chat-final.png', fullPage: true });
  console.log('\nAPI CALLS:', apiCalls);
  console.log('\nERRORS:', errors);
  await browser.close();
})();
