// SPDX-License-Identifier: MIT
const ArtifactTypes = Object.freeze({
  image: {
    mime: "image/png",
    ext: "png",
    accepts: ["image/png", "image/jpeg", "image/gif", "image/webp"],
  },
  audio: {
    mime: "audio/mpeg",
    ext: "mp3",
    accepts: ["audio/mpeg", "audio/wav", "audio/ogg"],
  },
  video: {
    mime: "video/mp4",
    ext: "mp4",
    accepts: ["video/mp4", "video/webm"],
  },
  text: {
    mime: "text/plain",
    ext: "txt",
    accepts: ["text/plain", "text/markdown", "text/csv", "text/html"],
  },
  json: {
    mime: "application/json",
    ext: "json",
    accepts: ["application/json"],
  },
  pdf: { mime: "application/pdf", ext: "pdf", accepts: ["application/pdf"] },
  code: {
    mime: "text/plain",
    ext: "txt",
    accepts: [
      "text/plain",
      "text/javascript",
      "text/python",
      "text/html",
      "text/css",
    ],
  },
});

const ALLOWED_TYPES = Object.keys(ArtifactTypes);
const ALLOWED_STATUSES = Object.freeze(["ready", "archived", "error"]);
const MAX_ARTIFACT_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_TITLE_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 1024;

function typeInfo(type) {
  return ArtifactTypes[type] || null;
}

function normalizeMimeType(mimeType) {
  if (typeof mimeType !== "string") return null;
  const normalized = mimeType.split(";", 1)[0].trim().toLowerCase();
  return normalized || null;
}

function inferTypeFromMime(mimeType) {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized) return null;
  for (const [type, info] of Object.entries(ArtifactTypes)) {
    if (info.accepts.includes(normalized)) return type;
  }
  return null;
}

function extForType(type) {
  return ArtifactTypes[type]?.ext || "bin";
}

function extForMime(mimeType) {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized) return null;

  return (
    {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "text/plain": "txt",
      "text/markdown": "md",
      "text/csv": "csv",
      "text/html": "html",
      "text/javascript": "js",
      "application/javascript": "js",
      "text/python": "py",
      "text/css": "css",
      "application/json": "json",
      "application/pdf": "pdf",
    }[normalized] || null
  );
}

function mimeForType(type) {
  return ArtifactTypes[type]?.mime || "application/octet-stream";
}

module.exports = {
  ArtifactTypes,
  ALLOWED_TYPES,
  ALLOWED_STATUSES,
  MAX_ARTIFACT_SIZE_BYTES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  typeInfo,
  normalizeMimeType,
  inferTypeFromMime,
  extForType,
  extForMime,
  mimeForType,
};
