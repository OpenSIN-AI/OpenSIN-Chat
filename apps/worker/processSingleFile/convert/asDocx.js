// SPDX-License-Identifier: MIT
const { v4 } = require("uuid");
const mammoth = require("mammoth");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../utils/files");
const { tokenizeString } = require("../../utils/tokenizer");
const { default: slugify } = require("slugify");
const { guardArchiveOrThrow } = require("../../utils/safeUnzip");

async function asDocX({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  try {
    await guardArchiveOrThrow(fullFilePath, filename);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[asDocX] Refused ${filename}: ${err.message}`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: err.message,
      documents: [],
    };
  }

  // eslint-disable-next-line no-console
  console.log(`-- Working ${filename} --`);
  let content;
  try {
    const result = await mammoth.extractRawText({ path: fullFilePath });
    content = result.value?.trim() || "";
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Could not parse docx file ${filename}.`, err);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `Failed to parse docx file: ${err.message}`,
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
    docSource: metadata.docSource || "docx file uploaded by the user.",
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

module.exports = asDocX;
