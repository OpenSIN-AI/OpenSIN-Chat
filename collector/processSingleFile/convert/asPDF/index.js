// SPDX-License-Identifier: MIT
const { v4 } = require("uuid");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../../utils/files");
const { tokenizeString } = require("../../../utils/tokenizer");
const { default: slugify } = require("slugify");
const PDFLoader = require("./PDFLoader");
const OCRLoader = require("../../../utils/OCRLoader");

async function asPdf({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  const pdfLoader = new PDFLoader(fullFilePath, {
    splitPages: true,
  });

  // eslint-disable-next-line no-console
  console.log(`-- Working ${filename} --`);
  const pageContent = [];
  let docs;
  try {
    docs = await pdfLoader.load();
  } catch (e) {
    console.error(`[asPDF] Failed to load PDF: ${e.message}`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `Failed to parse PDF: ${e.message}`,
      documents: [],
    };
  }

  if (docs.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[asPDF] No text content found for ${filename}. Will attempt OCR parse.`
    );
    try {
      docs = await new OCRLoader({
        targetLanguages: options?.ocr?.langList,
      }).ocrPDF(fullFilePath);
    } catch (e) {
      console.error(`[asPDF] OCR also failed for ${filename}: ${e.message}`);
      if (!options.absolutePath) trashFile(fullFilePath);
      return {
        success: false,
        reason: `No text content found in ${filename} and OCR failed: ${e.message}`,
        documents: [],
      };
    }
  }

  for (const doc of docs) {
    // eslint-disable-next-line no-console
    console.log(
      `-- Parsing content from pg ${
        doc.metadata?.loc?.pageNumber || "unknown"
      } --`
    );
    if (!doc.pageContent || !doc.pageContent.length) continue;
    pageContent.push(doc.pageContent);
  }

  if (!pageContent.length) {
    // eslint-disable-next-line no-console
    console.error(`[asPDF] Resulting text content was empty for ${filename}.`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  const content = pageContent.join("\n\n");
  const data = {
    id: v4(),
    url: "file://" + fullFilePath,
    title: metadata.title || filename,
    docAuthor:
      metadata.docAuthor ||
      docs[0]?.metadata?.pdf?.info?.Creator ||
      "no author found",
    description:
      metadata.description ||
      docs[0]?.metadata?.pdf?.info?.Title ||
      "No description found.",
    docSource: metadata.docSource || "pdf file uploaded by the user.",
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

module.exports = asPdf;
