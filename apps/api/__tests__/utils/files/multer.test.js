// SPDX-License-Identifier: MIT
/* eslint-env jest */
/**
 * Tests for server/utils/files/multer.js
 * Covers:
 *  - Hotdir routing in production mode (via getCollectorPath / STORAGE_DIR)
 *  - Document uploads always stream to disk; Supabase mirror is decoupled
 *    (mirrorToSupabase, best-effort, never fails the request)
 *  - Filename handling (latin1 -> utf8 re-decode, sanitize pipeline)
 *  - PFP random filename generation (uuid + original extension)
 *  - Audio upload: in-memory only, audio/* mimetype filter
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");

// ---- Mocks ------------------------------------------------------------------

// files/index.js pulls in models (prisma). Mock the two pure helpers multer needs.
jest.mock("../../../utils/files/index.js", () => ({
  normalizePath: jest.fn((p) => p),
  sanitizeFileName: jest.fn((p) => p),
}));

jest.mock("../../../utils/storage/supabase.js", () => ({
  isEnabled: jest.fn(() => false),
  uploadBuffer: jest.fn(),
  uploadStream: jest.fn(),
}));

const supabaseStorage = require("../../../utils/storage/supabase.js");
const filesIndex = require("../../../utils/files/index.js");

// ---- Helpers ------------------------------------------------------------------

const BOUNDARY = "----jest-multer-test-boundary";

/**
 * Build a minimal multipart/form-data request stream multer/busboy can parse.
 */
function makeUploadRequest({
  fieldName = "file",
  filename = "test.txt",
  content = "hello world",
  contentType = "text/plain",
} = {}) {
  const body = Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`,
    ),
    Buffer.isBuffer(content) ? content : Buffer.from(content),
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);

  const req = new Readable({
    read() {
      this.push(body);
      this.push(null);
    },
  });
  req.headers = {
    "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
    "content-length": String(body.length),
  };
  req.method = "POST";
  return req;
}

function makeMultipartRequestWithoutFile() {
  const body = Buffer.from(
    `--${BOUNDARY}\r\n` +
      'Content-Disposition: form-data; name="metadata"\r\n\r\n' +
      '{}\r\n' +
      `--${BOUNDARY}--\r\n`,
  );
  const req = new Readable({
    read() {
      this.push(body);
      this.push(null);
    },
  });
  req.headers = {
    "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
    "content-length": String(body.length),
  };
  req.method = "POST";
  return req;
}

function makeResponse() {
  const res = { statusCode: null, body: null };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.body = payload;
    res.end();
    return res;
  });
  res.end = jest.fn(() => res);
  return res;
}

/** Run a multer handler and resolve when next() fires or the response ends. */
function runHandler(handler, req) {
  const res = makeResponse();
  return new Promise((resolve) => {
    const done = () => resolve({ req, res, nextCalled: true });
    res.end.mockImplementation(() => {
      resolve({ req, res, nextCalled: false });
      return res;
    });
    handler(req, res, done);
  });
}

// ---- Test environment ---------------------------------------------------------

const ORIGINAL_ENV = { ...process.env };
let tmpRoot, hotdir;
let multerHandlers;

beforeAll(() => {
  // Simulate the Docker layout inside a temp dir:
  //   <tmp>/server/storage  (STORAGE_DIR)
  //   <tmp>/collector/hotdir
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "multer-test-"));
  process.env.STORAGE_DIR = path.join(tmpRoot, "server", "storage");
  hotdir = path.join(tmpRoot, "collector", "hotdir");
  fs.mkdirSync(process.env.STORAGE_DIR, { recursive: true });
  fs.mkdirSync(hotdir, { recursive: true });
  delete process.env.NODE_ENV; // force the production (non-development) branch

  multerHandlers = require("../../../utils/files/multer.js");
});

afterAll(() => {
  process.env = { ...ORIGINAL_ENV };
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

beforeEach(() => {
  jest.clearAllMocks();
  supabaseStorage.isEnabled.mockReturnValue(false);
  filesIndex.normalizePath.mockImplementation((p) => p);
  filesIndex.sanitizeFileName.mockImplementation((p) => p);
  // clean hotdir between tests
  for (const f of fs.readdirSync(hotdir))
    fs.rmSync(path.join(hotdir, f), { force: true });
});

// ---- handleFileUpload ----------------------------------------------------------

describe("handleFileUpload (GUI document uploads)", () => {
  test("rejects multipart requests without a file", async () => {
    const { res, nextCalled } = await runHandler(
      multerHandlers.handleFileUpload,
      makeMultipartRequestWithoutFile(),
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/file upload is required/i);
  });

  test("writes the file into the collector hotdir when Supabase is disabled", async () => {
    const req = makeUploadRequest({ filename: "doc.txt", content: "abc" });
    const { nextCalled } = await runHandler(multerHandlers.handleFileUpload, req);

    expect(nextCalled).toBe(true);
    const files = fs.readdirSync(hotdir);
    const written = files.find((f) => f.endsWith("_doc.txt"));
    expect(written).toBeDefined();
    expect(fs.readFileSync(path.join(hotdir, written), "utf8")).toBe("abc");
  });

  test("re-decodes latin1 filenames to utf8 (umlauts survive)", async () => {
    const req = makeUploadRequest({ filename: "übersicht.txt", content: "x" });
    const { req: outReq, nextCalled } = await runHandler(
      multerHandlers.handleFileUpload,
      req,
    );

    expect(nextCalled).toBe(true);
    expect(outReq.file.originalname).toBe("übersicht.txt");
    const files = fs.readdirSync(hotdir);
    expect(files.some((f) => f.endsWith("_übersicht.txt"))).toBe(true);
  });

  test("runs filenames through normalizePath and sanitizeFileName", async () => {
    const req = makeUploadRequest({ filename: "plain.txt" });
    await runHandler(multerHandlers.handleFileUpload, req);

    expect(filesIndex.normalizePath).toHaveBeenCalled();
    expect(filesIndex.sanitizeFileName).toHaveBeenCalled();
  });

  test("streams to disk even when Supabase is enabled (no request-path mirror)", async () => {
    supabaseStorage.isEnabled.mockReturnValue(true);

    const req = makeUploadRequest({ filename: "cloud.txt", content: "cloud" });
    const { req: outReq, nextCalled } = await runHandler(
      multerHandlers.handleFileUpload,
      req,
    );

    expect(nextCalled).toBe(true);
    // The upload middleware never talks to Supabase anymore — the durability
    // mirror is decoupled via mirrorToSupabase() after the response.
    expect(supabaseStorage.uploadBuffer).not.toHaveBeenCalled();
    const files = fs.readdirSync(hotdir);
    expect(files.some((f) => f.endsWith("_cloud.txt"))).toBe(true);
    expect(outReq.file.path).toBeDefined();
  });
});

// ---- mirrorToSupabase ----------------------------------------------------------

describe("mirrorToSupabase (decoupled durability mirror)", () => {
  test("streams the on-disk file to the documents bucket and annotates request.file", async () => {
    supabaseStorage.isEnabled.mockReturnValue(true);
    supabaseStorage.uploadStream.mockResolvedValue({
      path: "documents/cloud.txt",
      url: "https://supabase.example/cloud.txt",
    });

    const req = makeUploadRequest({ filename: "cloud.txt", content: "cloud" });
    const { req: outReq } = await runHandler(
      multerHandlers.handleFileUpload,
      req,
    );

    const mirrored = await multerHandlers.mirrorToSupabase(outReq);
    expect(mirrored).toBe(true);
    // Streaming upload (constant RAM) — never a full-buffer upload.
    expect(supabaseStorage.uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "documents",
        objectPath: "cloud.txt",
        localPath: outReq.file.path,
      }),
    );
    expect(supabaseStorage.uploadBuffer).not.toHaveBeenCalled();
    expect(outReq.file.supabasePath).toBe("documents/cloud.txt");
    expect(outReq.file.supabaseUrl).toBe("https://supabase.example/cloud.txt");
  });

  test("is a no-op when Supabase is disabled", async () => {
    supabaseStorage.isEnabled.mockReturnValue(false);
    const req = makeUploadRequest({ filename: "local.txt" });
    const { req: outReq } = await runHandler(
      multerHandlers.handleFileUpload,
      req,
    );

    const mirrored = await multerHandlers.mirrorToSupabase(outReq);
    expect(mirrored).toBe(false);
    expect(supabaseStorage.uploadStream).not.toHaveBeenCalled();
    expect(supabaseStorage.uploadBuffer).not.toHaveBeenCalled();
  });

  test("never throws when the Supabase upload fails (best-effort)", async () => {
    supabaseStorage.isEnabled.mockReturnValue(true);
    supabaseStorage.uploadStream.mockRejectedValue(new Error("bucket missing"));

    const req = makeUploadRequest({ filename: "fail.txt" });
    const { req: outReq } = await runHandler(
      multerHandlers.handleFileUpload,
      req,
    );

    await expect(
      multerHandlers.mirrorToSupabase(outReq),
    ).resolves.toBe(false);
    expect(outReq.file.supabasePath).toBeUndefined();
  });
});

// ---- handleAPIFileUpload -------------------------------------------------------

describe("handleAPIFileUpload (API document uploads)", () => {
  test("rejects multipart requests without a file", async () => {
    const { res, nextCalled } = await runHandler(
      multerHandlers.handleAPIFileUpload,
      makeMultipartRequestWithoutFile(),
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/file upload is required/i);
  });

  test("writes to the hotdir when Supabase is disabled", async () => {
    const req = makeUploadRequest({ filename: "api-doc.txt", content: "api" });
    const { nextCalled } = await runHandler(
      multerHandlers.handleAPIFileUpload,
      req,
    );

    expect(nextCalled).toBe(true);
    const files = fs.readdirSync(hotdir);
    expect(files.some((f) => f.endsWith("_api-doc.txt"))).toBe(true);
  });

  test("streams to disk even when Supabase is enabled (mirror is decoupled)", async () => {
    supabaseStorage.isEnabled.mockReturnValue(true);

    const req = makeUploadRequest({ filename: "api-cloud.txt" });
    const { nextCalled } = await runHandler(
      multerHandlers.handleAPIFileUpload,
      req,
    );

    expect(nextCalled).toBe(true);
    expect(supabaseStorage.uploadBuffer).not.toHaveBeenCalled();
    const files = fs.readdirSync(hotdir);
    expect(files.some((f) => f.endsWith("_api-cloud.txt"))).toBe(true);
  });
});

// ---- handleAssetUpload ---------------------------------------------------------

describe("handleAssetUpload (logo assets)", () => {
  test("rejects multipart requests without a logo", async () => {
    const { res, nextCalled } = await runHandler(
      multerHandlers.handleAssetUpload,
      makeMultipartRequestWithoutFile(),
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  test("creates STORAGE_DIR/assets and writes the logo there", async () => {
    const req = makeUploadRequest({
      fieldName: "logo",
      filename: "logo.png",
      content: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      contentType: "image/png",
    });
    const { nextCalled } = await runHandler(
      multerHandlers.handleAssetUpload,
      req,
    );

    expect(nextCalled).toBe(true);
    const assetPath = path.join(process.env.STORAGE_DIR, "assets", "logo.png");
    expect(fs.existsSync(assetPath)).toBe(true);
  });

  test("routes to the Supabase assets bucket when enabled", async () => {
    supabaseStorage.isEnabled.mockReturnValue(true);
    supabaseStorage.uploadBuffer.mockResolvedValue({ path: "p", url: "u" });

    const req = makeUploadRequest({
      fieldName: "logo",
      filename: "brand.svg",
      contentType: "image/svg+xml",
    });
    const { nextCalled } = await runHandler(
      multerHandlers.handleAssetUpload,
      req,
    );

    expect(nextCalled).toBe(true);
    expect(supabaseStorage.uploadBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "assets" }),
    );
  });
});

// ---- handlePfpUpload -----------------------------------------------------------

describe("handlePfpUpload (profile pictures)", () => {
  test("rejects multipart requests without a profile image", async () => {
    const { res, nextCalled } = await runHandler(
      multerHandlers.handlePfpUpload,
      makeMultipartRequestWithoutFile(),
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  test("stores under STORAGE_DIR/assets/pfp with a random uuid filename", async () => {
    const req = makeUploadRequest({
      filename: "me.jpg",
      content: Buffer.from([0xff, 0xd8, 0xff]),
      contentType: "image/jpeg",
    });
    const { req: outReq, nextCalled } = await runHandler(
      multerHandlers.handlePfpUpload,
      req,
    );

    expect(nextCalled).toBe(true);
    // uuid v4 + preserved extension
    expect(outReq.randomFileName).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/i,
    );
    const pfpPath = path.join(
      process.env.STORAGE_DIR,
      "assets",
      "pfp",
      outReq.randomFileName,
    );
    expect(fs.existsSync(pfpPath)).toBe(true);
  });

  test("routes to the Supabase avatars bucket under pfp/ when enabled", async () => {
    supabaseStorage.isEnabled.mockReturnValue(true);
    supabaseStorage.uploadBuffer.mockResolvedValue({ path: "p", url: "u" });

    const req = makeUploadRequest({
      filename: "avatar.png",
      contentType: "image/png",
    });
    const { req: outReq, nextCalled } = await runHandler(
      multerHandlers.handlePfpUpload,
      req,
    );

    expect(nextCalled).toBe(true);
    expect(supabaseStorage.uploadBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "avatars",
        objectPath: expect.stringMatching(/^pfp\/.+\.png$/),
      }),
    );
    expect(outReq.randomFileName).toMatch(/\.png$/);
  });
});

// ---- handleAudioUpload ---------------------------------------------------------

describe("handleAudioUpload (STT transcription)", () => {
  test("rejects multipart requests without audio", async () => {
    const { res, nextCalled } = await runHandler(
      multerHandlers.handleAudioUpload,
      makeMultipartRequestWithoutFile(),
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  test("accepts audio uploads in-memory (buffer, no disk write)", async () => {
    const req = makeUploadRequest({
      fieldName: "audio",
      filename: "voice.webm",
      content: Buffer.from("fake-audio-bytes"),
      contentType: "audio/webm",
    });
    const { req: outReq, nextCalled } = await runHandler(
      multerHandlers.handleAudioUpload,
      req,
    );

    expect(nextCalled).toBe(true);
    expect(Buffer.isBuffer(outReq.file.buffer)).toBe(true);
    expect(outReq.file.buffer.toString()).toBe("fake-audio-bytes");
    expect(fs.readdirSync(hotdir)).toHaveLength(0);
  });

  test("rejects non-audio mimetypes with HTTP 415", async () => {
    const req = makeUploadRequest({
      fieldName: "audio",
      filename: "not-audio.txt",
      content: "text",
      contentType: "text/plain",
    });
    const { res, nextCalled } = await runHandler(
      multerHandlers.handleAudioUpload,
      req,
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(415);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Only audio uploads are allowed.");
  });
});
