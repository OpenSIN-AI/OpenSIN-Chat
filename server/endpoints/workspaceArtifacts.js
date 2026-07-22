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
  listArtifacts,
  getArtifactByUuid,
  updateArtifact,
  deleteArtifactByUuid,
} = require("../models/workspaceArtifact");
const { readArtifact } = require("../utils/artifacts/storage");

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
          threadId: threadId ? Number(threadId) : undefined,
          chatId: chatId ? Number(chatId) : undefined,
          limit: limit ? Math.min(Number(limit), 500) : 50,
          offset: offset ? Number(offset) : 0,
        });

        response.status(200).json(result);
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
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
        consoleLogger.error(e);
        return response.sendStatus(500);
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
          response.setHeader(
            "Content-Type",
            artifact.mimeType || "application/octet-stream",
          );
          if (artifact.downloadName) {
            response.setHeader(
              "Content-Disposition",
              `attachment; filename="${artifact.downloadName}"`,
            );
          }
          return response.status(200).send(fileBuffer);
        }

        if (artifact.content) {
          response.setHeader("Content-Type", artifact.mimeType || "text/plain");
          if (artifact.downloadName) {
            response.setHeader(
              "Content-Disposition",
              `attachment; filename="${artifact.downloadName}"`,
            );
          }
          return response.status(200).send(artifact.content);
        }

        return response
          .status(404)
          .json({ error: "No content or file for this artifact" });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
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
        consoleLogger.error(e);
        return response.sendStatus(500);
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
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspaces/:slug/artifacts/:uuid/add-as-source",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { uuid } = request.params;
        const artifact = await getArtifactByUuid(workspace.id, uuid);

        if (!artifact) {
          return response.status(404).json({ error: "Artifact not found" });
        }

        const { readArtifact } = require("../utils/artifacts/storage");

        let content = artifact.content;
        if (!content && artifact.storagePath) {
          const buffer = readArtifact(artifact.storagePath);
          if (buffer) content = buffer.toString("utf-8");
        }

        if (!content) {
          return response.status(400).json({
            error: "Artifact has no text content to add as source",
          });
        }

        const filename =
          artifact.downloadName ||
          `${artifact.title}.${artifact.type || "txt"}`;
        const docPath = `artifacts/${filename}`;

        const { Document } = require("../models/documents");
        const document = await Document.create({
          docId: artifact.uuid,
          filename,
          docpath: docPath,
          workspaceId: workspace.id,
          metadata: JSON.stringify({
            source: "artifact",
            artifactUuid: artifact.uuid,
            artifactType: artifact.type,
            createdAt: artifact.createdAt,
          }),
        });

        response.status(200).json({
          success: true,
          docId: document?.docId || artifact.uuid,
        });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );
}

module.exports = { workspaceArtifactEndpoints };
