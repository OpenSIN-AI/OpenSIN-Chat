// SPDX-License-Identifier: MIT
/**
 * Report retention — bounds the generated-reports storage directory.
 *
 * Purpose: Prevents disk-fill DoS via unlimited report generation. Called
 * before every report write (cheap: one readdir + stats on PDFs only).
 *
 * Policy (configurable via env):
 *   REPORTS_MAX_FILES    (default 100) — keep at most N PDFs; oldest deleted first
 *   REPORTS_MAX_AGE_DAYS (default 30)  — delete PDFs older than N days
 */

const path = require("path");
const fs = require("fs");

/**
 * Enforce retention policy on a reports directory.
 * Never throws — retention failures must not block report generation.
 * @param {string} storageDir - absolute path to the reports directory
 * @returns {{deleted: number}} number of files removed
 */
function enforceReportRetention(storageDir) {
  let deleted = 0;
  try {
    if (!storageDir || !fs.existsSync(storageDir)) return { deleted };

    const maxFiles = parseInt(process.env.REPORTS_MAX_FILES || "100", 10);
    const maxAgeMs =
      parseInt(process.env.REPORTS_MAX_AGE_DAYS || "30", 10) *
      24 * 60 * 60 * 1000;
    const now = Date.now();

    const pdfs = fs
      .readdirSync(storageDir)
      .filter((f) => f.endsWith(".pdf"))
      .map((f) => {
        const full = path.join(storageDir, f);
        try {
          return { full, mtimeMs: fs.statSync(full).mtimeMs };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.mtimeMs - b.mtimeMs); // oldest first

    // 1) Age-based cleanup
    for (const file of pdfs) {
      if (now - file.mtimeMs > maxAgeMs) {
        try {
          fs.unlinkSync(file.full);
          deleted++;
        } catch {
          /* ignore */
        }
      }
    }

    // 2) Count-based cleanup (keep newest maxFiles, leave room for the next write)
    const remaining = pdfs.filter((f) => fs.existsSync(f.full));
    const overflow = remaining.length - (maxFiles - 1);
    for (let i = 0; i < overflow; i++) {
      try {
        fs.unlinkSync(remaining[i].full);
        deleted++;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* retention must never block generation */
  }
  return { deleted };
}

module.exports = { enforceReportRetention };
