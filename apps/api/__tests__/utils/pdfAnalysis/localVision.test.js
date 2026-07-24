// SPDX-License-Identifier: MIT
/* eslint-env jest */
const path = require("path");

const MODULE_PATH = path.resolve(
  __dirname,
  "../../../utils/pdfAnalysis/localVision.js"
);

function loadModule() {
  jest.resetModules();
  return require(MODULE_PATH);
}

function stubFetch(impl) {
  globalThis.fetch = impl;
}

function ollamaUpWithModel() {
  stubFetch(async (url) => {
    if (String(url).endsWith("/api/tags")) {
      return { json: async () => ({ models: [{ name: "minicpm-v:latest" }] }) };
    }
    if (String(url).endsWith("/api/generate")) {
      return { ok: true, json: async () => ({ response: "Hello image" }) };
    }
    throw new Error("unexpected url: " + url);
  });
}

function ollamaDown() {
  stubFetch(async () => {
    throw new Error("ECONNREFUSED");
  });
}

function ollamaUpMissingModel() {
  stubFetch(async (url) => {
    if (String(url).endsWith("/api/tags")) {
      return { json: async () => ({ models: [{ name: "llama3:latest" }] }) };
    }
    throw new Error("not used");
  });
}

afterEach(() => {
  delete globalThis.fetch;
});

describe("localVision circuit breaker", () => {
  test("cold start: Ollama up + model installed → isAvailable returns true", async () => {
    const { isAvailable, reset } = loadModule();
    reset();
    ollamaUpWithModel();
    await expect(isAvailable()).resolves.toBe(true);
  });

  test("transient blip: one failure, then success after cache TTL → recovers", async () => {
    const mod1 = loadModule();
    mod1.reset();
    ollamaDown();
    await expect(mod1.isAvailable()).resolves.toBe(false);

    // Simulate 60s cache expiry by reloading module (wipes module state)
    const mod2 = loadModule();
    ollamaUpWithModel();
    await expect(mod2.isAvailable()).resolves.toBe(true);
  });

  test("Ollama down: 4 failures do not open the breaker yet", async () => {
    for (let i = 0; i < 4; i++) {
      const { isAvailable, reset } = loadModule();
      reset();
      ollamaDown();
      await expect(isAvailable()).resolves.toBe(false);
    }
  });

  test("Ollama down: 5th failure opens the breaker; 6th call short-circuits without fetch", async () => {
    const { isAvailable, reset } = loadModule();
    reset();
    let fetchCount = 0;
    stubFetch(async () => {
      fetchCount++;
      throw new Error("ECONNREFUSED");
    });

    // 5 failures on the SAME module instance. reset() between calls wipes
    // the 60s availability cache so each call actually reaches fetch().
    for (let i = 0; i < 5; i++) {
      reset();
      await isAvailable();
    }
    expect(fetchCount).toBe(5);

    // 6th call: breaker is now open (failureCount=5, lastFailureAt≈now).
    // Must short-circuit to false WITHOUT calling fetch again.
    const before = fetchCount;
    await expect(isAvailable()).resolves.toBe(false);
    expect(fetchCount).toBe(before);
  });

  test("generate() success path returns the model response", async () => {
    const { generate, reset } = loadModule();
    reset();
    ollamaUpWithModel();
    const out = await generate(
      [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
      "sys",
      "usr"
    );
    expect(out).toBe("Hello image");
  });

  test("generate() HTTP 500 → 5 failures open the breaker; next isAvailable short-circuits", async () => {
    stubFetch(async (url) => {
      if (String(url).endsWith("/api/tags")) {
        return { json: async () => ({ models: [{ name: "minicpm-v:latest" }] }) };
      }
      return { ok: false, status: 500, text: async () => "internal" };
    });

    const { isAvailable, generate, reset } = loadModule();
    reset();
    await isAvailable(); // first probe: ok, breaker closed

    for (let i = 0; i < 5; i++) {
      const r = await generate([Buffer.from([0x89])], "sys", "usr");
      expect(r).toBeNull();
    }

    // Now the breaker is open. Stub a fresh fetch and confirm isAvailable
    // does NOT probe /api/tags (open-circuit short-circuit).
    let probes = 0;
    stubFetch(async (url) => {
      if (String(url).endsWith("/api/tags")) probes++;
      return { json: async () => ({ models: [{ name: "minicpm-v:latest" }] }) };
    });
    await expect(isAvailable()).resolves.toBe(false);
    expect(probes).toBe(0);
  });

  test("model missing (Ollama up, wrong model) does NOT count toward the breaker", async () => {
    for (let i = 0; i < 10; i++) {
      const { isAvailable, reset } = loadModule();
      reset();
      ollamaUpMissingModel();
      await expect(isAvailable()).resolves.toBe(false);
    }
    // After 10 missing-model probes, breaker is still closed (failureCount=0).
    // A real outage should still be detected normally.
    const { isAvailable, reset } = loadModule();
    reset();
    ollamaDown();
    await expect(isAvailable()).resolves.toBe(false);
  });

  test("reset() wipes cache and breaker state", async () => {
    const { isAvailable, reset } = loadModule();
    ollamaDown();
    await isAvailable();
    await isAvailable(); // cache hit, no fetch
    reset();
    let fetched = false;
    stubFetch(async () => {
      fetched = true;
      throw new Error("ECONNREFUSED");
    });
    await isAvailable();
    expect(fetched).toBe(true);
  });

  test("module exports include reset, isAvailable, generate, OLLAMA_MODEL", () => {
    const mod = loadModule();
    expect(typeof mod.reset).toBe("function");
    expect(typeof mod.isAvailable).toBe("function");
    expect(typeof mod.generate).toBe("function");
    expect(typeof mod.OLLAMA_MODEL).toBe("string");
  });
});
