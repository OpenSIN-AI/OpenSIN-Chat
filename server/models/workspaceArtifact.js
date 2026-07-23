// SPDX-License-Identifier: MIT
const { v4: uuidv4 } = require("uuid");
const prisma = require("../utils/prisma");
const { safeParseJson, safeStringifyJson } = require("../utils/artifacts/json");
const { deleteArtifact } = require("../utils/artifacts/storage");
const {
  ALLOWED_TYPES,
  ALLOWED_STATUSES,
  MAX_ARTIFACT_SIZE_BYTES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} = require("../utils/artifacts/types");

class ArtifactValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ArtifactValidationError";
  }
}

function validateRequiredString(value, field, maxLength) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ArtifactValidationError(`${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ArtifactValidationError(
      `${field} exceeds maximum length of ${maxLength}`,
    );
  }
  return normalized;
}

function validateOptionalString(value, field, maxLength) {
  if (value === undefined || value === null) return value ?? null;
  if (typeof value !== "string") {
    throw new ArtifactValidationError(`${field} must be a string or null`);
  }
  if (value.length > maxLength) {
    throw new ArtifactValidationError(
      `${field} exceeds maximum length of ${maxLength}`,
    );
  }
  return value;
}

function validateOptionalId(value, field) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value <= 0) {
    throw new ArtifactValidationError(`${field} must be a positive integer`);
  }
  return value;
}

function validateContent(content) {
  if (content === undefined || content === null) return content ?? null;
  if (typeof content !== "string") {
    throw new ArtifactValidationError("content must be a string or null");
  }
  if (Buffer.byteLength(content, "utf-8") > MAX_ARTIFACT_SIZE_BYTES) {
    throw new ArtifactValidationError("content exceeds the artifact size limit");
  }
  return content;
}

function serializeOptionalJson(value, field) {
  if (value === undefined || value === null) return null;
  const serialized = safeStringifyJson(value);
  if (serialized === null) {
    throw new ArtifactValidationError(`${field} must be JSON serializable`);
  }
  if (Buffer.byteLength(serialized, "utf-8") > MAX_ARTIFACT_SIZE_BYTES) {
    throw new ArtifactValidationError(`${field} exceeds the artifact size limit`);
  }
  return serialized;
}

const SELECT_FIELDS = {
  id: true,
  uuid: true,
  workspaceId: true,
  threadId: true,
  chatId: true,
  userId: true,
  turnId: true,
  type: true,
  status: true,
  title: true,
  description: true,
  mimeType: true,
  storagePath: true,
  downloadName: true,
  content: true,
  metadata: true,
  sourceData: true,
  version: true,
  parentUuid: true,
  createdAt: true,
  updatedAt: true,
};

function formatArtifact(record) {
  if (!record) return null;
  return {
    ...record,
    metadata: safeParseJson(record.metadata),
    sourceData: safeParseJson(record.sourceData),
  };
}

async function createArtifact({
  workspaceId,
  threadId,
  chatId,
  userId,
  turnId,
  type,
  status = "ready",
  title,
  description,
  mimeType,
  storagePath,
  downloadName,
  content,
  metadata,
  sourceData,
  parentUuid,
}) {
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    throw new ArtifactValidationError("workspaceId must be a positive integer");
  }
  if (!ALLOWED_TYPES.includes(type)) {
    throw new ArtifactValidationError(`Unsupported artifact type: ${type}`);
  }
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new ArtifactValidationError(`Unsupported artifact status: ${status}`);
  }

  const record = await prisma.workspace_artifacts.create({
    data: {
      uuid: uuidv4(),
      workspaceId,
      threadId: validateOptionalId(threadId, "threadId"),
      chatId: validateOptionalId(chatId, "chatId"),
      userId: validateOptionalId(userId, "userId"),
      turnId: validateOptionalString(turnId, "turnId", 255),
      type,
      status,
      title: validateRequiredString(
        title || "Untitled artifact",
        "title",
        MAX_TITLE_LENGTH,
      ),
      description: validateOptionalString(
        description,
        "description",
        MAX_DESCRIPTION_LENGTH,
      ),
      mimeType: validateOptionalString(mimeType, "mimeType", 255),
      storagePath: validateOptionalString(storagePath, "storagePath", 4096),
      downloadName: validateOptionalString(downloadName, "downloadName", 255),
      content: validateContent(content),
      metadata: serializeOptionalJson(metadata, "metadata"),
      sourceData: serializeOptionalJson(sourceData, "sourceData"),
      version: 1,
      parentUuid: validateOptionalString(parentUuid, "parentUuid", 255),
    },
    select: SELECT_FIELDS,
  });
  return formatArtifact(record);
}

async function getArtifactByUuid(workspaceId, uuid) {
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) return null;
  if (typeof uuid !== "string" || uuid.trim().length === 0) return null;
  const record = await prisma.workspace_artifacts.findFirst({
    where: { uuid, workspaceId },
    select: SELECT_FIELDS,
  });
  return formatArtifact(record);
}

async function listArtifacts(
  workspaceId,
  { type, threadId, chatId, limit = 50, offset = 0 } = {},
) {
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    throw new ArtifactValidationError("workspaceId must be a positive integer");
  }
  if (type && !ALLOWED_TYPES.includes(type)) {
    throw new ArtifactValidationError(`Unsupported artifact type: ${type}`);
  }

  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 50;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const where = { workspaceId };
  if (type) where.type = type;
  if (threadId !== undefined)
    where.threadId = validateOptionalId(threadId, "threadId");
  if (chatId !== undefined)
    where.chatId = validateOptionalId(chatId, "chatId");

  const [items, total] = await Promise.all([
    prisma.workspace_artifacts.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: safeOffset,
      take: safeLimit,
      select: SELECT_FIELDS,
    }),
    prisma.workspace_artifacts.count({ where }),
  ]);

  return { items: items.map(formatArtifact), total };
}

async function updateArtifact(uuid, workspaceId, patch = {}) {
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    throw new ArtifactValidationError("workspaceId must be a positive integer");
  }
  if (typeof uuid !== "string" || uuid.trim().length === 0) {
    throw new ArtifactValidationError("uuid is required");
  }

  const data = {};
  if (patch.title !== undefined)
    data.title = validateRequiredString(
      patch.title,
      "title",
      MAX_TITLE_LENGTH,
    );
  if (patch.description !== undefined)
    data.description = validateOptionalString(
      patch.description,
      "description",
      MAX_DESCRIPTION_LENGTH,
    );
  if (patch.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(patch.status)) {
      throw new ArtifactValidationError(
        `Unsupported artifact status: ${patch.status}`,
      );
    }
    data.status = patch.status;
  }
  if (patch.content !== undefined) data.content = validateContent(patch.content);
  if (patch.metadata !== undefined)
    data.metadata = serializeOptionalJson(patch.metadata, "metadata");
  if (patch.downloadName !== undefined)
    data.downloadName = validateOptionalString(
      patch.downloadName,
      "downloadName",
      255,
    );

  if (Object.keys(data).length === 0)
    return getArtifactByUuid(workspaceId, uuid);

  const record = await prisma.workspace_artifacts.updateMany({
    where: { uuid, workspaceId },
    data,
  });

  if (record.count === 0) return null;
  return getArtifactByUuid(workspaceId, uuid);
}

async function deleteArtifactByUuid(workspaceId, uuid) {
  const artifact = await prisma.workspace_artifacts.findFirst({
    where: { uuid, workspaceId },
    select: { id: true, storagePath: true },
  });
  if (!artifact) return false;

  deleteArtifact(artifact.storagePath);
  await prisma.workspace_artifacts.delete({ where: { id: artifact.id } });
  return true;
}

async function incrementVersion(uuid, workspaceId, newContent) {
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    throw new ArtifactValidationError("workspaceId must be a positive integer");
  }
  if (typeof uuid !== "string" || uuid.trim().length === 0) {
    throw new ArtifactValidationError("uuid is required");
  }
  const validatedContent = validateContent(newContent);
  const current = await prisma.workspace_artifacts.findFirst({
    where: { uuid, workspaceId },
    select: { id: true, version: true, storagePath: true },
  });
  if (!current) return null;

  const record = await prisma.workspace_artifacts.update({
    where: { id: current.id },
    data: {
      content: validatedContent,
      version: current.version + 1,
    },
    select: SELECT_FIELDS,
  });
  return formatArtifact(record);
}

module.exports = {
  ArtifactValidationError,
  createArtifact,
  getArtifactByUuid,
  listArtifacts,
  updateArtifact,
  deleteArtifactByUuid,
  incrementVersion,
};
