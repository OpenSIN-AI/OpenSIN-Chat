// SPDX-License-Identifier: MIT
// Purpose: Central provider definitions for OAuth connectors.
//          If env vars are missing, provider is "coming_soon" — app runs fine.
// Docs: providers.doc.md

const BASE_URL = process.env.SERVER_PUBLIC_URL || "https://sinchat.delqhi.com";

/**
 * @typedef {Object} ProviderDef
 * @property {string} authUrl - OAuth authorization endpoint
 * @property {string} tokenUrl - Token exchange endpoint
 * @property {string?} revokeUrl - Token revocation endpoint
 * @property {string?} clientId - From env (null if not configured)
 * @property {string?} clientSecret - From env (null if not configured)
 * @property {boolean} usesPKCE - Whether to send PKCE challenge
 * @property {Object} extraAuthParams - Additional auth query params
 * @property {Object} scopeSets - Named scope bundles per "product"
 * @property {string?} userinfoUrl - Endpoint to fetch account display name
 */

const PROVIDERS = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || null,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || null,
    usesPKCE: true,
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    },
    scopeSets: {
      gmail: ["https://www.googleapis.com/auth/gmail.modify"],
      drive: ["https://www.googleapis.com/auth/drive"],
      docs: ["https://www.googleapis.com/auth/documents"],
      sheets: ["https://www.googleapis.com/auth/spreadsheets"],
      _base: ["openid", "email", "profile"],
    },
    userinfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    revokeUrl: null, // GitHub has no revoke endpoint; delete token locally
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID || null,
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || null,
    usesPKCE: true,
    extraAuthParams: {},
    scopeSets: {
      repo: ["repo"],
      read: ["repo:status", "read:org", "read:user"],
      _base: ["read:user"],
    },
    userinfoUrl: "https://api.github.com/user",
  },
};

/**
 * Check if a provider is configured (has clientId).
 * @param {string} provider
 * @returns {boolean}
 */
function isProviderAvailable(provider) {
  const def = PROVIDERS[provider];
  return !!(def && def.clientId);
}

/**
 * Get availability map for all providers.
 * @returns {Record<string, boolean>}
 */
function getAvailability() {
  const result = {};
  for (const [name] of Object.entries(PROVIDERS)) {
    result[name] = isProviderAvailable(name);
  }
  return result;
}

/**
 * Build the redirect URI for a provider.
 * @param {string} provider
 * @returns {string}
 */
function redirectUri(provider) {
  return `${BASE_URL}/api/connectors/${provider}/callback`;
}

module.exports = {
  PROVIDERS,
  BASE_URL,
  isProviderAvailable,
  getAvailability,
  redirectUri,
};
