// SPDX-License-Identifier: MIT
const { patchShellEnvironmentPath } = require("../../../utils/helpers/shell");

describe("shell", () => {
  let envBackup;
  let originalPlatform;

  beforeEach(() => {
    envBackup = { ...process.env };
    originalPlatform = process.platform;
  });

  afterEach(() => {
    process.env = envBackup;
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  it("returns process.env unchanged on win32", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    });

    const result = await patchShellEnvironmentPath();
    expect(result).toBe(process.env);
  });

  it("returns process.env on non-win32 platform", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true,
    });

    const result = await patchShellEnvironmentPath();
    expect(result).toBe(process.env);
  });

  it("returns process.env on linux platform", async () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });

    const result = await patchShellEnvironmentPath();
    expect(result).toBe(process.env);
  });

  it("never throws — always returns process.env", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true,
    });

    await expect(patchShellEnvironmentPath()).resolves.toBe(process.env);
  });
});
