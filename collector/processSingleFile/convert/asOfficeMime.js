// SPDX-License-Identifier: MIT
const { v4 } = require("uuid");
const officeParser = require("officeparser");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../utils/files");
const { tokenizeString } = require("../../utils/tokenizer");
const { default: slugify } = require("slugify");
const { guardArchiveOrThrow } = require("../../utils/safeUnzip");
const path = require("path");

const MACRO_ENABLED_EXTENSIONS = new Set([
  ".docm",
  ".xlsm",
  ".pptm",
  ".dotm",
  ".xlsb",
]);

async function asOfficeMime({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  // eslint-disable-next-line no-console
  console.log(`-- Working ${filename} --`);
  const ext = path.extname(filename || fullFilePath || "").toLowerCase();
  if (MACRO_ENABLED_EXTENSIONS.has(ext)) {
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `Refusing ${filename}: macro-enabled Office files (${ext}) are not allowed`,
      documents: [],
    };
  }
  let content;
  try {
    await guardArchiveOrThrow(fullFilePath, filename);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[asOfficeMime] Refused ${filename}: ${err.message}`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: err.message,
      documents: [],
    };
  }
  try {
    const { parseOffice } = officeParser;
    const ast = await parseOffice(fullFilePath);
    content = ast.toText();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Could not parse office or office-like file`, error);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `Failed to parse office file: ${error.message}`,
      documents: [],
    };
  }

  if (!content.length) {
    // eslint-disable-next-line no-console
    console.error(`Resulting text content was empty for ${filename}.`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  const data = {
    id: v4(),
    url: "file://" + fullFilePath,
    title: metadata.title || filename,
    docAuthor: metadata.docAuthor || "no author found",
    description: metadata.description || "No description found.",
    docSource: metadata.docSource || "Office file uploaded by the user.",
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

module.exports = asOfficeMime;
