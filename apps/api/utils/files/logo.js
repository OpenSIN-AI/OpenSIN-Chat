// SPDX-License-Identifier: MIT
const { getStoragePath } = require("../paths");
const path = require("path");
const fs = require("fs");
const mime = require("mime");
const { v4 } = require("uuid");
const { SystemSettings } = require("../../models/systemSettings");
const { normalizePath, isWithin } = require(".");

// OpenSIN native logo filenames. New installations use these.
const LOGO_FILENAME = "opensin-logo.png";
const LOGO_FILENAME_DARK = "opensin-logo-dark.png";

// Legacy AnythingLLM logo filenames. Kept as a compatibility shim so that
// existing AnythingLLM installations (which may have stored an admin-uploaded
// logo under these names) keep working when the operator migrates to OpenSIN-Chat
// without renaming their asset files. Order matters: OpenSIN names come first
// so a fresh install never falls back to legacy paths.
const DEFAULT_LOGO_FILENAMES = [
  LOGO_FILENAME,
  LOGO_FILENAME_DARK,
  "anythingllm-logo.png",
  "anythingllm-logo-dark.png",
];

/**
 * Checks if the filename is one of the recognized default logo filenames
 * (OpenSIN native + AnythingLLM legacy shim).
 * @param {string} filename - The filename to check.
 * @returns {boolean} Whether the filename is a known default logo filename.
 */
function isDefaultFilename(filename) {
  return DEFAULT_LOGO_FILENAMES.includes(filename);
}

function validFilename(newFilename = "") {
  return !isDefaultFilename(newFilename);
}

/**
 * Returns the default logo filename for the given theme.
 * - darkMode=true  → opensin-logo-dark.png  (white logo, for dark backgrounds)
 * - darkMode=false → opensin-logo.png        (dark logo, for light backgrounds)
 * @param {boolean} darkMode - Whether the UI is currently in dark mode.
 * @returns {string} The filename of the logo.
 */
function getDefaultFilename(darkMode = true) {
  return darkMode ? LOGO_FILENAME_DARK : LOGO_FILENAME;
}

/**
 * Legacy shim: returns the AnythingLLM default logo filename for the given
 * theme. Used only as a last-resort fallback when no OpenSIN default is
 * present on disk (e.g. an old AnythingLLM installation that was upgraded
 * to OpenSIN-Chat without copying/replacing the asset files).
 */
function getLegacyDefaultFilename(darkMode = true) {
  return darkMode ? "anythingllm-logo-dark.png" : "anythingllm-logo.png";
}

async function determineLogoFilepath(defaultFilename = LOGO_FILENAME) {
  const currentLogoFilename = await SystemSettings.currentLogoFilename();
  const basePath = getStoragePath("assets");
  const defaultFilepath = path.join(basePath, defaultFilename);

  if (currentLogoFilename && validFilename(currentLogoFilename)) {
    const customLogoPath = path.join(
      basePath,
      normalizePath(currentLogoFilename),
    );
    if (!isWithin(path.resolve(basePath), path.resolve(customLogoPath)))
      return defaultFilepath;
    return fs.existsSync(customLogoPath) ? customLogoPath : defaultFilepath;
  }

  // No custom logo set. Try the requested OpenSIN default first.
  if (fs.existsSync(defaultFilepath)) return defaultFilepath;

  // Fallback: legacy AnythingLLM default (covers the upgrade-without-rename
  // scenario). Only consulted when the OpenSIN default is missing on disk.
  const legacyFilename = getLegacyDefaultFilename(
    defaultFilename === LOGO_FILENAME_DARK,
  );
  const legacyFilepath = path.join(basePath, legacyFilename);
  if (fs.existsSync(legacyFilepath)) return legacyFilepath;

  return defaultFilepath;
}

function fetchLogo(logoPath) {
  if (!fs.existsSync(logoPath)) {
    return {
      found: false,
      buffer: null,
      size: 0,
      mime: "none/none",
    };
  }

  const mimeType = mime.getType(logoPath);
  const buffer = fs.readFileSync(logoPath);
  return {
    found: true,
    buffer,
    size: buffer.length,
    mime: mimeType,
  };
}

async function renameLogoFile(originalFilename = null) {
  const extname = path.extname(originalFilename) || ".png";
  const newFilename = `${v4()}${extname}`;
  const assetsDirectory = getStoragePath("assets");
  const originalFilepath = path.join(
    assetsDirectory,
    normalizePath(originalFilename),
  );
  if (!isWithin(path.resolve(assetsDirectory), path.resolve(originalFilepath)))
    throw new Error("Invalid file path.");

  // The output always uses a random filename.
  const outputFilepath = getStoragePath("assets", normalizePath(newFilename));

  fs.renameSync(originalFilepath, outputFilepath);
  return newFilename;
}

async function removeCustomLogo(logoFilename = LOGO_FILENAME) {
  if (!logoFilename || !validFilename(logoFilename)) return false;
  const assetsDirectory = getStoragePath("assets");

  const logoPath = path.join(assetsDirectory, normalizePath(logoFilename));
  if (!isWithin(path.resolve(assetsDirectory), path.resolve(logoPath)))
    throw new Error("Invalid file path.");
  if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
  return true;
}

module.exports = {
  fetchLogo,
  renameLogoFile,
  removeCustomLogo,
  validFilename,
  getDefaultFilename,
  getLegacyDefaultFilename,
  determineLogoFilepath,
  isDefaultFilename,
  LOGO_FILENAME,
  LOGO_FILENAME_DARK,
  DEFAULT_LOGO_FILENAMES,
};
