// SPDX-License-Identifier: MIT
const { patchShellEnvironmentPath } = require("../../../utils/helpers/shell");

describe("shell", () => {
  let envBackup;

  beforeEach(() => {
    envBackup = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("returns process.env unchanged on win32", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    });

    const result = await patchShellEnvironmentPath();
    expect(result).toBe(process.env);

    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  it("returns process.env on successful path patch (non-win32)", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true,
    });

    // Mock dynamic imports
    jest.doMock("fix-path", () => ({
      default: jest.fn(() => {
        process.env.PATH = "/usr/local/bin:/usr/bin:/bin";
      }),
    }));
    jest.doMock("strip-ansi", () => ({
      default: jest.fn((str) => str),
    }));

    const result = await patchShellEnvironmentPath();
    expect(result).toBe(process.env);

    jest.dontMock("fix-path");
    jest.dontMock("strip-ansi");
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  it("returns process.env even when import fails", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });

    // Mock import to fail
    jest.doMock("fix-path", () => {
      throw new Error("module not found");
    });

    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await patchShellEnvironmentPath();
    expect(result).toBe(process.env);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    jest.dontMock("fix-path");
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  it("never throws — always returns process.env", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true,
    });

    // Force an error in import
    jest.doMock("fix-path", () => {
      throw new Error("catastrophic failure");
    });

    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(patchShellEnvironmentPath()).resolves.toBe(process.env);

    errorSpy.mockRestore();
    jest.dontMock("fix-path");
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });
});
