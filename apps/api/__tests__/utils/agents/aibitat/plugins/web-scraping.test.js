// SPDX-License-Identifier: MIT
/* eslint-env jest */

jest.mock("../../../../../utils/collectorApi", () => ({
  CollectorApi: jest.fn(),
}));

const {
  webScraping,
} = require("../../../../../utils/agents/aibitat/plugins/web-scraping.js");
const { CollectorApi } = require("../../../../../utils/collectorApi");

function buildAibitat({ model = "gpt-4o", provider = "openai" } = {}) {
  return {
    introspect: jest.fn(),
    handlerProps: { log: jest.fn() },
    addCitation: jest.fn(),
    onAbort: jest.fn(),
    model,
    provider,
  };
}

function getPlugin() {
  return webScraping.plugin.call({ name: webScraping.name });
}

function setupAndGetCtx(aibitat = buildAibitat()) {
  const fn = jest.fn();
  aibitat.function = fn;
  const plugin = getPlugin();
  plugin.setup(aibitat);
  const config = fn.mock.calls[0][0];
  return { aibitat, config, fn };
}

describe("web-scraping plugin — scraped text regression", () => {
  beforeEach(() => {
    CollectorApi.mockReset();
    CollectorApi.mockImplementation(() => ({
      getLinkContent: jest.fn().mockResolvedValue({
        success: false,
        content: null,
      }),
    }));
  });

  test("exports webScraping with expected name", () => {
    expect(webScraping.name).toBe("web-scraping");
    expect(webScraping.startupConfig).toBeDefined();
  });

  test("setup registers the web-scraping function", () => {
    const { config } = setupAndGetCtx();
    expect(config.name).toBe("web-scraping");
    expect(config.description).toMatch(/webpage URL/);
    expect(typeof config.handler).toBe("function");
    expect(typeof config.scrape).toBe("function");
  });

  test("scrape() serializes successfully scraped text and reports a citation", async () => {
    const aibitat = buildAibitat();
    const { config } = setupAndGetCtx(aibitat);
    CollectorApi.mockImplementation(() => ({
      getLinkContent: jest.fn().mockResolvedValue({
        success: true,
        content: "Example Domain source text",
      }),
    }));

    const out = await config.scrape("https://example.com");

    expect(out).toBe("Example Domain source text");
    expect(aibitat.addCitation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "https://example.com",
        text: "Example Domain source text",
      }),
    );
  });

  test("scrape() throws a controlled error when the collector cannot scrape", async () => {
    const { config } = setupAndGetCtx();
    await expect(config.scrape("https://example.com")).rejects.toThrow(
      /URL could not be scraped/,
    );
  });

  test("scrape() throws when no readable content was collected", async () => {
    const aibitat = buildAibitat();
    const { config } = setupAndGetCtx(aibitat);
    CollectorApi.mockImplementation(() => ({
      getLinkContent: jest
        .fn()
        .mockResolvedValue({ success: true, content: "" }),
    }));

    await expect(config.scrape("https://example.com")).rejects.toThrow(
      /no content/,
    );
  });

  test("handler returns a friendly message when the scrape tool errors instead of leaking raw errors", async () => {
    const aibitat = buildAibitat();
    const { config } = setupAndGetCtx(aibitat);
    CollectorApi.mockImplementation(() => ({
      getLinkContent: jest.fn().mockRejectedValue(new Error("collector down")),
    }));

    const out = await config.handler({ url: "https://example.com" });
    expect(out).toContain("There was an error while calling the function");
    expect(out).toContain("collector down");
  });
});
