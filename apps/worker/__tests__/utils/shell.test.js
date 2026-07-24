// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Tests for the shell environment patcher.
// NOTE: shell.js uses dynamic `import()` for `fix-path` and `strip-ansi`.
// In Jest's CommonJS environment these dynamic imports fail with
// ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG. The source code's try/catch
// swallows that error and returns process.env, so the function is
// well-defined for testing purposes. We test the observable behavior.

const ORIGINAL_PLATFORM = process.platform;

describe("shell.patchShellEnvironmentPath - win32 short-circuit", () => {
  beforeAll(() => {
    Object.defineProperty(process, "platform", { value: "win32" });
  });

  afterAll(() => {
    Object.defineProperty(process, "platform", { value: ORIGINAL_PLATFORM });
  });

  it("returns process.env without importing fix-path on win32", async () => {
    // The win32 branch returns process.env directly; no dynamic import
    // is attempted. We just require the module here to ensure no errors.
    jest.resetModules();
    const { patchShellEnvironmentPath } = require("../../utils/shell");
    const result = await patchShellEnvironmentPath();
    expect(result).toBe(process.env);
  });

  it("does not modify PATH on win32", async () => {
    jest.resetModules();
    const before = process.env.PATH;
    const { patchShellEnvironmentPath } = require("../../utils/shell");
    await patchShellEnvironmentPath();
    expect(process.env.PATH).toBe(before);
  });
});

describe("shell.patchShellEnvironmentPath - non-windows error path", () => {
  beforeAll(() => {
    Object.defineProperty(process, "platform", { value: "darwin" });
  });

  afterAll(() => {
    Object.defineProperty(process, "platform", { value: ORIGINAL_PLATFORM });
  });

  it("returns process.env when the dynamic import fails", async () => {
    // On non-windows, the source does:
    //   const { default: fixPath } = await import("fix-path");
    // In a CommonJS Jest test this throws ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG
    // which the catch block handles by returning process.env.
    jest.resetModules();
    const { patchShellEnvironmentPath } = require("../../utils/shell");
    const result = await patchShellEnvironmentPath();
    expect(result).toBe(process.env);
  });

  it("does not throw when PATH contains ANSI sequences and the import fails", async () => {
    // PATH can be polluted by terminal-emitted ANSI escape codes; the
    // source tries to strip them via dynamic import of strip-ansi. Since
    // the import fails, the value is unchanged but the function does not throw.
    process.env.PATH = "/usr/bin\x1b[31m:/usr/local/bin";
    jest.resetModules();
    const { patchShellEnvironmentPath } = require("../../utils/shell");
    await expect(patchShellEnvironmentPath()).resolves.toBe(process.env);
    // Since the dynamic import failed, the ANSI sequence remains in PATH
    // — this is the documented fallback behavior.
  });

  it("does not throw when PATH is undefined", async () => {
    const prev = process.env.PATH;
    delete process.env.PATH;
    jest.resetModules();
    const { patchShellEnvironmentPath } = require("../../utils/shell");
    await expect(patchShellEnvironmentPath()).resolves.toBe(process.env);
    process.env.PATH = prev;
  });
});

describe("shell module shape", () => {
  it("exports patchShellEnvironmentPath as a function", () => {
    const shell = require("../../utils/shell");
    expect(typeof shell.patchShellEnvironmentPath).toBe("function");
  });

  it("is a CommonJS module (no default export)", () => {
    const shell = require("../../utils/shell");
    expect(shell.default).toBeUndefined();
  });
});
