// SPDX-License-Identifier: MIT
// Phase 4 — SettingsManager tests. Covers sensitivity detection, encryption at
// rest for sensitive keys, DB-first reads with env fallback, cache TTL, audit
// redaction, and boot-time hydration.

jest.mock("../../../utils/prisma", () => ({
  managed_env_settings: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  settings_audit_log: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
}));

// Deterministic, reversible fake encryption so we can assert "encrypted at rest".
jest.mock("../../../utils/EncryptionManager", () => ({
  EncryptionManager: class {
    encrypt(v) {
      return `enc(${v})`;
    }
    decrypt(v) {
      return String(v).replace(/^enc\((.*)\)$/, "$1");
    }
  },
}));

const prisma = require("../../../utils/prisma");
const { SettingsManager, SENSITIVE_KEY_PATTERN } = require("../../../utils/SettingsManager");

describe("SettingsManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SettingsManager.clearCache();
    SettingsManager.__db = undefined; // force lazy re-require of the mock
    SettingsManager.__encryptor = undefined;
  });

  describe("isSensitive", () => {
    it.each([
      "OPEN_AI_KEY",
      "ANTHROPIC_API_KEY",
      "JWT_SECRET",
      "AUTH_TOKEN",
      "MILVUS_PASSWORD",
      "PGVECTOR_CONNECTION_STRING",
    ])("treats %s as sensitive", (key) => {
      expect(SettingsManager.isSensitive(key)).toBe(true);
    });

    it.each(["LLM_PROVIDER", "OPEN_MODEL_PREF", "VECTOR_DB", "EMBEDDING_ENGINE"])(
      "treats %s as non-sensitive",
      (key) => {
        expect(SettingsManager.isSensitive(key)).toBe(false);
      },
    );

    it("exports the pattern used for detection", () => {
      expect(SENSITIVE_KEY_PATTERN.test("SOME_API_KEY")).toBe(true);
    });
  });

  describe("set", () => {
    it("encrypts sensitive values at rest and stores encrypted=true", async () => {
      prisma.managed_env_settings.upsert.mockResolvedValue({});
      await SettingsManager.set("OPEN_AI_KEY", "sk-secret", { userId: 7 });

      const args = prisma.managed_env_settings.upsert.mock.calls[0][0];
      expect(args.where).toEqual({ envKey: "OPEN_AI_KEY" });
      expect(args.create.encrypted).toBe(true);
      expect(args.create.value).toBe("enc(sk-secret)"); // never plaintext
      expect(process.env.OPEN_AI_KEY).toBe("sk-secret"); // runtime cache set
    });

    it("stores non-sensitive values in plaintext with encrypted=false", async () => {
      prisma.managed_env_settings.upsert.mockResolvedValue({});
      await SettingsManager.set("LLM_PROVIDER", "openai");

      const args = prisma.managed_env_settings.upsert.mock.calls[0][0];
      expect(args.create.encrypted).toBe(false);
      expect(args.create.value).toBe("openai");
    });

    it("redacts sensitive values in the audit log", async () => {
      prisma.managed_env_settings.upsert.mockResolvedValue({});
      await SettingsManager.set("ANTHROPIC_API_KEY", "sk-ant-123", { userId: 3 });

      const audit = prisma.settings_audit_log.create.mock.calls[0][0].data;
      expect(audit.redacted).toBe(true);
      expect(audit.newValue).toBe("***redacted***");
      expect(audit.userId).toBe(3);
      expect(audit.newValue).not.toContain("sk-ant-123");
    });

    it("records plaintext audit values for non-sensitive keys", async () => {
      prisma.managed_env_settings.upsert.mockResolvedValue({});
      await SettingsManager.set("VECTOR_DB", "lancedb");

      const audit = prisma.settings_audit_log.create.mock.calls[0][0].data;
      expect(audit.redacted).toBe(false);
      expect(audit.newValue).toBe("lancedb");
    });

    it("does not throw when the audit write fails", async () => {
      prisma.managed_env_settings.upsert.mockResolvedValue({});
      prisma.settings_audit_log.create.mockRejectedValue(new Error("boom"));
      await expect(SettingsManager.set("LLM_PROVIDER", "ollama")).resolves.toBe(true);
    });
  });

  describe("get", () => {
    it("decrypts sensitive values read from the DB", async () => {
      prisma.managed_env_settings.findUnique.mockResolvedValue({
        envKey: "OPEN_AI_KEY",
        value: "enc(sk-plain)",
        encrypted: true,
      });
      expect(await SettingsManager.get("OPEN_AI_KEY")).toBe("sk-plain");
    });

    it("returns plaintext for non-encrypted rows", async () => {
      prisma.managed_env_settings.findUnique.mockResolvedValue({
        envKey: "LLM_PROVIDER",
        value: "openai",
        encrypted: false,
      });
      expect(await SettingsManager.get("LLM_PROVIDER")).toBe("openai");
    });

    it("falls back to process.env when no DB row exists", async () => {
      prisma.managed_env_settings.findUnique.mockResolvedValue(null);
      process.env.FALLBACK_ONLY = "from-env";
      expect(await SettingsManager.get("FALLBACK_ONLY")).toBe("from-env");
      delete process.env.FALLBACK_ONLY;
    });

    it("serves repeated reads from cache without a second DB hit", async () => {
      prisma.managed_env_settings.findUnique.mockResolvedValue({
        envKey: "VECTOR_DB",
        value: "pgvector",
        encrypted: false,
      });
      await SettingsManager.get("VECTOR_DB");
      await SettingsManager.get("VECTOR_DB");
      expect(prisma.managed_env_settings.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe("persist", () => {
    it("writes every key in the map and returns the count", async () => {
      prisma.managed_env_settings.upsert.mockResolvedValue({});
      const count = await SettingsManager.persist(
        { LLM_PROVIDER: "openai", OPEN_AI_KEY: "sk-1" },
        { userId: 1 },
      );
      expect(count).toBe(2);
      expect(prisma.managed_env_settings.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("hydrate", () => {
    it("loads DB values (decrypting) into process.env", async () => {
      prisma.managed_env_settings.findMany.mockResolvedValue([
        { envKey: "LLM_PROVIDER", value: "anthropic", encrypted: false },
        { envKey: "ANTHROPIC_API_KEY", value: "enc(sk-ant)", encrypted: true },
      ]);
      const loaded = await SettingsManager.hydrate();
      expect(loaded).toBe(2);
      expect(process.env.LLM_PROVIDER).toBe("anthropic");
      expect(process.env.ANTHROPIC_API_KEY).toBe("sk-ant");
      delete process.env.ANTHROPIC_API_KEY;
    });

    it("is non-fatal when the table is missing (pre-migration)", async () => {
      prisma.managed_env_settings.findMany.mockRejectedValue(
        new Error("no such table"),
      );
      await expect(SettingsManager.hydrate()).resolves.toBe(0);
    });
  });
});
