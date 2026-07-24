// SPDX-License-Identifier: MIT
// Helper/utility functions for the Outlook plugin.
// Split from outlook/lib.js as part of issue #528 — God-File reduction.

const { EMAIL_REGEX, AUTH_TYPES } = require("./constants.js");

/**
 * Parses a comma-separated email string into Graph API recipient format.
 * @param {string} emailString - Comma-separated email addresses
 * @returns {Array<{emailAddress: {address: string}}>}
 */
function parseEmailRecipients(emailString) {
  if (!emailString) return [];
  return emailString
    .split(",")
    .map((email) => email.trim())
    .filter((email) => EMAIL_REGEX.test(email))
    .map((email) => ({ emailAddress: { address: email } }));
}

/**
 * Validates organization auth type configuration.
 * @param {Object} config - The Outlook configuration object
 * @returns {{valid: boolean, error?: string}}
 */
function validateOrganizationAuth(config) {
  const authType = config.authType || AUTH_TYPES.common;
  if (authType === AUTH_TYPES.organization && !config.tenantId) {
    return {
      valid: false,
      error: "Tenant ID is required for organization-only authentication.",
    };
  }
  return { valid: true };
}

/**
 * Maps a Microsoft Graph message object to a simplified format.
 * @param {Object} msg - The Graph API message object
 * @param {Object} options - Mapping options
 * @param {boolean} options.includeBody - Include full body content
 * @param {boolean} options.includeAttachments - Include attachment details
 * @returns {Object} Simplified message object
 */
function mapGraphMessage(msg, options = {}) {
  const base = {
    id: msg.id,
    conversationId: msg.conversationId,
    subject: msg.subject,
    from: msg.from?.emailAddress?.address || "Unknown",
    fromName: msg.from?.emailAddress?.name || "",
    to: msg.toRecipients?.map((r) => r.emailAddress?.address).join(", ") || "",
    cc: msg.ccRecipients?.map((r) => r.emailAddress?.address).join(", ") || "",
    isRead: msg.isRead,
    hasAttachments: msg.hasAttachments,
  };

  if (msg.receivedDateTime) {
    base.receivedDateTime = msg.receivedDateTime;
  }
  if (msg.bodyPreview !== undefined) {
    base.preview = msg.bodyPreview;
  }

  if (options.includeBody && msg.body) {
    base.date = msg.receivedDateTime;
    base.body = msg.body?.content || "";
    base.bodyType = msg.body?.contentType || "text";
  }

  if (options.includeAttachments && msg.attachments) {
    base.attachments = (msg.attachments || []).map((att) => ({
      id: att.id,
      name: att.name,
      contentType: att.contentType,
      size: att.size,
      contentBytes: att.contentBytes,
    }));
  }

  return base;
}

/**
 * Formats an array of messages into a human-readable summary string.
 * @param {Array} messages - Array of simplified message objects
 * @returns {string} Formatted summary
 */
function formatMessageSummary(messages) {
  return messages
    .map(
      (m, i) =>
        `${i + 1}. [${m.isRead ? "READ" : "UNREAD"}] "${m.subject}" from ${m.fromName || m.from} (${new Date(m.receivedDateTime).toLocaleString()})${m.hasAttachments ? " \ud83d\udcce" : ""}\n   ID: ${m.id}\n   Conversation ID: ${m.conversationId}`,
    )
    .join("\n\n");
}

/**
 * Handles errors in Outlook skill handlers with consistent logging and messaging.
 * @param {Object} context - The handler context (this) from the aibitat function
 * @param {string} skillName - The name of the skill (e.g., "outlook-get-inbox")
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
function handleSkillError(context, skillName, error) {
  context.super.handlerProps.log(`${skillName} error: ${error.message}`);
  context.super.introspect(`Error: ${error.message}`);
  return `Error in ${skillName}: ${error.message}`;
}

/**
 * Normalizes a token expiry value to a number.
 * @param {number|string|null|undefined} expiry - The token expiry value
 * @returns {number|null} The normalized expiry as a number, or null if invalid
 */
function normalizeTokenExpiry(expiry) {
  if (expiry === null || expiry === undefined) return null;
  return typeof expiry === "number" ? expiry : parseInt(expiry, 10);
}

module.exports = {
  parseEmailRecipients,
  validateOrganizationAuth,
  mapGraphMessage,
  formatMessageSummary,
  handleSkillError,
  normalizeTokenExpiry,
};
