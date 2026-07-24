// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");
const fs = require("fs");
const path = require("path");

const { WorkspaceNote } = require("../models/workspaceNote");
const { Document } = require("../models/documents");
const { Workspace } = require("../models/workspace");
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
        const notes = await WorkspaceNote.forWorkspace(workspace.id, {
          trash: request.query.trash === "true",
        });
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
        const {
          title = "",
          content = "",
          plainText = "",
          tags = [],
          folder = null,
          pinned = false,
        } = reqBody(request);
        if (typeof content !== "string" || content.length > 100_000) {
          return response.status(400).json({
            error: "content must be a string of max 100,000 characters",
          });
        }
        if (typeof pinned !== "boolean") {
          return response
            .status(400)
            .json({ error: "pinned must be a boolean" });
        }
        if (
          typeof title !== "string" ||
          title.length > 300 ||
          typeof plainText !== "string" ||
          plainText.length > 100_000 ||
          !Array.isArray(tags) ||
          tags.length > 30 ||
          tags.some((tag) => typeof tag !== "string" || tag.length > 50) ||
          (folder !== null &&
            (typeof folder !== "string" || folder.length > 100))
        ) {
          return response.status(400).json({ error: "Invalid note metadata" });
        }
        const hasMetadata = title || plainText || tags.length || folder;
        const note = hasMetadata
          ? await WorkspaceNote.create(workspace.id, content, pinned, {
              title,
              plainText,
              tags: JSON.stringify(tags),
              folder,
            })
          : await WorkspaceNote.create(workspace.id, content, pinned);
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
        const workspace = response.locals.workspace;
        const noteId = Number(request.params.id);
        if (!Number.isInteger(noteId) || noteId <= 0) {
          return response.status(400).json({ error: "Invalid note id" });
        }
        const { title, content, plainText, tags, folder, pinned } =
          reqBody(request);
        if (
          content !== undefined &&
          (typeof content !== "string" || content.length > 100_000)
        ) {
          return response.status(400).json({
            error: "content must be a string of max 100,000 characters",
          });
        }
        if (
          (title !== undefined &&
            (typeof title !== "string" || title.length > 300)) ||
          (plainText !== undefined &&
            (typeof plainText !== "string" || plainText.length > 100_000)) ||
          (tags !== undefined &&
            (!Array.isArray(tags) ||
              tags.length > 30 ||
              tags.some(
                (tag) => typeof tag !== "string" || tag.length > 50,
              ))) ||
          (folder !== undefined &&
            folder !== null &&
            (typeof folder !== "string" || folder.length > 100)) ||
          (pinned !== undefined && typeof pinned !== "boolean")
        ) {
          return response.status(400).json({ error: "Invalid note data" });
        }
        const existing = await WorkspaceNote.get(noteId);
        if (!existing || existing.workspaceId !== workspace.id) {
          return response.status(404).json({ error: "Note not found" });
        }
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (plainText !== undefined) updates.plainText = plainText;
        if (tags !== undefined) updates.tags = JSON.stringify(tags);
        if (folder !== undefined) updates.folder = folder;
        if (pinned !== undefined) updates.pinned = pinned;
        const note = await WorkspaceNote.update(noteId, updates);
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
        const workspace = response.locals.workspace;
        const noteId = Number(request.params.id);
        if (!Number.isInteger(noteId) || noteId <= 0) {
          return response.status(400).json({ error: "Invalid note id" });
        }
        // IDOR guard: ensure the note belongs to this workspace
        const existing = await WorkspaceNote.get(noteId);
        if (!existing || existing.workspaceId !== workspace.id) {
          return response.status(404).json({ error: "Note not found" });
        }
        if (request.query.permanent === "true") {
          await WorkspaceNote.delete(noteId);
        } else {
          await WorkspaceNote.trash(noteId);
        }
        response.status(200).json({ success: true });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspaces/:slug/notes/:id/restore",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const noteId = Number(request.params.id);
        const existing = await WorkspaceNote.get(noteId);
        if (
          !Number.isInteger(noteId) ||
          !existing ||
          existing.workspaceId !== workspace.id
        ) {
          return response.status(404).json({ error: "Note not found" });
        }
        await WorkspaceNote.restore(noteId);
        response.status(200).json({ success: true });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspaces/:slug/notes/shareable-workspaces",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const user = await userFromSession(request, response);
        const workspaces = await WorkspaceNote.getShareableWorkspaces(
          workspace.id,
          user?.id || null,
        );
        response.status(200).json({ workspaces });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspaces/:slug/notes/shared",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const notes = await WorkspaceNote.sharedToWorkspace(workspace.id);
        response.status(200).json({ notes });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspaces/:slug/notes/:id/share",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const noteId = Number(request.params.id);
        if (!Number.isInteger(noteId) || noteId <= 0) {
          return response.status(400).json({ error: "Invalid note id" });
        }
        const { targetWorkspaceSlug } = reqBody(request);
        if (!targetWorkspaceSlug) {
          return response
            .status(400)
            .json({ error: "targetWorkspaceSlug is required" });
        }
        // IDOR guard: ensure the note belongs to this workspace
        const existing = await WorkspaceNote.get(noteId);
        if (!existing || existing.workspaceId !== workspace.id) {
          return response.status(404).json({ error: "Note not found" });
        }
        const target = await Workspace.get({ slug: targetWorkspaceSlug });
        if (!target) {
          return response
            .status(404)
            .json({ error: "Target workspace not found" });
        }
        const user = await userFromSession(request, response);
        const shareableWorkspaces = await WorkspaceNote.getShareableWorkspaces(
          workspace.id,
          user?.id || null,
        );
        if (!shareableWorkspaces.some(({ id }) => id === target.id)) {
          return response
            .status(404)
            .json({ error: "Target workspace not found" });
        }
        const shared = await WorkspaceNote.shareToWorkspace(
          noteId,
          target.id,
          user?.id || null,
        );
        response.status(200).json({ shared });
      } catch (e) {
        consoleLogger.error(e);
        return response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspaces/:slug/notes/:id/share",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const noteId = Number(request.params.id);
        if (!Number.isInteger(noteId) || noteId <= 0) {
          return response.status(400).json({ error: "Invalid note id" });
        }
        const { targetWorkspaceSlug } = request.query;
        if (!targetWorkspaceSlug) {
          return response
            .status(400)
            .json({ error: "targetWorkspaceSlug is required" });
        }
        // IDOR guard: ensure the note belongs to this workspace
        const existing = await WorkspaceNote.get(noteId);
        if (!existing || existing.workspaceId !== workspace.id) {
          return response.status(404).json({ error: "Note not found" });
        }
        const target = await Workspace.get({ slug: targetWorkspaceSlug });
        if (!target) {
          return response
            .status(404)
            .json({ error: "Target workspace not found" });
        }
        const user = await userFromSession(request, response);
        const shareableWorkspaces = await WorkspaceNote.getShareableWorkspaces(
          workspace.id,
          user?.id || null,
        );
        if (!shareableWorkspaces.some(({ id }) => id === target.id)) {
          return response
            .status(404)
            .json({ error: "Target workspace not found" });
        }
        await WorkspaceNote.unshareFromWorkspace(noteId, target.id);
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
        const documentsPath = path.resolve(getStoragePath("documents"));
        const snippets = {};

        // Read only the first 8 KB of each document file instead of loading
        // the entire file into memory. This prevents blocking the event loop
        // when a workspace contains many or large documents (Issue #364).
        const READ_BYTES = 8 * 1024;
        for (const doc of docs) {
          try {
            const fullPath = path.resolve(documentsPath, doc.docpath);
            const isWithinDocuments =
              fullPath === documentsPath ||
              fullPath.startsWith(`${documentsPath}${path.sep}`);
            if (!isWithinDocuments) {
              consoleLogger.warn(
                `[notes] skipped document outside storage root: ${doc.docId}`,
              );
              continue;
            }

            let buf;
            let fd;
            try {
              fd = await fs.promises.open(fullPath, "r");
              const result = await fd.read(
                Buffer.alloc(READ_BYTES),
                0,
                READ_BYTES,
                0,
              );
              buf = result.buffer.subarray(0, result.bytesRead);
            } catch {
              continue; // file missing or unreadable — skip silently
            } finally {
              await fd?.close().catch((closeError) => {
                consoleLogger.warn(
                  `[notes] failed to close document handle: ${closeError.message}`,
                );
              });
            }
            const clean = buf
              .toString("utf-8")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (clean.length > 0) {
              snippets[doc.docId] = clean.slice(0, 200);
            }
          } catch (e) {
            console.warn("[notes] non-fatal error:", e?.message || e);
          }
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
