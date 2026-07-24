// SPDX-License-Identifier: MIT
const {
  stripReasoning,
  isRetryable,
  parseJson,
} = require("../../../utils/pdfAnalysis/llm");

describe("pdfAnalysis/llm stripReasoning", () => {
  it("strips a complete <think> block", () => {
    expect(stripReasoning("<think>thinking</think>Answer")).toBe("Answer");
  });

  it("strips an unclosed / truncated <think> block", () => {
    expect(stripReasoning("<think>truncated...never closed")).toBe("");
  });

  it("strips multiple <think> blocks", () => {
    expect(
      stripReasoning("<think>a</think>Hello <think>b</think>World"),
    ).toBe("Hello World");
  });

  it("handles <think> tags with attributes", () => {
    expect(stripReasoning('<think id="1">x</think>Done')).toBe("Done");
  });

  it("preserves text without think blocks", () => {
    expect(stripReasoning("clean answer")).toBe("clean answer");
  });

  it("returns non-string input unchanged", () => {
    expect(stripReasoning(null)).toBe(null);
    expect(stripReasoning(undefined)).toBe(undefined);
    expect(stripReasoning(42)).toBe(42);
  });
});

describe("pdfAnalysis/llm isRetryable", () => {
  it.each(["429", "rate limit exceeded", "timeout", "ECONNRESET", "socket hang up", "overloaded", "503", "502", "500"])(
    "retries on transient error: %s",
    (msg) => {
      expect(isRetryable(new Error(msg))).toBe(true);
    },
  );

  it("does not retry on 400 bad request", () => {
    expect(isRetryable(new Error("400 bad request"))).toBe(false);
  });

  it("does not retry on a generic validation error", () => {
    expect(isRetryable(new Error("invalid input"))).toBe(false);
  });

  it("handles non-Error inputs", () => {
    expect(isRetryable("429 too many requests")).toBe(true);
    expect(isRetryable(null)).toBe(false);
  });
});

describe("pdfAnalysis/llm parseJson", () => {
  it("parses a plain JSON object", () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(parseJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it("extracts JSON embedded in surrounding prose", () => {
    expect(parseJson('Here is the result: {"score":5} done')).toEqual({
      score: 5,
    });
  });

  it("throws when no JSON object is present", () => {
    expect(() => parseJson("no json here")).toThrow(
      "Kein JSON in LLM-Antwort gefunden.",
    );
  });
});
