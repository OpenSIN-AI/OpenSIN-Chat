// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");
const { reqBody } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");
const {
  ArtifactValidationError,
  listArtifacts,
  getArtifactByUuid,
  updateArtifact,
  deleteArtifactByUuid,
} = require("../models/workspaceArtifact");
const { readArtifact } = require("../utils/artifacts/storage");
const { addArtifactAsWorkspaceSource } = require("../utils/artifacts/source");
const { extForMime, extForType } = require("../utils/artifacts/types");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");

function parseInteger(value, { name, fallback, min = 0, max = 500 }) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ArtifactValidationError(
      `${name} must be an integer between ${min} and ${max}`,
    );
  }
  return parsed;
}

function handleEndpointError(response, error) {
  if (error instanceof ArtifactValidationError) {
    return response.status(400).json({ error: error.message });
  }
  consoleLogger.error(error);
  return response.sendStatus(500);
}

function artifactFilename(artifact) {
  const fallbackExtension =
    extForMime(artifact.mimeType) || extForType(artifact.type);
  const raw =
    artifact.downloadName || `${artifact.title || artifact.uuid}.${fallbackExtension}`;
  const withoutControls = String(raw)
    .replace(/[\r\n\0]/g, "")
    .replace(/[\\/]/g, "_")
    .slice(0, 255);
  return withoutControls || `artifact.${fallbackExtension}`;
}

function setArtifactResponseHeaders(response, artifact) {
  const mimeType = artifact.mimeType || "application/octet-stream";
  const filename = artifactFilename(artifact);
  const asciiFilename = filename
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  const activeContent = ["text/html", "application/xhtml+xml"].includes(
    mimeType.toLowerCase(),
  );

  response.setHeader("Content-Type", mimeType);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader(
    "Content-Disposition",
    `${activeContent ? "attachment" : "inline"}; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
}

function workspaceArtifactEndpoints(app) {
  if (!app) return;

  app.get(
    "/workspaces/:slug/artifacts",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { type, threadId, chatId, limit, offset } = request.query;

        const result = await listArtifacts(workspace.id, {
          type: type || undefined,
          threadId: parseInteger(threadId, {
            name: "threadId",
            fallback: undefined,
            min: 1,
            max: Number.MAX_SAFE_INTEGER,
          }),
          chatId: parseInteger(chatId, {
            name: "chatId",
            fallback: undefined,
            min: 1,
            max: Number.MAX_SAFE_INTEGER,
          }),
          limit: parseInteger(limit, {
            name: "limit",
            fallback: 50,
            min: 1,
            max: 500,
          }),
          offset: parseInteger(offset, {
            name: "offset",
            fallback: 0,
            min: 0,
            max: Number.MAX_SAFE_INTEGER,
          }),
        });

        response.status(200).json(result);
      } catch (e) {
        return handleEndpointError(response, e);
      }
    },
  );

  app.get(
    "/workspaces/:slug/artifacts/:uuid",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { uuid } = request.params;
        const artifact = await getArtifactByUuid(workspace.id, uuid);

        if (!artifact) {
          return response.status(404).json({ error: "Artifact not found" });
        }

        response.status(200).json({ artifact });
      } catch (e) {
        return handleEndpointError(response, e);
      }
    },
  );

  app.get(
    "/workspaces/:slug/artifacts/:uuid/download",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { uuid } = request.params;
        const artifact = await getArtifactByUuid(workspace.id, uuid);

        if (!artifact) {
          return response.status(404).json({ error: "Artifact not found" });
        }

        if (artifact.storagePath) {
          const fileBuffer = readArtifact(artifact.storagePath);
          if (!fileBuffer) {
            return response
              .status(404)
              .json({ error: "Artifact file not found on disk" });
          }
          setArtifactResponseHeaders(response, artifact);
          return response.status(200).send(fileBuffer);
        }

        if (artifact.content !== null && artifact.content !== undefined) {
          setArtifactResponseHeaders(response, artifact);
          return response.status(200).send(artifact.content);
        }

        return response
          .status(404)
          .json({ error: "No content or file for this artifact" });
      } catch (e) {
        return handleEndpointError(response, e);
      }
    },
  );

  app.patch(
    "/workspaces/:slug/artifacts/:uuid",
    [validatedRequest, flexUserRoleValid([ROLES.admin]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { uuid } = request.params;
        const body = reqBody(request);

        const updated = await updateArtifact(uuid, workspace.id, {
          title: body.title,
          description: body.description,
          status: body.status,
          downloadName: body.downloadName,
        });

        if (!updated) {
          return response.status(404).json({ error: "Artifact not found" });
        }

        response.status(200).json({ artifact: updated });
      } catch (e) {
        return handleEndpointError(response, e);
      }
    },
  );

  app.delete(
    "/workspaces/:slug/artifacts/:uuid",
    [validatedRequest, flexUserRoleValid([ROLES.admin]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { uuid } = request.params;
        const deleted = await deleteArtifactByUuid(workspace.id, uuid);

        if (!deleted) {
          return response.status(404).json({ error: "Artifact not found" });
        }

        response.status(200).json({ success: true });
      } catch (e) {
        return handleEndpointError(response, e);
      }
    },
  );

  app.post(
    "/workspaces/:slug/artifacts/:uuid/add-as-source",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceSlug,
      simpleRateLimit({
        bucket: "artifact-add-as-source",
        max: 10,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { uuid } = request.params;
        const artifact = await getArtifactByUuid(workspace.id, uuid);

        if (!artifact) {
          return response.status(404).json({ error: "Artifact not found" });
        }

        const result = await addArtifactAsWorkspaceSource({
          artifact,
          workspace,
          userId: response.locals.user?.id || null,
          readArtifact,
        });
        if (!result.success) {
          return response.status(result.code).json({ error: result.error });
        }

        return response.status(200).json({
          success: true,
          docId: result.document.docId,
          alreadyAdded: result.alreadyAdded,
        });
      } catch (e) {
        return handleEndpointError(response, e);
      }
    },
  );
}

module.exports = { workspaceArtifactEndpoints };
