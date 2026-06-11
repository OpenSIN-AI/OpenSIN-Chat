// SPDX-License-Identifier: MIT
/**
 * Sicherheits-Helfer für das PDF-Analyse-Modul.
 *
 * validatePdfPath: erlaubt als Analyse-Eingabe NUR Dateien innerhalb
 * explizit freigegebener Wurzelverzeichnisse (Default: das modul-eigene
 * Upload-Verzeichnis + das Dokument-Storage des Forks). Schützt gegen:
 *  - Path Traversal (../../etc/passwd)
 *  - Symlink-Ausbruch (realpath-Auflösung VOR dem Prefix-Check)
 *  - Analyse beliebiger Server-Dateien durch API-Key-Inhaber
 */
const fs = require("fs");
const path = require("path");
const config = require("./config");

function allowedRoots() {
  const roots = [
    path.join(config.STORAGE_DIR, "uploads"),
    // Dokument-Storage des Forks (hot-dir / documents), falls vorhanden:
    path.resolve(config.STORAGE_DIR, "..", "documents"),
  ];
  // Zusätzliche Freigaben per ENV (kommasepariert, absolute Pfade)
  const extra = (process.env.PDF_ANALYSIS_ALLOWED_DIRS || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return [...roots, ...extra].map((p) => path.resolve(p));
}

/**
 * Validiert und kanonisiert einen pdfPath. Wirft bei Verstoß.
 * @returns {string} der aufgelöste, sichere absolute Pfad
 */
function validatePdfPath(pdfPath) {
  if (typeof pdfPath !== "string" || !pdfPath.trim())
    throw new Error("pdfPath ist erforderlich.");
  if (!pdfPath.toLowerCase().endsWith(".pdf"))
    throw new Error("Nur .pdf-Dateien sind als Analyse-Eingabe erlaubt.");

  let resolved;
  try {
    // realpath löst Symlinks auf — der Prefix-Check erfolgt danach
    resolved = fs.realpathSync(path.resolve(pdfPath));
  } catch {
    throw new Error(`PDF nicht gefunden: ${pdfPath}`);
  }

  const ok = allowedRoots().some(
    (root) => resolved === root || resolved.startsWith(root + path.sep)
  );
  if (!ok)
    throw Object.assign(
      new Error(
        "Zugriff verweigert: pdfPath liegt außerhalb der freigegebenen Verzeichnisse."
      ),
      { statusCode: 403 }
    );

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw new Error("pdfPath ist keine reguläre Datei.");
  return resolved;
}

module.exports = { validatePdfPath, allowedRoots };
