// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

/**
 * Unit tests for the centralized reasoningFilter utility (issue #286).
 *
 * These tests cover:
 * 1. parseReasoningFromResponse — non-streaming reasoning parser
 * 2. stripThinkingTags — complete-text tag removal
 * 3. Re-exported streaming utilities (smoke tests — full coverage in
 *    chat/streamReasoningFilter.test.js)
 */

const {
  parseReasoningFromResponse,
  stripThinkingTags,
  createReasoningState,
  filterReasoningToken,
  OPEN_TAG,
  CLOSE_TAG,
} = require("../../../utils/helpers/reasoningFilter");

describe("parseReasoningFromResponse", () => {
  test("returns content when no reasoning_content is present", () => {
    const result = parseReasoningFromResponse({
      message: { content: "Hello world" },
    });
    expect(result).toBe("Hello world");
  });

  test("returns content when reasoning_content is empty", () => {
    const result = parseReasoningFromResponse({
      message: { content: "Hello", reasoning_content: "" },
    });
    expect(result).toBe("Hello");
  });

  test("returns content when reasoning_content is whitespace only", () => {
    const result = parseReasoningFromResponse({
      message: { content: "Hello", reasoning_content: "   " },
    });
    expect(result).toBe("Hello");
  });

  test("prepends reasoning_content wrapped in thinking tags", () => {
    const result = parseReasoningFromResponse({
      message: { content: "Answer", reasoning_content: "Let me think" },
    });
    expect(result).toBe(`${OPEN_TAG}Let me think${CLOSE_TAG}Answer`);
  });

  test("handles undefined message gracefully", () => {
    const result = parseReasoningFromResponse({});
    expect(result).toBe("");
  });

  test("handles undefined content with reasoning_content", () => {
    const result = parseReasoningFromResponse({
      message: { reasoning_content: "Just reasoning" },
    });
    expect(result).toBe(`${OPEN_TAG}Just reasoning${CLOSE_TAG}`);
  });

  test("handles completely empty response", () => {
    const result = parseReasoningFromResponse();
    expect(result).toBe("");
  });
});

describe("stripThinkingTags", () => {
  test("removes a single thinking block", () => {
    const input = `${OPEN_TAG}secret reasoning${CLOSE_TAG}Real answer`;
    expect(stripThinkingTags(input)).toBe("Real answer");
  });

  test("removes multiple thinking blocks", () => {
    const input = `A${OPEN_TAG}r1${CLOSE_TAG}B${OPEN_TAG}r2${CLOSE_TAG}C`;
    expect(stripThinkingTags(input)).toBe("ABC");
  });

  test("returns text unchanged when no tags present", () => {
    expect(stripThinkingTags("Just plain text")).toBe("Just plain text");
  });

  test("handles empty/falsy input", () => {
    expect(stripThinkingTags("")).toBe("");
    expect(stripThinkingTags(null)).toBe("");
    expect(stripThinkingTags(undefined)).toBe("");
  });

  test("handles multiline reasoning blocks", () => {
    const input = `${OPEN_TAG}line1\nline2\nline3${CLOSE_TAG}Answer`;
    expect(stripThinkingTags(input)).toBe("Answer");
  });

  test("returns empty string when entire text is a thinking block", () => {
    const input = `${OPEN_TAG}all reasoning${CLOSE_TAG}`;
    expect(stripThinkingTags(input)).toBe("");
  });
});

describe("re-exported streaming utilities", () => {
  test("createReasoningState returns a fresh state object", () => {
    const state = createReasoningState();
    expect(state).toEqual({ open: false });
  });

  test("filterReasoningToken strips inline thinking from a token", () => {
    const state = createReasoningState();
    const result = filterReasoningToken(
      `${OPEN_TAG}reasoning${CLOSE_TAG}answer`,
      state,
    );
    expect(result).toBe("answer");
  });

  test("exports the tag constants", () => {
    expect(OPEN_TAG).toBe(OPEN_TAG);
    expect(CLOSE_TAG).toBe(CLOSE_TAG);
  });
});
