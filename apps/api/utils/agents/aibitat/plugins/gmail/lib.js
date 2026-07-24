// SPDX-License-Identifier: MIT
// Purpose: SIN-Gmail compatibility surface backed by the local Himalaya CLI.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const mime = require("mime");
const consoleLogger = require("../../../../logger/console.js");
const { CollectorApi } = require("../../../../collectorApi");
const { humanFileSize } = require("../../../../helpers");
const { HimalayaBridge } = require("./himalaya");

const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024;

function prepareAttachment(filePath) {
  if (
    (process.env.OPENSIN_CHAT_RUNTIME || process.env.ANYTHING_LLM_RUNTIME) ===
    "docker"
  ) {
    return {
      success: false,
      error:
        "Lokale Dateianhänge sind im Docker-Modus nur möglich, wenn der Pfad ausdrücklich in den Container eingebunden wurde.",
    };
  }
  if (!path.isAbsolute(filePath)) {
    return { success: false, error: `Path must be absolute: ${filePath}` };
  }
  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File does not exist: ${filePath}` };
  }
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    return { success: false, error: `Path is not a file: ${filePath}` };
  }
  if (stats.size === 0) {
    return { success: false, error: `File is empty: ${filePath}` };
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const contentType = mime.getType(filePath) || "application/octet-stream";
    return {
      success: true,
      attachment: {
        name: fileName,
        contentType,
        data: fileBuffer.toString("base64"),
      },
      fileInfo: {
        path: filePath,
        name: fileName,
        size: stats.size,
        sizeFormatted: humanFileSize(stats.size, true),
        contentType,
      },
    };
  } catch (error) {
    return { success: false, error: `Failed to read file: ${error.message}` };
  }
}

async function parseAttachment(attachment) {
  if (!attachment?.data) {
    return {
      success: false,
      content: null,
      error:
        "Himalaya returned attachment metadata without inline data. Download the attachment explicitly before parsing it.",
    };
  }

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "sin-gmail-attachment-"),
  );
  const safeFilename = String(attachment.name || "attachment").replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );
  const tempFilePath = path.join(tempDir, safeFilename);

  try {
    fs.writeFileSync(tempFilePath, Buffer.from(attachment.data, "base64"));
    const collector = new CollectorApi();
    const result = await collector.parseDocument(safeFilename, {
      absolutePath: tempFilePath,
    });
    if (!result.success) {
      return {
        success: false,
        content: null,
        error: result.reason || "Failed to parse attachment",
      };
    }
    const content = result.documents
      ?.map((document) => document.pageContent || document.content || "")
      .filter(Boolean)
      .join("\n\n");
    return {
      success: true,
      content: content || "(No text content extracted)",
      error: null,
    };
  } catch (error) {
    return { success: false, content: null, error: error.message };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      consoleLogger.warn(
        "[sin-gmail] Failed to remove temporary attachment directory:",
        error.message,
      );
    }
  }
}

async function handleAttachments(context, messages) {
  const allAttachments = [];
  const uniqueAttachments = new Set();
  for (const [messageIndex, message] of (messages || []).entries()) {
    for (const attachment of message.attachments || []) {
      const key = `${attachment.name}:${attachment.size || 0}`;
      if (uniqueAttachments.has(key)) continue;
      uniqueAttachments.add(key);
      allAttachments.push({
        ...attachment,
        messageIndex: messageIndex + 1,
        messageId: message.id,
      });
    }
  }

  let parsedContent = "";
  const citations = [];
  const parseable = allAttachments.filter((attachment) => attachment.data);
  if (parseable.length > 0 && context.super.requestToolApproval) {
    const names = parseable.map((attachment) => attachment.name).join(", ");
    const approval = await context.super.requestToolApproval({
      skillName: context.name,
      payload: { attachments: names },
      description: `Parse attachments (${names}) to extract text content?`,
    });
    if (approval.approved) {
      const results = [];
      for (const attachment of parseable) {
        const parsed = await parseAttachment(attachment);
        if (!parsed.success) continue;
        citations.push({
          id: `gmail-attachment-${attachment.messageId}-${attachment.name}`,
          title: attachment.name,
          text: parsed.content,
          chunkSource: `himalaya-attachment://${attachment.name}`,
          score: null,
        });
        results.push({ ...attachment, ...parsed });
      }
      if (results.length > 0) {
        parsedContent =
          "\n\n--- Parsed Attachment Content ---\n" +
          results
            .map(
              (result) =>
                `\n[Message ${result.messageIndex}: ${result.name}]\n${result.content}`,
            )
            .join("\n");
      }
    }
  }

  citations.forEach((citation) => context.super.addCitation?.(citation));
  return { allAttachments, parsedContent };
}

const bridge = new HimalayaBridge();

module.exports = bridge;
module.exports.GmailBridge = HimalayaBridge;
module.exports.HimalayaBridge = HimalayaBridge;
module.exports.prepareAttachment = prepareAttachment;
module.exports.parseAttachment = parseAttachment;
module.exports.handleAttachments = handleAttachments;
module.exports.MAX_TOTAL_ATTACHMENT_SIZE = MAX_TOTAL_ATTACHMENT_SIZE;
