// SPDX-License-Identifier: MIT
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { get: jest.fn() },
}));

const { SystemSettings } = require("../../../models/systemSettings");
const { WebSearchEngine, resetAll } = require("../../../utils/research/webSearchEngine");

function setProvider(provider, apiKey = null) {
  SystemSettings.get.mockImplementation(async ({ label }) => {
    if (label === "agent_search_provider") return { value: provider };
    if (label === "agent_search_api_key") return apiKey ? { value: apiKey } : null;
    return null;
  });
  if (apiKey) {
    process.env.AGENT_SERPAPI_API_KEY = apiKey;
  } else {
    delete process.env.AGENT_SERPAPI_API_KEY;
  }
}

describe("WebSearchEngine.search", () => {
  afterEach(() => {
    jest.clearAllMocks();
    if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
    resetAll();
  });

  it("maps SerpAPI organic_results into the normalized shape", async () => {
    setProvider("serpapi", "key-123");
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        organic_results: [
          { title: "T1", link: "https://1.de", snippet: "S1" },
          { title: "T2", link: "https://2.de", snippet: "S2" },
        ],
      }),
    });

    const res = await WebSearchEngine.search("energie");
    expect(res).toHaveLength(2);
    expect(res[0]).toEqual({ title: "T1", link: "https://1.de", snippet: "S1" });
  });

  it("returns an empty array for SerpAPI without an API key", async () => {
    setProvider("serpapi", null);
    const res = await WebSearchEngine.search("energie");
    expect(res).toEqual([]);
  });

  it("returns an empty array when SerpAPI responds non-ok", async () => {
    setProvider("serpapi", "key-123");
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false });
    const res = await WebSearchEngine.search("energie");
    expect(res).toEqual([]);
  });

  it("uses DuckDuckGo as the default provider and maps results", async () => {
    setProvider("unknown");
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        AbstractURL: "https://abstract.de",
        AbstractText: "Abstract text",
        RelatedTopics: [{ FirstURL: "https://rel.de", Text: "Related" }],
      }),
    });

    const res = await WebSearchEngine.search("energie");
    expect(res.length).toBeGreaterThanOrEqual(2);
    expect(res.some((r) => r.link === "https://abstract.de")).toBe(true);
    expect(res.some((r) => r.link === "https://rel.de")).toBe(true);
  });

  it("returns an empty array (not throw) when fetch rejects", async () => {
    setProvider("duckduckgo-engine");
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    const res = await WebSearchEngine.search("energie");
    expect(res).toEqual([]);
  });
});
