const { chromium } = require('playwright');
const fs = require('fs');

const SITE_URL = 'https://sinchat.delqhi.com';
const RESULTS_FILE = '/var/folders/4k/w1vg2tbj7718gc0mj308m95m0000gn/T/opencode/test-results-2.json';

const results = { bugs: [], pageInfo: {} };

function log(msg) {
  console.log(`[TEST2] ${msg}`);
}

async function runTests() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'de-DE'
  });

  const page = await context.newPage();

  // Login first
  log('Logging in...');
  await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[type="password"]').fill('Simone123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  log(`Logged in, URL: ${page.url()}`);

  // ==========================================
  // INVESTIGATION 1: Profile picture 404/ABORTED
  // ==========================================
  log('=== INVESTIGATION 1: Profile Picture Error ===');
  const pfpResponse = await page.evaluate(async () => {
    try {
      const resp = await fetch('/api/system/pfp/1', { credentials: 'include' });
      const text = await resp.text();
      return { status: resp.status, statusText: resp.statusText, body: text.substring(0, 200), contentType: resp.headers.get('content-type') };
    } catch (e) {
      return { error: e.message };
    }
  });
  results.pageInfo.profilePicture = pfpResponse;
  log(`Profile picture API: ${JSON.stringify(pfpResponse)}`);

  // ==========================================
  // INVESTIGATION 2: Settings 404 - check all settings routes
  // ==========================================
  log('=== INVESTIGATION 2: Settings Routes ===');
  const settingsRoutes = [
    '/settings/general',
    '/settings/system',
    '/settings/llm-preference',
    '/settings/embedding-preference',
    '/settings/vector-database',
    '/settings/security',
    '/settings/customization',
    '/settings/data-connectors',
    '/settings/agent-skills',
    '/settings/chat-settings',
    '/settings/transcription',
    '/settings/users',
    '/settings/appearance',
    '/settings/institutional',
    '/settings/experimental',
    '/settings/system-preferences',
    '/settings/custom-models',
  ];
  
  for (const route of settingsRoutes) {
    try {
      const response = await page.goto(`${SITE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const status = response?.status() || 0;
      const finalUrl = page.url();
      const pageText = await page.textContent('body') || '';
      const is404 = pageText.includes('404') || pageText.includes('Seite nicht gefunden');
      
      const routeInfo = { status, finalUrl, is404, pageTextStart: pageText.substring(0, 200) };
      results.pageInfo[`route-${route}`] = routeInfo;
      
      if (is404) {
        log(`404 on ${route}`);
        results.bugs.push({
          area: `settings-route-${route}`,
          description: `Settings page ${route} shows 404 "Seite nicht gefunden"`,
          severity: 'high',
          fix: `Fix routing for ${route} or remove the navigation link if the page doesn't exist`
        });
      } else {
        log(`OK (${status}) on ${route}`);
      }
    } catch (e) {
      log(`Error on ${route}: ${e.message}`);
      results.pageInfo[`route-${route}`] = { error: e.message };
    }
  }

  // ==========================================
  // INVESTIGATION 3: Chat Response - verify it actually worked
  // ==========================================
  log('=== INVESTIGATION 3: Chat Response Deep Check ===');
  
  // Re-navigate to workspace (session might have been disrupted by settings 404s)
  await page.goto(`${SITE_URL}/workspace/opensin-chat`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // Check if we need to re-login
  if (page.url().includes('login') || page.url().includes('auth')) {
    log('Session lost, re-logging in...');
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[type="password"]').fill('Simone123');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);
    await page.goto(`${SITE_URL}/workspace/opensin-chat`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  // Check current model displayed in chat
  const chatModelInfo = await page.evaluate(() => {
    // Look for model name in the page - it often appears near the response
    const allText = document.body.innerText;
    
    // Find model references
    const modelPatterns = allText.match(/accounts\/fireworks\/models\/[a-z0-9-]+/gi) || [];
    const modelDisplay = allText.match(/(?:deepseek|minimax|glm|kimi|qwen|gpt-oss)[a-z0-9.-]*/gi) || [];
    
    // Check for any dropdown or select that shows current model
    const selects = Array.from(document.querySelectorAll('select'));
    const selectInfo = selects.map(s => ({
      id: s.id,
      name: s.name,
      value: s.value,
      className: s.className?.substring(0, 80)
    }));
    
    // Check for model display element
    const modelDisplayEls = document.querySelectorAll('[class*="model"], [data-model], [class*="response"]');
    const modelTexts = Array.from(modelDisplayEls).map(el => el.textContent?.trim().substring(0, 100));
    
    return {
      modelPatterns: [...new Set(modelPatterns)],
      modelDisplay: [...new Set(modelDisplay)],
      selects: selectInfo,
      modelTexts: modelTexts.slice(0, 10)
    };
  });
  results.pageInfo.chatModelInfo = chatModelInfo;
  log(`Chat model info: ${JSON.stringify(chatModelInfo)}`);

  // Send a new test message and watch the response more carefully
  log('Sending test message...');
  const textarea = page.locator('textarea').first();
  await textarea.fill('Was ist 1+1?');
  await page.waitForTimeout(500);
  
  // Monitor network for chat request
  const networkRequests = [];
  page.on('request', req => {
    if (req.url().includes('/api/') && (req.method() === 'POST' || req.url().includes('chat') || req.url().includes('stream'))) {
      networkRequests.push({ url: req.url(), method: req.method() });
    }
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/') && (resp.url().includes('chat') || resp.url().includes('stream') || resp.url().includes('workspace'))) {
      networkRequests.push({ url: resp.url(), status: resp.status, type: 'response' });
    }
  });
  
  // Send the message
  const submitBtn = page.locator('button[type="submit"]').first();
  if (await submitBtn.count() > 0) {
    await submitBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }
  
  // Wait for response
  await page.waitForTimeout(25000);
  
  // Get the full page text to see if response appeared
  const fullPageText = await page.evaluate(() => document.body.innerText);
  
  // Find the response
  const hasResponse = fullPageText.includes('2') || fullPageText.includes('zwei') || fullPageText.includes('Two');
  const responseSection = fullPageText.substring(fullPageText.length - 1000);
  results.pageInfo.chatResponseText = responseSection;
  results.pageInfo.networkRequests = networkRequests;
  log(`Network requests: ${JSON.stringify(networkRequests)}`);
  log(`Response section (last 1000 chars): ${responseSection}`);
  
  // Get all message-like elements more carefully
  const messageElements = await page.evaluate(() => {
    // Try to find chat message containers
    const allDivs = document.querySelectorAll('div');
    const messages = [];
    for (const div of allDivs) {
      const cls = div.className || '';
      if (typeof cls === 'string' && (cls.includes('message') || cls.includes('response') || cls.includes('chat-history') || cls.includes('bubble') || cls.includes('reply') || cls.includes('markdown') || cls.includes('prose'))) {
        const text = div.textContent?.trim();
        if (text && text.length > 5 && text.length < 500) {
          messages.push({ className: cls.substring(0, 80), text: text.substring(0, 200) });
        }
      }
    }
    return messages.slice(-15);
  });
  results.pageInfo.messageElements = messageElements;
  log(`Message elements: ${JSON.stringify(messageElements.slice(-5))}`);

  // ==========================================
  // INVESTIGATION 4: Mobile sidebar - 292px is too wide for 375px viewport
  // ==========================================
  log('=== INVESTIGATION 4: Mobile Sidebar Width ===');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Login on mobile
  try {
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[type="password"]').fill('Simone123');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);
  } catch(e) {}

  const mobileSidebarInfo = await page.evaluate(() => {
    const sidebar = document.querySelector('[class*="sidebar"], nav, aside');
    if (!sidebar) return null;
    const rect = sidebar.getBoundingClientRect();
    const computed = window.getComputedStyle(sidebar);
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      position: computed.position,
      display: computed.display,
      visibility: computed.visibility,
      transform: computed.transform,
      zIndex: computed.zIndex,
      overflow: computed.overflow,
      overflowX: computed.overflowX,
      viewportWidth: window.innerWidth,
      takesFullWidth: rect.width >= window.innerWidth * 0.9,
      isOverlay: computed.position === 'fixed' || computed.position === 'absolute',
      hasToggle: !!document.querySelector('[class*="toggle"], [class*="hamburger"], [class*="menu-btn"], button[aria-label*="menu" i]')
    };
  });
  results.pageInfo.mobileSidebar = mobileSidebarInfo;
  log(`Mobile sidebar: ${JSON.stringify(mobileSidebarInfo)}`);

  // Check if sidebar covers the full viewport on mobile
  if (mobileSidebarInfo && mobileSidebarInfo.width > 200) {
    const sidebarCoverage = (mobileSidebarInfo.width / mobileSidebarInfo.viewportWidth) * 100;
    if (sidebarCoverage > 70 && !mobileSidebarInfo.isOverlay) {
      results.bugs.push({
        area: 'mobile-sidebar',
        description: `Sidebar takes ${Math.round(sidebarCoverage)}% of mobile viewport (${mobileSidebarInfo.width}px of ${mobileSidebarInfo.viewportWidth}px) and is not positioned as overlay (${mobileSidebarInfo.position}). This leaves only ${mobileSidebarInfo.viewportWidth - mobileSidebarInfo.width}px for content.`,
        severity: 'high',
        fix: 'On mobile (<=768px), sidebar should be hidden by default and shown as an overlay drawer when a menu button is clicked. Add responsive CSS to collapse the sidebar.'
      });
    } else if (sidebarCoverage > 70 && mobileSidebarInfo.isOverlay) {
      log('Sidebar is overlay - acceptable for mobile');
    }
  }

  // Check if there's a hamburger menu / toggle button
  const toggleInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const toggles = buttons.filter(b => {
      const text = b.textContent?.toLowerCase() || '';
      const ariaLabel = b.getAttribute('aria-label')?.toLowerCase() || '';
      const cls = (b.className || '').toString().toLowerCase();
      return text.includes('menu') || ariaLabel.includes('menu') || cls.includes('toggle') || cls.includes('hamburger') || cls.includes('sidebar');
    });
    return toggles.map(t => ({
      text: t.textContent?.trim().substring(0, 50),
      ariaLabel: t.getAttribute('aria-label'),
      className: (t.className || '').toString().substring(0, 80),
      visible: t.getBoundingClientRect().width > 0
    }));
  });
  results.pageInfo.mobileToggle = toggleInfo;
  log(`Mobile toggle buttons: ${JSON.stringify(toggleInfo)}`);

  // ==========================================
  // INVESTIGATION 5: Check all settings pages properly via the settings nav
  // ==========================================
  log('=== INVESTIGATION 5: Settings Navigation ===');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${SITE_URL}/settings/llm-preference`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Get all settings navigation links from the actual settings page
  const settingsNavLinks = await page.evaluate(() => {
    const navLinks = Array.from(document.querySelectorAll('a'));
    return navLinks.filter(a => a.href.includes('/settings/')).map(a => ({
      href: a.href,
      text: a.textContent?.trim().substring(0, 60),
      active: a.classList.contains('active') || a.getAttribute('aria-current') === 'page'
    }));
  });
  results.pageInfo.settingsNavLinks = settingsNavLinks;
  log(`Settings nav links: ${JSON.stringify(settingsNavLinks)}`);

  // Visit each settings page and check for issues
  for (const link of settingsNavLinks) {
    try {
      const route = link.href.replace(SITE_URL, '');
      log(`Checking settings page: ${link.text} (${route})`);
      await page.goto(link.href, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      
      const pageText = await page.textContent('body') || '';
      const pageTitle = await page.title();
      
      // Check for 404
      if (pageText.includes('404') || pageText.includes('Seite nicht gefunden')) {
        results.bugs.push({
          area: `settings-${route}`,
          description: `Settings page returns 404: ${link.text} (${route}). Page title: "${pageTitle}"`,
          severity: 'high',
          fix: `Fix routing for ${route} or remove the navigation link if the page doesn't exist`
        });
        log(`BUG: 404 on ${route}`);
      }
      
      // Check for "AnythingLLM" or "Mintplex"
      if (pageText.toLowerCase().includes('anythingllm')) {
        const idx = pageText.toLowerCase().indexOf('anythingllm');
        const context = pageText.substring(Math.max(0, idx - 60), idx + 60);
        results.bugs.push({
          area: `settings-${route}`,
          description: `Found "AnythingLLM" branding on settings page ${link.text}: context "${context}"`,
          severity: 'high',
          fix: 'Replace "AnythingLLM" with "OpenSIN-AI" branding'
        });
      }
      if (pageText.toLowerCase().includes('mintplex')) {
        const idx = pageText.toLowerCase().indexOf('mintplex');
        const context = pageText.substring(Math.max(0, idx - 60), idx + 60);
        results.bugs.push({
          area: `settings-${route}`,
          description: `Found "Mintplex" branding on settings page ${link.text}: context "${context}"`,
          severity: 'high',
          fix: 'Replace "Mintplex" with "OpenSIN-AI" branding'
        });
      }

      // Get visible texts
      const visibleTexts = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        const texts = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 2) texts.push(text);
        }
        return [...new Set(texts)].slice(0, 30);
      });
      results.pageInfo[`settings-${route}-texts`] = visibleTexts;
      
      // Check for English text in German locale
      const englishIndicators = visibleTexts.filter(t => {
        const lower = t.toLowerCase();
        return lower.match(/\b(settings|save|delete|cancel|create|update|close|confirm|loading|error|success|enable|disable|active|inactive|add|remove|edit|search|filter|export|import|download|upload|general|appearance|security|system|custom|users|workspace|chat|model|provider|api key|base url|password|email|username|name|description|action|status|yes|no|back|next|previous|continue|welcome|home|help|about|documentation|support|privacy|terms)\b/);
      });
      if (englishIndicators.length > 0) {
        for (const eng of englishIndicators.slice(0, 5)) {
          // Only flag if it looks like UI text, not a model name or config value
          if (!eng.includes('accounts/') && !eng.includes('fireworks/') && !eng.includes('API_KEY') && !eng.includes('genericOpenAi')) {
            results.bugs.push({
              area: `i18n-settings-${route}`,
              description: `English text on settings page ${link.text}: "${eng}"`,
              severity: 'low',
              fix: `Translate to German: "${eng}"`
            });
          }
        }
      }
      
    } catch (e) {
      log(`Error checking ${link.href}: ${e.message}`);
    }
  }

  // ==========================================
  // INVESTIGATION 6: Check /settings/general specifically
  // ==========================================
  log('=== INVESTIGATION 6: /settings/general 404 ===');
  await page.goto(`${SITE_URL}/settings/general`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const generalText = await page.textContent('body') || '';
  const generalTitle = await page.title();
  results.pageInfo.settingsGeneral = { title: generalTitle, text: generalText.substring(0, 500) };
  log(`Settings/general: title="${generalTitle}", text="${generalText.substring(0, 200)}"`);
  
  if (generalText.includes('404') || generalText.includes('Seite nicht gefunden')) {
    // Check what the correct general settings URL is
    const allSettingsHrefs = await page.evaluate(() => {
      // Look in the settings 404 page for any settings links
      return Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent?.trim()
      })).filter(a => a.href.includes('settings'));
    });
    results.pageInfo.settingsGeneralLinks = allSettingsHrefs;
    log(`Links from 404 settings page: ${JSON.stringify(allSettingsHrefs)}`);
  }

  // ==========================================
  // INVESTIGATION 7: Check API endpoints more carefully
  // ==========================================
  log('=== INVESTIGATION 7: API Endpoints ===');
  const apiEndpoints = [
    '/api/v1/workspaces',
    '/api/v1/users',
    '/api/v1/auth',
    '/api/system/pfp/1',
    '/api/v1/system/pfp/1',
  ];
  
  for (const endpoint of apiEndpoints) {
    const resp = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url, { credentials: 'include' });
        const text = await r.text().catch(() => '');
        return { 
          status: r.status, 
          ok: r.ok,
          body: text.substring(0, 300),
          contentType: r.headers.get('content-type')
        };
      } catch (e) {
        return { error: e.message };
      }
    }, `${SITE_URL}${endpoint}`);
    results.pageInfo[`api-${endpoint}`] = resp;
    log(`API ${endpoint}: ${JSON.stringify(resp)}`);
    
    if (resp.status === 403) {
      results.bugs.push({
        area: 'api',
        description: `API ${endpoint} returns 403: "${resp.body}"`,
        severity: 'medium',
        fix: 'Check API authentication/session handling - session cookie may not be sent for API calls'
      });
    }
    if (resp.status === 404) {
      results.bugs.push({
        area: 'api',
        description: `API ${endpoint} returns 404`,
        severity: 'medium',
        fix: `Fix or remove ${endpoint} endpoint`
      });
    }
  }

  // ==========================================
  // INVESTIGATION 8: English text in source code / hidden elements
  // ==========================================
  log('=== INVESTIGATION 8: Hidden English Text ===');
  const hiddenEnglishText = await page.evaluate(() => {
    // Check all elements including hidden ones
    const allElements = document.querySelectorAll('*');
    const englishTexts = [];
    for (const el of allElements) {
      const text = el.textContent?.trim();
      if (!text || text.length < 3) continue;
      
      // Check for common English UI strings
      const lower = text.toLowerCase();
      const englishPatterns = [
        'welcome to', 'get started', 'how does', 'what can',
        'send message', 'type your message', 'new chat',
        'no workspaces', 'no messages', 'no chat history',
        'workspace settings', 'user setup', 'multi user',
        'password protection', 'custom messages',
        'drag and drop', 'browse files', 'max file size',
        'supported files', 'select model', 'choose a model',
        'are you sure', 'cannot be undone',
        'no results', 'no data', 'loading', 'saving', 'deleting'
      ];
      
      for (const pattern of englishPatterns) {
        if (lower === pattern || lower.startsWith(pattern + ' ') || lower.endsWith(' ' + pattern)) {
          const computed = window.getComputedStyle(el);
          englishTexts.push({
            text: text.substring(0, 100),
            pattern: pattern,
            tag: el.tagName,
            visible: computed.display !== 'none' && computed.visibility !== 'hidden',
            className: (el.className || '').toString().substring(0, 60)
          });
          break;
        }
      }
    }
    return [...new Set(englishTexts.map(t => JSON.stringify(t)))].map(s => JSON.parse(s)).slice(0, 20);
  });
  results.pageInfo.hiddenEnglishText = hiddenEnglishText;
  log(`Hidden English texts: ${JSON.stringify(hiddenEnglishText)}`);

  // ==========================================
  // INVESTIGATION 9: Check for English "New Thread" text specifically
  // ==========================================
  log('=== INVESTIGATION 9: New Thread Text ===');
  const newTextInfo = await page.evaluate(() => {
    // Find the "*New Thread" element
    const allLinks = Array.from(document.querySelectorAll('a'));
    const newThreadLinks = allLinks.filter(a => a.textContent?.includes('New Thread'));
    return newThreadLinks.map(a => ({
      href: a.href,
      text: a.textContent?.trim(),
      className: (a.className || '').toString().substring(0, 80),
      html: a.innerHTML.substring(0, 200)
    }));
  });
  results.pageInfo.newThreadInfo = newTextInfo;
  log(`New Thread links: ${JSON.stringify(newTextInfo)}`);

  if (newTextInfo.length > 0) {
    results.bugs.push({
      area: 'i18n-sidebar',
      description: `"*New Thread" is in English on a German locale site. Should be "Neuer Thread" or "Neuer Chat". Found ${newTextInfo.length} occurrence(s).`,
      severity: 'medium',
      fix: 'Translate "New Thread" to German in the sidebar component i18n key'
    });
  }

  // ==========================================
  // INVESTIGATION 10: Check for English "User message:" prefix in thread titles
  // ==========================================
  log('=== INVESTIGATION 10: User Message Prefix ===');
  const userMessageThreads = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a'));
    return allLinks.filter(a => a.textContent?.includes('User message:')).map(a => ({
      href: a.href,
      text: a.textContent?.trim().substring(0, 80)
    }));
  });
  results.pageInfo.userMessageThreads = userMessageThreads;
  log(`"User message:" threads: ${userMessageThreads.length}`);
  
  if (userMessageThreads.length > 0) {
    results.bugs.push({
      area: 'i18n-thread-titles',
      description: `Thread titles contain English prefix "User message:" instead of German "Benutzernachricht:" — found ${userMessageThreads.length} occurrences. Examples: ${userMessageThreads.slice(0, 3).map(t => `"${t.text}"`).join(', ')}`,
      severity: 'low',
      fix: 'Translate the "User message:" prefix in thread auto-title generation to German'
    });
  }

  // ==========================================
  // INVESTIGATION 11: Check CSS - login page uses dark theme classes but site is light
  // ==========================================
  log('=== INVESTIGATION 11: Theme Consistency ===');
  await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const themeConsistency = await page.evaluate(() => {
    const loginForm = document.querySelector('input[name="username"]');
    if (!loginForm) return null;
    
    const computed = window.getComputedStyle(loginForm);
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const formBg = computed.backgroundColor;
    
    return {
      bodyBgColor: bodyBg,
      inputBgColor: formBg,
      inputTextColor: computed.color,
      inputClass: loginForm.className?.substring(0, 80),
      htmlTheme: document.documentElement.getAttribute('data-theme'),
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className
    };
  });
  results.pageInfo.themeConsistency = themeConsistency;
  log(`Theme consistency: ${JSON.stringify(themeConsistency)}`);

  // ==========================================
  // INVESTIGATION 12: Check for version display
  // ==========================================
  log('=== INVESTIGATION 12: Version Display ===');
  const versionInfo = await page.evaluate(() => {
    const allText = document.body.innerText;
    const versionMatch = allText.match(/v\d+\.\d+\.\d+/g);
    return versionMatch;
  });
  results.pageInfo.versionDisplay = versionInfo;
  log(`Version display: ${JSON.stringify(versionInfo)}`);

  // Write results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  log(`Results written to ${RESULTS_FILE}`);
  log(`Bugs found: ${results.bugs.length}`);

  await browser.close();
}

runTests().catch(err => {
  console.error('UNHANDLED ERROR:', err);
  process.exit(1);
});
