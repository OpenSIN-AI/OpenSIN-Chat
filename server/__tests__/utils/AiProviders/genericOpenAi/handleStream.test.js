// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

/**
 * Regression tests for GenericOpenAiLLM.handleStream inline-reasoning handling.
 *
 * Reasoning models such as MiniMax M3 / DeepSeek on OpenAI-compatible endpoints
 * stream their chain-of-thought INLINE as `<think>...</think>` inside the
 * content delta. A previous bug failed to reset the open-block flag when the
 * closing `</think>` arrived in its own token, which dropped EVERY answer token
 * that followed and produced a blank assistant message. These tests lock in the
 * fix: reasoning is stripped, but the real answer always survives.
 */

const ORIGINAL_ENV = { ...process.env };

beforeAll(() => {
  process.env.GENERIC_OPEN_AI_BASE_PATH = "http://localhost:9999/v1";
  process.env.GENERIC_OPEN_AI_MODEL_PREF = "test-model";
  // The openai SDK (v6+) throws at construction when apiKey is null, so we
  // provide a dummy key. No real network calls are made — the stream is mocked.
  process.env.GENERIC_OPEN_AI_API_KEY = "test-key";
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

const { GenericOpenAiLLM } = require("../../../../utils/AiProviders/genericOpenAi");

/** Build a fake measured-stream object (async iterable + endMeasurement). */
function makeStream(chunks) {
  return {
    endMeasurement: jest.fn(),
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

/** Build a minimal Express-like response that records written chunks. */
function makeResponse() {
  const writes = [];
  return {
    writableEnded: false,
    destroyed: false,
    writes,
    write(payload) {
      writes.push(payload);
      return true;
    },
    on: jest.fn(),
    removeListener: jest.fn(),
  };
}

/** Extract the concatenated textResponse the frontend would receive. */
function streamedText(response) {
  return response.writes
    .map((w) => {
      const match = w.match(/^data: (.*)\n\n$/s);
      if (!match) return "";
      try {
        return JSON.parse(match[1]).textResponse ?? "";
      } catch {
        return "";
      }
    })
    .join("");
}

function contentChunk(content) {
  return { choices: [{ delta: { content } }] };
}

function finishChunk() {
  return { choices: [{ delta: { content: "" }, finish_reason: "stop" }] };
}

describe("GenericOpenAiLLM.handleStream inline reasoning", () => {
  let llm;

  beforeEach(() => {
    // Pass a stub embedder so we don't spin up the NativeEmbedder.
    llm = new GenericOpenAiLLM({}, "test-model");
  });

  test("keeps the answer when </think> arrives in its own token", async () => {
    const stream = makeStream([
      contentChunk("<think>"),
      contentChunk("let me reason about this"),
      contentChunk("</think>"),
      contentChunk("Hello"),
      contentChunk(" world"),
      finishChunk(),
    ]);
    const response = makeResponse();

    const result = await llm.handleStream(response, stream, { uuid: "t1" });

    expect(result).toBe("Hello world");
    expect(result).not.toMatch(/reason about this/);
    expect(streamedText(response)).toBe("Hello world");
  });

  test("keeps answer text that shares the closing token", async () => {
    const stream = makeStream([
      contentChunk("<think>thinking"),
      contentChunk("</think>Answer text"),
      finishChunk(),
    ]);
    const response = makeResponse();

    const result = await llm.handleStream(response, stream, { uuid: "t2" });

    expect(result).toBe("Answer text");
  });

  test("strips a complete <think>...</think> block inside a single token", async () => {
    const stream = makeStream([
      contentChunk("<think>quiet reasoning</think>Final answer"),
      finishChunk(),
    ]);
    const response = makeResponse();

    const result = await llm.handleStream(response, stream, { uuid: "t3" });

    expect(result).toBe("Final answer");
  });

  test("passes through normal answers without reasoning untouched", async () => {
    const stream = makeStream([
      contentChunk("Just"),
      contentChunk(" a "),
      contentChunk("plain answer"),
      finishChunk(),
    ]);
    const response = makeResponse();

    const result = await llm.handleStream(response, stream, { uuid: "t4" });

    expect(result).toBe("Just a plain answer");
  });

  test("preserves reasoning delivered via reasoning_content for the thought panel", async () => {
    const stream = makeStream([
      { choices: [{ delta: { reasoning_content: "internal thoughts" } }] },
      contentChunk("Visible answer"),
      finishChunk(),
    ]);
    const response = makeResponse();

    const result = await llm.handleStream(response, stream, { uuid: "t5" });

    // reasoning_content is wrapped in <think> for the brain icon, answer follows.
    expect(result).toBe("<think>internal thoughts</think>Visible answer");
  });
});
