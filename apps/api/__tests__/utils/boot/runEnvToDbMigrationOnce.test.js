// SPDX-License-Identifier: MIT
// Tests for the runEnvToDbMigrationOnce() boot hook — Issue #2 acceptance criteria.
// Verifies: first-boot migration runs, second-boot is a no-op (flag guard),
// and a non-fatal error path during migration does not crash the server.

const mockGet          = jest.fn();
const mockUpdateSettings = jest.fn();
const mockMigrateEnvToDb = jest.fn();

// Stub SystemSettings — controls the idempotency flag lookup.
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: {
    get: mockGet,
    _updateSettings: mockUpdateSettings,
  },
}));

// Stub migrate-env-to-db — we only care it is called (or not).
jest.mock("../../../scripts/migrate-env-to-db", () => ({
  migrateEnvToDb: mockMigrateEnvToDb,
}));

// Stub all heavy boot-time deps so requiring boot/index.js never spins up
// network connections, file I/O, or background workers.
jest.mock("../../../utils/logger/console.js", () => ({
  log: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../../../models/telemetry", () => ({ Telemetry: { flush: jest.fn() } }));
jest.mock("../../../utils/BackgroundWorkers", () => ({
  BackgroundService: class { boot() {} },
}));
jest.mock("../../../utils/EncryptionManager", () => ({
  EncryptionManager: class {},
}));
jest.mock("../../../utils/SettingsManager", () => ({
  SettingsManager: { hydrate: jest.fn() },
}));
jest.mock("../../../utils/comKey", () => ({
  CommunicationKey: class {},
}));
jest.mock("../../../utils/telemetry", () => jest.fn());
jest.mock("../../../utils/boot/eagerLoadContextWindows", () => jest.fn());
jest.mock("../../../utils/boot/markOnboarded", () => jest.fn());
jest.mock("../../../utils/boot/ensureLLMProvider", () => jest.fn());

const { _runEnvToDbMigrationOnce } = require("../../../utils/boot");

describe("runEnvToDbMigrationOnce()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs migrateEnvToDb and sets the flag on the first boot", async () => {
    // Flag absent — first boot.
    mockGet.mockResolvedValue(null);
    mockMigrateEnvToDb.mockResolvedValue({ migrated: 5, skipped: 2 });
    mockUpdateSettings.mockResolvedValue({});

    await _runEnvToDbMigrationOnce();

    expect(mockMigrateEnvToDb).toHaveBeenCalledTimes(1);
    expect(mockMigrateEnvToDb).toHaveBeenCalledWith({ silent: true });
    expect(mockUpdateSettings).toHaveBeenCalledWith({ env_to_db_migrated: "true" });
  });

  it("is a no-op when the flag is already set (subsequent boots)", async () => {
    // Flag present — not the first boot.
    mockGet.mockResolvedValue({ label: "env_to_db_migrated", value: "true" });

    await _runEnvToDbMigrationOnce();

    expect(mockMigrateEnvToDb).not.toHaveBeenCalled();
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it("does not set the flag when migrateEnvToDb migrates 0 settings", async () => {
    // Flag absent, but nothing to migrate.
    mockGet.mockResolvedValue(null);
    mockMigrateEnvToDb.mockResolvedValue({ migrated: 0, skipped: 10 });

    await _runEnvToDbMigrationOnce();

    expect(mockMigrateEnvToDb).toHaveBeenCalledTimes(1);
    // Flag must NOT be set — 0 migrated means nothing was persisted.
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it("is non-fatal when SystemSettings.get throws (e.g. pre-migration DB state)", async () => {
    mockGet.mockRejectedValue(new Error("no such table: system_settings"));

    // Must not throw; server boot must continue.
    await expect(_runEnvToDbMigrationOnce()).resolves.toBeUndefined();
    expect(mockMigrateEnvToDb).not.toHaveBeenCalled();
  });

  it("is non-fatal when migrateEnvToDb itself throws", async () => {
    mockGet.mockResolvedValue(null);
    mockMigrateEnvToDb.mockRejectedValue(new Error("SettingsManager DB unavailable"));

    await expect(_runEnvToDbMigrationOnce()).resolves.toBeUndefined();
    // Flag must not be written on a failed migration.
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });
});
