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
    localStorage.setItem('openafd_authToken', t);
    localStorage.setItem('openafd_user', JSON.stringify({ username: 'admin', role: 'admin' }));
    localStorage.setItem('openafd_theme', 'dark');
    localStorage.setItem('i18nextLng', 'en');
  }, token);
  return { browser, page, errors, token };
}

// Test 4: Copy message
async function testCopyMessage() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Click the first Copy button
    const copyBtn = page.locator('button[aria-label="Copy"]').first();
    if (await copyBtn.count() > 0) {
      await copyBtn.click();
      await page.waitForTimeout(1000);
      
      // Check if copy was successful (look for visual feedback)
      const copyResult = await page.evaluate(() => {
        const btns = document.querySelectorAll('button[aria-label="Copy"]');
        for (const btn of btns) {
          const svg = btn.querySelector('svg');
          if (svg && svg.classList.contains('text-green-500')) {
            return { success: true, message: 'Copy button turned green' };
          }
        }
        return { success: false };
      });
      console.log('TEST 4 (Copy Message):', JSON.stringify(copyResult));
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 5: Feedback (thumbs up)
async function testFeedback() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Click the "Good response" button
    const goodBtn = page.locator('button[aria-label="Good response"]').first();
    if (await goodBtn.count() > 0) {
      const beforeClass = await goodBtn.evaluate(el => el.className);
      await goodBtn.click();
      await page.waitForTimeout(2000);
      const afterClass = await goodBtn.evaluate(el => el.className);
      console.log('TEST 5 (Feedback):');
      console.log('Before:', beforeClass.substring(0, 80));
      console.log('After:', afterClass.substring(0, 80));
      console.log('Class changed:', beforeClass !== afterClass);
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 7: Change temperature
async function testTemperature() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat/settings/chat-settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Find the temperature input
    const tempInput = page.locator('input[name="openAiTemp"]');
    if (await tempInput.count() > 0) {
      const beforeValue = await tempInput.inputValue();
      console.log('TEST 7 (Temperature):');
      console.log('Before:', beforeValue);
      
      // Change the value
      await tempInput.fill('0.5');
      await page.waitForTimeout(500);
      const afterValue = await tempInput.inputValue();
      console.log('After change:', afterValue);
      
      // Look for a Save button
      const saveBtn = page.locator('button', { hasText: /save/i }).first();
      if (await saveBtn.count() > 0) {
        console.log('Save button found, clicking...');
        await saveBtn.click();
        await page.waitForTimeout(3000);
        
        // Reload and check
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        const persistedValue = await page.locator('input[name="openAiTemp"]').inputValue();
        console.log('After reload:', persistedValue);
        console.log('Persisted:', persistedValue === '0.5');
      } else {
        console.log('No save button found - checking for auto-save');
        // Look for any save mechanism
        const allBtns = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null).map(b => b.innerText?.substring(0, 30)).filter(Boolean);
        });
        console.log('Available buttons:', allBtns);
      }
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 10: Delete workspace via UI
async function testDeleteWorkspace() {
  const { browser, page, errors, token } = await loginAndSetup();
  try {
    // First create a test workspace
    const wsName = 'delete-test-' + Date.now();
    const createResp = await page.request.post('https://sinchat.delqhi.com/api/workspace/new', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: wsName }
    });
    const createData = await createResp.json();
    const slug = createData.workspace?.slug;
    console.log('TEST 10 (Delete Workspace):');
    console.log('Created test workspace:', slug);
    
    if (slug) {
      // Navigate to workspace settings → General Appearance
      await page.goto(`https://sinchat.delqhi.com/workspace/${slug}/settings/general-appearance`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/tmp/oschat-tests/10-general-appearance.png' });
      
      // Look for delete workspace button
      const deleteInfo = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.filter(b => b.offsetParent !== null).map(b => ({
          text: b.innerText?.substring(0, 50).replace(/\n/g, ' '),
          aria: b.getAttribute('aria-label') || '',
          type: b.type,
          className: b.className?.substring(0, 60)
        })).filter(b => b.text.toLowerCase().includes('delete') || b.aria.toLowerCase().includes('delete'));
      });
      console.log('Delete buttons:', JSON.stringify(deleteInfo, null, 2));
      
      // Try clicking delete
      const deleteBtn = page.locator('button', { hasText: /delete/i }).first();
      if (await deleteBtn.count() > 0) {
        await deleteBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/oschat-tests/10-delete-dialog.png' });
        
        // Check for confirmation dialog
        const dialogInfo = await page.evaluate(() => {
          const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"], [role="dialog"]');
          const confirmBtns = [];
          for (const modal of modals) {
            if (modal.offsetParent !== null) {
              const btns = modal.querySelectorAll('button');
              for (const btn of btns) {
                confirmBtns.push({ text: btn.innerText?.substring(0, 30), className: btn.className?.substring(0, 60) });
              }
            }
          }
          return confirmBtns;
        });
        console.log('Dialog buttons:', JSON.stringify(dialogInfo, null, 2));
        
        // Click confirm delete
        const confirmBtn = page.locator('button', { hasText: /delete|confirm|yes/i }).last();
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
          await page.waitForTimeout(3000);
          console.log('After delete, URL:', page.url());
        }
      }
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 12: Upload document inline
async function testDocumentUpload() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Look for attach/upload button
    const uploadInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
      return {
        buttons: btns.filter(b => b.offsetParent !== null).map(b => ({
          text: b.innerText?.substring(0, 30),
          aria: b.getAttribute('aria-label') || '',
          title: b.getAttribute('title') || ''
        })).filter(b => b.aria.toLowerCase().includes('attach') || b.aria.toLowerCase().includes('upload') || b.aria.toLowerCase().includes('file') || b.text.toLowerCase().includes('upload') || b.text.toLowerCase().includes('attach')),
        fileInputs: inputs.map(i => ({ id: i.id, name: i.name, accept: i.accept, visible: i.offsetParent !== null }))
      };
    });
    console.log('TEST 12 (Document Upload):');
    console.log('Upload buttons:', JSON.stringify(uploadInfo.buttons, null, 2));
    console.log('File inputs:', JSON.stringify(uploadInfo.fileInputs, null, 2));
    
    // Look for the attach button in the prompt area
    const attachInfo = await page.evaluate(() => {
      const promptArea = document.querySelector('#primary-prompt-input')?.closest('form') || document.querySelector('#primary-prompt-input')?.parentElement?.parentElement;
      if (!promptArea) return { error: 'no prompt area' };
      const btns = promptArea.querySelectorAll('button');
      return Array.from(btns).map(b => ({
        text: b.innerText?.substring(0, 30),
        aria: b.getAttribute('aria-label') || '',
        title: b.getAttribute('title') || '',
        svg: b.querySelector('svg')?.getAttribute('data-icon') || ''
      }));
    });
    console.log('Prompt area buttons:', JSON.stringify(attachInfo, null, 2));
    
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Run all tests
(async () => {
  await Promise.all([
    testCopyMessage(),
    testFeedback(),
    testTemperature(),
    testDeleteWorkspace(),
    testDocumentUpload(),
  ]);
  console.log('\n--- BATCH 3 COMPLETE ---');
})();
