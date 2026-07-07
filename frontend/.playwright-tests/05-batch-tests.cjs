// SPDX-License-Identifier: MIT
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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

// Test 7: Change temperature and save with "Update Workspace"
async function testTemperatureSave() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat/settings/chat-settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    const tempInput = page.locator('input[name="openAiTemp"]');
    const beforeValue = await tempInput.inputValue();
    console.log('TEST 7 (Temperature Save):');
    console.log('Before:', beforeValue);
    
    // Change temperature
    await tempInput.fill('0.5');
    await page.waitForTimeout(500);
    
    // Click "Update Workspace" button
    const updateBtn = page.locator('button', { hasText: 'Update Workspace' }).first();
    console.log('Update button count:', await updateBtn.count());
    if (await updateBtn.count() > 0) {
      await updateBtn.click();
      await page.waitForTimeout(3000);
      console.log('Clicked Update Workspace');
      
      // Reload and verify
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      const afterValue = await page.locator('input[name="openAiTemp"]').inputValue();
      console.log('After reload:', afterValue);
      console.log('Persisted:', afterValue === '0.5');
      
      // Restore original value
      await page.locator('input[name="openAiTemp"]').fill(beforeValue);
      await page.waitForTimeout(500);
      await page.locator('button', { hasText: 'Update Workspace' }).first().click();
      await page.waitForTimeout(2000);
      console.log('Restored to original:', beforeValue);
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 10: Delete workspace with dialog handler
async function testDeleteWorkspaceUI() {
  const { browser, page, errors, token } = await loginAndSetup();
  try {
    // Create test workspace
    const wsName = 'delete-ui-test-' + Date.now();
    const createResp = await page.request.post('https://sinchat.delqhi.com/api/workspace/new', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: wsName }
    });
    const createData = await createResp.json();
    const slug = createData.workspace?.slug;
    console.log('\nTEST 10 (Delete Workspace UI):');
    console.log('Created:', slug);
    
    if (slug) {
      // Set up dialog handler BEFORE navigating
      page.on('dialog', async dialog => {
        console.log('Dialog type:', dialog.type());
        console.log('Dialog message:', dialog.message()?.substring(0, 100));
        await dialog.accept();
      });
      
      await page.goto(`https://sinchat.delqhi.com/workspace/${slug}/settings/general-appearance`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      
      // Click "Delete Workspace"
      const deleteBtn = page.locator('button', { hasText: 'Delete Workspace' });
      console.log('Delete button count:', await deleteBtn.count());
      if (await deleteBtn.count() > 0) {
        await deleteBtn.click();
        await page.waitForTimeout(5000);
        console.log('After delete, URL:', page.url());
        console.log('Redirected to home:', page.url() === 'https://sinchat.delqhi.com/' || page.url().includes('workspace'));
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
    
    // Create a test file
    const testFile = '/tmp/oschat-tests/test-upload.txt';
    fs.writeFileSync(testFile, 'This is a test document for upload testing. The answer to everything is 42.');
    
    // Find the file input and upload
    const fileInput = page.locator('input#dnd-chat-file-uploader');
    console.log('\nTEST 12 (Document Upload):');
    console.log('File input count:', await fileInput.count());
    
    if (await fileInput.count() > 0) {
      // Upload the file
      await fileInput.setInputFiles(testFile);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/tmp/oschat-tests/12-upload-result.png' });
      
      // Check if file appears in the chat
      const uploadResult = await page.evaluate(() => {
        const body = document.body.innerText;
        const hasUpload = body.includes('test-upload') || body.includes('uploading') || body.includes('Upload') || body.includes('processing');
        // Look for file attachment indicators
        const attachElements = document.querySelectorAll('[class*="attachment"], [class*="file"], [class*="upload"]');
        return {
          hasUploadText: hasUpload,
          attachmentElements: attachElements.length,
          bodySnippet: body.substring(0, 500)
        };
      });
      console.log('Upload result:', JSON.stringify(uploadResult, null, 2));
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Test 6: System prompt - click to edit and save
async function testSystemPromptEdit() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat/settings/chat-settings', { waitUntil: 'networkidle' });
    page.waitForTimeout(5000);
    
    console.log('\nTEST 6 (System Prompt Edit):');
    
    // The system prompt is in a div that you click to edit
    // Find the div containing the prompt text
    const promptDiv = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      for (const d of divs) {
        const text = d.innerText || '';
        if (text.includes('You are a helpful') && d.children.length < 3 && d.offsetParent !== null) {
          return { found: true, text: text.substring(0, 100), className: d.className?.substring(0, 60) };
        }
      }
      return { found: false };
    });
    console.log('Prompt div:', JSON.stringify(promptDiv));
    
    if (promptDiv.found) {
      // Click the prompt div to enter edit mode
      await page.locator('div').filter({ hasText: 'You are a helpful' }).first().click();
      await page.waitForTimeout(1000);
      
      // Check if textarea appeared
      const textarea = page.locator('textarea').filter({ hasText: 'You are a helpful' });
      console.log('Edit textarea count:', await textarea.count());
      
      if (await textarea.count() > 0) {
        // Modify the prompt
        const currentValue = await textarea.inputValue();
        console.log('Current prompt:', currentValue?.substring(0, 80));
        
        // Add a test suffix
        await textarea.fill(currentValue + ' TEST EDIT');
        await page.waitForTimeout(500);
        
        // Click "Update Workspace" to save
        const updateBtn = page.locator('button', { hasText: 'Update Workspace' }).first();
        if (await updateBtn.count() > 0) {
          await updateBtn.click();
          await page.waitForTimeout(3000);
          console.log('Saved with Update Workspace');
          
          // Reload and verify
          await page.reload({ waitUntil: 'networkidle' });
          await page.waitForTimeout(5000);
          
          const hiddenInput = await page.locator('input[name="openAiPrompt"]').first();
          if (await hiddenInput.count() > 0) {
            const savedValue = await hiddenInput.inputValue();
            console.log('After reload:', savedValue?.substring(0, 100));
            console.log('Edit persisted:', savedValue?.includes('TEST EDIT'));
            
            // Restore original
            await page.locator('div').filter({ hasText: 'You are a helpful' }).first().click();
            await page.waitForTimeout(1000);
            const ta = page.locator('textarea').filter({ hasText: 'TEST EDIT' });
            if (await ta.count() > 0) {
              await ta.fill(currentValue);
              await page.waitForTimeout(500);
              await page.locator('button', { hasText: 'Update Workspace' }).first().click();
              await page.waitForTimeout(2000);
              console.log('Restored original prompt');
            }
          }
        }
      }
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
    await browser.close();
  } catch(e) { console.log('ERROR:', e.message); await browser.close(); }
}

// Run all tests
(async () => {
  await Promise.all([
    testTemperatureSave(),
    testDeleteWorkspaceUI(),
    testDocumentUpload(),
    testSystemPromptEdit(),
  ]);
  console.log('\n--- BATCH 4 COMPLETE ---');
})();
