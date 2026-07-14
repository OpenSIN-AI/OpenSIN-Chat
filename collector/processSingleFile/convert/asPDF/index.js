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

/**
 * Runs OCR over a PDF with a single, authoritative execution cap.
 *
 * The cap (OCR_TIMEOUT_MS, default 10 min) is passed straight into
 * OCRLoader.ocrPDF so there is exactly ONE effective limit. Previously an
 * outer Promise.race wrapped ocrPDF while ocrPDF applied its own, shorter
 * 5-minute internal cap — meaning the outer/env value never actually took
 * effect. Uploads are parsed asynchronously now, so no reverse proxy can
 * cut the connection mid-OCR; the cap is only a runaway-process backstop.
 *
 * @param {string} fullFilePath
 * @param {object} options - the converter options (options.ocr.langList)
 * @returns {Promise<{pageContent: string, metadata: object}[]>}
 */
async function runOcr(fullFilePath, options = {}) {
  const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS) || 600_000;
  return await new OCRLoader({
    targetLanguages: options?.ocr?.langList,
  }).ocrPDF(fullFilePath, { maxExecutionTime: OCR_TIMEOUT_MS });
}

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
      docs = await runOcr(fullFilePath, options);
    } catch (e) {
      console.error(`[asPDF] OCR also failed for ${filename}: ${e.message}`);
      if (!options.absolutePath) trashFile(fullFilePath);
      return {
        success: false,
        reason: `No text content found in ${filename} and OCR failed: ${e.message}`,
        documents: [],
      };
    }
  } else {
    // Mixed PDF handling: a document can contain both digital-text pages and
    // scanned/image-only pages. The digital loader silently drops pages with
    // no extractable text, so those scanned pages would be lost entirely.
    // When a significant fraction of pages have no text we OCR the document
    // and merge — preferring the (cleaner) digital text where it exists and
    // filling the gaps with OCR output.
    const totalPages =
      Number(docs[0]?.metadata?.pdf?.totalPages) || docs.length;
    const textPages = docs.length;
    // If fewer than this ratio of pages carry text, treat it as a mixed/
    // partially-scanned document. Configurable via env; set to 0 to disable.
    const minTextRatio = (() => {
      const raw = Number(process.env.PDF_OCR_MERGE_RATIO);
      return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5;
    })();

    if (
      minTextRatio > 0 &&
      totalPages > textPages &&
      textPages < totalPages * minTextRatio
    ) {
      // eslint-disable-next-line no-console
      console.log(
        `[asPDF] Only ${textPages}/${totalPages} pages contain digital text ` +
          `for ${filename}. Running OCR to recover scanned pages.`
      );
      try {
        const ocrDocs = await runOcr(fullFilePath, options);
        if (ocrDocs.length > 0) {
          // Merge by page number: digital text wins, OCR fills the gaps.
          const byPage = new Map();
          for (const doc of ocrDocs) {
            const pg = doc?.metadata?.loc?.pageNumber;
            if (pg && doc.pageContent?.trim()) byPage.set(pg, doc);
          }
          for (const doc of docs) {
            const pg = doc?.metadata?.loc?.pageNumber;
            if (pg && doc.pageContent?.trim()) byPage.set(pg, doc);
          }
          docs = [...byPage.values()].sort(
            (a, b) =>
              (a?.metadata?.loc?.pageNumber || 0) -
              (b?.metadata?.loc?.pageNumber || 0)
          );
        }
      } catch (e) {
        // Non-fatal: keep the digital text we already have.
        console.error(
          `[asPDF] Supplemental OCR failed for ${filename}, keeping digital text only: ${e.message}`
        );
      }
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
