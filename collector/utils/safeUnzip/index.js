// SPDX-License-Identifier: MIT
// Purpose: Zip-bomb protection helper. Pre-validates an archive before any
// downstream loader (DocxLoader, EPubLoader, node-xlsx, officeparser) trusts
// it. Enforces four limits:
//   1. total uncompressed bytes after expansion
//   2. number of entries (file count)
//   3. per-entry compression ratio (catches zip-slip + zip-bomb patterns)
//   4. denylist of dangerous entry names (vbaProject.bin, externalLinks/,
//      embeddings/) that indicate macro-enabled Office documents
// Docs: collector/utils/safeUnzip/index.js.doc.md
const fs = require("fs");

const DEFAULT_MAX_TOTAL_BYTES = 500 * 1024 * 1024;
const DEFAULT_MAX_FILES = 10_000;
const DEFAULT_MAX_RATIO = 100;

const DANGEROUS_ENTRY_PATTERNS = [
  /(^|[/\\])vbaProject\.bin$/i,
  /(^|[/\\])vbaData\.xml$/i,
  /(^|[/\\])externalLinks([/\\]|$)/i,
  /(^|[/\\])embeddings([/\\]|$)/i,
  /(^|[/\\])activeX([/\\]|$)/i,
];

const PATH_TRAVERSAL_PATTERNS = [
  /(^|[/\\])\.\.([/\\]|$)/,
  /^([a-zA-Z]:[/\\])/,
  /^[/\\]/,
];

function isDangerousEntryName(fileName = "") {
  if (!fileName) return false;
  for (const pat of DANGEROUS_ENTRY_PATTERNS) {
    if (pat.test(fileName)) return true;
  }
  for (const pat of PATH_TRAVERSAL_PATTERNS) {
    if (pat.test(fileName)) return true;
  }
  return false;
}

/**
 * Inspects zip archives for zip-bomb risk WITHOUT decompressing content.
 * Library resolution order:
 *   1. yauzl (preferred — stream-based, lower memory)
 *   2. adm-zip (fallback — buffers the whole archive but is widely available)
 * Each library is loaded lazily and silently falls back to a no-op if
 * neither is installed (callers see `safe: true, available: false`).
 */

function resolveYauzl() {
  try {
    return require("yauzl");
  } catch {
    return null;
  }
}

function resolveAdmZip() {
  try {
    return require("adm-zip");
  } catch {
    return null;
  }
}

/**
 * Use yauzl to walk central directory headers
 * @param {string} filePath
 * @param {{maxTotalBytes:number, maxFiles:number, maxRatio:number}} opts
 * @returns {Promise<{safe:boolean, reason?:string, available:boolean, totalUncompressed?:number, fileCount?:number}>}
 */
async function validateWithYauzl(
  filePath,
  { maxTotalBytes, maxFiles, maxRatio }
) {
  const yauzl = resolveYauzl();
  if (!yauzl)
    return { safe: false, available: false, reason: "yauzl not available" };

  return await new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    yauzl.open(filePath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        const msg = err?.message || "failed to open archive";
        // Non-zip containers (PDF, plain text, …) fail with "central directory"
        // style errors — treat those as safe so callers can still process them.
        // Real I/O / corrupt-zip errors fail closed so dangerous payloads do not
        // slip through by treating open-failure as "safe".
        if (
          /central directory|end of central directory|invalid signature|not a zip|file is not a zip/i.test(
            msg
          )
        ) {
          finish({
            safe: true,
            available: true,
            reason: "not a zip archive",
          });
        } else {
          finish({
            safe: false,
            available: true,
            reason: `Failed to open archive: ${msg}`,
          });
        }
        return;
      }
      let total = 0;
      let count = 0;
      zip.on("entry", (entry) => {
        count += 1;
        const uncompressed = entry.uncompressedSize || 0;
        const compressed = entry.compressedSize || 0;
        total += uncompressed;
        if (isDangerousEntryName(entry.fileName)) {
          finish({
            safe: false,
            available: true,
            reason: `Archive contains disallowed entry ${entry.fileName} (macros / externalLinks / embeddings are not allowed)`,
          });
          try {
            zip.close();
          } catch {
            /* ignore */
          }
          return;
        }
        if (total > maxTotalBytes) {
          finish({
            safe: false,
            available: true,
            reason: `Archive total uncompressed ${total} exceeds ${maxTotalBytes} bytes (~zip-bomb)`,
          });
          try {
            zip.close();
          } catch {
            /* ignore */
          }
          return;
        }
        if (count > maxFiles) {
          finish({
            safe: false,
            available: true,
            reason: `Archive has more than ${maxFiles} entries`,
          });
          try {
            zip.close();
          } catch {
            /* ignore */
          }
          return;
        }
        if (compressed > 0 && uncompressed / compressed > maxRatio) {
          finish({
            safe: false,
            available: true,
            reason: `Entry ${entry.fileName} has compression ratio ${
              uncompressed / compressed
            }:1 (cap ${maxRatio}:1)`,
          });
          try {
            zip.close();
          } catch {
            /* ignore */
          }
          return;
        }
        zip.readEntry();
      });
      zip.on("end", () =>
        finish({
          safe: true,
          available: true,
          totalUncompressed: total,
          fileCount: count,
        })
      );
      zip.on("error", (e) =>
        finish({
          safe: false,
          available: true,
          reason: `Failed to read archive: ${e.message}`,
        })
      );
      try {
        zip.readEntry();
      } catch (e) {
        finish({
          safe: false,
          available: true,
          reason: `Failed to read archive entries: ${e?.message || e}`,
        });
      }
    });
  });
}

/**
 * Use adm-zip to inspect entries. adm-zip buffers the whole archive in memory
 * so this is the fallback, not the default path.
 * @param {string} filePath
 * @param {{maxTotalBytes:number, maxFiles:number, maxRatio:number}} opts
 * @returns {Promise<{safe:boolean, reason?:string, available:boolean, totalUncompressed?:number, fileCount?:number}>}
 */
function validateWithAdmZip(filePath, { maxTotalBytes, maxFiles, maxRatio }) {
  const AdmZip = resolveAdmZip();
  if (!AdmZip)
    return { safe: false, available: false, reason: "adm-zip not available" };
  try {
    const archive = new AdmZip(filePath);
    const entries = archive.getEntries();
    if (entries.length > maxFiles) {
      return {
        safe: false,
        available: true,
        reason: `Archive has more than ${maxFiles} entries`,
      };
    }
    let total = 0;
    for (const entry of entries) {
      const entryName = entry.entryName || "";
      if (isDangerousEntryName(entryName)) {
        return {
          safe: false,
          available: true,
          reason: `Archive contains disallowed entry ${entryName} (macros / externalLinks / embeddings are not allowed)`,
        };
      }
      const uncompressed = entry.header?.size || 0;
      const compressed = entry.header?.compressedSize || 0;
      total += uncompressed;
      if (total > maxTotalBytes) {
        return {
          safe: false,
          available: true,
          reason: `Archive total uncompressed ${total} exceeds ${maxTotalBytes} bytes (~zip-bomb)`,
        };
      }
      if (compressed > 0 && uncompressed / compressed > maxRatio) {
        return {
          safe: false,
          available: true,
          reason: `Entry ${entryName} has compression ratio ${
            uncompressed / compressed
          }:1 (cap ${maxRatio}:1)`,
        };
      }
    }
    return {
      safe: true,
      available: true,
      totalUncompressed: total,
      fileCount: entries.length,
    };
  } catch (e) {
    return {
      safe: false,
      available: true,
      reason: `Failed to read archive: ${e.message}`,
    };
  }
}

/**
 * Pre-flight check before letting a downstream loader expand a zip-derived
 * archive (docx/xlsx/pptx/epub/etc). Returns `{safe: true}` when no scanner
 * is available (graceful degradation — caller already trusts the file).
 * @param {string} filePath
 * @param {Object} [options]
 * @param {number} [options.maxTotalBytes=500MB]
 * @param {number} [options.maxFiles=10000]
 * @param {number} [options.maxRatio=100]
 * @returns {Promise<{safe: boolean, reason?: string, available: boolean}>}
 */
async function validateArchive(
  filePath,
  {
    maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
    maxFiles = DEFAULT_MAX_FILES,
    maxRatio = DEFAULT_MAX_RATIO,
  } = {}
) {
  if (!fs.existsSync(filePath)) {
    return { safe: false, available: false, reason: "Archive does not exist" };
  }

  const yauzlResult = await validateWithYauzl(filePath, {
    maxTotalBytes,
    maxFiles,
    maxRatio,
  });
  if (yauzlResult.available !== false) return yauzlResult;
  if (yauzlResult.safe === false) return yauzlResult;

  const admResult = validateWithAdmZip(filePath, {
    maxTotalBytes,
    maxFiles,
    maxRatio,
  });
  if (admResult.available !== false) return admResult;
  if (admResult.safe === false) return admResult;

  return {
    safe: false,
    available: false,
    reason:
      "No zip validation library available (yauzl/adm-zip missing) — rejecting archive as a precaution.",
  };
}

/**
 * Throws if the archive at `filePath` looks like a zip bomb.
 * Use inside a converter handler before calling the downstream loader.
 * @param {string} filePath
 * @param {string} filename - for error messages
 * @param {Object} [options]
 */
async function guardArchiveOrThrow(filePath, filename, options) {
  const result = await validateArchive(filePath, options);
  if (!result.safe) {
    const reason = result.reason || "Unknown archive hazard";
    const detail =
      result.available === false
        ? " (no archive scanner available — refusing by default)"
        : "";
    throw new Error(`Refusing ${filename}: ${reason}${detail}`);
  }
}

module.exports = {
  validateArchive,
  guardArchiveOrThrow,
  isDangerousEntryName,
  DANGEROUS_ENTRY_PATTERNS,
  DEFAULT_MAX_TOTAL_BYTES,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_RATIO,
};
