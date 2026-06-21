const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://sinchat.delqhi.com';
const SCREENSHOT_DIR = '/var/folders/4k/w1vg2tbj7718gc0mj308m95m0000gn/T/opencode/screenshots';
const RESULTS_FILE = '/var/folders/4k/w1vg2tbj7718gc0mj308m95m0000gn/T/opencode/test-results.json';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const results = {
  consoleErrors: [],
  networkErrors: [],
  httpErrors: [],
  bugs: [],
  pageInfo: {},
  screenshots: []
};

function log(msg) {
  console.log(`[TEST] ${msg}`);
}

async function screenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  results.screenshots.push({ name, path: filepath });
  log(`Screenshot saved: ${name}.png`);
}

async function checkBranding(page, area) {
  const bodyText = await page.textContent('body') || '';
  const lower = bodyText.toLowerCase();
  
  // Check for AnythingLLM
  if (lower.includes('anythingllm')) {
    const idx = lower.indexOf('anythingllm');
    const context = bodyText.substring(Math.max(0, idx - 80), idx + 80);
    results.bugs.push({
      area: area,
      description: `Found "AnythingLLM" branding text. Context: "...${context}..."`,
      severity: 'high',
      fix: 'Replace "AnythingLLM" with "OpenSIN-AI" branding'
    });
  }
  
  // Check for Mintplex
  if (lower.includes('mintplex')) {
    const idx = lower.indexOf('mintplex');
    const context = bodyText.substring(Math.max(0, idx - 80), idx + 80);
    results.bugs.push({
      area: area,
      description: `Found "Mintplex" branding text. Context: "...${context}..."`,
      severity: 'high',
      fix: 'Replace "Mintplex" with "OpenSIN-AI" branding'
    });
  }
  
  // Check meta tags
  const metaContent = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('meta')).map(m => ({
      name: m.getAttribute('name') || m.getAttribute('property') || '',
      content: m.getAttribute('content') || ''
    }));
  });
  for (const meta of metaContent) {
    if (meta.content.toLowerCase().includes('anythingllm')) {
      results.bugs.push({
        area: area,
        description: `Meta tag "${meta.name}" contains "AnythingLLM": "${meta.content}"`,
        severity: 'medium',
        fix: 'Update meta tag to OpenSIN-AI branding'
      });
    }
    if (meta.content.toLowerCase().includes('mintplex')) {
      results.bugs.push({
        area: area,
        description: `Meta tag "${meta.name}" contains "Mintplex": "${meta.content}"`,
        severity: 'medium',
        fix: 'Update meta tag to OpenSIN-AI branding'
      });
    }
  }
  
  // Check title
  const title = await page.title();
  if (title.toLowerCase().includes('anythingllm')) {
    results.bugs.push({
      area: area,
      description: `Page title contains "AnythingLLM": "${title}"`,
      severity: 'medium',
      fix: 'Update page title to OpenSIN-AI branding'
    });
  }
  if (title.toLowerCase().includes('mintplex')) {
    results.bugs.push({
      area: area,
      description: `Page title contains "Mintplex": "${title}"`,
      severity: 'medium',
      fix: 'Update page title to OpenSIN-AI branding'
    });
  }
  
  return { bodyText, metaContent, title };
}

async function checki18n(page, area) {
  // Get all visible text nodes
  const allVisibleText = await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    const texts = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 2) {
        texts.push(text.substring(0, 300));
      }
    }
    return [...new Set(texts)];
  });
  
  // English strings that should be translated in a German locale
  const englishPhrases = [
    'Settings', 'Dashboard', 'Workspace', 'Workspaces', 'Chat', 'Send', 'Delete',
    'Create', 'Save', 'Cancel', 'Logout', 'Login', 'Sign in', 'Sign In',
    'Search', 'Profile', 'Account', 'Help', 'About', 'Documentation',
    'Welcome', 'Home', 'New', 'Edit', 'Update', 'Close', 'Confirm',
    'Yes', 'No', 'Loading', 'Error', 'Success', 'Warning',
    'General Settings', 'System Settings', 'Appearance', 'Security',
    'Customization', 'Data Connectors', 'Chat Settings',
    'LLM Preference', 'Embedding Preference', 'Vector Database',
    'User Management', 'Documents', 'Users', 'Theme',
    'Documents', 'Pinecone', 'Chroma', 'OpenAI',
    'Azure OpenAI', 'Anthropic', 'Fireworks', 'Native',
    'Available Workspaces', 'Select a workspace',
    'Send Message', 'Type your message',
    'User Setup', 'Multi User Mode',
    'Password', 'Confirm Password',
    'Logo', 'Favicon', 'Brand Color',
    'API Key', 'Base URL', 'Model',
    'Save Changes', 'Reset', 'Export',
    'Admin', 'Manager', 'User',
    'Workspace Settings', 'Thread',
    'Send a Message', 'API Base URL',
    'Send a message', 'No workspaces found',
    'No messages', 'No chat history',
    'Privacy', 'Terms', 'Support',
    'Back', 'Next', 'Previous', 'Continue',
    'System', 'General', 'Custom Chats',
    'Data', 'Security & Access', 'Experimental',
    'Image Logs', 'Chat Logs',
    'Inventory', 'Live Document',
    'Website Data', 'Password Protection',
    'Custom Messages', 'Custom Logo',
    'Chat History', 'New Workspace',
    'Configure', 'Configuration',
    'Model Provider', 'Chat Model',
    'Performance', 'Bugs', 'Feature Requests',
    'Report a Bug', 'Request a Feature',
    'Community', 'Discord', 'GitHub',
    'Privacy & Data', 'About OpenSIN',
    'Keyboard Shortcuts', 'Dismiss',
    'Drag and drop files', 'Browse files',
    'Max file size', 'Supported files',
    'Select Model', 'Choose a model',
    'Active', 'Inactive', 'Enabled', 'Disabled',
    'Created', 'Modified', 'Last Active',
    'Name', 'Description', 'Status',
    'Actions', 'Options', 'Preferences',
    'No results found', 'No data available',
    'Loading...', 'Saving...', 'Deleting...',
    'Are you sure?', 'This action cannot be undone',
    'Invalid', 'Required', 'Optional',
    'Email', 'Username', 'Role',
    'First Name', 'Last Name',
    'Create User', 'Edit User', 'Delete User',
    'Add User', 'Remove User',
    'Total Users', 'Total Workspaces',
    'Total Documents', 'Total Vectors',
    'Vector DB', 'Embedding Engine',
    'LLM Provider', 'Chat Provider',
    'Agent Provider', 'Agent Model',
    'Transcription Provider', 'Transcription Model',
    'Text-to-Speech', 'TTS Provider', 'TTS Model',
    'Speech-to-Text', 'STT Provider',
    'Vector Database Provider', 'Vector DB Provider',
    'Embedding Provider', 'Embedding Model',
    'Show Chat History', 'Open Workspace',
    'Welcome to', 'Get Started',
    'How does it work', 'What can I do',
    'Your workspace', 'Start chatting',
  ];

  const foundEnglish = [];
  for (const text of allVisibleText) {
    for (const eng of englishPhrases) {
      // Exact match or standalone word match
      if (text === eng) {
        foundEnglish.push({ english: eng, context: text, exact: true });
      } else if (text.startsWith(eng + ' ') || text.endsWith(' ' + eng) || text.includes(' ' + eng + ' ')) {
        foundEnglish.push({ english: eng, context: text, exact: false });
      }
    }
  }

  if (foundEnglish.length > 0) {
    results.pageInfo.untranslatedStrings = results.pageInfo.untranslatedStrings || [];
    for (const found of foundEnglish) {
      results.pageInfo.untranslatedStrings.push({ area, ...found });
      results.bugs.push({
        area: `i18n-${area}`,
        description: `Untranslated English string: "${found.english}" ${found.exact ? '(exact match)' : '(in context)'} — full text: "${found.context.substring(0, 150)}"`,
        severity: 'low',
        fix: `Translate "${found.english}" to German in i18n locale files`
      });
    }
  }
  
  return allVisibleText;
}

async function runTests() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'de-DE',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push({
        text: msg.text(),
        url: page.url()
      });
      log(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  // Collect network errors
  page.on('requestfailed', request => {
    // Skip favicon and similar non-critical requests
    const url = request.url();
    if (url.includes('favicon') && !url.includes('.ico')) return;
    results.networkErrors.push({
      url: url,
      failure: request.failure()?.errorText,
      method: request.method()
    });
    log(`NETWORK ERROR: ${url} - ${request.failure()?.errorText}`);
  });

  // Collect HTTP error responses
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      results.httpErrors.push({
        url: response.url(),
        status: status,
        statusText: response.statusText()
      });
      log(`HTTP ${status}: ${response.url()}`);
    }
  });

  // ==========================================
  // TEST 1: LOGIN PAGE
  // ==========================================
  log('=== TEST 1: LOGIN PAGE ===');
  try {
    await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await screenshot(page, '01-login-page');

    const title = await page.title();
    results.pageInfo.loginTitle = title;
    log(`Page title: ${title}`);

    // Check branding on login page
    const { bodyText, metaContent } = await checkBranding(page, 'login-page');
    
    // Get all visible text
    const loginTexts = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      const texts = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) texts.push(text);
      }
      return [...new Set(texts)];
    });
    results.pageInfo.loginPageTexts = loginTexts;
    log(`Login page texts: ${JSON.stringify(loginTexts.slice(0, 30))}`);

    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(img => img.naturalWidth === 0).map(img => ({
        src: img.src,
        alt: img.alt
      }));
    });
    if (brokenImages.length > 0) {
      results.bugs.push({
        area: 'login-page',
        description: `Broken images on login page: ${JSON.stringify(brokenImages)}`,
        severity: 'medium',
        fix: 'Fix or replace broken images'
      });
    }

    // Check form elements
    const formData = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map(inp => ({
        type: inp.type,
        name: inp.name,
        placeholder: inp.placeholder,
        id: inp.id,
        className: inp.className?.substring(0, 80)
      }));
    });
    results.pageInfo.loginFormInputs = formData;
    log(`Form inputs: ${JSON.stringify(formData)}`);

    // Check buttons
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent?.trim().substring(0, 50),
        type: btn.type,
        className: btn.className?.substring(0, 80)
      }));
    });
    results.pageInfo.loginButtons = buttons;
    log(`Buttons: ${JSON.stringify(buttons)}`);

    // Attempt login
    log('Attempting login...');
    try {
      // Try username field first
      const usernameField = page.locator('input[name="username"]').first();
      if (await usernameField.count() > 0) {
        await usernameField.fill('admin');
        log('Filled username field');
      } else {
        // Try email field
        const emailField = page.locator('input[type="email"]').first();
        if (await emailField.count() > 0) {
          await emailField.fill('admin');
          log('Filled email field');
        } else {
          // Try first text input
          const firstInput = page.locator('input[type="text"], input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').first();
          if (await firstInput.count() > 0) {
            await firstInput.fill('admin');
            log('Filled first text input');
          }
        }
      }

      const pwdField = page.locator('input[type="password"]').first();
      if (await pwdField.count() > 0) {
        await pwdField.fill('Simone123');
        log('Filled password field');
      }

      // Click submit button
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        log('Clicked submit button');
      } else {
        // Try any button with login-related text
        const loginBtn = page.locator('button').filter({ hasText: /Login|Sign in|Anmelden|login/i }).first();
        if (await loginBtn.count() > 0) {
          await loginBtn.click();
          log('Clicked login button by text');
        } else {
          await page.keyboard.press('Enter');
          log('Pressed Enter');
        }
      }

      await page.waitForTimeout(8000);
    } catch (loginErr) {
      log(`Login interaction error: ${loginErr.message}`);
    }

    const currentUrl = page.url();
    log(`Current URL after login: ${currentUrl}`);
    const isLoggedIn = !currentUrl.includes('login') && !currentUrl.includes('auth');
    log(`Login successful: ${isLoggedIn}`);
    await screenshot(page, '02-after-login');

    if (!isLoggedIn) {
      // Check what happened
      const postLoginTexts = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        const texts = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) texts.push(text);
        }
        return [...new Set(texts)].slice(0, 20);
      });
      log(`Post-login texts: ${JSON.stringify(postLoginTexts)}`);
      
      results.bugs.push({
        area: 'login',
        description: `Login failed with provided credentials (admin/Simone123). URL: ${currentUrl}. Page texts: ${JSON.stringify(postLoginTexts.slice(0, 10))}`,
        severity: 'high',
        fix: 'Check login credentials and authentication flow'
      });
    }

    if (isLoggedIn) {
      // ==========================================
      // TEST 2: DASHBOARD / WORKSPACE LIST
      // ==========================================
      log('=== TEST 2: DASHBOARD ===');
      await page.waitForTimeout(3000);
      await screenshot(page, '03-dashboard');
      
      const dashInfo = await checkBranding(page, 'dashboard');

      // Get all text on dashboard
      const dashTexts = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        const texts = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) texts.push(text);
        }
        return [...new Set(texts)];
      });
      results.pageInfo.dashboardTexts = dashTexts;
      log(`Dashboard texts: ${JSON.stringify(dashTexts.slice(0, 40))}`);

      // Check all links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          href: a.href,
          text: a.textContent?.trim().substring(0, 60)
        })).filter(l => l.text && l.text.length > 0);
      });
      results.pageInfo.dashboardLinks = links;
      log(`Links found: ${links.length}`);

      // Check sidebar content
      const sidebarInfo = await page.evaluate(() => {
        const sidebar = document.querySelector('[class*="sidebar"], [class*="Sidebar"], nav, aside');
        if (!sidebar) return null;
        return {
          text: sidebar.textContent?.trim().substring(0, 2000),
          links: Array.from(sidebar.querySelectorAll('a')).map(a => ({
            href: a.href,
            text: a.textContent?.trim().substring(0, 50)
          }))
        };
      });
      if (sidebarInfo) {
        results.pageInfo.sidebar = sidebarInfo;
        log(`Sidebar text: ${sidebarInfo.text?.substring(0, 200)}`);
      }

      // Check for broken images on dashboard
      const dashBrokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => img.naturalWidth === 0).map(img => ({
          src: img.src,
          alt: img.alt
        }));
      });
      if (dashBrokenImages.length > 0) {
        results.bugs.push({
          area: 'dashboard',
          description: `Broken images on dashboard: ${JSON.stringify(dashBrokenImages)}`,
          severity: 'medium',
          fix: 'Fix or replace broken images'
        });
      }

      // i18n check on dashboard
      await checki18n(page, 'dashboard');

      // ==========================================
      // TEST 3: SETTINGS PAGE
      // ==========================================
      log('=== TEST 3: SETTINGS PAGE ===');
      
      // Try to navigate to settings via URL
      await page.goto(`${SITE_URL}/settings/general`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await screenshot(page, '04-settings-general');

      const settingsInfo = await checkBranding(page, 'settings');
      
      const settingsTexts = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        const texts = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) texts.push(text);
        }
        return [...new Set(texts)];
      });
      results.pageInfo.settingsTexts = settingsTexts;
      log(`Settings texts: ${JSON.stringify(settingsTexts.slice(0, 40))}`);

      // Check all settings tabs/links
      const settingsLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="settings"]')).map(a => ({
          href: a.href,
          text: a.textContent?.trim().substring(0, 60)
        }));
      });
      results.pageInfo.settingsLinks = settingsLinks;
      log(`Settings links: ${JSON.stringify(settingsLinks)}`);

      // i18n check on settings
      await checki18n(page, 'settings');

      // Navigate to LLM settings
      log('Looking for LLM/Model settings...');
      const llmUrls = [
        '/settings/llm-preference',
        '/settings/llm',
        '/settings/ai-providers',
        '/settings/chat',
      ];
      
      let llmPageFound = false;
      for (const llmUrl of llmUrls) {
        try {
          await page.goto(`${SITE_URL}${llmUrl}`, { waitUntil: 'networkidle', timeout: 15000 });
          await page.waitForTimeout(2000);
          const pageText = await page.textContent('body') || '';
          if (pageText.length > 100 && !pageText.includes('404')) {
            log(`LLM settings page found at: ${llmUrl}`);
            llmPageFound = true;
            await screenshot(page, '05-settings-llm');
            
            const llmTexts = await page.evaluate(() => {
              const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
              const texts = [];
              let node;
              while (node = walker.nextNode()) {
                const text = node.textContent?.trim();
                if (text && text.length > 0) texts.push(text);
              }
              return [...new Set(texts)];
            });
            results.pageInfo.llmSettingsTexts = llmTexts;
            log(`LLM settings texts: ${JSON.stringify(llmTexts.slice(0, 40))}`);

            // Check for select elements and their options
            const selectData = await page.evaluate(() => {
              const selects = Array.from(document.querySelectorAll('select'));
              return selects.map(sel => ({
                name: sel.name,
                id: sel.id,
                className: sel.className?.substring(0, 80),
                options: Array.from(sel.querySelectorAll('option')).map(opt => ({
                  value: opt.value,
                  text: opt.textContent?.trim()
                }))
              }));
            });
            results.pageInfo.selectDropdowns = selectData;
            log(`Select dropdowns: ${JSON.stringify(selectData.map(s => ({ name: s.name, id: s.id, optionCount: s.options.length, options: s.options.slice(0, 10) })))}`);

            // Check for Fireworks models
            const fullText = await page.textContent('body') || '';
            const expectedModels = [
              'kimi-k2p7-code', 'kimi-k2p7-code-fast', 'minimax-m3', 'glm-5p2',
              'qwen3p7-plus', 'deepseek-v4-pro', 'qwen-3p7-plus',
              'accounts/fireworks/models/kimi-k2p7-code',
              'accounts/fireworks/models/minimax-m3',
              'accounts/fireworks/models/glm-5p2',
              'accounts/fireworks/models/qwen3p7-plus',
            ];
            const foundModels = expectedModels.filter(m => 
              fullText.toLowerCase().includes(m.toLowerCase())
            );
            results.pageInfo.foundFireworksModels = foundModels;
            log(`Fireworks models found in text: ${foundModels}`);

            // Also search for "fireworks" and "Fireworks" in all text and options
            const fireworksInOptions = selectData.flatMap(s => 
              s.options.filter(o => o.text.toLowerCase().includes('fireworks') || o.value.toLowerCase().includes('fireworks'))
            );
            log(`Fireworks in select options: ${JSON.stringify(fireworksInOptions)}`);

            // Check if "Fireworks" appears as a provider option
            const fireworksProviderFound = fullText.toLowerCase().includes('fireworks');
            if (!fireworksProviderFound) {
              results.bugs.push({
                area: 'settings-llm',
                description: 'Fireworks AI provider not found on LLM settings page',
                severity: 'high',
                fix: 'Add Fireworks AI as a provider option in LLM settings'
              });
            }

            // Check for model count - should have 12 Fireworks models
            if (foundModels.length < 4) {
              results.bugs.push({
                area: 'settings-llm',
                description: `Only ${foundModels.length} expected Fireworks models found. Expected 12 models including kimi-k2p7-code, minimax-m3, glm-5p2, qwen3p7-plus. Found: ${foundModels.join(', ')}`,
                severity: 'high',
                fix: 'Configure all 12 Fireworks AI models in the LLM provider settings'
              });
            }

            // Check branding on LLM settings
            await checkBranding(page, 'settings-llm');
            await checki18n(page, 'settings-llm');
            break;
          }
        } catch (e) {
          log(`LLM URL ${llmUrl} failed: ${e.message}`);
        }
      }

      if (!llmPageFound) {
        log('No LLM settings page found via URL, trying to click through settings tabs');
        // Try clicking through settings tabs
        await page.goto(`${SITE_URL}/settings/general`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(2000);
        
        // Try finding and clicking LLM-related links
        const tabLinks = await page.locator('a[href*="settings"]').all();
        for (const tabLink of tabLinks) {
          try {
            const text = await tabLink.textContent();
            const href = await tabLink.getAttribute('href');
            if (text && (text.toLowerCase().includes('llm') || text.toLowerCase().includes('model') || text.toLowerCase().includes('ai') || text.toLowerCase().includes('chat'))) {
              log(`Clicking settings tab: ${text} (${href})`);
              await tabLink.click();
              await page.waitForTimeout(3000);
              await screenshot(page, '05-settings-tab-clicked');
              
              const tabTexts = await page.evaluate(() => {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                const texts = [];
                let node;
                while (node = walker.nextNode()) {
                  const text = node.textContent?.trim();
                  if (text && text.length > 0) texts.push(text);
                }
                return [...new Set(texts)];
              });
              log(`Tab texts after click: ${JSON.stringify(tabTexts.slice(0, 20))}`);
              break;
            }
          } catch (e) {}
        }
      }

      // ==========================================
      // TEST 4: CHAT INTERFACE
      // ==========================================
      log('=== TEST 4: CHAT INTERFACE ===');
      
      // Navigate to home and try to open a workspace
      await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Get workspace links
      const workspaceLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).filter(a => {
          const href = a.href || '';
          return href.includes('workspace') || a.className?.includes('workspace');
        }).map(a => ({
          href: a.href,
          text: a.textContent?.trim().substring(0, 80)
        }));
      });
      results.pageInfo.workspaceLinks = workspaceLinks;
      log(`Workspace links: ${JSON.stringify(workspaceLinks.slice(0, 10))}`);

      // Try clicking first workspace link
      let chatOpened = false;
      if (workspaceLinks.length > 0) {
        try {
          await page.goto(workspaceLinks[0].href, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(3000);
          chatOpened = true;
          log(`Opened workspace: ${workspaceLinks[0].href}`);
        } catch (e) {
          log(`Failed to open workspace: ${e.message}`);
        }
      }

      if (!chatOpened) {
        // Try looking for workspace elements on page
        const wsElements = await page.locator('[class*="workspace"], [class*="card"]').all();
        log(`Found ${wsElements.length} workspace-like elements`);
        if (wsElements.length > 0) {
          try {
            await wsElements[0].click();
            await page.waitForTimeout(3000);
            chatOpened = true;
            log('Opened workspace by clicking element');
          } catch(e) { log(`Click failed: ${e.message}`); }
        }
      }

      await screenshot(page, '06-chat-interface');

      // Get chat page texts
      const chatTexts = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        const texts = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) texts.push(text);
        }
        return [...new Set(texts)];
      });
      results.pageInfo.chatTexts = chatTexts;
      log(`Chat texts: ${JSON.stringify(chatTexts.slice(0, 30))}`);

      // Check for chat input
      const chatInputData = await page.evaluate(() => {
        const textareas = Array.from(document.querySelectorAll('textarea'));
        const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
        const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
        return {
          textareas: textareas.map(t => ({
            placeholder: t.placeholder,
            className: t.className?.substring(0, 80),
            name: t.name,
            id: t.id
          })),
          textInputs: inputs.map(i => ({
            placeholder: i.placeholder,
            className: i.className?.substring(0, 80)
          })),
          editables: editables.length
        };
      });
      results.pageInfo.chatInputs = chatInputData;
      log(`Chat inputs: ${JSON.stringify(chatInputData)}`);

      // Check for model selector in chat
      const chatModelInfo = await page.evaluate(() => {
        // Check for any dropdown/select that might be a model selector
        const selects = Array.from(document.querySelectorAll('select'));
        const dropdowns = Array.from(document.querySelectorAll('[class*="model"], [class*="dropdown"], [role="combobox"], [role="listbox"]'));
        return {
          selects: selects.map(s => ({
            id: s.id,
            name: s.name,
            className: s.className?.substring(0, 80),
            options: Array.from(s.querySelectorAll('option')).map(o => o.textContent?.trim()).slice(0, 20)
          })),
          dropdowns: dropdowns.map(d => ({
            tag: d.tagName,
            className: d.className?.substring(0, 80),
            text: d.textContent?.trim().substring(0, 100)
          }))
        };
      });
      results.pageInfo.chatModelSelectors = chatModelInfo;
      log(`Chat model selectors: ${JSON.stringify(chatModelInfo)}`);

      // Try to send a message
      let messageSent = false;
      try {
        const textarea = page.locator('textarea').first();
        if (await textarea.count() > 0) {
          await textarea.fill('Hello, this is a test message. Please respond briefly.');
          await page.waitForTimeout(1000);
          log('Filled textarea with test message');
          await screenshot(page, '07-chat-typed');

          // Try to find send button
          const sendBtn = page.locator('button[type="submit"]').first();
          if (await sendBtn.count() > 0) {
            await sendBtn.click();
            messageSent = true;
            log('Clicked submit button to send message');
          } else {
            // Try Enter
            await page.keyboard.press('Enter');
            messageSent = true;
            log('Pressed Enter to send message');
          }
        }
      } catch (e) {
        log(`Failed to send message: ${e.message}`);
      }

      if (messageSent) {
        // Wait for response
        log('Waiting for chat response...');
        await page.waitForTimeout(20000);
        await screenshot(page, '08-chat-response');

        // Check for messages
        const messages = await page.evaluate(() => {
          // Try various selectors for chat messages
          const allText = document.body.textContent || '';
          
          // Check for common chat message patterns
          const messageElements = document.querySelectorAll(
            '[class*="message"], [class*="response"], [class*="chat-message"], [class*="bubble"], [class*="reply"], [class*="human"], [class*="ai"], [class*="assistant"]'
          );
          return {
            messageCount: messageElements.length,
            messages: Array.from(messageElements).map(m => ({
              className: m.className?.substring(0, 80),
              text: m.textContent?.trim().substring(0, 200)
            })).slice(0, 10),
            pageEndText: allText.substring(allText.length - 500)
          };
        });
        results.pageInfo.chatMessages = messages;
        log(`Chat messages found: ${messages.messageCount}`);
        log(`Message texts: ${JSON.stringify(messages.messages.slice(0, 5))}`);

        if (messages.messageCount < 2) {
          results.bugs.push({
            area: 'chat',
            description: 'No AI response received after sending a test message. Messages found: ' + messages.messageCount,
            severity: 'high',
            fix: 'Check LLM provider configuration and chat API endpoint'
          });
        }
      } else {
        results.bugs.push({
          area: 'chat',
          description: 'Could not find or interact with chat input to send a test message',
          severity: 'high',
          fix: 'Ensure chat interface input is properly rendered and functional'
        });
      }

      // Check branding and i18n on chat page
      await checkBranding(page, 'chat');
      await checki18n(page, 'chat');

      // ==========================================
      // TEST 5: THREAD/WORKSPACE MANAGEMENT
      // ==========================================
      log('=== TEST 5: THREAD/WORKSPACE MANAGEMENT ===');
      await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await screenshot(page, '09-workspace-list');

      // Look for "New Workspace" button
      const newWsInfo = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const newButtons = buttons.filter(b => {
          const text = b.textContent?.toLowerCase() || '';
          return text.includes('new') || text.includes('neu') || text.includes('create') || text.includes('erstellen');
        });
        return newButtons.map(b => ({
          tag: b.tagName,
          text: b.textContent?.trim().substring(0, 60),
          href: b.href,
          className: b.className?.substring(0, 80)
        }));
      });
      results.pageInfo.newWorkspaceButtons = newWsInfo;
      log(`New workspace buttons: ${JSON.stringify(newWsInfo)}`);

      // Try to create a new workspace
      if (newWsInfo.length > 0) {
        try {
          // Click the first "New" button
          const newBtn = page.locator('button, a').filter({ hasText: /new|neu|create|erstellen/i }).first();
          await newBtn.click();
          await page.waitForTimeout(3000);
          await screenshot(page, '10-new-workspace');
          
          const newTexts = await page.evaluate(() => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            const texts = [];
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent?.trim();
              if (text && text.length > 0) texts.push(text);
            }
            return [...new Set(texts)].slice(0, 30);
          });
          log(`After clicking new: ${JSON.stringify(newTexts)}`);
          results.pageInfo.newWorkspaceTexts = newTexts;
        } catch(e) {
          log(`Failed to click new workspace: ${e.message}`);
        }
      }

      // ==========================================
      // TEST 6: MOBILE RESPONSIVENESS
      // ==========================================
      log('=== TEST 6: MOBILE RESPONSIVENESS (375px) ===');
      await page.setViewportSize({ width: 375, height: 812 });
      
      // Test login page on mobile
      await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await screenshot(page, '11-mobile-login');

      // Check horizontal overflow
      const mobileOverflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      });
      results.pageInfo.mobileOverflow = mobileOverflow;
      log(`Mobile overflow: ${JSON.stringify(mobileOverflow)}`);

      if (mobileOverflow.hasHorizontalScroll) {
        results.bugs.push({
          area: 'mobile-login',
          description: `Horizontal scroll on mobile login page. Scroll width: ${mobileOverflow.scrollWidth}px, viewport: 375px`,
          severity: 'medium',
          fix: 'Add responsive CSS to prevent horizontal overflow on mobile viewport'
        });
      }

      // Check for elements exceeding viewport
      const wideElements = await page.evaluate(() => {
        const viewportWidth = 375;
        const elements = document.querySelectorAll('div, img, table, pre, code, iframe, section, header, footer, nav, main, aside');
        const wide = [];
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > viewportWidth + 5) {
            wide.push({
              tag: el.tagName,
              class: (el.className || '').toString().substring(0, 80),
              width: Math.round(rect.width),
              right: Math.round(rect.right)
            });
          }
        }
        return wide.slice(0, 10);
      });
      if (wideElements.length > 0) {
        results.pageInfo.mobileWideElements = wideElements;
        results.bugs.push({
          area: 'mobile-login',
          description: `${wideElements.length} elements exceed 375px mobile viewport width. First: ${JSON.stringify(wideElements[0])}`,
          severity: 'medium',
          fix: 'Apply responsive CSS (max-width: 100%, overflow-x: auto) to constrain element widths'
        });
        log(`Wide elements on mobile: ${JSON.stringify(wideElements.slice(0, 5))}`);
      }

      // Login on mobile and check dashboard
      try {
        const usernameField = page.locator('input[name="username"], input[type="email"], input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').first();
        if (await usernameField.count() > 0) {
          await usernameField.fill('admin');
          const pwdField = page.locator('input[type="password"]').first();
          if (await pwdField.count() > 0) {
            await pwdField.fill('Simone123');
            const submitBtn = page.locator('button[type="submit"]').first();
            if (await submitBtn.count() > 0) {
              await submitBtn.click();
            } else {
              await page.keyboard.press('Enter');
            }
            await page.waitForTimeout(5000);
          }
        }
      } catch(e) { log(`Mobile login error: ${e.message}`); }

      await screenshot(page, '12-mobile-dashboard');

      // Check mobile dashboard for overflow
      const mobileDashOverflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      });
      results.pageInfo.mobileDashOverflow = mobileDashOverflow;
      log(`Mobile dashboard overflow: ${JSON.stringify(mobileDashOverflow)}`);

      if (mobileDashOverflow.hasHorizontalScroll) {
        results.bugs.push({
          area: 'mobile-dashboard',
          description: `Horizontal scroll on mobile dashboard. Scroll width: ${mobileDashOverflow.scrollWidth}px, viewport: 375px`,
          severity: 'medium',
          fix: 'Add responsive CSS to prevent horizontal overflow on mobile dashboard'
        });
      }

      // Check mobile layout - are elements properly sized?
      const mobileLayout = await page.evaluate(() => {
        const sidebar = document.querySelector('[class*="sidebar"], [class*="Sidebar"], nav, aside');
        const header = document.querySelector('header, [class*="header"], [class*="Header"]');
        const main = document.querySelector('main, [class*="main"], [class*="content"]');
        
        const getInfo = (el, name) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            name,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            visible: rect.width > 0 && rect.height > 0,
            className: (el.className || '').toString().substring(0, 80)
          };
        };
        
        return {
          sidebar: getInfo(sidebar, 'sidebar'),
          header: getInfo(header, 'header'),
          main: getInfo(main, 'main')
        };
      });
      results.pageInfo.mobileLayout = mobileLayout;
      log(`Mobile layout: ${JSON.stringify(mobileLayout)}`);

      // ==========================================
      // TEST 7: CHECK ALL SETTINGS SUBPAGES
      // ==========================================
      log('=== TEST 7: ALL SETTINGS SUBPAGES ===');
      await page.setViewportSize({ width: 1440, height: 900 });
      
      // First get all settings links from the settings page
      await page.goto(`${SITE_URL}/settings/general`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const allSettingsLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="settings"]')).map(a => ({
          href: a.href,
          text: a.textContent?.trim().substring(0, 60)
        })).filter(l => l.text && l.text.length > 0);
      });
      
      // Also check for navigation items that might be settings
      const navItems = await page.evaluate(() => {
        const navLinks = Array.from(document.querySelectorAll('nav a, [class*="sidebar"] a, [class*="nav"] a'));
        return navLinks.map(a => ({
          href: a.href,
          text: a.textContent?.trim().substring(0, 60)
        })).filter(l => l.text && l.text.length > 0);
      });
      
      const allLinks = [...allSettingsLinks, ...navItems];
      const uniqueLinks = [...new Map(allLinks.map(l => [l.href, l])).values()];
      results.pageInfo.allSettingsLinks = uniqueLinks;
      log(`All settings links: ${JSON.stringify(uniqueLinks)}`);

      // Visit each settings page
      const settingsPages = uniqueLinks.filter(l => l.href.includes('settings'));
      for (let i = 0; i < Math.min(settingsPages.length, 20); i++) {
        const link = settingsPages[i];
        try {
          log(`Visiting settings page ${i}: ${link.text} (${link.href})`);
          await page.goto(link.href, { waitUntil: 'networkidle', timeout: 15000 });
          await page.waitForTimeout(2000);
          await screenshot(page, `13-settings-${i}-${link.text.replace(/[^a-z0-9]/gi, '_')}`);
          
          await checkBranding(page, `settings-${link.text}`);
          await checki18n(page, `settings-${link.text}`);
          
          // Get page texts for the settings subpage
          const pageTexts = await page.evaluate(() => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            const texts = [];
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent?.trim();
              if (text && text.length > 0) texts.push(text);
            }
            return [...new Set(texts)].slice(0, 30);
          });
          
          // Check for specific known issues
          const lowerTexts = pageTexts.map(t => t.toLowerCase());
          
          // Check for broken functionality indicators
          if (lowerTexts.some(t => t.includes('error') || t.includes('fehler'))) {
            const errorTexts = pageTexts.filter(t => t.toLowerCase().includes('error') || t.toLowerCase().includes('fehler'));
            if (errorTexts.length > 0) {
              results.bugs.push({
                area: `settings-${link.text}`,
                description: `Error text found on settings page: ${JSON.stringify(errorTexts.slice(0, 3))}`,
                severity: 'medium',
                fix: 'Investigate error messages on this settings page'
              });
            }
          }
          
          // Check for select dropdowns and their options
          const selects = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('select')).map(sel => ({
              id: sel.id,
              name: sel.name,
              className: sel.className?.substring(0, 80),
              options: Array.from(sel.querySelectorAll('option')).map(o => ({
                value: o.value,
                text: o.textContent?.trim()
              }))
            }));
          });
          if (selects.length > 0) {
            log(`Dropdowns on ${link.text}: ${JSON.stringify(selects.map(s => ({ name: s.name, id: s.id, options: s.options.slice(0, 5) })))}`);
            // Store for later analysis
            results.pageInfo[`settings-${link.text}-dropdowns`] = selects;
          }
          
        } catch (e) {
          log(`Failed to visit ${link.href}: ${e.message}`);
        }
      }

      // ==========================================
      // TEST 8: FOOTER CHECK
      // ==========================================
      log('=== TEST 8: FOOTER CHECK ===');
      await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const footerInfo = await page.evaluate(() => {
        const footer = document.querySelector('footer, [class*="footer"], [class*="Footer"]');
        if (!footer) return null;
        return {
          text: footer.textContent?.trim().substring(0, 500),
          html: footer.innerHTML?.substring(0, 1000),
          links: Array.from(footer.querySelectorAll('a')).map(a => ({
            href: a.href,
            text: a.textContent?.trim()
          }))
        };
      });
      results.pageInfo.footer = footerInfo;
      log(`Footer: ${JSON.stringify(footerInfo)}`);

      if (footerInfo) {
        if (footerInfo.text?.toLowerCase().includes('anythingllm')) {
          results.bugs.push({
            area: 'footer',
            description: `Footer contains "AnythingLLM" branding: "${footerInfo.text.substring(0, 200)}"`,
            severity: 'high',
            fix: 'Replace "AnythingLLM" with "OpenSIN-AI" branding in footer'
          });
        }
        if (footerInfo.text?.toLowerCase().includes('mintplex')) {
          results.bugs.push({
            area: 'footer',
            description: `Footer contains "Mintplex" branding: "${footerInfo.text.substring(0, 200)}"`,
            severity: 'high',
            fix: 'Replace "Mintplex" with "OpenSIN-AI" branding in footer'
          });
        }
      }

      // ==========================================
      // TEST 9: API HEALTH CHECKS
      // ==========================================
      log('=== TEST 9: API HEALTH CHECKS ===');
      const apiEndpoints = [
        '/api/health',
        '/api/v1/workspaces',
        '/api/v1/system/preferences',
        '/api/v1/system/system-vectors',
        '/api/v1/users',
        '/api/v1/auth',
      ];

      for (const endpoint of apiEndpoints) {
        try {
          const response = await page.evaluate(async (url) => {
            try {
              const resp = await fetch(url, { credentials: 'include' });
              const text = await resp.text().catch(() => '');
              return { 
                status: resp.status, 
                ok: resp.ok, 
                statusText: resp.statusText,
                body: text.substring(0, 200)
              };
            } catch (e) {
              return { error: e.message };
            }
          }, `${SITE_URL}${endpoint}`);
          
          results.pageInfo.apiHealth = results.pageInfo.apiHealth || {};
          results.pageInfo.apiHealth[endpoint] = response;
          log(`API ${endpoint}: ${JSON.stringify(response)}`);
          
          if (response.status >= 500) {
            results.bugs.push({
              area: 'api',
              description: `API endpoint ${endpoint} returned server error ${response.status}: ${response.body}`,
              severity: 'high',
              fix: `Fix server error on ${endpoint}`
            });
          }
        } catch (e) {
          log(`API check failed for ${endpoint}: ${e.message}`);
        }
      }

      // ==========================================
      // TEST 10: CHECK PAGE SOURCE FOR BRANDING
      // ==========================================
      log('=== TEST 10: PAGE SOURCE BRANDING CHECK ===');
      const pageSource = await page.content();
      const sourceLower = pageSource.toLowerCase();
      
      // Check for branding in various HTML contexts
      const brandingPatterns = [
        { pattern: 'anythingllm', desc: 'AnythingLLM' },
        { pattern: 'mintplex', desc: 'Mintplex' },
        { pattern: 'mintplex labs', desc: 'Mintplex Labs' },
        { pattern: 'mintplex-labs', desc: 'Mintplex Labs (hyphenated)' },
      ];
      
      for (const { pattern, desc } of brandingPatterns) {
        const count = (sourceLower.match(new RegExp(pattern, 'g')) || []).length;
        if (count > 0) {
          // Find context
          const idx = sourceLower.indexOf(pattern);
          const context = pageSource.substring(Math.max(0, idx - 100), idx + pattern.length + 100);
          results.bugs.push({
            area: 'page-source',
            description: `Found "${desc}" in page source (${count} occurrences). Context: ...${context.replace(/\n/g, ' ')}...`,
            severity: pattern.includes('mintplex') ? 'high' : 'high',
            fix: `Replace "${desc}" with "OpenSIN-AI" branding throughout the codebase`
          });
        }
      }

      // Check for links to original AnythingLLM sites
      const externalLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(href => 
          href.includes('anythingllm') || href.includes('mintplex') || href.includes('useanything')
        );
      });
      if (externalLinks.length > 0) {
        results.bugs.push({
          area: 'external-links',
          description: `Found links to original AnythingLLM/Mintplex sites: ${JSON.stringify(externalLinks)}`,
          severity: 'high',
          fix: 'Update external links to point to OpenSIN-AI resources'
        });
      }

      // ==========================================
      // TEST 11: CHECK FAVICON AND LOGO
      // ==========================================
      log('=== TEST 11: FAVICON AND LOGO ===');
      const faviconInfo = await page.evaluate(() => {
        const favicons = Array.from(document.querySelectorAll('link[rel*="icon"]'));
        return favicons.map(f => ({
          rel: f.rel,
          href: f.href,
          type: f.type
        }));
      });
      results.pageInfo.favicons = faviconInfo;
      log(`Favicons: ${JSON.stringify(faviconInfo)}`);

      // Check for logo references
      const logoInfo = await page.evaluate(() => {
        const logos = Array.from(document.querySelectorAll('img[class*="logo"], img[alt*="logo" i], img[src*="logo"], [class*="brand-logo"], [class*="logo"]'));
        return logos.map(l => ({
          tag: l.tagName,
          src: l.src || l.style?.backgroundImage,
          alt: l.alt,
          className: (l.className || '').toString().substring(0, 80)
        }));
      });
      results.pageInfo.logos = logoInfo;
      log(`Logos: ${JSON.stringify(logoInfo)}`);

      // Check if favicon URL contains anythingllm
      for (const fav of faviconInfo) {
        if (fav.href?.toLowerCase().includes('anythingllm')) {
          results.bugs.push({
            area: 'favicon',
            description: `Favicon URL contains "AnythingLLM": ${fav.href}`,
            severity: 'medium',
            fix: 'Replace favicon with OpenSIN-AI branded icon'
          });
        }
      }

      // ==========================================
      // TEST 12: CHECK THEME/DARK MODE
      // ==========================================
      log('=== TEST 12: THEME/DARK MODE ===');
      const themeInfo = await page.evaluate(() => {
        const root = document.documentElement;
        return {
          colorScheme: getComputedStyle(root).colorScheme,
          dataTheme: root.getAttribute('data-theme'),
          classList: root.className,
          bgColor: getComputedStyle(document.body).backgroundColor,
          textColor: getComputedStyle(document.body).color
        };
      });
      results.pageInfo.theme = themeInfo;
      log(`Theme: ${JSON.stringify(themeInfo)}`);

    } // end if isLoggedIn

  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    log(error.stack || '');
    results.bugs.push({
      area: 'global',
      description: `Test execution error: ${error.message}`,
      severity: 'high',
      fix: 'Investigate test failure'
    });
  }

  // Write results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  log(`\n=== RESULTS ===`);
  log(`Total bugs found: ${results.bugs.length}`);
  log(`Console errors: ${results.consoleErrors.length}`);
  log(`Network errors: ${results.networkErrors.length}`);
  log(`HTTP errors: ${results.httpErrors.length}`);
  log(`Results written to ${RESULTS_FILE}`);

  await browser.close();
}

runTests().catch(err => {
  console.error('UNHANDLED ERROR:', err);
  process.exit(1);
});
