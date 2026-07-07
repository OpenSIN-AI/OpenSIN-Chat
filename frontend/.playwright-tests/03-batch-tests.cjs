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

// Test 2-5: Click "More actions" to reveal pin/delete/thumbs down
async function testMoreActions() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Click the first "More actions" button
    const moreActionsBtn = page.locator('button[aria-label="More actions"]').first();
    if (await moreActionsBtn.count() > 0) {
      await moreActionsBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/oschat-tests/02-more-actions.png' });
      
      // Get the menu items
      const menuItems = await page.evaluate(() => {
        const menus = document.querySelectorAll('[role="menu"], [class*="dropdown"], [class*="popover"], [class*="menu"]');
        const items = [];
        for (const menu of menus) {
          const buttons = menu.querySelectorAll('button, a, [role="menuitem"]');
          for (const btn of buttons) {
            if (btn.offsetParent !== null) {
              items.push({
                text: btn.innerText?.substring(0, 50).replace(/\n/g, ' '),
                aria: btn.getAttribute('aria-label') || '',
                role: btn.getAttribute('role') || ''
              });
            }
          }
        }
        // Also check for any newly visible buttons
        const allBtns = document.querySelectorAll('button');
        for (const btn of allBtns) {
          const aria = btn.getAttribute('aria-label') || '';
          if (aria && (aria.includes('pin') || aria.includes('Pin') || aria.includes('delete') || aria.includes('Delete') || aria.includes('Bad') || aria.includes('bad') || aria.includes('thumb') || aria.includes('Thumb'))) {
            items.push({ text: btn.innerText, aria, role: 'found-by-aria' });
          }
        }
        return items;
      });
      console.log('TEST 2-5 (More Actions Menu):');
      console.log('Menu items:', JSON.stringify(menuItems, null, 2));
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 6: Change system prompt
async function testSystemPrompt() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat/settings/chat-settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Find the system prompt - it's a hidden input with name="openAiPrompt"
    // But there should be a visible textarea or contenteditable for it
    const promptInfo = await page.evaluate(() => {
      // Look for the system prompt textarea
      const allTextareas = Array.from(document.querySelectorAll('textarea'));
      const allInputs = Array.from(document.querySelectorAll('input[name="openAiPrompt"]'));
      return {
        textareas: allTextareas.map(t => ({ id: t.id, name: t.name, value: t.value?.substring(0, 80), placeholder: t.placeholder, visible: t.offsetParent !== null })),
        hiddenInputs: allInputs.map(i => ({ name: i.name, value: i.value?.substring(0, 80), type: i.type }))
      };
    });
    console.log('\nTEST 6 (System Prompt):');
    console.log('Prompt info:', JSON.stringify(promptInfo, null, 2));
    
    // Look for the system prompt in a rich text editor or visible textarea
    // The hidden input has the value, but there should be a visible editor
    const visibleTextareas = promptInfo.textareas.filter(t => t.visible);
    if (visibleTextareas.length > 0) {
      // The query refusal textarea is visible. The system prompt might be in a different component
      // Let's check for contenteditable or a specific component
      const editors = await page.evaluate(() => {
        const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
        const codeEditors = Array.from(document.querySelectorAll('[class*="editor"], [class*="prompt"], [class*="system"]'));
        return {
          editables: editables.map(e => ({ text: e.innerText?.substring(0, 80), className: e.className?.substring(0, 60) })),
          codeEditors: codeEditors.map(e => ({ tag: e.tagName, text: e.innerText?.substring(0, 80), className: e.className?.substring(0, 60) }))
        };
      });
      console.log('Editors:', JSON.stringify(editors, null, 2));
    }
    
    // Try to find and change the system prompt via the hidden input's paired visible element
    // Look for a textarea that might be the system prompt
    const systemPromptTextarea = await page.evaluate(() => {
      // The system prompt might be in a textarea without a name but with specific text
      const textareas = Array.from(document.querySelectorAll('textarea'));
      for (const t of textareas) {
        if (t.value && t.value.includes('helpful') || t.value.includes('political') || t.value.includes('assistant')) {
          return { found: true, value: t.value.substring(0, 100), id: t.id, name: t.name };
        }
      }
      // Check for a div that might contain the prompt
      const divs = Array.from(document.querySelectorAll('div'));
      for (const d of divs) {
        const text = d.innerText || '';
        if (text.includes('You are a helpful') && d.children.length < 3) {
          return { found: true, div: true, value: text.substring(0, 100), className: d.className?.substring(0, 60) };
        }
      }
      return { found: false };
    });
    console.log('System prompt element:', JSON.stringify(systemPromptTextarea, null, 2));
    
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 9: Create workspace
async function testCreateWorkspace() {
  const { browser, page, errors, token } = await loginAndSetup();
  try {
    // Try creating workspace via API first to verify the flow
    const wsName = 'playwright-test-' + Date.now();
    const createResp = await page.request.post('https://sinchat.delqhi.com/api/workspace/new', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: wsName }
    });
    const createData = await createResp.json();
    console.log('\nTEST 9 (Create Workspace):');
    console.log('API create result:', JSON.stringify(createData).substring(0, 200));
    
    if (createData.workspace) {
      // Navigate to the new workspace
      const slug = createData.workspace.slug;
      await page.goto(`https://sinchat.delqhi.com/workspace/${slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const pageText = await page.evaluate(() => document.body.innerText.substring(0, 200));
      console.log('New workspace page text:', pageText.substring(0, 200));
      
      // Clean up - delete the test workspace
      const delResp = await page.request.delete(`https://sinchat.delqhi.com/api/workspace/${slug}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Delete result:', delResp.status());
    }
    
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 11: Chat mode switch
async function testChatModeSwitch() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat/settings/chat-settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Find the chat mode buttons
    const chatModeBtn = page.locator('button', { hasText: 'Chat' });
    const queryModeBtn = page.locator('button', { hasText: 'Query' });
    const agentModeBtn = page.locator('button', { hasText: 'Agent' });
    
    console.log('\nTEST 11 (Chat Mode Switch):');
    console.log('Chat button count:', await chatModeBtn.count());
    console.log('Query button count:', await queryModeBtn.count());
    console.log('Agent button count:', await agentModeBtn.count());
    
    // Click "Query" mode
    if (await queryModeBtn.count() > 0) {
      await queryModeBtn.first().click();
      await page.waitForTimeout(2000);
      
      // Check the hidden input value
      const modeValue = await page.evaluate(() => {
        const input = document.querySelector('input[name="chatMode"]');
        return input?.value;
      });
      console.log('After clicking Query, chatMode value:', modeValue);
      
      // Click "Chat" mode back
      if (await chatModeBtn.count() > 0) {
        await chatModeBtn.first().click();
        await page.waitForTimeout(2000);
        const modeValue2 = await page.evaluate(() => {
          const input = document.querySelector('input[name="chatMode"]');
          return input?.value;
        });
        console.log('After clicking Chat, chatMode value:', modeValue2);
      }
    }
    
    await page.screenshot({ path: '/tmp/oschat-tests/11-chat-mode.png' });
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Run all tests
(async () => {
  await Promise.all([
    testMoreActions(),
    testSystemPrompt(),
    testCreateWorkspace(),
    testChatModeSwitch(),
  ]);
  console.log('\n--- BATCH 2 COMPLETE ---');
})();
