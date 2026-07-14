// SPDX-License-Identifier: MIT
const { v4 } = require("uuid");
const fs = require("fs");
const { tokenizeString } = require("../../utils/tokenizer");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../utils/files");
const { default: slugify } = require("slugify");

const TXT_MAX_BYTES = 500 * 1024 * 1024;

/**
 * Reads a text file with automatic encoding detection via BOM sniffing.
 * Supports UTF-8 (with/without BOM), UTF-16 LE, UTF-16 BE, and Latin-1
 * fallback for files without a BOM that contain invalid UTF-8 sequences.
 * @param {string} filePath - Path to the file to read.
 * @returns {string} Decoded text content.
 */
function readTextFileWithEncoding(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length > TXT_MAX_BYTES) {
    throw new Error(
      `File exceeds ${TXT_MAX_BYTES} byte limit (${buffer.length} bytes).`
    );
  }

  if (buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return buffer.subarray(2).toString("utf16le");
    }
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      const swapped = Buffer.allocUnsafe(buffer.length - 2);
      for (let i = 2, j = 0; i < buffer.length; i += 2, j += 2) {
        swapped[j] = buffer[i + 1];
        swapped[j + 1] = buffer[i];
      }
      return swapped.toString("utf16le");
    }
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return buffer.subarray(3).toString("utf8");
  }

  const utf8 = buffer.toString("utf8");
  if (utf8.includes("\uFFFD")) {
    return buffer.toString("latin1");
  }
  return utf8;
}

async function asTxt({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  let content;
  try {
    content = readTextFileWithEncoding(fullFilePath);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Could not read file!", err);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `Failed to read file: ${err.message}`,
      documents: [],
    };
  }

  if (!content?.length) {
    // eslint-disable-next-line no-console
    console.error(`Resulting text content was empty for ${filename}.`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  // eslint-disable-next-line no-console
  console.log(`-- Working ${filename} --`);
  const data = {
    id: v4(),
    url: "file://" + fullFilePath,
    title: metadata.title || filename,
    docAuthor: metadata.docAuthor || "Unknown",
    description: metadata.description || "Unknown",
    docSource: metadata.docSource || "a text file uploaded by the user.",
    chunkSource: metadata.chunkSource || "",
    published: createdDate(fullFilePath),
    wordCount: content.split(/\s+/).filter(Boolean).length,
    pageContent: content,
    token_count_estimate: tokenizeString(content),
  };

  const document = writeToServerDocuments({
    data,
    filename: `${slugify(filename)}-${data.id}`,
    options: { parseOnly: options.parseOnly },
  });
  if (!options.absolutePath) trashFile(fullFilePath);
  // eslint-disable-next-line no-console
  console.log(`[SUCCESS]: ${filename} converted & ready for embedding.\n`);
  return { success: true, reason: null, documents: [document] };
}

module.exports = asTxt;
