// SPDX-License-Identifier: MIT

const {
  executionMethods,
} = require("../../../../utils/agents/aibitat/execution.js");

function buildExecutionContext(providerInstance) {
  return Object.assign(
    {
      maxToolCalls: 10,
      functions: new Map(),
      providerInstance,
      handlerProps: { log: jest.fn() },
      introspect: jest.fn(),
      socket: { send: jest.fn() },
      abort: jest.fn(),
      flushCitations: jest.fn(),
      emitChatId: jest.fn(),
      _invocationDeadline: Date.now() - 1,
      _invocationCostCapUsd: 5,
      _invocationCostUsd: 0,
    },
    executionMethods,
  );
}

describe("AIbitat execution deadline fallback", () => {
  it("generates a final streamed answer from collected tool results after the deadline", async () => {
    const providerInstance = {
      stream: jest.fn().mockResolvedValue({
        uuid: "final-stream-uuid",
        textResponse: "Final sourced answer",
      }),
      getUsage: jest.fn(() => ({ total_tokens: 42 })),
    };
    const context = buildExecutionContext(providerInstance);
    const messages = [
      { role: "user", content: "Research this" },
      {
        role: "function",
        name: "web-scraping",
        content: "<tool_output>Collected source text</tool_output>",
      },
    ];

    const result = await context.handleAsyncExecution(
      messages,
      [{ name: "web-browsing" }],
      "workspace-agent",
      1,
    );

    expect(result).toBe("Final sourced answer");
    expect(providerInstance.stream).toHaveBeenCalledWith(
      messages,
      [],
      expect.any(Function),
    );
    expect(context.abort).not.toHaveBeenCalled();
    expect(context.flushCitations).toHaveBeenCalledWith("final-stream-uuid");
    expect(context.emitChatId).toHaveBeenCalledWith("final-stream-uuid");
    expect(context.introspect).toHaveBeenCalledWith(
      expect.stringMatching(/final response from the collected sources/i),
    );
  });

  it("generates a final synchronous answer without more tools after the deadline", async () => {
    const providerInstance = {
      complete: jest.fn().mockResolvedValue({
        textResponse: "Final synchronous answer",
      }),
      getUsage: jest.fn(() => ({ total_tokens: 21 })),
    };
    const context = buildExecutionContext(providerInstance);
    const messages = [
      { role: "user", content: "Research this" },
      {
        role: "function",
        name: "web-browsing",
        content: "<tool_output>Collected search results</tool_output>",
      },
    ];

    const result = await context.handleExecution(
      messages,
      [{ name: "web-scraping" }],
      "workspace-agent",
      1,
      "final-sync-uuid",
    );

    expect(result).toBe("Final synchronous answer");
    expect(providerInstance.complete).toHaveBeenCalledWith(messages, []);
    expect(context.abort).not.toHaveBeenCalled();
    expect(context.flushCitations).toHaveBeenCalledWith("final-sync-uuid");
    expect(context.emitChatId).toHaveBeenCalledWith("final-sync-uuid");
  });
});
