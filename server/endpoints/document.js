// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const { Document } = require("../models/documents");
const { normalizePath, documentsPath, isWithin } = require("../utils/files");
const { reqBody } = require("../utils/http");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");
const fs = require("fs");
const path = require("path");

function documentEndpoints(app) {
  if (!app) return;
  app.post(
    "/document/create-folder",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      simpleRateLimit({
        bucket: "document-create-folder",
        max: 30,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const { name } = reqBody(request);
        const storagePath = path.join(documentsPath, normalizePath(name));
        if (!isWithin(path.resolve(documentsPath), path.resolve(storagePath)))
          throw new Error("Invalid folder name.");

        if (fs.existsSync(storagePath)) {
          response.status(500).json({
            success: false,
            message: "Folder by that name already exists",
          });
          return;
        }

        fs.mkdirSync(storagePath, { recursive: true });
        response.status(200).json({ success: true, message: null });
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.error(e);
        response.status(500).json({
          success: false,
          message: `Failed to create folder: ${e?.message || String(e)} `,
        });
      }
    },
  );

  app.post(
    "/document/move-files",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      simpleRateLimit({
        bucket: "document-move-files",
        max: 30,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const { files } = reqBody(request);
        if (!Array.isArray(files) || files.length === 0) {
          response.status(200).json({ success: true, message: null });
          return;
        }
        const docpaths = files.map(({ from }) => from);
        const documents = await Document.where({ docpath: { in: docpaths } });

        const embeddedFiles = documents.map((doc) => doc.docpath);
        const moveableFiles = files.filter(
          ({ from }) => !embeddedFiles.includes(from),
        );

        const movePromises = moveableFiles.map(({ from, to }) => {
          const sourcePath = path.join(documentsPath, normalizePath(from));
          const destinationPath = path.join(documentsPath, normalizePath(to));

          return new Promise((resolve, reject) => {
            if (
              !isWithin(documentsPath, sourcePath) ||
              !isWithin(documentsPath, destinationPath)
            )
              return reject("Invalid file location");

            fs.rename(sourcePath, destinationPath, (err) => {
              if (err) {
                // eslint-disable-next-line no-console
                consoleLogger.error(`Error moving file ${from} to ${to}:`, err);
                reject(err);
              } else {
                resolve();
              }
            });
          });
        });

        try {
          await Promise.all(movePromises);
          const unmovableCount = files.length - moveableFiles.length;
          if (unmovableCount > 0) {
            response.status(200).json({
              success: true,
              message: `${unmovableCount}/${files.length} files not moved. Unembed them from all workspaces.`,
            });
          } else {
            response.status(200).json({
              success: true,
              message: null,
            });
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          consoleLogger.error("Error moving files:", err);
          response
            .status(500)
            .json({ success: false, message: "Failed to move some files." });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.error(e);
        response
          .status(500)
          .json({ success: false, message: "Failed to move files." });
      }
    },
  );
}

module.exports = { documentEndpoints };
