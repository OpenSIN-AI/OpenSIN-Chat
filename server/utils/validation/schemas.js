// SPDX-License-Identifier: MIT
/**
 * Centralised Zod validation schemas for API request bodies.
 *
 * Each export groups schemas by resource (workspaces, documents, admin,
 * system, threads, invites, embeds).  Schemas are designed to be **permissive
 * on optional fields** (sensible defaults, `null` allowed) but **strict on
 * required fields** (type + non-empty checks) so that existing clients are
 * not broken while malformed / malicious payloads are rejected early.
 *
 * Pair with `validateBody()` middleware:
 *   const { validateBody } = require("../middleware/validateBody");
 *   app.post("/v1/workspace/new",
 *     [validApiKey, validateBody(WorkspaceSchemas.create)],
 *     handler);
 */
const { z } = require("zod");

// ── shared primitives ────────────────────────────────────────────────
const nonEmptyString = z.string().min(1, "must be a non-empty string");
const optionalString = z.string().optional().default(undefined);
const positiveInt = z.number().int().positive().optional().default(undefined);
const slugString = z
  .string()
  .min(1)
  .max(200)
  .regex(
    /^[a-z0-9-]+$/,
    "must contain only lowercase letters, numbers, and hyphens",
  )
  .optional();

// ── Workspace schemas ───────────────────────────────────────────────
const WorkspaceSchemas = {
  // POST /v1/workspace/new
  create: z.object({
    name: nonEmptyString.max(255, "must be at most 255 characters"),
    similarityThreshold: z.number().min(0).max(1).optional(),
    openAiTemp: z.number().min(0).max(2).optional(),
    openAiHistory: z.number().int().min(0).max(100).optional(),
    openAiPrompt: z.string().optional(),
    queryRefusalResponse: z.string().optional(),
    chatMode: z.string().optional(),
    topN: z.number().int().min(1).max(50).optional(),
  }),

  // POST /v1/workspace/:slug/update
  update: z.object({
    name: z.string().max(255).optional(),
    similarityThreshold: z.number().min(0).max(1).optional(),
    openAiTemp: z.number().min(0).max(2).optional(),
    openAiHistory: z.number().int().min(0).max(100).optional(),
    openAiPrompt: z.string().optional(),
    queryRefusalResponse: z.string().optional(),
    chatMode: z.string().optional(),
    topN: z.number().int().min(1).max(50).optional(),
  }),

  // POST /v1/workspace/:slug/update-documents
  updateDocuments: z.object({
    adds: z.array(z.string()).default([]),
    deletes: z.array(z.string()).default([]),
  }),

  // POST /v1/workspace/:slug/pin-document
  pinDocument: z.object({
    docPath: nonEmptyString,
    pinStatus: z.boolean().optional().default(false),
  }),

  // POST /v1/workspace/:slug/chat  (non-streaming)
  chat: z.object({
    message: nonEmptyString,
    mode: z.string().optional().default(null),
    sessionId: z.string().optional().default(null),
    attachments: z
      .array(
        z.object({
          name: z.string().optional(),
          mime: z.string().optional(),
          contentString: z.string().optional(),
          url: z.string().url().optional(),
        }),
      )
      .optional()
      .default([]),
    reset: z.boolean().optional().default(false),
  }),

  // POST /v1/workspace/:slug/stream-chat
  streamChat: z.object({
    message: nonEmptyString,
    mode: z.string().optional().default(null),
    sessionId: z.string().optional().default(null),
    attachments: z
      .array(
        z.object({
          name: z.string().optional(),
          mime: z.string().optional(),
          contentString: z.string().optional(),
          url: z.string().url().optional(),
        }),
      )
      .optional()
      .default([]),
    reset: z.boolean().optional().default(false),
  }),

  // POST /v1/workspace/:slug/vector-search
  vectorSearch: z.object({
    query: nonEmptyString,
    topN: z.number().int().min(1).max(50).optional(),
    scoreThreshold: z.number().min(0).max(1).optional(),
  }),
};

// ── Workspace Thread schemas ─────────────────────────────────────────
const WorkspaceThreadSchemas = {
  // POST /v1/workspace/:slug/thread/new
  create: z.object({
    userId: z.number().int().positive().nullable().optional().default(null),
    name: z.string().max(255).nullable().optional().default(null),
    slug: slugString.nullable().optional().default(null),
  }),

  // POST /v1/workspace/:slug/thread/:threadSlug/update
  update: z.object({
    name: nonEmptyString.max(255, "must be at most 255 characters"),
  }),

  // POST /v1/workspace/:slug/thread/:threadSlug/chat
  chat: z.object({
    message: nonEmptyString,
    mode: z.string().optional().default(null),
    userId: z.number().int().positive().optional(),
    attachments: z
      .array(
        z.object({
          name: z.string().optional(),
          mime: z.string().optional(),
          contentString: z.string().optional(),
          url: z.string().url().optional(),
        }),
      )
      .optional()
      .default([]),
    reset: z.boolean().optional().default(false),
  }),

  // POST /v1/workspace/:slug/thread/:threadSlug/stream-chat
  streamChat: z.object({
    message: nonEmptyString,
    mode: z.string().optional().default(null),
    userId: z.number().int().positive().optional(),
    attachments: z
      .array(
        z.object({
          name: z.string().optional(),
          mime: z.string().optional(),
          contentString: z.string().optional(),
          url: z.string().url().optional(),
        }),
      )
      .optional()
      .default([]),
    reset: z.boolean().optional().default(false),
  }),
};

// ── Admin schemas ────────────────────────────────────────────────────
const AdminSchemas = {
  // POST /v1/admin/users/new
  createUser: z.object({
    username: nonEmptyString.max(100),
    password: nonEmptyString.min(8, "password must be at least 8 characters"),
    role: z.enum(["admin", "manager", "default"]).optional().default("default"),
  }),

  // POST /v1/admin/users/:id
  updateUser: z
    .object({
      username: z.string().max(100).optional(),
      password: z
        .string()
        .min(8, "password must be at least 8 characters")
        .optional(),
      role: z.enum(["admin", "manager", "default"]).optional(),
      suspended: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "at least one field must be provided for update",
    }),

  // POST /v1/admin/invites
  createInvite: z.object({
    name: z.string().max(255).nullable().optional().default(null),
    userIds: z.array(z.number().int().positive()).optional(),
  }),

  // POST /v1/admin/workspaces/:id/update-users
  updateWorkspaceUsers: z.object({
    userIds: z.array(z.number().int().positive()),
  }),

  // POST /v1/admin/preferences
  updatePreferences: z.object({}).passthrough(),
};

// ── Document schemas ─────────────────────────────────────────────────
const DocumentSchemas = {
  // POST /v1/document/upload-link  (link-based ingestion)
  uploadLink: z.object({
    link: nonEmptyString.url("must be a valid URL"),
    addToWorkspaces: z.string().optional().default(""),
    scraperHeaders: z.record(z.string()).optional().default({}),
    metadata: z
      .union([z.string(), z.record(z.unknown())])
      .optional()
      .default({}),
  }),

  // POST /v1/document/upload-text
  uploadText: z.object({
    textContent: nonEmptyString,
    metadata: z
      .union([z.string(), z.record(z.unknown())])
      .optional()
      .default({}),
    addToWorkspaces: z.string().optional().default(""),
  }),

  // POST /v1/document/create-folder
  createFolder: z.object({
    name: nonEmptyString.max(255, "must be at most 255 characters"),
  }),

  // POST /v1/document/delete-folder
  deleteFolder: z.object({
    name: nonEmptyString.max(255, "must be at most 255 characters"),
  }),

  // POST /v1/document/move-files
  moveFiles: z.object({
    files: z
      .array(
        z.object({
          from: nonEmptyString,
          to: z.string().optional(),
        }),
      )
      .min(1, "files array must not be empty"),
  }),
};

// ── System schemas ───────────────────────────────────────────────────
const SystemSchemas = {
  // POST /v1/system/update-env  — env updates are dynamic key/value pairs
  updateEnv: z
    .record(z.string())
    .refine((data) => Object.keys(data).length > 0, {
      message: "at least one setting must be provided",
    }),

  // POST /v1/system/export-chats
  exportChats: z.object({
    names: z
      .array(nonEmptyString)
      .min(1, "names must be a non-empty array of strings"),
  }),
};

// ── Invite schemas ───────────────────────────────────────────────────
const InviteSchemas = {
  // POST /invite/:code
  acceptInvite: z.object({
    username: nonEmptyString.max(100, "must be at most 100 characters"),
    password: nonEmptyString.min(8, "password must be at least 8 characters"),
  }),
};

// ── Embed schemas ────────────────────────────────────────────────────
const EmbedSchemas = {
  // POST /v1/embed/new  (create embed)
  create: z.object({
    workspace_slug: nonEmptyString,
    chatMode: z.string().optional(),
    allowChatHistory: z.boolean().optional().default(true),
    hostname: z.string().optional(),
  }),

  // POST /v1/embed/:embedUuid  (update embed)
  update: z
    .object({
      chatMode: z.string().optional(),
      allowChatHistory: z.boolean().optional(),
      hostname: z.string().optional(),
      enabled: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "at least one field must be provided for update",
    }),
};

module.exports = {
  // primitives re-exported for ad-hoc schema composition
  nonEmptyString,
  optionalString,
  positiveInt,
  slugString,
  // grouped schemas
  WorkspaceSchemas,
  WorkspaceThreadSchemas,
  AdminSchemas,
  DocumentSchemas,
  SystemSchemas,
  InviteSchemas,
  EmbedSchemas,
};
