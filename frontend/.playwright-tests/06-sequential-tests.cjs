// SPDX-License-Identifier: MIT
const { chromium } = require('playwright');
const fs = require('fs');

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

async function testTemperatureSave() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat/settings/chat-settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    const tempInput = page.locator('input[name="openAiTemp"]');
    const beforeValue = await tempInput.inputValue();
    console.log('TEST 7 (Temperature Save):');
    console.log('Before:', beforeValue);
    await tempInput.fill('0.5');
    await page.waitForTimeout(500);
    const updateBtn = page.locator('button', { hasText: 'Update Workspace' }).first();
    if (await updateBtn.count() > 0) {
      await updateBtn.click();
      await page.waitForTimeout(3000);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      const afterValue = await page.locator('input[name="openAiTemp"]').inputValue();
      console.log('After reload:', afterValue, 'Persisted:', afterValue === '0.5');
      // Restore
      await page.locator('input[name="openAiTemp"]').fill(beforeValue);
      await page.waitForTimeout(500);
      await page.locator('button', { hasText: 'Update Workspace' }).first().click();
      await page.waitForTimeout(2000);
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
  } catch(e) { console.log('ERROR:', e.message); }
  await browser.close();
}

async function testDeleteWorkspaceUI() {
  const { browser, page, errors, token } = await loginAndSetup();
  try {
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
      page.on('dialog', async dialog => {
        console.log('Dialog:', dialog.type(), dialog.message()?.substring(0, 80));
        await dialog.accept();
      });
      await page.goto(`https://sinchat.delqhi.com/workspace/${slug}/settings/general-appearance`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      const deleteBtn = page.locator('button', { hasText: 'Delete Workspace' });
      if (await deleteBtn.count() > 0) {
        await deleteBtn.click();
        await page.waitForTimeout(5000);
        console.log('After delete URL:', page.url());
        console.log('Redirected to home:', page.url() === 'https://sinchat.delqhi.com/');
      }
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
  } catch(e) { console.log('ERROR:', e.message); }
  await browser.close();
}

async function testDocumentUpload() {
  const { browser, page, errors } = await loginAndSetup();
  try {
    await page.goto('https://sinchat.delqhi.com/workspace/opensin-chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    const testFile = '/tmp/oschat-tests/test-upload.txt';
    fs.writeFileSync(testFile, 'This is a test document for upload testing. The answer to everything is 42.');
    const fileInput = page.locator('input#dnd-chat-file-uploader');
    console.log('\nTEST 12 (Document Upload):');
    console.log('File input count:', await fileInput.count());
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(testFile);
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/tmp/oschat-tests/12-upload-result.png' });
      const uploadResult = await page.evaluate(() => {
        const body = document.body.innerText;
        return {
          bodySnippet: body.substring(0, 500),
          hasFile: body.includes('test-upload') || body.includes('uploading') || body.includes('processing') || body.includes('test document')
        };
      });
      console.log('Upload result:', JSON.stringify(uploadResult, null, 2));
    }
    console.log('Errors:', errors.filter(e => !e.includes('font')));
  } catch(e) { console.log('ERROR:', e.message); }
  await browser.close();
}

(async () => {
  await testTemperatureSave();
  await testDeleteWorkspaceUI();
  await testDocumentUpload();
  console.log('\n--- SEQUENTIAL TESTS COMPLETE ---');
})();
