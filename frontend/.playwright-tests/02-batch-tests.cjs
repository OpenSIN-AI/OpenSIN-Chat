// SPDX-License-Identifier: MIT
const { chromium } = require('playwright');

async function loginAndSetup() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text().substring(0, 300)}`); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message.substring(0, 300)}`));

  const resp = await page.request.post('https://sinchat.delqhi.com/api/request-token', { data: { username: 'admin', password: '' } });
  const { token } = await resp.json();
  await page.addInitScript((t) => {
    localStorage.setItem('opensin_authToken', t);
    localStorage.setItem('opensin_user', JSON.stringify({ username: 'admin', role: 'admin' }));
    localStorage.setItem('opensin_theme', 'dark');
    localStorage.setItem('i18nextLng', 'en');
  }, token);
  return { browser, page, errors, token };
}

// Test 2-5: Message actions (pin, delete, copy, feedback) on existing messages
async function testMessageActions() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Find message action buttons by hovering over messages
    const messageInfo = await page.evaluate(() => {
      const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
      if (!scroller) return { error: 'no scroller' };
      
      // Get all message containers
      const allButtons = scroller.querySelectorAll('button');
      const buttons = [];
      for (const btn of allButtons) {
        const aria = btn.getAttribute('aria-label') || '';
        const title = btn.getAttribute('title') || '';
        const text = btn.innerText?.substring(0, 30) || '';
        const parent = btn.closest('[class*="group"]');
        if (aria || title || text) {
          buttons.push({ aria, title, text: text.replace(/\n/g, ' '), visible: btn.offsetParent !== null });
        }
      }
      return { buttonCount: buttons.length, buttons: buttons.slice(0, 40) };
    });
    console.log('TEST 2-5 (Message Actions):');
    console.log('Buttons found:', messageInfo.buttonCount);
    console.log('Buttons:', JSON.stringify(messageInfo.buttons?.slice(0, 20), null, 2));

    // Try hovering over the last assistant message to reveal action buttons
    const lastMsg = page.locator('[data-testid="virtuoso-scroller"] > div > div').last();
    if (await lastMsg.count() > 0) {
      await lastMsg.hover();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/oschat-tests/02-hover-message.png' });
      
      // Get buttons after hover
      const hoverButtons = await page.evaluate(() => {
        const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
        const visibleButtons = [];
        const allBtns = scroller?.querySelectorAll('button') || [];
        for (const btn of allBtns) {
          if (btn.offsetParent !== null) {
            const aria = btn.getAttribute('aria-label') || '';
            const title = btn.getAttribute('title') || '';
            const text = btn.innerText?.substring(0, 30) || '';
            const svg = btn.querySelector('svg')?.getAttribute('data-icon') || '';
            if (aria || title || svg) {
              visibleButtons.push({ aria, title, text: text.replace(/\n/g,' '), svg });
            }
          }
        }
        return visibleButtons;
      });
      console.log('Visible buttons after hover:', JSON.stringify(hoverButtons, null, 2));
    }
    
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 6-8: Workspace settings
async function testWorkspaceSettings() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    // Navigate to workspace settings
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat/settings/chat-settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/oschat-tests/06-chat-settings.png', fullPage: true });
    
    const settingsText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('\nTEST 6-8 (Workspace Settings):');
    console.log('Settings page text (first 1000):', settingsText.substring(0, 1000));
    
    // Find form inputs
    const inputs = await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const inputs = Array.from(document.querySelectorAll('input'));
      const selects = Array.from(document.querySelectorAll('select'));
      const buttons = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
      return {
        textareas: textareas.map(t => ({ id: t.id, placeholder: t.placeholder, value: t.value?.substring(0, 50), visible: t.offsetParent !== null })),
        inputs: inputs.map(i => ({ id: i.id, type: i.type, value: i.value?.substring(0, 50), name: i.name, visible: i.offsetParent !== null })),
        selects: selects.map(s => ({ id: s.id, value: s.value, options: s.options.length, visible: s.offsetParent !== null })),
        buttons: buttons.map(b => ({ text: b.innerText?.substring(0, 30), type: b.type }))
      };
    });
    console.log('Form elements:', JSON.stringify(inputs, null, 2));
    
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 9-10: Workspace create/delete
async function testWorkspaceCreateDelete() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Look for new workspace button
    const newWsInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const links = Array.from(document.querySelectorAll('a'));
      return {
        buttons: buttons.filter(b => b.offsetParent !== null).map(b => ({
          text: b.innerText?.substring(0, 50),
          aria: b.getAttribute('aria-label') || '',
          title: b.getAttribute('title') || ''
        })).filter(b => b.text || b.aria),
        links: links.filter(l => l.offsetParent !== null).map(l => ({
          text: l.innerText?.substring(0, 50),
          href: l.href?.substring(0, 80)
        })).filter(l => l.text || l.href).slice(0, 20)
      };
    });
    console.log('\nTEST 9-10 (Workspace Create/Delete):');
    console.log('Buttons:', JSON.stringify(newWsInfo.buttons.slice(0, 15), null, 2));
    
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 11: Chat mode switch
async function testChatMode() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Look for chat mode selector
    const modeInfo = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const results = [];
      for (const el of allElements) {
        const text = el.innerText || '';
        if ((text.includes('chat') || text.includes('Chat') || text.includes('automatic') || text.includes('Automatic') || text.includes('mode') || text.includes('Mode')) 
            && el.children.length < 5 && el.offsetParent !== null) {
          results.push({
            tag: el.tagName,
            text: text.substring(0, 80).replace(/\n/g, ' '),
            className: el.className?.substring?.(0, 60) || ''
          });
        }
      }
      return results.slice(0, 20);
    });
    console.log('\nTEST 11 (Chat Mode):');
    console.log('Mode-related elements:', JSON.stringify(modeInfo, null, 2));
    
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Run all tests in parallel
(async () => {
  await Promise.all([
    testMessageActions(),
    testWorkspaceSettings(),
    testWorkspaceCreateDelete(),
    testChatMode(),
  ]);
  console.log('\n--- ALL TESTS COMPLETE ---');
})();
