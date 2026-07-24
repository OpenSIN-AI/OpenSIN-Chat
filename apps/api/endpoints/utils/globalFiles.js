// SPDX-License-Identifier: MIT
// Global file store — files that live outside any single workspace and are
// shared across the whole deployment (e.g. a global agents.md / memory.md).
//
// Storage: STORAGE_DIR/global (a sibling of STORAGE_DIR/uploads). This lives
// inside the existing `server/storage` bind mount, so no new Docker volume is
// required. The directory is created on boot by ensureStorageDir("global").
//
// Every filesystem operation resolves the requested relative path with
// safeGlobalJoin(...), which throws when the resolved target escapes the
// global root (blocking "../" traversal, sibling-store access, and
// absolute-path injection). Mutating routes reuse the same admin-gated auth as
// the per-upload file endpoints in ../utils.js.
const consoleLogger = require("../../utils/logger/console.js");
const crypto = require("crypto");
const {
  getStoragePath,
  safeGlobalJoin,
  ensureStorageDir,
} = require("../../utils/paths");
const { reqBody } = require("../../utils/http");

const GLOBAL_ROOT = "global";

/**
 * Register the global-file-store endpoints on the provided router.
 * Middleware is injected by the caller (utilEndpoints) because the auth
 * modules participate in a circular-dependency chain and must be resolved
 * lazily at call time — see the notes at the top of endpoints/utils.js.
 *
 * @param {import("express").Router} app
 * @param {{ validatedRequest: Function, flexUserRoleValid: Function, ROLES: object }} deps
 */
function globalFilesEndpoints(
  app,
  { validatedRequest, flexUserRoleValid, ROLES },
) {
  if (!app) return;

  // Ensure the global store exists at registration time (idempotent).
  try {
    ensureStorageDir(GLOBAL_ROOT);
  } catch (e) {
    consoleLogger.warn(
      "[globalFiles] could not ensure global store:",
      e?.message || e,
    );
  }

  const adminGate = [validatedRequest, flexUserRoleValid([ROLES.admin])];

  // Browse the global store. `path` query param is RELATIVE to the global root.
  app.get(
    "/utils/global/browse-directory",
    adminGate,
    async (req, response) => {
      try {
        const path = require("path");
        const fs = require("fs");

        const globalRoot = ensureStorageDir(GLOBAL_ROOT);
        const relativePath = req.query.path || "";
        const resolvedPath = safeGlobalJoin(relativePath);

        const entries = await fs.promises.readdir(resolvedPath, {
          withFileTypes: true,
        });
        const items = (
          await Promise.all(
            entries
              .filter((entry) => !entry.name.startsWith("."))
              .map(async (entry) => {
                const fullPath = path.join(resolvedPath, entry.name);
                const itemRelPath = path.relative(globalRoot, fullPath);
                let size = 0;
                let ext = "";
                let modifiedAt = null;
                try {
                  const stat = await fs.promises.stat(fullPath);
                  if (entry.isFile()) {
                    size = stat.size;
                    ext = path.extname(entry.name).toLowerCase();
                  }
                  modifiedAt = stat.mtime.toISOString();
                } catch (e) {
                  console.warn(
                    "[globalFiles] non-fatal error:",
                    e?.message || e,
                  );
                }
                return {
                  name: entry.name,
                  type: entry.isDirectory() ? "directory" : "file",
                  path: itemRelPath,
                  size,
                  ext,
                  modifiedAt,
                };
              }),
          )
        ).sort((a, b) => {
          if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        response.status(200).json({
          path: path.relative(globalRoot, resolvedPath) || "",
          parent:
            resolvedPath === globalRoot
              ? null
              : path.relative(globalRoot, path.dirname(resolvedPath)) || "",
          items,
        });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response.status(500).json({ error: "Internal server error", errorId });
      }
    },
  );

  // Create a directory inside the global store.
  app.post(
    "/utils/global/create-directory",
    adminGate,
    async (req, response) => {
      try {
        const fs = require("fs");
        const { name, parentPath = "" } = reqBody(req);

        if (!name || typeof name !== "string") {
          return response.status(400).json({ error: "Name is required" });
        }
        if (/[/\\]/.test(name) || name.includes("..") || name.startsWith(".")) {
          return response.status(400).json({ error: "Invalid directory name" });
        }

        const resolved = safeGlobalJoin(parentPath, name);
        if (
          await fs.promises
            .access(resolved, fs.constants.F_OK)
            .then(() => true)
            .catch(() => false)
        ) {
          return response
            .status(409)
            .json({ error: "Directory already exists" });
        }

        await fs.promises.mkdir(resolved, { recursive: true });
        response.status(200).json({ success: true, path: resolved });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response.status(500).json({ error: "Internal server error", errorId });
      }
    },
  );

  // Create a plain-text file inside the global store.
  app.post("/utils/global/create-file", adminGate, async (req, response) => {
    try {
      const fs = require("fs");
      const { name, parentPath = "", content = "" } = reqBody(req);

      if (!name || typeof name !== "string") {
        return response.status(400).json({ error: "Name is required" });
      }
      if (/[/\\]/.test(name) || name.includes("..") || name.startsWith(".")) {
        return response.status(400).json({ error: "Invalid file name" });
      }

      const resolved = safeGlobalJoin(parentPath, name);
      if (
        await fs.promises
          .access(resolved, fs.constants.F_OK)
          .then(() => true)
          .catch(() => false)
      ) {
        return response.status(409).json({ error: "File already exists" });
      }

      await fs.promises.writeFile(resolved, content || "");
      response.status(200).json({ success: true, path: resolved });
    } catch (e) {
      const errorId = crypto.randomUUID();
      consoleLogger.error(`[endpoint error ${errorId}]`, e);
      response.status(500).json({ error: "Internal server error", errorId });
    }
  });

  // Delete a file or directory inside the global store.
  app.delete("/utils/global/delete-item", adminGate, async (req, response) => {
    try {
      const fs = require("fs");
      const itemPath = reqBody(req).path || req.query.path;

      if (!itemPath || typeof itemPath !== "string" || itemPath === "") {
        return response.status(400).json({ error: "Path is required" });
      }

      const resolved = safeGlobalJoin(itemPath);
      if (resolved === getStoragePath(GLOBAL_ROOT)) {
        return response
          .status(400)
          .json({ error: "Cannot delete global store root" });
      }
      if (
        !(await fs.promises
          .access(resolved, fs.constants.F_OK)
          .then(() => true)
          .catch(() => false))
      ) {
        return response.status(404).json({ error: "Item not found" });
      }

      await fs.promises.rm(resolved, { recursive: true });
      response.status(200).json({ success: true });
    } catch (e) {
      const errorId = crypto.randomUUID();
      consoleLogger.error(`[endpoint error ${errorId}]`, e);
      response.status(500).json({ error: "Internal server error", errorId });
    }
  });

  // Upload a file into the global store (multipart). `path` query param is the
  // RELATIVE destination directory inside the global root.
  app.post("/utils/global/upload-file", adminGate, async (req, response) => {
    try {
      const path = require("path");
      const multer = require("multer");

      const upload = multer({
        storage: multer.diskStorage({
          destination: (req, file, cb) => {
            try {
              // safeStorageJoin throws on traversal; surface as a multer error.
              const dir = safeGlobalJoin(req.query.path || "");
              ensureStorageDir(path.join(GLOBAL_ROOT, req.query.path || ""));
              cb(null, dir);
            } catch (err) {
              cb(err);
            }
          },
          filename: (req, file, cb) => {
            // Strip any directory components from the client-supplied name so a
            // crafted originalname (e.g. "../../evil") cannot escape the
            // destination dir once multer joins destination + filename.
            cb(null, path.basename(file.originalname));
          },
        }),
        limits: { fileSize: 500 * 1024 * 1024 },
      });

      upload.single("file")(req, response, (err) => {
        if (err) {
          return response.status(400).json({ error: err.message });
        }
        if (!req.file) {
          return response.status(400).json({ error: "No file provided" });
        }
        response.status(200).json({
          name: req.file.originalname,
          size: req.file.size,
          path: path.relative(getStoragePath(GLOBAL_ROOT), req.file.path),
        });
      });
    } catch (e) {
      const errorId = crypto.randomUUID();
      consoleLogger.error(`[endpoint error ${errorId}]`, e);
      response.status(500).json({ error: "Internal server error", errorId });
    }
  });

  // Download a file from the global store.
  app.get("/utils/global/download-file", adminGate, async (req, response) => {
    try {
      const path = require("path");
      const fs = require("fs");
      const relativePath = req.query.path || "";
      const filePath = safeGlobalJoin(relativePath);
      let fileStat;
      try {
        fileStat = await fs.promises.stat(filePath);
      } catch {
        return response.status(404).json({ error: "File not found" });
      }
      if (!fileStat.isFile()) {
        return response.status(404).json({ error: "File not found" });
      }
      const fileName = path.basename(filePath);
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      response.setHeader("Content-Type", "application/octet-stream");
      fs.createReadStream(filePath).pipe(response);
    } catch (e) {
      const errorId = crypto.randomUUID();
      consoleLogger.error(`[endpoint error ${errorId}]`, e);
      response.status(500).json({ error: "Internal server error", errorId });
    }
  });
}

module.exports = { globalFilesEndpoints, GLOBAL_ROOT, safeGlobalJoin };
