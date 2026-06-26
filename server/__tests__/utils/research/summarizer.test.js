// SPDX-License-Identifier: MIT

// Mocked by resolved absolute path — summarizer.js requires these same files.
jest.mock("../../../utils/helpers", () => ({
  getLLMProvider: jest.fn(),
}));
jest.mock("../../../utils/agents/aibitat/providers/openai", () => ({
  OpenAiLlm: class {},
}));

const { getLLMProvider } = require("../../../utils/helpers");
const { LLMSummarizer } = require("../../../utils/research/summarizer");

const sampleInput = {
  query: "Position der AfD zur Energiepolitik",
  searchResults: [
    { title: "Quelle A", link: "https://a.de", snippet: "Snippet A" },
    { title: "Quelle B", link: "https://b.de", snippet: "Snippet B" },
  ],
  extractedContent: [{ title: "Doc", url: "https://a.de", content: "Inhalt" }],
  politicianResults: [
    { fullName: "Max Mustermann", party: "AfD", faction: "AfD", state: "Berlin" },
  ],
};

describe("LLMSummarizer.summarize", () => {
  afterEach(() => jest.clearAllMocks());

  it("uses the LLM provider response when available", async () => {
    getLLMProvider.mockResolvedValue({
      sendPrompt: jest.fn().mockResolvedValue("## LLM Zusammenfassung"),
    });

    const result = await LLMSummarizer.summarize(sampleInput);
    expect(result).toBe("## LLM Zusammenfassung");
  });

  it("falls back to a generated summary when no LLM provider is configured", async () => {
    getLLMProvider.mockResolvedValue(null);

    const result = await LLMSummarizer.summarize(sampleInput);
    expect(result).toContain("# Recherche: Position der AfD zur Energiepolitik");
    expect(result).toContain("Quelle A");
    expect(result).toContain("Max Mustermann");
  });

  it("falls back when the LLM provider throws", async () => {
    getLLMProvider.mockRejectedValue(new Error("provider boom"));

    const result = await LLMSummarizer.summarize(sampleInput);
    expect(result).toContain("# Recherche:");
    expect(result).toContain("Quelle B");
  });

  it("falls back when the LLM returns an empty response", async () => {
    getLLMProvider.mockResolvedValue({
      sendPrompt: jest.fn().mockResolvedValue(""),
    });

    const result = await LLMSummarizer.summarize(sampleInput);
    expect(result).toContain("# Recherche:");
  });

  it("handles empty inputs without throwing", async () => {
    getLLMProvider.mockResolvedValue(null);
    const result = await LLMSummarizer.summarize({
      query: "leer",
      searchResults: [],
      extractedContent: [],
      politicianResults: [],
    });
    expect(result).toContain("# Recherche: leer");
  });
});
