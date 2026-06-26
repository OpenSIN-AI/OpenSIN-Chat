// SPDX-License-Identifier: MIT
const { v4 } = require("uuid");
const fs = require("fs");
const { mboxParser } = require("mbox-parser");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../utils/files");
const { tokenizeString } = require("../../utils/tokenizer");
const { default: slugify } = require("slugify");

const MBOX_MAX_BYTES = 500 * 1024 * 1024;

async function asMbox({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  // eslint-disable-next-line no-console
  console.log(`-- Working ${filename} --`);

  try {
    const stat = fs.statSync(fullFilePath);
    if (stat.size > MBOX_MAX_BYTES) {
      if (!options.absolutePath) trashFile(fullFilePath);
      return {
        success: false,
        reason: `Mbox file exceeds ${MBOX_MAX_BYTES} byte limit (${stat.size} bytes).`,
        documents: [],
      };
    }
  } catch (statErr) {
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `Cannot stat mbox file: ${statErr.message}`,
      documents: [],
    };
  }

  let mails = [];
  const mboxStream = fs.createReadStream(fullFilePath);
  try {
    mails = await mboxParser(mboxStream).catch(
      (error) => {
        // eslint-disable-next-line no-console
        console.error(`Could not parse mail items`, error);
        return [];
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Could not parse mail items`, error);
    mails = [];
  } finally {
    mboxStream.destroy();
  }

  if (!mails.length) {
    // eslint-disable-next-line no-console
    console.error(`Resulting mail items was empty for ${filename}.`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `No mail items found in ${filename}.`,
      documents: [],
    };
  }

  let item = 0;
  const documents = [];
  try {
    for (const mail of mails) {
      if (!mail.hasOwnProperty("text")) continue;

      const content = mail.text;
      if (!content) continue;
      // eslint-disable-next-line no-console
      console.log(
        `-- Working on message "${mail.subject || "Unknown subject"}" --`
      );

      const data = {
        id: v4(),
        url: "file://" + fullFilePath,
        title:
          metadata.title ||
          (mail?.subject
            ? slugify(mail?.subject?.replace(".", "")) + ".mbox"
            : `msg_${item}-${filename}`),
        docAuthor: metadata.docAuthor || mail?.from?.text,
        description: metadata.description || "No description found.",
        docSource:
          metadata.docSource || "Mbox message file uploaded by the user.",
        chunkSource: metadata.chunkSource || "",
        published: createdDate(fullFilePath),
        wordCount: content.split(/\s+/).filter(Boolean).length,
        pageContent: content,
        token_count_estimate: tokenizeString(content),
      };

      item++;
      const document = writeToServerDocuments({
        data,
        filename: `${slugify(filename)}-${data.id}-msg-${item}`,
        options: { parseOnly: options.parseOnly },
      });
      documents.push(document);
    }
  } finally {
    if (!options.absolutePath) trashFile(fullFilePath);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[SUCCESS]: ${filename} messages converted & ready for embedding.\n`
  );
  if (documents.length === 0) {
    return {
      success: false,
      reason: `No mail items with text content found in ${filename}.`,
      documents: [],
    };
  }

  return { success: true, reason: null, documents };
}

module.exports = asMbox;
