// SPDX-License-Identifier: MIT
// Purpose: Branding endpoints — logo management, footer data, support email, custom app name.
// Docs: server/endpoints/system.doc.md
const consoleLogger = require("../../utils/logger/console.js");

const fs = require("fs");
const path = require("path");
const { v4 } = require("uuid");
const { SystemSettings } = require("../../models/systemSettings");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { handleAssetUpload } = require("../../utils/files/multer");
const supabaseStorage = require("../../utils/storage/supabase");
const {
  getDefaultFilename,
  determineLogoFilepath,
  fetchLogo,
  validFilename,
  renameLogoFile,
  removeCustomLogo,
  LOGO_FILENAME,
  isDefaultFilename,
} = require("../../utils/files/logo");
const { getStoragePath } = require("../../utils/paths");
const { normalizePath, isWithin } = require("../../utils/files");

function brandingEndpoints(app) {
  if (!app) return;

  app.get("/system/logo", async function (request, response) {
    try {
      // Prefer the explicit darkMode boolean sent by the frontend (which has
      // already resolved system/light/dark/legacy themes). Fall back to the
      // legacy `theme` query param for backwards compatibility: anything other
      // than "light" is treated as dark mode.
      let darkMode;
      if (typeof request?.query?.darkMode !== "undefined") {
        darkMode = request.query.darkMode === "true";
      } else {
        const theme = request?.query?.theme;
        darkMode = !theme || theme !== "light";
      }
      const defaultFilename = getDefaultFilename(darkMode);
      const logoPath = await determineLogoFilepath(defaultFilename);
      const { found, buffer, size, mime } = fetchLogo(logoPath);

      if (!found) {
        response.sendStatus(204);
        return;
      }

      const currentLogoFilename = await SystemSettings.currentLogoFilename();
      response.writeHead(200, {
        "Access-Control-Expose-Headers":
          "Content-Disposition,X-Is-Custom-Logo,Content-Type,Content-Length",
        "Content-Type": mime || "image/png",
        "Content-Disposition": `attachment; filename=${path.basename(
          logoPath,
        )}`,
        "Content-Length": size,
        "X-Is-Custom-Logo":
          currentLogoFilename !== null &&
          currentLogoFilename !== defaultFilename &&
          !isDefaultFilename(currentLogoFilename),
      });
      response.end(Buffer.from(buffer, "base64"));
      return;
    } catch (error) {
      consoleLogger.error("Error processing the logo request:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/system/footer-data", [validatedRequest], async (_, response) => {
    try {
      const footerData =
        (await SystemSettings.get({ label: "footer_data" }))?.value ??
        JSON.stringify([]);
      response.status(200).json({ footerData: footerData });
    } catch (error) {
      consoleLogger.error("Error fetching footer data:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/system/support-email", async (_, response) => {
    try {
      const supportEmail =
        (
          await SystemSettings.get({
            label: "support_email",
          })
        )?.value ?? null;
      response.status(200).json({ supportEmail: supportEmail });
    } catch (error) {
      consoleLogger.error("Error fetching support email:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });

  // No middleware protection in order to get this on the login page
  app.get("/system/custom-app-name", async (_, response) => {
    try {
      const customAppName =
        (
          await SystemSettings.get({
            label: "custom_app_name",
          })
        )?.value ?? null;
      response.status(200).json({ customAppName: customAppName });
    } catch (error) {
      consoleLogger.error("Error fetching custom app name:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(
    "/system/upload-logo",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handleAssetUpload,
    ],
    async (request, response) => {
      if (!request?.file || !request?.file.originalname) {
        return response.status(400).json({ message: "No logo file provided." });
      }

      if (!validFilename(request.file.originalname)) {
        return response.status(400).json({
          message: "Invalid file name. Please choose a different file.",
        });
      }

      try {
        let newFilename;
        const isSupabase =
          supabaseStorage.isEnabled() && !!request.file?.supabasePath;

        if (isSupabase) {
          // Supabase: the file was uploaded under the original name. Generate
          // a UUID filename, re-upload the buffer to the new path, then remove
          // the original-name object to avoid orphaning.
          const ext = path.extname(request.file.originalname) || ".png";
          newFilename = `${v4()}${ext}`;
          await supabaseStorage.uploadBuffer({
            bucket: "assets",
            objectPath: newFilename,
            buffer: request.file.buffer,
            contentType: request.file.mimetype,
          });
          await supabaseStorage
            .deleteFile("assets", request.file.supabasePath)
            .catch((e) => console.warn("[branding] non-fatal error:", e?.message || e));
        } else {
          newFilename = await renameLogoFile(request.file.originalname);
        }

        // Update DB FIRST, then delete old logo — prevents orphaning the new
        // file while the old one is already gone.
        const existingLogoFilename = await SystemSettings.currentLogoFilename();
        const { success, error } = await SystemSettings._updateSettings({
          logo_filename: newFilename,
        });

        if (!success) {
          // DB update failed — clean up the newly uploaded file.
          if (isSupabase) {
            await supabaseStorage
              .deleteFile("assets", newFilename)
              .catch((e) => console.warn("[branding] non-fatal error:", e?.message || e));
          } else {
            const assetsDir = getStoragePath("assets");
            const newLogoPath = path.join(
              assetsDir,
              normalizePath(newFilename),
            );
            if (isWithin(path.resolve(assetsDir), path.resolve(newLogoPath)))
              await fs.promises.unlink(newLogoPath).catch((e) => console.warn("[branding] non-fatal error:", e?.message || e));
          }
          return response.status(500).json({
            message: error || "Failed to update with new logo.",
          });
        }

        // DB update succeeded — now safe to delete the old custom logo.
        await removeCustomLogo(existingLogoFilename);
        if (
          isSupabase &&
          existingLogoFilename &&
          validFilename(existingLogoFilename)
        ) {
          await supabaseStorage
            .deleteFile("assets", existingLogoFilename)
            .catch((e) => console.warn("[branding] non-fatal error:", e?.message || e));
        }

        return response.status(200).json({
          message: "Logo uploaded successfully.",
        });
      } catch (error) {
        consoleLogger.error("Error processing the logo upload:", error);
        response.status(500).json({ message: "Error uploading the logo." });
      }
    },
  );

  app.get(
    "/system/is-default-logo",
    [validatedRequest],
    async (_, response) => {
      try {
        const currentLogoFilename = await SystemSettings.currentLogoFilename();
        const isDefaultLogo =
          !currentLogoFilename || isDefaultFilename(currentLogoFilename);
        response.status(200).json({ isDefaultLogo });
      } catch (error) {
        consoleLogger.error("Error processing the logo request:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get(
    "/system/remove-logo",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (_request, response) => {
      try {
        const currentLogoFilename = await SystemSettings.currentLogoFilename();
        await removeCustomLogo(currentLogoFilename);
        const { success, error } = await SystemSettings._updateSettings({
          logo_filename: LOGO_FILENAME,
        });

        return response.status(success ? 200 : 500).json({
          message: success
            ? "Logo removed successfully."
            : error || "Failed to update with new logo.",
        });
      } catch (error) {
        consoleLogger.error("Error processing the logo removal:", error);
        response.status(500).json({ message: "Error removing the logo." });
      }
    },
  );
}

module.exports = { brandingEndpoints };
