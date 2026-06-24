# reasoningFilter.js — Documentation

## Purpose

Centralized reasoning/thinking-tag filter for all OpenAI-compatible AI
provider responses. Single import point for both streaming and
non-streaming reasoning logic.

## Background (Issue #286)

Three providers (genericOpenAi, fireworksAi, lmStudio) each carried a
private `#parseReasoningFromResponse` method with identical logic. The
streaming inline `imd...thinking` filter was already centralized in
`chat/streamReasoningFilter.js`, but the non-streaming parser was not.

This module consolidates both concerns:

| Concern | Source | Functions |
|---------|--------|-----------|
| Streaming token filter | `chat/streamReasoningFilter.js` | `createReasoningState`, `filterReasoningToken` |
| Non-streaming response parser | This file | `parseReasoningFromResponse` |
| Tag stripping | This file | `stripThinkingTags` |

## API

### `parseReasoningFromResponse({ message })`

Wraps `message.reasoning_content` in `imd...thinking` tags and prepends
it to `message.content`. Returns just `content` when no reasoning is
present.

### `stripThinkingTags(text)`

Removes all `imd...thinking` blocks from a complete text string.

### `createReasoningState()` / `filterReasoningToken(token, state)`

Re-exported from `chat/streamReasoningFilter.js`. See that module's
documentation for details.

### `OPEN_TAG` / `CLOSE_TAG`

The literal tag strings (`imd` and `thinking`).

## Consumers

| Provider | File | Usage |
|----------|------|-------|
| GenericOpenAi | `AiProviders/genericOpenAi/index.js` | Streaming + non-streaming |
| FireworksAi | `AiProviders/fireworksAi/index.js` | Non-streaming |
| LMStudio | `AiProviders/lmStudio/index.js` | Non-streaming |
