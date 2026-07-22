// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");
const { safeParseJson, safeStringifyJson } = require("../utils/artifacts/json");
const { deleteArtifact } = require("../utils/artifacts/storage");

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
  const record = await prisma.workspace_artifacts.create({
    data: {
      workspaceId,
      threadId: threadId ?? null,
      chatId: chatId ?? null,
      userId: userId ?? null,
      turnId: turnId ?? null,
      type,
      status,
      title: title || "Untitled artifact",
      description: description ?? null,
      mimeType: mimeType ?? null,
      storagePath: storagePath ?? null,
      downloadName: downloadName ?? null,
      content: content ?? null,
      metadata: safeStringifyJson(metadata),
      sourceData: safeStringifyJson(sourceData),
      version: 1,
      parentUuid: parentUuid ?? null,
    },
    select: SELECT_FIELDS,
  });
  return formatArtifact(record);
}

async function getArtifactByUuid(workspaceId, uuid) {
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
  const where = { workspaceId };
  if (type) where.type = type;
  if (threadId) where.threadId = threadId;
  if (chatId) where.chatId = chatId;

  const [items, total] = await Promise.all([
    prisma.workspace_artifacts.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: SELECT_FIELDS,
    }),
    prisma.workspace_artifacts.count({ where }),
  ]);

  return { items: items.map(formatArtifact), total };
}

async function updateArtifact(uuid, workspaceId, patch) {
  const data = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.content !== undefined) data.content = patch.content;
  if (patch.metadata !== undefined)
    data.metadata = safeStringifyJson(patch.metadata);
  if (patch.downloadName !== undefined) data.downloadName = patch.downloadName;

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
  const current = await prisma.workspace_artifacts.findFirst({
    where: { uuid, workspaceId },
    select: { id: true, version: true, storagePath: true },
  });
  if (!current) return null;

  const record = await prisma.workspace_artifacts.update({
    where: { id: current.id },
    data: {
      content: newContent,
      version: current.version + 1,
    },
    select: SELECT_FIELDS,
  });
  return formatArtifact(record);
}

module.exports = {
  createArtifact,
  getArtifactByUuid,
  listArtifacts,
  updateArtifact,
  deleteArtifactByUuid,
  incrementVersion,
};
