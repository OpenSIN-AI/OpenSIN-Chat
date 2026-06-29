const consoleLogger = require("../../utils/logger/console.js");
const {
  reqBody,
  multiUserMode,
  userFromSession,
} = require("../../utils/http");
const { Workspace } = require("../../models/workspace");
const { Telemetry } = require("../../models/telemetry");
const { EventLogs } = require("../../models/eventLogs");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { getVectorDbClass } = require("../../utils/helpers");
const prisma = require("../../utils/prisma");
const { getModelTag } = require("../utils");
const {
  workspaceDeletionProtection,
} = require("../../utils/middleware/workspaceDeletionProtection");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");

function workspaceCrudEndpoints(app) {
  if (!app) return;

  app.post(
    "/workspace/new",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      simpleRateLimit({
        bucket: "workspace-new",
        max: 5,
        windowMs: 60 * 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name = null } = reqBody(request);
        const { workspace, message } = await Workspace.new(name, user?.id);
        await Telemetry.sendTelemetry(
          "workspace_created",
          {
            multiUserMode: multiUserMode(response),
            LLMSelection: process.env.LLM_PROVIDER || "openai",
            Embedder: process.env.EMBEDDING_ENGINE || "inherit",
            VectorDbSelection: process.env.VECTOR_DB || "lancedb",
            TTSSelection: process.env.TTS_PROVIDER || "native",
            LLMModel: getModelTag(),
          },
          user?.id,
        );

        await EventLogs.logEvent(
          "workspace_created",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          user?.id,
        );
        response.status(200).json({ workspace, message });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/update",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      simpleRateLimit({
        bucket: "workspace-update",
        max: 30,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const data = reqBody(request);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400);
          return;
        }

        await Workspace.trackChange(currWorkspace, data, user);
        const { workspace, message } = await Workspace.update(
          currWorkspace.id,
          data,
        );
        response.status(200).json({ workspace, message });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      workspaceDeletionProtection,
    ],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const VectorDb = getVectorDbClass();
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400);
          return;
        }

        const workspaceId = Number(workspace.id);
        await prisma.$transaction(async (tx) => {
          const docs = await tx.workspace_documents.findMany({
            where: { workspaceId },
            select: { docId: true },
            take: 100,
          });
          const docIds = docs.map((d) => d.docId);
          if (docIds.length > 0) {
            await tx.document_vectors.deleteMany({
              where: { docId: { in: docIds } },
            });
          }
          await tx.workspaces.delete({ where: { id: workspaceId } });
        });

        await EventLogs.logEvent(
          "workspace_deleted",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          response.locals?.user?.id,
        );

        try {
          await VectorDb["delete-namespace"]({ namespace: slug });
        } catch (e) {
          consoleLogger.error(e.message);
        }
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug/reset-vector-db",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const VectorDb = getVectorDbClass();
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400);
          return;
        }

        await prisma.$transaction(async (tx) => {
          const docs = await tx.workspace_documents.findMany({
            where: { workspaceId: Number(workspace.id) },
            select: { docId: true },
            take: 100,
          });
          const docIds = docs.map((d) => d.docId);
          if (docIds.length > 0) {
            await tx.document_vectors.deleteMany({
              where: { docId: { in: docIds } },
            });
          }
          await tx.workspace_documents.deleteMany({
            where: { workspaceId: Number(workspace.id) },
          });
        });

        await EventLogs.logEvent(
          "workspace_vectors_reset",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          response.locals?.user?.id,
        );

        try {
          await VectorDb["delete-namespace"]({ namespace: slug });
        } catch (e) {
          consoleLogger.error(e.message);
        }
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspaces",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspaces = multiUserMode(response)
          ? await Workspace.whereWithUser(user)
          : await Workspace.where();

        response.status(200).json({ workspaces });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspace/:slug",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        response.status(200).json({ workspace });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );
}

module.exports = { workspaceCrudEndpoints };
