// SPDX-License-Identifier: MIT
// OutlookBridge class — OAuth2 authentication and Microsoft Graph API core.
// Email operation methods are mixed in from email-operations.js.
// Split from outlook/lib.js as part of issue #528 — God-File reduction.

const crypto = require("crypto");
// pkce-challenge v3: the module exports { default, generateChallenge, verifyChallenge }.
// The module object itself is NOT callable — use .default() (sync, no await needed).
const { default: _pkceChallenge } = require("pkce-challenge");
const { SystemSettings } = require("../../../../../models/systemSettings");
const { safeJsonParse } = require("../../../../http");
const consoleLogger = require("../../../../logger/console.js");

const {
  MICROSOFT_AUTH_URL,
  GRAPH_API_URL,
  SCOPES,
  AUTH_TYPES,
  GRAPH_API_TIMEOUT_MS,
  OAUTH_TIMEOUT_MS,
  getAuthority,
} = require("./constants.js");

const {
  validateOrganizationAuth,
  normalizeTokenExpiry,
} = require("./helpers.js");

const { emailOperations } = require("./email-operations.js");

/**
 * Outlook Bridge Library
 * Handles OAuth2 authentication and Microsoft Graph API communication for Outlook mail.
 */
class OutlookBridge {
  #accessToken = null;
  #isInitialized = false;

  #log(text, ...args) {
    consoleLogger.log(`\x1b[35m[OutlookBridge]\x1b[0m ${text}`, ...args);
  }

  /**
   * Decodes a JWT token and logs relevant info.
   * @param {string} token - The JWT token to decode
   * @param {string} context - Context label for logging (e.g., "NEW token", "Token")
   * @returns {Object|null} The decoded payload or null if decoding fails
   */
  #decodeAndLogToken(token, context = "Token") {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      this.#log(
        `${context} for: ${payload.upn || payload.email || payload.unique_name || "unknown"}`,
      );
      return payload;
    } catch {
      this.#log(`Could not decode ${context.toLowerCase()}`);
      return null;
    }
  }

  /**
   * Resets the bridge state, forcing re-initialization on next use.
   */
  reset() {
    this.#accessToken = null;
    this.#isInitialized = false;
    this._state = null;
    this._codeVerifier = null;
    this._redirectUri = null;
  }

  /**
   * Gets the current Outlook agent configuration from system settings.
   * @returns {Promise<{clientId?: string, tenantId?: string, clientSecret?: string, authType?: string, accessToken?: string, refreshToken?: string, tokenExpiry?: number}>}
   */
  static async getConfig() {
    const configJson = await SystemSettings.getValueOrFallback(
      { label: "outlook_agent_config" },
      "{}",
    );
    return safeJsonParse(configJson, {});
  }

  /**
   * Updates the Outlook agent configuration in system settings.
   * @param {Object} updates - Fields to update
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async updateConfig(updates) {
    try {
      await SystemSettings.updateSettings({
        outlook_agent_config: JSON.stringify(updates),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generates the OAuth2 authorization URL for the user to authenticate.
   * Generates and stores a CSRF state token + PKCE code verifier for the
   * callback round-trip. Both are required by RFC 6749 §10.12 and
   * RFC 7636 and protect against authorization-code interception
   * and cross-site request forgery during the redirect handshake.
   * @param {string} redirectUri - The callback URL for OAuth
   * @returns {Promise<{success: boolean, url?: string, state?: string, error?: string}>}
   */
  async getAuthUrl(redirectUri) {
    const config = await OutlookBridge.getConfig();

    if (!config.clientId) {
      return {
        success: false,
        error: "Outlook configuration incomplete. Please set Client ID.",
      };
    }

    const orgAuth = validateOrganizationAuth(config);
    if (!orgAuth.valid) {
      return { success: false, error: orgAuth.error };
    }

    const authType = config.authType || AUTH_TYPES.common;
    const authority = getAuthority(authType, config.tenantId);
    const { code_verifier, code_challenge } = _pkceChallenge();
    const state = crypto.randomBytes(16).toString("hex");
    this._state = state;
    this._codeVerifier = code_verifier;
    this._redirectUri = redirectUri;
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: SCOPES,
      state,
      code_challenge,
      code_challenge_method: "S256",
    });

    const url = `${MICROSOFT_AUTH_URL}/${authority}/oauth2/v2.0/authorize?${params.toString()}`;
    this.#log(`Auth URL using authType: ${authType}, authority: ${authority}`);
    return { success: true, url, state };
  }

  /**
   * Exchanges the authorization code for access and refresh tokens.
   * Validates the inbound `state` against the value generated by getAuthUrl
   * and submits the matching PKCE `code_verifier` to the token endpoint.
   * @param {string} code - The authorization code from OAuth callback
   * @param {string} redirectUri - The callback URL used in the initial auth request
   * @param {string} [state] - The state token returned by the OAuth provider
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async exchangeCodeForToken(code, redirectUri, state = null) {
    if (!state || state !== this._state) {
      return {
        success: false,
        error: "OAuth state mismatch — possible CSRF, refusing token exchange.",
      };
    }
    const codeVerifier = this._codeVerifier;
    const config = await OutlookBridge.getConfig();

    if (!config.clientId || !config.clientSecret) {
      return {
        success: false,
        error: "Outlook configuration incomplete.",
      };
    }

    const orgAuth = validateOrganizationAuth(config);
    if (!orgAuth.valid) {
      return { success: false, error: orgAuth.error };
    }

    try {
      const authType = config.authType || AUTH_TYPES.common;
      const authority = getAuthority(authType, config.tenantId);
      const tokenUrl = `${MICROSOFT_AUTH_URL}/${authority}/oauth2/v2.0/token`;
      this.#log(
        `Token exchange using authType: ${authType}, authority: ${authority}`,
      );

      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: SCOPES,
        code_verifier: codeVerifier,
        state,
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS),
      });

      const data = await response.json();

      if (!response.ok) {
        this.#log("Token exchange failed:", data);
        return {
          success: false,
          error:
            data.error_description || data.error || "Token exchange failed",
        };
      }

      const expiresAt = Date.now() + (data.expires_in - 60) * 1000;
      this.#decodeAndLogToken(data.access_token, "NEW token received");
      await OutlookBridge.updateConfig({
        ...config,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: expiresAt,
      });

      this.#accessToken = data.access_token;
      this.#isInitialized = false; // Force re-initialization
      this._state = null;
      this._codeVerifier = null;
      this._redirectUri = null;

      this.#log("Successfully obtained tokens");
      return { success: true };
    } catch (error) {
      this.#log("Token exchange error:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refreshes the access token using the refresh token.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async #refreshAccessToken() {
    const config = await OutlookBridge.getConfig();

    if (!config.clientId || !config.clientSecret || !config.refreshToken) {
      return {
        success: false,
        error: "Cannot refresh token. Missing configuration or refresh token.",
      };
    }

    const orgAuth = validateOrganizationAuth(config);
    if (!orgAuth.valid) {
      return { success: false, error: orgAuth.error };
    }

    try {
      const authType = config.authType || AUTH_TYPES.common;
      const authority = getAuthority(authType, config.tenantId);
      const tokenUrl = `${MICROSOFT_AUTH_URL}/${authority}/oauth2/v2.0/token`;
      this.#log(
        `Token refresh using authType: ${authType}, authority: ${authority}`,
      );

      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
        scope: SCOPES,
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS),
      });

      const data = await response.json();

      if (!response.ok) {
        this.#log("Token refresh failed:", data);
        return {
          success: false,
          error: data.error_description || data.error || "Token refresh failed",
        };
      }

      const expiresAt = Date.now() + (data.expires_in - 60) * 1000;

      await OutlookBridge.updateConfig({
        ...config,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || config.refreshToken,
        tokenExpiry: expiresAt,
      });

      this.#accessToken = data.access_token;

      this.#log("Successfully refreshed access token");
      return { success: true };
    } catch (error) {
      this.#log("Token refresh error:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ensures we have a valid access token, refreshing if necessary.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async #ensureValidToken() {
    const config = await OutlookBridge.getConfig();

    if (!config.accessToken || !config.tokenExpiry) {
      this.#log("No access token or expiry found in config");
      return {
        success: false,
        error: "Outlook is not authenticated. Please complete the OAuth flow.",
      };
    }

    const expiryTime = normalizeTokenExpiry(config.tokenExpiry);

    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    this.#log(
      `Token check: expires in ${Math.round(timeUntilExpiry / 1000)}s (at ${new Date(expiryTime).toISOString()})`,
    );

    const payload = this.#decodeAndLogToken(config.accessToken, "Token check");
    if (payload) {
      this.#log(`Token aud: ${payload.aud}`);
      this.#log(`Token scp: ${payload.scp}`);
    }

    if (now >= expiryTime) {
      this.#log("Access token expired, refreshing...");
      return this.#refreshAccessToken();
    }

    this.#accessToken = config.accessToken;
    return { success: true };
  }

  /**
   * Initializes the Outlook bridge by fetching configuration from system settings.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async initialize() {
    if (this.#isInitialized) return { success: true };

    try {
      const isMultiUser = await SystemSettings.isMultiUserMode();
      if (isMultiUser) {
        return {
          success: false,
          error:
            "Outlook integration is not available in multi-user mode for security reasons.",
        };
      }

      const config = await OutlookBridge.getConfig();

      if (!config.clientId || !config.clientSecret) {
        return {
          success: false,
          error:
            "Outlook integration is not configured. Please set Client ID and Client Secret in the agent settings.",
        };
      }

      const orgAuth = validateOrganizationAuth(config);
      if (!orgAuth.valid) {
        return { success: false, error: orgAuth.error };
      }

      this.#log(
        `Initializing with authType: ${config.authType || AUTH_TYPES.common}`,
      );

      if (!config.accessToken) {
        return {
          success: false,
          error:
            "Outlook is not authenticated. Please complete the OAuth authorization flow.",
        };
      }

      const tokenResult = await this.#ensureValidToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      this.#isInitialized = true;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Checks if the Outlook bridge is properly configured and available.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    const result = await this.initialize();
    return result.success;
  }

  /**
   * Checks if Outlook tools are available (not in multi-user mode and has configuration).
   * @returns {Promise<boolean>}
   */
  static async isToolAvailable() {
    const isMultiUser = await SystemSettings.isMultiUserMode();
    if (isMultiUser) return false;

    const config = await OutlookBridge.getConfig();

    if (!config.clientId || !config.clientSecret || !config.accessToken) {
      return false;
    }

    const orgAuth = validateOrganizationAuth(config);
    return orgAuth.valid;
  }

  /**
   * Makes a request to the Microsoft Graph API.
   * @param {string} endpoint - The API endpoint (relative to /v1.0)
   * @param {object} options - Fetch options
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async request(endpoint, options = {}) {
    const initResult = await this.initialize();
    if (!initResult.success) {
      this.#log(`Initialize failed: ${initResult.error}`);
      return { success: false, error: initResult.error };
    }

    const tokenResult = await this.#ensureValidToken();
    if (!tokenResult.success) {
      this.#log(`Token validation failed: ${tokenResult.error}`);
      return { success: false, error: tokenResult.error };
    }

    try {
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${GRAPH_API_URL}${endpoint}`;

      this.#log(`Making request to: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.#accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: AbortSignal.timeout(GRAPH_API_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText };
        }
        this.#log(
          `API request failed: ${response.status} ${response.statusText}`,
          `\n  Endpoint: ${endpoint}`,
          `\n  Error: ${JSON.stringify(errorData, null, 2)}`,
        );
        return {
          success: false,
          error:
            errorData.error?.message ||
            `Request failed with status ${response.status}`,
        };
      }

      // Handle responses with no content (204 No Content, 202 Accepted with empty body, etc.)
      if (response.status === 204 || response.status === 202) {
        return { success: true, data: {} };
      }

      const text = await response.text();
      if (!text || text.trim() === "") {
        return { success: true, data: {} };
      }

      const data = JSON.parse(text);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Outlook API request failed: ${error.message}`,
      };
    }
  }
}

// Mix in email operation methods (search, getInbox, readThread, sendEmail, etc.)
Object.assign(OutlookBridge.prototype, emailOperations);

module.exports = { OutlookBridge };
