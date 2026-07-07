// SPDX-License-Identifier: MIT
// Purpose: Data-access layer for connector_accounts table.
//          Encrypts tokens at-rest via EncryptionManager (AES-GCM).
//          Refresh-coalescing prevents thundering-herd on token refresh.
// Docs: connectorAccounts.doc.md

const prisma = require("../utils/prisma").default || require("../utils/prisma");
const { EncryptionManager } = require("../utils/EncryptionManager");
const { PROVIDERS } = require("../utils/connectors/providers");
const consoleLogger = require("../utils/logger/console.js");

const enc = new EncryptionManager();

// In-flight refresh promises (accountId -> Promise) for coalescing
const inflight = new Map();

const ConnectorAccounts = {
  /**
   * Insert or update a connector account with encrypted tokens.
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async upsert({
    userId,
    provider,
    providerAccount,
    scopes,
    accessToken,
    refreshToken,
    tokenType,
    expiresAt,
  }) {
    const data = {
      user_id: userId,
      provider,
      provider_account: providerAccount,
      scopes,
      access_token_enc: enc.encrypt(accessToken),
      refresh_token_enc: refreshToken ? enc.encrypt(refreshToken) : null,
      token_type: tokenType || "Bearer",
      expires_at: expiresAt,
      status: "active",
    };

    // Use upsert with composite unique key
    return prisma.connector_accounts.upsert({
      where: {
        user_id_provider_provider_account: {
          user_id: userId ?? 0,
          provider,
          provider_account: providerAccount || "",
        },
      },
      update: data,
      create: data,
    });
  },

  /**
   * List connected accounts WITHOUT token blobs (safe for frontend).
   * @param {number|null} userId
   * @returns {Promise<Array>}
   */
  async listSafe(userId) {
    return prisma.connector_accounts.findMany({
      where: { user_id: userId ?? null },
      select: {
        id: true,
        provider: true,
        provider_account: true,
        scopes: true,
        status: true,
        expires_at: true,
        updated_at: true,
      },
    });
  },

  /**
   * Get a fresh access token. Refreshes if expired (with coalescing).
   * @param {Object} params - { userId, provider, providerAccount? }
   * @returns {Promise<string>} access token
   */
  async getFreshAccessToken({ userId, provider, providerAccount = null }) {
    const acc = await prisma.connector_accounts.findFirst({
      where: {
        user_id: userId ?? null,
        provider,
        status: "active",
        ...(providerAccount ? { provider_account: providerAccount } : {}),
      },
    });

    if (!acc) {
      throw new Error(`No active ${provider} connection`);
    }

    // Token still valid (>60s remaining)
    const notExpired =
      !acc.expires_at ||
      new Date(acc.expires_at).getTime() - Date.now() > 60_000;
    if (notExpired) {
      return enc.decrypt(acc.access_token_enc);
    }

    // Refresh needed — coalesce parallel requests
    if (inflight.has(acc.id)) {
      return inflight.get(acc.id);
    }

    const p = this._refresh(acc, provider).finally(() =>
      inflight.delete(acc.id),
    );
    inflight.set(acc.id, p);
    return p;
  },

  /**
   * Refresh an expired token. Sets requires_reauth on failure (does NOT delete).
   * @private
   */
  async _refresh(acc, provider) {
    const def = PROVIDERS[provider];
    if (!acc.refresh_token_enc) {
      await prisma.connector_accounts.update({
        where: { id: acc.id },
        data: { status: "requires_reauth" },
      });
      throw new Error(
        `${provider} token expired and no refresh token — reconnect needed`,
      );
    }

    const body = new URLSearchParams({
      client_id: def.clientId,
      client_secret: def.clientSecret || "",
      grant_type: "refresh_token",
      refresh_token: enc.decrypt(acc.refresh_token_enc),
    });

    const r = await fetch(def.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });

    const tok = await r.json();
    if (!r.ok || tok.error) {
      // Refresh failed — flag for reauth, DON'T delete
      await prisma.connector_accounts.update({
        where: { id: acc.id },
        data: { status: "requires_reauth" },
      });
      throw new Error(tok.error_description || tok.error || "Refresh failed");
    }

    const expiresAt = tok.expires_in
      ? new Date(Date.now() + Number(tok.expires_in) * 1000)
      : null;

    await prisma.connector_accounts.update({
      where: { id: acc.id },
      data: {
        access_token_enc: enc.encrypt(tok.access_token),
        ...(tok.refresh_token
          ? { refresh_token_enc: enc.encrypt(tok.refresh_token) }
          : {}),
        expires_at: expiresAt,
        last_refresh_at: new Date(),
        status: "active",
      },
    });

    return tok.access_token;
  },

  /**
   * Revoke a connector account: revoke token at provider, then delete DB row.
   * @param {number|null} userId
   * @param {string} provider
   * @param {string?} providerAccount
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async revoke(userId, provider, providerAccount = null) {
    const def = PROVIDERS[provider];
    const acc = await prisma.connector_accounts.findFirst({
      where: {
        user_id: userId ?? null,
        provider,
        ...(providerAccount ? { provider_account: providerAccount } : {}),
      },
    });

    if (!acc) return { success: false, error: "Not found" };

    // Revoke at provider (best-effort)
    if (def.revokeUrl) {
      try {
        await fetch(def.revokeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: enc.decrypt(acc.access_token_enc),
          }),
        });
      } catch (e) {
        consoleLogger.warn(
          `[connectorAccounts] revoke at provider failed (${provider}): ${e.message}`,
        );
      }
    }

    await prisma.connector_accounts.delete({ where: { id: acc.id } });
    return { success: true };
  },
};

module.exports = { ConnectorAccounts };
