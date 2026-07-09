// SPDX-License-Identifier: MIT
// Attachment handling functions for the Outlook plugin.
// Split from outlook/lib.js as part of issue #528 — God-File reduction.

const fs = require("fs");
const path = require("path");
const os = require("os");
const mime = require("mime");
const { CollectorApi } = require("../../../../collectorApi");
const { humanFileSize } = require("../../../../helpers");

const {
  MAX_TOTAL_ATTACHMENT_SIZE,
  PARSEABLE_ATTACHMENT_MIMES,
} = require("./constants.js");

/**
 * Validates and prepares a file attachment for email.
 * @param {string} filePath - Absolute path to the file
 * @returns {{success: boolean, attachment?: object, error?: string, fileInfo?: object}}
 */
function prepareAttachment(filePath) {
  if (
    (process.env.OPENSIN_CHAT_RUNTIME || process.env.ANYTHING_LLM_RUNTIME) ===
    "docker"
  ) {
    return {
      success: false,
      error: "File attachments are not supported in Docker environments.",
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
    const base64Data = fileBuffer.toString("base64");
    const fileName = path.basename(filePath);
    const contentType = mime.getType(filePath) || "application/octet-stream";

    return {
      success: true,
      attachment: {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: fileName,
        contentType,
        contentBytes: base64Data,
      },
      fileInfo: {
        path: filePath,
        name: fileName,
        size: stats.size,
        sizeFormatted: humanFileSize(stats.size, true),
        contentType,
      },
    };
  } catch (e) {
    return { success: false, error: `Failed to read file: ${e.message}` };
  }
}

/**
 * Parse an attachment using the CollectorApi for secure content extraction.
 * @param {Object} attachment - The attachment object with name, contentType, size, contentBytes (base64)
 * @returns {Promise<{success: boolean, content: string|null, error: string|null}>}
 */
async function parseAttachment(attachment) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "outlook-attachment-"));
  const safeFilename = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const tempFilePath = path.join(tempDir, safeFilename);

  try {
    const buffer = Buffer.from(attachment.contentBytes, "base64");
    fs.writeFileSync(tempFilePath, buffer);

    const collector = new CollectorApi();
    const result = await collector.parseDocument(safeFilename, {
      absolutePath: tempFilePath,
    });

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) { console.warn("[attachments] non-fatal error:", e?.message || e); }

    if (!result.success) {
      return {
        success: false,
        content: null,
        error: result.reason || "Failed to parse attachment",
      };
    }

    const textContent = result.documents
      ?.map((doc) => doc.pageContent || doc.content || "")
      .filter(Boolean)
      .join("\n\n");

    return {
      success: true,
      content: textContent || "(No text content extracted)",
      error: null,
    };
  } catch (e) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) { console.warn("[attachments] non-fatal error:", e?.message || e); }
    return { success: false, content: null, error: e.message };
  }
}

/**
 * Checks if an attachment's MIME type can be parsed for text extraction.
 * @param {string} contentType - The MIME type of the attachment
 * @returns {boolean}
 */
function isParseableMimeType(contentType) {
  if (!contentType) return false;
  const baseMime = contentType.split(";")[0].trim().toLowerCase();
  return PARSEABLE_ATTACHMENT_MIMES.includes(baseMime);
}

/**
 * Collect attachments from messages and optionally parse them with user approval.
 * Only attachments with parseable MIME types will be offered for parsing.
 * If two attachments have the same name, only the first one will be kept (handling fwd emails)
 * @param {Object} context - The handler context (this) from the aibitat function
 * @param {Array} messages - Array of message objects
 * @returns {Promise<{allAttachments: Array, parsedContent: string}>}
 */
async function handleAttachments(context, messages) {
  const allAttachments = [];
  const uniqueAttachments = new Set();
  messages.forEach((msg, msgIndex) => {
    if (msg.attachments?.length > 0) {
      msg.attachments.forEach((att) => {
        if (uniqueAttachments.has(att.name)) return;
        uniqueAttachments.add(att.name);
        allAttachments.push({
          ...att,
          messageIndex: msgIndex + 1,
          messageId: msg.id,
        });
      });
    }
  });

  const parseableAttachments = allAttachments.filter((att) =>
    isParseableMimeType(att.contentType),
  );

  let parsedContent = "";
  const citations = [];
  if (parseableAttachments.length > 0 && context.super.requestToolApproval) {
    const attachmentNames = parseableAttachments
      .map((a) => `${a.name} (${a.contentType})`)
      .join(", ");

    const approval = await context.super.requestToolApproval({
      skillName: context.name,
      payload: { attachments: attachmentNames },
      description: `Download and parse ${parseableAttachments.length} attachment(s) to extract text content? (${attachmentNames})`,
    });

    if (approval.approved) {
      context.super.introspect(
        `${context.caller}: Downloading and parsing ${parseableAttachments.length} attachment(s)...`,
      );

      const parsedResults = [];
      for (const attachment of parseableAttachments) {
        if (!attachment.contentBytes) {
          context.super.introspect(
            `${context.caller}: Skipping "${attachment.name}" - no content available`,
          );
          continue;
        }
        context.super.introspect(
          `${context.caller}: Parsing "${attachment.name}"...`,
        );
        const parseResult = await parseAttachment(attachment);
        if (!parseResult.success) {
          context.super.introspect(
            `${context.caller}: Failed to parse "${attachment.name}": ${parseResult.error}`,
          );
          continue;
        }

        citations.push({
          id: `outlook-attachment-${attachment.messageId}-${attachment.name}`,
          title: attachment.name,
          text: parseResult.content,
          chunkSource: "outlook-attachment://" + attachment.name,
          score: null,
        });
        parsedResults.push({
          name: attachment.name,
          messageIndex: attachment.messageIndex,
          ...parseResult,
        });
      }

      if (parsedResults.length > 0) {
        parsedContent =
          "\n\n--- Parsed Attachment Content ---\n" +
          parsedResults
            .map(
              (r) => `\n[Message ${r.messageIndex}: ${r.name}]\n${r.content}`,
            )
            .join("\n");
      }

      context.super.introspect(
        `${context.caller}: Finished parsing attachments (${parsedResults.length}/${parseableAttachments.length} successful)`,
      );
    } else {
      context.super.introspect(
        `${context.caller}: User declined to parse attachments`,
      );
    }
  }

  citations.forEach((c) => context.super.addCitation?.(c));
  return { allAttachments, parsedContent };
}

/**
 * Prepares and validates attachments for email sending/drafting.
 * @param {Object} context - The handler context with introspect and caller
 * @param {Array<string>} attachmentPaths - Array of absolute file paths
 * @param {Object} options - Options for attachment handling
 * @param {boolean} options.requireApprovalPerFile - Request approval for each file
 * @param {string} options.recipientInfo - Recipient info for approval message
 * @returns {Promise<{success: boolean, attachments?: Array, summaries?: Array, totalSize?: number, error?: string}>}
 */
async function prepareAttachmentsWithValidation(
  context,
  attachmentPaths,
  options = {},
) {
  if (!Array.isArray(attachmentPaths) || attachmentPaths.length === 0) {
    return { success: true, attachments: [], summaries: [], totalSize: 0 };
  }

  const preparedAttachments = [];
  const attachmentSummaries = [];
  let totalAttachmentSize = 0;

  context.super.introspect(
    `${context.caller}: Validating ${attachmentPaths.length} attachment(s)...`,
  );

  for (const filePath of attachmentPaths) {
    const result = prepareAttachment(filePath);
    if (!result.success) {
      context.super.introspect(
        `${context.caller}: Attachment validation failed - ${result.error}`,
      );
      return { success: false, error: result.error };
    }

    totalAttachmentSize += result.fileInfo.size;
    if (totalAttachmentSize > MAX_TOTAL_ATTACHMENT_SIZE) {
      const totalFormatted = humanFileSize(totalAttachmentSize, true);
      context.super.introspect(
        `${context.caller}: Total attachment size (${totalFormatted}) exceeds 25MB limit`,
      );
      return {
        success: false,
        error: `Total attachment size (${totalFormatted}) exceeds the 25MB limit.`,
      };
    }

    if (options.requireApprovalPerFile && context.super.requestToolApproval) {
      const approval = await context.super.requestToolApproval({
        skillName: context.name,
        payload: {
          fileName: result.fileInfo.name,
          fileSize: result.fileInfo.sizeFormatted,
          filePath: result.fileInfo.path,
        },
        description:
          `Attach file "${result.fileInfo.name}" (${result.fileInfo.sizeFormatted}) to email? ` +
          `This file will be sent to ${options.recipientInfo || "recipients"}.`,
      });

      if (!approval.approved) {
        context.super.introspect(
          `${context.caller}: User rejected attaching "${result.fileInfo.name}"`,
        );
        return {
          success: false,
          error: `Attachment rejected by user: ${result.fileInfo.name}. ${approval.message || ""}`,
        };
      }
    }

    preparedAttachments.push(result.attachment);
    attachmentSummaries.push(
      `${result.fileInfo.name} (${result.fileInfo.sizeFormatted})`,
    );
    context.super.introspect(
      `${context.caller}: Prepared attachment "${result.fileInfo.name}"`,
    );
  }

  return {
    success: true,
    attachments: preparedAttachments,
    summaries: attachmentSummaries,
    totalSize: totalAttachmentSize,
  };
}

module.exports = {
  prepareAttachment,
  parseAttachment,
  isParseableMimeType,
  handleAttachments,
  prepareAttachmentsWithValidation,
};
