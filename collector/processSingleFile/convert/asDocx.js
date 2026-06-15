// SPDX-License-Identifier: MIT
const { v4 } = require("uuid");
const { DocxLoader } = require("@langchain/community/document_loaders/fs/docx");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../utils/files");
const { tokenizeString } = require("../../utils/tokenizer");
const { default: slugify } = require("slugify");

async function asDocX({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  const loader = new DocxLoader(fullFilePath);

  // eslint-disable-next-line no-console
  console.log(`-- Working ${filename} --`);
  let pageContent = [];
  let docs;
  try {
    docs = await loader.load();
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

  for (const doc of docs) {
    // eslint-disable-next-line no-console
    console.log(`-- Parsing content from docx page --`);
    if (!doc.pageContent.length) continue;
    pageContent.push(doc.pageContent);
  }

  if (!pageContent.length) {
    // eslint-disable-next-line no-console
    console.error(`Resulting text content was empty for ${filename}.`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  const content = pageContent.join("");
  const data = {
    id: v4(),
    url: "file://" + fullFilePath,
    title: metadata.title || filename,
    docAuthor: metadata.docAuthor || "no author found",
    description: metadata.description || "No description found.",
    docSource: metadata.docSource || "docx file uploaded by the user.",
    chunkSource: metadata.chunkSource || "",
    published: createdDate(fullFilePath),
    wordCount: content.split(" ").length,
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
