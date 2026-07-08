// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");
const { Transformation } = require("../models/transformation");
const { DocumentInsight } = require("../models/documentInsight");
const { Document } = require("../models/documents");
const { runTransformation } = require("../utils/transformations");
const { reqBody } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");

function transformationEndpoints(app) {
  if (!app) return;

  // List all transformations (seeds defaults on first call)
  app.get(
    "/transformations",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (_request, response) => {
      try {
        await Transformation.seedDefaults();
        const transformations = await Transformation.all();
        response.status(200).json({ transformations });
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  // Create a transformation (admin / manager only)
  app.post(
    "/transformations",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const data = reqBody(request);
        const transformation = await Transformation.create(data);
        response.status(200).json({ transformation });
      } catch (e) {
        consoleLogger.error(e);
        response.status(400).json({ error: e.message });
      }
    },
  );

  // Update a transformation
  app.put(
    "/transformations/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const transformation = await Transformation.update(
          request.params.id,
          reqBody(request),
        );
        response.status(200).json({ transformation });
      } catch (e) {
        consoleLogger.error(e);
        response.status(400).json({ error: e.message });
      }
    },
  );

  // Delete a transformation
  app.delete(
    "/transformations/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        await Transformation.delete(request.params.id);
        response.status(200).json({ success: true });
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  // Apply a transformation to a document in a workspace
  app.post(
    "/workspace/:slug/documents/apply-transformation",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { docPath = null, transformationId = null } = reqBody(request);

        if (!docPath || !transformationId)
          return response
            .status(400)
            .json({ error: "docPath and transformationId are required" });

        const document = await Document.get({
          workspaceId: Number(workspace.id),
          docpath: docPath,
        });
        if (!document)
          return response.status(404).json({ error: "Document not found" });

        const transformation = await Transformation.get({
          id: Number(transformationId),
        });
        if (!transformation)
          return response.status(404).json({ error: "Transformation not found" });

        const insight = await runTransformation({
          transformation,
          document,
          workspace,
        });
        response.status(200).json({ insight });
      } catch (e) {
        consoleLogger.error(e);
        response.status(500).json({ error: e.message });
      }
    },
  );

  // Retrieve insights for a specific document
  app.get(
    "/workspace/:slug/documents/:docId/insights",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const insights = await DocumentInsight.forDocument(request.params.docId);
        response.status(200).json({ insights });
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  // Delete a single insight
  app.delete(
    "/workspace/:slug/insights/:id",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        await DocumentInsight.delete(request.params.id);
        response.status(200).json({ success: true });
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );
}

module.exports = { transformationEndpoints };
