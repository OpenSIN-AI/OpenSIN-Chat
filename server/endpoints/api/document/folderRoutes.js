// SPDX-License-Identifier: MIT
// Purpose: Folder management route handlers (create, remove, move files).
// Extracted from document/index.js as part of issue #510 God-File split.

const consoleLogger = require("../../../utils/logger/console.js");
const fs = require("fs");
const path = require("path");
const { validApiKey } = require("../../../utils/middleware/validApiKey");
const { simpleRateLimit } = require("../../../utils/middleware/simpleRateLimit");
const { normalizePath, isWithin } = require("../../../utils/files");
const { reqBody } = require("../../../utils/http");
const { Document } = require("../../../models/documents");
const { purgeFolder } = require("../../../utils/files/purgeDocument");
const { validateBody } = require("../../../utils/middleware/validateBody");
const { DocumentSchemas } = require("../../../utils/validation/schemas");
const { getStoragePath } = require("../../../utils/paths");
const documentsPath = getStoragePath("documents");

/**
 * Registers folder management routes on the Express app.
 * @param {import('express').Express} app
 */
function registerFolderRoutes(app) {
  app.post(
    "/v1/document/create-folder",
    [validApiKey, validateBody(DocumentSchemas.createFolder), simpleRateLimit({ bucket: "doc-upload", max: 10, windowMs: 60 * 1000 })],
    async (request, response) => {
      /*
      #swagger.tags = ['Documents']
      #swagger.description = 'Create a new folder inside the documents storage directory.'
      #swagger.requestBody = {
        description: 'Name of the folder to create.',
        required: true,
        content: {
          "application/json": {
            schema: {
              type: 'string',
              example: {
                "name": "new-folder"
              }
            }
          }
        }
      }
      #swagger.responses[200] = {
        content: {
          "application/json": {
            schema: {
              type: 'object',
              example: {
                success: true,
                message: null
              }
            }
          }
        }
      }
      #swagger.responses[403] = {
        schema: {
          "$ref": "#/definitions/InvalidAPIKey"
        }
      }
      */
      try {
        const { name } = reqBody(request);
        if (!name || typeof name !== "string" || !name.trim()) {
          response
            .status(400)
            .json({ success: false, message: "Folder name is required." });
          return;
        }
        const storagePath = path.join(documentsPath, normalizePath(name));
        if (!isWithin(path.resolve(documentsPath), path.resolve(storagePath)))
          throw new Error("Invalid path name");

        try {
          await fs.promises.access(storagePath);
          response.status(500).json({
            success: false,
            message: "Folder by that name already exists",
          });
          return;
        } catch {
          // folder doesn't exist — proceed
        }

        await fs.promises.mkdir(storagePath, { recursive: true });
        response.status(200).json({ success: true, message: null });
      } catch (e) {
        consoleLogger.error(e);
        response.status(500).json({
          success: false,
          message: `Failed to create folder: ${e.message}`,
        });
      }
    },
  );

  app.delete(
    "/v1/document/remove-folder",
    [validApiKey, validateBody(DocumentSchemas.deleteFolder), simpleRateLimit({ bucket: "doc-upload", max: 10, windowMs: 60 * 1000 })],
    async (request, response) => {
      /*
      #swagger.tags = ['Documents']
      #swagger.description = 'Remove a folder and all its contents from the documents storage directory.'
      #swagger.requestBody = {
        description: 'Name of the folder to remove.',
        required: true,
        content: {
          "application/json": {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  example: "my-folder"
                }
              }
            }
          }
        }
      }
      #swagger.responses[200] = {
        content: {
          "application/json": {
            schema: {
              type: 'object',
              example: {
                success: true,
                message: "Folder removed successfully"
              }
            }
          }
        }
      }
      #swagger.responses[403] = {
        schema: {
          "$ref": "#/definitions/InvalidAPIKey"
        }
      }
      */
      try {
        const { name } = reqBody(request);
        if (!name || typeof name !== "string" || !name.trim()) {
          response
            .status(400)
            .json({ success: false, message: "Folder name is required." });
          return;
        }
        await purgeFolder(name);
        response
          .status(200)
          .json({ success: true, message: "Folder removed successfully" });
      } catch (e) {
        consoleLogger.error(e);
        response.status(500).json({
          success: false,
          message: `Failed to remove folder: ${e.message}`,
        });
      }
    },
  );

  app.post(
    "/v1/document/move-files",
    [validApiKey, validateBody(DocumentSchemas.moveFiles), simpleRateLimit({ bucket: "doc-upload", max: 10, windowMs: 60 * 1000 })],
    async (request, response) => {
      /*
      #swagger.tags = ['Documents']
      #swagger.description = 'Move files within the documents storage directory.'
      #swagger.requestBody = {
        description: 'Array of objects containing source and destination paths of files to move.',
        required: true,
        content: {
          "application/json": {
            schema: {
              type: 'object',
              example: {
                "files": [
                  {
                    "from": "custom-documents/file.txt-fc4beeeb-e436-454d-8bb4-e5b8979cb48f.json",
                    "to": "folder/file.txt-fc4beeeb-e436-454d-8bb4-e5b8979cb48f.json"
                  }
                ]
              }
            }
          }
        }
      }
      #swagger.responses[200] = {
        content: {
          "application/json": {
            schema: {
              type: 'object',
              example: {
                success: true,
                message: null
              }
            }
          }
        }
      }
      #swagger.responses[403] = {
        schema: {
          "$ref": "#/definitions/InvalidAPIKey"
        }
      }
      */
      try {
        const { files } = reqBody(request);
        if (!Array.isArray(files) || files.length === 0) {
          return response
            .status(400)
            .json({ success: false, error: "Files array is required." });
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
          consoleLogger.error("Error moving files:", err);
          response
            .status(500)
            .json({ success: false, message: "Failed to move some files." });
        }
      } catch (e) {
        consoleLogger.error(e);
        response
          .status(500)
          .json({ success: false, message: "Failed to move files." });
      }
    },
  );
}

module.exports = { registerFolderRoutes };
