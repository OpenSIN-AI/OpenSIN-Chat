// SPDX-License-Identifier: MIT
/* eslint-env jest */

const {
  safeJSONStringify,
  convertToChatHistory,
  convertToPromptHistory,
  formatChatHistory,
  clientAbortedHandler,
  writeResponseChunk,
} = require("../../../../utils/helpers/chat/responses");

describe("safeJSONStringify", () => {
  test("stringifies normal objects", () => {
    const obj = { a: 1, b: "hello" };
    expect(safeJSONStringify(obj)).toBe('{"a":1,"b":"hello"}');
  });

  test("converts BigInt values to strings", () => {
    const obj = { count: BigInt("9007199254740993") };
    const result = JSON.parse(safeJSONStringify(obj));
    expect(result.count).toBe("9007199254740993");
  });

  test("handles nested objects with BigInt", () => {
    const obj = {
      outer: { inner: BigInt(42) },
      normal: "value",
    };
    const result = JSON.parse(safeJSONStringify(obj));
    expect(result.outer.inner).toBe("42");
    expect(result.normal).toBe("value");
  });
});

describe("convertToChatHistory", () => {
  test("skips records where prompt is not a string", () => {
    const history = [
      {
        id: 1,
        prompt: null,
        response: JSON.stringify({ text: "hello" }),
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];
    expect(convertToChatHistory(history)).toEqual([]);
  });

  test("skips records where response.text is not a string", () => {
    const history = [
      {
        id: 2,
        prompt: "hi",
        response: JSON.stringify({ text: null }),
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];
    expect(convertToChatHistory(history)).toEqual([]);
  });

  test("formats valid records with role, content, sentAt, sources", () => {
    const history = [
      {
        id: 3,
        prompt: "What is X?",
        response: JSON.stringify({ text: "X is Y", sources: [{ title: "src" }] }),
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];
    const result = convertToChatHistory(history);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[0].content).toBe("What is X?");
    expect(result[1].role).toBe("assistant");
    expect(result[1].content).toBe("X is Y");
    expect(result[1].sources).toEqual([{ title: "src" }]);
    expect(result[0].sentAt).toBeDefined();
  });

  test("returns empty array for empty input", () => {
    expect(convertToChatHistory([])).toEqual([]);
  });

  test("includes feedbackScore when provided", () => {
    const history = [
      {
        id: 4,
        prompt: "hello",
        response: JSON.stringify({ text: "world" }),
        createdAt: "2025-01-01T00:00:00Z",
        feedbackScore: 5,
      },
    ];
    const result = convertToChatHistory(history);
    expect(result[1].feedbackScore).toBe(5);
  });
});

describe("convertToPromptHistory", () => {
  test("skips bad records with non-string prompt", () => {
    const history = [
      {
        id: 1,
        prompt: 123,
        response: JSON.stringify({ text: "hello" }),
      },
    ];
    expect(convertToPromptHistory(history)).toEqual([]);
  });

  test("formats valid records as [{role, content}]", () => {
    const history = [
      {
        id: 2,
        prompt: "What is Z?",
        response: JSON.stringify({ text: "Z is A" }),
      },
    ];
    const result = convertToPromptHistory(history);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ role: "user", content: "What is Z?" });
    expect(result[1]).toEqual({ role: "assistant", content: "Z is A" });
  });

  test("returns empty array for empty input", () => {
    expect(convertToPromptHistory([])).toEqual([]);
  });

  test("includes clarifying questions when present", () => {
    const survey = {
      questions: [{ question: "Which color?" }],
      result: { answers: [{ answer: "blue" }] },
    };
    const history = [
      {
        id: 3,
        prompt: "Pick a color",
        response: JSON.stringify({
          text: "Here are some options",
          clarifyingQuestions: [survey],
        }),
      },
    ];
    const result = convertToPromptHistory(history);
    expect(result[1].role).toBe("assistant");
    expect(result[1].content).toContain("Here are some options");
    expect(result[1].content).toContain("<clarifying_questions>");
    expect(result[1].content).toContain("Which color?");
    expect(result[1].content).toContain("blue");
  });
});

describe("formatChatHistory", () => {
  test("returns messages unchanged when no attachments", () => {
    const history = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "world" },
    ];
    const result = formatChatHistory(history, jest.fn(), "asProperty");
    expect(result).toEqual(history);
  });

  test("applies formatterFunction in asProperty mode", () => {
    const formatter = jest.fn(({ userPrompt }) => `formatted:${userPrompt}`);
    const history = [
      {
        role: "user",
        content: "hello",
        attachments: [{ name: "file.txt" }],
      },
    ];
    const result = formatChatHistory(history, formatter, "asProperty");
    expect(result[0]).toEqual({
      role: "user",
      content: "formatted:hello",
    });
    expect(formatter).toHaveBeenCalledWith({
      userPrompt: "hello",
      attachments: [{ name: "file.txt" }],
    });
  });

  test("applies formatterFunction in spread mode", () => {
    const formatter = jest.fn(({ userPrompt }) => ({
      text: `formatted:${userPrompt}`,
      extra: true,
    }));
    const history = [
      {
        role: "user",
        content: "hello",
        attachments: [{ name: "img.png" }],
      },
    ];
    const result = formatChatHistory(history, formatter, "spread");
    expect(result[0]).toEqual({
      role: "user",
      text: "formatted:hello",
      extra: true,
    });
  });

  test("skips non-user messages even with attachments", () => {
    const formatter = jest.fn();
    const history = [
      {
        role: "assistant",
        content: "response",
        attachments: [{ name: "file.txt" }],
      },
    ];
    const result = formatChatHistory(history, formatter, "asProperty");
    expect(result[0]).toEqual({
      role: "assistant",
      content: "response",
      attachments: [{ name: "file.txt" }],
    });
    expect(formatter).not.toHaveBeenCalled();
  });
});

describe("clientAbortedHandler", () => {
  test("resolves promise with fullText", () => {
    const resolve = jest.fn();
    clientAbortedHandler(resolve, "partial text");
    expect(resolve).toHaveBeenCalledWith("partial text");
  });
});

describe("writeResponseChunk", () => {
  test("writes SSE formatted data to response", () => {
    const mockWrite = jest.fn();
    const response = { write: mockWrite };
    writeResponseChunk(response, { type: "test", value: 42 });
    expect(mockWrite).toHaveBeenCalledTimes(1);
    const written = mockWrite.mock.calls[0][0];
    expect(written).toMatch(/^data: /);
    expect(written).toMatch(/\n\n$/);
    const payload = JSON.parse(written.replace(/^data: /, "").replace(/\n\n$/, ""));
    expect(payload.type).toBe("test");
    expect(payload.value).toBe(42);
  });
});
