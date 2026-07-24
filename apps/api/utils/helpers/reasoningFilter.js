// SPDX-License-Identifier: MIT
// Purpose: Centralized reasoning/thinking-tag filter for AI provider responses.
// Docs: See reasoningFilter.doc.md

/**
 * Centralized reasoning filter for OpenAI-compatible AI providers.
 *
 * This module is the single import point for all reasoning/thinking-tag
 * logic. It re-exports the streaming utilities from
 * `chat/streamReasoningFilter.js` and adds the non-streaming helpers that
 * were previously duplicated as private `#parseReasoningFromResponse`
 * methods across genericOpenAi, fireworksAi, and lmStudio providers.
 *
 * ## Usage (streaming)
 * ```js
 * const { createReasoningState, filterReasoningToken } = require("./reasoningFilter");
 * const state = createReasoningState();
 * // per token:
 * const filtered = filterReasoningToken(token, state);
 * if (!filtered) continue;
 * ```
 *
 * ## Usage (non-streaming)
 * ```js
 * const { parseReasoningFromResponse } = require("./reasoningFilter");
 * const text = parseReasoningFromResponse({ message: choice.message });
 * ```
 *
 * ## Usage (strip tags from arbitrary text)
 * ```js
 * const { stripThinkingTags } = require("./reasoningFilter");
 * const clean = stripThinkingTags(rawText);
 * ```
 */

const {
  createReasoningState,
  filterReasoningToken,
  OPEN_TAG,
  CLOSE_TAG,
} = require("./chat/streamReasoningFilter");

/**
 * Parses and prepends reasoning content from a non-streaming chat
 * completion response, returning the full text response.
 *
 * If the message has a `reasoning_content` field (used by DeepSeek and
 * other reasoning models), it is wrapped in `imd...thinking` tags and
 * prepended to the content so the frontend ThoughtContainer can display it.
 *
 * This replaces the duplicated `#parseReasoningFromResponse` private
 * methods that existed in genericOpenAi, fireworksAi, and lmStudio.
 *
 * @param {{ message?: { content?: string, reasoning_content?: string } }} response
 * @returns {string}
 */
function parseReasoningFromResponse({ message } = {}) {
  const textResponse = message?.content ?? "";
  if (
    !!message?.reasoning_content &&
    message.reasoning_content.trim().length > 0
  )
    return `${OPEN_TAG}${message.reasoning_content}${CLOSE_TAG}${textResponse}`;
  return textResponse;
}

/**
 * Strips all `imd...thinking` blocks from a complete text string.
 *
 * Useful for cleaning saved chat history or post-processing a full
 * non-streaming response where reasoning tags should be removed.
 *
 * @param {string} text - the text to clean
 * @returns {string} text with all `imd...thinking` blocks removed
 */
function stripThinkingTags(text) {
  if (!text) return "";
  return text.replace(
    new RegExp(
      OPEN_TAG.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "[\\s\\S]*?" +
        CLOSE_TAG.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi",
    ),
    "",
  );
}

module.exports = {
  // Streaming utilities (re-exported from chat/streamReasoningFilter)
  createReasoningState,
  filterReasoningToken,
  OPEN_TAG,
  CLOSE_TAG,
  // Non-streaming utilities
  parseReasoningFromResponse,
  stripThinkingTags,
};
