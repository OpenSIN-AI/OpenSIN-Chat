// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");
const fs = require("fs");
const path = require("path");

const { WorkspaceNote } = require("../models/workspaceNote");
const { Document } = require("../models/documents");
const { userFromSession, reqBody } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");
const { getStoragePath } = require("../utils/paths");

function noteEndpoints(app) {
  if (!app) return;

  app.get(
    "/workspaces/:slug/notes",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const notes = await WorkspaceNote.forWorkspace(workspace.id);
        response.status(200).json({ notes });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspaces/:slug/notes",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { content = "", pinned = false } = reqBody(request);
        const note = await WorkspaceNote.create(workspace.id, content, pinned);
        response.status(200).json({ note });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.put(
    "/workspaces/:slug/notes/:id",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { id } = request.params;
        const { content, pinned } = reqBody(request);
        const note = await WorkspaceNote.update(Number(id), { content, pinned });
        response.status(200).json({ note });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspaces/:slug/notes/:id",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { id } = request.params;
        await WorkspaceNote.delete(Number(id));
        response.status(200).json({ success: true });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspaces/:slug/document-snippets",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const docs = await Document.forWorkspace(workspace.id);
        const documentsPath = getStoragePath("documents");
        const snippets = {};

        for (const doc of docs) {
          try {
            const fullPath = path.join(documentsPath, doc.docpath);
            if (!fs.existsSync(fullPath)) continue;
            const content = fs.readFileSync(fullPath, "utf-8");
            const clean = content
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (clean.length > 0) {
              snippets[doc.docId] = clean.slice(0, 200);
            }
          } catch (e) {}
        }

        response.status(200).json({ snippets });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );
}

module.exports = { noteEndpoints };
