// SPDX-License-Identifier: MIT
/**
 * Tests for the LOCAL_PROVIDERS registry and graceful API-key handling
 * (issue #116). Verifies that every local agent provider falls back to a
 * non-empty placeholder so the OpenAI SDK does NOT throw
 * "Missing credentials" on the @agent path.
 */

const path = require("path");
const fs = require("fs");

const {
  LOCAL_PROVIDERS,
  getProviderKeyStatuses,
  hasRealKey,
} = require("../../utils/providerKeyStatus");

const AGENT_PROVIDER_FILES = [
  "nvidiaNim.js",
  "dockerModelRunner.js",
];

const AGENT_PROVIDER_DIR = path.resolve(
  __dirname,
  "../../utils/agents/aibitat/providers",
);

const AIPROVIDER_INDEX = path.resolve(
  __dirname,
  "../../utils/agents/aibitat/providers/ai-provider.js",
);

describe("providerKeyStatus registry", () => {
  test("registers every local agent provider that needs the placeholder", () => {
    const ids = LOCAL_PROVIDERS.map((p) => p.provider);
    expect(ids).toEqual(
      expect.arrayContaining([
        "nvidia-nim",
        "docker-model-runner",
      ]),
    );
  });

  test("every entry has non-empty placeholder, envKey, and basePathKey", () => {
    for (const p of LOCAL_PROVIDERS) {
      expect(typeof p.provider).toBe("string");
      expect(p.provider.length).toBeGreaterThan(0);
      expect(p.placeholder).toBeTruthy();
      expect(p.envKey).toBeTruthy();
      expect(p.basePathKey).toBeTruthy();
    }
  });

  test("getProviderKeyStatuses reports 2 providers", () => {
    const statuses = getProviderKeyStatuses();
    expect(statuses).toHaveLength(2);
  });

  test("hasRealKey rejects empty/null/undefined", () => {
    expect(hasRealKey(undefined)).toBe(false);
    expect(hasRealKey(null)).toBe(false);
    expect(hasRealKey("")).toBe(false);
    expect(hasRealKey("   ")).toBe(false);
    expect(hasRealKey("sk-abc")).toBe(true);
  });
});

describe("agent provider placeholder fallback (issue #116)", () => {
  test.each(AGENT_PROVIDER_FILES)(
    "%s does NOT pass apiKey: null to the OpenAI SDK",
    (file) => {
      const src = fs.readFileSync(path.join(AGENT_PROVIDER_DIR, file), "utf8");
      // Look for `apiKey: null` or `apiKey: undefined` patterns in the
      // constructor body. Allow `||` fallbacks, `??` fallbacks, and
      // explicit placeholder strings.
      const newClient = src.match(/new OpenAI\(\s*\{([\s\S]*?)\}\s*\)/);
      expect(newClient).not.toBeNull();
      const block = newClient[1];
      const apiKeyLine = block.match(/apiKey\s*:\s*([^\n,]+)/);
      expect(apiKeyLine).not.toBeNull();
      const value = apiKeyLine[1].trim();
      // Reject raw null/undefined; require either a ternary fallback
      // (process.env[…] || "x", process.env[…] ?? "x") or a literal string.
      expect(value).not.toMatch(/^null$/);
      expect(value).not.toMatch(/^undefined$/);
    },
  );

  test("ai-provider.js switch covers every LOCAL_PROVIDERS entry with a non-null apiKey", () => {
    const src = fs.readFileSync(AIPROVIDER_INDEX, "utf8");
    for (const p of LOCAL_PROVIDERS) {
      // The dispatch case label uses hyphenated ids like "docker-model-runner"
      // and "nvidia-nim", while the registry stores the same id. Match the
      // case label and the apiKey assignment that follows.
      const caseRe = new RegExp(
        `case\\s*"${p.provider}"\\s*:[\\s\\S]{0,400}?apiKey\\s*:\\s*([^\\n,]+)`,
      );
      const m = src.match(caseRe);
      expect(m).not.toBeNull();
      const value = m[1].trim();
      expect(value).not.toMatch(/^null$/);
      expect(value).not.toMatch(/^undefined$/);
    }
  });
});
