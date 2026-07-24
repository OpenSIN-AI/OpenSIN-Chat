// SPDX-License-Identifier: MIT
/* eslint-env jest */

const { docSummarizer } = require("../../../../../utils/agents/aibitat/plugins/summarize.js");
const { Document } = require("../../../../../models/documents");
const helpers = require("../../../../../utils/helpers");
const { OpenAiLLM } = require("../../../../../utils/AiProviders/openAi");

function buildAibitat(overrides = {}) {
  return {
    caller: "test-caller",
    provider: "openai",
    model: "gpt-3.5-turbo",
    handlerProps: {
      invocation: { workspace_id: 1 },
      log: jest.fn(),
    },
    introspect: jest.fn(),
    addCitation: jest.fn(),
    onAbort: jest.fn(),
    ...overrides,
  };
}

function getPlugin() {
  return docSummarizer.plugin.call({ name: docSummarizer.name });
}

function setupAndGetConfig() {
  const aibitat = buildAibitat();
  aibitat.function = jest.fn();
  const plugin = getPlugin();
  plugin.setup(aibitat);
  return { aibitat, config: aibitat.function.mock.calls[0][0] };
}

describe("docSummarizer plugin — registration", () => {
  test("exports docSummarizer with expected name", () => {
    expect(docSummarizer.name).toBe("document-summarizer");
  });

  test("startupConfig is defined and has empty params", () => {
    expect(docSummarizer.startupConfig).toBeDefined();
    expect(docSummarizer.startupConfig.params).toEqual({});
  });

  test("plugin() returns an object with name and setup", () => {
    const plugin = getPlugin();
    expect(plugin.name).toBe("document-summarizer");
    expect(typeof plugin.setup).toBe("function");
  });

  test("setup registers a function with the correct name", () => {
    const { config } = setupAndGetConfig();
    expect(config.name).toBe("document-summarizer");
  });

  test("registered config exposes controller, description, examples, parameters", () => {
    const { config } = setupAndGetConfig();
    expect(config.controller).toBeDefined();
    expect(typeof config.controller.abort).toBe("function");
    expect(config.description).toMatch(/List all documents/);
    expect(Array.isArray(config.examples)).toBe(true);
    expect(config.examples.length).toBeGreaterThan(0);
    expect(config.parameters.properties.action.enum).toEqual(["list", "summarize"]);
    expect(config.parameters.additionalProperties).toBe(false);
  });

  test("registered config exposes handler, listDocuments, summarizeDoc", () => {
    const { config } = setupAndGetConfig();
    expect(typeof config.handler).toBe("function");
    expect(typeof config.listDocuments).toBe("function");
    expect(typeof config.summarizeDoc).toBe("function");
  });
});

describe("docSummarizer plugin — handler routing", () => {
  test("list action routes to listDocuments", async () => {
    const { config } = setupAndGetConfig();
    const listSpy = jest
      .spyOn(config, "listDocuments")
      .mockResolvedValue("[]");
    const result = await config.handler({ action: "list" });
    expect(listSpy).toHaveBeenCalled();
    expect(result).toBe("[]");
  });

  test("summarize action routes to summarizeDoc with the filename", async () => {
    const { config } = setupAndGetConfig();
    const sumSpy = jest
      .spyOn(config, "summarizeDoc")
      .mockResolvedValue("summary text");
    const result = await config.handler({
      action: "summarize",
      document_filename: "readme.md",
    });
    expect(sumSpy).toHaveBeenCalledWith("readme.md");
    expect(result).toBe("summary text");
  });

  test("unknown action returns the no-information message", async () => {
    const { config } = setupAndGetConfig();
    const result = await config.handler({ action: "bogus" });
    expect(result).toMatch(/This function call returns no information/);
  });
});

describe("docSummarizer plugin — listDocuments", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("returns 'No documents found' when the workspace is empty", async () => {
    jest.spyOn(Document, "where").mockResolvedValue([]);
    const { config, aibitat } = setupAndGetConfig();
    const result = await config.listDocuments();
    expect(result).toBe("No documents found - nothing can be done. Stop.");
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("returns a JSON list of documents with metadata title/description", async () => {
    jest.spyOn(Document, "where").mockResolvedValue([
      {
        docId: "doc-1",
        metadata: JSON.stringify({ title: "Report.pdf", description: "Annual" }),
      },
      { docId: "doc-2", metadata: null },
    ]);
    const { config, aibitat } = setupAndGetConfig();
    const result = await config.listDocuments();
    const parsed = JSON.parse(result);
    expect(parsed).toEqual([
      { document_id: "doc-1", filename: "Report.pdf", description: "Annual" },
      { document_id: "doc-2", filename: "unknown.txt", description: "no description" },
    ]);
    expect(aibitat.introspect).toHaveBeenCalled();
  });

  test("returns an error message when the underlying call throws", async () => {
    jest.spyOn(Document, "where").mockRejectedValue(new Error("DB down"));
    const { config, aibitat } = setupAndGetConfig();
    const result = await config.listDocuments();
    expect(result).toMatch(/An error was raised while listing/);
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
  });
});

describe("docSummarizer plugin — summarizeDoc", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("returns 'No documents were found' when list is empty", async () => {
    const { config, aibitat } = setupAndGetConfig();
    jest.spyOn(config, "listDocuments").mockResolvedValue("[]");
    const result = await config.summarizeDoc("any.md");
    expect(result).toBe("No documents were found.");
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
  });

  test("returns 'No available document by the name' when filename not in list", async () => {
    const { config, aibitat } = setupAndGetConfig();
    jest
      .spyOn(config, "listDocuments")
      .mockResolvedValue(JSON.stringify([{ filename: "other.md", document_id: "x" }]));
    const result = await config.summarizeDoc("missing.md");
    expect(result).toBe('No available document by the name "missing.md".');
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
  });

  test("returns document content directly when within token limit", async () => {
    const { config, aibitat } = setupAndGetConfig();
    jest.spyOn(config, "listDocuments").mockResolvedValue(
      JSON.stringify([{ filename: "small.md", document_id: "doc-1" }]),
    );
    jest.spyOn(Document, "content").mockResolvedValue({
      content: "short content",
      title: "Small Doc",
    });
    const getLLM = jest.spyOn(helpers, "getLLMProvider");
    const result = await config.summarizeDoc("small.md");
    expect(result).toBe("short content");
    expect(getLLM).not.toHaveBeenCalled();
    expect(aibitat.addCitation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "doc-1",
        title: "Small Doc",
        text: "short content",
      }),
    );
  });

  test("falls back to filename for citation title when document.title is missing", async () => {
    const { config, aibitat } = setupAndGetConfig();
    jest.spyOn(config, "listDocuments").mockResolvedValue(
      JSON.stringify([{ filename: "f.md", document_id: "doc-2" }]),
    );
    jest.spyOn(Document, "content").mockResolvedValue({
      content: "x",
      title: null,
    });
    await config.summarizeDoc("f.md");
    expect(aibitat.addCitation).toHaveBeenCalledWith(
      expect.objectContaining({ title: "f.md" }),
    );
  });

  test("returns error message when document has no readable content", async () => {
    const { config, aibitat } = setupAndGetConfig();
    jest.spyOn(config, "listDocuments").mockResolvedValue(
      JSON.stringify([{ filename: "f.md", document_id: "doc-2" }]),
    );
    jest.spyOn(Document, "content").mockResolvedValue({ content: "", title: "T" });
    const result = await config.summarizeDoc("f.md");
    expect(result).toMatch(/An error was raised while summarizing/);
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
  });

  test("invokes LLM provider with provider/model and aibitat context when content is large", async () => {
    process.env.OPEN_AI_KEY = "test-key";
    const { config, aibitat } = setupAndGetConfig();
    jest.spyOn(config, "listDocuments").mockResolvedValue(
      JSON.stringify([{ filename: "big.md", document_id: "doc-3" }]),
    );
    const bigContent = "x ".repeat(50_000); // ~50k tokens
    jest.spyOn(Document, "content").mockResolvedValue({
      content: bigContent,
      title: "Big",
    });
    const getChatCompletion = jest
      .spyOn(OpenAiLLM.prototype, "getChatCompletion")
      .mockResolvedValue({ textResponse: "• point one\n• point two" });
    const result = await config.summarizeDoc("big.md");
    expect(getChatCompletion).toHaveBeenCalled();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toMatch(/An error was raised/);
  });

  test("attaches onAbort listener before invoking LLM", async () => {
    process.env.OPEN_AI_KEY = "test-key";
    const { config, aibitat } = setupAndGetConfig();
    jest.spyOn(config, "listDocuments").mockResolvedValue(
      JSON.stringify([{ filename: "big.md", document_id: "doc-3" }]),
    );
    jest.spyOn(Document, "content").mockResolvedValue({
      content: "x ".repeat(50_000),
      title: "Big",
    });
    jest
      .spyOn(OpenAiLLM.prototype, "getChatCompletion")
      .mockImplementation(async () => {
        expect(aibitat.onAbort).toHaveBeenCalled();
        return { textResponse: "ok" };
      });
    const result = await config.summarizeDoc("big.md");
    expect(result).not.toMatch(/An error was raised/);
  });

  test("returns error message when LLM call throws", async () => {
    process.env.OPEN_AI_KEY = "test-key";
    const { config, aibitat } = setupAndGetConfig();
    jest.spyOn(config, "listDocuments").mockResolvedValue(
      JSON.stringify([{ filename: "big.md", document_id: "doc-3" }]),
    );
    jest.spyOn(Document, "content").mockResolvedValue({
      content: "x ".repeat(50_000),
      title: "Big",
    });
    jest
      .spyOn(OpenAiLLM.prototype, "getChatCompletion")
      .mockRejectedValue(new Error("model timeout"));
    const result = await config.summarizeDoc("big.md");
    expect(result).toMatch(/An error was raised while summarizing/);
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
  });

  test("returns error message when Document.content throws", async () => {
    const { config, aibitat } = setupAndGetConfig();
    jest.spyOn(config, "listDocuments").mockResolvedValue(
      JSON.stringify([{ filename: "f.md", document_id: "doc-2" }]),
    );
    jest.spyOn(Document, "content").mockRejectedValue(new Error("read fail"));
    const result = await config.summarizeDoc("f.md");
    expect(result).toMatch(/An error was raised while summarizing/);
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
  });

  test("handles JSON list parse failure by falling back to []", async () => {
    const { config, aibitat } = setupAndGetConfig();
    jest.spyOn(config, "listDocuments").mockResolvedValue("not json");
    const result = await config.summarizeDoc("any.md");
    expect(result).toBe("No documents were found.");
    expect(aibitat.handlerProps.log).toHaveBeenCalled();
  });
});
