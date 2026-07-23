// SPDX-License-Identifier: MIT
const { storeBuffer, storeJson } = require("./storage");
const { createArtifact } = require("../../models/workspaceArtifact");
const {
  inferTypeFromMime,
  normalizeMimeType,
  typeInfo,
} = require("./types");

function decodeArtifactData(data, declaredMimeType = null) {
  const normalizedDeclaredMime = normalizeMimeType(declaredMimeType);
  if (Buffer.isBuffer(data)) {
    return { buffer: data, mimeType: normalizedDeclaredMime };
  }
  if (data instanceof Uint8Array) {
    return { buffer: Buffer.from(data), mimeType: normalizedDeclaredMime };
  }
  if (typeof data !== "string") {
    throw new Error("Artifact data must be a Buffer, Uint8Array, or string");
  }

  const dataUrl = data.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/i);
  if (!dataUrl) {
    return {
      buffer: Buffer.from(data, "utf-8"),
      mimeType: normalizedDeclaredMime,
    };
  }

  const [, embeddedMime, base64Marker, payload] = dataUrl;
  let buffer;
  if (base64Marker) {
    buffer = Buffer.from(payload.replace(/\s/g, ""), "base64");
  } else {
    try {
      buffer = Buffer.from(decodeURIComponent(payload), "utf-8");
    } catch {
      throw new Error("Artifact data URL contains invalid percent encoding");
    }
  }

  return {
    buffer,
    mimeType: normalizeMimeType(embeddedMime) || normalizedDeclaredMime,
  };
}

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
  let resolvedType = type || inferTypeFromMime(mimeType) || "text";
  let info = typeInfo(resolvedType);

  let storagePath = null;
  let finalContent = content ?? null;
  let resolvedMimeType = normalizeMimeType(mimeType) || info?.mime || null;

  if (data !== undefined && data !== null) {
    const decoded = decodeArtifactData(data, resolvedMimeType);
    resolvedMimeType = decoded.mimeType || resolvedMimeType;
    if (!type && resolvedMimeType) {
      resolvedType = inferTypeFromMime(resolvedMimeType) || resolvedType;
      info = typeInfo(resolvedType);
    }
    const result = storeBuffer(
      workspaceId,
      resolvedType,
      decoded.buffer,
      resolvedMimeType,
    );
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
    mimeType:
      resolvedMimeType || info?.mime || "application/octet-stream",
    storagePath,
    downloadName: downloadName ?? null,
    content: finalContent,
    metadata: metadata ?? null,
    sourceData: null,
  });
}

module.exports = { createArtifactsFromOutputs, decodeArtifactData };
