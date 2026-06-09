// SPDX-License-Identifier: MIT
/* eslint-env jest */

process.env.OPEN_AI_KEY = process.env.OPEN_AI_KEY || "test-key";

const memoryModule = require("../../../../../utils/agents/aibitat/plugins/memory.js");
const { memory } = memoryModule;

function buildAibitat(overrides = {}) {
  return {
    caller: "test-caller",
    handlerProps: {
      invocation: {
        workspace: {
          slug: "ws-1",
          topN: 4,
          vectorSearchMode: "default",
        },
      },
      log: jest.fn(),
    },
    introspect: jest.fn(),
    ...overrides,
  };
}

function getPlugin() {
  return memory.plugin.call({ name: memory.name });
}

function setupAndGetConfig() {
  const aibitat = buildAibitat();
  aibitat.function = jest.fn();
  const plugin = getPlugin();
  plugin.setup(aibitat);
  return { aibitat, config: aibitat.function.mock.calls[0][0] };
}

describe("memory plugin — registration", () => {
  test("exports memory with expected name", () => {
    expect(memory.name).toBe("rag-memory");
  });

  test("startupConfig is defined and has empty params", () => {
    expect(memory.startupConfig).toBeDefined();
    expect(memory.startupConfig.params).toEqual({});
  });

  test("plugin() returns an object with name and setup", () => {
    const plugin = getPlugin();
    expect(plugin.name).toBe("rag-memory");
    expect(typeof plugin.setup).toBe("function");
  });

  test("setup registers a function with name 'rag-memory'", () => {
    const aibitat = buildAibitat();
    aibitat.function = jest.fn();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    const config = aibitat.function.mock.calls[0][0];
    expect(config.name).toBe("rag-memory");
  });

  test("registered config exposes tracker, description, examples, parameters", () => {
    const { config } = setupAndGetConfig();
    expect(config.tracker).toBeDefined();
    expect(typeof config.tracker.isDuplicate).toBe("function");
    expect(config.description).toMatch(/Search your local documents/);
    expect(Array.isArray(config.examples)).toBe(true);
    expect(config.examples.length).toBeGreaterThan(0);
    expect(config.parameters.properties.action.enum).toEqual(["search", "store"]);
    expect(config.parameters.additionalProperties).toBe(false);
  });

  test("registered config exposes handler, search, store", () => {
    const { config } = setupAndGetConfig();
    expect(typeof config.handler).toBe("function");
    expect(typeof config.search).toBe("function");
    expect(typeof config.store).toBe("function");
  });
});

describe("memory plugin — handler routing", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("short-circuits with the duplicate message when isDuplicate returns true", async () => {
    const { config } = setupAndGetConfig();
    config.tracker.isDuplicate = jest.fn().mockReturnValue({ isDuplicate: true });
    const result = await config.handler({ action: "search", content: "x" });
    expect(result).toMatch(/duplicated call/);
    expect(config.tracker.isDuplicate).toHaveBeenCalled();
  });

  test("returns 'nothing to do' message for unknown action", async () => {
    const { config } = setupAndGetConfig();
    config.tracker.isDuplicate = jest.fn().mockReturnValue({ isDuplicate: false });
    const result = await config.handler({ action: "bogus", content: "x" });
    expect(result).toBe("There was nothing to do.");
  });

  test("search action routes to search() and tracks the run", async () => {
    const { config } = setupAndGetConfig();
    config.tracker.isDuplicate = jest.fn().mockReturnValue({ isDuplicate: false });
    config.tracker.trackRun = jest.fn();
    const searchSpy = jest
      .spyOn(config, "search")
      .mockResolvedValue("search-result");
    const result = await config.handler({ action: "search", content: "q" });
    expect(searchSpy).toHaveBeenCalledWith("q");
    expect(result).toBe("search-result");
    expect(config.tracker.trackRun).toHaveBeenCalled();
  });

  test("store action routes to store() and tracks the run", async () => {
    const { config } = setupAndGetConfig();
    config.tracker.isDuplicate = jest.fn().mockReturnValue({ isDuplicate: false });
    config.tracker.trackRun = jest.fn();
    const storeSpy = jest
      .spyOn(config, "store")
      .mockResolvedValue("store-result");
    const result = await config.handler({ action: "store", content: "c" });
    expect(storeSpy).toHaveBeenCalledWith("c");
    expect(result).toBe("store-result");
    expect(config.tracker.trackRun).toHaveBeenCalled();
  });

  test("returns an error string if the handler throws", async () => {
    const { config } = setupAndGetConfig();
    config.tracker.isDuplicate = jest.fn().mockImplementation(() => {
      throw new Error("tracker-down");
    });
    const result = await config.handler({ action: "search", content: "q" });
    expect(result).toMatch(/There was an error while calling the function/);
  });
});

describe("memory plugin — search error path (real helpers)", () => {
  test("returns the error message when the underlying call throws", async () => {
    const { config, aibitat } = setupAndGetConfig();
    aibitat.handlerProps.invocation.workspace = null;
    const result = await config.search("q");
    expect(result).toMatch(
      /An error was raised while searching the vector database/,
    );
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
  });
});

describe("memory plugin — search with stubbed helpers (jest.isolateModules)", () => {
  // The plugin destructures getVectorDbClass / resolveProviderConnector from
  // helpers at require time, so we wrap each test in jest.isolateModules and
  // re-require the plugin after applying jest.spyOn on the helpers module.
  function withStubs(suite) {
    const helpers = require("../../../../../utils/helpers");
    if (suite.resolveProviderConnector) {
      jest
        .spyOn(helpers, "resolveProviderConnector")
        .mockResolvedValue(suite.resolveProviderConnector);
    }
    if (suite.getVectorDbClass) {
      jest.spyOn(helpers, "getVectorDbClass").mockReturnValue(suite.getVectorDbClass);
    }
  }

  function setupInsideIsolated(suite) {
    withStubs(suite);
    const mem = require("../../../../../utils/agents/aibitat/plugins/memory.js");
    const aibitat = {
      caller: "test-caller",
      handlerProps: {
        invocation: { workspace: suite.workspace || { slug: "ws-1" } },
        log: jest.fn(),
      },
      introspect: jest.fn(),
      function: jest.fn(),
    };
    const plugin = mem.memory.plugin.call({ name: mem.memory.name });
    plugin.setup(aibitat);
    return { aibitat, config: aibitat.function.mock.calls[0][0] };
  }

  test("returns the no-context message when search returns 0 results", async () => {
    let result;
    jest.isolateModules(() => {
      const suite = setupInsideIsolated({
        resolveProviderConnector: { connector: {} },
        getVectorDbClass: {
          performSimilaritySearch: jest
            .fn()
            .mockResolvedValue({ contextTexts: [] }),
        },
      });
      result = suite.config.search("query");
    });
    const r = await result;
    expect(r).toMatch(
      /There was no additional context found for that query/,
    );
  });

  test("returns combined context texts on success", async () => {
    let result;
    jest.isolateModules(() => {
      const suite = setupInsideIsolated({
        resolveProviderConnector: { connector: {} },
        getVectorDbClass: {
          performSimilaritySearch: jest
            .fn()
            .mockResolvedValue({ contextTexts: ["snippet A", "snippet B"] }),
        },
      });
      result = suite.config.search("query");
    });
    const r = await result;
    expect(r).toMatch(/Additional context for query/);
    expect(r).toMatch(/snippet A/);
    expect(r).toMatch(/snippet B/);
  });

  test("passes topN and rerank from workspace settings to the vector DB", async () => {
    let captured;
    jest.isolateModules(() => {
      const performSearch = jest
        .fn()
        .mockResolvedValue({ contextTexts: ["a"] });
      const suite = setupInsideIsolated({
        resolveProviderConnector: { connector: {} },
        getVectorDbClass: { performSimilaritySearch: performSearch },
        workspace: { slug: "ws-2", topN: 12, vectorSearchMode: "rerank" },
      });
      suite.config.search("q").then(() => {
        captured = performSearch.mock.calls[0][0];
      });
    });
    await new Promise((r) => setImmediate(r));
    expect(captured).toEqual(
      expect.objectContaining({
        namespace: "ws-2",
        input: "q",
        topN: 12,
        rerank: true,
      }),
    );
  });

  test("defaults topN to 4 when not set on workspace", async () => {
    let captured;
    jest.isolateModules(() => {
      const performSearch = jest
        .fn()
        .mockResolvedValue({ contextTexts: ["a"] });
      const suite = setupInsideIsolated({
        resolveProviderConnector: { connector: {} },
        getVectorDbClass: { performSimilaritySearch: performSearch },
        workspace: { slug: "ws-3" },
      });
      suite.config.search("q").then(() => {
        captured = performSearch.mock.calls[0][0];
      });
    });
    await new Promise((r) => setImmediate(r));
    expect(captured).toEqual(
      expect.objectContaining({ topN: 4, rerank: false }),
    );
  });

  test("handles missing contextTexts key gracefully", async () => {
    let result;
    jest.isolateModules(() => {
      const suite = setupInsideIsolated({
        resolveProviderConnector: { connector: {} },
        getVectorDbClass: {
          performSimilaritySearch: jest.fn().mockResolvedValue({}),
        },
      });
      result = suite.config.search("q");
    });
    const r = await result;
    expect(r).toMatch(/no additional context/);
  });
});

describe("memory plugin — store with stubbed helpers (jest.isolateModules)", () => {
  // Each test re-loads memory.js inside jest.isolateModules, so the uuid
  // spy must be re-applied there as well. The spy counter resets per call.
  function applyUuidSpy(n) {
    const uuid = require("uuid");
    jest
      .spyOn(uuid, "v4")
      .mockImplementation(() => `uuid-${++n}`);
    return n;
  }

  test("returns a success message and stores the document on success", async () => {
    let result, callArgs, introspectMock;
    jest.isolateModules(() => {
      applyUuidSpy(0);
      const helpers = require("../../../../../utils/helpers");
      const addDocumentToNamespace = jest
        .fn()
        .mockResolvedValue({ error: null });
      jest.spyOn(helpers, "getVectorDbClass").mockReturnValue({
        addDocumentToNamespace,
      });
      const mem = require("../../../../../utils/agents/aibitat/plugins/memory.js");
      const aibitat = {
        caller: "test-caller",
        handlerProps: {
          invocation: { workspace: { slug: "ws-1" } },
          log: jest.fn(),
        },
        introspect: jest.fn(),
        function: jest.fn(),
      };
      introspectMock = aibitat.introspect;
      const plugin = mem.memory.plugin.call({ name: mem.memory.name });
      plugin.setup(aibitat);
      const config = aibitat.function.mock.calls[0][0];
      result = config.store("hello world from agent").then((r) => {
        callArgs = addDocumentToNamespace.mock.calls[0];
        return r;
      });
    });
    const r = await result;
    expect(r).toMatch(/successfully embedded/);
    expect(callArgs[0]).toBe("ws-1");
    expect(callArgs[1]).toEqual(
      expect.objectContaining({
        url: "file://embed-via-agent.txt",
        title: "agent-memory.txt",
        docAuthor: "@agent",
        pageContent: "hello world from agent",
        wordCount: 4,
      }),
    );
    expect(callArgs[2]).toBeNull();
    expect(introspectMock).toHaveBeenCalled();
  });

  test("uses unique docId and id for each stored document", async () => {
    const calls = [];
    await new Promise((resolve) => {
      jest.isolateModules(() => {
        applyUuidSpy(0);
        const helpers = require("../../../../../utils/helpers");
        jest.spyOn(helpers, "getVectorDbClass").mockReturnValue({
          addDocumentToNamespace: jest.fn(async (ns, doc) => {
            calls.push(doc);
            return { error: null };
          }),
        });
        const mem = require("../../../../../utils/agents/aibitat/plugins/memory.js");
        const aibitat = {
          caller: "test-caller",
          handlerProps: {
            invocation: { workspace: { slug: "ws-1" } },
            log: jest.fn(),
          },
          introspect: jest.fn(),
          function: jest.fn(),
        };
        const plugin = mem.memory.plugin.call({ name: mem.memory.name });
        plugin.setup(aibitat);
        const config = aibitat.function.mock.calls[0][0];
        config
          .store("first")
          .then(() => config.store("second"))
          .then(() => resolve());
      });
    });
    expect(calls[0].docId).toBe("uuid-1");
    expect(calls[0].id).toBe("uuid-2");
    expect(calls[1].docId).toBe("uuid-3");
    expect(calls[1].id).toBe("uuid-4");
  });

  test("returns a failure message when the vector DB returns an error", async () => {
    let result, introspectMock;
    jest.isolateModules(() => {
      applyUuidSpy(0);
      const helpers = require("../../../../../utils/helpers");
      jest.spyOn(helpers, "getVectorDbClass").mockReturnValue({
        addDocumentToNamespace: jest
          .fn()
          .mockResolvedValue({ error: "vector down" }),
      });
      const mem = require("../../../../../utils/agents/aibitat/plugins/memory.js");
      const aibitat = {
        caller: "test-caller",
        handlerProps: {
          invocation: { workspace: { slug: "ws-1" } },
          log: jest.fn(),
        },
        introspect: jest.fn(),
        function: jest.fn(),
      };
      introspectMock = aibitat.introspect;
      const plugin = mem.memory.plugin.call({ name: mem.memory.name });
      plugin.setup(aibitat);
      const config = aibitat.function.mock.calls[0][0];
      result = config.store("payload");
    });
    const r = await result;
    expect(r).toMatch(/failed to be embedded/);
    expect(introspectMock).not.toHaveBeenCalled();
  });

  test("returns an error message when the store throws", async () => {
    let result, logMock;
    jest.isolateModules(() => {
      applyUuidSpy(0);
      const helpers = require("../../../../../utils/helpers");
      jest.spyOn(helpers, "getVectorDbClass").mockReturnValue({
        addDocumentToNamespace: jest.fn().mockRejectedValue(new Error("kaboom")),
      });
      const mem = require("../../../../../utils/agents/aibitat/plugins/memory.js");
      const aibitat = {
        caller: "test-caller",
        handlerProps: {
          invocation: { workspace: { slug: "ws-1" } },
          log: jest.fn(),
        },
        introspect: jest.fn(),
        function: jest.fn(),
      };
      logMock = aibitat.handlerProps.log;
      const plugin = mem.memory.plugin.call({ name: mem.memory.name });
      plugin.setup(aibitat);
      const config = aibitat.function.mock.calls[0][0];
      result = config.store("payload");
    });
    const r = await result;
    expect(r).toMatch(
      /An error was raised while storing data in the vector database/,
    );
    expect(logMock).toHaveBeenCalled();
  });

  test("estimates wordCount from whitespace split", async () => {
    const captured = [];
    await new Promise((resolve) => {
      jest.isolateModules(() => {
        applyUuidSpy(0);
        const helpers = require("../../../../../utils/helpers");
        jest.spyOn(helpers, "getVectorDbClass").mockReturnValue({
          addDocumentToNamespace: jest.fn(async (ns, doc) => {
            captured.push(doc);
            return { error: null };
          }),
        });
        const mem = require("../../../../../utils/agents/aibitat/plugins/memory.js");
        const aibitat = {
          caller: "test-caller",
          handlerProps: {
            invocation: { workspace: { slug: "ws-1" } },
            log: jest.fn(),
          },
          introspect: jest.fn(),
          function: jest.fn(),
        };
        const plugin = mem.memory.plugin.call({ name: mem.memory.name });
        plugin.setup(aibitat);
        const config = aibitat.function.mock.calls[0][0];
        config.store("one two three four five").then(() => resolve());
      });
    });
    expect(captured[0].wordCount).toBe(5);
  });

  test("includes a 'published' timestamp", async () => {
    const captured = [];
    await new Promise((resolve) => {
      jest.isolateModules(() => {
        applyUuidSpy(0);
        const helpers = require("../../../../../utils/helpers");
        jest.spyOn(helpers, "getVectorDbClass").mockReturnValue({
          addDocumentToNamespace: jest.fn(async (ns, doc) => {
            captured.push(doc);
            return { error: null };
          }),
        });
        const mem = require("../../../../../utils/agents/aibitat/plugins/memory.js");
        const aibitat = {
          caller: "test-caller",
          handlerProps: {
            invocation: { workspace: { slug: "ws-1" } },
            log: jest.fn(),
          },
          introspect: jest.fn(),
          function: jest.fn(),
        };
        const plugin = mem.memory.plugin.call({ name: mem.memory.name });
        plugin.setup(aibitat);
        const config = aibitat.function.mock.calls[0][0];
        config.store("x").then(() => resolve());
      });
    });
    expect(typeof captured[0].published).toBe("string");
    expect(captured[0].published.length).toBeGreaterThan(0);
  });
});
