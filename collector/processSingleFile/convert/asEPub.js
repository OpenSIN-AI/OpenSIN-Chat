// SPDX-License-Identifier: MIT
const { v4 } = require("uuid");
const { EPubLoader } = require("@langchain/community/document_loaders/fs/epub");
const { tokenizeString } = require("../../utils/tokenizer");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../utils/files");
const { default: slugify } = require("slugify");

async function asEPub({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  let content = "";
  try {
    const loader = new EPubLoader(fullFilePath, { splitChapters: false });
    const docs = await loader.load();
    docs.forEach((doc) => (content += doc.pageContent));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Could not read epub file!", err);
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
    docSource: metadata.docSource || "epub file uploaded by the user.",
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

module.exports = asEPub;
