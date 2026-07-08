// SPDX-License-Identifier: MIT
const consoleLogger = require("../../utils/logger/console.js");

const { Telemetry } = require("../../models/telemetry");
const { CollectorApi } = require("../../utils/collectorApi");
const { Document } = require("../../models/documents");
const { Workspace } = require("../../models/workspace");
const {
  BrowserExtensionApiKey,
} = require("../../models/browserExtensionApiKey");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  isSupportedRepoProvider,
} = require("../../utils/middleware/isSupportedRepoProviders");
const {
  validBrowserExtensionApiKey,
} = require("../../utils/middleware/validBrowserExtensionApiKey");
const { reqBody, multiUserMode, userFromSession } = require("../../utils/http");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");

function extensionEndpoints(app) {
  if (!app) return;

  // ── Browser Extension API ──────────────────────────────────────────────────

  app.get(
    "/browser-extension/check",
    [validatedRequest, validBrowserExtensionApiKey],
    async (request, response) => {
      try {
        const { apiKey } = response.locals;
        const isMultiUser = multiUserMode(response);
        const workspaces = isMultiUser
          ? await Workspace.whereWithUser(
              response.locals.user,
              {},
              null,
              null,
            )
          : await Workspace.where({});
        return response.status(200).json({
          connected: true,
          workspaces,
          apiKeyId: apiKey?.id ?? null,
        });
      } catch (e) {
        consoleLogger.error(e);
        return response
          .status(500)
          .json({ connected: false, error: "Failed to fetch workspaces" });
      }
    },
  );

  app.delete(
    "/browser-extension/disconnect",
    [validatedRequest, validBrowserExtensionApiKey],
    async (request, response) => {
      try {
        const { apiKey } = response.locals;
        const { success, error } = await BrowserExtensionApiKey.delete(
          apiKey?.id,
        );
        if (!success) {
          return response.status(500).json({
            success: false,
            error: "Failed to disconnect and revoke API key",
          });
        }
        return response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error(e);
        return response.status(500).json({
          success: false,
          error: "Failed to disconnect and revoke API key",
        });
      }
    },
  );

  app.get(
    "/browser-extension/workspaces",
    [validatedRequest, validBrowserExtensionApiKey],
    async (request, response) => {
      try {
        const isMultiUser = multiUserMode(response);
        const workspaces = isMultiUser
          ? await Workspace.whereWithUser(response.locals.user, {}, null, null)
          : await Workspace.where({});
        return response.status(200).json({ workspaces, error: null });
      } catch (e) {
        consoleLogger.error(e);
        return response
          .status(500)
          .json({ workspaces: [], error: "Failed to fetch workspaces" });
      }
    },
  );

  app.post(
    "/browser-extension/embed-content",
    [
      validatedRequest,
      validBrowserExtensionApiKey,
      simpleRateLimit({ bucket: "browser-ext-embed", max: 30, windowMs: 60000 }),
    ],
    async (request, response) => {
      try {
        const { workspaceId, textContent, metadata = {} } = reqBody(request);
        if (!workspaceId) {
          return response
            .status(400)
            .json({ success: false, error: "workspaceId is required." });
        }
        if (!textContent || !textContent.trim()) {
          return response.status(400).json({
            success: false,
            error: "textContent is required and cannot be empty.",
          });
        }
        const workspace = await Workspace.get({ id: Number(workspaceId) });
        if (!workspace) {
          return response
            .status(404)
            .json({ success: false, error: "Workspace not found" });
        }
        const result = await new CollectorApi().processRawText(
          textContent,
          metadata,
        );
        if (!result?.success) {
          return response.status(500).json({
            success: false,
            error: result?.reason || "Collector failed to process content",
          });
        }
        const locations = (result.documents || []).map((d) => d.location);
        const { failedToEmbed = [], errors = [] } =
          await Document.addDocuments(workspace, locations);
        if (failedToEmbed.length > 0) {
          return response
            .status(500)
            .json({ success: false, error: errors[0] || "Embedding failed" });
        }
        await Telemetry.sendTelemetry("browser_extension_embed_content");
        return response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error(e);
        return response
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    },
  );

  app.post(
    "/browser-extension/upload-content",
    [
      validatedRequest,
      validBrowserExtensionApiKey,
      simpleRateLimit({
        bucket: "browser-ext-upload",
        max: 30,
        windowMs: 60000,
      }),
    ],
    async (request, response) => {
      try {
        const { textContent, metadata = {} } = reqBody(request);
        if (!textContent || !textContent.trim()) {
          return response.status(400).json({
            success: false,
            error: "textContent is required and cannot be empty.",
          });
        }
        const result = await new CollectorApi().processRawText(
          textContent,
          metadata,
        );
        if (!result?.success) {
          return response.status(500).json({
            success: false,
            error: result?.reason || "Collector failed to process content",
          });
        }
        await Telemetry.sendTelemetry("browser_extension_upload_content");
        return response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error(e);
        return response
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    },
  );

  app.get(
    "/browser-extension/api-keys",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const isMultiUser = multiUserMode(response);
        const apiKeys = isMultiUser
          ? await BrowserExtensionApiKey.whereWithUser(user, {})
          : await BrowserExtensionApiKey.where({});
        return response.status(200).json({ success: true, apiKeys });
      } catch (e) {
        consoleLogger.error(e);
        return response
          .status(500)
          .json({ success: false, error: "Failed to fetch API keys" });
      }
    },
  );

  app.post(
    "/browser-extension/api-keys/new",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { apiKey, error } = await BrowserExtensionApiKey.create(
          user?.id ?? null,
        );
        if (!apiKey) {
          return response.status(500).json({
            success: false,
            error: "Failed to create API key",
          });
        }
        return response
          .status(200)
          .json({ success: true, apiKey: apiKey.key, error: null });
      } catch (e) {
        consoleLogger.error(e);
        return response
          .status(500)
          .json({ success: false, error: "Failed to create API key" });
      }
    },
  );

  app.delete(
    "/browser-extension/api-keys/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const { success, error } = await BrowserExtensionApiKey.delete(id);
        if (!success) {
          return response
            .status(500)
            .json({ success: false, error: "Failed to revoke API key" });
        }
        return response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error(e);
        return response
          .status(500)
          .json({ success: false, error: "Failed to revoke API key" });
      }
    },
  );

  app.post(
    "/ext/:repo_platform/branches",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      isSupportedRepoProvider,
    ],
    async (request, response) => {
      try {
        const { repo_platform } = request.params;
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: `/ext/${repo_platform}-repo/branches`,
            method: "POST",
            body: request.body,
          });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/ext/:repo_platform/repo",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      isSupportedRepoProvider,
    ],
    async (request, response) => {
      try {
        const { repo_platform } = request.params;
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: `/ext/${repo_platform}-repo`,
            method: "POST",
            body: request.body,
          });
        await Telemetry.sendTelemetry("extension_invoked", {
          type: `${repo_platform}_repo`,
        });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/ext/youtube/transcript",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/youtube-transcript",
            method: "POST",
            body: request.body,
          });
        await Telemetry.sendTelemetry("extension_invoked", {
          type: "youtube_transcript",
        });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/ext/confluence",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/confluence",
            method: "POST",
            body: request.body,
          });
        await Telemetry.sendTelemetry("extension_invoked", {
          type: "confluence",
        });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );
  app.post(
    "/ext/website-depth",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/website-depth",
            method: "POST",
            body: request.body,
          });
        await Telemetry.sendTelemetry("extension_invoked", {
          type: "website_depth",
        });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );
  app.post(
    "/ext/drupalwiki",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/drupalwiki",
            method: "POST",
            body: request.body,
          });
        await Telemetry.sendTelemetry("extension_invoked", {
          type: "drupalwiki",
        });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/ext/obsidian/vault",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/obsidian/vault",
            method: "POST",
            body: request.body,
          });
        await Telemetry.sendTelemetry("extension_invoked", {
          type: "obsidian_vault",
        });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/ext/paperless-ngx",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/paperless-ngx",
            method: "POST",
            body: request.body,
          });
        await Telemetry.sendTelemetry("extension_invoked", {
          type: "paperless_ngx",
        });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );
}

module.exports = { extensionEndpoints };
