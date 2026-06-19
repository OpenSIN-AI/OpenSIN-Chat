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

const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".dll", ".so"];
const executableFileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(new Error("File type not allowed"));
  }
  cb(null, true);
};

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
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: executableFileFilter,
  }).single("file");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(500)
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
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
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: executableFileFilter,
  }).single("file");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(500)
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
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
    limits: { fileSize: 100 * 1024 * 1024 },
  }).single("logo");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(500)
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
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
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single("file");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(500)
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
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
      return response.status(500).json({
        success: false,
        error: `Invalid audio upload. ${err.message}`,
      });
    }
    next();
  });
}

module.exports = {
  handleFileUpload,
  handleAPIFileUpload,
  handleAssetUpload,
  handlePfpUpload,
  handleAudioUpload,
};
