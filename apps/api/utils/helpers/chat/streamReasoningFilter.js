// SPDX-License-Identifier: MIT

/**
 * Centralized inline `<think>...</think>` reasoning filter for streaming
 * OpenAI-compatible providers.
 *
 * ## Background
 * Some OpenAI-compatible reasoning models (e.g. MiniMax M3, DeepSeek on
 * Fireworks) stream their chain-of-thought INLINE as `<think>...</think>`
 * inside the content delta instead of using the dedicated `reasoning_content`
 * field. We must strip those segments while preserving any answer text that
 * shares the same token.
 *
 * A previous (duplicated) implementation only flipped the open-block flag to
 * `false` inside the `<think>`-detection branch. When the closing `</think>`
 * arrived in its own token (the common streaming case), that branch was
 * skipped, the flag was never reset, and every subsequent answer token was
 * dropped — leaving the assistant message blank. This walks the token
 * character-accurately so the block always closes and the real answer survives.
 *
 * The state object is intentionally mutable and shared across tokens for a
 * single stream so the open/closed reasoning state is tracked correctly across
 * arbitrary token-split boundaries.
 */

const OPEN_TAG = "<think>";
const CLOSE_TAG = "</think>";

/**
 * Creates a fresh, mutable reasoning-filter state object.
 * One state object should be created per stream and passed to every
 * `filterReasoningToken` call for that stream.
 * @returns {{ open: boolean }}
 */
function createReasoningState() {
  return { open: false };
}

/**
 * Filters a single stream token, removing inline `<think>...</think>` blocks
 * character-accurately while tracking the open reasoning-block state across
 * tokens.
 * @param {string} token - the raw content delta token
 * @param {{ open: boolean }} state - mutable state object, shared across tokens
 * @returns {string} the filtered token (empty string when the token is pure reasoning)
 */
function filterReasoningToken(token, state) {
  if (!token) return "";
  if (!state || typeof state !== "object")
    throw new Error(
      "filterReasoningToken requires a mutable state object created via createReasoningState().",
    );

  let working = token;
  let emitted = "";

  while (working.length > 0) {
    if (state.open) {
      const closeIdx = working.indexOf(CLOSE_TAG);
      if (closeIdx === -1) {
        // Whole remaining chunk is still reasoning — drop it.
        break;
      }
      // Reasoning ends here; continue scanning the trailing answer text.
      working = working.slice(closeIdx + CLOSE_TAG.length);
      state.open = false;
      continue;
    }

    const openIdx = working.indexOf(OPEN_TAG);
    if (openIdx === -1) {
      // No (more) reasoning in this token — keep it as answer text.
      emitted += working;
      break;
    }
    // Text before `<think>` is answer content; everything after the tag is
    // reasoning until we find the matching close.
    emitted += working.slice(0, openIdx);
    working = working.slice(openIdx + OPEN_TAG.length);
    state.open = true;
  }

  return emitted;
}

module.exports = {
  createReasoningState,
  filterReasoningToken,
  OPEN_TAG,
  CLOSE_TAG,
};
