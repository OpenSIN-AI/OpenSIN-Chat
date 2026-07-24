// SPDX-License-Identifier: MIT
// Dynamic i18n key allowlist.
//
// `findUnusedTranslations.mjs` does static AST analysis to find `t("key")`
// calls. It cannot detect keys that are built dynamically, e.g.
//   t(`chat.mode.${chatMode}.title`)
//   t(`chat_window.source_filter_${sourceFilter}`)
//
// Any key referenced via such a template-string concatenation must be listed
// here so the pruning script does not delete it.
//
// If you add a new dynamic `t()` call somewhere in the frontend, run
//   yarn find:unused-translations
// and copy any false-positive keys into this list.

export const DYNAMIC_KEY_ALLOWLIST = [
  // Keyboard shortcut labels — t(`keyboard-shortcuts.shortcuts.${shortcut.translationKey}`)
  "keyboard-shortcuts.shortcuts.settings",
  "keyboard-shortcuts.shortcuts.home",
  "keyboard-shortcuts.shortcuts.workspaces",
  "keyboard-shortcuts.shortcuts.apiKeys",
  "keyboard-shortcuts.shortcuts.llmPreferences",
  "keyboard-shortcuts.shortcuts.chatSettings",
  "keyboard-shortcuts.shortcuts.help",
  "keyboard-shortcuts.shortcuts.showLLMSelector",
  "keyboard-shortcuts.shortcuts.workspaceSettings",

  // Chat mode titles and descriptions — t(`chat.mode.${chatMode}.title`) / .description
  "chat.mode.automatic.title",
  "chat.mode.automatic.description",
  "chat.mode.chat.title",
  "chat.mode.chat.description",
  "chat.mode.query.title",
  "chat.mode.query.description",

  // Model router rule quantifiers — t(`model-router.rules.quantifier-${quantifier}`)
  "model-router.rules.quantifier-any",
  "model-router.rules.quantifier-all",

  // Chat window source filter labels — t(`chat_window.source_filter_${sourceFilter}`)
  "chat_window.source_filter_all",
  "chat_window.source_filter_documents",
  "chat_window.source_filter_media",

  // Scheduled job status — t(`scheduledJobs.status.${job.latestRun.status}`)
  "scheduledJobs.status.pending",
  "scheduledJobs.status.running",
  "scheduledJobs.status.success",
  "scheduledJobs.status.failed",
  "scheduledJobs.status.timeout",

  // Scheduled job schedule modes — t(mode.labelKey) in JobSchedule.tsx
  "scheduledJobs.modal.modeBuilder",
  "scheduledJobs.modal.modeCustom",

  // Text-to-Speech OpenAI voices — t(`textToSpeech.openAi.voices.${voice}`)
  "textToSpeech.openAi.voices.alloy",
  "textToSpeech.openAi.voices.echo",
  "textToSpeech.openAi.voices.fable",
  "textToSpeech.openAi.voices.nova",
  "textToSpeech.openAi.voices.onyx",
  "textToSpeech.openAi.voices.shimmer",

  // Preview file type labels — t(`preview.fileType.${fileTypeKey}`)
  "preview.fileType.file",
  "preview.fileType.image",
  "preview.fileType.pdf",
  "preview.fileType.powerpoint",
  "preview.fileType.spreadsheet",
  "preview.fileType.vectorImage",
  "preview.fileType.word",

  // PDF analysis source types — t(`pdfAnalysis.sourceTypes.${value}`)
  "pdfAnalysis.sourceTypes.image",
  "pdfAnalysis.sourceTypes.pdf",
  "pdfAnalysis.sourceTypes.text",
  "pdfAnalysis.sourceTypes.url",
  "pdfAnalysis.sourceTypes.video",
  "pdfAnalysis.sourceTypes.youtube",

  // PDF analysis verdicts — t(`pdfAnalysis.verdicts.${sv.verdict}`) / t(`pdfAnalysis.verdicts.${pc.webResearch.overall}`)
  "pdfAnalysis.verdicts.contradicts",
  "pdfAnalysis.verdicts.inconclusive",
  "pdfAnalysis.verdicts.supports",

  // System prompt variable types — t(`admin.systemPromptVariables.page.types.${variable.type}`)
  "admin.systemPromptVariables.page.types.static",
  "admin.systemPromptVariables.page.types.system",
  "admin.systemPromptVariables.page.types.user",
  "admin.systemPromptVariables.page.types.workspace",

  // Admin users page role hints — t(hintKey) where hintKey from ROLE_HINT map
  "admin.usersPage.roleHint.admin1",
  "admin.usersPage.roleHint.admin2",
  "admin.usersPage.roleHint.default1",
  "admin.usersPage.roleHint.default2",
  "admin.usersPage.roleHint.manager1",
  "admin.usersPage.roleHint.manager2",
  "admin.usersPage.roleHint.manager3",

  // Thread container group labels — t(group.labelKey) in ThreadContainer
  "threadContainer.groupToday",
  "threadContainer.groupYesterday",
  "threadContainer.groupThisWeek",
  "threadContainer.groupLastWeek",
  "threadContainer.groupOlder",

  // Workspace source type labels — t(labelKey) in WorkspaceSources
  "main-page.workspaceSources.type_url",
  "main-page.workspaceSources.type_db",
  "main-page.workspaceSources.type_document",

  // Web scraping node capture-as options — t(opt.labelKey) in WebScrapingNode
  "webScrapingNode.captureAs.text",
  "webScrapingNode.captureAs.html",
  "webScrapingNode.captureAs.querySelector",

  // Page titles — t(key) where key from resolveTitleKey() in useRouteTitle.ts
  "page.titles.home",
  "page.titles.login",
  "page.titles.workspace",
  "page.titles.workspaceSettings",
  "page.titles.settings",
  "page.titles.pdfAnalysis",
  "page.titles.docs",
  "page.titles.onboarding",
  "page.titles.notFound",
  "page.titles.sso",

  // Docs category labels — t(i18nKey) where i18nKey from CATEGORY_I18N_KEYS in docsManifest.ts
  "common.docsCategories.gettingStarted",
  "common.docsCategories.api",
  "common.docsCategories.architecture",
  "common.docsCategories.deployment",
  "common.docsCategories.dataSources",
  "common.docsCategories.operations",
];
