// SPDX-License-Identifier: MIT
/**
 * Supabase Storage Adapter for OpenAfD-Chat
 *
 * Provides a unified interface for file uploads that routes to either:
 *   - Supabase Storage (when SUPABASE_STORAGE_ENABLED=true is set)
 *   - Local filesystem (fallback for non-Vercel / self-hosted without Supabase)
 *
 * Required env vars when Supabase Storage is enabled:
 *   SUPABASE_STORAGE_URL      e.g. http://localhost:8000/storage/v1
 *   SUPABASE_SERVICE_KEY      Supabase service_role JWT
 *   SUPABASE_STORAGE_ENABLED  "true"
 *
 * Optional bucket overrides (defaults shown):
 *   SUPABASE_STORAGE_BUCKET_DOCUMENTS  "documents"
 *   SUPABASE_STORAGE_BUCKET_REPORTS    "reports"
 *   SUPABASE_STORAGE_BUCKET_AVATARS    "avatars"
 *   SUPABASE_STORAGE_BUCKET_ASSETS     "assets"
 */

const path = require("path");
const fs = require("fs");

// Lazy-loaded to avoid crashing when Supabase is not configured.
let _storageClient = null;

/**
 * Returns true when Supabase Storage is configured and enabled.
 * @returns {boolean}
 */
function isEnabled() {
  return (
    process.env.SUPABASE_STORAGE_ENABLED === "true" &&
    !!process.env.SUPABASE_STORAGE_URL &&
    !!process.env.SUPABASE_SERVICE_KEY
  );
}

/**
 * Returns (and lazily initialises) the Supabase StorageClient.
 * @returns {import("@supabase/storage-js").StorageClient}
 */
function getClient() {
  if (_storageClient) return _storageClient;

  const { StorageClient } = require("@supabase/storage-js");
  _storageClient = new StorageClient(process.env.SUPABASE_STORAGE_URL, {
    apikey: process.env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  });

  return _storageClient;
}

/**
 * Bucket name helpers — read from env with safe defaults.
 */
const BUCKETS = {
  documents: () =>
    process.env.SUPABASE_STORAGE_BUCKET_DOCUMENTS ?? "documents",
  reports: () => process.env.SUPABASE_STORAGE_BUCKET_REPORTS ?? "reports",
  avatars: () => process.env.SUPABASE_STORAGE_BUCKET_AVATARS ?? "avatars",
  assets: () => process.env.SUPABASE_STORAGE_BUCKET_ASSETS ?? "assets",
};

/**
 * Ensures a bucket exists, creating it (public=false) if it does not.
 * Safe to call on every upload — it is a no-op when the bucket already exists.
 * @param {string} bucketName
 */
async function ensureBucket(bucketName) {
  const client = getClient();
  const { data: existing } = await client.listBuckets();
  const exists = (existing ?? []).some((b) => b.name === bucketName);
  if (!exists) {
    const { error } = await client.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 100 * 1024 * 1024, // 100 MB
    });
    if (error && error.message !== "Bucket already exists") {
      throw new Error(`Failed to create bucket "${bucketName}": ${error.message}`);
    }
  }
}

/**
 * Upload a file buffer to Supabase Storage.
 *
 * @param {Object} options
 * @param {"documents"|"reports"|"avatars"|"assets"} options.bucket  Logical bucket type.
 * @param {string}   options.objectPath  Path inside the bucket, e.g. "pfp/abc.jpg"
 * @param {Buffer}   options.buffer      File content.
 * @param {string}   options.contentType MIME type, e.g. "image/jpeg"
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadBuffer({ bucket, objectPath, buffer, contentType }) {
  const bucketName = BUCKETS[bucket]();
  await ensureBucket(bucketName);

  const client = getClient();
  const { error } = await client
    .from(bucketName)
    .upload(objectPath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = client.from(bucketName).getPublicUrl(objectPath);
  return { url: data?.publicUrl ?? null, path: objectPath };
}

/**
 * Upload a file from a local filesystem path to Supabase Storage, then
 * optionally delete the local copy.
 *
 * @param {Object}  options
 * @param {"documents"|"reports"|"avatars"|"assets"} options.bucket
 * @param {string}  options.objectPath   Destination path inside the bucket.
 * @param {string}  options.localPath    Absolute path to the source file.
 * @param {string}  options.contentType  MIME type.
 * @param {boolean} [options.deleteLocal=false]  Remove the local file after upload.
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadFile({
  bucket,
  objectPath,
  localPath,
  contentType,
  deleteLocal = false,
}) {
  const buffer = fs.readFileSync(localPath);
  const result = await uploadBuffer({ bucket, objectPath, buffer, contentType });

  if (deleteLocal) {
    try {
      fs.unlinkSync(localPath);
    } catch (_) {
      // Non-fatal: local file may have already been removed.
    }
  }

  return result;
}

/**
 * Download a file from Supabase Storage and return it as a Buffer.
 *
 * @param {"documents"|"reports"|"avatars"|"assets"} bucket
 * @param {string} objectPath
 * @returns {Promise<Buffer>}
 */
async function downloadBuffer(bucket, objectPath) {
  const bucketName = BUCKETS[bucket]();
  const client = getClient();

  const { data, error } = await client.from(bucketName).download(objectPath);
  if (error) throw new Error(`Supabase download failed: ${error.message}`);

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete a file from Supabase Storage.
 *
 * @param {"documents"|"reports"|"avatars"|"assets"} bucket
 * @param {string} objectPath
 * @returns {Promise<void>}
 */
async function deleteFile(bucket, objectPath) {
  const bucketName = BUCKETS[bucket]();
  const client = getClient();

  const { error } = await client.from(bucketName).remove([objectPath]);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}

/**
 * Get a signed download URL (time-limited, private bucket safe).
 *
 * @param {"documents"|"reports"|"avatars"|"assets"} bucket
 * @param {string} objectPath
 * @param {number} [expiresInSeconds=3600]
 * @returns {Promise<string>}  Signed URL.
 */
async function getSignedUrl(bucket, objectPath, expiresInSeconds = 3600) {
  const bucketName = BUCKETS[bucket]();
  const client = getClient();

  const { data, error } = await client
    .from(bucketName)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error) throw new Error(`Supabase signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * multer memoryStorage() compatible handler that, after multer stores the file
 * in memory, pushes it to Supabase Storage.
 *
 * Usage in an Express route:
 *
 *   const { supabaseUploadMiddleware } = require("../utils/storage/supabase");
 *   router.post("/upload", supabaseUploadMiddleware("documents"), handler);
 *
 * @param {"documents"|"reports"|"avatars"|"assets"} bucketType
 * @param {Function} [pathFn]  Optional fn(req, file) -> string for custom object paths.
 * @returns {import("express").RequestHandler}
 */
function supabaseUploadMiddleware(bucketType, pathFn) {
  return async function (req, res, next) {
    if (!req.file && !req.files) return next();

    const files = req.files
      ? Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat()
      : [req.file];

    try {
      for (const file of files) {
        if (!file.buffer) continue; // already on disk via diskStorage fallback

        const objectPath = pathFn
          ? pathFn(req, file)
          : `${Date.now()}-${file.originalname}`;

        const result = await uploadBuffer({
          bucket: bucketType,
          objectPath,
          buffer: file.buffer,
          contentType: file.mimetype,
        });

        // Attach result to file object so downstream handlers can use it.
        file.supabasePath = result.path;
        file.supabaseUrl = result.url;
      }
      next();
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

module.exports = {
  isEnabled,
  getClient,
  BUCKETS,
  ensureBucket,
  uploadBuffer,
  uploadFile,
  downloadBuffer,
  deleteFile,
  getSignedUrl,
  supabaseUploadMiddleware,
};
