// SPDX-License-Identifier: MIT
// Purpose: Document and vector store management endpoints.
// Docs: server/endpoints/system.doc.md
const consoleLogger = require("../../utils/logger/console.js");

const { viewLocalFiles } = require("../../utils/files");
const {
  purgeDocument,
  purgeFolder,
} = require("../../utils/files/purgeDocument");
const { getVectorDbClass } = require("../../utils/helpers");
const { reqBody, queryParams } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { CollectorApi } = require("../../utils/collectorApi");

function documentEndpoints(app) {
  if (!app) return;

  app.get(
    "/system/system-vectors",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const query = queryParams(request);
        const VectorDb = getVectorDbClass();
        const vectorCount = !!query.slug
          ? await VectorDb.namespaceCount(query.slug)
          : await VectorDb.totalVectors();
        response.status(200).json({ vectorCount });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/system/remove-document",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { name } = reqBody(request);
        if (!name || typeof name !== "string" || !name.trim()) {
          response.status(400).json({
            error: "name is required and must be a non-empty string.",
          });
          return;
        }
        await purgeDocument(name);
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/system/remove-documents",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { names } = reqBody(request);
        if (!Array.isArray(names) || names.length === 0) {
          return response
            .status(400)
            .json({ error: "names must be a non-empty array of strings." });
        }
        const safeNames = names
          .filter(
            (n) => typeof n === "string" && n.length > 0 && n.length <= 500,
          )
          .slice(0, 100);
        await Promise.all(safeNames.map((name) => purgeDocument(name)));
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/system/remove-folder",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { name } = reqBody(request);
        if (!name || typeof name !== "string" || !name.trim()) {
          response.status(400).json({
            error: "name is required and must be a non-empty string.",
          });
          return;
        }
        await purgeFolder(name);
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/system/local-files",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (_, response) => {
      try {
        const localFiles = await viewLocalFiles();
        response.status(200).json({ localFiles });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/system/document-processing-status",
    [validatedRequest],
    async (_, response) => {
      try {
        const online = await new CollectorApi().online();
        response.sendStatus(online ? 200 : 503);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/system/accepted-document-types",
    [validatedRequest],
    async (_, response) => {
      try {
        const types = await new CollectorApi().acceptedFileTypes();
        if (!types) {
          response.sendStatus(404);
          return;
        }

        response.status(200).json({ types });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );
}

module.exports = { documentEndpoints };
