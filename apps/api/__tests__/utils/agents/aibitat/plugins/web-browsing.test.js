// SPDX-License-Identifier: MIT
/* eslint-env jest */

const { webBrowsing } = require("../../../../../utils/agents/aibitat/plugins/web-browsing.js");
const { SystemSettings } = require("../../../../../models/systemSettings");

function buildAibitat() {
  return {
    introspect: jest.fn(),
    handlerProps: { log: jest.fn() },
    addCitation: jest.fn(),
  };
}

function getPlugin() {
  return webBrowsing.plugin.call({ name: webBrowsing.name });
}

function setupAndGetCtx() {
  const aibitat = buildAibitat();
  const fn = jest.fn();
  aibitat.function = fn;
  const plugin = getPlugin();
  plugin.setup(aibitat);
  // The function() call passed config as the only arg.
  const config = fn.mock.calls[0][0];
  // Build a self-bound context so the inner functions have a working `this`.
  return { aibitat, config, fn };
}

describe("web-browsing plugin — registration", () => {
  test("exports webBrowsing with expected name", () => {
    expect(webBrowsing.name).toBe("web-browsing");
  });

  test("startupConfig is defined and has empty params", () => {
    expect(webBrowsing.startupConfig).toBeDefined();
    expect(webBrowsing.startupConfig.params).toEqual({});
  });

  test("plugin() returns an object with a setup function and a name", () => {
    const plugin = getPlugin();
    expect(plugin.name).toBe("web-browsing");
    expect(typeof plugin.setup).toBe("function");
  });

  test("setup calls aibitat.function with the expected name", () => {
    const aibitat = buildAibitat();
    aibitat.function = jest.fn();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    expect(aibitat.function).toHaveBeenCalledTimes(1);
    const config = aibitat.function.mock.calls[0][0];
    expect(config.name).toBe("web-browsing");
  });

  test("registered config exposes description, examples, parameters, and key handlers", () => {
    const { config } = setupAndGetCtx();
    expect(config.description).toMatch(/Search the internet/);
    expect(Array.isArray(config.examples)).toBe(true);
    expect(config.examples.length).toBeGreaterThan(0);
    expect(config.parameters.properties.query).toBeDefined();
    expect(config.parameters.properties.query.type).toBe("string");
    expect(config.parameters.additionalProperties).toBe(false);
    expect(typeof config.handler).toBe("function");
    expect(typeof config.search).toBe("function");
    expect(typeof config.middleTruncate).toBe("function");
    expect(typeof config.reportSearchResultsCitations).toBe("function");
    // Search engines
    for (const engine of [
      "_serpApi",
      "_searchApi",
      "_serperDotDev",
      "_bingWebSearch",
      "_baiduSearch",
      "_serplyEngine",
      "_searXNGEngine",
      "_tavilySearch",
      "_duckDuckGoEngine",
      "_exaSearch",
      "_perplexitySearch",
    ]) {
      expect(typeof config[engine]).toBe("function");
    }
  });
});

describe("web-browsing plugin — middleTruncate", () => {
  test("returns the string unchanged when shorter than length", () => {
    const { config } = setupAndGetCtx();
    expect(config.middleTruncate("abc", 5)).toBe("abc");
  });

  test("returns the string unchanged when exactly length", () => {
    const { config } = setupAndGetCtx();
    expect(config.middleTruncate("abcde", 5)).toBe("abcde");
  });

  test("truncates with ellipsis and preserves end when longer than length", () => {
    const { config } = setupAndGetCtx();
    expect(config.middleTruncate("abcdefghij", 5)).toBe("abcde...fghij");
  });

  test("defaults length to 5", () => {
    const { config } = setupAndGetCtx();
    expect(config.middleTruncate("1234567890")).toBe("12345...67890");
  });
});

describe("web-browsing plugin — reportSearchResultsCitations", () => {
  test("ignores non-array input", () => {
    const { config, aibitat } = setupAndGetCtx();
    config.reportSearchResultsCitations(null);
    config.reportSearchResultsCitations("not an array");
    expect(aibitat.addCitation).not.toHaveBeenCalled();
  });

  test("pushes citation for each result with title/link/snippet", () => {
    const { config, aibitat } = setupAndGetCtx();
    config.reportSearchResultsCitations([
      { title: "T1", link: "https://a.com", snippet: "S1" },
      { title: "T2", link: "https://b.com", snippet: "S2" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalledTimes(1);
    const arg = aibitat.addCitation.mock.calls[0][0];
    expect(arg).toHaveLength(2);
    expect(arg[0]).toMatchObject({
      id: "https://a.com",
      title: "T1",
      text: "S1",
      chunkSource: "link://https://a.com",
    });
  });

  test("falls back to alternative URL fields when link missing", () => {
    const { config, aibitat } = setupAndGetCtx();
    config.reportSearchResultsCitations([
      { title: "T1", url: "https://b.com", description: "S1" },
      { title: "T2", website: "https://c.com", text: "S2" },
    ]);
    const arg = aibitat.addCitation.mock.calls[0][0];
    expect(arg[0].id).toBe("https://b.com");
    expect(arg[0].chunkSource).toBe("link://https://b.com");
    expect(arg[1].id).toBe("https://c.com");
    expect(arg[1].chunkSource).toBe("link://https://c.com");
    expect(arg[0].text).toBe("S1");
    expect(arg[1].text).toBe("S2");
  });

  test("uses link_clean fallback when no other URL field is present", () => {
    const { config, aibitat } = setupAndGetCtx();
    config.reportSearchResultsCitations([
      { title: "P", link_clean: "https://shop.com/x", snippet: "snip" },
    ]);
    const arg = aibitat.addCitation.mock.calls[0][0];
    expect(arg[0].id).toBe("https://shop.com/x");
    expect(arg[0].chunkSource).toBe("link://https://shop.com/x");
  });

  test("score is always null", () => {
    const { config, aibitat } = setupAndGetCtx();
    config.reportSearchResultsCitations([
      { title: "T", link: "https://a", snippet: "S" },
    ]);
    const arg = aibitat.addCitation.mock.calls[0][0];
    expect(arg[0].score).toBeNull();
  });
});

describe("web-browsing plugin — provider routing", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    delete process.env.AGENT_SERPAPI_API_KEY;
    delete process.env.AGENT_SEARCHAPI_API_KEY;
    delete process.env.AGENT_SERPER_DEV_KEY;
    delete process.env.AGENT_BING_SEARCH_API_KEY;
    delete process.env.AGENT_BAIDU_SEARCH_API_KEY;
    delete process.env.AGENT_SERPLY_API_KEY;
    delete process.env.AGENT_SEARXNG_API_URL;
    delete process.env.AGENT_TAVILY_API_KEY;
    delete process.env.AGENT_EXA_API_KEY;
    delete process.env.AGENT_PERPLEXITY_API_KEY;
  });

  test("search() falls back to DuckDuckGo when no provider is configured", async () => {
    jest
      .spyOn(SystemSettings, "get")
      .mockResolvedValue({ value: "unknown" });
    const { config } = setupAndGetCtx();
    const ddgSpy = jest
      .spyOn(config, "_duckDuckGoEngine")
      .mockResolvedValue("ddg-result");
    const out = await config.search("hi");
    expect(ddgSpy).toHaveBeenCalledWith("hi");
    expect(out).toBe("ddg-result");
  });

  test.each([
    ["serpapi", "_serpApi"],
    ["searchapi", "_searchApi"],
    ["serper-dot-dev", "_serperDotDev"],
    ["bing-search", "_bingWebSearch"],
    ["baidu-search", "_baiduSearch"],
    ["serply-engine", "_serplyEngine"],
    ["searxng-engine", "_searXNGEngine"],
    ["tavily-search", "_tavilySearch"],
    ["duckduckgo-engine", "_duckDuckGoEngine"],
    ["exa-search", "_exaSearch"],
    ["perplexity-search", "_perplexitySearch"],
  ])("routes %s provider to %s engine", async (providerValue, engineName) => {
    jest
      .spyOn(SystemSettings, "get")
      .mockResolvedValue({ value: providerValue });
    const { config } = setupAndGetCtx();
    const spy = jest
      .spyOn(config, engineName)
      .mockResolvedValue("ok");
    const out = await config.search("test");
    expect(spy).toHaveBeenCalledWith("test");
    expect(out).toBe("ok");
  });

  test("handler returns 'nothing we can do' when query is empty", async () => {
    const { config } = setupAndGetCtx();
    const result = await config.handler({ query: "" });
    expect(result).toBe(
      "There is nothing we can do. This function call returns no information.",
    );
  });

  test("handler returns search() result for a query", async () => {
    const { config } = setupAndGetCtx();
    jest
      .spyOn(SystemSettings, "get")
      .mockResolvedValue({ value: "duckduckgo-engine" });
    jest
      .spyOn(config, "_duckDuckGoEngine")
      .mockResolvedValue("ok");
    const result = await config.handler({ query: "q" });
    expect(result).toBe("ok");
  });

  test("handler returns error message on throw", async () => {
    const { config } = setupAndGetCtx();
    jest
      .spyOn(SystemSettings, "get")
      .mockImplementation(() => {
        throw new Error("DB down");
      });
    const result = await config.handler({ query: "q" });
    expect(result).toMatch(/Let the user know this was the error: DB down/);
  });
});

describe("web-browsing plugin — search engine guard rails", () => {
  let originalEnv;
  beforeEach(() => {
    jest.restoreAllMocks();
    originalEnv = { ...process.env };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  test("_serpApi reports disabled when API key is missing", async () => {
    delete process.env.AGENT_SERPAPI_API_KEY;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._serpApi("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_searchApi reports disabled when API key is missing", async () => {
    delete process.env.AGENT_SEARCHAPI_API_KEY;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._searchApi("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_serperDotDev reports disabled when API key is missing", async () => {
    delete process.env.AGENT_SERPER_DEV_KEY;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._serperDotDev("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_bingWebSearch reports disabled when API key is missing", async () => {
    delete process.env.AGENT_BING_SEARCH_API_KEY;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._bingWebSearch("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_baiduSearch reports disabled when API key is missing", async () => {
    delete process.env.AGENT_BAIDU_SEARCH_API_KEY;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._baiduSearch("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_serplyEngine reports disabled when API key is missing", async () => {
    delete process.env.AGENT_SERPLY_API_KEY;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._serplyEngine("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_searXNGEngine reports disabled when URL is missing", async () => {
    delete process.env.AGENT_SEARXNG_API_URL;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._searXNGEngine("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_searXNGEngine reports disabled when URL is invalid", async () => {
    process.env.AGENT_SEARXNG_API_URL = "not-a-url";
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._searXNGEngine("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_tavilySearch reports disabled when API key is missing", async () => {
    delete process.env.AGENT_TAVILY_API_KEY;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._tavilySearch("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_exaSearch reports disabled when API key is missing", async () => {
    delete process.env.AGENT_EXA_API_KEY;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._exaSearch("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_perplexitySearch reports disabled when API key is missing", async () => {
    delete process.env.AGENT_PERPLEXITY_API_KEY;
    const { config, aibitat } = setupAndGetCtx();
    const out = await config._perplexitySearch("q");
    expect(out).toMatch(/Search is disabled/);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("_serpApi returns 'no information' when data is empty", async () => {
    process.env.AGENT_SERPAPI_API_KEY = "test-key";
    process.env.AGENT_SERPAPI_ENGINE = "google";
    const { config } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    const out = await config._serpApi("q");
    expect(out).toMatch(/No information was found online/);
    fetchMock.mockRestore();
  });

  test("_serpApi returns error message on network failure", async () => {
    process.env.AGENT_SERPAPI_API_KEY = "test-key";
    process.env.AGENT_SERPAPI_ENGINE = "google";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: false, status: 500, statusText: "Internal" });
    const out = await config._serpApi("q");
    expect(out).toMatch(/There was an error searching/);
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_serpApi Google branch builds result with knowledge_graph/answer_box/organic", async () => {
    process.env.AGENT_SERPAPI_API_KEY = "test-key";
    process.env.AGENT_SERPAPI_ENGINE = "google";
    const { config, aibitat } = setupAndGetCtx();
    const responseBody = {
      knowledge_graph: { title: "KG" },
      answer_box: { answer: "42" },
      organic_results: [
        { title: "R1", link: "https://a", snippet: "s1" },
      ],
      local_results: [
        { title: "L1", rating: 4.5, reviews: 10, description: "d", address: "addr", website: "w", extensions: [] },
      ],
    };
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => responseBody });
    const out = await config._serpApi("q");
    const parsed = JSON.parse(out);
    expect(parsed.length).toBe(4);
    expect(parsed[0]).toEqual({ title: "KG" });
    expect(parsed[1]).toEqual({ answer: "42" });
    expect(parsed[2]).toMatchObject({ title: "R1", link: "https://a", snippet: "s1" });
    expect(parsed[3]).toMatchObject({ title: "L1", rating: 4.5 });
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_bingWebSearch returns 'no information' on empty results", async () => {
    process.env.AGENT_BING_SEARCH_API_KEY = "test-key";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({ webPages: { value: [] } }) });
    const out = await config._bingWebSearch("q");
    expect(out).toMatch(/No information was found online/);
    expect(aibitat.handlerProps.log).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_bingWebSearch returns formatted results on success", async () => {
    process.env.AGENT_BING_SEARCH_API_KEY = "test-key";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          webPages: {
            value: [
              { name: "T1", url: "https://a", snippet: "S1" },
            ],
          },
        }),
      });
    const out = await config._bingWebSearch("q");
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { title: "T1", link: "https://a", snippet: "S1" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_bingWebSearch swallows fetch errors and returns 'no information'", async () => {
    process.env.AGENT_BING_SEARCH_API_KEY = "test-key";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("network"));
    const out = await config._bingWebSearch("q");
    expect(out).toMatch(/No information was found online/);
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_duckDuckGoEngine returns error message on non-OK response", async () => {
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: false, status: 500, statusText: "ServerError" });
    const out = await config._duckDuckGoEngine("q");
    expect(out).toMatch(/There was an error searching DuckDuckGo/);
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_duckDuckGoEngine parses results and reports citations", async () => {
    const { config, aibitat } = setupAndGetCtx();
    const html = `
      <html><body>
        <div class="result results_links results_links_dead">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com">Title A</a>
          <a class="result__snippet">Snippet A</a>
        </div>
      </body></html>
    `;
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, text: async () => html });
    const out = await config._duckDuckGoEngine("q");
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { title: "Title A", link: "https://example.com", snippet: "Snippet A" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_duckDuckGoEngine returns 'no information' on empty parsed results", async () => {
    const { config } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, text: async () => "<html></html>" });
    const out = await config._duckDuckGoEngine("q");
    expect(out).toMatch(/No information was found online/);
    fetchMock.mockRestore();
  });

  test("_searXNGEngine returns formatted results on success", async () => {
    process.env.AGENT_SEARXNG_API_URL = "https://searx.example.com/search";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { title: "T1", url: "https://a", content: "C1", publishedDate: "2024-01-01" },
          ],
        }),
      });
    const out = await config._searXNGEngine("q");
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { title: "T1", link: "https://a", snippet: "C1", publishedDate: "2024-01-01" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_searXNGEngine returns 'no information' on empty results", async () => {
    process.env.AGENT_SEARXNG_API_URL = "https://searx.example.com/search";
    const { config } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    const out = await config._searXNGEngine("q");
    expect(out).toMatch(/No information was found online/);
    fetchMock.mockRestore();
  });

  test("_tavilySearch returns formatted results on success", async () => {
    process.env.AGENT_TAVILY_API_KEY = "k";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ title: "T", url: "https://a", content: "C" }],
        }),
      });
    const out = await config._tavilySearch("q");
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { title: "T", link: "https://a", snippet: "C" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_exaSearch returns formatted results on success", async () => {
    process.env.AGENT_EXA_API_KEY = "k";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ title: "T", url: "https://a", text: "X", publishedDate: "d" }],
        }),
      });
    const out = await config._exaSearch("q");
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { title: "T", link: "https://a", snippet: "X", publishedDate: "d" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_perplexitySearch returns formatted results on success", async () => {
    process.env.AGENT_PERPLEXITY_API_KEY = "k";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ title: "T", url: "https://a", snippet: "S" }],
        }),
      });
    const out = await config._perplexitySearch("q");
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { title: "T", link: "https://a", snippet: "S" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_baiduSearch normalizes references to web-only with dedup", async () => {
    process.env.AGENT_BAIDU_SEARCH_API_KEY = "k";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          references: [
            { type: "web", title: "T1", url: "https://a", snippet: "S1" },
            { type: "image", title: "I1", url: "https://img" },
            { type: "web", title: "T2", url: "https://b", snippet: "S2" },
            { type: "web", title: "T1 dup", url: "https://a", snippet: "dup" },
          ],
        }),
      });
    const out = await config._baiduSearch("q");
    const parsed = JSON.parse(out);
    // image filtered, duplicate filtered
    expect(parsed).toEqual([
      { title: "T1", link: "https://a", snippet: "S1" },
      { title: "T2", link: "https://b", snippet: "S2" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_baiduSearch returns error on response with code/message and no references", async () => {
    process.env.AGENT_BAIDU_SEARCH_API_KEY = "k";
    const { config } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ code: 401, message: "Unauthorized" }),
      });
    const out = await config._baiduSearch("q");
    expect(out).toMatch(/There was an error searching for content/);
    fetchMock.mockRestore();
  });

  test("_baiduSearch returns 'no information' when no references", async () => {
    process.env.AGENT_BAIDU_SEARCH_API_KEY = "k";
    const { config } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    const out = await config._baiduSearch("q");
    expect(out).toMatch(/No information was found online/);
    fetchMock.mockRestore();
  });

  test("_searchApi returns formatted results on success", async () => {
    process.env.AGENT_SEARCHAPI_API_KEY = "k";
    process.env.AGENT_SEARCHAPI_ENGINE = "google";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          knowledge_graph: { description: "KG desc" },
          answer_box: { answer: "42" },
          organic_results: [{ title: "T1", link: "https://a", snippet: "S1" }],
        }),
      });
    const out = await config._searchApi("q");
    const parsed = JSON.parse(out);
    expect(parsed.length).toBe(3);
    expect(parsed[0]).toBe("KG desc");
    expect(parsed[1]).toBe("42");
    expect(parsed[2]).toMatchObject({ title: "T1", link: "https://a", snippet: "S1" });
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_searchApi returns 'no information' on empty results", async () => {
    process.env.AGENT_SEARCHAPI_API_KEY = "k";
    process.env.AGENT_SEARCHAPI_ENGINE = "google";
    const { config } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    const out = await config._searchApi("q");
    expect(out).toMatch(/No information was found online/);
    fetchMock.mockRestore();
  });

  test("_serperDotDev returns formatted results on success", async () => {
    process.env.AGENT_SERPER_DEV_KEY = "k";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          knowledgeGraph: { title: "KG" },
          organic: [{ title: "T1", link: "https://a", snippet: "S1" }],
        }),
      });
    const out = await config._serperDotDev("q");
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { title: "KG" },
      { title: "T1", link: "https://a", snippet: "S1" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_serplyEngine handles 'Unauthorized' response as an error", async () => {
    process.env.AGENT_SERPLY_API_KEY = "k";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ message: "Unauthorized" }),
      });
    const out = await config._serplyEngine("q");
    expect(out).toMatch(/There was an error searching for content/);
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_serplyEngine returns formatted results on success", async () => {
    process.env.AGENT_SERPLY_API_KEY = "k";
    const { config, aibitat } = setupAndGetCtx();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ title: "T1", link: "https://a", description: "S1" }],
        }),
      });
    const out = await config._serplyEngine("q");
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { title: "T1", link: "https://a", snippet: "S1" },
    ]);
    expect(aibitat.addCitation).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  test("_serpApi introspects long query truncated to 100 chars", async () => {
    process.env.AGENT_SERPAPI_API_KEY = "k";
    process.env.AGENT_SERPAPI_ENGINE = "google";
    const { config, aibitat } = setupAndGetCtx();
    const longQ = "x".repeat(150);
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    await config._serpApi(longQ);
    const introspectMsg = aibitat.introspect.mock.calls
      .map((c) => c[0])
      .find((m) => m.includes("Using SerpApi"));
    expect(introspectMsg).toBeDefined();
    expect(introspectMsg).toMatch(/\.\.\."$/);
    fetchMock.mockRestore();
  });
});
