const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const sseChunks = [];
  
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text().substring(0, 500)}`); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message.substring(0, 500)}\n${err.stack?.substring(0, 800)}`));

  const resp = await page.request.post('https://sinchat.delqhi.com/api/request-token', { data: { username: 'admin', password: '' } });
  const { token } = await resp.json();
  await page.addInitScript((t) => {
    localStorage.setItem('openafd_authToken', t);
    localStorage.setItem('openafd_user', JSON.stringify({ username: 'admin', role: 'admin' }));
    localStorage.setItem('openafd_theme', 'dark');
    localStorage.setItem('i18nextLng', 'en');
  }, token);

  // Navigate to workspace with existing chats
  await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // Get the prompt textarea and verify it's ready
  const textarea = page.locator('#primary-prompt-input');
  console.log('Textarea count:', await textarea.count());
  console.log('Textarea visible:', await textarea.isVisible());
  
  // Type message
  await textarea.click();
  await textarea.fill('Was ist 2+2?');
  await page.waitForTimeout(1000);
  
  // Take screenshot before sending
  await page.screenshot({ path: '/tmp/oschat-tests/01-before-send.png' });
  
  // Submit by pressing Enter
  await textarea.press('Enter');
  console.log('Enter pressed at:', new Date().toISOString());
  
  // Wait and monitor for response
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    
    // Check for new messages in chat area
    const chatText = await page.evaluate(() => {
      const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
      if (!scroller) return 'NO_SCROLLER';
      const items = scroller.querySelectorAll('[data-testid="virtuoso-item"]');
      return `ITEMS:${items.length} | LAST:${items[items.length-1]?.innerText?.substring(0, 200) || 'empty'}`;
    });
    
    if (i % 5 === 0) {
      console.log(`[${i+1}s] ${chatText}`);
    }
    
    // Check if "2+2" or "4" appears in chat
    if (chatText.includes('2+2') || chatText.includes('4') && !chatText.includes('NO_SCROLLER')) {
      console.log(`[${i+1}s] FOUND RESPONSE!`);
      break;
    }
  }
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/oschat-tests/01-after-send.png', fullPage: true });
  
  // Get final chat content
  const finalText = await page.evaluate(() => {
    const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
    return scroller?.innerText?.substring(0, 2000) || 'NO SCROLLER';
  });
  console.log('\nFINAL CHAT TEXT:', finalText);

  // Check all network requests for stream-chat
  const allRequests = [];
  page.on('request', req => {
    if (req.url().includes('stream-chat')) {
      allRequests.push(`STREAM_REQ: ${req.url()}`);
    }
  });
  page.on('response', resp => {
    if (resp.url().includes('stream-chat')) {
      allRequests.push(`STREAM_RESP: ${resp.status()} ${resp.url()}`);
    }
  });

  console.log('\nSTREAM REQUESTS:', allRequests);
  console.log('\nERRORS:', errors);
  await browser.close();
})();
