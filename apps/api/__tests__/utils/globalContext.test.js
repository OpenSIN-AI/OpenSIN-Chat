// SPDX-License-Identifier: MIT
/**
 * Tests for the global chat-context helper
 * (server/utils/globalContext/index.js).
 *
 * This helper turns the deployment-wide global file store (STORAGE_DIR/global)
 * into automatic system-prompt context. It is prompt-core-adjacent, so the
 * behaviours pinned here are the ones a regression would silently break:
 *   * empty store => "" (no stray header, byte-for-byte previous behaviour)
 *   * only text files (.md/.markdown/.txt) are included; binaries are ignored
 *   * per-file + total size budgets truncate rather than overflow
 *   * path-traversal cannot escape the global root
 *   * appendGlobalContext only appends when there is real content
 *
 * The real path guard (safeGlobalJoin -> safeStorageJoin) is exercised
 * unmocked; fs is mocked so no disk I/O happens.
 */

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
  // needed by paths.js (getStoragePath) which is the REAL module here
  mkdirSync: jest.fn(),
  constants: { F_OK: 0, W_OK: 2 },
}));

const fs = require("fs");
const path = require("path");

const STORAGE_ROOT = "/tmp/opensin-storage";
const GLOBAL_ROOT = path.join(STORAGE_ROOT, "global");

const {
  getGlobalContext,
  appendGlobalContext,
  _resetCache,
  MAX_CHARS_PER_FILE,
  MAX_TOTAL_CHARS,
} = require("../../utils/globalContext");

function makeDirent(name, kind = "file") {
  return {
    name,
    isFile: () => kind === "file",
    isDirectory: () => kind === "dir",
    isSymbolicLink: () => kind === "symlink",
  };
}

/**
 * Wire fs.readdirSync/statSync/readFileSync from a simple in-memory tree.
 * tree: { "<relDir>": [Dirent, ...] }, files: { "<absPath>": "content" }.
 */
function mockTree(tree, files, { sizes = {}, mtimes = {} } = {}) {
  fs.readdirSync.mockImplementation((absDir) => {
    const rel = path.relative(GLOBAL_ROOT, absDir);
    const key = rel === "" ? "" : rel;
    if (!(key in tree)) throw new Error(`ENOENT ${absDir}`);
    return tree[key];
  });
  fs.statSync.mockImplementation((absPath) => {
    const isFile = absPath in files || absPath in sizes;
    return {
      isFile: () => isFile,
      size: sizes[absPath] ?? (files[absPath]?.length || 0),
      mtimeMs: mtimes[absPath] ?? 1,
    };
  });
  fs.readFileSync.mockImplementation((absPath) => {
    if (absPath in files) return files[absPath];
    throw new Error(`ENOENT ${absPath}`);
  });
}

describe("globalContext helper", () => {
  let prevStorageDir;
  beforeAll(() => {
    prevStorageDir = process.env.STORAGE_DIR;
    process.env.STORAGE_DIR = STORAGE_ROOT;
  });
  afterAll(() => {
    process.env.STORAGE_DIR = prevStorageDir;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    _resetCache();
  });

  test("empty store => empty string (no header, no regression)", () => {
    mockTree({ "": [] }, {});
    expect(getGlobalContext()).toBe("");
  });

  test("missing global dir => empty string", () => {
    fs.existsSync.mockReturnValue(false);
    expect(getGlobalContext()).toBe("");
    expect(fs.readdirSync).not.toHaveBeenCalled();
  });

  test("includes text files with a per-file header, deutsch block header", () => {
    const agents = path.join(GLOBAL_ROOT, "agents.md");
    const memory = path.join(GLOBAL_ROOT, "memory.txt");
    mockTree(
      { "": [makeDirent("agents.md"), makeDirent("memory.txt")] },
      { [agents]: "Sei hilfreich.", [memory]: "Merke dir X." },
    );

    const out = getGlobalContext();
    expect(out).toContain("## Globaler Kontext (gilt workspace-übergreifend");
    expect(out).toContain("### agents.md");
    expect(out).toContain("Sei hilfreich.");
    expect(out).toContain("### memory.txt");
    expect(out).toContain("Merke dir X.");
  });

  test("ignores binary / non-text files (pdf, png, zip)", () => {
    const md = path.join(GLOBAL_ROOT, "keep.md");
    mockTree(
      {
        "": [
          makeDirent("keep.md"),
          makeDirent("doc.pdf"),
          makeDirent("img.png"),
          makeDirent("bundle.zip"),
        ],
      },
      { [md]: "behalten" },
    );

    const out = getGlobalContext();
    expect(out).toContain("keep.md");
    expect(out).not.toContain("doc.pdf");
    expect(out).not.toContain("img.png");
    expect(out).not.toContain("bundle.zip");
    // only the text file was read
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  test("skips dotfiles", () => {
    const md = path.join(GLOBAL_ROOT, "visible.md");
    mockTree(
      { "": [makeDirent(".secret.md"), makeDirent("visible.md")] },
      { [md]: "sichtbar" },
    );
    const out = getGlobalContext();
    expect(out).toContain("visible.md");
    expect(out).not.toContain(".secret.md");
  });

  test("does not follow symlinks", () => {
    mockTree({ "": [makeDirent("evil", "symlink")] }, {});
    expect(getGlobalContext()).toBe("");
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  test("recurses into subdirectories", () => {
    const nested = path.join(GLOBAL_ROOT, "shared", "team.md");
    mockTree(
      {
        "": [makeDirent("shared", "dir")],
        shared: [makeDirent("team.md")],
      },
      { [nested]: "Team-Regeln" },
    );
    const out = getGlobalContext();
    expect(out).toContain("### shared/team.md");
    expect(out).toContain("Team-Regeln");
  });

  test("truncates a file that exceeds the per-file budget", () => {
    const big = path.join(GLOBAL_ROOT, "big.md");
    const content = "A".repeat(MAX_CHARS_PER_FILE + 5_000);
    mockTree({ "": [makeDirent("big.md")] }, { [big]: content });

    const out = getGlobalContext();
    expect(out).toContain("gekürzt");
    // body must not exceed the per-file cap (plus the note)
    const body = out.split("### big.md\n")[1];
    expect(body.replace(/\n\n\[… gekürzt.*$/s, "").length).toBeLessThanOrEqual(
      MAX_CHARS_PER_FILE,
    );
  });

  test("enforces the overall total budget across many files", () => {
    const tree = { "": [] };
    const files = {};
    // 10 files of ~5k chars each = ~50k > MAX_TOTAL_CHARS (32k)
    for (let i = 0; i < 10; i++) {
      const name = `f${i}.md`;
      tree[""].push(makeDirent(name));
      files[path.join(GLOBAL_ROOT, name)] = "B".repeat(5_000);
    }
    mockTree(tree, files);

    const out = getGlobalContext();
    // total content (minus headers/notes) must respect the budget
    expect(out.length).toBeLessThan(MAX_TOTAL_CHARS + 2_000);
    expect(out).toContain("Kontextbudget");
  });

  test("path traversal in a directory name cannot escape the store", () => {
    // A crafted entry that would resolve outside global/ is guarded by
    // safeGlobalJoin; the walk simply skips it and yields nothing.
    mockTree({ "": [makeDirent("..", "dir")] }, {});
    expect(getGlobalContext()).toBe("");
  });

  test("caches across calls until the tree fingerprint changes", () => {
    const md = path.join(GLOBAL_ROOT, "a.md");
    mockTree({ "": [makeDirent("a.md")] }, { [md]: "erste Version" });

    const first = getGlobalContext();
    expect(first).toContain("erste Version");
    const readsAfterFirst = fs.readFileSync.mock.calls.length;

    // Second call, same fingerprint => served from cache, no new file read.
    const second = getGlobalContext();
    expect(second).toBe(first);
    expect(fs.readFileSync.mock.calls.length).toBe(readsAfterFirst);

    // Bump mtime => fingerprint changes => re-read.
    mockTree(
      { "": [makeDirent("a.md")] },
      { [md]: "zweite Version" },
      { mtimes: { [md]: 999 } },
    );
    const third = getGlobalContext();
    expect(third).toContain("zweite Version");
    expect(fs.readFileSync.mock.calls.length).toBeGreaterThan(readsAfterFirst);
  });
});

describe("appendGlobalContext", () => {
  let prevStorageDir;
  beforeAll(() => {
    prevStorageDir = process.env.STORAGE_DIR;
    process.env.STORAGE_DIR = STORAGE_ROOT;
  });
  afterAll(() => {
    process.env.STORAGE_DIR = prevStorageDir;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    _resetCache();
  });

  test("returns base prompt unchanged when store is empty", () => {
    mockTree({ "": [] }, {});
    expect(appendGlobalContext("Du bist ein Assistent.")).toBe(
      "Du bist ein Assistent.",
    );
  });

  test("appends the global block after the base prompt when present", () => {
    const md = path.join(GLOBAL_ROOT, "sys.md");
    mockTree({ "": [makeDirent("sys.md")] }, { [md]: "Globale Regel." });
    const out = appendGlobalContext("Basis-Prompt.");
    expect(out.startsWith("Basis-Prompt.\n\n")).toBe(true);
    expect(out).toContain("## Globaler Kontext");
    expect(out).toContain("Globale Regel.");
  });

  test("handles a null/empty base prompt", () => {
    const md = path.join(GLOBAL_ROOT, "sys.md");
    mockTree({ "": [makeDirent("sys.md")] }, { [md]: "Nur global." });
    const out = appendGlobalContext(null);
    expect(out).toContain("## Globaler Kontext");
    expect(out).not.toMatch(/^\n\n/);
  });
});
