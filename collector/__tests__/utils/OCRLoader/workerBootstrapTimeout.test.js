// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Regression tests for the OCR worker-bootstrap timeout fix.
//
// Root cause being covered: tesseract.js's createWorker() can trigger a
// network fetch of the OCR engine core + language model on a cold cache.
// Previously this call was completely unbounded — none of OCRLoader's own
// maxExecutionTime timers started until *after* the worker already existed
// — so a blocked/slow network hung indefinitely and chat PDF uploads
// appeared to "hang forever" before eventually erroring via the much
// coarser upstream timeout chain (up to 30 minutes).
//
// These tests use a short OCR_WORKER_BOOTSTRAP_TIMEOUT_MS (via env, read at
// module-load time) with real timers so they run fast while still proving
// the bootstrap call is now bounded.

jest.mock("../../../utils/paths", () => ({
  getStoragePath: jest.fn((...subdirs) => ["/fake/storage", ...subdirs].join("/")),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  statSync: jest.fn(() => ({ isFile: () => true, size: 100 })),
  readFileSync: jest.fn(),
}));

const BOOTSTRAP_TIMEOUT_MS = 50;

/**
 * Loads a fresh OCRLoader module instance with the given tesseract.js
 * createWorker mock and env overrides. Module-level constants (timeout,
 * lang/core paths) are read once at require time, so each test needs an
 * isolated module registry.
 */
function loadOCRLoaderWith({ createWorker, envOverrides = {} }) {
  let OCRLoader;
  jest.isolateModules(() => {
    process.env.OCR_WORKER_BOOTSTRAP_TIMEOUT_MS = String(BOOTSTRAP_TIMEOUT_MS);
    delete process.env.OCR_TESSDATA_PATH;
    delete process.env.OCR_CORE_PATH;
    for (const [key, value] of Object.entries(envOverrides)) {
      process.env[key] = value;
    }

    jest.doMock(
      "tesseract.js",
      () => ({
        createWorker,
        OEM: { LSTM_ONLY: 1 },
      }),
      { virtual: true }
    );
    jest.doMock(
      "sharp",
      () => ({
        default: jest.fn(() => ({
          rotate: () => ({
            png: () => ({ toBuffer: () => Promise.resolve(Buffer.from("x")) }),
          }),
        })),
      }),
      { virtual: true }
    );

    OCRLoader = require("../../../utils/OCRLoader");
  });
  return OCRLoader;
}

describe("OCRLoader worker bootstrap timeout", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.dontMock("tesseract.js");
    jest.dontMock("sharp");
  });

  it("fails fast (within the configured timeout) instead of hanging when createWorker never resolves", async () => {
    const neverResolves = jest.fn(() => new Promise(() => {}));
    const OCRLoader = loadOCRLoaderWith({ createWorker: neverResolves });
    const loader = new OCRLoader();

    const startedAt = Date.now();
    const result = await loader.ocrImage("/fake/image.png", {
      maxExecutionTime: 10_000, // deliberately much longer than the bootstrap timeout
    });
    const elapsedMs = Date.now() - startedAt;

    expect(result).toBeNull();
    // Must resolve close to BOOTSTRAP_TIMEOUT_MS, not the much larger
    // maxExecutionTime (10s) or the old unbounded behavior.
    expect(elapsedMs).toBeLessThan(5_000);
  });

  it("surfaces an actionable error message mentioning OCR_TESSDATA_PATH when bootstrap times out", async () => {
    const capturedLogs = [];
    const neverResolves = jest.fn(() => new Promise(() => {}));
    const OCRLoader = loadOCRLoaderWith({ createWorker: neverResolves });
    const loader = new OCRLoader();
    loader.log = jest.fn((...args) => capturedLogs.push(args.join(" ")));

    await loader.ocrImage("/fake/image.png");

    expect(capturedLogs.some((l) => l.includes("OCR_TESSDATA_PATH"))).toBe(
      true
    );
  });

  it("forwards OCR_TESSDATA_PATH / OCR_CORE_PATH to createWorker as langPath / corePath", async () => {
    const worker = {
      recognize: jest.fn(() =>
        Promise.resolve({ data: { text: "hello" } })
      ),
      terminate: jest.fn(() => Promise.resolve()),
    };
    const createWorker = jest.fn(() => Promise.resolve(worker));
    const OCRLoader = loadOCRLoaderWith({
      createWorker,
      envOverrides: {
        OCR_TESSDATA_PATH: "/opt/tessdata",
        OCR_CORE_PATH: "/opt/tesseract-core",
      },
    });
    const loader = new OCRLoader();

    const text = await loader.ocrImage("/fake/image.png");

    expect(text).toBe("hello");
    expect(createWorker).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        langPath: "/opt/tessdata",
        corePath: "/opt/tesseract-core",
      })
    );
  });

  it("does not set langPath/corePath when the env vars are unset (keeps default CDN behavior)", async () => {
    const worker = {
      recognize: jest.fn(() => Promise.resolve({ data: { text: "hi" } })),
      terminate: jest.fn(() => Promise.resolve()),
    };
    const createWorker = jest.fn(() => Promise.resolve(worker));
    const OCRLoader = loadOCRLoaderWith({ createWorker });
    const loader = new OCRLoader();

    await loader.ocrImage("/fake/image.png");

    const callOptions = createWorker.mock.calls[0][2];
    expect(callOptions).not.toHaveProperty("langPath");
    expect(callOptions).not.toHaveProperty("corePath");
    expect(callOptions).toHaveProperty("cachePath");
  });

  it("terminates a worker that resolves after the bootstrap timeout already fired (no leak)", async () => {
    const terminate = jest.fn(() => Promise.resolve());
    const lateWorker = {
      recognize: jest.fn(() => Promise.resolve({ data: { text: "late" } })),
      terminate,
    };
    // Resolves well after BOOTSTRAP_TIMEOUT_MS but before the test ends.
    const createWorker = jest.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(lateWorker), BOOTSTRAP_TIMEOUT_MS * 4)
        )
    );
    const OCRLoader = loadOCRLoaderWith({ createWorker });
    const loader = new OCRLoader();

    const result = await loader.ocrImage("/fake/image.png", {
      maxExecutionTime: 10_000,
    });
    expect(result).toBeNull(); // bootstrap timeout wins the race

    // Give the late-resolving worker promise a chance to settle and trigger
    // the orphan-cleanup path.
    await new Promise((resolve) => setTimeout(resolve, BOOTSTRAP_TIMEOUT_MS * 5));
    expect(terminate).toHaveBeenCalled();
  });

  // Note: a full ocrPDF() happy-path test (multiple workers, some timing
  // out) is intentionally not included here. ocrPDF() reaches a dynamic
  // `await import("pdf-parse/lib/pdf.js/...")` before worker bootstrap even
  // begins, which this Jest environment cannot mock/execute without
  // --experimental-vm-modules — a pre-existing environment limitation
  // unrelated to this fix (see the "does not exist. Skipping OCR" early-
  // return tests in index.test.js, which is why prior coverage never
  // exercises this path either). The worker-pool bootstrap logic itself
  // (Promise.allSettled over createWorkerWithTimeout calls) is a thin,
  // mechanical wrapper reusing the exact same createWorkerWithTimeout
  // helper already covered above for ocrImage.
});
