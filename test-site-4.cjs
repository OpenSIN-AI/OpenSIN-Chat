const { chromium } = require('playwright');
const fs = require('fs');

const SITE_URL = 'https://sinchat.delqhi.com';
const RESULTS_FILE = '/var/folders/4k/w1vg2tbj7718gc0mj308m95m0000gn/T/opencode/test-results-3.json';

const results = { bugs: [], pageInfo: {} };

function log(msg) {
  console.log(`[TEST4] ${msg}`);
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

  // ==========================================
  // TEST: Login page theme and button issues
  // ==========================================
  log('=== Login Page Theme & Buttons ===');
  await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const loginThemeInfo = await page.evaluate(() => {
    const usernameInput = document.querySelector('input[name="username"]');
    if (!usernameInput) return null;
    
    const computed = window.getComputedStyle(usernameInput);
    const html = document.documentElement;
    
    return {
      inputBgColor: computed.backgroundColor,
      inputTextColor: computed.color,
      inputClass: usernameInput.className,
      htmlTheme: html.getAttribute('data-theme'),
      htmlClass: html.className,
      bodyClass: document.body.className,
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      bodyColor: window.getComputedStyle(document.body).color,
    };
  });
  results.pageInfo.loginThemeInfo = loginThemeInfo;
  log(`Login theme: ${JSON.stringify(loginThemeInfo)}`);

  // Check if login page is dark-themed even though site is light
  if (loginThemeInfo) {
    const bg = loginThemeInfo.bodyBg;
    // If body bg is dark (rgb(9, 9, 11) = zinc-950) but html theme is "light"
    const isDarkBg = bg.includes('9, 9, 11') || bg.includes('0, 0, 0') || bg.includes('24, 24, 27') || bg.includes('39, 39, 42');
    const isLightTheme = loginThemeInfo.htmlTheme === 'light' || loginThemeInfo.htmlClass?.includes('light');
    if (isDarkBg && isLightTheme) {
      results.bugs.push({
        area: 'login-theme',
        description: `Login page has dark background (${bg}) but the site theme is set to "light" (data-theme="light"). The login page appears to render with dark theme regardless of the site's light theme setting.`,
        severity: 'medium',
        fix: 'Make the login page respect the site theme setting, or apply consistent light theme styles to the login page'
      });
    }
  }

  // Check button text
  const loginBtnInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map(btn => ({
      text: btn.textContent?.trim().substring(0, 100),
      type: btn.type,
      html: btn.innerHTML.substring(0, 300),
      className: (btn.className || '').toString().substring(0, 80)
    }));
  });
  results.pageInfo.loginBtnInfo = loginBtnInfo;
  log(`Login buttons: ${JSON.stringify(loginBtnInfo)}`);

  // Check if "Passwort vergessen?" and "Zurücksetzen" are merged
  const resetBtn = loginBtnInfo.find(b => b.text?.includes('Passwort vergessen'));
  if (resetBtn && resetBtn.text === 'Passwort vergessen?Zurücksetzen') {
    results.bugs.push({
      area: 'login-page',
      description: `"Passwort vergessen?" and "Zurücksetzen" are concatenated into a single button text "Passwort vergessen?Zurücksetzen" without proper visual separation. The HTML shows these are in one button element: ${resetBtn.html.substring(0, 200)}`,
      severity: 'medium',
      fix: 'Separate "Passwort vergessen?" (link/label) and "Zurücksetzen" (button) into distinct visual elements with proper spacing, or add a separator between them'
    });
  }

  // Login
  log('Logging in...');
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[type="password"]').fill('Simone123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);

  // ==========================================
  // TEST: Settings page English text
  // ==========================================
  log('=== Settings English Text ===');
  await page.goto(`${SITE_URL}/settings/llm-preference`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const settingsTexts = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const texts = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 2) texts.push(text);
    }
    return [...new Set(texts)];
  });
  results.pageInfo.settingsTexts = settingsTexts;

  // Check for specific English strings
  const englishChecks = {
    'Generic OpenAI': settingsTexts.includes('Generic OpenAI'),
    'Connect to any OpenAi-compatible service via a custom configuration': settingsTexts.includes('Connect to any OpenAi-compatible service via a custom configuration'),
    'NVIDIA NIM': settingsTexts.includes('NVIDIA NIM'),
    'Docker Model Runner': settingsTexts.includes('Docker Model Runner'),
    'Community Hub': settingsTexts.includes('Community Hub'),
  };
  results.pageInfo.englishChecks = englishChecks;
  log(`English checks: ${JSON.stringify(englishChecks)}`);

  for (const [text, found] of Object.entries(englishChecks)) {
    if (found) {
      // Determine severity
      let severity = 'low';
      let fix = '';
      if (text === 'Generic OpenAI') {
        severity = 'medium';
        fix = 'Translate "Generic OpenAI" to German or provide German description';
      } else if (text === 'Connect to any OpenAi-compatible service via a custom configuration') {
        severity = 'medium';
        fix = 'Translate to German: "Verbinden Sie sich mit jedem OpenAI-kompatiblen Service über eine benutzerdefinierte Konfiguration"';
      } else if (text === 'Community Hub') {
        severity = 'low';
        fix = 'Translate "Community Hub" to "Community-Hub" in settings navigation';
      } else if (text === 'NVIDIA NIM' || text === 'Docker Model Runner') {
        severity = 'low';
        fix = 'These are proper nouns — acceptable in English, but surrounding description text should be German';
      }
      results.bugs.push({
        area: 'i18n-settings-llm',
        description: `Untranslated English text on settings page: "${text}"`,
        severity,
        fix
      });
    }
  }

  // ==========================================
  // TEST: Model dropdown raw IDs
  // ==========================================
  log('=== Model Dropdown Raw IDs ===');
  const dropdownOptions = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    return selects.map(sel => ({
      name: sel.name,
      options: Array.from(sel.querySelectorAll('option')).map(opt => ({
        value: opt.value,
        text: opt.textContent?.trim()
      }))
    }));
  });
  results.pageInfo.dropdownOptions = dropdownOptions;

  for (const dropdown of dropdownOptions) {
    const hasRawIds = dropdown.options.some(o => o.text.includes('accounts/fireworks/'));
    if (hasRawIds) {
      results.bugs.push({
        area: 'settings-llm-dropdown',
        description: `Model dropdown "${dropdown.name}" shows raw Fireworks API model IDs (e.g. "accounts/fireworks/models/deepseek-v4-pro") as option text instead of user-friendly names. All ${dropdown.options.length} options display raw identifiers.`,
        severity: 'medium',
        fix: 'Map model IDs to display names (e.g. "DeepSeek V4 Pro", "Kimi K2P7 Code", "GLM 5.2", "MiniMax M3") in the dropdown options'
      });
      break;
    }
  }

  // ==========================================
  // TEST: Chat model display - raw IDs in chat
  // ==========================================
  log('=== Chat Raw Model IDs ===');
  await page.goto(`${SITE_URL}/workspace/opensin-chat`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  const chatModelDisplay = await page.evaluate(() => {
    const allText = document.body.innerText;
    const hasRawId = allText.includes('accounts/fireworks/models/');
    const rawIds = allText.match(/accounts\/fireworks\/(models|routers)\/[a-z0-9.-]+/gi) || [];
    return {
      hasRawId,
      rawIds: [...new Set(rawIds)],
    };
  });
  results.pageInfo.chatModelDisplay = chatModelDisplay;
  log(`Chat model display: ${JSON.stringify(chatModelDisplay)}`);

  if (chatModelDisplay.hasRawId) {
    results.bugs.push({
      area: 'chat-model-display',
      description: `Raw Fireworks model IDs (e.g. "accounts/fireworks/models/deepseek-v4-pro") are displayed as-is in the chat interface after each AI response. These are internal API identifiers that shouldn't be shown to end users.`,
      severity: 'medium',
      fix: 'Display user-friendly model names (e.g. "DeepSeek V4 Pro") instead of raw API identifiers. Create a model name mapping in the frontend.'
    });
  }

  // ==========================================
  // TEST: Screen reader English text
  // ==========================================
  log('=== Screen Reader English ===');
  const screenReaderText = await page.evaluate(() => {
    const allText = document.body.innerText;
    const patterns = [
      'To pick up a draggable item',
      'Press space bar to start a drag',
      'Some screen readers may require',
    ];
    return patterns.filter(p => allText.includes(p));
  });
  results.pageInfo.screenReaderText = screenReaderText;
  log(`Screen reader text: ${JSON.stringify(screenReaderText)}`);

  if (screenReaderText.length > 0) {
    results.bugs.push({
      area: 'i18n-accessibility',
      description: `Screen reader drag-and-drop instructions are in English on a German locale site: "${screenReaderText[0].substring(0, 50)}...". These come from the dnd-kit library's default announcements.`,
      severity: 'low',
      fix: 'Configure dnd-kit with German screen reader announcements, or override the default Announcement text'
    });
  }

  // ==========================================
  // TEST: German formality consistency
  // ==========================================
  log('=== German Formality ===');
  const formalityInfo = await page.evaluate(() => {
    const allText = document.body.innerText;
    return {
      hasLadeDokumente: allText.includes('Lade Dokumente hoch'),
      hasFugeUrls: allText.includes('füge URLs hinzu'),
      hasFugenSieEtwas: allText.includes('Fügen Sie etwas hinzu'),
      hasWieKannIchIhnen: allText.includes('Wie kann ich Ihnen heute helfen?'),
      hasSchreibeEine: allText.includes('Schreibe eine Nachricht'),
      hasVersendeDen: allText.includes('Versende den Prompt'),
      ladeContext: allText.match(/.{0,20}Lade Dokumente.{0,60}/)?.[0]?.trim(),
      fugenSieContext: allText.match(/.{0,20}Fügen Sie etwas.{0,40}/)?.[0]?.trim(),
      wieKannContext: allText.match(/Wie kann ich Ihnen.{0,30}/)?.[0]?.trim(),
      schreibeContext: allText.match(/Schreibe eine Nachricht/)?.[0],
      versendeContext: allText.match(/Versende den Prompt.{0,40}/)?.[0]?.trim(),
    };
  });
  results.pageInfo.formalityInfo = formalityInfo;
  log(`Formality: ${JSON.stringify(formalityInfo)}`);

  // Check for mixed formality
  const hasInformal = formalityInfo.hasLadeDokumente || formalityInfo.hasSchreibeEine || formalityInfo.hasVersendeDen;
  const hasFormal = formalityInfo.hasFugenSieEtwas || formalityInfo.hasWieKannIchIhnen;
  if (hasInformal && hasFormal) {
    results.bugs.push({
      area: 'i18n-consistency',
      description: `Inconsistent German formality: UI mixes informal "du" form ("Lade Dokumente hoch", "Schreibe eine Nachricht", "Versende den Prompt") with formal "Sie" form ("Fügen Sie etwas hinzu", "Wie kann ich Ihnen heute helfen?"). This creates an unprofessional, inconsistent user experience.`,
      severity: 'medium',
      fix: 'Standardize on one German formality level. Recommend formal "Sie" form throughout for a professional product, or informal "du" if targeting a casual audience'
    });
  }

  // ==========================================
  // TEST: Version display
  // ==========================================
  log('=== Version Display ===');
  await page.goto(`${SITE_URL}/settings/llm-preference`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const versionInfo = await page.evaluate(() => {
    const allText = document.body.innerText;
    const versionMatch = allText.match(/v\d+\.\d+\.\d+/g);
    // Also check for version without 'v' prefix
    const versionMatch2 = allText.match(/\b\d+\.\d+\.\d+\b/g);
    return {
      withV: versionMatch,
      withoutV: versionMatch2?.filter(v => !v.startsWith('0.')),
    };
  });
  results.pageInfo.versionInfo = versionInfo;
  log(`Version: ${JSON.stringify(versionInfo)}`);

  // ==========================================
  // TEST: Profile picture 401 error
  // ==========================================
  log('=== Profile Picture Error ===');
  const pfpInfo = await page.evaluate(async () => {
    try {
      const resp = await fetch('/api/system/pfp/1', { credentials: 'include' });
      const text = await resp.text();
      return { status: resp.status, body: text.substring(0, 200), contentType: resp.headers.get('content-type') };
    } catch (e) {
      return { error: e.message };
    }
  });
  results.pageInfo.pfpInfo = pfpInfo;
  log(`Profile picture: ${JSON.stringify(pfpInfo)}`);

  if (pfpInfo.status === 401) {
    results.bugs.push({
      area: 'profile-picture',
      description: `Profile picture API (/api/system/pfp/1) returns 401 "No auth token found." on every page load, causing a persistent network error (ERR_ABORTED) in the browser console. This happens on every page navigation.`,
      severity: 'medium',
      fix: 'Fix the authentication token handling for the profile picture endpoint. The session cookie may not be sent for this request, or the endpoint expects a different auth mechanism.'
    });
  }

  // ==========================================
  // TEST: Settings 404 pages
  // ==========================================
  log('=== Settings 404 Routes ===');
  const settingsRoutes404 = [
    '/settings/general',
    '/settings/system',
    '/settings/customization',
    '/settings/data-connectors',
    '/settings/agent-skills',
    '/settings/chat-settings',
    '/settings/transcription',
    '/settings/appearance',
    '/settings/institutional',
    '/settings/experimental',
    '/settings/system-preferences',
    '/settings/custom-models',
  ];
  
  for (const route of settingsRoutes404) {
    try {
      await page.goto(`${SITE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(1000);
      const pageText = await page.textContent('body') || '';
      if (pageText.includes('404') || pageText.includes('Seite nicht gefunden')) {
        results.bugs.push({
          area: `settings-route`,
          description: `Settings route ${route} returns 404 "Seite nicht gefunden"`,
          severity: 'medium',
          fix: `Fix routing for ${route} or remove dead links from navigation`
        });
        log(`404: ${route}`);
      }
    } catch(e) {
      log(`Error on ${route}: ${e.message}`);
    }
  }

  // Write results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  log(`\nResults written to ${RESULTS_FILE}`);
  log(`Bugs found: ${results.bugs.length}`);

  await browser.close();
}

runTests().catch(err => {
  console.error('UNHANDLED ERROR:', err);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`Partial results written. Bugs found: ${results.bugs.length}`);
});
