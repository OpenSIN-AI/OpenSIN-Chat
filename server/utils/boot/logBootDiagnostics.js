// SPDX-License-Identifier: MIT
/**
 * One-shot boot diagnostics: logs storage/collector path health and
 * provider key fallbacks at server start so misconfigurations surface
 * in the logs immediately instead of at first upload/agent call.
 * Logging only — never throws, never blocks boot.
 */
const { pathsHealth } = require("../paths");
const { getProviderKeyStatuses } = require("../providerKeyStatus");

function logBootDiagnostics() {
  try {
    const paths = pathsHealth();
    console.log(
      `[BootDiagnostics] storage: ${paths.storagePath} ` +
        `(STORAGE_DIR ${paths.storageDirSet ? "set" : "unset — using fallback"}, ` +
        `exists: ${paths.storageExists}, writable: ${paths.storageWritable})`,
    );
    console.log(
      `[BootDiagnostics] collector: ${paths.collectorPath} ` +
        `(hotdir ${paths.hotdirExists ? "ok" : "MISSING"})`,
    );
    if (!paths.storageExists || !paths.storageWritable)
      console.warn(
        "[BootDiagnostics] WARNING: storage directory missing or not writable — uploads and vector caching will fail.",
      );
    if (!paths.hotdirExists)
      console.warn(
        "[BootDiagnostics] WARNING: collector hotdir missing — document ingestion will fail.",
      );

    const fallbacks = getProviderKeyStatuses().filter((p) => p.fallbackActive);
    if (fallbacks.length > 0)
      console.warn(
        `[BootDiagnostics] ${fallbacks.length} local provider(s) running with placeholder API keys: ` +
          fallbacks.map((p) => `${p.name} (${p.envKey} unset)`).join(", "),
      );
  } catch (e) {
    console.error("[BootDiagnostics] failed:", e.message);
  }
}

module.exports = { logBootDiagnostics };
