// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const { getStoragePath, getCollectorPath } = require("../paths");
const fs = require("fs");
const path = require("path");
const { v5: uuidv5 } = require("uuid");
const crypto = require("node:crypto");
const { Document } = require("../../models/documents");
const { DocumentSyncQueue } = require("../../models/documentSyncQueue");

const documentsPath = getStoragePath("documents");
const directUploadsPath = getStoragePath("direct-uploads");
const vectorCachePath = getStoragePath("vector-cache");
const hotdirPath = getCollectorPath("hotdir");

const MAX_DOC_BYTES = 50 * 1024 * 1024;

// Should take in a folder that is a subfolder of documents
// eg: youtube-subject/video-123.json
async function fileData(filePath = null) {
  if (!filePath) throw new Error("No docPath provided in request");
  const fullFilePath = path.resolve(documentsPath, normalizePath(filePath));
  if (!isWithin(documentsPath, fullFilePath)) return null;

  let stat;
  try {
    stat = await fs.promises.stat(fullFilePath);
  } catch {
    return null;
  }
  if (stat.size > MAX_DOC_BYTES) {
    consoleLogger.warn(
      `[fileData] Refusing ${filePath}: ${stat.size} bytes exceeds ${MAX_DOC_BYTES} byte cap`,
    );
    return null;
  }
  try {
    const data = await fs.promises.readFile(fullFilePath, "utf8");
    return JSON.parse(data);
  } catch {
    consoleLogger.error(`[fileData] Failed to parse JSON from ${filePath}`);
    return null;
  }
}

async function viewLocalFiles() {
  await fs.promises.mkdir(documentsPath, { recursive: true });
  const liveSyncAvailable = await DocumentSyncQueue.enabled();
  const directory = {
    name: "documents",
    type: "folder",
    items: [],
  };

  for (const file of await fs.promises.readdir(documentsPath)) {
    if (path.extname(file) === ".md") continue;
    const folderPath = path.resolve(documentsPath, file);
    let isFolder;
    try {
      isFolder = (await fs.promises.lstat(folderPath)).isDirectory();
    } catch {
      continue;
    }
    if (isFolder) {
      const subdocs = {
        name: file,
        type: "folder",
        items: [],
      };

      const subfiles = await fs.promises.readdir(folderPath);
      const filenames = {};
      const filePromises = [];

      for (let i = 0; i < subfiles.length; i++) {
        const subfile = subfiles[i];
        const cachefilename = `${file}/${subfile}`;
        if (path.extname(subfile) !== ".json") continue;
        filePromises.push(
          fileToPickerData({
            pathToFile: path.join(folderPath, subfile),
            liveSyncAvailable,
            cachefilename,
          }),
        );
        filenames[cachefilename] = subfile;
      }
      const results = await Promise.all(filePromises)
        .then((results) => results.filter((i) => !!i)) // Remove null results
        .then((results) => results.filter((i) => hasRequiredMetadata(i))); // Remove invalid file structures
      subdocs.items.push(...results);

      // Grab the pinned workspaces, context modes, and watched documents for
      // this folder's documents at the time of the query so we don't have to
      // re-query the database for each file
      const pinnedWorkspacesByDocument =
        await getPinnedWorkspacesByDocument(filenames);
      const contextModesByDocument = await getContextModesByDocument(filenames);
      const watchedDocumentsFilenames =
        await getWatchedDocumentFilenames(filenames);
      for (const item of subdocs.items) {
        item.pinnedWorkspaces = pinnedWorkspacesByDocument[item.name] || [];
        item.contextModes = contextModesByDocument[item.name] || {};
        item.watched =
          Object.prototype.hasOwnProperty.call(
            watchedDocumentsFilenames,
            item.name,
          ) || false;
      }

      directory.items.push(subdocs);
    }
  }

  // Make sure custom-documents is always the first folder in picker
  directory.items = [
    directory.items.find((folder) => folder.name === "custom-documents"),
    ...directory.items.filter((folder) => folder.name !== "custom-documents"),
  ].filter((i) => !!i);

  return directory;
}

/**
 * Gets the documents by folder name.
 * @param {string} folderName - The name of the folder to get the documents from.
 * @returns {Promise<{folder: string, documents: any[], code: number, error: string}>} - The documents by folder name.
 */
async function getDocumentsByFolder(folderName = "") {
  if (!folderName) {
    return {
      folder: folderName,
      documents: [],
      code: 400,
      error: "Folder name must be provided.",
    };
  }

  const folderPath = path.resolve(documentsPath, normalizePath(folderName));
  let folderStat;
  try {
    folderStat = await fs.promises.lstat(folderPath);
  } catch {
    folderStat = null;
  }
  if (
    !folderStat ||
    !folderStat.isDirectory() ||
    !isWithin(documentsPath, folderPath)
  ) {
    return {
      folder: folderName,
      documents: [],
      code: 404,
      error: `Folder "${folderName}" does not exist.`,
    };
  }

  const documents = [];
  const filenames = {};
  const files = await fs.promises.readdir(folderPath);
  for (const file of files) {
    if (path.extname(file) !== ".json") continue;
    const filePath = path.join(folderPath, file);
    try {
      const st = await fs.promises.stat(filePath);
      if (st.size > MAX_DOC_BYTES) {
        consoleLogger.warn(
          `[getDocumentsByFolder] Skipping ${file}: ${st.size} bytes exceeds ${MAX_DOC_BYTES} byte cap`,
        );
        continue;
      }
    } catch {
      continue;
    }
    const cachefilename = `${folderName}/${file}`;
    let parsed;
    try {
      const rawData = await fs.promises.readFile(filePath, "utf8");
      parsed = JSON.parse(rawData);
    } catch {
      consoleLogger.error(
        `[getDocumentsByFolder] Skipping corrupt JSON: ${file}`,
      );
      continue;
    }
    const { pageContent: _pageContent, ...metadata } = parsed;
    documents.push({
      name: file,
      type: "file",
      ...metadata,
      cached: await cachedVectorInformation(cachefilename, true),
    });
    filenames[cachefilename] = file;
  }

  // Get pinned, context-mode, and watched information for each document
  const pinnedWorkspacesByDocument =
    await getPinnedWorkspacesByDocument(filenames);
  const contextModesByDocument = await getContextModesByDocument(filenames);
  const watchedDocumentsFilenames =
    await getWatchedDocumentFilenames(filenames);
  for (let doc of documents) {
    doc.pinnedWorkspaces = pinnedWorkspacesByDocument[doc.name] || [];
    doc.contextModes = contextModesByDocument[doc.name] || {};
    doc.watched = Object.prototype.hasOwnProperty.call(
      watchedDocumentsFilenames,
      doc.name,
    );
  }

  return { folder: folderName, documents, code: 200, error: null };
}

/**
 * Searches the vector-cache folder for existing information so we dont have to re-embed a
 * document and can instead push directly to vector db.
 * @param {string} filename - the filename to check for cached vector information
 * @param {boolean} checkOnly - if true, only check if the file exists, do not return the cached data
 * @returns {Promise<{exists: boolean, chunks: any[]}>} - a promise that resolves to an object containing the existence of the file and its cached chunks
 */
async function cachedVectorInformation(filename = null, checkOnly = false) {
  if (!filename) return checkOnly ? false : { exists: false, chunks: [] };

  const digest = await vectorCacheKey(filename);
  const file = path.resolve(vectorCachePath, `${digest}.json`);
  let exists;
  try {
    await fs.promises.access(file);
    exists = true;
  } catch {
    exists = false;
  }

  if (checkOnly) return exists;
  if (!exists) return { exists, chunks: [] };

  consoleLogger.log(
    `Cached vectorized results of ${filename} found! Using cached data to save on embed costs.`,
  );
  try {
    const rawData = await fs.promises.readFile(file, "utf8");
    return { exists: true, chunks: JSON.parse(rawData) };
  } catch {
    consoleLogger.error(
      `Corrupt vector-cache file detected, ignoring: ${file}`,
    );
    return { exists: false, chunks: [] };
  }
}

// vectorData: pre-chunked vectorized data for a given file that includes the proper metadata and chunk-size limit so it can be iterated and dumped into Pinecone, etc
// filename is the fullpath to the doc so we can compare by filename to find cached matches.
async function storeVectorResult(vectorData = [], filename = null) {
  if (!filename) return;

  consoleLogger.log(
    `Caching vectorized results of ${filename} to prevent duplicated embedding.`,
  );
  await fs.promises.mkdir(vectorCachePath, { recursive: true });

  const digest = await vectorCacheKey(filename);
  const writeTo = path.resolve(vectorCachePath, `${digest}.json`);
  await fs.promises.writeFile(writeTo, JSON.stringify(vectorData), "utf8");
  return;
}

// Purges a file from the documents/ folder.
async function purgeSourceDocument(filename = null) {
  if (!filename) return;
  const filePath = path.resolve(documentsPath, normalizePath(filename));

  let fileStat;
  try {
    fileStat = await fs.promises.lstat(filePath);
  } catch {
    return;
  }
  if (!fileStat.isFile() || !isWithin(documentsPath, filePath)) return;

  consoleLogger.log(`Purging source document of ${filename}.`);
  await fs.promises.rm(filePath);
  return;
}

// Purges a vector-cache file from the vector-cache/ folder.
async function purgeVectorCache(filename = null) {
  if (!filename) return;
  const digest = await vectorCacheKey(filename);
  const filePath = path.resolve(vectorCachePath, `${digest}.json`);

  let cacheStat;
  try {
    cacheStat = await fs.promises.lstat(filePath);
  } catch {
    return;
  }
  if (!cacheStat.isFile()) return;

  consoleLogger.log(`Purging vector-cache of ${filename}.`);
  await fs.promises.rm(filePath);
  return;
}

// Search for a specific document by its unique name in the entire `documents`
// folder via iteration of all folders and checking if the expected file exists.
async function findDocumentInDocuments(documentName = null) {
  if (!documentName) return null;
  for (const folder of await fs.promises.readdir(documentsPath)) {
    let isFolder;
    try {
      isFolder = (
        await fs.promises.lstat(path.join(documentsPath, folder))
      ).isDirectory();
    } catch {
      continue;
    }
    if (!isFolder) continue;

    const targetFilename = normalizePath(documentName);
    const targetFileLocation = path.join(documentsPath, folder, targetFilename);

    if (!isWithin(documentsPath, targetFileLocation)) continue;

    try {
      await fs.promises.access(targetFileLocation);
    } catch {
      continue;
    }

    try {
      const st = await fs.promises.stat(targetFileLocation);
      if (st.size > MAX_DOC_BYTES) {
        consoleLogger.warn(
          `[findDocumentInDocuments] Skipping ${targetFilename}: ${st.size} bytes exceeds ${MAX_DOC_BYTES} byte cap`,
        );
        continue;
      }
    } catch {
      continue;
    }
    const cachefilename = `${folder}/${targetFilename}`;
    let parsed;
    try {
      const rawData = await fs.promises.readFile(targetFileLocation, "utf8");
      parsed = JSON.parse(rawData);
    } catch {
      continue;
    }
    const { pageContent: _pageContent, ...metadata } = parsed;
    return {
      name: targetFilename,
      type: "file",
      ...metadata,
      cached: await cachedVectorInformation(cachefilename, true),
    };
  }

  return null;
}

/**
 * Checks if a given path is strictly within another path. Used to prevent
 * path-traversal attacks (CWE-22). Both arguments are resolved to absolute
 * paths via `fs.realpathSync` so symlinks are followed and a symlink inside
 * `outer` that points outside it is correctly rejected.
 *
 * @param {string} outer - The containing directory path.
 * @param {string} inner - The path to test.
 * @returns {boolean} True if `inner` is strictly inside `outer`, false otherwise.
 */
function isWithin(outer, inner) {
  try {
    const realOuter = fs.realpathSync(outer);
    const realInner = fs.realpathSync(inner);
    const rel = path.relative(realOuter, realInner);

    if (rel === "") return false;
    return (
      !rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel)
    );
  } catch (e) {
    if (e?.code === "ENOENT") {
      const resolvedOuter = path.resolve(outer);
      const resolvedInner = path.resolve(inner);
      const rel = path.relative(resolvedOuter, resolvedInner);
      if (rel === "") return false;
      return (
        !rel.startsWith(`..${path.sep}`) &&
        rel !== ".." &&
        !path.isAbsolute(rel)
      );
    }
    return false;
  }
}

function normalizePath(filepath = "") {
  const result = path
    .normalize(String(filepath).replace(/\0/g, "").trim())
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .trim();
  if (["..", ".", "/"].includes(result)) throw new Error("Invalid path.");
  return result;
}

async function contentHash(filePath) {
  if (!filePath) return "";
  try {
    const fd = await fs.promises.open(filePath, "r");
    try {
      const stat = await fd.stat();
      const sampleBytes = Math.min(8192, stat.size);
      const head = Buffer.allocUnsafe(sampleBytes);
      await fd.read(head, 0, sampleBytes, 0);
      const tailBytes = Math.min(8192, stat.size);
      const tail = Buffer.allocUnsafe(tailBytes);
      if (stat.size > 8192) {
        await fd.read(tail, 0, tailBytes, stat.size - tailBytes);
      } else {
        tail.set(head.subarray(0, tailBytes));
      }
      return crypto
        .createHash("sha256")
        .update(head)
        .update(tail)
        .update(String(stat.size))
        .update(String(stat.mtimeMs || 0))
        .digest("hex")
        .slice(0, 16);
    } finally {
      await fd.close();
    }
  } catch {
    return "";
  }
}

async function vectorCacheKey(filename) {
  const resolved = path.resolve(filename);
  const hash = await contentHash(resolved);
  if (!hash) return uuidv5(resolved, uuidv5.URL);
  return uuidv5(`${resolved}:${hash}`, uuidv5.URL);
}

/**
 * Strips characters that are illegal in Windows filenames, including Unicode
 * quotation marks (U+201C, U+201D, etc.) that can get corrupted into ASCII
 * double-quotes during charset conversion in the upload pipeline.
 * @param {string} fileName - The filename to sanitize.
 * @returns {string} - The sanitized filename.
 */
function sanitizeFileName(fileName) {
  if (!fileName) return fileName;
  return fileName.replace(
    // eslint-disable-next-line no-control-regex
    /[\x00-\x1F<>:"/\\|?*\u201C\u201D\u201E\u201F\u2018\u2019\u201A\u201B\u202E\u200E\u200F\u200B-\u200D]/g,
    "",
  );
}

// Check if the vector-cache folder is empty or not
// useful for it the user is changing embedders as this will
// break the previous cache.
async function hasVectorCachedFiles() {
  try {
    const entries = await fs.promises.readdir(vectorCachePath);
    return entries.filter((name) => name.endsWith(".json")).length !== 0;
  } catch (e) {
    if (e.code !== "ENOENT") {
      consoleLogger.error("Error reading vector cache directory:", e.message);
    }
  }
  return false;
}

/**
 * @param {string[]} filenames - array of filenames to check for pinned workspaces
 * @returns {Promise<Record<string, string[]>>} - a record of filenames and their corresponding workspaceIds
 */
async function getPinnedWorkspacesByDocument(filenames = []) {
  return (
    await Document.where(
      {
        docpath: {
          in: Object.keys(filenames),
        },
        pinned: true,
      },
      null,
      null,
      null,
      {
        workspaceId: true,
        docpath: true,
      },
    )
  ).reduce((result, { workspaceId, docpath }) => {
    const filename = filenames[docpath];
    if (!result[filename]) result[filename] = [];
    if (!result[filename].includes(workspaceId))
      result[filename].push(workspaceId);
    return result;
  }, {});
}

/**
 * @param {Record<string, string>} filenames - map of docpath → picker filename
 * @returns {Promise<Record<string, Record<string|number, string>>>}
 *   filename → { [workspaceId]: contextMode }
 */
async function getContextModesByDocument(filenames = {}) {
  const paths = Object.keys(filenames);
  if (paths.length === 0) return {};
  return (
    await Document.where(
      {
        docpath: { in: paths },
        contextMode: { in: ["summary", "full"] },
      },
      null,
      null,
      null,
      {
        workspaceId: true,
        docpath: true,
        contextMode: true,
      },
    )
  ).reduce((result, { workspaceId, docpath, contextMode }) => {
    const filename = filenames[docpath];
    if (!filename) return result;
    if (!result[filename]) result[filename] = {};
    result[filename][workspaceId] = contextMode;
    result[filename][String(workspaceId)] = contextMode;
    return result;
  }, {});
}

/**
 * Get a record of filenames and their corresponding workspaceIds that have watched a document
 * that will be used to determine if a document should be displayed in the watched documents sidebar
 * @param {string[]} filenames - array of filenames to check for watched workspaces
 * @returns {Promise<Record<string, string[]>>} - a record of filenames and their corresponding workspaceIds
 */
async function getWatchedDocumentFilenames(filenames = []) {
  return (
    await Document.where(
      {
        docpath: { in: Object.keys(filenames) },
        watched: true,
      },
      null,
      null,
      null,
      { workspaceId: true, docpath: true },
    )
  ).reduce((result, { workspaceId, docpath }) => {
    const filename = filenames[docpath];
    result[filename] = workspaceId;
    return result;
  }, {});
}

/**
 * Purges the entire vector-cache folder and recreates it.
 * @returns {void}
 */
async function purgeEntireVectorCache() {
  await fs.promises.rm(vectorCachePath, { recursive: true, force: true });
  await fs.promises.mkdir(vectorCachePath, { recursive: true });
  return;
}

/**
 * File size threshold for files that are too large to be read into memory (MB)
 *
 * If the file is larger than this, we will stream it and parse it in chunks
 * This is to prevent us from using too much memory when parsing large files
 * or loading the files in the file picker.
 */
const FILE_READ_SIZE_THRESHOLD = 150 * (1024 * 1024);

/**
 * Converts a file to picker data
 * @param {string} pathToFile - The path to the file to convert
 * @param {boolean} liveSyncAvailable - Whether live sync is available
 * @returns {Promise<{name: string, type: string, [string]: any, cached: boolean, canWatch: boolean}>} - The picker data
 */
async function fileToPickerData({
  pathToFile,
  liveSyncAvailable = false,
  cachefilename = null,
}) {
  let metadata = {};
  const filename = path.basename(pathToFile);
  const fileStats = await fs.promises.stat(pathToFile);
  const cachedStatus = await cachedVectorInformation(cachefilename, true);

  if (fileStats.size < FILE_READ_SIZE_THRESHOLD) {
    if (fileStats.size > MAX_DOC_BYTES) {
      consoleLogger.warn(
        `[fileToPickerData] Skipping ${pathToFile}: ${fileStats.size} bytes exceeds ${MAX_DOC_BYTES} byte cap`,
      );
      return null;
    }
    let rawData;
    try {
      rawData = await fs.promises.readFile(pathToFile, "utf8");
    } catch (err) {
      consoleLogger.error("Error reading file", err);
      return null;
    }
    try {
      metadata = JSON.parse(rawData);
      // Remove the pageContent field from the metadata - it is large and not needed for the picker
      delete metadata.pageContent;
    } catch (err) {
      consoleLogger.error("Error parsing file", err);
      return null;
    }

    return {
      name: filename,
      type: "file",
      ...metadata,
      cached: cachedStatus,
      canWatch: liveSyncAvailable
        ? DocumentSyncQueue.canWatch(metadata)
        : false,
      // pinnedWorkspaces: [], // This is the list of workspaceIds that have pinned this document
      // watched: false, // boolean to indicate if this document is watched in ANY workspace
    };
  }

  consoleLogger.log(
    `Stream-parsing ${path.basename(pathToFile)} because it exceeds the ${FILE_READ_SIZE_THRESHOLD} byte limit.`,
  );
  const stream = fs.createReadStream(pathToFile, { encoding: "utf8" });
  try {
    let fileContent = "";
    metadata = await new Promise((resolve, reject) => {
      stream
        .on("data", (chunk) => {
          fileContent += chunk;
        })
        .on("end", () => {
          try {
            metadata = JSON.parse(fileContent);
            // Remove the pageContent field from the metadata - it is large and not needed for the picker
            delete metadata.pageContent;
            resolve(metadata);
          } catch (parseErr) {
            consoleLogger.error("Error parsing JSON from stream", parseErr);
            reject(new Error("Failed to parse streamed file content as JSON"));
          }
        })
        .on("error", (err) => {
          consoleLogger.error("Error parsing file", err);
          reject(null);
        });
    }).catch((err) => {
      consoleLogger.error("Error parsing file", err);
    });
  } catch (err) {
    consoleLogger.error("Error parsing file", err);
    metadata = null;
  } finally {
    stream.destroy();
  }

  // If the metadata is empty or something went wrong, return null
  if (!metadata || !Object.keys(metadata)?.length) {
    consoleLogger.log(`Stream-parsing failed for ${path.basename(pathToFile)}`);
    return null;
  }

  return {
    name: filename,
    type: "file",
    ...metadata,
    cached: cachedStatus,
    canWatch: liveSyncAvailable ? DocumentSyncQueue.canWatch(metadata) : false,
  };
}

const REQUIRED_FILE_OBJECT_FIELDS = [
  "name",
  "type",
  "url",
  "title",
  "docAuthor",
  "description",
  "docSource",
  "chunkSource",
  "published",
  "wordCount",
  "token_count_estimate",
];

/**
 * Checks if a given metadata object has all the required fields
 * @param {{name: string, type: string, url: string, title: string, docAuthor: string, description: string, docSource: string, chunkSource: string, published: string, wordCount: number, token_count_estimate: number}} metadata - The metadata object to check (fileToPickerData)
 * @returns {boolean} - Returns true if the metadata object has all the required fields, false otherwise
 */
function hasRequiredMetadata(metadata = {}) {
  return REQUIRED_FILE_OBJECT_FIELDS.every((field) =>
    Object.prototype.hasOwnProperty.call(metadata, field),
  );
}

module.exports = {
  findDocumentInDocuments,
  cachedVectorInformation,
  viewLocalFiles,
  purgeSourceDocument,
  purgeVectorCache,
  storeVectorResult,
  fileData,
  normalizePath,
  isWithin,
  documentsPath,
  directUploadsPath,
  hasVectorCachedFiles,
  purgeEntireVectorCache,
  getDocumentsByFolder,
  hotdirPath,
  sanitizeFileName,
};
