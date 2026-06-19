const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const networkErrors = [];
  
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));
  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('csp-violation') && !url.includes('favicon')) {
      networkErrors.push(`NETWORK_FAIL: ${url} - ${req.failure()?.errorText}`);
    }
  });

  const resp = await page.request.post('https://sinchat.delqhi.com/api/request-token', { data: { username: 'admin', password: '' } });
  const { token } = await resp.json();
  await page.addInitScript((t) => {
    localStorage.setItem('openafd_authToken', t);
    localStorage.setItem('openafd_user', JSON.stringify({ username: 'admin', role: 'admin' }));
    localStorage.setItem('openafd_theme', 'dark');
    localStorage.setItem('i18nextLng', 'en');
  }, token);

  // Navigate to first workspace
  await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/oschat-tests/01-chat-initial.png', fullPage: true });

  // Find the prompt input - look for textarea or contenteditable
  const inputInfo = await page.evaluate(() => {
    const textareas = Array.from(document.querySelectorAll('textarea'));
    const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    return {
      textareas: textareas.map(t => ({ id: t.id, name: t.name, placeholder: t.placeholder, className: t.className.substring(0,80), visible: t.offsetParent !== null })),
      editables: editables.map(e => ({ className: e.className.substring(0,80), visible: e.offsetParent !== null })),
      inputs: inputs.map(i => ({ id: i.id, placeholder: i.placeholder, visible: i.offsetParent !== null }))
    };
  });
  console.log('INPUT INFO:', JSON.stringify(inputInfo, null, 2));

  // Try to find and type in the chat input
  const chatInput = await page.locator('textarea').filter({ hasText: '' }).first();
  if (await chatInput.count() > 0) {
    console.log('Found textarea, typing...');
    await chatInput.fill('Was ist 2+2?');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/oschat-tests/01-chat-typed.png', fullPage: true });
    
    // Press Enter to send
    await chatInput.press('Enter');
    console.log('Pressed Enter, waiting for response...');
    
    // Wait up to 60s for a response
    try {
      await page.waitForSelector('[data-testid="user-message"], .chat-user-message', { timeout: 5000 }).catch(() => {});
      // Wait for assistant response
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(1000);
        const responseText = await page.evaluate(() => {
          // Look for response containers
          const messages = document.querySelectorAll('[class*="response"], [class*="assistant"], [class*="chat-message"], [data-testid*="message"]');
          if (messages.length > 0) {
            return Array.from(messages).map(m => m.innerText.substring(0, 200)).join('\n---\n');
          }
          return null;
        });
        if (responseText && responseText.length > 10) {
          console.log(`Response found after ${i+1}s:`, responseText.substring(0, 500));
          break;
        }
      }
    } catch (e) {
      console.log('Error waiting for response:', e.message);
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/oschat-tests/01-chat-response.png', fullPage: true });
    
    // Get all message elements and their action buttons
    const messageInfo = await page.evaluate(() => {
      // Look for message containers
      const allElements = document.querySelectorAll('*');
      const messageContainers = [];
      for (const el of allElements) {
        if (el.getAttribute('data-testid') && el.getAttribute('data-testid').includes('message')) {
          messageContainers.push({
            testid: el.getAttribute('data-testid'),
            text: el.innerText.substring(0, 100),
            buttons: Array.from(el.querySelectorAll('button')).map(b => ({ aria: b.getAttribute('aria-label'), text: b.innerText, title: b.title }))
          });
        }
      }
      return messageContainers;
    });
    console.log('MESSAGE INFO:', JSON.stringify(messageInfo, null, 2));
  } else {
    console.log('No textarea found!');
  }

  console.log('\nERRORS:', errors);
  console.log('\nNETWORK ERRORS:', networkErrors);
  await browser.close();
})();
