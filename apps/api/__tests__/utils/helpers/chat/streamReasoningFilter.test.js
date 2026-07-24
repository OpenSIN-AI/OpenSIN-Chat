// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

/**
 * Unit tests for the centralized inline `<think>...</think>` reasoning filter.
 *
 * These tests lock in the five known token-split scenarios that previously
 * caused blank assistant messages when the closing tag arrived in its own
 * token. They drive the shared utility directly so every provider that adopts
 * it inherits the same guarantees.
 */

const {
  createReasoningState,
  filterReasoningToken,
  OPEN_TAG,
  CLOSE_TAG,
} = require("../../../../utils/helpers/chat/streamReasoningFilter");

/**
 * Feed a sequence of tokens through the filter using a single shared state,
 * returning the concatenated emitted answer text.
 */
function runStream(tokens) {
  const state = createReasoningState();
  return tokens.map((t) => filterReasoningToken(t, state)).join("");
}

describe("filterReasoningToken", () => {
  test("exposes the tag constants", () => {
    expect(OPEN_TAG).toBe("<think>");
    expect(CLOSE_TAG).toBe("</think>");
  });

  test("returns empty string for empty/falsy tokens", () => {
    const state = createReasoningState();
    expect(filterReasoningToken("", state)).toBe("");
    expect(filterReasoningToken(null, state)).toBe("");
    expect(filterReasoningToken(undefined, state)).toBe("");
  });

  test("throws when no state object is provided", () => {
    expect(() => filterReasoningToken("hello", null)).toThrow(
      /mutable state object/,
    );
  });

  // Scenario 1: closing tag arrives in its own token (the original bug).
  test("keeps the answer when </think> arrives in its own token", () => {
    const result = runStream([
      "<think>",
      "let me reason about this",
      "</think>",
      "Hello",
      " world",
    ]);
    expect(result).toBe("Hello world");
    expect(result).not.toMatch(/reason about this/);
  });

  // Scenario 2: answer text shares the closing token.
  test("keeps answer text that shares the closing token", () => {
    const result = runStream(["<think>thinking", "</think>Answer text"]);
    expect(result).toBe("Answer text");
  });

  // Scenario 3: complete block inside a single token.
  test("strips a complete <think>...</think> block inside a single token", () => {
    const result = runStream(["<think>quiet reasoning</think>Final answer"]);
    expect(result).toBe("Final answer");
  });

  // Scenario 4: no reasoning at all.
  test("passes through normal answers without reasoning untouched", () => {
    const result = runStream(["Just", " a ", "plain answer"]);
    expect(result).toBe("Just a plain answer");
  });

  // Scenario 5: open tag shares a token with leading answer text.
  test("keeps answer text that precedes an inline <think>", () => {
    const result = runStream(["Answer<think>secret", " thoughts</think>!"]);
    expect(result).toBe("Answer!");
  });

  test("handles multiple think blocks across the stream", () => {
    const result = runStream([
      "A<think>r1</think>B",
      "<think>r2",
      "</think>C",
    ]);
    expect(result).toBe("ABC");
  });

  test("drops tokens that are entirely reasoning", () => {
    const state = createReasoningState();
    expect(filterReasoningToken("<think>only", state)).toBe("");
    expect(filterReasoningToken("reasoning here", state)).toBe("");
    expect(filterReasoningToken(" still reasoning</think>", state)).toBe("");
    expect(state.open).toBe(false);
  });

  test("tracks open state correctly across tokens", () => {
    const state = createReasoningState();
    expect(state.open).toBe(false);
    filterReasoningToken("<think>open", state);
    expect(state.open).toBe(true);
    filterReasoningToken("close</think>done", state);
    expect(state.open).toBe(false);
  });
});
