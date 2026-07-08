// SPDX-License-Identifier: MIT
// Tests for server/scripts/migrate-env-to-db.js — Issue #2 acceptance criteria.
// Covers: migrating set keys, skipping unset keys, idempotent upsert behaviour,
// error handling per-key, and the returned { migrated, skipped } counters.
//
// The migrate script calls require("dotenv").config() at module load time, so
// we use jest.isolateModules + jest.doMock to control the module registry and
// avoid needing dotenv installed in the server devDependencies.

describe("migrateEnvToDb()", () => {
  let migrateEnvToDb;
  let mockSet;

  beforeEach(() => {
    mockSet = jest.fn();

    jest.isolateModules(() => {
      // Stub dotenv (top-level side effect in the script).
      jest.doMock("dotenv", () => ({ config: jest.fn() }), { virtual: true });

      // Stub KEY_MAPPING so we control exactly which keys are iterated.
      jest.doMock("../../../utils/helpers/updateENV/keyMapping", () => ({
        KEY_MAPPING: {
          LLMProvider: { envKey: "LLM_PROVIDER" },
          OpenAiKey:   { envKey: "OPEN_AI_KEY" },
          VectorDB:    { envKey: "VECTOR_DB" },
          UnsetKey:    { envKey: "UNSET_KEY_FOR_TEST" },
        },
      }));

      // Stub SettingsManager so we do not touch a real DB.
      jest.doMock("../../../utils/SettingsManager", () => ({
        SettingsManager: {
          isSensitive: jest.fn((k) => k.includes("KEY")),
          set: mockSet,
        },
      }));

      ({ migrateEnvToDb } = require("../../../scripts/migrate-env-to-db"));
    });

    // Seed process.env with values for keys that should be migrated.
    process.env.LLM_PROVIDER = "openai";
    process.env.OPEN_AI_KEY  = "sk-test-secret";
    process.env.VECTOR_DB    = "lancedb";
    // UNSET_KEY_FOR_TEST is intentionally absent.
    delete process.env.UNSET_KEY_FOR_TEST;
  });

  afterEach(() => {
    jest.resetModules();
    delete process.env.LLM_PROVIDER;
    delete process.env.OPEN_AI_KEY;
    delete process.env.VECTOR_DB;
  });

  it("calls SettingsManager.set for every key that has a value in process.env", async () => {
    mockSet.mockResolvedValue(true);

    await migrateEnvToDb({ silent: true });

    // 3 keys have values; UNSET_KEY_FOR_TEST must be skipped.
    expect(mockSet).toHaveBeenCalledTimes(3);
    expect(mockSet).toHaveBeenCalledWith(
      "LLM_PROVIDER",
      "openai",
      expect.objectContaining({ action: "migrate" }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      "OPEN_AI_KEY",
      "sk-test-secret",
      expect.objectContaining({ action: "migrate" }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      "VECTOR_DB",
      "lancedb",
      expect.objectContaining({ action: "migrate" }),
    );
  });

  it("skips keys whose value is undefined / empty string", async () => {
    mockSet.mockResolvedValue(true);
    process.env.LLM_PROVIDER = ""; // empty — should be skipped

    const { migrated, skipped } = await migrateEnvToDb({ silent: true });

    // LLM_PROVIDER skipped (empty), UNSET_KEY_FOR_TEST skipped (absent) → 2 skipped
    expect(skipped).toBe(2);
    expect(migrated).toBe(2); // OPEN_AI_KEY + VECTOR_DB
  });

  it("returns correct migrated + skipped counters", async () => {
    mockSet.mockResolvedValue(true);

    const { migrated, skipped } = await migrateEnvToDb({ silent: true });

    expect(migrated).toBe(3);
    expect(skipped).toBe(1); // only UNSET_KEY_FOR_TEST
  });

  it("continues past a per-key SettingsManager.set failure and records migrated correctly", async () => {
    mockSet
      .mockRejectedValueOnce(new Error("DB unavailable")) // LLM_PROVIDER fails
      .mockResolvedValue(true);                           // rest succeed

    // Should not throw; the failed key is simply not counted as migrated.
    const { migrated } = await migrateEnvToDb({ silent: true });
    expect(migrated).toBe(2); // OPEN_AI_KEY + VECTOR_DB succeeded
  });

  it("is idempotent — calling twice produces two rounds of upserts without error", async () => {
    mockSet.mockResolvedValue(true);

    await migrateEnvToDb({ silent: true });
    await migrateEnvToDb({ silent: true });

    // 3 migrated keys × 2 calls
    expect(mockSet).toHaveBeenCalledTimes(6);
  });
});
