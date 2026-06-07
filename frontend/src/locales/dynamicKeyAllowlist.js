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
  // Keyboard shortcut labels
  "keyboard-shortcuts.shortcuts.settings",
  "keyboard-shortcuts.shortcuts.home",
  "keyboard-shortcuts.shortcuts.workspaces",
  "keyboard-shortcuts.shortcuts.apiKeys",
  "keyboard-shortcuts.shortcuts.llmPreferences",
  "keyboard-shortcuts.shortcuts.chatSettings",
  "keyboard-shortcuts.shortcuts.help",
  "keyboard-shortcuts.shortcuts.showLLMSelector",
  "keyboard-shortcuts.shortcuts.workspaceSettings",

  // Chat mode descriptions
  "chat.mode.automatic.description",
  "chat.mode.chat.description",
  "chat.mode.query.description",

  // Model router rule quantifiers
  "model-router.rules.quantifier-any",
  "model-router.rules.quantifier-all",

  // Chat window source filter labels (dynamic by sourceFilter enum)
  "chat_window.source_filter_all",
  "chat_window.source_filter_documents",
  "chat_window.source_filter_media",

  // Scheduled job status (dynamic by job.latestRun.status)
  "scheduledJobs.status.pending",
  "scheduledJobs.status.running",
  "scheduledJobs.status.success",
  "scheduledJobs.status.failed",
  "scheduledJobs.status.timeout",
];
