const { chromium } = require('playwright');
const fs = require('fs');

const SITE_URL = 'https://sinchat.delqhi.com';
const RESULTS_FILE = '/var/folders/4k/w1vg2tbj7718gc0mj308m95m0000gn/T/opencode/test-results-2.json';

const results = { bugs: [], pageInfo: {} };

function log(msg) {
  console.log(`[TEST3] ${msg}`);
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

  // Login
  log('Logging in...');
  await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[type="password"]').fill('Simone123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  log(`Logged in, URL: ${page.url()}`);

  // ==========================================
  // INVESTIGATION: English "New Thread" text
  // ==========================================
  log('=== New Thread Text ===');
  const newTextInfo = await page.evaluate(() => {
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
  // INVESTIGATION: "User message:" prefix in thread titles
  // ==========================================
  log('=== User Message Prefix ===');
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
  // INVESTIGATION: English thread titles (non-German)
  // ==========================================
  log('=== English Thread Titles ===');
  const englishTitles = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a'));
    const wsLinks = allLinks.filter(a => a.href.includes('/workspace/') && a.textContent && a.textContent.trim().length > 3);
    return wsLinks.map(a => ({
      href: a.href,
      text: a.textContent?.trim().substring(0, 80)
    })).filter(l => {
      // Check if it's English (starts with English words)
      const lower = l.text.toLowerCase();
      return lower.startsWith('basic') || lower.startsWith('works') || 
             lower.startsWith('short') || lower.startsWith('question') ||
             lower.startsWith('bug hunt') || lower.startsWith('the title') ||
             lower.startsWith('switch test') || lower.startsWith('word title') ||
             lower.startsWith('what is') || lower.startsWith('test message') ||
             lower.startsWith('capital') || lower.startsWith('message switching') ||
             lower.startsWith('hello world') || lower.startsWith('fine afd') ||
             lower.startsWith('afd energy') || lower.startsWith('energy policy') ||
             lower.startsWith('*new') || lower === 'thread';
    });
  });
  results.pageInfo.englishTitles = englishTitles;
  log(`English thread titles: ${englishTitles.length}`);

  // ==========================================
  // INVESTIGATION: Version display
  // ==========================================
  log('=== Version Display ===');
  const versionInfo = await page.evaluate(() => {
    const allText = document.body.innerText;
    const versionMatch = allText.match(/v\d+\.\d+\.\d+/g);
    return versionMatch;
  });
  results.pageInfo.versionDisplay = versionInfo;
  log(`Version display: ${JSON.stringify(versionInfo)}`);

  // ==========================================
  // INVESTIGATION: Theme consistency - login page classes
  // ==========================================
  log('=== Theme Consistency ===');
  // Go to login page (logout)
  await page.goto(`${SITE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  
  const loginThemeInfo = await page.evaluate(() => {
    const usernameInput = document.querySelector('input[name="username"]');
    if (!usernameInput) return null;
    
    const computed = window.getComputedStyle(usernameInput);
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const formBg = computed.backgroundColor;
    const html = document.documentElement;
    
    // Check for conflicting theme classes
    const hasDarkClass = usernameInput.className?.includes('bg-zinc-800');
    const hasLightClass = usernameInput.className?.includes('light:bg-slate-200');
    const htmlTheme = html.getAttribute('data-theme');
    
    return {
      bodyBgColor: bodyBg,
      inputBgColor: formBg,
      inputTextColor: computed.color,
      inputClass: usernameInput.className?.substring(0, 120),
      htmlTheme: htmlTheme,
      htmlClass: html.className,
      bodyClass: document.body.className,
      hasDarkClass: hasDarkClass,
      hasLightClass: hasLightClass,
      isLightTheme: htmlTheme === 'light' || html.className?.includes('light')
    };
  });
  results.pageInfo.loginThemeInfo = loginThemeInfo;
  log(`Login theme: ${JSON.stringify(loginThemeInfo)}`);

  // Check if login page dark theme classes are applied in light mode
  if (loginThemeInfo && loginThemeInfo.isLightTheme && loginThemeInfo.hasDarkClass) {
    // Check what bg color the input actually has
    const bgColor = loginThemeInfo.inputBgColor;
    // rgb(39, 39, 42) = zinc-800 (dark), rgb(226, 232, 240) = slate-200 (light)
    if (bgColor.includes('39, 39, 42') || bgColor.includes('24, 24, 27')) {
      results.bugs.push({
        area: 'login-theme',
        description: `Login page input fields have dark theme background (zinc-800: ${bgColor}) even though the site is in light mode. Input class includes "bg-zinc-800" which applies in dark mode. The "light:bg-slate-200" override may not be working correctly.`,
        severity: 'medium',
        fix: 'Fix the Tailwind light: variant to properly override dark theme classes on the login page, or use proper dark: prefix instead of light: prefix'
      });
    }
  }

  // ==========================================
  // INVESTIGATION: Check for "Generic OpenAI" English text on settings
  // ==========================================
  log('=== Settings English Text ===');
  // Re-login
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[type="password"]').fill('Simone123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  
  await page.goto(`${SITE_URL}/settings/llm-preference`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const settingsEnglishTexts = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const texts = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 2) texts.push(text);
    }
    const unique = [...new Set(texts)];
    
    // Find English strings that are UI text (not config values or model names)
    const englishUI = unique.filter(t => {
      const lower = t.toLowerCase();
      // Skip config keys and model names
      if (t.includes('accounts/') || t.includes('genericOpenAi') || t.includes('API_KEY') || t.includes('DOCKER_') || t.includes('NVIDIA_')) return false;
      // Check for English UI text
      return lower === 'generic openai' ||
             lower === 'connect to any openai-compatible service via a custom configuration' ||
             lower === 'community hub' ||
             lower === 'support kontaktieren' && lower.includes('support') ||
             lower === 'nvidia nim' ||
             lower === 'docker model runner' ||
             lower.includes('fallback aktiv = provider') ||
             t === 'v' || // version prefix
             lower === 'admin' ||
             lower === 'admin' && t === 'admin';
    });
    return { allTexts: unique.slice(0, 60), englishUI };
  });
  results.pageInfo.settingsEnglishTexts = settingsEnglishTexts;
  log(`Settings English texts: ${JSON.stringify(settingsEnglishTexts.englishUI)}`);

  // Check for specific untranslated English strings
  const specificChecks = await page.evaluate(() => {
    const allText = document.body.innerText;
    return {
      hasGenericOpenAI: allText.includes('Generic OpenAI'),
      hasConnectToAny: allText.includes('Connect to any OpenAi-compatible service'),
      hasNvidiaNIM: allText.includes('NVIDIA NIM'),
      hasDockerModelRunner: allText.includes('Docker Model Runner'),
      hasCommunityHub: allText.includes('Community Hub'),
      hasFallbackAktiv: allText.includes('Fallback aktiv'),
      hasLokaleProvider: allText.includes('Lokale Provider'),
      genericOpenAIContext: allText.match(/Generic OpenAI[\s\S]{0,100}/)?.[0]?.trim(),
      connectToAnyContext: allText.match(/Connect to any[\s\S]{0,80}/)?.[0]?.trim(),
    };
  });
  results.pageInfo.specificChecks = specificChecks;
  log(`Specific checks: ${JSON.stringify(specificChecks)}`);

  if (specificChecks.hasGenericOpenAI) {
    results.bugs.push({
      area: 'i18n-settings-llm',
      description: `"Generic OpenAI" is untranslated English on the LLM settings page. Context: "${specificChecks.genericOpenAIContext}"`,
      severity: 'medium',
      fix: 'Translate "Generic OpenAI" to German, e.g. "Generisches OpenAI" or keep as proper name with German description'
    });
  }
  if (specificChecks.hasConnectToAny) {
    results.bugs.push({
      area: 'i18n-settings-llm',
      description: `"Connect to any OpenAi-compatible service via a custom configuration" is untranslated English on the LLM settings page`,
      severity: 'medium',
      fix: 'Translate to German: "Verbinden Sie sich mit jedem OpenAI-kompatiblen Service über eine benutzerdefinierte Konfiguration"'
    });
  }
  if (specificChecks.hasNvidiaNIM) {
    results.bugs.push({
      area: 'i18n-settings-llm',
      description: `"NVIDIA NIM" provider name is in English — this may be acceptable as a proper noun, but the surrounding description text should be German`,
      severity: 'low',
      fix: 'Keep "NVIDIA NIM" as proper noun but ensure all description text is translated'
    });
  }
  if (specificChecks.hasDockerModelRunner) {
    results.bugs.push({
      area: 'i18n-settings-llm',
      description: `"Docker Model Runner" is in English — may be acceptable as a proper noun`,
      severity: 'low',
      fix: 'Keep as proper noun if intentional, but ensure surrounding UI text is German'
    });
  }
  if (specificChecks.hasCommunityHub) {
    results.bugs.push({
      area: 'i18n-settings-nav',
      description: `"Community Hub" is untranslated English in the settings navigation. Should be "Community-Hub" or "Gemeinschafts-Hub"`,
      severity: 'low',
      fix: 'Translate "Community Hub" to German in settings navigation'
    });
  }

  // ==========================================
  // INVESTIGATION: Check login page CSS class issue
  // ==========================================
  log('=== Login CSS Classes ===');
  // Go back to login
  await page.goto(`${SITE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  const loginClasses = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.map(inp => {
      const computed = window.getComputedStyle(inp);
      return {
        type: inp.type,
        name: inp.name,
        id: inp.id,
        className: inp.className,
        actualBg: computed.backgroundColor,
        actualColor: computed.color,
        actualBorder: computed.border,
      };
    });
  });
  results.pageInfo.loginClasses = loginClasses;
  log(`Login classes: ${JSON.stringify(loginClasses)}`);

  // Check if the login page is rendering dark colors in light mode
  // The classes use "bg-zinc-800" (dark) with "light:bg-slate-200" (light override)
  // If the "light:" variant isn't working, the input will be dark in light mode
  for (const inp of loginClasses) {
    const bg = inp.actualBg;
    // zinc-800 is rgb(39, 39, 42), slate-200 is rgb(226, 232, 240)
    if (bg.includes('39, 39, 42') || bg.includes('24, 24, 27')) {
      results.bugs.push({
        area: 'login-theme',
        description: `Login ${inp.name || inp.type} input has dark background color (${bg}) in light mode. The CSS class uses "bg-zinc-800 light:bg-slate-200" but the light: variant appears not to be working — the input is rendering with dark theme colors.`,
        severity: 'medium',
        fix: 'Fix the Tailwind light: variant or use proper conditional classes. The "light:" prefix is non-standard Tailwind — should use "dark:" prefix instead (dark:bg-zinc-800 with default bg-slate-200)'
      });
      break;
    }
  }

  // ==========================================
  // INVESTIGATION: Check for accessibility issues
  // ==========================================
  log('=== Accessibility Check ===');
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[type="password"]').fill('Simone123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);

  const a11yInfo = await page.evaluate(() => {
    // Check for missing alt text
    const images = Array.from(document.querySelectorAll('img'));
    const missingAlt = images.filter(img => !img.alt && !img.getAttribute('aria-label')).map(img => ({
      src: img.src?.substring(0, 100),
      className: (img.className || '').toString().substring(0, 60)
    }));
    
    // Check for missing labels
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    const missingLabels = inputs.filter(inp => {
      const id = inp.id;
      const ariaLabel = inp.getAttribute('aria-label');
      const associatedLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
      return !ariaLabel && !associatedLabel;
    }).map(inp => ({
      type: inp.type,
      name: inp.name,
      id: inp.id,
      placeholder: inp.placeholder
    }));
    
    // Check for button accessibility
    const buttons = Array.from(document.querySelectorAll('button'));
    const inaccessibleButtons = buttons.filter(btn => {
      const text = btn.textContent?.trim();
      const ariaLabel = btn.getAttribute('aria-label');
      const title = btn.getAttribute('title');
      return !text && !ariaLabel && !title;
    }).length;
    
    return {
      missingAltImages: missingAlt,
      missingLabelInputs: missingLabels,
      inaccessibleButtons: inaccessibleButtons,
      totalImages: images.length,
      totalInputs: inputs.length,
      totalButtons: buttons.length
    };
  });
  results.pageInfo.a11y = a11yInfo;
  log(`Accessibility: ${JSON.stringify(a11yInfo)}`);

  if (a11yInfo.missingAltImages.length > 0) {
    results.bugs.push({
      area: 'accessibility',
      description: `${a11yInfo.missingAltImages.length} images missing alt text out of ${a11yInfo.totalImages} total`,
      severity: 'low',
      fix: 'Add alt text to all images for screen reader accessibility'
    });
  }

  // ==========================================
  // INVESTIGATION: Check the "Passwort vergessen?Zurücksetzen" button text
  // ==========================================
  log('=== Login Button Text ===');
  await page.goto(`${SITE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  const loginBtnInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map(btn => ({
      text: btn.textContent?.trim().substring(0, 100),
      type: btn.type,
      html: btn.innerHTML.substring(0, 300)
    }));
  });
  results.pageInfo.loginBtnInfo = loginBtnInfo;
  log(`Login buttons: ${JSON.stringify(loginBtnInfo)}`);

  // Check if "Passwort vergessen?" and "Zurücksetzen" are merged into one button
  const resetBtn = loginBtnInfo.find(b => b.text?.includes('Passwort vergessen'));
  if (resetBtn && resetBtn.text === 'Passwort vergessen?Zurücksetzen') {
    results.bugs.push({
      area: 'login-page',
      description: `"Passwort vergessen?" and "Zurücksetzen" are concatenated into a single button text "Passwort vergessen?Zurücksetzen" without proper spacing or separation. This looks like a layout/text issue where two separate elements are rendered as one continuous string.`,
      severity: 'medium',
      fix: 'Separate "Passwort vergessen?" (label/link) and "Zurücksetzen" (button) into distinct visual elements with proper spacing'
    });
  }

  // ==========================================
  // INVESTIGATION: Check for screen reader drag instructions in English
  // ==========================================
  log('=== Screen Reader English Text ===');
  // Login again
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[type="password"]').fill('Simone123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);

  const screenReaderText = await page.evaluate(() => {
    const allText = document.body.innerText;
    const englishPatterns = [
      'To pick up a draggable item',
      'Press space bar to start a drag',
      'While dragging, use the arrow keys',
      'Press space again to drop',
      'Some screen readers may require',
    ];
    return englishPatterns.filter(p => allText.includes(p));
  });
  results.pageInfo.screenReaderEnglishText = screenReaderText;
  log(`Screen reader English text: ${JSON.stringify(screenReaderText)}`);

  if (screenReaderText.length > 0) {
    results.bugs.push({
      area: 'i18n-accessibility',
      description: `Screen reader drag instructions are in English on a German locale site: ${screenReaderText.map(t => `"${t.substring(0, 50)}..."`).join(', ')}. These are likely from a third-party drag-and-drop library (dnd-kit) and should be localized.`,
      severity: 'low',
      fix: 'Configure the drag-and-drop library (dnd-kit) with German screen reader instructions, or override the default announcement text'
    });
  }

  // ==========================================
  // INVESTIGATION: Check for "Lade Dokumente hoch" mixed casing
  // ==========================================
  log('=== Mixed Casing Check ===');
  const mixedCasingText = await page.evaluate(() => {
    const allText = document.body.innerText;
    const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 10);
    
    // Find lines that mix formal "Sie" and informal "du" forms
    const sieForm = lines.filter(l => l.match(/\b(Sie|Ihnen|Ihr|Ihre)\b/));
    const duForm = lines.filter(l => l.match(/\b(du|dir|dein|deine|Dein|Deine)\b/));
    
    return {
      sieForm: sieForm.slice(0, 5),
      duForm: duForm.slice(0, 5),
      hasMixed: sieForm.length > 0 && duForm.length > 0
    };
  });
  results.pageInfo.mixedCasing = mixedCasingText;
  log(`Mixed casing: ${JSON.stringify(mixedCasingText)}`);

  if (mixedCasingText.hasMixed) {
    results.bugs.push({
      area: 'i18n-consistency',
      description: `Inconsistent German formality: site mixes formal "Sie/Ihnen" with informal "du/dir" forms. Formal examples: ${mixedCasingText.sieForm.slice(0, 2).map(t => `"${t.substring(0, 60)}"`).join(', ')}. Informal examples: ${mixedCasingText.duForm.slice(0, 2).map(t => `"${t.substring(0, 60)}"`).join(', ')}`,
      severity: 'low',
      fix: 'Standardize on one German formality level (either formal "Sie" or informal "du") throughout the entire UI'
    });
  }

  // ==========================================
  // INVESTIGATION: Check for "Lade Dokumente hoch" vs "Laden Sie Dokumente hoch"
  // ==========================================
  log('=== Specific German Text Issues ===');
  const germanTextIssues = await page.evaluate(() => {
    const allText = document.body.innerText;
    return {
      // Check for "Lade" (informal) vs "Laden Sie" (formal)
      hasLadeDokumente: allText.includes('Lade Dokumente hoch'),
      hasLadenSieDokumente: allText.includes('Laden Sie Dokumente hoch'),
      // Check for "füge URLs hinzu" (informal) vs "fügen Sie URLs hinzu" (formal)
      hasFugeUrls: allText.includes('füge URLs hinzu'),
      hasFugenSieUrls: allText.includes('fügen Sie URLs hinzu'),
      // Get the full context
      ladeContext: allText.match(/.{0,30}Lade Dokumente.{0,60}/)?.[0],
      fugeContext: allText.match(/.{0,30}füge URLs.{0,40}/)?.[0],
      // Check for "Wie kann ich Ihnen heute helfen?" (formal)
      hasWieKannIchIhnen: allText.includes('Wie kann ich Ihnen heute helfen?'),
      // Check for "Fügen Sie etwas hinzu" (formal)
      hasFugenSieEtwas: allText.includes('Fügen Sie etwas hinzu'),
      // Check for "Schreibe eine Nachricht" (informal)
      hasSchreibeEine: allText.includes('Schreibe eine Nachricht'),
    };
  });
  results.pageInfo.germanTextIssues = germanTextIssues;
  log(`German text issues: ${JSON.stringify(germanTextIssues)}`);

  if (germanTextIssues.hasLadeDokumente && germanTextIssues.hasFugenSieEtwas) {
    results.bugs.push({
      area: 'i18n-consistency',
      description: `Mixed formality in German UI: "Lade Dokumente hoch oder füge URLs hinzu" uses informal "du" form, while "Fügen Sie etwas hinzu" and "Wie kann ich Ihnen heute helfen?" use formal "Sie" form. Also "Schreibe eine Nachricht" (informal) vs "Versende den Prompt an den Workspace" (formal).`,
      severity: 'medium',
      fix: 'Standardize all German UI text to either formal "Sie" or informal "du" form consistently'
    });
  }

  // ==========================================
  // INVESTIGATION: Check for "accounts/fireworks/models/" raw model IDs displayed
  // ==========================================
  log('=== Raw Model ID Display ===');
  const rawModelDisplay = await page.evaluate(() => {
    const allText = document.body.innerText;
    const modelIds = allText.match(/accounts\/fireworks\/(models|routers)\/[a-z0-9-]+/gi) || [];
    return {
      count: modelIds.length,
      models: [...new Set(modelIds)],
      // Check if they appear in user-visible areas (not just dropdowns)
      inBodyText: allText.includes('accounts/fireworks/models/deepseek-v4-pro')
    };
  });
  results.pageInfo.rawModelDisplay = rawModelDisplay;
  log(`Raw model ID display: ${JSON.stringify(rawModelDisplay)}`);

  if (rawModelDisplay.inBodyText) {
    results.bugs.push({
      area: 'chat-model-display',
      description: `Raw Fireworks model IDs (e.g. "accounts/fireworks/models/deepseek-v4-pro") are displayed as-is to users in the chat interface instead of user-friendly model names. The full path "accounts/fireworks/models/" is an internal identifier that shouldn't be shown to end users.`,
      severity: 'medium',
      fix: 'Display user-friendly model names (e.g. "DeepSeek V4 Pro", "Kimi K2P7 Code", "MiniMax M3") instead of raw API identifiers. Create a model name mapping in the frontend.'
    });
  }

  // ==========================================
  // INVESTIGATION: Check model dropdown options - are they showing raw IDs?
  // ==========================================
  log('=== Model Dropdown Display ===');
  await page.goto(`${SITE_URL}/settings/llm-preference`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

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
  log(`Dropdown options: ${JSON.stringify(dropdownOptions.map(d => ({ name: d.name, optionTexts: d.options.map(o => o.text).slice(0, 3) })))}`);

  // Check if dropdown options show raw model IDs
  for (const dropdown of dropdownOptions) {
    const hasRawIds = dropdown.options.some(o => o.text.includes('accounts/fireworks/'));
    if (hasRawIds) {
      results.bugs.push({
        area: 'settings-llm-dropdown',
        description: `Model dropdown "${dropdown.name}" shows raw Fireworks API model IDs (e.g. "accounts/fireworks/models/deepseek-v4-pro") as option text instead of user-friendly names`,
        severity: 'medium',
        fix: 'Map model IDs to display names (e.g. "DeepSeek V4 Pro", "Kimi K2P7 Code", "GLM 5.2", "MiniMax M3") in the dropdown options'
      });
      break;
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
  // Still write partial results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`Partial results written. Bugs found so far: ${results.bugs.length}`);
});
