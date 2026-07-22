// SPDX-License-Identifier: MIT

const { v4: uuidv4 } = require("uuid");

const NOTEBOOK_MODES = new Set(["chat", "work", "code"]);

const CODE_RUNNERS = new Set([
  "codex-cli",
  "claude-code",
  "opencode",
  "orca",
  "mimo-code",
  "custom-cli",
]);

const MAX_SELECTED_SOURCES = 500;

function normalizeNotebookMode(value) {
  return NOTEBOOK_MODES.has(value) ? value : "chat";
}

function normalizeTurnId(value) {
  if (typeof value === "string" && /^[a-f0-9-]{16,64}$/i.test(value)) {
    return value;
  }
  return uuidv4();
}

function normalizeSourceIds(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter(
          (item) =>
            typeof item === "string" && item.length > 0 && item.length <= 500,
        )
        .slice(0, MAX_SELECTED_SOURCES),
    ),
  ];
}

function normalizeCodeRunnerId(value, notebookMode) {
  if (notebookMode !== "code") return null;
  return CODE_RUNNERS.has(value) ? value : null;
}

function parseChatRequestContext(body = {}) {
  const notebookMode = normalizeNotebookMode(body.notebookMode);

  return {
    turnId: normalizeTurnId(body.turnId),
    notebookMode,
    sourceSelectionExplicit: body.sourceSelectionExplicit === true,
    selectedSourceIds: normalizeSourceIds(body.selectedSourceIds),
    codeRunnerId: normalizeCodeRunnerId(body.codeRunnerId, notebookMode),
  };
}

module.exports = {
  CODE_RUNNERS,
  NOTEBOOK_MODES,
  MAX_SELECTED_SOURCES,
  normalizeNotebookMode,
  normalizeTurnId,
  normalizeSourceIds,
  normalizeCodeRunnerId,
  parseChatRequestContext,
};
