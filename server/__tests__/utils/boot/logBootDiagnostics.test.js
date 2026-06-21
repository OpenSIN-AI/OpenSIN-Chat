// SPDX-License-Identifier: MIT
const { logBootDiagnostics } = require("../../../utils/boot/logBootDiagnostics");

jest.mock("../../../utils/paths", () => ({
  pathsHealth: jest.fn(),
}));

jest.mock("../../../utils/providerKeyStatus", () => ({
  getProviderKeyStatuses: jest.fn(),
}));

const { pathsHealth } = require("../../../utils/paths");
const { getProviderKeyStatuses } = require("../../../utils/providerKeyStatus");

describe("logBootDiagnostics", () => {
  let originalLog, originalWarn, originalError;
  let logMock, warnMock, errorMock;

  beforeEach(() => {
    pathsHealth.mockReset();
    getProviderKeyStatuses.mockReset();
    originalLog = console.log;
    originalWarn = console.warn;
    originalError = console.error;
    logMock = jest.fn();
    warnMock = jest.fn();
    errorMock = jest.fn();
    console.log = logMock;
    console.warn = warnMock;
    console.error = errorMock;
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  it("logs storage path info when everything is healthy", () => {
    pathsHealth.mockReturnValue({
      storagePath: "/data/storage",
      storageDirSet: true,
      storageExists: true,
      storageWritable: true,
      collectorPath: "/collector/hotdir",
      hotdirExists: true,
    });
    getProviderKeyStatuses.mockReturnValue([]);

    logBootDiagnostics();

    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining("[BootDiagnostics]"),
    );
    expect(warnMock).not.toHaveBeenCalled();
  });

  it("warns when storage directory does not exist", () => {
    pathsHealth.mockReturnValue({
      storagePath: "/data/storage",
      storageDirSet: false,
      storageExists: false,
      storageWritable: false,
      collectorPath: "/collector/hotdir",
      hotdirExists: true,
    });
    getProviderKeyStatuses.mockReturnValue([]);

    logBootDiagnostics();

    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("storage directory missing"),
    );
  });

  it("warns when collector hotdir is missing", () => {
    pathsHealth.mockReturnValue({
      storagePath: "/data/storage",
      storageDirSet: true,
      storageExists: true,
      storageWritable: true,
      collectorPath: "/collector/hotdir",
      hotdirExists: false,
    });
    getProviderKeyStatuses.mockReturnValue([]);

    logBootDiagnostics();

    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("collector hotdir missing"),
    );
  });

  it("warns when provider keys have fallbacks active", () => {
    pathsHealth.mockReturnValue({
      storagePath: "/data/storage",
      storageDirSet: true,
      storageExists: true,
      storageWritable: true,
      collectorPath: "/collector/hotdir",
      hotdirExists: true,
    });
    getProviderKeyStatuses.mockReturnValue([
      { name: "openai", envKey: "OPEN_AI_API_KEY", fallbackActive: true },
      { name: "anthropic", envKey: "ANTHROPIC_API_KEY", fallbackActive: true },
    ]);

    logBootDiagnostics();

    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("2 local provider(s)"),
    );
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("openai"),
    );
  });

  it("does not warn when no fallbacks are active", () => {
    pathsHealth.mockReturnValue({
      storagePath: "/data/storage",
      storageDirSet: true,
      storageExists: true,
      storageWritable: true,
      collectorPath: "/collector/hotdir",
      hotdirExists: true,
    });
    getProviderKeyStatuses.mockReturnValue([
      { name: "openai", envKey: "OPEN_AI_API_KEY", fallbackActive: false },
    ]);

    logBootDiagnostics();

    const warnCalls = warnMock.mock.calls;
    expect(warnCalls).toHaveLength(0);
  });

  it("catches and logs errors without throwing", () => {
    pathsHealth.mockImplementation(() => {
      throw new Error("pathsHealth crashed");
    });

    expect(() => logBootDiagnostics()).not.toThrow();
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining("[BootDiagnostics]"),
      "pathsHealth crashed",
    );
  });

  it("logs storage dir as 'set' when storageDirSet is true", () => {
    pathsHealth.mockReturnValue({
      storagePath: "/data/storage",
      storageDirSet: true,
      storageExists: true,
      storageWritable: true,
      collectorPath: "/collector/hotdir",
      hotdirExists: true,
    });
    getProviderKeyStatuses.mockReturnValue([]);

    logBootDiagnostics();

    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining("STORAGE_DIR set"),
    );
  });

  it("logs storage dir as 'unset' when storageDirSet is false", () => {
    pathsHealth.mockReturnValue({
      storagePath: "/data/fallback",
      storageDirSet: false,
      storageExists: true,
      storageWritable: true,
      collectorPath: "/collector/hotdir",
      hotdirExists: true,
    });
    getProviderKeyStatuses.mockReturnValue([]);

    logBootDiagnostics();

    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining("STORAGE_DIR unset"),
    );
  });
});
