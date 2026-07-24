// SPDX-License-Identifier: MIT
// Outlook plugin library — re-exports from split modules.
// Split from the original monolithic lib.js as part of issue #528 — God-File reduction.
// All exports are backward-compatible with the original module.

const { OutlookBridge } = require("./outlook-bridge.js");
const {
  prepareAttachment,
  parseAttachment,
  isParseableMimeType,
  handleAttachments,
  prepareAttachmentsWithValidation,
} = require("./attachments.js");
const {
  parseEmailRecipients,
  validateOrganizationAuth,
  mapGraphMessage,
  formatMessageSummary,
  handleSkillError,
  normalizeTokenExpiry,
} = require("./helpers.js");
const {
  MAX_TOTAL_ATTACHMENT_SIZE,
  AUTH_TYPES,
  PARSEABLE_ATTACHMENT_MIMES,
} = require("./constants.js");

// Create singleton instance (matches original behavior)
const instance = new OutlookBridge();

// Re-export everything the original lib.js exported
module.exports = instance;
module.exports.OutlookBridge = OutlookBridge;
module.exports.prepareAttachment = prepareAttachment;
module.exports.parseAttachment = parseAttachment;
module.exports.handleAttachments = handleAttachments;
module.exports.isParseableMimeType = isParseableMimeType;
module.exports.PARSEABLE_ATTACHMENT_MIMES = PARSEABLE_ATTACHMENT_MIMES;
module.exports.MAX_TOTAL_ATTACHMENT_SIZE = MAX_TOTAL_ATTACHMENT_SIZE;
module.exports.AUTH_TYPES = AUTH_TYPES;
module.exports.formatMessageSummary = formatMessageSummary;
module.exports.mapGraphMessage = mapGraphMessage;
module.exports.parseEmailRecipients = parseEmailRecipients;
module.exports.validateOrganizationAuth = validateOrganizationAuth;
module.exports.prepareAttachmentsWithValidation =
  prepareAttachmentsWithValidation;
module.exports.handleSkillError = handleSkillError;
module.exports.normalizeTokenExpiry = normalizeTokenExpiry;
