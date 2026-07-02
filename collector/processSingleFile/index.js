// SPDX-License-Identifier: MIT
const path = require("path");
const fs = require("fs");
const {
  WATCH_DIRECTORY,
  SUPPORTED_FILETYPE_CONVERTERS,
} = require("../utils/constants");
const {
  trashFile,
  isTextType,
  normalizePath,
  isWithin,
} = require("../utils/files");
const RESERVED_FILES = ["__HOTDIR__.md"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB — matches FILE_LIMIT in collector/index.js

const ALLOWED_MIMES = new Set([
  "text/plain",
  "text/csv",
  "text/html",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/msword",
  "application/zip",
  "application/x-zip-compressed",
  "application/epub+zip",
  "application/json",
  "application/xml",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/svg+xml",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/x-m4a",
  "audio/mp4",
  "video/mp4",
  "video/x-msvideo",
  "video/quicktime",
  "application/octet-stream",
]);

let _fileTypeModulePromise = null;
async function _loadFileType() {
  if (!_fileTypeModulePromise) {
    _fileTypeModulePromise = (async () => {
      try {
        const mod = await import("file-type");
        return mod;
      } catch {
        return null;
      }
    })();
  }
  return _fileTypeModulePromise;
}

/**
 * Best-effort magic-byte MIME detection. Returns null when `file-type` is
 * unavailable, when the bytes are too short, or when detection fails. Never
 * throws.
 * @param {string} fullFilePath
 * @returns {Promise<string|null>}
 */
async function detectMime(fullFilePath) {
  try {
    const mod = await _loadFileType();
    if (!mod?.fileTypeFromFile) {
      // eslint-disable-next-line no-console
      console.warn(
        "\x1b[33m[Collector]\x1b[0m file-type package not available — skipping magic-byte MIME detection"
      );
      return null;
    }
    const detected = await mod.fileTypeFromFile(fullFilePath);
    return detected?.mime ?? null;
  } catch {
    return null;
  }
}

/**
 * Process a single file and return the documents
 * @param {string} targetFilename - The filename to process
 * @param {Object} options - The options for the file processing
 * @param {boolean} options.parseOnly - If true, the file will not be saved as a document even when `writeToServerDocuments` is called in the handler. Must be explicitly set to true to use.
 * @param {string} options.absolutePath - If provided, use this absolute path instead of resolving relative to WATCH_DIRECTORY. For internal use only.
 * @param {Object} metadata - The metadata for the file processing
 * @returns {Promise<{success: boolean, reason: string, documents: Object[]}>} - The documents from the file processing
 */
async function processSingleFile(targetFilename, options = {}, metadata = {}) {
  const fullFilePath = normalizePath(
    options.absolutePath || path.resolve(WATCH_DIRECTORY, targetFilename)
  );

  // If absolute path is not provided, check if the file is within the watch directory
  // to prevent unauthorized paths from being processed.
  if (
    !options.absolutePath &&
    !isWithin(path.resolve(WATCH_DIRECTORY), fullFilePath)
  )
    return {
      success: false,
      reason: "Filename is a not a valid path to process.",
      documents: [],
    };

  if (RESERVED_FILES.includes(targetFilename))
    return {
      success: false,
      reason: "Filename is a reserved filename and cannot be processed.",
      documents: [],
    };

  if (!fs.existsSync(fullFilePath))
    return {
      success: false,
      reason: "File does not exist in upload directory.",
      documents: [],
    };

  const fileStat = fs.statSync(fullFilePath);
  if (fileStat.size > MAX_FILE_SIZE_BYTES) {
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `File is too large (${fileStat.size} bytes > ${MAX_FILE_SIZE_BYTES} byte limit).`,
      documents: [],
    };
  }

  const fileExtension = path.extname(fullFilePath).toLowerCase();
  if (fullFilePath.includes(".") && !fileExtension) {
    return {
      success: false,
      reason: `No file extension found. This file cannot be processed.`,
      documents: [],
    };
  }

  let processFileAs = fileExtension;
  if (!SUPPORTED_FILETYPE_CONVERTERS.hasOwnProperty(fileExtension)) {
    if (isTextType(fullFilePath)) {
      // eslint-disable-next-line no-console
      console.log(
        `\x1b[33m[Collector]\x1b[0m The provided filetype of ${fileExtension} does not have a preset and will be processed as .txt.`
      );
      processFileAs = ".txt";
    } else {
      // If absolute path is provided, do NOT trash the file since it is a user provided path.
      if (!options.absolutePath) trashFile(fullFilePath);
      return {
        success: false,
        reason: `File extension ${fileExtension} not supported for parsing and cannot be assumed as text file type.`,
        documents: [],
      };
    }
  }

  const detectedMime = await detectMime(fullFilePath);
  if (
    detectedMime &&
    !ALLOWED_MIMES.has(detectedMime) &&
    processFileAs !== ".txt"
  ) {
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `Detected MIME ${detectedMime} is not in the allowed list for ${targetFilename}.`,
      documents: [],
    };
  }

  const FileTypeProcessor = require(SUPPORTED_FILETYPE_CONVERTERS[
    processFileAs
  ]);
  return await FileTypeProcessor({
    fullFilePath,
    filename: targetFilename,
    options,
    metadata,
  });
}

module.exports = {
  processSingleFile,
};
