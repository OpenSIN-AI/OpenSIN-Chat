// SPDX-License-Identifier: MIT
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  extForType,
  extForMime,
  MAX_ARTIFACT_SIZE_BYTES,
} = require("./types");
const { safeStringifyJson } = require("./json");

const ARTIFACT_STORAGE_DIR = path.join(
  process.env.STORAGE_DIR || path.join(__dirname, "../../storage"),
  "artifacts",
);

function ensureStorageDir() {
  if (!fs.existsSync(ARTIFACT_STORAGE_DIR)) {
    fs.mkdirSync(ARTIFACT_STORAGE_DIR, { recursive: true });
  }
  return ARTIFACT_STORAGE_DIR;
}

function buildStoragePath(workspaceId, type, uuid, mimeType = null) {
  const ext = extForMime(mimeType) || extForType(type);
  return path.join(ARTIFACT_STORAGE_DIR, String(workspaceId), `${uuid}.${ext}`);
}

function assertSafePath(targetPath) {
  if (typeof targetPath !== "string" || targetPath.length === 0) {
    throw new Error("Artifact storage path is required");
  }

  const storageRoot = path.resolve(ARTIFACT_STORAGE_DIR);
  const resolved = path.resolve(targetPath);
  const isWithinStorage =
    resolved === storageRoot || resolved.startsWith(`${storageRoot}${path.sep}`);

  if (!isWithinStorage) {
    throw new Error("Path traversal detected in artifact storage path");
  }
  return resolved;
}

function storeBuffer(workspaceId, type, buffer, mimeType = null) {
  if (!Buffer.isBuffer(buffer))
    throw new Error("storeBuffer requires a Buffer");
  if (buffer.byteLength > MAX_ARTIFACT_SIZE_BYTES) {
    throw new Error(
      `Artifact exceeds max size of ${MAX_ARTIFACT_SIZE_BYTES} bytes`,
    );
  }
  const uuid = uuidv4();
  const storagePath = buildStoragePath(workspaceId, type, uuid, mimeType);
  const dir = path.dirname(storagePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(storagePath, buffer);
  return { uuid, storagePath };
}

function storeJson(workspaceId, type, data) {
  const raw = safeStringifyJson(data);
  if (raw === null)
    throw new Error("Failed to serialize artifact data to JSON");
  const buffer = Buffer.from(raw, "utf-8");
  if (buffer.byteLength > MAX_ARTIFACT_SIZE_BYTES) {
    throw new Error(
      `Artifact exceeds max size of ${MAX_ARTIFACT_SIZE_BYTES} bytes`,
    );
  }
  const uuid = uuidv4();
  const storagePath = buildStoragePath(workspaceId, type, uuid);
  const dir = path.dirname(storagePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(storagePath, buffer);
  return { uuid, storagePath };
}

function readArtifact(storagePath) {
  const safe = assertSafePath(storagePath);
  if (!fs.existsSync(safe)) return null;
  return fs.readFileSync(safe);
}

function deleteArtifact(storagePath) {
  if (!storagePath) return;
  const safe = assertSafePath(storagePath);
  if (fs.existsSync(safe)) fs.unlinkSync(safe);
  const dir = path.dirname(safe);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

module.exports = {
  ARTIFACT_STORAGE_DIR,
  ensureStorageDir,
  storeBuffer,
  storeJson,
  readArtifact,
  deleteArtifact,
  assertSafePath,
};
