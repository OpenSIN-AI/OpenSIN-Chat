// SPDX-License-Identifier: MIT
const consoleLogger = require("../../../../logger/console.js");

const fs = require("fs");
const path = require("path");
const os = require("os");
const mime = require("mime");
const { SystemSettings } = require("../../../../../models/systemSettings");
const { CollectorApi } = require("../../../../collectorApi");
const { humanFileSize } = require("../../../../helpers");
const { safeJsonParse } = require("../../../../http");

const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB limit for all attachments combined
const GMAIL_API_TIMEOUT_MS = 30_000; // 30s timeout for Gmail Apps Script requests

/**
 * Validates and prepares a file attachment for email.
 * Note: Does not check total size limit - caller should track cumulative size.
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
        name: fileName,
        contentType,
        data: base64Data,
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
 * Writes the base64 data to a temp file, parses it, then cleans up.
 * @param {Object} attachment - The attachment object with name, contentType, size, data (base64)
 * @returns {Promise<{success: boolean, content: string|null, error: string|null}>}
 */
async function parseAttachment(attachment) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gmail-attachment-"));
  const safeFilename = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const tempFilePath = path.join(tempDir, safeFilename);

  try {
    const buffer = Buffer.from(attachment.data, "base64");
    fs.writeFileSync(tempFilePath, buffer);

    const collector = new CollectorApi();
    const result = await collector.parseDocument(safeFilename, {
      absolutePath: tempFilePath,
    });

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("[lib] non-fatal error:", e?.message || e);
    }

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
    } catch (e) {
      console.warn("[lib] non-fatal error:", e?.message || e);
    }
    return { success: false, content: null, error: e.message };
  }
}

/**
 * Collect attachments from messages and optionally parse them with user approval.
 * Specific files may not show (images) and are pre-stripped by the app script.
 * If two attachments have the same name, only the first one will be kept (handling fwd emails)
 * @param {Object} context - The handler context (this) from the aibitat function
 * @param {Array} messages - Array of message objects (single message should be wrapped in array)
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

  let parsedContent = "";
  const citations = [];
  if (allAttachments.length > 0 && context.super.requestToolApproval) {
    const attachmentNames = allAttachments.map((a) => a.name).join(", ");

    const approval = await context.super.requestToolApproval({
      skillName: context.name,
      payload: { attachments: attachmentNames },
      description: `Parse attachments (${attachmentNames}) to extract text content?`,
    });

    if (approval.approved) {
      context.super.introspect(
        `${context.caller}: Parsing ${allAttachments.length} attachment(s)...`,
      );

      const parsedResults = [];
      for (const attachment of allAttachments) {
        if (!attachment.data) continue;
        context.super.introspect(
          `${context.caller}: Parsing "${attachment.name}"...`,
        );
        const parseResult = await parseAttachment(attachment);
        if (!parseResult.success) continue;

        citations.push({
          id: `gmail-attachment-${attachment.messageId}-${attachment.name}`,
          title: attachment.name,
          text: parseResult.content,
          chunkSource: "gmail-attachment://" + attachment.name,
          score: null,
        });
        parsedResults.push({
          name: attachment.name,
          messageIndex: attachment.messageIndex,
          ...parseResult,
        });
      }

      parsedContent =
        "\n\n--- Parsed Attachment Content ---\n" +
        parsedResults
          .map((r) => `\n[Message ${r.messageIndex}: ${r.name}]\n${r.content}`)
          .join("\n");

      context.super.introspect(
        `${context.caller}: Finished parsing attachments`,
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
 * Gmail Bridge Library
 * Handles communication with the OpenSIN Chat Gmail Google Apps Script deployment.
 */
class GmailBridge {
  #deploymentId = null;
  #apiKey = null;
  #isInitialized = false;

  #log(text, ...args) {
    consoleLogger.log(`\x1b[36m[GmailBridge]\x1b[0m ${text}`, ...args);
  }

  /**
   * Resets the bridge state, forcing re-initialization on next use.
   * Call this when configuration changes (e.g., deployment ID updated).
   */
  reset() {
    this.#deploymentId = null;
    this.#apiKey = null;
    this.#isInitialized = false;
  }

  /**
   * Normalise legacy single-account settings into the multi-account shape.
   * The top-level deploymentId/apiKey fields are retained for backward
   * compatibility with the existing Gmail settings panel.
   */
  static normalizeConfig(config = {}) {
    const hasAccountsField = Array.isArray(config.accounts);
    const rawAccounts = hasAccountsField ? config.accounts : [];
    let accounts = rawAccounts
      .filter((account) => account && typeof account === "object")
      .map((account, index) => ({
        id: String(account.id || `gmail-${index + 1}`).trim(),
        label: String(account.label || account.email || `Gmail ${index + 1}`).trim(),
        email: String(account.email || "").trim(),
        deploymentId: String(account.deploymentId || "").trim(),
        apiKey: String(account.apiKey || "").trim(),
        enabled: account.enabled !== false,
      }))
      .filter((account) => account.id && account.deploymentId && account.apiKey);

    if (
      !hasAccountsField &&
      accounts.length === 0 &&
      String(config.deploymentId || "").trim() &&
      String(config.apiKey || "").trim()
    ) {
      accounts = [
        {
          id: "primary",
          label: String(config.label || config.email || "Primäres Gmail-Konto"),
          email: String(config.email || ""),
          deploymentId: String(config.deploymentId).trim(),
          apiKey: String(config.apiKey).trim(),
          enabled: true,
        },
      ];
    }

    const requestedDefault = String(config.defaultAccountId || "").trim();
    const defaultAccount =
      accounts.find((account) => account.id === requestedDefault) ||
      accounts.find((account) => account.enabled) ||
      accounts[0] ||
      null;

    return {
      ...config,
      accounts,
      groups: Array.isArray(config.groups) ? config.groups : [],
      defaultAccountId: defaultAccount?.id || "",
      deploymentId: defaultAccount?.deploymentId || "",
      apiKey: defaultAccount?.apiKey || "",
    };
  }

  static resolveAccount(config, accountId = null) {
    const normalized = GmailBridge.normalizeConfig(config);
    const explicitAccountId = String(accountId || "").trim();
    if (explicitAccountId) {
      return (
        normalized.accounts.find(
          (account) =>
            account.id === explicitAccountId && account.enabled !== false,
        ) || null
      );
    }

    const requestedDefault = String(normalized.defaultAccountId || "").trim();
    return (
      normalized.accounts.find(
        (account) =>
          account.id === requestedDefault && account.enabled !== false,
      ) ||
      normalized.accounts.find((account) => account.enabled !== false) ||
      null
    );
  }

  /**
   * Gets the current Gmail agent configuration from system settings.
   */
  static async getConfig() {
    const configJson = await SystemSettings.getValueOrFallback(
      { label: "gmail_agent_config" },
      "{}",
    );
    return GmailBridge.normalizeConfig(safeJsonParse(configJson, {}));
  }

  /**
   * Updates Gmail configuration while preserving existing account secrets when
   * a partial configuration is supplied.
   */
  static async updateConfig(updates) {
    try {
      const current = await GmailBridge.getConfig();
      const merged = GmailBridge.normalizeConfig({ ...current, ...updates });
      const persisted = await SystemSettings.updateSettings({
        gmail_agent_config: JSON.stringify(merged),
      });
      if (!persisted?.success) {
        return {
          success: false,
          error: persisted?.error || "Failed to persist Gmail configuration.",
        };
      }
      return { success: true, config: await GmailBridge.getConfig() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Initializes the Gmail bridge by fetching configuration from system settings.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async initialize(accountId = null) {
    try {
      const config = await GmailBridge.getConfig();
      const account = GmailBridge.resolveAccount(config, accountId);
      if (!account) {
        return {
          success: false,
          error: accountId
            ? `Gmail account "${accountId}" is not configured or is disabled.`
            : "Gmail integration is not configured. Add at least one Gmail account in the E-Mail Center.",
        };
      }

      this.#deploymentId = account.deploymentId;
      this.#apiKey = account.apiKey;
      this.#isInitialized = true;
      return { success: true, account };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Checks if the Gmail bridge is properly configured and available.
   * @returns {Promise<boolean>}
   */
  async isAvailable(accountId = null) {
    const result = await this.initialize(accountId);
    return result.success;
  }

  /** Checks if at least one enabled Gmail account is configured. */
  static async isToolAvailable() {
    const config = await GmailBridge.getConfig();
    return !!GmailBridge.resolveAccount(config);
  }

  get maskedDeploymentId() {
    if (!this.#deploymentId) return "(not configured)";
    return (
      this.#deploymentId.substring(0, 5) +
      "..." +
      this.#deploymentId.substring(this.#deploymentId.length - 5)
    );
  }

  /**
   * Gets the base URL for the Gmail Google Apps Script deployment.
   * @returns {string}
   */
  #getBaseUrl(deploymentId = this.#deploymentId) {
    const value = String(deploymentId || "");
    const masked = value
      ? `${value.slice(0, 5)}...${value.slice(-5)}`
      : "(not configured)";
    this.#log(`Getting base URL for deployment ID ${masked}`);
    return `https://script.google.com/macros/s/${value}/exec`;
  }

  /**
   * Makes a request to the Gmail Google Apps Script API.
   * @param {string} action - The action to perform
   * @param {object} params - Additional parameters for the action
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async request(action, params = {}) {
    const accountId = params.accountId || null;
    const initResult = await this.initialize(accountId);
    if (!initResult.success) {
      return { success: false, error: initResult.error };
    }

    const { accountId: _accountId, ...requestParams } = params;
    const account = initResult.account;

    try {
      const response = await fetch(this.#getBaseUrl(account.deploymentId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenSIN Chat-UA": "OpenSIN Chat-Gmail-Agent/2.0",
        },
        body: JSON.stringify({
          key: account.apiKey,
          action,
          ...requestParams,
        }),
        signal: AbortSignal.timeout(GMAIL_API_TIMEOUT_MS),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Gmail API request failed with status ${response.status}`,
        };
      }

      const result = await response.json();

      if (result.status === "error") {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data, quota: result.quota };
    } catch (error) {
      return {
        success: false,
        error: `Gmail API request failed: ${error.message}`,
      };
    }
  }

  /**
   * Search emails using Gmail query syntax.
   * @param {string} query - Gmail search query
   * @param {number} limit - Maximum results to return
   * @param {number} start - Starting offset
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async search(query = "is:inbox", limit = 10, start = 0, accountId = null) {
    return this.request("search", { query, limit, start, accountId });
  }

  /**
   * Read a full thread by ID.
   * @param {string} threadId - The thread ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async readThread(threadId, accountId = null) {
    return this.request("read_thread", { threadId, accountId });
  }

  /**
   * Create a new draft email.
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @param {object} options - Additional options (cc, bcc, htmlBody, etc.)
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async createDraft(to, subject, body, options = {}) {
    return this.request("create_draft", { to, subject, body, ...options });
  }

  /**
   * Create a draft reply to an existing thread.
   * @param {string} threadId - The thread ID to reply to
   * @param {string} body - Reply body
   * @param {boolean} replyAll - Whether to reply all
   * @param {object} options - Additional options
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async createDraftReply(threadId, body, replyAll = false, options = {}) {
    return this.request("create_draft_reply", {
      threadId,
      body,
      replyAll,
      ...options,
    });
  }

  /**
   * Update an existing draft.
   * @param {string} draftId - The draft ID
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @param {object} options - Additional options
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async updateDraft(draftId, to, subject, body, options = {}) {
    return this.request("update_draft", {
      draftId,
      to,
      subject,
      body,
      ...options,
    });
  }

  /**
   * Get a specific draft by ID.
   * @param {string} draftId - The draft ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getDraft(draftId, accountId = null) {
    return this.request("get_draft", { draftId, accountId });
  }

  /**
   * List all drafts.
   * @param {number} limit - Maximum drafts to return
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async listDrafts(limit = 25, accountId = null) {
    return this.request("list_drafts", { limit, accountId });
  }

  /**
   * Delete a draft.
   * @param {string} draftId - The draft ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async deleteDraft(draftId, accountId = null) {
    return this.request("delete_draft", { draftId, accountId });
  }

  /**
   * Send an existing draft.
   * @param {string} draftId - The draft ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async sendDraft(draftId, accountId = null) {
    return this.request("send_draft", { draftId, accountId });
  }

  /**
   * Send an email immediately.
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @param {object} options - Additional options
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async sendEmail(to, subject, body, options = {}) {
    return this.request("send_email", { to, subject, body, ...options });
  }

  /**
   * Reply to a thread immediately.
   * @param {string} threadId - The thread ID
   * @param {string} body - Reply body
   * @param {boolean} replyAll - Whether to reply all
   * @param {object} options - Additional options
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async replyToThread(threadId, body, replyAll = false, options = {}) {
    return this.request("reply_to_thread", {
      threadId,
      body,
      replyAll,
      ...options,
    });
  }

  /**
   * Mark a thread as read.
   * @param {string} threadId - The thread ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async markRead(threadId, accountId = null) {
    return this.request("mark_read", { threadId, accountId });
  }

  /**
   * Mark a thread as unread.
   * @param {string} threadId - The thread ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async markUnread(threadId, accountId = null) {
    return this.request("mark_unread", { threadId, accountId });
  }

  /**
   * Move a thread to trash.
   * @param {string} threadId - The thread ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async moveToTrash(threadId, accountId = null) {
    return this.request("move_to_trash", { threadId, accountId });
  }

  /**
   * Archive a thread.
   * @param {string} threadId - The thread ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async moveToArchive(threadId, accountId = null) {
    return this.request("move_to_archive", { threadId, accountId });
  }

  /**
   * Move a thread to inbox.
   * @param {string} threadId - The thread ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async moveToInbox(threadId, accountId = null) {
    return this.request("move_to_inbox", { threadId, accountId });
  }

  /**
   * Get mailbox statistics.
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getMailboxStats(accountId = null) {
    return this.request("get_mailbox_stats", { accountId });
  }
}

module.exports = new GmailBridge();
module.exports.GmailBridge = GmailBridge;
module.exports.prepareAttachment = prepareAttachment;
module.exports.parseAttachment = parseAttachment;
module.exports.handleAttachments = handleAttachments;
module.exports.MAX_TOTAL_ATTACHMENT_SIZE = MAX_TOTAL_ATTACHMENT_SIZE;
