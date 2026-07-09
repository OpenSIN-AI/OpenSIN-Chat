// SPDX-License-Identifier: MIT
// Purpose: Profile picture (PFP) endpoints — fetch, upload, remove.
// Docs: server/endpoints/system.doc.md
const consoleLogger = require("../../utils/logger/console.js");

const fs = require("fs");
const path = require("path");
const { User } = require("../../models/user");
const { userFromSession } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { handlePfpUpload } = require("../../utils/files/multer");
const { fetchPfp, determinePfpFilepath } = require("../../utils/files/pfp");
const supabaseStorage = require("../../utils/storage/supabase");
const { getStoragePath } = require("../../utils/paths");
const { normalizePath, isWithin } = require("../../utils/files");

function pfpEndpoints(app) {
  if (!app) return;

  app.get(
    "/system/pfp/:id",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (request, response) {
      try {
        const { id } = request.params;
        if (response.locals?.user?.id !== Number(id))
          return response.sendStatus(204);

        const pfpPath = await determinePfpFilepath(id);
        if (!pfpPath) return response.sendStatus(204);

        const { found, buffer, size, mime } = fetchPfp(pfpPath);
        if (!found) return response.sendStatus(204);

        response.writeHead(200, {
          "Content-Type": mime || "image/png",
          "Content-Disposition": `attachment; filename=${path.basename(pfpPath)}`,
          "Content-Length": size,
        });
        response.end(Buffer.from(buffer, "base64"));
        return;
      } catch (error) {
        consoleLogger.error("Error processing the logo request:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/system/upload-pfp",
    [validatedRequest, flexUserRoleValid([ROLES.all]), handlePfpUpload],
    async function (request, response) {
      try {
        const user = await userFromSession(request, response);
        const uploadedFileName = request.randomFileName;
        if (!uploadedFileName) {
          return response.status(400).json({ message: "File upload failed." });
        }

        const userRecord = await User.get({ id: user.id });
        const oldPfpFilename = userRecord.pfpFilename;

        // Update the DB reference FIRST so we only delete the old file if the
        // new reference is successfully persisted. This prevents orphaning the
        // new file while the old one is already gone.
        const { success, error } = await User.update(user.id, {
          pfpFilename: uploadedFileName,
        });

        if (!success) {
          // DB update failed — clean up the newly uploaded file so it is not
          // orphaned on disk / Supabase.
          if (request.file?.supabasePath) {
            supabaseStorage
              .deleteFile("avatars", request.file.supabasePath)
              .catch((e) => console.warn("[pfp] non-fatal error:", e?.message || e));
          } else {
            const storagePath = getStoragePath("assets", "pfp");
            const newPfpPath = path.join(
              storagePath,
              normalizePath(uploadedFileName),
            );
            if (isWithin(path.resolve(storagePath), path.resolve(newPfpPath)))
              await fs.promises.unlink(newPfpPath).catch((e) => console.warn("[pfp] non-fatal error:", e?.message || e));
          }
          return response.status(500).json({
            message: error || "Failed to update with new profile picture.",
          });
        }

        // DB update succeeded — now safe to delete the old PFP.
        if (oldPfpFilename) {
          const storagePath = getStoragePath("assets", "pfp");
          const oldPfpPath = path.join(
            storagePath,
            normalizePath(oldPfpFilename),
          );
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          await fs.promises.unlink(oldPfpPath).catch(() => {
            /* file already gone, safe to ignore */
          });
          // Also clean up old PFP from Supabase if it was stored there.
          supabaseStorage
            .deleteFile("avatars", `pfp/${oldPfpFilename}`)
            .catch((e) => console.warn("[pfp] non-fatal error:", e?.message || e));
        }

        return response.status(200).json({
          message: "Profile picture uploaded successfully.",
        });
      } catch (error) {
        consoleLogger.error(
          "Error processing the profile picture upload:",
          error,
        );
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.delete(
    "/system/remove-pfp",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (request, response) {
      try {
        const user = await userFromSession(request, response);
        const userRecord = await User.get({ id: user.id });
        const oldPfpFilename = userRecord.pfpFilename;

        if (oldPfpFilename) {
          const storagePath = getStoragePath("assets", "pfp");
          const oldPfpPath = path.join(
            storagePath,
            normalizePath(oldPfpFilename),
          );
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          await fs.promises.unlink(oldPfpPath).catch(() => {
            /* file already gone, safe to ignore */
          });
        }

        const { success, error } = await User.update(user.id, {
          pfpFilename: null,
        });

        return response.status(success ? 200 : 500).json({
          message: success
            ? "Profile picture removed successfully."
            : error || "Failed to remove profile picture.",
        });
      } catch (error) {
        consoleLogger.error(
          "Error processing the profile picture removal:",
          error,
        );
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );
}

module.exports = { pfpEndpoints };
