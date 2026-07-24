// SPDX-License-Identifier: MIT
// Purpose: OAuth connector endpoints — start, callback, list, disconnect.
//          Graceful degradation: if OAuth env vars not set, returns "coming_soon"
//          instead of crashing. App runs production-ready WITHOUT OAuth config.
// Docs: oauth.doc.md

const crypto = require("node:crypto");
const express = require("express");
const {
  PROVIDERS,
  isProviderAvailable,
  getAvailability,
  redirectUri,
  BASE_URL,
} = require("../../utils/connectors/providers");
const {
  createPKCE,
  putState,
  takeState,
} = require("../../utils/connectors/pkce");
const { ConnectorAccounts } = require("../../models/connectorAccounts");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");
const { userFromSession } = require("../../utils/http");
const consoleLogger = require("../../utils/logger/console.js");

function connectorOAuthEndpoints(app) {
  if (!app) return;
  const router = express.Router();

  // GET /connectors — list connected accounts + provider availability
  router.get("/connectors", [validatedRequest], async (req, res) => {
    try {
      const user = await userFromSession(req);
      const accounts = await ConnectorAccounts.listSafe(user?.id ?? null);
      return res.json({
        success: true,
        accounts,
        available: getAvailability(),
      });
    } catch (e) {
      consoleLogger.error("[connectors list]", e);
      return res.status(500).json({ success: false, error: "Internal error" });
    }
  });

  // GET /connectors/:provider/start?product=gmail — start OAuth flow
  router.get(
    "/connectors/:provider/start",
    [
      validatedRequest,
      simpleRateLimit({
        bucket: "connectors-start",
        max: 30,
        windowMs: 60 * 1000,
      }),
    ],
    async (req, res) => {
      const { provider } = req.params;
      const product = String(req.query.product || "").toLowerCase();
      const def = PROVIDERS[provider];

      if (!def) {
        return res
          .status(404)
          .json({ success: false, error: "Unknown provider" });
      }

      // Graceful degradation: not configured → coming_soon
      if (!isProviderAvailable(provider)) {
        return res.status(200).json({
          success: false,
          status: "coming_soon",
          error: `${provider} OAuth is not configured. Set ${provider === "google" ? "GOOGLE_OAUTH_CLIENT_ID" : "GITHUB_OAUTH_CLIENT_ID"} in .env to enable.`,
        });
      }

      // Validate product scope set
      const scopes = [
        ...(def.scopeSets._base || []),
        ...(def.scopeSets[product] || []),
      ];
      if (product && scopes.length === (def.scopeSets._base || []).length) {
        return res.status(400).json({
          success: false,
          error: `Unknown product '${product}' for ${provider}`,
        });
      }

      try {
        const user = await userFromSession(req);
        const state = crypto.randomUUID();
        const { verifier, challenge } = createPKCE();
        putState(state, {
          verifier,
          provider,
          product,
          userId: user?.id ?? null,
          scopes,
        });

        const params = new URLSearchParams({
          client_id: def.clientId,
          redirect_uri: redirectUri(provider),
          response_type: "code",
          scope: scopes.join(" "),
          state,
          ...(def.usesPKCE
            ? { code_challenge: challenge, code_challenge_method: "S256" }
            : {}),
          ...(def.extraAuthParams || {}),
        });

        return res.json({
          success: true,
          authorizeUrl: `${def.authUrl}?${params.toString()}`,
        });
      } catch (e) {
        consoleLogger.error(`[connectors ${provider} start]`, e);
        return res
          .status(500)
          .json({ success: false, error: "Internal error" });
      }
    },
  );

  // GET /connectors/:provider/callback?code=...&state=... — OAuth callback
  router.get("/connectors/:provider/callback", async (req, res) => {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;
    const def = PROVIDERS[provider];

    const closePopup = (payload) =>
      res.send(`<!doctype html><html><body><script>
        window.opener && window.opener.postMessage(${JSON.stringify(payload)}, "${BASE_URL}");
        setTimeout(() => window.close(), 100);
      </script><p style="font-family:sans-serif;text-align:center;padding:2rem">${
        payload.ok
          ? "Verbunden! Fenster schließt sich…"
          : "Fehler: " + payload.error
      }</p></body></html>`);

    if (oauthError) {
      return closePopup({ ok: false, provider, error: String(oauthError) });
    }
    if (!def || !code || !state) {
      return closePopup({ ok: false, provider, error: "Invalid callback" });
    }

    const saved = takeState(String(state));
    if (!saved || saved.provider !== provider) {
      return closePopup({
        ok: false,
        provider,
        error: "State mismatch or expired",
      });
    }

    try {
      // Exchange code for token
      const body = new URLSearchParams({
        client_id: def.clientId,
        client_secret: def.clientSecret || "",
        code: String(code),
        grant_type: "authorization_code",
        redirect_uri: redirectUri(provider),
        ...(def.usesPKCE ? { code_verifier: saved.verifier } : {}),
      });

      const tokenRes = await fetch(def.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      });
      const tok = await tokenRes.json();
      if (!tokenRes.ok || tok.error) {
        throw new Error(
          tok.error_description || tok.error || "Token exchange failed",
        );
      }

      // Fetch account display name
      let providerAccount = null;
      try {
        const ui = await fetch(def.userinfoUrl, {
          headers: {
            Authorization: `Bearer ${tok.access_token}`,
            "User-Agent": "OpenSIN-Chat",
            Accept: "application/json",
          },
        });
        const uj = await ui.json();
        providerAccount = uj.email || uj.login || uj.name || null;
      } catch (e) {
        console.warn("[oauth] non-fatal error:", e?.message || e);
      }

      const expiresAt = tok.expires_in
        ? new Date(Date.now() + Number(tok.expires_in) * 1000)
        : null;

      await ConnectorAccounts.upsert({
        userId: saved.userId,
        provider,
        providerAccount,
        scopes: saved.scopes.join(" "),
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        tokenType: tok.token_type || "Bearer",
        expiresAt,
      });

      return closePopup({
        ok: true,
        provider,
        product: saved.product,
        account: providerAccount,
      });
    } catch (e) {
      consoleLogger.error(`[connectors ${provider} callback]`, e);
      return closePopup({ ok: false, provider, error: e.message });
    }
  });

  // POST /connectors/:provider/disconnect — revoke + delete
  router.post(
    "/connectors/:provider/disconnect",
    [validatedRequest],
    async (req, res) => {
      try {
        const user = await userFromSession(req);
        const { account } = req.body || {};
        const result = await ConnectorAccounts.revoke(
          user?.id ?? null,
          req.params.provider,
          account,
        );
        return res.json(result);
      } catch (e) {
        consoleLogger.error("[connectors disconnect]", e);
        return res
          .status(500)
          .json({ success: false, error: "Internal error" });
      }
    },
  );

  app.use("/api", router);
}

module.exports = { connectorOAuthEndpoints };
