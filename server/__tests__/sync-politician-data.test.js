// SPDX-License-Identifier: MIT
/**
 * Tests for sync-politician-data job helpers (#21).
 *
 * The sync job is a Bree worker script, so we test the pure helper functions
 * that are independently testable (retry, log wrapper, speech deduplication
 * key generation) by re-implementing/importing them in isolation.
 */

"use strict";

// ── withRetry — re-implemented here for pure unit testing ────────────────────

async function withRetry(fn, maxAttempts = 3, baseDelayMs = 10) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts)
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
    }
  }
  throw lastErr;
}

// ── determineSittingsToSync pure logic ───────────────────────────────────────

function determineSittingsFromIndex(index, lastSitting, sittingsPerRun) {
  if (index.length > 0) {
    const available = index
      .map((s) => s.sitting)
      .filter((n) => n > lastSitting)
      .sort((a, b) => a - b)
      .slice(0, sittingsPerRun);
    if (available.length > 0) return available;
  }
  const base = lastSitting > 0 ? lastSitting + 1 : 180;
  return Array.from({ length: sittingsPerRun }, (_, i) => base + i);
}

// ── dedupeKey construction ───────────────────────────────────────────────────

function buildDedupeKey(speech) {
  return `${speech.session}-${speech.sitting}-${speech.speakerName}-${speech.text.slice(0, 100)}`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("sync-politician-data: withRetry", () => {
  test("resolves on first attempt when fn succeeds", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    await expect(withRetry(fn, 3, 0)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("retries on failure and resolves on second attempt", async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(async () => {
      calls++;
      if (calls < 2) throw new Error("transient");
      return "recovered";
    });
    await expect(withRetry(fn, 3, 0)).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("throws after maxAttempts exhausted", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("permanent"));
    await expect(withRetry(fn, 3, 0)).rejects.toThrow("permanent");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("honours custom maxAttempts", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("fail"));
    await expect(withRetry(fn, 5, 0)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(5);
  });
});

describe("sync-politician-data: determineSittingsFromIndex", () => {
  test("picks next N sittings after lastSitting from index", () => {
    const index = [
      { sitting: 200 },
      { sitting: 201 },
      { sitting: 202 },
      { sitting: 203 },
    ];
    expect(determineSittingsFromIndex(index, 200, 2)).toEqual([201, 202]);
  });

  test("returns fallback window when all index sittings are already synced", () => {
    const index = [{ sitting: 100 }, { sitting: 101 }];
    // lastSitting is 101 — nothing left in index
    const result = determineSittingsFromIndex(index, 101, 3);
    // Fallback: base = 102, returns [102, 103, 104]
    expect(result).toEqual([102, 103, 104]);
  });

  test("uses base=180 when lastSitting is 0 (no prior syncs)", () => {
    const result = determineSittingsFromIndex([], 0, 3);
    expect(result).toEqual([180, 181, 182]);
  });

  test("respects sittingsPerRun limit", () => {
    const index = Array.from({ length: 20 }, (_, i) => ({
      sitting: i + 1,
    }));
    expect(determineSittingsFromIndex(index, 0, 5)).toHaveLength(5);
  });

  test("sorts ascending even when index is unsorted", () => {
    const index = [
      { sitting: 205 },
      { sitting: 201 },
      { sitting: 203 },
    ];
    expect(determineSittingsFromIndex(index, 200, 3)).toEqual([201, 203, 205]);
  });
});

describe("sync-politician-data: buildDedupeKey", () => {
  const baseSpeech = {
    session: 20,
    sitting: 150,
    speakerName: "Alice Muster",
    text: "Dies ist eine Rede ueber die Lage der Nation. " + "a".repeat(200),
  };

  test("is deterministic for the same speech", () => {
    expect(buildDedupeKey(baseSpeech)).toBe(buildDedupeKey(baseSpeech));
  });

  test("differs for different sittings", () => {
    const a = { ...baseSpeech, sitting: 150 };
    const b = { ...baseSpeech, sitting: 151 };
    expect(buildDedupeKey(a)).not.toBe(buildDedupeKey(b));
  });

  test("differs for different speakers", () => {
    const a = { ...baseSpeech, speakerName: "Alice Muster" };
    const b = { ...baseSpeech, speakerName: "Bob Beispiel" };
    expect(buildDedupeKey(a)).not.toBe(buildDedupeKey(b));
  });

  test("truncates text to first 100 chars for dedup", () => {
    // Two speeches that differ only after char 100 should share the same key
    const prefix = "a".repeat(100);
    const a = { ...baseSpeech, text: prefix + "UNIQUE_A" };
    const b = { ...baseSpeech, text: prefix + "UNIQUE_B" };
    expect(buildDedupeKey(a)).toBe(buildDedupeKey(b));
  });
});

// ── Regression: Prisma model shape matches sync job expectations ───────────────
//
// We verify the generated Prisma schema via the DMMF (Data Model Meta Format)
// embedded in the compiled client artefact.  We import from the internal
// `.prisma/client` barrel rather than `@prisma/client` because the Jest
// moduleNameMapper replaces `@prisma/client` with a lightweight mock and
// jest.requireActual() does NOT bypass moduleNameMapper.

describe("sync-politician-data: Prisma model mapping", () => {
  // Build the field-name set once for both tests.
  let dmmfModels;
  beforeAll(() => {
    // Resolve the path at runtime so Jest doesn't try to map it.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dmmf = require(
      require.resolve(".prisma/client/default.js", {
        paths: [require.resolve("@prisma/client/package.json").replace("/package.json", "")],
      }),
    );
    dmmfModels = dmmf.Prisma.dmmf.datamodel.models;
  });

  test("politician_speeches model has the fields required by the sync job", () => {
    // Regression for Issue #172: code used prisma.politician_speech (singular)
    // which does not exist; the generated model is politician_speeches (plural).
    const model = dmmfModels.find((m) => m.name === "politician_speeches");
    expect(model).toBeDefined();

    const fieldNames = new Set(model.fields.map((f) => f.name));
    const expectedFields = [
      "dedupeKey",
      "politicianId",
      "speakerName",
      "speakerParty",
      "speechText",
      "speechTitle",
      "speechDate",
      "session",
      "sitting",
      "pageNumbers",
      "documentUrl",
      "matchConfidence",
      "updatedAt",
    ];
    for (const field of expectedFields) {
      expect(fieldNames).toContain(field);
    }
  });

  test("politician_speech (singular) is NOT a valid model", () => {
    const singularModel = dmmfModels.find(
      (m) => m.name === "politician_speech",
    );
    expect(singularModel).toBeUndefined();
  });
});
