// SPDX-License-Identifier: MIT
/**
 * Additional tests for responses.js — focused on the reasoning tag filter
 * logic inside handleDefaultStreamResponseV2 and edge cases for
 * writeResponseChunk with BigInt values.
 *
 * Docs: server/utils/helpers/chat/responses.js
 * Purpose: Verify reasoning tokens are filtered and content tokens are forwarded.
 */

const {
  handleDefaultStreamResponseV2,
  writeResponseChunk,
  safeJSONStringify,
} = require("../../../../utils/helpers/chat/responses");
const {
  OPEN_TAG,
  CLOSE_TAG,
} = require("../../../../utils/helpers/chat/streamReasoningFilter");

/**
 * Creates a mock Express-like response object that captures write() calls
 * and supports on/removeListener for the "close" event.
 */
function createMockResponse() {
  const chunks = [];
  const listeners = {};
  const res = {
    write: (data) => chunks.push(data),
    on: (event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    removeListener: (event, handler) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    },
    end: () => {},
  };
  res._chunks = chunks;
  res._listeners = listeners;
  return res;
}

/**
 * Creates an async iterable from an array of chunks.
 * Each chunk mimics the OpenAI streaming format: { choices: [{ delta, finish_reason }] }
 */
function createMockStream(chunks) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
    endMeasurement: () => {},
  };
}

function parseChunkData(rawWrite) {
  const jsonStr = rawWrite.replace(/^data: /, "").replace(/\n\n$/, "");
  return JSON.parse(jsonStr);
}

describe("handleDefaultStreamResponseV2 — reasoning tag filter", () => {
  test("streams reasoning_content tokens wrapped in tags and forwards content tokens", async () => {
    const chunks = [
      { choices: [{ delta: { reasoning_content: "thinking..." } }] },
      { choices: [{ delta: { reasoning_content: "more thinking" } }] },
      { choices: [{ delta: { content: "Hello!" } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
    ];
    const response = createMockResponse();
    const stream = createMockStream(chunks);

    const fullText = await handleDefaultStreamResponseV2(
      response,
      stream,
      { uuid: "test-uuid", sources: [] },
    );

    // Resolved text preserves reasoning wrapped in tags + content
    expect(fullText).toBe(`${OPEN_TAG}thinking...more thinking${CLOSE_TAG}Hello!`);
    const textChunks = response._chunks
      .map(parseChunkData)
      .filter((c) => c.type === "textResponseChunk" && c.textResponse);
    // OPEN_TAG + reasoning + CLOSE_TAG + content
    expect(textChunks.length).toBeGreaterThanOrEqual(4);
    const lastChunk = textChunks[textChunks.length - 1];
    expect(lastChunk.textResponse).toBe("Hello!");
  });

  test("streams reasoning tokens via the reasoning property (Cerebras-style) wrapped in tags", async () => {
    const chunks = [
      { choices: [{ delta: { reasoning: "Cerebras reasoning" } }] },
      { choices: [{ delta: { content: "Answer" } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
    ];
    const response = createMockResponse();
    const stream = createMockStream(chunks);

    const fullText = await handleDefaultStreamResponseV2(
      response,
      stream,
      {},
    );

    expect(fullText).toBe(`${OPEN_TAG}Cerebras reasoning${CLOSE_TAG}Answer`);
  });

  test("captures usage metrics when provided in chunks", async () => {
    const chunks = [
      { choices: [{ delta: { content: "Hi" } }] },
      {
        choices: [{ delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 1 },
      },
    ];
    const response = createMockResponse();
    let capturedUsage = null;
    const stream = createMockStream(chunks);
    stream.endMeasurement = (usage) => {
      capturedUsage = usage;
    };

    await handleDefaultStreamResponseV2(response, stream, {});

    expect(capturedUsage).not.toBeNull();
    expect(capturedUsage.prompt_tokens).toBe(10);
    expect(capturedUsage.completion_tokens).toBe(1);
  });

  test("estimates completion tokens when usage metrics are absent", async () => {
    const chunks = [
      { choices: [{ delta: { content: "a" } }] },
      { choices: [{ delta: { content: "b" } }] },
      { choices: [{ delta: { content: "c" } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
    ];
    const response = createMockResponse();
    let capturedUsage = null;
    const stream = createMockStream(chunks);
    stream.endMeasurement = (usage) => {
      capturedUsage = usage;
    };

    await handleDefaultStreamResponseV2(response, stream, {});

    expect(capturedUsage.completion_tokens).toBe(3);
  });

  test("sends a closing chunk with sources when finish_reason is received", async () => {
    const chunks = [
      { choices: [{ delta: { content: "done" } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
    ];
    const response = createMockResponse();
    const stream = createMockStream(chunks);

    await handleDefaultStreamResponseV2(response, stream, {
      uuid: "abc",
      sources: [{ title: "src1" }],
    });

    const closeChunks = response._chunks
      .map(parseChunkData)
      .filter((c) => c.close === true);
    expect(closeChunks).toHaveLength(1);
    expect(closeChunks[0].sources).toEqual([{ title: "src1" }]);
  });

  test("handles streaming errors gracefully", async () => {
    const response = createMockResponse();
    const stream = {
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: "partial" } }] };
        throw new Error("stream broke");
      },
      endMeasurement: () => {},
    };

    const fullText = await handleDefaultStreamResponseV2(response, stream, {});

    expect(fullText).toBe("partial");
    const errorChunks = response._chunks
      .map(parseChunkData)
      .filter((c) => c.error);
    expect(errorChunks).toHaveLength(1);
    expect(errorChunks[0].error).toBe("stream broke");
  });
});

describe("writeResponseChunk — edge cases", () => {
  test("handles BigInt values in chunk data via safeJSONStringify", () => {
    const mockWrite = jest.fn();
    const response = { write: mockWrite };
    writeResponseChunk(response, {
      type: "metrics",
      count: BigInt(42),
    });
    expect(mockWrite).toHaveBeenCalledTimes(1);
    const written = mockWrite.mock.calls[0][0];
    const payload = JSON.parse(
      written.replace(/^data: /, "").replace(/\n\n$/, ""),
    );
    expect(payload.count).toBe("42");
  });

  test("preserves null textResponse in abort chunks", () => {
    const mockWrite = jest.fn();
    const response = { write: mockWrite };
    writeResponseChunk(response, {
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: "aborted",
    });
    const payload = JSON.parse(
      mockWrite.mock.calls[0][0].replace(/^data: /, "").replace(/\n\n$/, ""),
    );
    expect(payload.type).toBe("abort");
    expect(payload.textResponse).toBeNull();
    expect(payload.error).toBe("aborted");
  });
});
