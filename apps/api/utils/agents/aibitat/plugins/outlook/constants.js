// SPDX-License-Identifier: MIT
// Constants and configuration for the Outlook plugin.
// Split from outlook/lib.js as part of issue #528 — God-File reduction.

const MAX_TOTAL_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB limit for Outlook
const GRAPH_API_TIMEOUT_MS = 30_000; // 30s timeout for Graph API requests
const OAUTH_TIMEOUT_MS = 15_000; // 15s timeout for OAuth token exchange/refresh

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Microsoft Graph API OAuth2 Configuration
 * Uses Authorization Code Flow with PKCE
 */
const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com";
const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";
const SCOPES = [
  "offline_access",
  "Mail.Read",
  "Mail.ReadWrite",
  "Mail.Send",
  "User.Read",
].join(" ");

/**
 * Authentication types for Microsoft OAuth2.
 * - "organization": Use tenant ID endpoint (work/school accounts from a specific tenant only)
 * - "common": Use /common endpoint (both personal and work/school accounts)
 * - "consumers": Use /consumers endpoint (personal Microsoft accounts only)
 */
const AUTH_TYPES = {
  organization: "organization",
  common: "common",
  consumers: "consumers",
};

/**
 * MIME types that can be parsed by the collector to extract text content.
 * These are a subset of ACCEPTED_MIMES from collector/utils/constants.js
 * that are suitable for attachment parsing (excludes audio/video and images).
 * Images are excluded because they're typically signature images in emails.
 */
const PARSEABLE_ATTACHMENT_MIMES = [
  "text/plain",
  "text/html",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.oasis.opendocument.text", // .odt
  "application/vnd.oasis.opendocument.presentation", // .odp
  "application/pdf",
  "application/epub+zip",
];

/**
 * Gets the appropriate OAuth2 authority endpoint based on auth type.
 * @param {string} authType - The authentication type
 * @param {string} tenantId - The tenant ID (used only for "organization" type)
 * @returns {string} The authority path segment
 */
function getAuthority(authType, tenantId) {
  switch (authType) {
    case AUTH_TYPES.consumers:
      return "consumers";
    case AUTH_TYPES.organization:
      return tenantId || "common";
    case AUTH_TYPES.common:
    default:
      return "common";
  }
}

module.exports = {
  MAX_TOTAL_ATTACHMENT_SIZE,
  GRAPH_API_TIMEOUT_MS,
  OAUTH_TIMEOUT_MS,
  EMAIL_REGEX,
  MICROSOFT_AUTH_URL,
  GRAPH_API_URL,
  SCOPES,
  AUTH_TYPES,
  PARSEABLE_ATTACHMENT_MIMES,
  getAuthority,
};
