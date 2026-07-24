// SPDX-License-Identifier: MIT
// Email operation methods for OutlookBridge, mixed into the class prototype.
// Split from outlook/lib.js as part of issue #528 — God-File reduction.

const { mapGraphMessage, parseEmailRecipients } = require("./helpers.js");
const consoleLogger = require("../../../../logger/console.js");

/**
 * Email operation methods for OutlookBridge.
 * These are mixed into OutlookBridge.prototype in outlook-bridge.js.
 * They rely on `this.request()` being available on the instance.
 */
const emailOperations = {
  /**
   * Search emails using OData filter syntax.
   * @param {string} query - Search query (uses Microsoft Search syntax)
   * @param {number} limit - Maximum results to return
   * @param {number} skip - Number of results to skip for pagination (ignored when query is provided)
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async search(query = "", limit = 10, skip = 0) {
    let endpoint;

    if (query) {
      endpoint = `/me/messages?$top=${limit}&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,conversationId&$search="${encodeURIComponent(query)}"`;
    } else {
      endpoint = `/me/messages?$top=${limit}&$skip=${skip}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,conversationId`;
    }

    const result = await this.request(endpoint);
    if (!result.success) return result;

    const messages = result.data.value || [];
    return {
      success: true,
      data: {
        messages: messages.map((msg) => mapGraphMessage(msg)),
        resultCount: messages.length,
        hasMore: !!result.data["@odata.nextLink"],
      },
    };
  },

  /**
   * Get inbox messages (only from the Inbox folder, not archived/other folders).
   * @param {number} limit - Maximum results to return
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getInbox(limit = 25) {
    const endpoint = `/me/mailFolders/inbox/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,conversationId`;

    const result = await this.request(endpoint);
    if (!result.success) return result;

    const messages = result.data.value || [];
    return {
      success: true,
      data: {
        messages: messages.map((msg) => mapGraphMessage(msg)),
        resultCount: messages.length,
        hasMore: !!result.data["@odata.nextLink"],
      },
    };
  },

  /**
   * Read a full conversation thread by conversation ID.
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async readThread(conversationId) {
    const endpoint = `/me/messages?$filter=conversationId eq '${conversationId}'&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,body,attachments&$expand=attachments`;

    const result = await this.request(endpoint);
    if (!result.success) return result;

    let messages = result.data.value || [];
    if (messages.length === 0) {
      return {
        success: false,
        error: "No messages found in this conversation.",
      };
    }

    messages.sort(
      (a, b) => new Date(a.receivedDateTime) - new Date(b.receivedDateTime),
    );

    return {
      success: true,
      data: {
        conversationId,
        subject: messages[0]?.subject || "No Subject",
        messageCount: messages.length,
        messages: messages.map((msg) =>
          mapGraphMessage(msg, { includeBody: true, includeAttachments: true }),
        ),
      },
    };
  },

  /**
   * Read a single message by ID.
   * @param {string} messageId - The message ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async readMessage(messageId) {
    const endpoint = `/me/messages/${messageId}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,body,conversationId&$expand=attachments`;

    const result = await this.request(endpoint);
    if (!result.success) return result;

    return {
      success: true,
      data: mapGraphMessage(result.data, {
        includeBody: true,
        includeAttachments: true,
      }),
    };
  },

  /**
   * Create a new draft email.
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @param {object} options - Additional options (cc, bcc, isHtml, attachments)
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async createDraft(to, subject, body, options = {}) {
    const message = {
      subject,
      body: {
        contentType: options.isHtml ? "HTML" : "Text",
        content: body,
      },
      toRecipients: parseEmailRecipients(to),
    };

    if (options.cc) {
      message.ccRecipients = parseEmailRecipients(options.cc);
    }

    if (options.bcc) {
      message.bccRecipients = parseEmailRecipients(options.bcc);
    }

    const result = await this.request("/me/messages", {
      method: "POST",
      body: JSON.stringify(message),
    });

    if (!result.success) return result;

    const draftId = result.data.id;

    if (options.attachments && options.attachments.length > 0) {
      for (const attachment of options.attachments) {
        const attachResult = await this.request(
          `/me/messages/${draftId}/attachments`,
          {
            method: "POST",
            body: JSON.stringify(attachment),
          },
        );
        if (!attachResult.success) {
          consoleLogger.log(
            `\x1b[35m[OutlookBridge]\x1b[0m Failed to add attachment: ${attachResult.error}`,
          );
        }
      }
    }

    return {
      success: true,
      data: {
        draftId: result.data.id,
        subject: result.data.subject,
        to,
        webLink: result.data.webLink,
      },
    };
  },

  /**
   * Create a draft reply to an existing message.
   * @param {string} messageId - The message ID to reply to
   * @param {string} body - Reply body
   * @param {boolean} replyAll - Whether to reply all
   * @param {object} options - Additional options
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async createDraftReply(messageId, body, replyAll = false, _options = {}) {
    const endpoint = replyAll
      ? `/me/messages/${messageId}/createReplyAll`
      : `/me/messages/${messageId}/createReply`;

    const result = await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({
        comment: body,
      }),
    });

    if (!result.success) return result;

    return {
      success: true,
      data: {
        draftId: result.data.id,
        subject: result.data.subject,
        webLink: result.data.webLink,
      },
    };
  },

  /**
   * Get a specific draft by ID.
   * @param {string} draftId - The draft ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getDraft(draftId) {
    return this.readMessage(draftId);
  },

  /**
   * List all drafts.
   * @param {number} limit - Maximum drafts to return
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async listDrafts(limit = 25) {
    const endpoint = `/me/mailFolders/drafts/messages?$top=${limit}&$orderby=lastModifiedDateTime desc&$select=id,subject,toRecipients,lastModifiedDateTime,bodyPreview`;

    const result = await this.request(endpoint);
    if (!result.success) return result;

    const drafts = result.data.value || [];
    return {
      success: true,
      data: {
        drafts: drafts.map((draft) => ({
          id: draft.id,
          subject: draft.subject,
          to:
            draft.toRecipients
              ?.map((r) => r.emailAddress?.address)
              .join(", ") || "",
          lastModified: draft.lastModifiedDateTime,
          preview: draft.bodyPreview,
        })),
        count: drafts.length,
      },
    };
  },

  /**
   * Update an existing draft.
   * @param {string} draftId - The draft ID
   * @param {object} updates - Fields to update
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async updateDraft(draftId, updates) {
    const message = {};

    if (updates.subject) message.subject = updates.subject;
    if (updates.body) {
      message.body = {
        contentType: updates.isHtml ? "HTML" : "Text",
        content: updates.body,
      };
    }
    if (updates.to) {
      message.toRecipients = parseEmailRecipients(updates.to);
    }
    if (updates.cc) {
      message.ccRecipients = parseEmailRecipients(updates.cc);
    }

    const result = await this.request(`/me/messages/${draftId}`, {
      method: "PATCH",
      body: JSON.stringify(message),
    });

    if (!result.success) return result;

    return {
      success: true,
      data: {
        draftId: result.data.id,
        subject: result.data.subject,
      },
    };
  },

  /**
   * Delete a draft.
   * @param {string} draftId - The draft ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteDraft(draftId) {
    return this.request(`/me/messages/${draftId}`, {
      method: "DELETE",
    });
  },

  /**
   * Send an existing draft.
   * @param {string} draftId - The draft ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async sendDraft(draftId) {
    return this.request(`/me/messages/${draftId}/send`, {
      method: "POST",
    });
  },

  /**
   * Send an email immediately.
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @param {object} options - Additional options
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async sendEmail(to, subject, body, options = {}) {
    const message = {
      subject,
      body: {
        contentType: options.isHtml ? "HTML" : "Text",
        content: body,
      },
      toRecipients: parseEmailRecipients(to),
    };

    if (options.cc) {
      message.ccRecipients = parseEmailRecipients(options.cc);
    }

    if (options.bcc) {
      message.bccRecipients = parseEmailRecipients(options.bcc);
    }

    if (options.attachments && options.attachments.length > 0) {
      message.attachments = options.attachments;
    }

    return this.request("/me/sendMail", {
      method: "POST",
      body: JSON.stringify({
        message,
        saveToSentItems: true,
      }),
    });
  },

  /**
   * Reply to a message immediately.
   * @param {string} messageId - The message ID to reply to
   * @param {string} body - Reply body
   * @param {boolean} replyAll - Whether to reply all
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async replyToMessage(messageId, body, replyAll = false) {
    const endpoint = replyAll
      ? `/me/messages/${messageId}/replyAll`
      : `/me/messages/${messageId}/reply`;

    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({ comment: body }),
    });
  },

  /**
   * Mark a message as read.
   * @param {string} messageId - The message ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async markRead(messageId) {
    return this.request(`/me/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: true }),
    });
  },

  /**
   * Mark a message as unread.
   * @param {string} messageId - The message ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async markUnread(messageId) {
    return this.request(`/me/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: false }),
    });
  },

  /**
   * Move a message to trash.
   * @param {string} messageId - The message ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async moveToTrash(messageId) {
    return this.request(`/me/messages/${messageId}/move`, {
      method: "POST",
      body: JSON.stringify({
        destinationId: "deleteditems",
      }),
    });
  },

  /**
   * Get mailbox folder statistics.
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getMailboxStats() {
    const folders = ["inbox", "drafts", "sentitems", "deleteditems"];
    const stats = {};

    for (const folder of folders) {
      const result = await this.request(
        `/me/mailFolders/${folder}?$select=displayName,totalItemCount,unreadItemCount`,
      );
      if (result.success) {
        stats[folder] = {
          name: result.data.displayName,
          total: result.data.totalItemCount,
          unread: result.data.unreadItemCount,
        };
      }
    }

    const profileResult = await this.request("/me?$select=displayName,mail");

    return {
      success: true,
      data: {
        email: profileResult.data?.mail || "Unknown",
        displayName: profileResult.data?.displayName || "Unknown",
        folders: stats,
      },
    };
  },
};

module.exports = { emailOperations };
