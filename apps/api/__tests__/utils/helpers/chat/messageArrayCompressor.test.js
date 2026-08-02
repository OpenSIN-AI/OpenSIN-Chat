// SPDX-License-Identifier: MIT
jest.mock("../../../../utils/helpers/tiktoken", () => ({
  TokenManager: jest.fn().mockImplementation(() => ({
    statsFrom: jest.fn(() => 1_800),
    countFromString: jest.fn((text) => {
      if (typeof text !== "string") return 0;
      if (
        text.startsWith("Long system instructions") &&
        text.includes("<RETRIEVED_CONTEXT")
      )
        return 1_200;
      if (text.includes("<RETRIEVED_CONTEXT")) return 200;
      if (text.startsWith("Long system instructions")) return 100;
      return 10;
    }),
  })),
}));

const {
  appendContext,
} = require("../../../../utils/AiProviders/appendContext");
const {
  messageArrayCompressor,
  splitSystemPromptContext,
} = require("../../../../utils/helpers/chat");

describe("messageArrayCompressor retrieved context", () => {
  it("recognizes the nonce-bearing RETRIEVED_CONTEXT block", () => {
    const marker = "COMPRESSOR_CONTEXT_MARKER";
    const content = `System rules${appendContext([marker])}`;
    const result = splitSystemPromptContext(content);

    expect(result.format).toBe("retrieved-context");
    expect(result.prompt).toBe("System rules");
    expect(result.context).toContain(marker);
  });

  it("preserves retrieved file content when an oversized system prompt is compressed", async () => {
    const marker = "COMPRESSOR_ATTACHMENT_SURVIVES";
    const systemContent = `Long system instructions${appendContext([marker])}`;
    const llm = {
      model: "test-model",
      limits: { system: 1_000, history: 200, user: 1_400 },
      promptWindowLimit: () => 2_000,
    };

    const compressed = await messageArrayCompressor(
      llm,
      [
        { role: "system", content: systemContent },
        { role: "user", content: "Read the uploaded file" },
      ],
      [],
    );

    expect(compressed[0].content).toContain(marker);
    expect(compressed[0].content).toContain("<RETRIEVED_CONTEXT");
    expect(compressed[0].content).not.toContain(
      "\nContext: <RETRIEVED_CONTEXT",
    );
  });
});
