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
const MAX_ARTIFACT_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_TITLE_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 1024;

function typeInfo(type) {
  return ArtifactTypes[type] || null;
}

function inferTypeFromMime(mimeType) {
  if (!mimeType) return null;
  for (const [type, info] of Object.entries(ArtifactTypes)) {
    if (info.accepts.includes(mimeType.toLowerCase())) return type;
  }
  return null;
}

function extForType(type) {
  return ArtifactTypes[type]?.ext || "bin";
}

function mimeForType(type) {
  return ArtifactTypes[type]?.mime || "application/octet-stream";
}

module.exports = {
  ArtifactTypes,
  ALLOWED_TYPES,
  MAX_ARTIFACT_SIZE_BYTES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  typeInfo,
  inferTypeFromMime,
  extForType,
  mimeForType,
};
