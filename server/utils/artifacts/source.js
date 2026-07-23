// SPDX-License-Identifier: MIT
const fs = require("fs");
const path = require("path");
const { Document } = require("../../models/documents");
const {
  documentsPath,
  isWithin,
  normalizePath,
} = require("../files");

const ARTIFACT_DOCUMENT_FOLDER = "artifacts";

function textFromArtifact(artifact, readArtifact) {
  if (!artifact) return null;
  if (typeof artifact.content === "string") return artifact.content;

  const mimeType = String(artifact.mimeType || "").toLowerCase();
  const isTextType = ["text", "code", "json"].includes(artifact.type);
  const isTextMime =
    mimeType.startsWith("text/") || mimeType === "application/json";
  if (!artifact.storagePath || (!isTextType && !isTextMime)) return null;

  const buffer = readArtifact(artifact.storagePath);
  return buffer ? buffer.toString("utf-8") : null;
}

function documentPayloadForArtifact(artifact, content) {
  const normalizedContent = String(content || "");
  const words = normalizedContent.trim()
    ? normalizedContent.trim().split(/\s+/).length
    : 0;
  const createdAt = artifact.createdAt
    ? new Date(artifact.createdAt).toISOString()
    : new Date().toISOString();

  return {
    url: `artifact://${artifact.uuid}`,
    title: artifact.title || "Generated artifact",
    docAuthor: "OpenSIN",
    description: artifact.description || "Generated OpenSIN artifact",
    docSource: "artifact",
    chunkSource: `artifact://${artifact.uuid}`,
    published: createdAt,
    wordCount: words,
    token_count_estimate: Math.max(1, Math.ceil(normalizedContent.length / 4)),
    pageContent: normalizedContent,
  };
}

async function addArtifactAsWorkspaceSource({
  artifact,
  workspace,
  userId = null,
  readArtifact,
}) {
  if (!artifact || !workspace) throw new Error("Artifact and workspace are required");
  if (typeof readArtifact !== "function")
    throw new Error("Artifact reader is required");

  const content = textFromArtifact(artifact, readArtifact);
  if (content === null || content.trim().length === 0) {
    return {
      success: false,
      code: 400,
      error: "Artifact has no text content to add as source",
    };
  }

  const relativePath = normalizePath(
    path.join(ARTIFACT_DOCUMENT_FOLDER, `${artifact.uuid}.json`),
  );
  const artifactFolder = path.resolve(documentsPath, ARTIFACT_DOCUMENT_FOLDER);
  await fs.promises.mkdir(artifactFolder, { recursive: true });
  if (!isWithin(documentsPath, artifactFolder)) {
    throw new Error("Invalid artifact document folder");
  }

  const destination = path.resolve(documentsPath, relativePath);
  if (!isWithin(documentsPath, destination)) {
    throw new Error("Invalid artifact document path");
  }

  const existing = await Document.get({
    workspaceId: workspace.id,
    docpath: relativePath,
  });
  if (existing) {
    return { success: true, code: 200, document: existing, alreadyAdded: true };
  }

  const payload = documentPayloadForArtifact(artifact, content);
  const tempPath = `${destination}.${process.pid}.${Date.now()}.tmp`;
  let sourceWritten = false;
  try {
    await fs.promises.writeFile(tempPath, JSON.stringify(payload), "utf-8");
    await fs.promises.rename(tempPath, destination);
    sourceWritten = true;

    const result = await Document.addDocuments(
      workspace,
      [relativePath],
      userId,
    );
    if (result.failedToEmbed?.length > 0) {
      await fs.promises.rm(destination, { force: true });
      sourceWritten = false;
      return {
        success: false,
        code: 422,
        error: result.errors?.[0] || "Artifact could not be embedded",
      };
    }

    const document = await Document.get({
      workspaceId: workspace.id,
      docpath: relativePath,
    });
    if (!document) {
      throw new Error("Artifact was embedded but no document record was created");
    }

    return { success: true, code: 200, document, alreadyAdded: false };
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    if (sourceWritten) {
      const persisted = await Document.get({
        workspaceId: workspace.id,
        docpath: relativePath,
      }).catch(() => null);
      if (!persisted) {
        await fs.promises.rm(destination, { force: true }).catch(() => {});
      }
    }
    throw error;
  }
}

module.exports = {
  ARTIFACT_DOCUMENT_FOLDER,
  textFromArtifact,
  documentPayloadForArtifact,
  addArtifactAsWorkspaceSource,
};
