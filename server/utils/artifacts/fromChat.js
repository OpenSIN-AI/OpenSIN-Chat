const { storeBuffer, storeJson } = require("./storage");
const { createArtifact } = require("../../models/workspaceArtifact");
const { inferTypeFromMime, typeInfo } = require("./types");

async function createArtifactsFromOutputs({
  workspaceId,
  threadId,
  chatId,
  userId,
  turnId,
  outputs,
}) {
  if (!outputs || !Array.isArray(outputs) || outputs.length === 0) return [];

  const created = [];
  for (const output of outputs) {
    try {
      const artifact = await createSingleArtifact({
        workspaceId,
        threadId,
        chatId,
        userId,
        turnId,
        output,
      });
      if (artifact) created.push(artifact);
    } catch (err) {
      console.error(`Failed to create artifact from output: ${err.message}`);
    }
  }
  return created;
}

async function createSingleArtifact({
  workspaceId,
  threadId,
  chatId,
  userId,
  turnId,
  output,
}) {
  const {
    type,
    title,
    description,
    downloadName,
    mimeType,
    data,
    content,
    metadata,
  } = output;
  const resolvedType = type || inferTypeFromMime(mimeType) || "text";
  const info = typeInfo(resolvedType);

  let storagePath = null;
  let finalContent = content ?? null;

  if (data) {
    const buffer = Buffer.isBuffer(data)
      ? data
      : Buffer.from(String(data), "utf-8");
    const result = storeBuffer(workspaceId, resolvedType, buffer);
    storagePath = result.storagePath;
  } else if (resolvedType === "json" && content) {
    try {
      const parsed = JSON.parse(content);
      const result = storeJson(workspaceId, resolvedType, parsed);
      storagePath = result.storagePath;
    } catch {
      finalContent = content;
    }
  }

  if (!storagePath && !finalContent) return null;

  return createArtifact({
    workspaceId,
    threadId,
    chatId,
    userId,
    turnId,
    type: resolvedType,
    title: title || `Generated ${resolvedType}`,
    description: description ?? null,
    mimeType: info?.mime || "application/octet-stream",
    storagePath,
    downloadName: downloadName ?? null,
    content: finalContent,
    metadata: metadata ?? null,
    sourceData: null,
  });
}

module.exports = { createArtifactsFromOutputs };
