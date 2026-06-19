// SPDX-License-Identifier: MIT
const fs = require("fs");
const path = require("path");

jest.mock("../../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: jest.fn() },
}));
jest.mock("../../../utils/vectorStore/resetAllVectorStores", () => ({
  resetAllVectorStores: jest.fn(),
}));

const { dumpENV } = require("../../../utils/helpers/updateENV");
const REAL_ENV_PATH = path.join(
  path.dirname(require.resolve("../../../utils/helpers/updateENV")),
  "../../.env",
);

describe("dumpENV file mode", () => {
  let originalEnv;
  let backupEnvPath;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = {
      ...process.env,
      JWT_SECRET: "test-jwt-secret-1234567890123456789012",
      NODE_ENV: "production",
    };
    if (fs.existsSync(REAL_ENV_PATH)) {
      backupEnvPath = fs.mkdtempSync(path.join(require("os").tmpdir(), "osc-env-backup-"));
      const backup = path.join(backupEnvPath, "env.bak");
      fs.copyFileSync(REAL_ENV_PATH, backup);
      fs.unlinkSync(REAL_ENV_PATH);
    }
  });

  afterEach(() => {
    if (backupEnvPath) {
      const backup = path.join(backupEnvPath, "env.bak");
      if (fs.existsSync(backup)) fs.copyFileSync(backup, REAL_ENV_PATH);
      fs.rmSync(backupEnvPath, { recursive: true, force: true });
      backupEnvPath = null;
    }
    if (fs.existsSync(REAL_ENV_PATH) && !backupEnvPath) {
      fs.unlinkSync(REAL_ENV_PATH);
    }
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test("writes server/.env with mode 0o600", () => {
    expect(dumpENV()).toBe(true);

    expect(fs.existsSync(REAL_ENV_PATH)).toBe(true);
    expect(fs.statSync(REAL_ENV_PATH).mode & 0o777).toBe(0o600);
  });

  test("calls chmodSync(0o600) immediately after writing the .env file", () => {
    const writeSpy = jest.spyOn(fs, "writeFileSync");
    const chmodSpy = jest.spyOn(fs, "chmodSync");

    expect(dumpENV()).toBe(true);

    const envWriteCallIndex = writeSpy.mock.calls.findIndex(([p]) =>
      String(p).endsWith(".env"),
    );
    expect(envWriteCallIndex).toBeGreaterThanOrEqual(0);
    const envWritePath = writeSpy.mock.calls[envWriteCallIndex][0];

    expect(chmodSpy).toHaveBeenCalledWith(envWritePath, 0o600);
    expect(chmodSpy.mock.invocationCallOrder[0]).toBeGreaterThan(
      writeSpy.mock.invocationCallOrder[envWriteCallIndex],
    );
  });
});
