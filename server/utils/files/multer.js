// SPDX-License-Identifier: MIT
const multer = require("multer");
const path = require("path");
const { getStoragePath, getCollectorPath } = require("../paths");
const fs = require("fs");
const { v4 } = require("uuid");
const { normalizePath, sanitizeFileName } = require(".");
const supabaseStorage = require("../storage/supabase");

/**
 * Handle File uploads for auto-uploading.
 * Mostly used for internal GUI/API uploads.
 *
 * When SUPABASE_STORAGE_ENABLED=true the file is stored in-memory by multer
 * and then pushed to Supabase Storage by the supabaseUploadMiddleware.
 * When Supabase Storage is disabled the file is written to the local hotdir.
 */

// ----- Disk storage definitions (filesystem fallback) ----------------------

const fileUploadStorage = multer.diskStorage({
  destination: function (_, __, cb) {
    const uploadOutput = getCollectorPath("hotdir");
    cb(null, uploadOutput);
  },
  filename: function (_, file, cb) {
    file.originalname = sanitizeFileName(
      normalizePath(Buffer.from(file.originalname, "latin1").toString("utf8")),
    );
    cb(null, `${v4()}_${file.originalname}`);
  },
});

/**
 * Handle API file upload as documents - this does not manipulate the filename
 * at all for encoding/charset reasons.
 */
const fileAPIUploadStorage = multer.diskStorage({
  destination: function (_, __, cb) {
    const uploadOutput = getCollectorPath("hotdir");
    cb(null, uploadOutput);
  },
  filename: function (_, file, cb) {
    file.originalname = sanitizeFileName(
      normalizePath(Buffer.from(file.originalname, "latin1").toString("utf8")),
    );
    cb(null, `${v4()}_${file.originalname}`);
  },
});

// Asset storage for logos
const assetUploadStorage = multer.diskStorage({
  destination: function (_, __, cb) {
    const uploadOutput = getStoragePath("assets");
    fs.mkdirSync(uploadOutput, { recursive: true });
    return cb(null, uploadOutput);
  },
  filename: function (_, file, cb) {
    file.originalname = sanitizeFileName(
      normalizePath(Buffer.from(file.originalname, "latin1").toString("utf8")),
    );
    cb(null, file.originalname);
  },
});

/**
 * Handle PFP file upload as logos
 */
const pfpUploadStorage = multer.diskStorage({
  destination: function (_, __, cb) {
    const uploadOutput = getStoragePath("assets", "pfp");
    fs.mkdirSync(uploadOutput, { recursive: true });
    return cb(null, uploadOutput);
  },
  filename: function (req, file, cb) {
    const randomFileName = `${v4()}${path.extname(
      normalizePath(file.originalname),
    )}`;
    req.randomFileName = randomFileName;
    cb(null, randomFileName);
  },
});

// ----- Multer handler factories --------------------------------------------

const BLOCKED_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".dll",
  ".so",
];
const executableFileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(new Error("File type not allowed"));
  }
  cb(null, true);
};

/**
 * File filter for image-only uploads (logos, PFP, etc.). Requires the
 * mimetype to start with `image/` and also blocks executable extensions
 * as defense-in-depth. SVG is allowed (serving endpoints use
 * Content-Disposition: attachment to prevent inline XSS).
 */
const imageFileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(new Error("File type not allowed"));
  }
  if (!file.mimetype?.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }
  cb(null, true);
};

/**
 * Maps a multer/upload error to the appropriate HTTP status code.
 * - LIMIT_FILE_SIZE → 413 (Payload Too Large)
 * - File type rejected by filter → 415 (Unsupported Media Type)
 * - Everything else → 500 (Internal Server Error)
 */
function uploadErrorStatus(err) {
  if (!err) return 500;
  if (err.code === "LIMIT_FILE_SIZE") return 413;
  if (err.message === "File type not allowed") return 415;
  if (err.message === "Only image files are allowed") return 415;
  if (err.message === "Only audio uploads are allowed.") return 415;
  return 500;
}

/**
 * Handle Generic file upload as documents from the GUI.
 * Routes to Supabase Storage when enabled, otherwise writes to local hotdir.
 * @param {Request} request
 * @param {Response} response
 * @param {NextFunction} next
 */
function handleFileUpload(request, response, next) {
  const storage = supabaseStorage.isEnabled()
    ? multer.memoryStorage()
    : fileUploadStorage;

  const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    fileFilter: executableFileFilter,
  }).single("file");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(uploadErrorStatus(err))
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
        .end();
      return;
    }

    if (request.file && request.file.size === 0) {
      try {
        if (request.file.path) fs.rmSync(request.file.path, { force: true });
      } catch {}
      response
        .status(400)
        .json({ success: false, error: "Empty file not allowed" })
        .end();
      return;
    }

    if (supabaseStorage.isEnabled() && request.file?.buffer) {
      const originalName = sanitizeFileName(
        normalizePath(
          Buffer.from(request.file.originalname, "latin1").toString("utf8"),
        ),
      );
      supabaseStorage
        .uploadBuffer({
          bucket: "documents",
          objectPath: originalName,
          buffer: request.file.buffer,
          contentType: request.file.mimetype,
        })
        .then(({ path: storagePath, url }) => {
          request.file.supabasePath = storagePath;
          request.file.supabaseUrl = url;
          request.file.supabaseBucket = "documents";
          next();
        })
        .catch((uploadErr) => {
          response
            .status(500)
            .json({ success: false, error: uploadErr.message })
            .end();
        });
    } else {
      next();
    }
  });
}

/**
 * Handle API file upload as documents - this does not manipulate the filename
 * at all for encoding/charset reasons.
 * Routes to Supabase Storage when enabled, otherwise writes to local hotdir.
 * @param {Request} request
 * @param {Response} response
 * @param {NextFunction} next
 */
function handleAPIFileUpload(request, response, next) {
  const storage = supabaseStorage.isEnabled()
    ? multer.memoryStorage()
    : fileAPIUploadStorage;

  const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    fileFilter: executableFileFilter,
  }).single("file");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(uploadErrorStatus(err))
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
        .end();
      return;
    }

    if (request.file && request.file.size === 0) {
      try {
        if (request.file.path) fs.rmSync(request.file.path, { force: true });
      } catch {}
      response
        .status(400)
        .json({ success: false, error: "Empty file not allowed" })
        .end();
      return;
    }

    if (supabaseStorage.isEnabled() && request.file?.buffer) {
      const originalName = sanitizeFileName(
        normalizePath(
          Buffer.from(request.file.originalname, "latin1").toString("utf8"),
        ),
      );
      supabaseStorage
        .uploadBuffer({
          bucket: "documents",
          objectPath: originalName,
          buffer: request.file.buffer,
          contentType: request.file.mimetype,
        })
        .then(({ path: storagePath, url }) => {
          request.file.supabasePath = storagePath;
          request.file.supabaseUrl = url;
          request.file.supabaseBucket = "documents";
          next();
        })
        .catch((uploadErr) => {
          response
            .status(500)
            .json({ success: false, error: uploadErr.message })
            .end();
        });
    } else {
      next();
    }
  });
}

/**
 * Handle logo asset uploads.
 * Routes to Supabase Storage (assets bucket) when enabled.
 */
function handleAssetUpload(request, response, next) {
  const storage = supabaseStorage.isEnabled()
    ? multer.memoryStorage()
    : assetUploadStorage;

  const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    fileFilter: imageFileFilter,
  }).single("logo");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(uploadErrorStatus(err))
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
        .end();
      return;
    }

    if (request.file && request.file.size === 0) {
      try {
        if (request.file.path) fs.rmSync(request.file.path, { force: true });
      } catch {}
      response
        .status(400)
        .json({ success: false, error: "Empty file not allowed" })
        .end();
      return;
    }

    if (supabaseStorage.isEnabled() && request.file?.buffer) {
      const originalName = sanitizeFileName(
        normalizePath(
          Buffer.from(request.file.originalname, "latin1").toString("utf8"),
        ),
      );
      supabaseStorage
        .uploadBuffer({
          bucket: "assets",
          objectPath: originalName,
          buffer: request.file.buffer,
          contentType: request.file.mimetype,
        })
        .then(({ path: storagePath, url }) => {
          request.file.supabasePath = storagePath;
          request.file.supabaseUrl = url;
          request.file.supabaseBucket = "assets";
          next();
        })
        .catch((uploadErr) => {
          response
            .status(500)
            .json({ success: false, error: uploadErr.message })
            .end();
        });
    } else {
      next();
    }
  });
}

/**
 * Handle PFP file upload as logos.
 * Routes to Supabase Storage (avatars bucket) when enabled.
 */
function handlePfpUpload(request, response, next) {
  const storage = supabaseStorage.isEnabled()
    ? multer.memoryStorage()
    : pfpUploadStorage;

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: imageFileFilter,
  }).single("file");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(uploadErrorStatus(err))
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
        .end();
      return;
    }

    if (request.file && request.file.size === 0) {
      try {
        if (request.file.path) fs.rmSync(request.file.path, { force: true });
      } catch {}
      response
        .status(400)
        .json({ success: false, error: "Empty file not allowed" })
        .end();
      return;
    }

    if (supabaseStorage.isEnabled() && request.file?.buffer) {
      const randomFileName = `${v4()}${path.extname(
        normalizePath(request.file.originalname),
      )}`;
      request.randomFileName = randomFileName;
      supabaseStorage
        .uploadBuffer({
          bucket: "avatars",
          objectPath: `pfp/${randomFileName}`,
          buffer: request.file.buffer,
          contentType: request.file.mimetype,
        })
        .then(({ path: storagePath, url }) => {
          request.file.supabasePath = storagePath;
          request.file.supabaseUrl = url;
          request.file.supabaseBucket = "avatars";
          next();
        })
        .catch((uploadErr) => {
          response
            .status(500)
            .json({ success: false, error: uploadErr.message })
            .end();
        });
    } else {
      next();
    }
  });
}

/**
 * Handle in-memory audio upload for STT transcription. Audio buffers are
 * passed straight to the STT provider so we never persist them to disk.
 */
function handleAudioUpload(request, response, next) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype?.startsWith("audio/"))
        return cb(new Error("Only audio uploads are allowed."));
      cb(null, true);
    },
  }).single("audio");
  upload(request, response, function (err) {
    if (err) {
      return response.status(uploadErrorStatus(err)).json({
        success: false,
        error: `Invalid audio upload. ${err.message}`,
      });
    }
    next();
  });
}

/**
 * Best-effort cleanup of an uploaded file from both local disk and Supabase
 * Storage. Called by endpoint handlers when document processing fails so the
 * uploaded file is not orphaned.
 *
 * @param {import("express").Request} request — Express request with a
 *   possible `request.file` object populated by multer / the Supabase
 *   upload middleware.
 */
function cleanupUploadedFile(request) {
  try {
    const filePath = request.file?.path;
    if (filePath && fs.existsSync(filePath)) fs.rmSync(filePath);
  } catch {
    // Best-effort local cleanup
  }
  try {
    if (request.file?.supabasePath) {
      const bucket = request.file.supabaseBucket || "documents";
      supabaseStorage
        .deleteFile(bucket, request.file.supabasePath)
        .catch(() => {});
    }
  } catch {
    // Best-effort Supabase cleanup
  }
}

module.exports = {
  handleFileUpload,
  handleAPIFileUpload,
  handleAssetUpload,
  handlePfpUpload,
  handleAudioUpload,
  cleanupUploadedFile,
};
